import { POST as login } from "@/app/api/v1/auth/login/route";
import { POST as register } from "@/app/api/v1/auth/register/route";
import { getDb } from "@/server/db";
import { callRoute } from "./http";

let counter = 0;

export const testPassword = "correct horse battery";

export function sessionCookieFrom(response: Response): string | undefined {
  const header = response.headers.get("set-cookie") ?? "";
  const match = header.match(/sandang_session=([^;]*)/);
  return match?.[1] ? `sandang_session=${match[1]}` : undefined;
}

export async function registerCustomer(
  options: { email?: string; password?: string; name?: string; ip?: string } = {},
): Promise<{ email: string; cookie: string; id: string }> {
  counter += 1;
  const email = options.email ?? `customer${counter}@example.com`;
  const response = await callRoute(register, {
    method: "POST",
    body: { email, password: options.password ?? testPassword, name: options.name ?? "Sari" },
    ip: options.ip ?? `198.51.100.${counter % 250}`,
  });
  const cookie = sessionCookieFrom(response);
  if (response.status !== 201 || !cookie) {
    throw new Error(`Registration failed with ${response.status}`);
  }
  const customer = await getDb().customer.findUniqueOrThrow({ where: { email } });
  return { email, cookie, id: customer.id };
}

export async function registerAdmin(
  role: "admin" | "demo_admin" = "admin",
): Promise<{ email: string; cookie: string; id: string }> {
  const customer = await registerCustomer();
  await getDb().customer.update({ where: { id: customer.id }, data: { role } });
  return customer;
}

export async function logIn(email: string, password = testPassword): Promise<Response> {
  return callRoute(login, { method: "POST", body: { email, password } });
}
