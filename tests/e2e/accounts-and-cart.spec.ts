import { expect, test } from "@playwright/test";
import { addProductToCart, registerThroughPage } from "./support";

test("adding to the Cart while logged out leads to log in and back", async ({ page }) => {
  await page.goto("/products/boxy-tee-white");
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page).toHaveURL(/\/login\?next=%2Fproducts%2Fboxy-tee-white/);
  await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
});

test("a Customer registers, fills the Cart, changes it, and logs out", async ({ page }) => {
  await registerThroughPage(page);

  await addProductToCart(page, "boxy-tee-white", 2);
  await expect(page.getByRole("link", { name: "Cart, 2 items" }).first()).toBeVisible();
  await addProductToCart(page, "trucker-cap-white");

  await page.getByRole("link", { name: "Cart, 3 items" }).first().click();
  await expect(page.getByRole("heading", { name: "Your cart" })).toBeVisible();
  const summary = page.getByRole("region", { name: "Order summary" });
  await expect(summary.getByText("Rp 507.000")).toBeVisible();
  await expect(summary.getByText("Rp 20.000")).toBeVisible();
  await expect(summary.getByText("Rp 527.000")).toBeVisible();

  await page.getByRole("button", { name: "Remove Trucker Cap" }).click();
  await expect(summary.getByText("Rp 358.000")).toBeVisible();

  await page.getByRole("button", { name: "Decrease quantity" }).click();
  await expect(summary.getByText("Rp 179.000")).toBeVisible();

  await page.getByRole("link", { name: "Account" }).first().click();
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page.getByRole("link", { name: "Log in" }).first()).toBeVisible();
  await page.goto("/cart");
  await expect(page).toHaveURL(/\/login/);
});

test("a wrong password gets one plain message", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("nobody@example.com");
  await page.getByLabel("Password").fill("not the right password");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByText("Email or password is incorrect")).toHaveAttribute("role", "alert");
});

test("a Customer who forgot their password can ask for a link, and a bad link says what to do", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByRole("link", { name: "Forgot your password?" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Reset your password" })).toBeVisible();
  await expect(page.getByText("This is a public demo, so it does not send email.")).toBeVisible();
  await page.getByRole("main").getByLabel("Email").fill("someone@example.com");
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText("If an account uses that address")).toBeVisible();

  await page.goto(`/reset-password?token=${"x".repeat(43)}`);
  await page.getByLabel("New password").fill("a brand new password");
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(page.getByText("This link has expired or was already used.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Ask for a new link" })).toBeVisible();
});
