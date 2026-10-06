import { z } from "zod";

export const rupiahSchema = z.int().nonnegative();

export const slugSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const errorResponseSchema = z.strictObject({
  error: z.strictObject({
    code: z.string(),
    message: z.string(),
    retryAfterSeconds: z.int().optional(),
    fields: z.record(z.string(), z.string()).optional(),
  }),
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;
