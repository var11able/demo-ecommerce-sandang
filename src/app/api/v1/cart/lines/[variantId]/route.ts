import { cartLineParamsSchema, cartResponseSchema, setCartLineBodySchema } from "@/contracts/cart";
import { removeCartLine, setCartLine } from "@/server/cart";
import { defineRoute } from "../../../_lib/define-route";
import { respond } from "../../../_lib/responses";

export const PUT = defineRoute({
  access: "customer",
  params: cartLineParamsSchema,
  body: setCartLineBodySchema,
  handle: async ({ viewer, params, body }) =>
    respond(cartResponseSchema, {
      cart: await setCartLine(viewer.id, params.variantId, body.quantity),
    }),
});

export const DELETE = defineRoute({
  access: "customer",
  params: cartLineParamsSchema,
  handle: async ({ viewer, params }) =>
    respond(cartResponseSchema, { cart: await removeCartLine(viewer.id, params.variantId) }),
});
