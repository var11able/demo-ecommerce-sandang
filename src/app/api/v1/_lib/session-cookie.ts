import { sessionLifetimeSeconds } from "@/server/accounts";

export const sessionCookieName = "sandang_session";

const attributes = "Path=/; HttpOnly; Secure; SameSite=Lax";

export function sessionCookie(token: string): string {
  return `${sessionCookieName}=${token}; ${attributes}; Max-Age=${sessionLifetimeSeconds}`;
}

export function clearedSessionCookie(): string {
  return `${sessionCookieName}=; ${attributes}; Max-Age=0`;
}
