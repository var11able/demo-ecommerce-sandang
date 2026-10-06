import { z } from "zod";
import { rupiahSchema, slugSchema } from "./common";
import { indonesianProvinces } from "./constants";

export { indonesianProvinces } from "./constants";

export const orderStatusSchema = z.enum([
  "awaiting_payment",
  "paid",
  "shipped",
  "completed",
  "cancelled",
  "refunded",
]);

export const orderNumberSchema = z.string().regex(/^SDG-\d{8}-\d{4,}$/);

export const indonesianPhoneSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s().-]/g, ""))
  .pipe(
    z.string().regex(/^(?:\+62|62|0)8\d{7,11}$/, {
      message: "Enter an Indonesian mobile number, like 0812 3456 7890.",
    }),
  )
  .transform((value) => `+62${value.replace(/^(?:\+62|62|0)/, "")}`);

export const shippingAddressSchema = z.strictObject({
  recipientName: z.string().trim().min(1, { message: "Enter the recipient's name." }).max(100),
  phone: indonesianPhoneSchema,
  street: z.string().trim().min(5, { message: "Enter the street address." }).max(200),
  district: z.string().trim().min(2, { message: "Enter the district (kecamatan)." }).max(100),
  city: z.string().trim().min(2, { message: "Enter the city or regency." }).max(100),
  province: z.enum(indonesianProvinces, { message: "Choose a province." }),
  postalCode: z
    .string()
    .trim()
    .regex(/^\d{5}$/, { message: "Enter a five-digit postal code." }),
});

export const placeOrderBodySchema = z.strictObject({ address: shippingAddressSchema });

export const orderLineSchema = z.strictObject({
  productName: z.string(),
  variantName: z.string(),
  productSlug: slugSchema,
  image: z.string().nullable(),
  unitPrice: rupiahSchema,
  quantity: z.int().positive(),
  lineTotal: rupiahSchema,
});

export const paymentStatusSchema = z.enum([
  "pending",
  "paid",
  "failed",
  "expired",
  "partially_refunded",
  "refunded",
]);

export const orderPaymentSchema = z.strictObject({
  status: paymentStatusSchema,
  amount: rupiahSchema,
  method: z.string().nullable(),
  createdAt: z.iso.datetime(),
  expiresAt: z.iso.datetime().nullable(),
  paidAt: z.iso.datetime().nullable(),
});

export const orderRefundSchema = z.strictObject({
  amount: rupiahSchema,
  reason: z.string(),
  status: z.enum(["pending", "succeeded", "failed"]),
  createdAt: z.iso.datetime(),
});

export const orderSummarySchema = z.strictObject({
  orderNumber: orderNumberSchema,
  status: orderStatusSchema,
  total: rupiahSchema,
  itemCount: z.int().nonnegative(),
  createdAt: z.iso.datetime(),
});

export const orderDetailSchema = z.strictObject({
  orderNumber: orderNumberSchema,
  status: orderStatusSchema,
  subtotal: rupiahSchema,
  shippingFee: rupiahSchema,
  total: rupiahSchema,
  createdAt: z.iso.datetime(),
  payBy: z.iso.datetime(),
  paidAt: z.iso.datetime().nullable(),
  shippedAt: z.iso.datetime().nullable(),
  cancelledAt: z.iso.datetime().nullable(),
  address: z.strictObject({
    recipientName: z.string(),
    phone: z.string(),
    street: z.string(),
    district: z.string(),
    city: z.string(),
    province: z.string(),
    postalCode: z.string(),
  }),
  lines: z.array(orderLineSchema),
  payments: z.array(orderPaymentSchema),
  refunds: z.array(orderRefundSchema),
  canPay: z.boolean(),
});

export const orderListResponseSchema = z.strictObject({ orders: z.array(orderSummarySchema) });
export const orderDetailResponseSchema = z.strictObject({ order: orderDetailSchema });
export const orderParamsSchema = z.strictObject({ orderNumber: orderNumberSchema });

export type OrderStatus = z.infer<typeof orderStatusSchema>;
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;
export type ShippingAddress = z.infer<typeof shippingAddressSchema>;
export type ShippingAddressInput = z.input<typeof shippingAddressSchema>;
export type OrderSummary = z.infer<typeof orderSummarySchema>;
export type OrderDetail = z.infer<typeof orderDetailSchema>;
