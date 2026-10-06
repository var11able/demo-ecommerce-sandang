import {
  adminCategoryResponseSchema,
  idParamsSchema,
  updateCategoryBodySchema,
} from "@/contracts/admin";
import { updateCategory } from "@/server/admin";
import { defineRoute } from "../../../_lib/define-route";
import { respond } from "../../../_lib/responses";

export const PATCH = defineRoute({
  access: "admin",
  params: idParamsSchema,
  body: updateCategoryBodySchema,
  handle: async ({ params, body }) =>
    respond(adminCategoryResponseSchema, { category: await updateCategory(params.id, body) }),
});
