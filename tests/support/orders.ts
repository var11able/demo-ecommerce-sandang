import { PUT as setLine } from "@/app/api/v1/cart/lines/[variantId]/route";
import { POST as placeOrder } from "@/app/api/v1/orders/route";
import { orderDetailResponseSchema, type ShippingAddressInput } from "@/contracts/orders";
import { callRoute, readJson } from "./http";

export const testAddress: ShippingAddressInput = {
  recipientName: "Sari Wulandari",
  phone: "0812 3456 7890",
  street: "Jalan Kemang Raya No. 8",
  district: "Mampang Prapatan",
  city: "Jakarta Selatan",
  province: "DKI Jakarta",
  postalCode: "12730",
};

export async function fillCart(cookie: string, lines: { variantId: string; quantity: number }[]) {
  for (const line of lines) {
    const response = await callRoute(setLine, {
      method: "PUT",
      cookie,
      params: { variantId: line.variantId },
      body: { quantity: line.quantity },
    });
    if (response.status !== 200) {
      throw new Error(`Could not fill the cart: ${response.status}`);
    }
  }
}

export async function placeOrderRequest(cookie: string, address: unknown = testAddress) {
  return callRoute(placeOrder, { method: "POST", cookie, body: { address } });
}

export async function placeTestOrder(
  cookie: string,
  lines: { variantId: string; quantity: number }[],
) {
  await fillCart(cookie, lines);
  const response = await placeOrderRequest(cookie);
  if (response.status !== 201) {
    throw new Error(`Could not place the order: ${response.status} ${await response.text()}`);
  }
  return orderDetailResponseSchema.parse(await readJson(response)).order;
}
