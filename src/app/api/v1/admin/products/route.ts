import {
  adminProductListResponseSchema,
  adminProductResponseSchema,
  createProductBodySchema,
} from "@/contracts/admin";
import { createProduct, listAdminProducts } from "@/server/admin";
import { defineRoute } from "../../_lib/define-route";
import { respond } from "../../_lib/responses";

export const GET = defineRoute({
  access: "admin",
  allowDemoAdmin: true,
  handle: async () =>
    respond(adminProductListResponseSchema, { products: await listAdminProducts() }),
});

export const POST = defineRoute({
  access: "admin",
  body: createProductBodySchema,
  handle: async ({ body }) =>
    respond(adminProductResponseSchema, { product: await createProduct(body) }, { status: 201 }),
});
