import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { Role } from "@/contracts/accounts";
import { getDb } from "../db";

export const sessionLifetimeSeconds = 7 * 24 * 60 * 60;

export type SessionCustomer = { id: string; email: string; name: string; role: Role };

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(
  customerId: string,
  now: Date = new Date(),
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + sessionLifetimeSeconds * 1000);
  await getDb().session.create({
    data: { customerId, tokenHash: hashSessionToken(token), expiresAt },
  });
  return { token, expiresAt };
}

export async function findSessionCustomer(
  token: string | undefined,
  now: Date = new Date(),
): Promise<SessionCustomer | null> {
  if (!token || token.length > 100) {
    return null;
  }
  const session = await getDb().session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: { customer: { select: { id: true, email: true, name: true, role: true } } },
  });
  if (!session || session.expiresAt <= now) {
    return null;
  }
  return session.customer;
}

export async function deleteSession(token: string | undefined): Promise<void> {
  if (!token) {
    return;
  }
  await getDb().session.deleteMany({ where: { tokenHash: hashSessionToken(token) } });
}

export async function deleteExpiredSessions(now: Date = new Date()): Promise<number> {
  const { count } = await getDb().session.deleteMany({ where: { expiresAt: { lte: now } } });
  return count;
}
