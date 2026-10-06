import "server-only";
import { getDb } from "../db";
import { seedAccounts, seedCatalogue } from "../seed";
import { demoCatalogue } from "../seed/catalogue-data";

const keepForMs = 24 * 60 * 60 * 1000;

export type DemoResetResult = {
  deletedOrders: number;
  deletedCustomers: number;
  deletedSessions: number;
  deletedSubscribers: number;
};

export async function resetDemoData(now: Date = new Date()): Promise<DemoResetResult> {
  const db = getDb();
  const cutoff = new Date(now.getTime() - keepForMs);

  const deletedOrders = (await db.order.deleteMany({ where: { createdAt: { lt: cutoff } } })).count;
  const deletedCustomers = (
    await db.customer.deleteMany({ where: { isSeeded: false, createdAt: { lt: cutoff } } })
  ).count;
  const deletedSessions = (await db.session.deleteMany({ where: { createdAt: { lt: cutoff } } }))
    .count;
  const deletedSubscribers = (
    await db.subscriber.deleteMany({ where: { createdAt: { lt: cutoff } } })
  ).count;
  await db.paymentNotification.deleteMany({ where: { receivedAt: { lt: cutoff } } });

  await db.variant.updateMany({ data: { reserved: 0 } });
  await seedCatalogue({ restoreStock: true, now });
  const seededSlugs = demoCatalogue.flatMap((category) =>
    category.products.map((product) => product.slug),
  );
  await db.product.updateMany({
    where: { slug: { notIn: seededSlugs } },
    data: { isPublished: false },
  });
  await db.$executeRaw`
    UPDATE "variant" AS v
    SET "reserved" = LEAST(v."stock", COALESCE((
      SELECT SUM(l."quantity")::int
      FROM "order_line" l
      JOIN "order" o ON o."id" = l."order_id"
      WHERE l."variant_id" = v."id" AND o."status" = 'awaiting_payment'
    ), 0)),
    "updated_at" = now()
  `;
  await seedAccounts({ admin: null, demoMode: true });

  return { deletedOrders, deletedCustomers, deletedSessions, deletedSubscribers };
}
