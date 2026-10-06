import { expect, test } from "@playwright/test";

test("storefront pages carry a nonce-based Content-Security-Policy and run without violations", async ({
  page,
}) => {
  const violations: string[] = [];
  page.on("console", (message) => {
    if (message.text().includes("Content Security Policy")) {
      violations.push(message.text());
    }
  });
  const response = await page.goto("/products/woven-tote-tangerine");
  const headers = response?.headers() ?? {};
  expect(headers["content-security-policy"]).toMatch(
    /script-src 'self' 'nonce-[^']+' 'strict-dynamic'/,
  );
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["strict-transport-security"]).toContain("max-age=");

  await page.getByText("Large", { exact: true }).click();
  await expect(page.getByText("Rp 549.000")).toBeVisible();
  expect(violations).toEqual([]);
});

test("API responses carry no CORS headers and a locked-down policy", async ({ request }) => {
  const response = await request.get("/api/v1/categories", {
    headers: { Origin: "https://evil.example" },
  });
  expect(response.status()).toBe(200);
  expect(response.headers()["access-control-allow-origin"]).toBeUndefined();
  expect(response.headers()["content-security-policy"]).toBe(
    "default-src 'none'; frame-ancestors 'none'",
  );
});
