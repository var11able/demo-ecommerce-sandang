import { z } from "zod";
import { rupiahSchema, slugSchema } from "./common";

export const productLabelSchema = z.enum(["new", "low_stock"]).nullable();

export const colourSchema = z.strictObject({
  name: z.string().trim().min(1).max(40),
  hex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

export const colourwaySchema = z.strictObject({ slug: slugSchema, colour: colourSchema });

export const categorySchema = z.strictObject({
  slug: slugSchema,
  name: z.string(),
  image: z.string().nullable(),
});

export const productSummarySchema = z.strictObject({
  slug: slugSchema,
  name: z.string(),
  colour: colourSchema.nullable(),
  colourways: z.array(colourwaySchema),
  categorySlug: slugSchema,
  image: z.string().nullable(),
  priceFrom: rupiahSchema,
  weightGrams: z.int().positive(),
  inStock: z.boolean(),
  label: productLabelSchema,
});

export const variantSchema = z.strictObject({
  id: z.uuid(),
  name: z.string(),
  price: rupiahSchema,
  weightGrams: z.int().positive(),
  available: z.int().nonnegative(),
});

export const productDetailSchema = z.strictObject({
  slug: slugSchema,
  name: z.string(),
  description: z.string(),
  material: z.string(),
  colour: colourSchema.nullable(),
  colourways: z.array(colourwaySchema),
  category: z.strictObject({ slug: slugSchema, name: z.string() }),
  images: z.array(z.string()),
  label: productLabelSchema,
  variants: z.array(variantSchema),
});

export const productSortSchema = z.enum(["newest", "price_asc", "price_desc"]);

export const productListQuerySchema = z.strictObject({
  category: slugSchema.optional(),
  q: z.string().trim().min(1).max(100).optional(),
  sort: productSortSchema.default("newest"),
});

export const categoryListResponseSchema = z.strictObject({ categories: z.array(categorySchema) });
export const productListResponseSchema = z.strictObject({
  products: z.array(productSummarySchema),
});
export const productDetailResponseSchema = z.strictObject({ product: productDetailSchema });

export type Category = z.infer<typeof categorySchema>;
export type ProductSummary = z.infer<typeof productSummarySchema>;
export type ProductDetail = z.infer<typeof productDetailSchema>;
export type ProductVariant = z.infer<typeof variantSchema>;
export type Colour = z.infer<typeof colourSchema>;
export type Colourway = z.infer<typeof colourwaySchema>;
export type ProductLabel = z.infer<typeof productLabelSchema>;
export type ProductSort = z.infer<typeof productSortSchema>;
export type ProductListQuery = z.input<typeof productListQuerySchema>;
