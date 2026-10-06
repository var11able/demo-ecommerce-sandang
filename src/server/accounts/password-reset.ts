import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { PasswordResetConfirmBody } from "@/contracts/accounts";
import { getDb } from "../db";
import { recordPasswordReset } from "../email";
import { StoreError } from "../errors";
import { consumeRateLimits, rateLimits } from "../rate-limit";
import { hashPassword } from "./passwords";

export const resetLinkMinutes = 30;

export const resetRequested =
  "If an account uses that address, we have sent it a link to choose a new password.";
export const resetRefused = "This link has expired or was already used. Ask for a new one.";
export const resetDone = "Your password is changed. Log in with your new password.";

function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function requestPasswordReset(
  email: string,
  visitor: string,
  now: Date = new Date(),
): Promise<void> {
  await consumeRateLimits(
    [rateLimits.passwordResetPerEmail(email), rateLimits.passwordResetPerVisitor(visitor)],
    now,
  );
  const token = randomBytes(32).toString("base64url");
  const customer = await getDb().customer.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, isSeeded: true },
  });
  if (!customer || customer.isSeeded) {
    return;
  }
  await getDb().$transaction(async (tx) => {
    await tx.passwordReset.deleteMany({ where: { customerId: customer.id, usedAt: null } });
    const reset = await tx.passwordReset.create({
      data: {
        customerId: customer.id,
        tokenHash: hashResetToken(token),
        createdAt: now,
        expiresAt: new Date(now.getTime() + resetLinkMinutes * 60 * 1000),
      },
    });
    await recordPasswordReset(tx, { id: reset.id, token, minutes: resetLinkMinutes }, customer);
  });
}

export async function completePasswordReset(
  input: PasswordResetConfirmBody,
  visitor: string,
  now: Date = new Date(),
): Promise<void> {
  await consumeRateLimits([rateLimits.passwordResetConfirmPerVisitor(visitor)], now);
  const tokenHash = hashResetToken(input.token);
  const passwordHash = await hashPassword(input.password);
  await getDb().$transaction(async (tx) => {
    const { count } = await tx.passwordReset.updateMany({
      where: { tokenHash, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (count === 0) {
      throw new StoreError("invalid_request", resetRefused);
    }
    const { customerId } = await tx.passwordReset.findUniqueOrThrow({
      where: { tokenHash },
      select: { customerId: true },
    });
    await tx.customer.update({ where: { id: customerId }, data: { passwordHash } });
    await tx.session.deleteMany({ where: { customerId } });
    await tx.passwordReset.deleteMany({ where: { customerId, usedAt: null } });
  });
}
