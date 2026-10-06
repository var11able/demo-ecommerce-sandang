import { expect, test, type Page } from "@playwright/test";
import { registerThroughPage } from "./support";

async function focusedText(page: Page): Promise<string> {
  return page.evaluate(() => {
    const element = document.activeElement as HTMLInputElement | null;
    const label = element?.labels?.[0]?.textContent;
    return (element?.getAttribute("aria-label") ?? label ?? element?.textContent ?? "").trim();
  });
}

async function tabUntil(page: Page, matches: (text: string) => boolean, limit = 60): Promise<void> {
  for (let step = 0; step < limit; step += 1) {
    await page.keyboard.press("Tab");
    if (matches(await focusedText(page))) {
      return;
    }
  }
  throw new Error("Never reached the expected control with Tab");
}

test("the first Tab offers a skip link that jumps to the content", async ({ page }) => {
  await page.goto("/search");
  await page.keyboard.press("Tab");
  expect(await focusedText(page)).toBe("Skip to content");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main$/);
});

test("a Customer picks a size, sets the quantity, and adds to the Cart with the keyboard only", async ({
  page,
}) => {
  await registerThroughPage(page);
  await page.goto("/products/woven-tote-tangerine");

  await tabUntil(page, (text) => text.startsWith("Small"));
  await page.keyboard.press("ArrowRight");
  await expect(page.getByText("Rp 549.000")).toBeVisible();

  await tabUntil(page, (text) => text === "Increase quantity");
  const outline = await page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle);
  expect(outline).not.toBe("none");
  await page.keyboard.press("Enter");
  await expect(page.locator("output")).toHaveText("2");

  await tabUntil(page, (text) => text === "Add to cart");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("link", { name: "Cart, 2 items" }).first()).toBeVisible();
});

for (const width of [1024, 1280, 1440]) {
  test(`every category link fits in the header at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const list = page.getByRole("navigation", { name: "Categories" }).getByRole("list");
    const fits = await list.evaluate((node) => node.scrollWidth <= node.clientWidth);
    expect(fits).toBe(true);
  });
}
