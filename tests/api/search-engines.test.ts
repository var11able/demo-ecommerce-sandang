import { beforeEach, describe, expect, it } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { readEnvironment } from "@/server/env";
import { createTestProduct } from "../support/catalogue";
import { resetDatabase } from "../support/database";

const origin = readEnvironment().APP_ORIGIN.replace(/\/$/, "");

describe("search engines", () => {
  beforeEach(resetDatabase);

  it("lists Home, Categories, published Products, and Help pages in the sitemap", async () => {
    await createTestProduct({ slug: "shown", categorySlug: "tops" });
    await createTestProduct({ slug: "hidden", categorySlug: "bottoms", published: false });

    const urls = (await sitemap()).map((entry) => entry.url);
    expect(urls).toEqual(
      expect.arrayContaining([
        `${origin}/`,
        `${origin}/search`,
        `${origin}/categories/tops`,
        `${origin}/products/shown`,
        `${origin}/help/size-guide`,
        `${origin}/privacy`,
      ]),
    );
    expect(urls).not.toContain(`${origin}/products/hidden`);
    expect(urls).not.toContain(`${origin}/categories/bottoms`);
  });

  it("keeps crawlers out of private pages and points them at the sitemap", () => {
    const rules = robots();
    expect(rules.sitemap).toBe(`${origin}/sitemap.xml`);
    expect(rules.rules).toEqual({
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/api/",
        "/account",
        "/cart",
        "/checkout",
        "/orders/",
        "/login",
        "/register",
        "/forgot-password",
        "/reset-password",
        "/unsubscribe",
      ],
    });
  });
});
