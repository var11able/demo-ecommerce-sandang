import { expect, type Page } from "@playwright/test";

let counter = 0;

export async function registerThroughPage(page: Page, name = "Sari"): Promise<string> {
  counter += 1;
  const email = `e2e-${Date.now()}-${counter}@example.com`;
  const visitor = `198.51.100.${(Date.now() + counter) % 250}`;
  await page.route("**/api/v1/auth/register", (route) =>
    route.continue({ headers: { ...route.request().headers(), "x-forwarded-for": visitor } }),
  );
  await page.goto("/register");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password").fill("a long test password");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("link", { name: "Account" }).first()).toBeVisible();
  return email;
}

export async function addProductToCart(page: Page, slug: string, quantity = 1): Promise<void> {
  await page.goto(`/products/${slug}`);
  for (let step = 1; step < quantity; step += 1) {
    await page.getByRole("button", { name: "Increase quantity" }).click();
  }
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByRole("button", { name: "Added" })).toBeVisible();
}

export async function fillAddress(page: Page, phone = "0812 3456 7890"): Promise<void> {
  await page.getByLabel("Recipient name").fill("Sari Wulandari");
  await page.getByLabel("Mobile number").fill(phone);
  await page.getByLabel("Street address").fill("Jalan Kemang Raya No. 8");
  await page.getByLabel("District (kecamatan)").fill("Mampang Prapatan");
  await page.getByLabel("City or regency").fill("Jakarta Selatan");
  await page.getByLabel("Province").selectOption("DKI Jakarta");
  await page.getByLabel("Postal code").fill("12730");
}

export function snapWindow(page: Page) {
  return page.frameLocator("#snap-midtrans");
}
