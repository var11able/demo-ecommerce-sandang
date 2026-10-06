import { describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/v1/health/route";
import { callRoute } from "../support/http";

vi.mock("@/server/db", () => ({
  getDb: () => ({
    $queryRaw: () => Promise.reject(new Error("connection refused")),
  }),
}));

describe("GET /api/v1/health when the database cannot be read", () => {
  it("answers 503 with the database reported as down", async () => {
    const response = await callRoute(GET);
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "degraded", database: "down" });
  });
});
