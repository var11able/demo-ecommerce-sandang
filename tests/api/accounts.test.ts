import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { POST as login } from "@/app/api/v1/auth/login/route";
import { POST as logout } from "@/app/api/v1/auth/logout/route";
import { POST as register } from "@/app/api/v1/auth/register/route";
import { GET as me } from "@/app/api/v1/me/route";
import { getDb } from "@/server/db";
import { logIn, registerCustomer, sessionCookieFrom, testPassword } from "../support/accounts";
import { resetDatabase } from "../support/database";
import { callRoute, readJson } from "../support/http";

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
const tokenOf = (cookie: string) => cookie.split("=")[1] ?? "";

describe("registration", () => {
  beforeEach(resetDatabase);

  it("creates a Customer, logs them in, and returns no token in the body", async () => {
    const response = await callRoute(register, {
      method: "POST",
      body: { email: "  Sari@Example.com ", password: testPassword, name: "Sari" },
    });
    expect(response.status).toBe(201);
    const body = await readJson<{ customer: unknown }>(response);
    expect(body).toEqual({
      customer: { email: "sari@example.com", name: "Sari", role: "customer" },
    });
    expect(JSON.stringify(body)).not.toContain(tokenOf(sessionCookieFrom(response) ?? ""));
  });

  it("stores the password as an Argon2id hash", async () => {
    const { email } = await registerCustomer();
    const customer = await getDb().customer.findUniqueOrThrow({ where: { email } });
    expect(customer.passwordHash).toMatch(/^\$argon2id\$/);
    expect(customer.passwordHash).not.toContain(testPassword);
  });

  it("sets the session cookie with HttpOnly, Secure, SameSite=Lax, Path=/, and no Domain", async () => {
    const response = await callRoute(register, {
      method: "POST",
      body: { email: "a@example.com", password: testPassword, name: "A" },
    });
    const header = response.headers.get("set-cookie") ?? "";
    expect(header).toMatch(/^sandang_session=[A-Za-z0-9_-]{43};/);
    expect(header).toContain("HttpOnly");
    expect(header).toContain("Secure");
    expect(header).toContain("SameSite=Lax");
    expect(header).toContain("Path=/");
    expect(header).toContain("Max-Age=604800");
    expect(header.toLowerCase()).not.toContain("domain=");
  });

  it("stores only the SHA-256 hash of the session token", async () => {
    const { cookie } = await registerCustomer();
    const token = tokenOf(cookie);
    const sessions = await getDb().session.findMany();
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.tokenHash).toBe(sha256(token));
    expect(sessions[0]?.tokenHash).not.toBe(token);
  });

  it("answers the same way for a taken email as for invalid details", async () => {
    await registerCustomer({ email: "taken@example.com" });
    const taken = await callRoute(register, {
      method: "POST",
      body: { email: "taken@example.com", password: testPassword, name: "B" },
    });
    const shortPassword = await callRoute(register, {
      method: "POST",
      body: { email: "new@example.com", password: "short", name: "B" },
    });
    expect(taken.status).toBe(400);
    expect(shortPassword.status).toBe(400);
    const takenBody = await readJson<{ error: { code: string; message: string } }>(taken);
    const shortBody = await readJson<{ error: { code: string; message: string } }>(shortPassword);
    expect(takenBody.error.message).toBe("Check your details and try again");
    expect(shortBody.error.message).toBe(takenBody.error.message);
    expect(shortBody.error.code).toBe(takenBody.error.code);
    expect(taken.headers.get("set-cookie")).toBeNull();
  });

  it("rejects fields it does not know, such as a role", async () => {
    const response = await callRoute(register, {
      method: "POST",
      body: { email: "x@example.com", password: testPassword, name: "X", role: "admin" },
    });
    expect(response.status).toBe(400);
    expect(await getDb().customer.count()).toBe(0);
  });

  it("limits registration to five per visitor address per hour", async () => {
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const response = await callRoute(register, {
        method: "POST",
        body: { email: `r${attempt}@example.com`, password: testPassword, name: "R" },
        ip: "192.0.2.77",
      });
      statuses.push(response.status);
      if (attempt === 5) {
        expect(Number(response.headers.get("retry-after"))).toBeGreaterThan(0);
      }
    }
    expect(statuses).toEqual([201, 201, 201, 201, 201, 429]);
  });
});

