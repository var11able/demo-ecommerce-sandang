import { POST as receiveNotification } from "@/app/api/v1/payments/midtrans/notifications/route";
import { POST as startPayment } from "@/app/api/v1/orders/[orderNumber]/payments/route";
import { GET as paymentStatus } from "@/app/api/v1/orders/[orderNumber]/payment-status/route";
import { paymentStatusResponseSchema, startPaymentResponseSchema } from "@/contracts/payments";
import { getDb } from "@/server/db";
import { FakePaymentGateway } from "@/server/payments/fake";
import { usePaymentGateway } from "@/server/payments/registry";
import { callRoute, readJson } from "./http";

export function useFakeGateway(): FakePaymentGateway {
  const gateway = new FakePaymentGateway();
  usePaymentGateway(gateway);
  return gateway;
}

export async function startPaymentRequest(cookie: string, orderNumber: string) {
  return callRoute(startPayment, { method: "POST", cookie, params: { orderNumber } });
}

export async function startTestPayment(cookie: string, orderNumber: string) {
  const response = await startPaymentRequest(cookie, orderNumber);
  if (response.status !== 201) {
    throw new Error(`Could not start a payment: ${response.status} ${await response.text()}`);
  }
  return startPaymentResponseSchema.parse(await readJson(response)).payment;
}

export async function sendNotification(body: unknown) {
  return callRoute(receiveNotification, {
    method: "POST",
    rawBody: JSON.stringify(body),
    origin: null,
  });
}

export async function readPaymentStatus(cookie: string, orderNumber: string) {
  const response = await callRoute(paymentStatus, { cookie, params: { orderNumber } });
  if (response.status !== 200) {
    throw new Error(`Could not read the payment status: ${response.status}`);
  }
  return paymentStatusResponseSchema.parse(await readJson(response));
}

export async function paymentsOf(orderNumber: string) {
  return getDb().payment.findMany({
    where: { order: { orderNumber } },
    orderBy: { attempt: "asc" },
  });
}

export async function orderRow(orderNumber: string) {
  return getDb().order.findUniqueOrThrow({ where: { orderNumber } });
}
