import {
  adminCategoryListResponseSchema,
  adminCategoryResponseSchema,
  createCategoryBodySchema,
} from "@/contracts/admin";
import { createCategory, listAdminCategories } from "@/server/admin";
import { defineRoute } from "../../_lib/define-route";
import { respond } from "../../_lib/responses";

export const GET = defineRoute({
  access: "admin",
  allowDemoAdmin: true,
  handle: async () =>
    respond(adminCategoryListResponseSchema, { categories: await listAdminCategories() }),
});

export const POST = defineRoute({
  access: "admin",
  body: createCategoryBodySchema,
  handle: async ({ body }) =>
    respond(adminCategoryResponseSchema, { category: await createCategory(body) }, { status: 201 }),
});
