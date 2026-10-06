import { cookies } from "next/headers";
import { cache } from "react";
import { findSessionCustomer } from "@/server/accounts";
import { sessionCookieName } from "../api/v1/_lib/session-cookie";

export const getViewer = cache(async () => {
  const token = (await cookies()).get(sessionCookieName)?.value;
  return findSessionCustomer(token);
});

export function safeNextPath(value: string | string[] | undefined, fallback = "/"): string {
  const path = Array.isArray(value) ? value[0] : value;
  if (!path || !path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) {
    return fallback;
  }
  return path;
}
