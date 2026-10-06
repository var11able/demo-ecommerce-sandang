import { orderParamsSchema } from "@/contracts/orders";
import { paymentStatusResponseSchema } from "@/contracts/payments";
import { getPaymentStatus } from "@/server/payments";
import { defineRoute } from "../../../_lib/define-route";
import { respond } from "../../../_lib/responses";

export const GET = defineRoute({
  access: "customer",
  params: orderParamsSchema,
  handle: async ({ viewer, params }) =>
    respond(paymentStatusResponseSchema, await getPaymentStatus(viewer.id, params.orderNumber)),
});
