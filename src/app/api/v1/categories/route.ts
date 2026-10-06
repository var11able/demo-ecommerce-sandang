import { categoryListResponseSchema } from "@/contracts/catalog";
import { listCategories } from "@/server/catalog";
import { defineRoute } from "../_lib/define-route";
import { respond } from "../_lib/responses";

export const GET = defineRoute({
  access: "public",
  handle: async () => respond(categoryListResponseSchema, { categories: await listCategories() }),
});