describe("login", () => {
  beforeEach(resetDatabase);

  it("logs in with the right password and issues a new token each time", async () => {
    const { email, cookie: first } = await registerCustomer();
    const response = await logIn(email);
    expect(response.status).toBe(200);
    const second = sessionCookieFrom(response);
    expect(second).toBeDefined();
    expect(second).not.toBe(first);
  });

  it("answers identically for a wrong password and an unknown email", async () => {
    const { email } = await registerCustomer();
    const wrongPassword = await logIn(email, "not the password at all");
    const unknownEmail = await logIn("nobody@example.com", "not the password at all");
    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(await readJson(wrongPassword)).toEqual(await readJson(unknownEmail));
    expect(wrongPassword.headers.get("set-cookie")).toBeNull();
  });

  it("says only that the email or password is incorrect", async () => {
    const response = await logIn("nobody@example.com", "whatever-password");
    expect(await readJson(response)).toEqual({
      error: { code: "unauthenticated", message: "Email or password is incorrect" },
    });
  });

  it("replaces the session the browser already had", async () => {
    const { email, cookie } = await registerCustomer();
    const response = await callRoute(login, {
      method: "POST",
      body: { email, password: testPassword },
      cookie,
    });
    expect(response.status).toBe(200);
    expect(await callRoute(me, { cookie }).then((r) => r.status)).toBe(401);
  });

  it("limits attempts to five per email per 15 minutes", async () => {
    const { email } = await registerCustomer();
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 6; attempt += 1) {
      statuses.push((await logIn(email, "wrong password here")).status);
    }
    expect(statuses).toEqual([401, 401, 401, 401, 401, 429]);
    expect((await logIn(email)).status).toBe(429);
  });

  it("limits attempts to twenty per visitor address across emails", async () => {
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 21; attempt += 1) {
      const response = await callRoute(login, {
        method: "POST",
        body: { email: `guess${attempt}@example.com`, password: "wrong password here" },
        ip: "192.0.2.200",
      });
      statuses.push(response.status);
    }
    expect(statuses.filter((status) => status === 401)).toHaveLength(20);
    expect(statuses.at(-1)).toBe(429);
  });
});

describe("session", () => {
  beforeEach(resetDatabase);

  it("identifies the Customer from the cookie", async () => {
    const { email, cookie } = await registerCustomer({ name: "Budi" });
    const response = await callRoute(me, { cookie });
    expect(response.status).toBe(200);
    expect(await readJson(response)).toEqual({
      customer: { email, name: "Budi", role: "customer" },
    });
  });

  it("refuses a missing, unknown, or expired session", async () => {
    const { cookie } = await registerCustomer();
    expect((await callRoute(me)).status).toBe(401);
    expect((await callRoute(me, { cookie: "sandang_session=made-up-token" })).status).toBe(401);
    await getDb().session.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await callRoute(me, { cookie })).status).toBe(401);
  });

  it("logs out by deleting the session and clearing the cookie", async () => {
    const { cookie } = await registerCustomer();
    const response = await callRoute(logout, { method: "POST", cookie });
    expect(response.status).toBe(204);
    expect(response.headers.get("set-cookie")).toMatch(/sandang_session=;.*Max-Age=0/);
    expect(await getDb().session.count()).toBe(0);
    expect((await callRoute(me, { cookie })).status).toBe(401);
  });
});

describe("forged requests", () => {
  beforeEach(resetDatabase);

  const body = { email: "f@example.com", password: testPassword, name: "F" };

  it("refuses a state change with no Origin header", async () => {
    const response = await callRoute(register, { method: "POST", body, origin: null });
    expect(response.status).toBe(403);
  });

  it("refuses a state change from another site", async () => {
    const response = await callRoute(register, {
      method: "POST",
      body,
      origin: "https://evil.example",
    });
    expect(response.status).toBe(403);
    expect(await getDb().customer.count()).toBe(0);
  });

  it("refuses a body that is not JSON", async () => {
    const response = await callRoute(register, {
      method: "POST",
      rawBody: new URLSearchParams(body).toString(),
      headers: { "content-type": "application/x-www-form-urlencoded" },
    });
    expect(response.status).toBe(415);
    expect(await getDb().customer.count()).toBe(0);
  });

  it("refuses logout from another site", async () => {
    const { cookie } = await registerCustomer();
    const response = await callRoute(logout, {
      method: "POST",
      cookie,
      origin: "https://evil.example",
    });
    expect(response.status).toBe(403);
    expect(await getDb().session.count()).toBe(1);
  });
});
