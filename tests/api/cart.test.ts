import { beforeEach, describe, expect, it } from "vitest";
import { GET as getCart } from "@/app/api/v1/cart/route";
import { DELETE as removeLine, PUT as setLine } from "@/app/api/v1/cart/lines/[variantId]/route";
import { cartResponseSchema } from "@/contracts/cart";
import { getDb } from "@/server/db";
import { flatShippingFee } from "@/server/store";
import { registerCustomer } from "../support/accounts";
import { createTestProduct } from "../support/catalogue";
import { resetDatabase } from "../support/database";
import { callRoute, readJson } from "../support/http";

async function put(cookie: string, variantId: string, body: unknown) {
  return callRoute(setLine, { method: "PUT", cookie, params: { variantId }, body });
}

async function cartOf(cookie: string) {
  const response = await callRoute(getCart, { cookie });
  expect(response.status).toBe(200);
  return cartResponseSchema.parse(await readJson(response)).cart;
}

describe("Cart API", () => {
  beforeEach(resetDatabase);

  it("needs a logged-in Customer", async () => {
    const product = await createTestProduct();
    expect((await callRoute(getCart)).status).toBe(401);
    const response = await callRoute(setLine, {
      method: "PUT",
      params: { variantId: product.variants[0]!.id },
      body: { quantity: 1 },
    });
    expect(response.status).toBe(401);
  });

  it("starts empty, with no Shipping fee and nothing to check out", async () => {
    const { cookie } = await registerCustomer();
    expect(await cartOf(cookie)).toEqual({
      lines: [],
      itemCount: 0,
      subtotal: 0,
      shippingFee: 0,
      total: 0,
      canCheckout: false,
    });
  });

  it("sets quantities and computes the totals on the server", async () => {
    const { cookie } = await registerCustomer();
    const tee = await createTestProduct({
      name: "Boxy Tee",
      variants: [{ name: "M", price: 98000 }],
    });
    const cap = await createTestProduct({ variants: [{ price: 45000 }] });

    expect((await put(cookie, tee.variants[0]!.id, { quantity: 2 })).status).toBe(200);
    const response = await put(cookie, cap.variants[0]!.id, { quantity: 1 });
    const { cart } = cartResponseSchema.parse(await readJson(response));

    expect(
      cart.lines.map(({ productName, variantName, unitPrice, quantity, lineTotal }) => ({
        productName,
        variantName,
        unitPrice,
        quantity,
        lineTotal,
      })),
    ).toContainEqual({
      productName: "Boxy Tee",
      variantName: "M",
      unitPrice: 98000,
      quantity: 2,
      lineTotal: 196000,
    });
    expect(cart).toMatchObject({
      itemCount: 3,
      subtotal: 241000,
      shippingFee: flatShippingFee,
      total: 241000 + flatShippingFee,
      canCheckout: true,
    });
  });

  it("replaces the quantity rather than adding to it", async () => {
    const { cookie } = await registerCustomer();
    const product = await createTestProduct();
    const variantId = product.variants[0]!.id;
    await put(cookie, variantId, { quantity: 3 });
    await put(cookie, variantId, { quantity: 1 });
    expect((await cartOf(cookie)).lines[0]?.quantity).toBe(1);
  });

  it("uses the current price when the price changes", async () => {
    const { cookie } = await registerCustomer();
    const product = await createTestProduct({ variants: [{ price: 50000 }] });
    await put(cookie, product.variants[0]!.id, { quantity: 1 });
    await getDb().variant.update({
      where: { id: product.variants[0]!.id },
      data: { price: 60000 },
    });
    expect((await cartOf(cookie)).subtotal).toBe(60000);
  });

  it("refuses more than the sellable units and says what to do", async () => {
    const { cookie } = await registerCustomer();
    const product = await createTestProduct({ variants: [{ stock: 5, reserved: 2 }] });
    const response = await put(cookie, product.variants[0]!.id, { quantity: 4 });
    expect(response.status).toBe(409);
    expect(await readJson(response)).toEqual({
      error: {
        code: "insufficient_stock",
        message: "Only 3 left. Lower the quantity to continue.",
      },
    });
  });

  it("marks the Cart as not ready when Stock drops below a Line", async () => {
    const { cookie } = await registerCustomer();
    const product = await createTestProduct({ variants: [{ stock: 5 }] });
    await put(cookie, product.variants[0]!.id, { quantity: 4 });
    await getDb().variant.update({ where: { id: product.variants[0]!.id }, data: { stock: 2 } });
    const cart = await cartOf(cookie);
    expect(cart.canCheckout).toBe(false);
    expect(cart.lines[0]).toMatchObject({ quantity: 4, available: 2 });
  });

  it("answers not found for an unknown or unpublished Variant", async () => {
    const { cookie } = await registerCustomer();
    const draft = await createTestProduct({ published: false });
    expect((await put(cookie, draft.variants[0]!.id, { quantity: 1 })).status).toBe(404);
    expect((await put(cookie, crypto.randomUUID(), { quantity: 1 })).status).toBe(404);
  });

  it("rejects quantities outside 1 to 99 and any price sent by the browser", async () => {
    const { cookie } = await registerCustomer();
    const product = await createTestProduct();
    const variantId = product.variants[0]!.id;
    expect((await put(cookie, variantId, { quantity: 0 })).status).toBe(400);
    expect((await put(cookie, variantId, { quantity: 100 })).status).toBe(400);
    expect((await put(cookie, variantId, { quantity: 1.5 })).status).toBe(400);
    expect((await put(cookie, variantId, { quantity: 1, price: 1 })).status).toBe(400);
  });

  it("removes a Line", async () => {
    const { cookie } = await registerCustomer();
    const product = await createTestProduct();
    const variantId = product.variants[0]!.id;
    await put(cookie, variantId, { quantity: 2 });
    const response = await callRoute(removeLine, {
      method: "DELETE",
      cookie,
      params: { variantId },
    });
    expect(response.status).toBe(200);
    expect(cartResponseSchema.parse(await readJson(response)).cart.lines).toEqual([]);
  });

  it("keeps each Customer's Cart to themselves", async () => {
    const first = await registerCustomer();
    const second = await registerCustomer();
    const product = await createTestProduct();
    await put(first.cookie, product.variants[0]!.id, { quantity: 2 });
    expect((await cartOf(second.cookie)).lines).toEqual([]);
    expect((await cartOf(first.cookie)).itemCount).toBe(2);
  });

  it("refuses a Cart change from another site", async () => {
    const { cookie } = await registerCustomer();
    const product = await createTestProduct();
    const response = await callRoute(setLine, {
      method: "PUT",
      cookie,
      params: { variantId: product.variants[0]!.id },
      body: { quantity: 1 },
      origin: "https://evil.example",
    });
    expect(response.status).toBe(403);
  });
});
