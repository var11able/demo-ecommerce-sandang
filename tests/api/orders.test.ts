import { beforeEach, describe, expect, it } from "vitest";
import { GET as getCart } from "@/app/api/v1/cart/route";
import { GET as listOrders } from "@/app/api/v1/orders/route";
import { GET as getOrder } from "@/app/api/v1/orders/[orderNumber]/route";
import { cartResponseSchema } from "@/contracts/cart";
import { orderDetailResponseSchema, orderListResponseSchema } from "@/contracts/orders";
import { getDb } from "@/server/db";
import { flatShippingFee } from "@/server/store";
import { registerCustomer } from "../support/accounts";
import { createTestProduct } from "../support/catalogue";
import { resetDatabase } from "../support/database";
import { callRoute, readJson } from "../support/http";
import { fillCart, placeOrderRequest, placeTestOrder, testAddress } from "../support/orders";

const hourMs = 60 * 60 * 1000;

async function variantState(variantId: string) {
  return getDb().variant.findUniqueOrThrow({
    where: { id: variantId },
    select: { stock: true, reserved: true },
  });
}

describe("placing an Order", () => {
  beforeEach(resetDatabase);

  it("turns the Cart into an Order with copied Lines, fixed totals, and a Reservation", async () => {
    const { cookie } = await registerCustomer();
    const product = await createTestProduct({
      name: "Boxy Tee",
      variants: [{ name: "M", price: 98000, stock: 10 }],
    });
    const variantId = product.variants[0]!.id;
    await fillCart(cookie, [{ variantId, quantity: 3 }]);

    const before = Date.now();
    const response = await placeOrderRequest(cookie);
    expect(response.status).toBe(201);
    const { order } = orderDetailResponseSchema.parse(await readJson(response));

    expect(order.orderNumber).toMatch(/^SDG-\d{8}-\d{4}$/);
    expect(order).toMatchObject({
      status: "awaiting_payment",
      subtotal: 294000,
      shippingFee: flatShippingFee,
      total: 294000 + flatShippingFee,
      canPay: true,
    });
    expect(order.lines).toEqual([
      {
        productName: "Boxy Tee",
        variantName: "M",
        productSlug: product.slug,
        image: product.images[0],
        unitPrice: 98000,
        quantity: 3,
        lineTotal: 294000,
      },
    ]);
    expect(order.address).toEqual({ ...testAddress, phone: "+6281234567890" });
    const payBy = new Date(order.payBy).getTime();
    expect(payBy).toBeGreaterThanOrEqual(before + 24 * hourMs - 5000);
    expect(payBy).toBeLessThanOrEqual(Date.now() + 24 * hourMs);

    expect(await variantState(variantId)).toEqual({ stock: 10, reserved: 3 });
    const cart = cartResponseSchema.parse(await readJson(await callRoute(getCart, { cookie })));
    expect(cart.cart.lines).toEqual([]);
  });

  it("keeps the Order's prices when the Product's price changes later", async () => {
    const { cookie } = await registerCustomer();
    const product = await createTestProduct({ variants: [{ price: 50000 }] });
    const order = await placeTestOrder(cookie, [
      { variantId: product.variants[0]!.id, quantity: 1 },
    ]);
    await getDb().variant.update({
      where: { id: product.variants[0]!.id },
      data: { price: 99000 },
    });
    const response = await callRoute(getOrder, {
      cookie,
      params: { orderNumber: order.orderNumber },
    });
    const { order: reread } = orderDetailResponseSchema.parse(await readJson(response));
    expect(reread.subtotal).toBe(50000);
    expect(reread.lines[0]?.unitPrice).toBe(50000);
  });

  it("refuses an empty Cart", async () => {
    const { cookie } = await registerCustomer();
    const response = await placeOrderRequest(cookie);
    expect(response.status).toBe(409);
    expect(await readJson(response)).toEqual({
      error: { code: "conflict", message: "Your cart is empty." },
    });
  });

  it("refuses more than the sellable units and changes nothing", async () => {
    const { cookie } = await registerCustomer();
    const product = await createTestProduct({ variants: [{ stock: 5 }] });
    const variantId = product.variants[0]!.id;
    await fillCart(cookie, [{ variantId, quantity: 4 }]);
    await getDb().variant.update({ where: { id: variantId }, data: { reserved: 3 } });

    const response = await placeOrderRequest(cookie);
    expect(response.status).toBe(409);
    expect(await readJson(response)).toMatchObject({ error: { code: "insufficient_stock" } });
    expect(await variantState(variantId)).toEqual({ stock: 5, reserved: 3 });
    expect(await getDb().order.count()).toBe(0);
    const cart = cartResponseSchema.parse(await readJson(await callRoute(getCart, { cookie })));
    expect(cart.cart.lines).toHaveLength(1);
  });

  it("rejects a bad address and any amount sent by the browser", async () => {
    const { cookie } = await registerCustomer();
    const product = await createTestProduct();
    await fillCart(cookie, [{ variantId: product.variants[0]!.id, quantity: 1 }]);
    for (const address of [
      { ...testAddress, phone: "12345" },
      { ...testAddress, postalCode: "1234" },
      { ...testAddress, province: "Atlantis" },
      { ...testAddress, total: 1 },
    ]) {
      expect((await placeOrderRequest(cookie, address)).status).toBe(400);
    }
    const withTotal = await callRoute((await import("@/app/api/v1/orders/route")).POST, {
      method: "POST",
      cookie,
      body: { address: testAddress, total: 1000 },
    });
    expect(withTotal.status).toBe(400);
    expect(await getDb().order.count()).toBe(0);
  });

  it("limits a Customer to ten Orders an hour", async () => {
    const { cookie } = await registerCustomer();
    const product = await createTestProduct({ variants: [{ stock: 50 }] });
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 11; attempt += 1) {
      await fillCart(cookie, [{ variantId: product.variants[0]!.id, quantity: 1 }]);
      statuses.push((await placeOrderRequest(cookie)).status);
    }
    expect(statuses.slice(0, 10).every((status) => status === 201)).toBe(true);
    expect(statuses[10]).toBe(429);
  });

  it("needs a logged-in Customer", async () => {
    const response = await placeOrderRequest("sandang_session=nobody");
    expect(response.status).toBe(401);
  });
});

