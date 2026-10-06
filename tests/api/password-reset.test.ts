import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { POST as requestReset } from "@/app/api/v1/auth/password-reset/route";
import { POST as confirmReset } from "@/app/api/v1/auth/password-reset/confirm/route";
import { GET as me } from "@/app/api/v1/me/route";
import { getDb } from "@/server/db";
import { logIn, registerCustomer, testPassword } from "../support/accounts";
import { resetDatabase } from "../support/database";
import { callRoute, readJson } from "../support/http";

const newPassword = "a brand new password";

function askForReset(email: string, ip = "203.0.113.7") {
  return callRoute(requestReset, { method: "POST", body: { email }, ip });
}

function confirm(token: string, password = newPassword) {
  return callRoute(confirmReset, { method: "POST", body: { token, password } });
}

async function resetEmails() {
  return getDb().emailMessage.findMany({
    where: { kind: "password_reset" },
    orderBy: { createdAt: "asc" },
  });
}

async function tokenFromLatestEmail(): Promise<string> {
  const emails = await resetEmails();
  const token = emails.at(-1)?.body.match(/reset-password\?token=([A-Za-z0-9_-]+)/)?.[1];
  if (!token) {
    throw new Error("No reset link in the recorded email");
  }
  return token;
}

describe("password reset", () => {
  beforeEach(resetDatabase);

  it("records a reset link for a known account and keeps only a hash of its token", async () => {
    const customer = await registerCustomer();
    const response = await askForReset(customer.email);
    expect(response.status).toBe(202);

    const emails = await resetEmails();
    expect(emails).toHaveLength(1);
    expect(emails[0]).toMatchObject({ toAddress: customer.email, customerId: customer.id });
    const token = await tokenFromLatestEmail();
    expect(token.length).toBeGreaterThanOrEqual(43);

    const [stored] = await getDb().passwordReset.findMany();
    expect(stored?.tokenHash).toBe(createHash("sha256").update(token).digest("hex"));
    expect(stored?.tokenHash).not.toContain(token);
    const minutes = (stored!.expiresAt.getTime() - stored!.createdAt.getTime()) / 60000;
    expect(Math.round(minutes)).toBe(30);
  });

  it("answers an unknown address exactly like a known one and records nothing", async () => {
    const customer = await registerCustomer();
    const known = await askForReset(customer.email, "203.0.113.8");
    const unknown = await askForReset("nobody@example.com", "203.0.113.9");
    expect(unknown.status).toBe(known.status);
    expect(await readJson(unknown)).toEqual(await readJson(known));
    expect(await resetEmails()).toHaveLength(1);
  });

  it("never resets a seeded demo account", async () => {
    const customer = await registerCustomer();
    await getDb().customer.update({ where: { id: customer.id }, data: { isSeeded: true } });
    expect((await askForReset(customer.email)).status).toBe(202);
    expect(await resetEmails()).toEqual([]);
  });

  it("sets the new password and signs out every session of the account", async () => {
    const customer = await registerCustomer();
    await askForReset(customer.email);
    const response = await confirm(await tokenFromLatestEmail());
    expect(response.status).toBe(200);

    expect((await callRoute(me, { cookie: customer.cookie })).status).toBe(401);
    expect((await logIn(customer.email, testPassword)).status).toBe(401);
    expect((await logIn(customer.email, newPassword)).status).toBe(200);
  });

  it("works once, and not after 30 minutes", async () => {
    const customer = await registerCustomer();
    await askForReset(customer.email);
    const token = await tokenFromLatestEmail();
    expect((await confirm(token)).status).toBe(200);
    expect((await confirm(token, "yet another password")).status).toBe(400);

    await askForReset(customer.email);
    const late = await tokenFromLatestEmail();
    await getDb().passwordReset.updateMany({
      where: { usedAt: null },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    expect((await confirm(late)).status).toBe(400);
  });

  it("cancels an earlier link when a new one is asked for", async () => {
    const customer = await registerCustomer();
    await askForReset(customer.email);
    const first = await tokenFromLatestEmail();
    await askForReset(customer.email);
    expect((await confirm(first)).status).toBe(400);
    expect((await confirm(await tokenFromLatestEmail())).status).toBe(200);
  });

  it("refuses a short password and a made-up token", async () => {
    const customer = await registerCustomer();
    await askForReset(customer.email);
    expect((await confirm(await tokenFromLatestEmail(), "short")).status).toBe(400);
    expect((await confirm("x".repeat(43))).status).toBe(400);
  });

  it("allows three requests per address an hour", async () => {
    const customer = await registerCustomer();
    for (const ip of ["203.0.113.21", "203.0.113.22", "203.0.113.23"]) {
      expect((await askForReset(customer.email, ip)).status).toBe(202);
    }
    expect((await askForReset(customer.email, "203.0.113.24")).status).toBe(429);
  });
});
