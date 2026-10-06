import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { deleteExpiredSessions } from "../accounts";
import { readEnvironment } from "../env";
import { settleAllOverdueOrders } from "../payments";
import { deleteExpiredRateLimits } from "../rate-limit";
import { resetDemoData, type DemoResetResult } from "./demo-reset";

export { resetDemoData } from "./demo-reset";

export type DailyJobResult = {
  settledOrders: number;
  deletedSessions: number;
  deletedRateLimits: number;
  demoReset: DemoResetResult | null;
};

export async function runDailyJob(now: Date = new Date()): Promise<DailyJobResult> {
  const settledOrders = await settleAllOverdueOrders(now);
  const deletedSessions = await deleteExpiredSessions(now);
  const deletedRateLimits = await deleteExpiredRateLimits(now);
  const demoReset = readEnvironment().DEMO_MODE ? await resetDemoData(now) : null;
  return { settledOrders, deletedSessions, deletedRateLimits, demoReset };
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

export function isScheduledJobAuthorized(authorization: string | null): boolean {
  const expected = `Bearer ${readEnvironment().CRON_SECRET}`;
  return timingSafeEqual(digest(authorization ?? ""), digest(expected));
}
