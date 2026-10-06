import "server-only";
import type { OrderDetail, OrderSummary, ShippingAddress } from "@/contracts/orders";
import { insufficientStock } from "../cart";
import { getDb, type Transaction } from "../db";
import { StoreError, notFound } from "../errors";
import { consumeRateLimits, rateLimits } from "../rate-limit";
import { addReservation, lockVariants } from "../stock";
import { flatShippingFee } from "../store";
import { settleOrder, settleOrdersOfCustomer } from "../payments";
import { findCustomerOrderId as lookupCustomerOrderId } from "./settle";
import { orderInclude, toOrderDetail, toOrderSummary } from "./views";

export { cancelUnpaidOrder, lockOrder, releaseOrderReservation } from "./settle";
export { orderInclude, toOrderDetail, toOrderSummary, type OrderWithRelations } from "./views";

export const payByHours = 24;

function orderDatePart(now: Date): string {
  const jakarta = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return jakarta.toISOString().slice(0, 10).replaceAll("-", "");
}

async function nextOrderNumber(tx: Transaction, now: Date): Promise<string> {
  const [row] = await tx.$queryRaw<
    { value: bigint }[]
  >`SELECT nextval('order_number_seq') AS value`;
  const sequence = String(row?.value ?? 0n).padStart(4, "0");
  return `SDG-${orderDatePart(now)}-${sequence}`;
}

export async function placeOrder(
  customerId: string,
  address: ShippingAddress,
  now: Date = new Date(),
): Promise<OrderDetail> {
  await consumeRateLimits([rateLimits.placeOrderPerCustomer(customerId)], now);

  const orderId = await getDb().$transaction(async (tx) => {
    const cartLines = await tx.cartLine.findMany({
      where: { cart: { customerId } },
      include: {
        variant: {
          include: {
            product: { select: { name: true, slug: true, images: true, isPublished: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });
    if (cartLines.length === 0) {
      throw new StoreError("conflict", "Your cart is empty.");
    }

    const locked = new Map(
      (
        await lockVariants(
          tx,
          cartLines.map((line) => line.variantId),
        )
      ).map((variant) => [variant.id, variant]),
    );

    const lines = cartLines.map((line) => {
      const variant = locked.get(line.variantId);
      if (!variant || !line.variant.product.isPublished) {
        throw insufficientStock(0);
      }
      const available = Math.max(0, variant.stock - variant.reserved);
      if (line.quantity > available) {
        throw insufficientStock(available);
      }
      return {
        variantId: variant.id,
        productName: line.variant.product.name,
        productSlug: line.variant.product.slug,
        image: line.variant.product.images[0] ?? null,
        variantName: variant.name,
        unitPrice: variant.price,
        quantity: line.quantity,
      };
    });

    await addReservation(tx, lines);

    const subtotal = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
    const order = await tx.order.create({
      data: {
        customerId,
        orderNumber: await nextOrderNumber(tx, now),
        subtotal,
        shippingFee: flatShippingFee,
        total: subtotal + flatShippingFee,
        ...address,
        payBy: new Date(now.getTime() + payByHours * 60 * 60 * 1000),
        lines: { create: lines },
      },
    });

    await tx.cartLine.deleteMany({ where: { cart: { customerId } } });
    return order.id;
  });

  const order = await getDb().order.findUniqueOrThrow({
    where: { id: orderId },
    include: orderInclude,
  });
  return toOrderDetail(order, now);
}

export async function listCustomerOrders(
  customerId: string,
  now: Date = new Date(),
): Promise<OrderSummary[]> {
  await settleOrdersOfCustomer(customerId, now);
  const orders = await getDb().order.findMany({
    where: { customerId },
    include: { lines: { select: { quantity: true } } },
    orderBy: { createdAt: "desc" },
  });
  return orders.map(toOrderSummary);
}

export async function findCustomerOrderId(
  customerId: string,
  orderNumber: string,
): Promise<string> {
  const orderId = await lookupCustomerOrderId(customerId, orderNumber);
  if (!orderId) {
    throw notFound("Order not found");
  }
  return orderId;
}

export async function getCustomerOrder(
  customerId: string,
  orderNumber: string,
  now: Date = new Date(),
): Promise<OrderDetail> {
  const orderId = await findCustomerOrderId(customerId, orderNumber);
  await settleOrder(orderId, now);
  const order = await getDb().order.findUniqueOrThrow({
    where: { id: orderId },
    include: orderInclude,
  });
  return toOrderDetail(order, now);
}
