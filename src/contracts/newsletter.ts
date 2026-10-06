import { z } from "zod";
import { emailSchema } from "./accounts";

export const subscribeBodySchema = z.strictObject({ email: emailSchema });

export const unsubscribeBodySchema = z.strictObject({
  token: z.string().regex(/^[A-Za-z0-9_-]{20,100}$/, { message: "This link is not valid." }),
});

export const newsletterResponseSchema = z.strictObject({ message: z.string() });

export const subscriberSchema = z.strictObject({
  email: z.string(),
  subscribedAt: z.iso.datetime(),
});

export const subscriberListQuerySchema = z.strictObject({
  format: z.enum(["json", "csv"]).default("json"),
});

export const subscriberListResponseSchema = z.strictObject({
  subscribers: z.array(subscriberSchema),
});

export type Subscriber = z.infer<typeof subscriberSchema>;
