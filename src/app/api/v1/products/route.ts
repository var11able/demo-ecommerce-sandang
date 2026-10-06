import { productListQuerySchema, productListResponseSchema } from "@/contracts/catalog";
import { listProducts } from "@/server/catalog";
import { defineRoute } from "../_lib/define-route";
import { respond } from "../_lib/responses";

export const GET = defineRoute({
  access: "public",
  query: productListQuerySchema,
  handle: async ({ query }) =>
    respond(productListResponseSchema, { products: await listProducts(query) }),
});
