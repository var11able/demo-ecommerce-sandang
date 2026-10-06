import { adminOrderResponseSchema } from "@/contracts/admin";
import { orderParamsSchema } from "@/contracts/orders";
import { getAdminOrder } from "@/server/admin";
import { defineRoute } from "../../../_lib/define-route";
import { respond } from "../../../_lib/responses";

export const GET = defineRoute({
  access: "admin",
  allowDemoAdmin: true,
  params: orderParamsSchema,
  handle: async ({ viewer, params }) =>
    respond(adminOrderResponseSchema, { order: await getAdminOrder(viewer, params.orderNumber) }),
});
