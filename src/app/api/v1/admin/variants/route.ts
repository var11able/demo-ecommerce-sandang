import { adminProductResponseSchema, createVariantBodySchema } from "@/contracts/admin";
import { createVariant } from "@/server/admin";
import { defineRoute } from "../../_lib/define-route";
import { respond } from "../../_lib/responses";

export const POST = defineRoute({
  access: "admin",
  body: createVariantBodySchema,
  handle: async ({ body }) => {
    const { productId, ...variant } = body;
    return respond(
      adminProductResponseSchema,
      { product: await createVariant(productId, variant) },
      { status: 201 },
    );
  },
});
