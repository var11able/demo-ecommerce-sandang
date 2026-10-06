import { cartResponseSchema } from "@/contracts/cart";
import { getCart } from "@/server/cart";
import { defineRoute } from "../_lib/define-route";
import { respond } from "../_lib/responses";

export const GET = defineRoute({
  access: "customer",
  handle: async ({ viewer }) => respond(cartResponseSchema, { cart: await getCart(viewer.id) }),
});
