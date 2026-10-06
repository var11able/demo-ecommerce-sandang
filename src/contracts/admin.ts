import { z } from "zod";
import { colourSchema } from "./catalog";
import { rupiahSchema, slugSchema } from "./common";
import {
  orderDetailSchema,
  orderNumberSchema,
  orderStatusSchema,
  paymentStatusSchema,
} from "./orders";

export const imagePathSchema = z
  .string()
  .max(300)
  .regex(
    /^(\/(catalogue|uploads)\/[a-z0-9-]+\.(jpg|jpeg|png|webp)|https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\/uploads\/[a-f0-9]{32}\.(jpg|png|webp))$/,
    { message: "Use a photo uploaded to the store." },
  );

const priceSchema = z.int().positive().max(100_000_000);
const stockSchema = z.int().min(0).max(100_000);
const weightSchema = z.int().positive().max(100_000);

export const adminVariantSchema = z.strictObject({
  id: z.uuid(),
  name: z.string(),
  price: rupiahSchema,
  stock: z.int(),
  reserved: z.int(),
  weightGrams: z.int(),
});

export const adminProductSchema = z.strictObject({
  id: z.uuid(),
  slug: slugSchema,
  name: z.string(),
  categorySlug: slugSchema,
  categoryName: z.string(),
  material: z.string(),
  colour: colourSchema.nullable(),
  styleGroup: slugSchema.nullable(),
  description: z.string(),
  images: z.array(z.string()),
  isPublished: z.boolean(),
  variants: z.array(adminVariantSchema),
});

export const adminCategorySchema = z.strictObject({
  id: z.uuid(),
  slug: slugSchema,
  name: z.string(),
  position: z.int(),
  productCount: z.int(),
});

const productFields = {
  categorySlug: slugSchema,
  name: z.string().trim().min(1).max(100),
  slug: slugSchema,
  description: z.string().trim().min(1).max(2000),
  material: z.string().trim().min(1).max(100),
  colour: colourSchema.nullable().optional(),
  styleGroup: slugSchema.nullable().optional(),
  images: z.array(imagePathSchema).max(8),
  isPublished: z.boolean(),
};

export const variantInputSchema = z.strictObject({
  name: z.string().trim().min(1).max(50),
  price: priceSchema,
  stock: stockSchema,
  weightGrams: weightSchema,
});

export const createProductBodySchema = z.strictObject({
  ...productFields,
  slug: slugSchema.optional(),
  variants: z.array(variantInputSchema).min(1).max(10),
});

export const updateProductBodySchema = z
  .strictObject(productFields)
  .partial()
  .refine((body) => Object.keys(body).length > 0, { message: "Change at least one field." });

export const createVariantBodySchema = variantInputSchema.extend({ productId: z.uuid() });

export const updateVariantBodySchema = variantInputSchema
  .partial()
  .refine((body) => Object.keys(body).length > 0, { message: "Change at least one field." });

export const createCategoryBodySchema = z.strictObject({
  name: z.string().trim().min(1).max(50),
  slug: slugSchema.optional(),
});

export const updateCategoryBodySchema = z
  .strictObject({
    name: z.string().trim().min(1).max(50),
    slug: slugSchema,
    position: z.int().min(0).max(1000),
  })
  .partial()
  .refine((body) => Object.keys(body).length > 0, { message: "Change at least one field." });

export const idParamsSchema = z.strictObject({ id: z.uuid() });

export const adminOrderFilterSchema = z.enum(["to_ship", "all", ...orderStatusSchema.options]);

export const adminOrderListQuerySchema = z.strictObject({
  status: adminOrderFilterSchema.default("to_ship"),
  q: z.string().trim().min(1).max(100).optional(),
});

export const adminOrderSummarySchema = z.strictObject({
  orderNumber: orderNumberSchema,
  status: orderStatusSchema,
  total: rupiahSchema,
  customerName: z.string(),
  customerEmail: z.string(),
  itemCount: z.int(),
  createdAt: z.iso.datetime(),
  paidAt: z.iso.datetime().nullable(),
  needsReview: z.boolean(),
});

export const adminPaymentSchema = z.strictObject({
  reference: z.string(),
  status: paymentStatusSchema,
  amount: rupiahSchema,
  method: z.string().nullable(),
  createdAt: z.iso.datetime(),
  paidAt: z.iso.datetime().nullable(),
  needsReview: z.boolean(),
  reviewReason: z.string().nullable(),
});

export const adminOrderDetailSchema = orderDetailSchema.extend({
  customer: z.strictObject({ name: z.string(), email: z.string() }),
  adminPayments: z.array(adminPaymentSchema),
  refundableAmount: rupiahSchema,
  canShip: z.boolean(),
  canCancel: z.boolean(),
});

export const refundBodySchema = z.strictObject({
  amount: z.int().positive(),
  reason: z.string().trim().min(3).max(200),
});

export const uploadResponseSchema = z.strictObject({ url: z.string() });

export const adminProductListResponseSchema = z.strictObject({
  products: z.array(adminProductSchema),
});
export const adminProductResponseSchema = z.strictObject({ product: adminProductSchema });
export const adminCategoryListResponseSchema = z.strictObject({
  categories: z.array(adminCategorySchema),
});
export const adminCategoryResponseSchema = z.strictObject({ category: adminCategorySchema });
export const adminOrderListResponseSchema = z.strictObject({
  orders: z.array(adminOrderSummarySchema),
});
export const adminOrderResponseSchema = z.strictObject({ order: adminOrderDetailSchema });

export type AdminProduct = z.infer<typeof adminProductSchema>;
export type AdminCategory = z.infer<typeof adminCategorySchema>;
export type AdminOrderSummary = z.infer<typeof adminOrderSummarySchema>;
export type AdminOrderDetail = z.infer<typeof adminOrderDetailSchema>;
export type AdminOrderFilter = z.infer<typeof adminOrderFilterSchema>;
export type CreateProductBody = z.infer<typeof createProductBodySchema>;
export type UpdateProductBody = z.infer<typeof updateProductBodySchema>;
export type VariantInput = z.infer<typeof variantInputSchema>;
