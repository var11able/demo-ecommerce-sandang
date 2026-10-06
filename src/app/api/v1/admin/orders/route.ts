import { adminOrderListQuerySchema, adminOrderListResponseSchema } from "@/contracts/admin";
import { listAdminOrders } from "@/server/admin";
import { defineRoute } from "../../_lib/define-route";
import { respond } from "../../_lib/responses";

export const GET = defineRoute({
  access: "admin",
  allowDemoAdmin: true,
  query: adminOrderListQuerySchema,
  handle: async ({ viewer, query }) =>
    respond(adminOrderListResponseSchema, { orders: await listAdminOrders(viewer, query) }),
});
