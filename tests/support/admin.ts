import { GET as getAdminOrder } from "@/app/api/v1/admin/orders/[orderNumber]/route";
import { POST as cancelOrder } from "@/app/api/v1/admin/orders/[orderNumber]/cancel/route";
import { POST as refundOrder } from "@/app/api/v1/admin/orders/[orderNumber]/refunds/route";
import { POST as shipOrder } from "@/app/api/v1/admin/orders/[orderNumber]/ship/route";
import { adminOrderResponseSchema } from "@/contracts/admin";
import { callRoute, readJson } from "./http";

export async function adminOrder(cookie: string, orderNumber: string) {
  const response = await callRoute(getAdminOrder, { cookie, params: { orderNumber } });
  if (response.status !== 200) {
    throw new Error(`Could not read the admin order: ${response.status}`);
  }
  return adminOrderResponseSchema.parse(await readJson(response)).order;
}

export function shipRequest(cookie: string, orderNumber: string) {
  return callRoute(shipOrder, { method: "POST", cookie, params: { orderNumber } });
}

export function cancelRequest(cookie: string, orderNumber: string) {
  return callRoute(cancelOrder, { method: "POST", cookie, params: { orderNumber } });
}

export function refundRequest(
  cookie: string,
  orderNumber: string,
  amount: number,
  reason = "Damaged in transit",
) {
  return callRoute(refundOrder, {
    method: "POST",
    cookie,
    params: { orderNumber },
    body: { amount, reason },
  });
}
