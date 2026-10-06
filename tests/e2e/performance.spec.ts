import { expect, test } from "@playwright/test";

const catalogue = ["/", "/categories/tops", "/search?q=denim", "/products/woven-tote-tangerine"];

for (const path of catalogue) {
  test(`${path} sends no validation library to the browser and stays light`, async ({ page }) => {
    const scripts: Promise<string>[] = [];
    page.on("response", (response) => {
      if (response.request().resourceType() === "script") {
        scripts.push(response.text().catch(() => ""));
      }
    });
    await page.goto(path, { waitUntil: "networkidle" });
    const bodies = await Promise.all(scripts);
    expect(bodies.some((body) => body.includes("ZodError"))).toBe(false);
    const rawBytes = bodies.reduce((sum, body) => sum + body.length, 0);
    expect(rawBytes).toBeLessThan(1_000_000);
  });
}
