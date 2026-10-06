import { expect, test } from "@playwright/test";
import { Client } from "pg";

async function tokenFor(email: string): Promise<string> {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const { rows } = await client.query<{ unsubscribe_token: string }>(
      'SELECT "unsubscribe_token" FROM "subscriber" WHERE "email" = $1',
      [email],
    );
    return rows[0]!.unsubscribe_token;
  } finally {
    await client.end();
  }
}

test("a visitor signs up in the footer and later unsubscribes from the link", async ({ page }) => {
  const email = `news-${Date.now()}@example.com`;
  await page.goto("/");
  const footer = page.locator("footer");

  await footer.getByLabel("Email address").fill("not-an-email");
  await footer.getByRole("button", { name: "Subscribe" }).click();
  await expect(
    footer.getByText("Enter a full email address, like name@example.com."),
  ).toBeVisible();

  await footer.getByLabel("Email address").fill(email);
  await footer.getByRole("button", { name: "Subscribe" }).click();
  await expect(footer.getByText("You're on the list.")).toBeVisible();

  await page.goto(`/unsubscribe?token=${await tokenFor(email)}`);
  await expect(page.getByRole("heading", { name: "You've been unsubscribed." })).toBeVisible();

  await page.goto("/unsubscribe?token=made-up-token-that-is-long-enough-to-check");
  await expect(
    page.getByRole("heading", { name: "This unsubscribe link is not valid." }),
  ).toBeVisible();
});

test("the Help pages are linked from the footer, and How to pay shows the test details", async ({
  page,
}) => {
  await page.goto("/");
  const footer = page.locator("footer");
  for (const title of ["Shipping and returns", "Size guide", "Contact", "Privacy"]) {
    await footer.getByRole("link", { name: title }).click();
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  }
  await footer.getByRole("link", { name: "How to pay" }).click();
  await expect(
    page.getByRole("heading", { name: "Test payment details for this demo" }),
  ).toBeVisible();
  await expect(page.getByText(/4811 1111 1111 1114/)).toBeVisible();
});

test("a sized Product links to the Size guide, which gives body measurements per size", async ({
  page,
}) => {
  await page.goto("/products/boxy-tee-white");
  await page.getByRole("main").getByRole("link", { name: "Size guide" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Size guide" })).toBeVisible();
  const table = page.getByRole("table", { name: "Body measurements in centimetres" });
  const medium = table
    .getByRole("row")
    .filter({ has: page.getByRole("rowheader", { name: "M", exact: true }) });
  await expect(medium.getByRole("cell").first()).toHaveText("92–96");

  await page.goto("/products/woven-tote-tangerine");
  await expect(page.getByRole("main").getByRole("link", { name: "Size guide" })).toHaveCount(0);
});

test("the footer leads to the photo credits, which link to each photographer on Unsplash", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("footer").getByRole("link", { name: "Photo credits" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Photo credits" })).toBeVisible();
  const photographer = page.getByRole("main").getByRole("link", { name: "Tobias Tullius" });
  await expect(photographer).toHaveAttribute("href", /^https:\/\/unsplash\.com\/@tobiastu\?/);
});

test("every page says the whole website is a demo with placeholder photos from Unsplash", async ({
  page,
}) => {
  await page.goto("/");
  const footer = page.locator("footer");
  await expect(
    footer.getByText("Sandang is a demo website made as a portfolio project"),
  ).toBeVisible();
  await expect(
    footer.getByText("All photos are placeholder examples from Unsplash."),
  ).toBeVisible();
  await expect(page.getByText("This whole website is a demo, not a real shop.")).toBeVisible();

  await page.goto("/products/boxy-tee-white");
  const main = page.getByRole("main");
  await expect(main.getByText("Placeholder photo from Unsplash.")).toBeVisible();
  await main.getByRole("link", { name: "Photo credits" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Photo credits" })).toBeVisible();

  await page.goto("/help/shipping-and-returns");
  await expect(page.getByText("these pages are examples, not real policies")).toBeVisible();
});
