import { beforeEach, describe, expect, it } from "vitest";
import { GET as daily } from "@/app/api/v1/internal/daily/route";
import { getDb } from "@/server/db";
import { readEnvironment } from "@/server/env";
import { registerCustomer } from "../support/accounts";
import { createTestProduct } from "../support/catalogue";
import { resetDatabase } from "../support/database";
import { callRoute } from "../support/http";
import { placeTestOrder } from "../support/orders";
import { startTestPayment, useFakeGateway } from "../support/payments";

function callDaily(authorization?: string) {
  return callRoute(daily, { headers: authorization ? { authorization } : {} });
}

describe("GET /api/v1/internal/daily", () => {
  beforeEach(async () => {
    await resetDatabase();
    useFakeGateway();
  });

  it("answers 401 without the cron secret, or with a wrong one", async () => {
    expect((await callDaily()).status).toBe(401);
    expect((await callDaily("Bearer wrong")).status).toBe(401);
    expect((await callDaily(readEnvironment().CRON_SECRET)).status).toBe(401);
  });

  it("cancels overdue Orders nobody opened again and deletes expired sessions", async () => {
    const customer = await registerCustomer();
    const product = await createTestProduct({ variants: [{ stock: 4 }] });
    const variantId = product.variants[0]!.id;
    const order = await placeTestOrder(customer.cookie, [{ variantId, quantity: 3 }]);
    await startTestPayment(customer.cookie, order.orderNumber);
    await getDb().payment.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    await getDb().order.updateMany({ data: { payBy: new Date(Date.now() - 1000) } });
    await getDb().session.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });

    const response = await callDaily(`Bearer ${readEnvironment().CRON_SECRET}`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ done: true });

    const reread = await getDb().order.findUniqueOrThrow({
      where: { orderNumber: order.orderNumber },
      include: { payments: true },
    });
    expect(reread.status).toBe("cancelled");
    expect(reread.payments[0]?.status).toBe("expired");
    expect(
      await getDb().variant.findUniqueOrThrow({
        where: { id: variantId },
        select: { reserved: true },
      }),
    ).toEqual({ reserved: 0 });
    expect(await getDb().session.count()).toBe(0);
  });
});