describe("the last unit", () => {
  beforeEach(resetDatabase);

  it("goes to only one of two Customers ordering at the same moment", async () => {
    const product = await createTestProduct({ variants: [{ stock: 1 }] });
    const variantId = product.variants[0]!.id;
    const first = await registerCustomer();
    const second = await registerCustomer();
    await fillCart(first.cookie, [{ variantId, quantity: 1 }]);
    await fillCart(second.cookie, [{ variantId, quantity: 1 }]);

    const responses = await Promise.all([
      placeOrderRequest(first.cookie),
      placeOrderRequest(second.cookie),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
    expect(await variantState(variantId)).toEqual({ stock: 1, reserved: 1 });
    expect(await getDb().order.count()).toBe(1);
  });

  it("is never oversold across many simultaneous Orders", async () => {
    const product = await createTestProduct({ variants: [{ stock: 3 }] });
    const variantId = product.variants[0]!.id;
    const customers = await Promise.all(
      Array.from({ length: 8 }, (_, index) => registerCustomer({ ip: `192.0.2.${index + 1}` })),
    );
    for (const customer of customers) {
      await fillCart(customer.cookie, [{ variantId, quantity: 1 }]);
    }
    const responses = await Promise.all(
      customers.map((customer) => placeOrderRequest(customer.cookie)),
    );
    expect(responses.filter((response) => response.status === 201)).toHaveLength(3);
    expect(await variantState(variantId)).toEqual({ stock: 3, reserved: 3 });
  });
});

describe("reading Orders", () => {
  beforeEach(resetDatabase);

  it("lists only the Customer's own Orders, newest first", async () => {
    const product = await createTestProduct({ variants: [{ stock: 20 }] });
    const variantId = product.variants[0]!.id;
    const owner = await registerCustomer();
    const other = await registerCustomer();
    const first = await placeTestOrder(owner.cookie, [{ variantId, quantity: 1 }]);
    const second = await placeTestOrder(owner.cookie, [{ variantId, quantity: 2 }]);
    await placeTestOrder(other.cookie, [{ variantId, quantity: 1 }]);

    const response = await callRoute(listOrders, { cookie: owner.cookie });
    const { orders } = orderListResponseSchema.parse(await readJson(response));
    expect(orders.map((order) => order.orderNumber)).toEqual([
      second.orderNumber,
      first.orderNumber,
    ]);
    expect(orders[0]).toMatchObject({ status: "awaiting_payment", itemCount: 2 });
  });

  it("answers not found for someone else's Order and for an unknown one", async () => {
    const product = await createTestProduct();
    const owner = await registerCustomer();
    const other = await registerCustomer();
    const order = await placeTestOrder(owner.cookie, [
      { variantId: product.variants[0]!.id, quantity: 1 },
    ]);

    const someoneElses = await callRoute(getOrder, {
      cookie: other.cookie,
      params: { orderNumber: order.orderNumber },
    });
    const unknown = await callRoute(getOrder, {
      cookie: owner.cookie,
      params: { orderNumber: "SDG-20260101-9999" },
    });
    expect(someoneElses.status).toBe(404);
    expect(unknown.status).toBe(404);
    expect(await readJson(someoneElses)).toEqual(await readJson(unknown));
  });

  it("cancels an unpaid Order past its pay-by time when it is read, and releases the Reservation", async () => {
    const { cookie } = await registerCustomer();
    const product = await createTestProduct({ variants: [{ stock: 5 }] });
    const variantId = product.variants[0]!.id;
    const order = await placeTestOrder(cookie, [{ variantId, quantity: 2 }]);
    await getDb().order.update({
      where: { orderNumber: order.orderNumber },
      data: { payBy: new Date(Date.now() - 1000) },
    });

    const response = await callRoute(getOrder, {
      cookie,
      params: { orderNumber: order.orderNumber },
    });
    const { order: reread } = orderDetailResponseSchema.parse(await readJson(response));
    expect(reread.status).toBe("cancelled");
    expect(reread.canPay).toBe(false);
    expect(reread.cancelledAt).not.toBeNull();
    expect(await variantState(variantId)).toEqual({ stock: 5, reserved: 0 });

    await callRoute(getOrder, { cookie, params: { orderNumber: order.orderNumber } });
    expect(await variantState(variantId)).toEqual({ stock: 5, reserved: 0 });
  });

  it("rejects a malformed Order number", async () => {
    const { cookie } = await registerCustomer();
    const response = await callRoute(getOrder, { cookie, params: { orderNumber: "../../etc" } });
    expect(response.status).toBe(400);
  });
});
