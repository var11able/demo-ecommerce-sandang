import {
  adminProductResponseSchema,
  idParamsSchema,
  updateProductBodySchema,
} from "@/contracts/admin";
import { getAdminProduct, updateProduct } from "@/server/admin";
import { defineRoute } from "../../../_lib/define-route";
import { respond } from "../../../_lib/responses";

export const GET = defineRoute({
  access: "admin",
  allowDemoAdmin: true,
  params: idParamsSchema,
  handle: async ({ params }) =>
    respond(adminProductResponseSchema, { product: await getAdminProduct(params.id) }),
});

export const PATCH = defineRoute({
  access: "admin",
  allowDemoAdmin: true,
  params: idParamsSchema,
  body: updateProductBodySchema,
  handle: async ({ params, body }) =>
    respond(adminProductResponseSchema, { product: await updateProduct(params.id, body) }),
});
