import { beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/server/db";
import { resetDemoData } from "@/server/maintenance";
import { seedAccounts, seedCatalogue } from "@/server/seed";
import { registerCustomer } from "../support/accounts";
import { resetDatabase } from "../support/database";
import { placeTestOrder } from "../support/orders";

const dayMs = 24 * 60 * 60 * 1000;

async function variantOf(slug: string) {
  return getDb().variant.findFirstOrThrow({
    where: { product: { slug } },
    orderBy: { position: "asc" },
  });
}

describe("the daily demo reset", () => {
  beforeEach(async () => {
    await resetDatabase();
    await seedCatalogue();
    await seedAccounts({ admin: null, demoMode: true });
  });

  it("deletes old visitors' data and keeps the seeded accounts", async () => {
    const visitor = await registerCustomer();
    const tee = await variantOf("boxy-tee-white");
    const order = await placeTestOrder(visitor.cookie, [{ variantId: tee.id, quantity: 2 }]);
    await getDb().customer.update({
      where: { id: visitor.id },
      data: { createdAt: new Date(Date.now() - 2 * dayMs) },
    });
    await getDb().order.update({
      where: { orderNumber: order.orderNumber },
      data: { createdAt: new Date(Date.now() - 2 * dayMs) },
    });
    await getDb().subscriber.create({
      data: {
        email: "old@example.com",
        unsubscribeToken: "token-old",
        createdAt: new Date(Date.now() - 2 * dayMs),
      },
    });

    const result = await resetDemoData();
    expect(result).toMatchObject({ deletedOrders: 1, deletedCustomers: 1, deletedSubscribers: 1 });
    expect(await getDb().order.count()).toBe(0);
    expect(
      (await getDb().customer.findMany({ select: { email: true } })).map((c) => c.email).sort(),
    ).toEqual(["admin@demo.sandang.test", "customer@demo.sandang.test"]);
    expect((await variantOf("boxy-tee-white")).reserved).toBe(0);
  });

  it("keeps recent Orders and their Reservations", async () => {
    const visitor = await registerCustomer();
    const tee = await variantOf("boxy-tee-white");
    await placeTestOrder(visitor.cookie, [{ variantId: tee.id, quantity: 2 }]);
    await resetDemoData();
    expect(await getDb().order.count()).toBe(1);
    expect((await variantOf("boxy-tee-white")).reserved).toBe(2);
  });

  it("restores the seeded catalogue and Stock and hides Products added since", async () => {
    const tee = await variantOf("boxy-tee-white");
    await getDb().variant.update({ where: { id: tee.id }, data: { stock: 0, price: 1 } });
    await getDb().product.update({
      where: { slug: "boxy-tee-white" },
      data: { name: "Vandalised" },
    });
    const category = await getDb().category.findFirstOrThrow();
    await getDb().product.create({
      data: {
        slug: "added-by-a-visitor",
        name: "Added",
        description: "x",
        material: "x",
        isPublished: true,
        categoryId: category.id,
      },
    });

    await resetDemoData();

    const restored = await variantOf("boxy-tee-white");
    expect(restored).toMatchObject({ stock: 20, price: 179000 });
    expect(
      (await getDb().product.findUniqueOrThrow({ where: { slug: "boxy-tee-white" } })).name,
    ).toBe("Boxy Tee");
    expect(
      (await getDb().product.findUniqueOrThrow({ where: { slug: "added-by-a-visitor" } }))
        .isPublished,
    ).toBe(false);
  });
});
