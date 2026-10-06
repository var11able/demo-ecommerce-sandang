import { maxLineQuantity } from "@/contracts/constants";
import type { cartResponseSchema, Cart } from "@/contracts/cart";
import { callApi } from "./api-client";

export type CartChange =
  | { outcome: "updated"; cart: Cart }
  | { outcome: "unauthenticated" }
  | { outcome: "failed"; message: string };

async function changeCart(
  path: string,
  method: "PUT" | "DELETE",
  body?: unknown,
): Promise<CartChange> {
  const result = await callApi<typeof cartResponseSchema>(path, { method, body });
  if (result.ok && result.data) {
    return { outcome: "updated", cart: result.data.cart };
  }
  if (!result.ok && result.status === 401) {
    return { outcome: "unauthenticated" };
  }
  return { outcome: "failed", message: result.ok ? "Something went wrong." : result.message };
}

export function setLineQuantity(variantId: string, quantity: number): Promise<CartChange> {
  return changeCart(`/cart/lines/${variantId}`, "PUT", { quantity });
}

export function removeLine(variantId: string): Promise<CartChange> {
  return changeCart(`/cart/lines/${variantId}`, "DELETE");
}

export async function addToCart(variantId: string, quantity: number): Promise<CartChange> {
  const current = await callApi<typeof cartResponseSchema>("/cart");
  if (!current.ok) {
    return current.status === 401
      ? { outcome: "unauthenticated" }
      : { outcome: "failed", message: current.message };
  }
  const existing = current.data?.cart.lines.find((line) => line.variantId === variantId);
  const target = Math.min(maxLineQuantity, (existing?.quantity ?? 0) + quantity);
  return setLineQuantity(variantId, target);
}
