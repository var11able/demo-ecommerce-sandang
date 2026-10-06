import {
  orderDetailResponseSchema,
  orderListResponseSchema,
  placeOrderBodySchema,
} from "@/contracts/orders";
import { listCustomerOrders, placeOrder } from "@/server/orders";
import { defineRoute } from "../_lib/define-route";
import { respond } from "../_lib/responses";

export const GET = defineRoute({
  access: "customer",
  handle: async ({ viewer }) =>
    respond(orderListResponseSchema, { orders: await listCustomerOrders(viewer.id) }),
});

export const POST = defineRoute({
  access: "customer",
  body: placeOrderBodySchema,
  handle: async ({ viewer, body }) =>
    respond(
      orderDetailResponseSchema,
      { order: await placeOrder(viewer.id, body.address) },
      { status: 201 },
    ),
});
