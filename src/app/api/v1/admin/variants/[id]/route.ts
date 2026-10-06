import {
  adminProductResponseSchema,
  idParamsSchema,
  updateVariantBodySchema,
} from "@/contracts/admin";
import { updateVariant } from "@/server/admin";
import { defineRoute } from "../../../_lib/define-route";
import { respond } from "../../../_lib/responses";

export const PATCH = defineRoute({
  access: "admin",
  allowDemoAdmin: true,
  params: idParamsSchema,
  body: updateVariantBodySchema,
  handle: async ({ params, body }) =>
    respond(adminProductResponseSchema, { product: await updateVariant(params.id, body) }),
});
