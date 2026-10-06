import { existsSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/server/db";
import { readSeedAdmin } from "@/server/env";
import { demoLogins, seedAccounts, seedCatalogue } from "@/server/seed";
import { demoCatalogue } from "@/server/seed/catalogue-data";
import { logIn } from "../support/accounts";
import { resetDatabase } from "../support/database";

describe("seedCatalogue", () => {
  beforeEach(resetDatabase);

  it("creates every Category, Product, and Variant of the demo catalogue", async () => {
    await seedCatalogue();
    const db = getDb();
    const products = demoCatalogue.flatMap((category) => category.products);
    expect(await db.category.count()).toBe(demoCatalogue.length);
    expect(await db.product.count()).toBe(products.length);
    expect(await db.variant.count()).toBe(
      products.reduce((sum, product) => sum + product.variants.length, 0),
    );
  });

  it("can run twice without creating duplicates", async () => {
    await seedCatalogue();
    await seedCatalogue();
    expect(await getDb().product.count()).toBe(
      demoCatalogue.flatMap((category) => category.products).length,
    );
  });

  it("keeps Stock an Admin changed when it runs again", async () => {
    await seedCatalogue();
    await getDb().variant.updateMany({ data: { stock: 7 } });
    await seedCatalogue();
    const stocks = await getDb().variant.findMany({ select: { stock: true } });
    expect(stocks.every(({ stock }) => stock === 7)).toBe(true);
  });

  it("gives every colourway a colour, and shares style groups only within one Category", () => {
    for (const category of demoCatalogue) {
      for (const product of category.products) {
        expect(product.colour, product.slug).toBeDefined();
      }
    }
    const groupCategories = new Map<string, Set<string>>();
    for (const category of demoCatalogue) {
      for (const product of category.products) {
        if (product.styleGroup) {
          const seen = groupCategories.get(product.styleGroup) ?? new Set<string>();
          groupCategories.set(product.styleGroup, seen.add(category.slug));
        }
      }
    }
    for (const categories of groupCategories.values()) {
      expect(categories.size).toBe(1);
    }
  });

  it("points every Product photo at a file in public/", () => {
    const images = demoCatalogue.flatMap((category) =>
      category.products.flatMap((product) => product.images),
    );
    expect(images.length).toBeGreaterThan(0);
    for (const image of images) {
      expect(existsSync(join("public", image))).toBe(true);
    }
  });
});

describe("seedAccounts", () => {
  beforeEach(resetDatabase);

  const admin = { email: "owner@example.com", password: "a long admin password" };

  it("creates the first Admin from the environment, able to log in", async () => {
    expect(await seedAccounts({ admin, demoMode: false })).toEqual({
      admin: "created",
      demoAccounts: 0,
    });
    const created = await getDb().customer.findUniqueOrThrow({ where: { email: admin.email } });
    expect(created.role).toBe("admin");
    expect(created.passwordHash).toMatch(/^\$argon2id\$/);
    expect((await logIn(admin.email, admin.password)).status).toBe(200);
  });

  it("skips the Admin when the variables are empty", async () => {
    expect(await seedAccounts({ admin: null, demoMode: false })).toEqual({
      admin: "skipped",
      demoAccounts: 0,
    });
    expect(await getDb().customer.count()).toBe(0);
  });

  it("creates the demo Customer and demo Admin only in demo mode", async () => {
    await seedAccounts({ admin: null, demoMode: true });
    const accounts = await getDb().customer.findMany({ orderBy: { email: "asc" } });
    expect(accounts.map(({ email, role, isSeeded }) => ({ email, role, isSeeded }))).toEqual([
      { email: "admin@demo.sandang.test", role: "demo_admin", isSeeded: true },
      { email: "customer@demo.sandang.test", role: "customer", isSeeded: true },
    ]);
    for (const login of demoLogins) {
      expect((await logIn(login.email, login.password)).status).toBe(200);
    }
  });

  it("refuses an Admin password shorter than ten characters", () => {
    expect(() => readSeedAdmin({ ADMIN_EMAIL: "a@example.com", ADMIN_PASSWORD: "short" })).toThrow(
      "Environment is not configured: ADMIN_PASSWORD must be at least 10 characters",
    );
  });

  it("names only the Admin variable that is wrong", () => {
    expect(() =>
      readSeedAdmin({ ADMIN_EMAIL: "not-an-email", ADMIN_PASSWORD: "a long enough password" }),
    ).toThrow("Environment is not configured: ADMIN_EMAIL must be an email address");
  });
});
