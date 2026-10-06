import { expect, test, type Page } from "@playwright/test";
import { endToEndAdmin } from "../../playwright.config";
import { addProductToCart, fillAddress, registerThroughPage, snapWindow } from "./support";

async function logIn(page: Page, email: string, password: string) {
  await page.goto("/login?next=/admin/orders");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("heading", { name: "Orders", level: 1 })).toBeVisible();
}

async function placeUnpaidOrder(page: Page): Promise<string> {
  await registerThroughPage(page, "Budi Santoso");
  await addProductToCart(page, "canvas-backpack-navy");
  await page.goto("/checkout");
  await fillAddress(page);
  await page.getByRole("button", { name: "Place order" }).click();
  await expect(snapWindow(page).getByText("Order ID").first()).toBeVisible({ timeout: 30_000 });
  await page.goto("/account");
  const link = page.getByRole("link", { name: /SDG-\d{8}-\d{4}/ }).first();
  const orderNumber = (await link.textContent())?.match(/SDG-\d{8}-\d{4}/)?.[0];
  if (!orderNumber) {
    throw new Error("No order number found");
  }
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page.getByRole("link", { name: "Log in" }).first()).toBeVisible();
  return orderNumber;
}

test("an Admin cancels an unpaid Order and changes Stock", async ({ page }) => {
  test.setTimeout(90_000);
  const orderNumber = await placeUnpaidOrder(page);

  await logIn(page, endToEndAdmin.email, endToEndAdmin.password);
  await page.getByRole("link", { name: "Awaiting payment" }).click();
  await page.getByRole("link", { name: orderNumber }).click();
  await expect(page.getByText("Budi Santoso").first()).toBeVisible();

  page.once("dialog", (dialog) => void dialog.accept());
  await page.getByRole("button", { name: "Cancel order" }).click();
  await expect(page.getByText("Cancelled").first()).toBeVisible();

  await page.getByRole("link", { name: "Products", exact: true }).click();
  await page.getByRole("link", { name: "Canvas Backpack" }).click();
  const firstSize = page.locator("form").filter({ hasText: "Save size" }).first();
  await firstSize.getByLabel("Stock").fill("77");
  await firstSize.getByRole("button", { name: "Save size" }).click();
  await expect(firstSize.getByText("Saved.")).toBeVisible();
});

test("the demo Admin sees the demo notice and masked Customer details", async ({ page }) => {
  test.setTimeout(90_000);
  const orderNumber = await placeUnpaidOrder(page);

  await logIn(page, "admin@demo.sandang.test", "sandang-demo-admin");
  await expect(page.getByText("You are using the demo Admin")).toBeVisible();
  await expect(page.getByRole("link", { name: "Subscribers" })).toHaveCount(0);
  await page.goto(`/admin/orders/${orderNumber}`);
  await expect(page.getByText("B*** S***").first()).toBeVisible();
  await expect(page.getByText("Budi Santoso")).toHaveCount(0);

  await page.goto("/admin/products");
  await expect(page.getByRole("link", { name: "New product" })).toHaveCount(0);
});

test("an Admin uploads a photo to a Product", async ({ page }) => {
  await logIn(page, endToEndAdmin.email, endToEndAdmin.password);
  await page.goto("/admin/products");
  await page.getByRole("link", { name: "Trucker Cap" }).click();
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
    "base64",
  );
  await page.getByLabel("Upload a photo").setInputFiles({
    name: "new-photo.png",
    mimeType: "image/png",
    buffer: png,
  });
  await expect(page.getByRole("button", { name: "Remove" })).toHaveCount(2);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved.").first()).toBeVisible();
});

test("the Admin can read recorded emails, and the demo Admin cannot reach them", async ({
  page,
}) => {
  await logIn(page, endToEndAdmin.email, endToEndAdmin.password);
  await page.getByRole("link", { name: "Emails" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Emails" })).toBeVisible();
  await expect(page.getByText("No email service is connected")).toBeVisible();
  await page.getByRole("button", { name: "Log out" }).click();

  await logIn(page, "admin@demo.sandang.test", "sandang-demo-admin");
  await expect(page.getByRole("link", { name: "Emails" })).toHaveCount(0);
  await page.goto("/admin/emails");
  await expect(page.getByRole("heading", { level: 1, name: "Emails" })).toHaveCount(0);
  await expect(page.getByText("No email service is connected")).toHaveCount(0);
});
