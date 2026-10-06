import { describe, expect, it } from "vitest";
import type { ProductDetail } from "@/contracts/catalog";
import { productStructuredData, serializeJsonLd } from "@/lib/structured-data";

const product: ProductDetail = {
  slug: "boxy-tee-white",
  name: "Boxy Tee",
  description: "A heavyweight tee.",
  material: "100% organic cotton",
  colour: { name: "White", hex: "#f4f4f2" },
  colourways: [],
  category: { slug: "tops", name: "Tops" },
  images: ["/catalogue/tee-white.jpg", "/catalogue/tee-white-worn.jpg"],
  label: null,
  variants: [
    {
      id: "00000000-0000-4000-8000-000000000001",
      name: "S",
      price: 179000,
      weightGrams: 220,
      available: 0,
    },
    {
      id: "00000000-0000-4000-8000-000000000002",
      name: "XL",
      price: 199000,
      weightGrams: 240,
      available: 3,
    },
  ],
};

describe("productStructuredData", () => {
  it("describes a Product for search engines with absolute photos and a rupiah price range", () => {
    expect(productStructuredData(product, "https://shop.example")).toEqual({
      "@context": "https://schema.org",
      "@type": "Product",
      name: "Boxy Tee",
      description: "A heavyweight tee.",
      sku: "boxy-tee-white",
      url: "https://shop.example/products/boxy-tee-white",
      image: [
        "https://shop.example/catalogue/tee-white.jpg",
        "https://shop.example/catalogue/tee-white-worn.jpg",
      ],
      brand: { "@type": "Brand", name: "Sandang" },
      category: "Tops",
      color: "White",
      material: "100% organic cotton",
      offers: {
        "@type": "AggregateOffer",
        priceCurrency: "IDR",
        lowPrice: 179000,
        highPrice: 199000,
        offerCount: 2,
        availability: "https://schema.org/InStock",
      },
    });
  });

  it("marks a Product with nothing left as out of stock and leaves out a missing colour", () => {
    const soldOut = {
      ...product,
      colour: null,
      variants: product.variants.map((variant) => ({ ...variant, available: 0 })),
    };
    const data = productStructuredData(soldOut, "https://shop.example");
    expect(data.offers.availability).toBe("https://schema.org/OutOfStock");
    expect(data).not.toHaveProperty("color");
  });
});

describe("serializeJsonLd", () => {
  it("cannot close the script it sits in, whatever the text contains", () => {
    const lineSeparator = String.fromCharCode(0x2028);
    const value = { name: `</script><script>alert(1)</script>&${lineSeparator}` };
    const text = serializeJsonLd(value);
    expect([...text].filter((character) => `<>&${lineSeparator}`.includes(character))).toEqual([]);
    expect(JSON.parse(text)).toEqual(value);
  });
});
