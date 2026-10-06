import "server-only";
import type { LoginBody, RegisterBody } from "@/contracts/accounts";
import { getDb } from "../db";
import { StoreError } from "../errors";
import { consumeRateLimits, rateLimits } from "../rate-limit";
import { hashPassword, spendPasswordCheckTime, verifyPassword } from "./passwords";
import { createSession, deleteSession, type SessionCustomer } from "./sessions";

export { hashPassword } from "./passwords";
export {
  deleteExpiredSessions,
  findSessionCustomer,
  sessionLifetimeSeconds,
  type SessionCustomer,
} from "./sessions";

export const registrationRefused = "Check your details and try again";
export const loginRefused = "Email or password is incorrect";

export type SignedIn = { customer: SessionCustomer; token: string; expiresAt: Date };

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

export async function register(input: RegisterBody, visitor: string): Promise<SignedIn> {
  await consumeRateLimits([rateLimits.registerPerVisitor(visitor)]);
  const passwordHash = await hashPassword(input.password);
  try {
    const customer = await getDb().customer.create({
      data: { email: input.email, name: input.name, passwordHash },
      select: { id: true, email: true, name: true, role: true },
    });
    const session = await createSession(customer.id);
    return { customer, ...session };
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new StoreError("invalid_request", registrationRefused);
    }
    throw error;
  }
}

export async function logIn(
  input: LoginBody,
  visitor: string,
  previousToken?: string,
): Promise<SignedIn> {
  await consumeRateLimits([
    rateLimits.loginPerEmail(input.email),
    rateLimits.loginPerVisitor(visitor),
  ]);
  const customer = await getDb().customer.findUnique({ where: { email: input.email } });
  if (!customer) {
    await spendPasswordCheckTime(input.password);
    throw new StoreError("unauthenticated", loginRefused);
  }
  if (!(await verifyPassword(customer.passwordHash, input.password))) {
    throw new StoreError("unauthenticated", loginRefused);
  }
  await deleteSession(previousToken);
  const session = await createSession(customer.id);
  return {
    customer: { id: customer.id, email: customer.email, name: customer.name, role: customer.role },
    ...session,
  };
}

export async function logOut(token: string | undefined): Promise<void> {
  await deleteSession(token);
}

export {
  completePasswordReset,
  requestPasswordReset,
  resetDone,
  resetLinkMinutes,
  resetRequested,
} from "./password-reset";
