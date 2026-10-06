import { describe, expect, it } from "vitest";
import { photoCredits } from "@/lib/photo-credits";
import { demoCatalogue } from "@/server/seed/catalogue-data";
import { homePhotos } from "@/lib/home-photos";

describe("photo credits", () => {
  it("credits every photo the shop shows, once", () => {
    const shown = [
      ...demoCatalogue.flatMap((category) =>
        category.products.flatMap((product) => product.images),
      ),
      ...Object.values(homePhotos),
    ];
    const credited = photoCredits.map((credit) => credit.image);
    expect(new Set(credited).size).toBe(credited.length);
    expect([...new Set(shown)].sort()).toEqual([...credited].sort());
  });

  it("links every credit to its photo on Unsplash", () => {
    for (const credit of photoCredits) {
      expect(credit.source).toMatch(
        /^https:\/\/(unsplash\.com\/photos\/|images\.unsplash\.com\/photo-)/,
      );
    }
  });
});
