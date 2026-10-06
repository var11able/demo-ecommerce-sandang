import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as listProducts } from "@/app/api/v1/products/route";
import { requiredEnvironmentVariables } from "@/server/env";
import { logIn, registerCustomer } from "../support/accounts";
import { resetDatabase } from "../support/database";
import { callRoute, readJson } from "../support/http";

vi.mock("@/server/catalog", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/server/catalog")>();
  return {
    ...original,
    listProducts: async () => {
      throw new Error(
        'relation "product" does not exist at /srv/app/src/server/catalog/index.ts:42',
      );
    },
  };
});

describe("errors sent to the browser", () => {
  it("carry a short message and a code, and no stack, SQL, or paths", async () => {
    const response = await callRoute(listProducts);
    expect(response.status).toBe(500);
    const body = await readJson(response);
    expect(body).toEqual({ error: { code: "internal_error", message: "Something went wrong" } });
    expect(JSON.stringify(body)).not.toMatch(/relation|src\/server|\.ts|at /);
  });
});

describe("secrets", () => {
  it("never use a NEXT_PUBLIC_ name, which would send them to the browser", () => {
    const browserVariables = requiredEnvironmentVariables.filter((name) =>
      name.startsWith("NEXT_PUBLIC_"),
    );
    expect(browserVariables.sort()).toEqual([
      "NEXT_PUBLIC_MIDTRANS_CLIENT_KEY",
      "NEXT_PUBLIC_MIDTRANS_SNAP_URL",
    ]);
  });
});

describe("login timing", () => {
  beforeEach(resetDatabase);

  async function median(attempt: () => Promise<unknown>): Promise<number> {
    const times: number[] = [];
    for (let run = 0; run < 5; run += 1) {
      const started = performance.now();
      await attempt();
      times.push(performance.now() - started);
    }
    return times.sort((a, b) => a - b)[2]!;
  }

  it("spends as long on an unknown email as on a wrong password", async () => {
    const { email } = await registerCustomer();
    await logIn("warm-up@example.com", "warm up the password hash");
    const wrongPassword = await median(() => logIn(email, "not the right password"));
    const unknownEmail = await median(() =>
      logIn(`nobody-${Math.random()}@example.com`, "not the right password"),
    );
    expect(unknownEmail).toBeGreaterThan(wrongPassword * 0.5);
  });
});
