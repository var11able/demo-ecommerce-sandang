import { z } from "zod";
import { productDetailResponseSchema } from "@/contracts/catalog";
import { slugSchema } from "@/contracts/common";
import { getProduct } from "@/server/catalog";
import { defineRoute } from "../../_lib/define-route";
import { respond } from "../../_lib/responses";

export const GET = defineRoute({
  access: "public",
  params: z.strictObject({ slug: slugSchema }),
  handle: async ({ params }) =>
    respond(productDetailResponseSchema, { product: await getProduct(params.slug) }),
});
