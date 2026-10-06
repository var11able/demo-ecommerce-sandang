import { expect, test, type Page } from "@playwright/test";

async function scriptsMentioning(page: Page, path: string, needle: string): Promise<number> {
  const bodies: Promise<string>[] = [];
  page.on("response", (response) => {
    if (response.request().resourceType() === "script") {
      bodies.push(response.text().catch(() => ""));
    }
  });
  await page.goto(path, { waitUntil: "networkidle" });
  return (await Promise.all(bodies)).filter((body) => body.includes(needle)).length;
}

async function opacities(page: Page, selector: string): Promise<number[]> {
  return page
    .locator(selector)
    .evaluateAll((nodes) => nodes.map((node) => Number(getComputedStyle(node).opacity)));
}

test("GSAP is downloaded on Home and nowhere else", async ({ page }) => {
  expect(await scriptsMentioning(page, "/", "ScrollTrigger")).toBeGreaterThan(0);
  const productPage = await page.context().newPage();
  expect(
    await scriptsMentioning(productPage, "/products/woven-tote-tangerine", "ScrollTrigger"),
  ).toBe(0);
  const searchPage = await page.context().newPage();
  expect(await scriptsMentioning(searchPage, "/search", "ScrollTrigger")).toBe(0);
});

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("Home shows everything in its final state without moving", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    expect(await opacities(page, "[data-hero-step]")).toEqual([1, 1, 1, 1]);
    expect((await opacities(page, "[data-arrival]")).every((value) => value === 1)).toBe(true);
    expect(await opacities(page, "[data-hero-photo]")).toEqual([1]);
    const transforms = await page
      .locator("[data-arrival], [data-hero-step]")
      .evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).transform));
    expect(transforms.every((transform) => transform === "none")).toBe(true);
  });

  test("adding to the Cart swaps the label without animating", async ({ page }) => {
    await page.goto("/products/woven-tote-tangerine");
    await page.getByText("Large", { exact: true }).click();
    await expect(page.getByText("Rp 549.000")).toBeVisible();
    expect(await page.getByText("Rp 449.000").count()).toBe(0);
  });
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("Home content is visible straight from the server", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect((await opacities(page, "[data-arrival]")).every((value) => value === 1)).toBe(true);
    expect(await opacities(page, "[data-hero-step]")).toEqual([1, 1, 1, 1]);
    expect(await opacities(page, "[data-hero-photo]")).toEqual([1]);
    expect((await opacities(page, "[data-editorial]")).every((value) => value === 1)).toBe(true);
  });
});

test("with motion on, the new arrivals finish fully visible once scrolled to", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await page.locator("[data-arrival]").last().scrollIntoViewIfNeeded();
  await expect
    .poll(async () => (await opacities(page, "[data-arrival]")).every((value) => value === 1), {
      timeout: 5000,
    })
    .toBe(true);
  await expect
    .poll(async () => (await opacities(page, "[data-hero-step]")).every((value) => value === 1))
    .toBe(true);
});
