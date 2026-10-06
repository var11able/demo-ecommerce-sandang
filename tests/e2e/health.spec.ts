import { expect, test } from "@playwright/test";

test("the status page shows the API and database as healthy", async ({ page }) => {
  await page.goto("/status");
  await expect(page.getByRole("heading", { name: "Store status" })).toBeVisible();
  await expect(page.getByText("API: ok")).toBeVisible();
  await expect(page.getByText("Database: up")).toBeVisible();
});
