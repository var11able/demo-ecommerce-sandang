import { z } from "zod";
import { rupiahSchema, slugSchema } from "./common";

import { maxLineQuantity } from "./constants";

export { maxLineQuantity } from "./constants";

export const cartLineSchema = z.strictObject({
  variantId: z.uuid(),
  productSlug: slugSchema,
  productName: z.string(),
  variantName: z.string(),
  image: z.string().nullable(),
  unitPrice: rupiahSchema,
  quantity: z.int().positive(),
  lineTotal: rupiahSchema,
  available: z.int().nonnegative(),
});

export const cartSchema = z.strictObject({
  lines: z.array(cartLineSchema),
  itemCount: z.int().nonnegative(),
  subtotal: rupiahSchema,
  shippingFee: rupiahSchema,
  total: rupiahSchema,
  canCheckout: z.boolean(),
});

export const cartResponseSchema = z.strictObject({ cart: cartSchema });

export const cartLineParamsSchema = z.strictObject({ variantId: z.uuid() });

export const setCartLineBodySchema = z.strictObject({
  quantity: z.int().min(1).max(maxLineQuantity),
});

export type Cart = z.infer<typeof cartSchema>;
export type CartLine = z.infer<typeof cartLineSchema>;
