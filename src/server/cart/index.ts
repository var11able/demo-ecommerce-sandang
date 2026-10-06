import "server-only";
import type { Cart, CartLine } from "@/contracts/cart";
import { sellableUnits } from "../catalog";
import { getDb } from "../db";
import { StoreError, notFound } from "../errors";
import { flatShippingFee } from "../store";

const lineInclude = {
  variant: {
    include: { product: { select: { slug: true, name: true, images: true, isPublished: true } } },
  },
} as const;

export function insufficientStock(available: number): StoreError {
  return new StoreError(
    "insufficient_stock",
    available === 0
      ? "This is out of stock. Remove it to continue."
      : `Only ${available} left. Lower the quantity to continue.`,
  );
}

export async function getCart(customerId: string): Promise<Cart> {
  const cart = await getDb().cart.findUnique({
    where: { customerId },
    include: { lines: { include: lineInclude, orderBy: { createdAt: "asc" } } },
  });

  const lines: CartLine[] = (cart?.lines ?? []).map((line) => {
    const { variant } = line;
    return {
      variantId: variant.id,
      productSlug: variant.product.slug,
      productName: variant.product.name,
      variantName: variant.name,
      image: variant.product.images[0] ?? null,
      unitPrice: variant.price,
      quantity: line.quantity,
      lineTotal: variant.price * line.quantity,
      available: variant.product.isPublished ? sellableUnits(variant) : 0,
    };
  });

  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const shippingFee = lines.length > 0 ? flatShippingFee : 0;
  return {
    lines,
    itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
    subtotal,
    shippingFee,
    total: subtotal + shippingFee,
    canCheckout: lines.length > 0 && lines.every((line) => line.quantity <= line.available),
  };
}

export async function getCartItemCount(customerId: string): Promise<number> {
  const result = await getDb().cartLine.aggregate({
    where: { cart: { customerId } },
    _sum: { quantity: true },
  });
  return result._sum.quantity ?? 0;
}

export async function setCartLine(
  customerId: string,
  variantId: string,
  quantity: number,
): Promise<Cart> {
  const db = getDb();
  const variant = await db.variant.findFirst({
    where: { id: variantId, product: { isPublished: true } },
  });
  if (!variant) {
    throw notFound("Product not found");
  }
  const available = sellableUnits(variant);
  if (quantity > available) {
    throw insufficientStock(available);
  }
  const cart = await db.cart.upsert({ where: { customerId }, create: { customerId }, update: {} });
  await db.cartLine.upsert({
    where: { cartId_variantId: { cartId: cart.id, variantId } },
    create: { cartId: cart.id, variantId, quantity },
    update: { quantity },
  });
  return getCart(customerId);
}

export async function removeCartLine(customerId: string, variantId: string): Promise<Cart> {
  await getDb().cartLine.deleteMany({ where: { variantId, cart: { customerId } } });
  return getCart(customerId);
}
