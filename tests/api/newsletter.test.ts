import { beforeEach, describe, expect, it } from "vitest";
import { GET as listSubscribers } from "@/app/api/v1/admin/subscribers/route";
import { POST as subscribe } from "@/app/api/v1/newsletter/subscribers/route";
import { POST as unsubscribe } from "@/app/api/v1/newsletter/unsubscribe/route";
import { getDb } from "@/server/db";
import { registerAdmin } from "../support/accounts";
import { resetDatabase } from "../support/database";
import { callRoute, readJson } from "../support/http";

let visitorCounter = 0;

function subscribeAs(email: string, ip?: string) {
  visitorCounter += 1;
  return callRoute(subscribe, {
    method: "POST",
    body: { email },
    ip: ip ?? `198.51.100.${visitorCounter % 250}`,
  });
}

async function tokenFor(email: string): Promise<string> {
  return (await getDb().subscriber.findUniqueOrThrow({ where: { email } })).unsubscribeToken;
}

describe("subscribing", () => {
  beforeEach(resetDatabase);

  it("adds a new address and says so", async () => {
    const response = await subscribeAs("Sari@Example.com");
    expect(response.status).toBe(200);
    expect(await readJson(response)).toEqual({ message: "You're on the list." });
    const subscriber = await getDb().subscriber.findUniqueOrThrow({
      where: { email: "sari@example.com" },
    });
    expect(subscriber.unsubscribedAt).toBeNull();
    expect(subscriber.unsubscribeToken).toMatch(/^[A-Za-z0-9_-]{40,}$/);
  });

  it("answers exactly the same for an address already on the list", async () => {
    const first = await subscribeAs("sari@example.com");
    const again = await subscribeAs("sari@example.com");
    expect(again.status).toBe(first.status);
    expect(await readJson(again)).toEqual(await readJson(first));
    expect(await getDb().subscriber.count()).toBe(1);
  });

  it("re-activates an address that unsubscribed, with a new token", async () => {
    await subscribeAs("sari@example.com");
    const oldToken = await tokenFor("sari@example.com");
    await callRoute(unsubscribe, { method: "POST", body: { token: oldToken } });

    const response = await subscribeAs("sari@example.com");
    expect(await readJson(response)).toEqual({ message: "You're on the list." });
    const subscriber = await getDb().subscriber.findUniqueOrThrow({
      where: { email: "sari@example.com" },
    });
    expect(subscriber.unsubscribedAt).toBeNull();
    expect(subscriber.unsubscribeToken).not.toBe(oldToken);
  });

  it("asks for a full email address", async () => {
    const response = await subscribeAs("sari@");
    expect(response.status).toBe(400);
    expect(await readJson(response)).toMatchObject({
      error: { fields: { email: "Enter a full email address, like name@example.com." } },
    });
  });

  it("limits each address to three sign-ups an hour", async () => {
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 4; attempt += 1) {
      statuses.push((await subscribeAs("sari@example.com")).status);
    }
    expect(statuses).toEqual([200, 200, 200, 429]);
  });

  it("limits each visitor to ten sign-ups an hour", async () => {
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 11; attempt += 1) {
      statuses.push((await subscribeAs(`person${attempt}@example.com`, "192.0.2.50")).status);
    }
    expect(statuses.slice(0, 10).every((status) => status === 200)).toBe(true);
    expect(statuses[10]).toBe(429);
  });

  it("refuses a sign-up from another site", async () => {
    const response = await callRoute(subscribe, {
      method: "POST",
      body: { email: "sari@example.com" },
      origin: "https://evil.example",
    });
    expect(response.status).toBe(403);
  });
});

describe("unsubscribing", () => {
  beforeEach(resetDatabase);

  it("unsubscribes with the token from the link, and saying it twice is fine", async () => {
    await subscribeAs("sari@example.com");
    const token = await tokenFor("sari@example.com");
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await callRoute(unsubscribe, { method: "POST", body: { token } });
      expect(response.status).toBe(200);
      expect(await readJson(response)).toEqual({ message: "You've been unsubscribed." });
    }
    const subscriber = await getDb().subscriber.findUniqueOrThrow({
      where: { email: "sari@example.com" },
    });
    expect(subscriber.unsubscribedAt).not.toBeNull();
  });

  it("refuses a token it never issued", async () => {
    const response = await callRoute(unsubscribe, {
      method: "POST",
      body: { token: "a".repeat(43) },
    });
    expect(response.status).toBe(404);
    const malformed = await callRoute(unsubscribe, { method: "POST", body: { token: "x" } });
    expect(malformed.status).toBe(400);
  });

  it("never takes an email address instead of a token", async () => {
    const response = await callRoute(unsubscribe, {
      method: "POST",
      body: { email: "sari@example.com" },
    });
    expect(response.status).toBe(400);
  });
});

describe("the Subscriber list", () => {
  beforeEach(resetDatabase);

  it("lists current Subscribers for an Admin", async () => {
    const admin = await registerAdmin();
    await subscribeAs("a@example.com");
    await subscribeAs("b@example.com");
    await callRoute(unsubscribe, {
      method: "POST",
      body: { token: await tokenFor("b@example.com") },
    });

    const response = await callRoute(listSubscribers, { cookie: admin.cookie });
    expect(response.status).toBe(200);
    const body = (await readJson(response)) as { subscribers: { email: string }[] };
    expect(body.subscribers.map((subscriber) => subscriber.email)).toEqual(["a@example.com"]);
  });

  it("exports CSV that a spreadsheet cannot run as a formula", async () => {
    const admin = await registerAdmin();
    await subscribeAs("+cmd@example.com");
    await subscribeAs("plain@example.com");
    const response = await callRoute(listSubscribers, {
      cookie: admin.cookie,
      query: { format: "csv" },
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/csv");
    expect(response.headers.get("content-disposition")).toMatch(
      /attachment; filename="subscribers-/,
    );
    const lines = (await response.text()).trim().split("\r\n");
    expect(lines[0]).toBe("email,subscribed_at");
    expect(lines).toContainEqual(expect.stringMatching(/^"'\+cmd@example\.com",/));
    expect(lines).toContainEqual(expect.stringMatching(/^"plain@example\.com",/));
  });

  it("is hidden from the demo Admin", async () => {
    const demo = await registerAdmin("demo_admin");
    expect((await callRoute(listSubscribers, { cookie: demo.cookie })).status).toBe(403);
  });
});
