import { expect, test } from "@playwright/test";

test("a visitor browses from Home to a Category and a Product", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "New in" })).toBeVisible();

  await page
    .getByRole("navigation", { name: "Categories" })
    .getByRole("link", { name: "Accessories" })
    .click();
  await expect(page.getByRole("heading", { level: 1, name: "Accessories" })).toBeVisible();

  await page
    .getByRole("link", { name: /Woven Tote/ })
    .first()
    .click();
  await expect(page.getByRole("heading", { level: 1, name: "Woven Tote" })).toBeVisible();
  await expect(page.getByText("Rp 449.000")).toBeVisible();

  await page.getByText("Large", { exact: true }).click();
  await expect(page.getByText("Rp 549.000")).toBeVisible();
});

test("the New in tabs show the newest clothes from one Category", async ({ page }) => {
  await page.goto("/");
  const newIn = page.getByRole("region", { name: "New in" });
  await newIn
    .getByRole("navigation", { name: "Show new in by category" })
    .getByRole("link", { name: "Outerwear" })
    .click();
  await expect(page).toHaveURL(/\?category=outerwear/);
  await expect(newIn.getByRole("link", { name: /Biker Jacket/ }).first()).toBeVisible();
  await expect(newIn.getByRole("link", { name: /Boxy Tee/ })).toHaveCount(0);
});

test("search shows matches, and an honest empty state", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("searchbox", { name: "Search products" }).fill("denim");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Results for “denim”" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Straight Jeans/ }).first()).toBeVisible();

  await page.goto("/search?q=durian");
  await expect(page.getByText("Nothing matches that search")).toBeVisible();
  await page.getByRole("link", { name: "See all products" }).click();
  await expect(page.getByRole("heading", { name: "All products" })).toBeVisible();
});

test("a Product that is out of stock cannot be added", async ({ page }) => {
  await page.goto("/products/shearling-jacket-brown");
  await expect(page.getByText("Out of stock").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Add to cart" })).toHaveCount(0);
});

test("a Product shares with a photo preview and describes itself to search engines", async ({
  page,
}) => {
  await page.goto("/products/boxy-tee-white");
  const ogImage = await page.locator('meta[property="og:image"]').first().getAttribute("content");
  expect(ogImage).toMatch(/^https?:\/\/.+\/catalogue\/tee-white\.jpg$/);
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", /Boxy Tee/);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    "content",
    "summary_large_image",
  );
  const data = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').textContent()) ?? "{}",
  );
  expect(data).toMatchObject({ "@type": "Product", name: "Boxy Tee" });
});
