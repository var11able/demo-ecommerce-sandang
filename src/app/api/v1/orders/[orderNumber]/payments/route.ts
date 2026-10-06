import { orderParamsSchema } from "@/contracts/orders";
import { startPaymentResponseSchema } from "@/contracts/payments";
import { startPayment } from "@/server/payments";
import { defineRoute } from "../../../_lib/define-route";
import { respond } from "../../../_lib/responses";

export const POST = defineRoute({
  access: "customer",
  params: orderParamsSchema,
  handle: async ({ viewer, params }) =>
    respond(
      startPaymentResponseSchema,
      { payment: await startPayment(viewer, params.orderNumber) },
      { status: 201 },
    ),
});
