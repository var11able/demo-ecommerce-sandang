import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/v1/health/route";
import { callRoute } from "../support/http";
import { healthReportSchema } from "@/contracts/health";

describe("GET /api/v1/health", () => {
  it("reports the database as up when it can be read", async () => {
    const response = await callRoute(GET);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(healthReportSchema.parse(await response.json())).toEqual({
      status: "ok",
      database: "up",
    });
  });
});
