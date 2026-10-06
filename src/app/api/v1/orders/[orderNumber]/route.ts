import { orderDetailResponseSchema, orderParamsSchema } from "@/contracts/orders";
import { getCustomerOrder } from "@/server/orders";
import { defineRoute } from "../../_lib/define-route";
import { respond } from "../../_lib/responses";

export const GET = defineRoute({
  access: "customer",
  params: orderParamsSchema,
  handle: async ({ viewer, params }) =>
    respond(orderDetailResponseSchema, {
      order: await getCustomerOrder(viewer.id, params.orderNumber),
    }),
});
