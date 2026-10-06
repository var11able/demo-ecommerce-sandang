import { expect, test } from "@playwright/test";
import { addProductToCart, fillAddress, registerThroughPage, snapWindow } from "./support";

test("a Customer checks out, the Midtrans window opens, and the Order waits for payment", async ({
  page,
}) => {
  await registerThroughPage(page);
  await addProductToCart(page, "tapered-chinos-khaki", 2);
  await page.goto("/cart");
  await page.getByRole("link", { name: "Go to checkout" }).click();
  await expect(page.getByRole("heading", { name: "Checkout", level: 1 })).toBeVisible();

  await fillAddress(page, "12345");
  await page.getByRole("button", { name: "Place order" }).click();
  await expect(
    page.getByText("Enter an Indonesian mobile number, like 0812 3456 7890."),
  ).toBeVisible();

  await page.getByLabel("Mobile number").fill("0812 3456 7890");
  await page.getByRole("button", { name: "Place order" }).click();
  await expect(snapWindow(page).getByText("Rp798.000").first()).toBeVisible({ timeout: 20_000 });

  await page.goto("/account");
  await expect(page.getByRole("heading", { name: "Your orders" })).toBeVisible();
  const orderLink = page.getByRole("link", { name: /SDG-\d{8}-\d{4}/ });
  await expect(orderLink).toHaveCount(1);
  await orderLink.click();

  await expect(page.getByText("Awaiting payment").first()).toBeVisible();
  await expect(page.getByText("+6281234567890")).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Order summary" }).getByText("Rp 798.000"),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue payment" })).toBeVisible();

  await page.getByRole("link", { name: "Cart" }).first().click();
  await expect(page.getByRole("heading", { name: "Your cart is empty" })).toBeVisible();
});
