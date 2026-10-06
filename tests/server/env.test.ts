import { describe, expect, it } from "vitest";
import { EnvironmentError, parseEnvironment } from "@/server/env";

const validEnvironment = {
  DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/sandang",
  APP_ORIGIN: "http://localhost:3000",
  CRON_SECRET: "a-local-secret-of-enough-length",
  DEMO_MODE: "false",
  MIDTRANS_IS_PRODUCTION: "false",
  MIDTRANS_SERVER_KEY: "SB-Mid-server-test-key",
  NEXT_PUBLIC_MIDTRANS_CLIENT_KEY: "SB-Mid-client-test-key",
  NEXT_PUBLIC_MIDTRANS_SNAP_URL: "https://app.sandbox.midtrans.com/snap/snap.js",
};

function problemsFor(source: Record<string, string | undefined>): string[] {
  try {
    parseEnvironment(source);
  } catch (error) {
    if (error instanceof EnvironmentError) {
      return error.problems;
    }
    throw error;
  }
  return [];
}

describe("parseEnvironment", () => {
  it("accepts a complete local environment and turns flags into booleans", () => {
    const environment = parseEnvironment(validEnvironment);
    expect(environment.DEMO_MODE).toBe(false);
    expect(environment.MIDTRANS_IS_PRODUCTION).toBe(false);
  });

  it("names every missing variable", () => {
    expect(
      problemsFor({ ...validEnvironment, DATABASE_URL: undefined, CRON_SECRET: undefined }),
    ).toEqual(["DATABASE_URL is missing", "CRON_SECRET is missing"]);
  });

  it("treats an empty value as missing", () => {
    expect(problemsFor({ ...validEnvironment, APP_ORIGIN: "" })).toEqual(["APP_ORIGIN is missing"]);
  });

  it("rejects a database address that is not PostgreSQL", () => {
    expect(problemsFor({ ...validEnvironment, DATABASE_URL: "mysql://localhost/sandang" })).toEqual(
      ["DATABASE_URL is invalid"],
    );
  });

  it("refuses demo mode together with production Midtrans", () => {
    expect(
      problemsFor({ ...validEnvironment, DEMO_MODE: "true", MIDTRANS_IS_PRODUCTION: "true" }),
    ).toEqual(["MIDTRANS_IS_PRODUCTION must be false while DEMO_MODE is true"]);
  });

  it("never echoes a value in its error message", () => {
    const shortSecret = "too-short";
    expect(() => parseEnvironment({ ...validEnvironment, CRON_SECRET: shortSecret })).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining(shortSecret) }),
    );
  });
});
