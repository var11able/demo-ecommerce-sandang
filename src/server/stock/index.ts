import "server-only";
import type { Transaction } from "../db";

export type StockLine = { variantId: string; quantity: number };

export type LockedVariant = {
  id: string;
  name: string;
  price: number;
  stock: number;
  reserved: number;
};

export async function lockVariants(
  tx: Transaction,
  variantIds: string[],
): Promise<LockedVariant[]> {
  const ids = [...new Set(variantIds)].sort();
  if (ids.length === 0) {
    return [];
  }
  return tx.$queryRaw<LockedVariant[]>`
    SELECT "id", "name", "price", "stock", "reserved"
    FROM "variant"
    WHERE "id" = ANY(${ids}::uuid[])
    ORDER BY "id"
    FOR UPDATE
  `;
}

function quantitiesByVariant(lines: StockLine[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const line of lines) {
    totals.set(line.variantId, (totals.get(line.variantId) ?? 0) + line.quantity);
  }
  return totals;
}

export async function addReservation(tx: Transaction, lines: StockLine[]): Promise<void> {
  for (const [variantId, quantity] of quantitiesByVariant(lines)) {
    await tx.variant.update({
      where: { id: variantId },
      data: { reserved: { increment: quantity } },
    });
  }
}

export async function releaseReservation(tx: Transaction, lines: StockLine[]): Promise<void> {
  await lockVariants(
    tx,
    lines.map((line) => line.variantId),
  );
  for (const [variantId, quantity] of quantitiesByVariant(lines)) {
    await tx.$executeRaw`
      UPDATE "variant"
      SET "reserved" = GREATEST(0, "reserved" - ${quantity}), "updated_at" = now()
      WHERE "id" = ${variantId}::uuid
    `;
  }
}

export async function deductReservedStock(tx: Transaction, lines: StockLine[]): Promise<void> {
  await lockVariants(
    tx,
    lines.map((line) => line.variantId),
  );
  for (const [variantId, quantity] of quantitiesByVariant(lines)) {
    await tx.$executeRaw`
      UPDATE "variant"
      SET "stock" = GREATEST(0, "stock" - ${quantity}),
          "reserved" = GREATEST(0, "reserved" - ${quantity}),
          "updated_at" = now()
      WHERE "id" = ${variantId}::uuid
    `;
  }
}
