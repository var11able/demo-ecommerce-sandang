import { z } from "zod";

export const minPasswordLength = 10;
export const maxPasswordLength = 128;

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .pipe(z.email({ message: "Enter a full email address, like name@example.com." }));

export const roleSchema = z.enum(["customer", "admin", "demo_admin"]);

export const registerBodySchema = z.strictObject({
  email: emailSchema,
  password: z.string().min(minPasswordLength).max(maxPasswordLength),
  name: z.string().trim().min(1).max(100),
});

export const loginBodySchema = z.strictObject({
  email: z.string().trim().toLowerCase().max(254),
  password: z.string().min(1).max(maxPasswordLength),
});

export const customerSchema = z.strictObject({
  email: z.string(),
  name: z.string(),
  role: roleSchema,
});

export const customerResponseSchema = z.strictObject({ customer: customerSchema });

export type Role = z.infer<typeof roleSchema>;
export type CustomerProfile = z.infer<typeof customerSchema>;
export type RegisterBody = z.infer<typeof registerBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;

export const passwordResetRequestBodySchema = z.strictObject({ email: emailSchema });

export const passwordResetConfirmBodySchema = z.strictObject({
  token: z
    .string()
    .min(20)
    .max(100)
    .regex(/^[A-Za-z0-9_-]+$/),
  password: z.string().min(minPasswordLength).max(maxPasswordLength),
});

export const passwordResetResponseSchema = z.strictObject({ message: z.string() });

export type PasswordResetConfirmBody = z.infer<typeof passwordResetConfirmBodySchema>;
