import "server-only";
import { getDb } from "../db";
import { StoreError } from "../errors";

export type RateLimitRule = { key: string; limit: number; windowSeconds: number };

export const rateLimits = {
  loginPerEmail: (email: string): RateLimitRule => ({
    key: `login:email:${email}`,
    limit: 5,
    windowSeconds: 15 * 60,
  }),
  loginPerVisitor: (visitor: string): RateLimitRule => ({
    key: `login:visitor:${visitor}`,
    limit: 20,
    windowSeconds: 15 * 60,
  }),
  registerPerVisitor: (visitor: string): RateLimitRule => ({
    key: `register:visitor:${visitor}`,
    limit: 5,
    windowSeconds: 60 * 60,
  }),
  subscribePerEmail: (email: string): RateLimitRule => ({
    key: `subscribe:email:${email}`,
    limit: 3,
    windowSeconds: 60 * 60,
  }),
  subscribePerVisitor: (visitor: string): RateLimitRule => ({
    key: `subscribe:visitor:${visitor}`,
    limit: 10,
    windowSeconds: 60 * 60,
  }),
  passwordResetPerEmail: (email: string): RateLimitRule => ({
    key: `reset:email:${email}`,
    limit: 3,
    windowSeconds: 60 * 60,
  }),
  passwordResetPerVisitor: (visitor: string): RateLimitRule => ({
    key: `reset:visitor:${visitor}`,
    limit: 10,
    windowSeconds: 60 * 60,
  }),
  passwordResetConfirmPerVisitor: (visitor: string): RateLimitRule => ({
    key: `reset-confirm:visitor:${visitor}`,
    limit: 20,
    windowSeconds: 60 * 60,
  }),
  placeOrderPerCustomer: (customerId: string): RateLimitRule => ({
    key: `order:customer:${customerId}`,
    limit: 10,
    windowSeconds: 60 * 60,
  }),
  startPaymentPerOrder: (orderId: string): RateLimitRule => ({
    key: `payment:order:${orderId}`,
    limit: 5,
    windowSeconds: 60 * 60,
  }),
};

function windowStartFor(now: Date, windowSeconds: number): Date {
  const windowMs = windowSeconds * 1000;
  return new Date(Math.floor(now.getTime() / windowMs) * windowMs);
}

async function countHit(rule: RateLimitRule, now: Date): Promise<number> {
  const windowStart = windowStartFor(now, rule.windowSeconds);
  const [row] = await getDb().$queryRaw<{ count: number }[]>`
    INSERT INTO "rate_limit" ("id", "key", "window_start", "count", "updated_at")
    VALUES (gen_random_uuid(), ${rule.key}, ${windowStart}, 1, ${now})
    ON CONFLICT ("key", "window_start")
    DO UPDATE SET "count" = "rate_limit"."count" + 1, "updated_at" = ${now}
    RETURNING "count"
  `;
  return row?.count ?? 1;
}

export async function consumeRateLimits(
  rules: RateLimitRule[],
  now: Date = new Date(),
): Promise<void> {
  let retryAfterSeconds = 0;
  for (const rule of rules) {
    const count = await countHit(rule, now);
    if (count > rule.limit) {
      const windowEnds =
        windowStartFor(now, rule.windowSeconds).getTime() + rule.windowSeconds * 1000;
      retryAfterSeconds = Math.max(
        retryAfterSeconds,
        Math.ceil((windowEnds - now.getTime()) / 1000),
      );
    }
  }
  if (retryAfterSeconds > 0) {
    throw new StoreError(
      "rate_limited",
      `Too many attempts. Try again in ${Math.ceil(retryAfterSeconds / 60)} minutes.`,
      { retryAfterSeconds },
    );
  }
}

export async function deleteExpiredRateLimits(now: Date = new Date()): Promise<number> {
  const { count } = await getDb().rateLimit.deleteMany({
    where: { windowStart: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
  });
  return count;
}
