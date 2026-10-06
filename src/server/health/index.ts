import "server-only";
import type { HealthReport } from "@/contracts/health";
import { getDb } from "../db";

export async function checkHealth(): Promise<HealthReport> {
  try {
    await getDb().$queryRaw`SELECT 1`;
    return { status: "ok", database: "up" };
  } catch {
    return { status: "degraded", database: "down" };
  }
}
