import { expect, test } from "@playwright/test";
import { addProductToCart, fillAddress, registerThroughPage, snapWindow } from "./support";

test("a Customer buys a Product with a sandbox card and sees the payment confirmed", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await registerThroughPage(page);
  await addProductToCart(page, "trucker-cap-white");
  await page.goto("/checkout");
  await fillAddress(page);
  await page.getByRole("button", { name: "Place order" }).click();

  const snap = snapWindow(page);
  await snap.getByText("Card Payment").click({ timeout: 30_000 });
  await snap.getByPlaceholder("1234 1234 1234 1234").fill("4811 1111 1111 1114");
  await snap.locator("#card-expiry").fill("12/30");
  await snap.locator("#card-cvv").fill("123");
  await snap.getByRole("button", { name: "Pay now" }).click();

  await expect(page).toHaveURL(/\/orders\/SDG-\d{8}-\d{4}\/confirmation/, { timeout: 60_000 });
  await expect(page.getByText("Payment received")).toBeVisible({ timeout: 60_000 });

  await page.getByRole("link", { name: "View the order" }).click();
  await expect(page.getByText("Paid").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Pay/ })).toHaveCount(0);
});
