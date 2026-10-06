import { z } from "zod";
import { rupiahSchema } from "./common";
import { orderStatusSchema, paymentStatusSchema } from "./orders";

export const startedPaymentSchema = z.strictObject({
  token: z.string(),
  redirectUrl: z.string(),
  expiresAt: z.iso.datetime(),
});

export const startPaymentResponseSchema = z.strictObject({ payment: startedPaymentSchema });

export const paymentStateSchema = z.strictObject({
  status: paymentStatusSchema,
  method: z.string().nullable(),
  amount: rupiahSchema,
  createdAt: z.iso.datetime(),
  expiresAt: z.iso.datetime().nullable(),
  token: z.string().nullable(),
});

export const paymentStatusResponseSchema = z.strictObject({
  orderNumber: z.string(),
  orderStatus: orderStatusSchema,
  canPay: z.boolean(),
  payBy: z.iso.datetime(),
  payment: paymentStateSchema.nullable(),
  checkedAt: z.iso.datetime(),
});

export type StartedPayment = z.infer<typeof startedPaymentSchema>;
export type PaymentState = z.infer<typeof paymentStateSchema>;
export type PaymentStatusResponse = z.infer<typeof paymentStatusResponseSchema>;
