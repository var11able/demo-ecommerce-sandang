import "server-only";
import { randomBytes } from "node:crypto";
import type { Subscriber } from "@/contracts/newsletter";
import { getDb } from "../db";
import { notFound } from "../errors";
import { consumeRateLimits, rateLimits } from "../rate-limit";

export const subscribedMessage = "You're on the list.";
export const unsubscribedMessage = "You've been unsubscribed.";

function newToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function subscribe(email: string, visitor: string, now: Date = new Date()) {
  await consumeRateLimits(
    [rateLimits.subscribePerEmail(email), rateLimits.subscribePerVisitor(visitor)],
    now,
  );
  const db = getDb();
  const existing = await db.subscriber.findUnique({ where: { email } });
  if (!existing) {
    await db.subscriber
      .create({ data: { email, unsubscribeToken: newToken(), subscribedAt: now } })
      .catch((error: unknown) => {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === "P2002"
        ) {
          return null;
        }
        throw error;
      });
  } else if (existing.unsubscribedAt) {
    await db.subscriber.update({
      where: { id: existing.id },
      data: { unsubscribedAt: null, subscribedAt: now, unsubscribeToken: newToken() },
    });
  }
  return { message: subscribedMessage };
}

export async function unsubscribe(token: string, now: Date = new Date()) {
  const db = getDb();
  const subscriber = await db.subscriber.findUnique({ where: { unsubscribeToken: token } });
  if (!subscriber) {
    throw notFound("This unsubscribe link is not valid.");
  }
  if (!subscriber.unsubscribedAt) {
    await db.subscriber.update({ where: { id: subscriber.id }, data: { unsubscribedAt: now } });
  }
  return { message: unsubscribedMessage };
}

export async function listSubscribers(): Promise<Subscriber[]> {
  const subscribers = await getDb().subscriber.findMany({
    where: { unsubscribedAt: null },
    orderBy: { subscribedAt: "asc" },
  });
  return subscribers.map((subscriber) => ({
    email: subscriber.email,
    subscribedAt: subscriber.subscribedAt.toISOString(),
  }));
}

function csvCell(value: string): string {
  const neutralised = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${neutralised.replaceAll('"', '""')}"`;
}

export function subscribersToCsv(subscribers: Subscriber[]): string {
  const rows = subscribers.map(
    (subscriber) => `${csvCell(subscriber.email)},${csvCell(subscriber.subscribedAt)}`,
  );
  return ["email,subscribed_at", ...rows].join("\r\n").concat("\r\n");
}
