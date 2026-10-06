import { beforeEach, describe, expect, it } from "vitest";
import { GET as listAdminOrders } from "@/app/api/v1/admin/orders/route";
import { adminOrderListResponseSchema } from "@/contracts/admin";
import { getDb } from "@/server/db";
import { registerAdmin, registerCustomer } from "../support/accounts";
import { adminOrder } from "../support/admin";
import { createTestProduct } from "../support/catalogue";
import { resetDatabase } from "../support/database";
import { callRoute, readJson } from "../support/http";
import { placeTestOrder } from "../support/orders";

async function orderFor(customer: { cookie: string }) {
  const product = await createTestProduct();
  return placeTestOrder(customer.cookie, [{ variantId: product.variants[0]!.id, quantity: 1 }]);
}

describe("personal details for the demo Admin", () => {
  beforeEach(resetDatabase);

  it("are masked for real Customers", async () => {
    const demo = await registerAdmin("demo_admin");
    const customer = await registerCustomer({ name: "Sari Wulandari", email: "sari@example.com" });
    const order = await orderFor(customer);

    const detail = await adminOrder(demo.cookie, order.orderNumber);
    expect(detail.customer).toEqual({ name: "S*** W***", email: "s***@example.com" });
    expect(detail.address).toMatchObject({
      recipientName: "S*** W***",
      phone: "+6281****890",
      street: "***",
      city: "Jakarta Selatan",
    });

    const response = await callRoute(listAdminOrders, {
      cookie: demo.cookie,
      query: { status: "all" },
    });
    const { orders } = adminOrderListResponseSchema.parse(await readJson(response));
    expect(orders[0]).toMatchObject({
      customerName: "S*** W***",
      customerEmail: "s***@example.com",
    });
  });

  it("are shown for the seeded demo Customer", async () => {
    const demo = await registerAdmin("demo_admin");
    const seeded = await registerCustomer({
      name: "Dewi Demo",
      email: "demo-customer@example.com",
    });
    await getDb().customer.update({ where: { id: seeded.id }, data: { isSeeded: true } });
    const order = await orderFor(seeded);
    const detail = await adminOrder(demo.cookie, order.orderNumber);
    expect(detail.customer).toEqual({ name: "Dewi Demo", email: "demo-customer@example.com" });
  });

  it("are shown in full to a real Admin", async () => {
    const admin = await registerAdmin();
    const customer = await registerCustomer({ name: "Sari Wulandari", email: "sari2@example.com" });
    const order = await orderFor(customer);
    const detail = await adminOrder(admin.cookie, order.orderNumber);
    expect(detail.customer).toEqual({ name: "Sari Wulandari", email: "sari2@example.com" });
    expect(detail.address.phone).toBe("+6281234567890");
  });
});
