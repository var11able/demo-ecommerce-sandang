import { adminOrderResponseSchema, refundBodySchema } from "@/contracts/admin";
import { orderParamsSchema } from "@/contracts/orders";
import { getAdminOrder, refundOrder } from "@/server/admin";
import { defineRoute } from "../../../../_lib/define-route";
import { respond } from "../../../../_lib/responses";

export const POST = defineRoute({
  access: "admin",
  allowDemoAdmin: true,
  params: orderParamsSchema,
  body: refundBodySchema,
  handle: async ({ viewer, params, body }) => {
    await refundOrder(viewer, params.orderNumber, body.amount, body.reason);
    return respond(
      adminOrderResponseSchema,
      { order: await getAdminOrder(viewer, params.orderNumber) },
      { status: 201 },
    );
  },
});
