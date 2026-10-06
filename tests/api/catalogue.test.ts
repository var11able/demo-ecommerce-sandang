import { beforeEach, describe, expect, it } from "vitest";
import { GET as getCategories } from "@/app/api/v1/categories/route";
import { GET as getProducts } from "@/app/api/v1/products/route";
import { GET as getProductBySlug } from "@/app/api/v1/products/[slug]/route";
import {
  categoryListResponseSchema,
  productDetailResponseSchema,
  productListResponseSchema,
} from "@/contracts/catalog";
import { createTestProduct } from "../support/catalogue";
import { resetDatabase } from "../support/database";
import { callRoute, readJson } from "../support/http";

const longAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

async function listProducts(query: Record<string, string> = {}) {
  const response = await callRoute(getProducts, { query });
  expect(response.status).toBe(200);
  return productListResponseSchema.parse(await readJson(response)).products;
}

describe("catalogue API", () => {
  beforeEach(resetDatabase);

  it("lists Categories with a photo from one of their Products", async () => {
    await createTestProduct({ categorySlug: "bottoms" });
    const response = await callRoute(getCategories);
    const { categories } = categoryListResponseSchema.parse(await readJson(response));
    expect(categories).toEqual([
      { slug: "bottoms", name: "Bottoms", image: expect.stringMatching(/^\/catalogue\//) },
    ]);
  });

  it("leaves out Categories with nothing published in them", async () => {
    await createTestProduct({ categorySlug: "bottoms", published: false });
    await createTestProduct({ categorySlug: "tops" });
    const response = await callRoute(getCategories);
    const { categories } = categoryListResponseSchema.parse(await readJson(response));
    expect(categories.map((category) => category.slug)).toEqual(["tops"]);
  });

  it("lists only published Products, newest first, priced from the cheapest Variant", async () => {
    await createTestProduct({
      slug: "older",
      createdAt: longAgo,
      variants: [{ price: 90000 }, { price: 40000 }],
    });
    await createTestProduct({ slug: "newer" });
    await createTestProduct({ slug: "hidden", published: false });

    const products = await listProducts();
    expect(products.map((product) => product.slug)).toEqual(["newer", "older"]);
    expect(products[1]).toMatchObject({ priceFrom: 40000, weightGrams: 200 });
  });

  it("filters by Category and searches name, description, material, and colour", async () => {
    await createTestProduct({ slug: "boxy-tee", name: "Boxy Tee", categorySlug: "tops" });
    await createTestProduct({
      slug: "wide-trousers",
      name: "Wide Trousers",
      categorySlug: "bottoms",
    });
    await createTestProduct({ slug: "linen-shirt", name: "Linen Shirt", material: "Washed linen" });
    await createTestProduct({ slug: "oat-tee", colour: { name: "Oatmeal", hex: "#d9cbb3" } });

    expect((await listProducts({ category: "bottoms" })).map((p) => p.slug)).toEqual([
      "wide-trousers",
    ]);
    expect((await listProducts({ q: "boxy" })).map((p) => p.slug)).toEqual(["boxy-tee"]);
    expect((await listProducts({ q: "washed" })).map((p) => p.slug)).toEqual(["linen-shirt"]);
    expect((await listProducts({ q: "oatmeal" })).map((p) => p.slug)).toEqual(["oat-tee"]);
    expect(await listProducts({ q: "nothing like this" })).toEqual([]);
  });

  it("sorts by price in both directions", async () => {
    await createTestProduct({ slug: "mid", variants: [{ price: 50000 }] });
    await createTestProduct({ slug: "low", variants: [{ price: 10000 }] });
    await createTestProduct({ slug: "high", variants: [{ price: 90000 }] });

    expect((await listProducts({ sort: "price_asc" })).map((p) => p.slug)).toEqual([
      "low",
      "mid",
      "high",
    ]);
    expect((await listProducts({ sort: "price_desc" })).map((p) => p.slug)).toEqual([
      "high",
      "mid",
      "low",
    ]);
  });

  it("labels new Products, low Stock, and Products that are out of stock", async () => {
    await createTestProduct({ slug: "fresh" });
    await createTestProduct({ slug: "scarce", createdAt: longAgo, variants: [{ stock: 4 }] });
    await createTestProduct({
      slug: "reserved",
      createdAt: longAgo,
      variants: [{ stock: 20, reserved: 17 }],
    });
    await createTestProduct({ slug: "gone", createdAt: longAgo, variants: [{ stock: 0 }] });
    await createTestProduct({ slug: "plain", createdAt: longAgo, variants: [{ stock: 50 }] });

    const bySlug = Object.fromEntries((await listProducts()).map((p) => [p.slug, p]));
    expect(bySlug.fresh).toMatchObject({ label: "new", inStock: true });
    expect(bySlug.scarce).toMatchObject({ label: "low_stock", inStock: true });
    expect(bySlug.reserved).toMatchObject({ label: "low_stock", inStock: true });
    expect(bySlug.gone).toMatchObject({ label: null, inStock: false });
    expect(bySlug.plain).toMatchObject({ label: null, inStock: true });
  });

  it("rejects unknown query fields", async () => {
    const response = await callRoute(getProducts, { query: { colour: "red" } });
    expect(response.status).toBe(400);
  });

  it("shows a Product with its Variants and sellable units", async () => {
    await createTestProduct({
      slug: "boxy-tee",
      variants: [
        { name: "S", price: 98000, stock: 10, reserved: 3 },
        { name: "M", price: 185000, stock: 0 },
      ],
    });
    const response = await callRoute(getProductBySlug, { params: { slug: "boxy-tee" } });
    expect(response.status).toBe(200);
    const { product } = productDetailResponseSchema.parse(await readJson(response));
    expect(
      product.variants.map(({ name, price, available }) => ({ name, price, available })),
    ).toEqual([
      { name: "S", price: 98000, available: 7 },
      { name: "M", price: 185000, available: 0 },
    ]);
  });

  it("shows a Product's material, colour, and the colourways of its style group, oldest first", async () => {
    await createTestProduct({
      slug: "tee-oat",
      styleGroup: "boxy-tee",
      colour: { name: "Oat", hex: "#d9cbb3" },
      createdAt: longAgo,
    });
    await createTestProduct({
      slug: "tee-black",
      styleGroup: "boxy-tee",
      material: "100% organic cotton",
      colour: { name: "Black", hex: "#111111" },
    });
    await createTestProduct({
      slug: "tee-draft",
      styleGroup: "boxy-tee",
      colour: { name: "Red", hex: "#aa2222" },
      published: false,
    });
    await createTestProduct({
      slug: "trouser-black",
      styleGroup: "wide-trouser",
      colour: { name: "Black", hex: "#111111" },
    });

    const response = await callRoute(getProductBySlug, { params: { slug: "tee-black" } });
    const { product } = productDetailResponseSchema.parse(await readJson(response));
    expect(product).toMatchObject({
      material: "100% organic cotton",
      colour: { name: "Black", hex: "#111111" },
    });
    expect(product.colourways).toEqual([
      { slug: "tee-oat", colour: { name: "Oat", hex: "#d9cbb3" } },
      { slug: "tee-black", colour: { name: "Black", hex: "#111111" } },
    ]);
  });

  it("lists each colourway as its own Product carrying the swatches of its style group", async () => {
    await createTestProduct({
      slug: "tee-oat",
      styleGroup: "boxy-tee",
      colour: { name: "Oat", hex: "#d9cbb3" },
      createdAt: longAgo,
    });
    await createTestProduct({
      slug: "tee-black",
      styleGroup: "boxy-tee",
      colour: { name: "Black", hex: "#111111" },
    });

    const bySlug = Object.fromEntries((await listProducts()).map((p) => [p.slug, p]));
    const swatches = [
      { slug: "tee-oat", colour: { name: "Oat", hex: "#d9cbb3" } },
      { slug: "tee-black", colour: { name: "Black", hex: "#111111" } },
    ];
    expect(bySlug["tee-oat"]?.colourways).toEqual(swatches);
    expect(bySlug["tee-black"]?.colourways).toEqual(swatches);
  });

  it("gives a Product without a style group only its own swatch, and none without a colour", async () => {
    await createTestProduct({ slug: "scarf", colour: { name: "Indigo", hex: "#2b3a67" } });
    await createTestProduct({ slug: "gift-card" });

    const bySlug = Object.fromEntries((await listProducts()).map((p) => [p.slug, p]));
    expect(bySlug.scarf?.colourways).toEqual([
      { slug: "scarf", colour: { name: "Indigo", hex: "#2b3a67" } },
    ]);
    expect(bySlug["gift-card"]).toMatchObject({ colour: null, colourways: [] });
  });

  it("answers not found for an unknown or unpublished Product", async () => {
    await createTestProduct({ slug: "draft", published: false });
    for (const slug of ["missing", "draft"]) {
      const response = await callRoute(getProductBySlug, { params: { slug } });
      expect(response.status).toBe(404);
    }
  });

  it("rejects a malformed slug", async () => {
    const response = await callRoute(getProductBySlug, { params: { slug: "Not A Slug" } });
    expect(response.status).toBe(400);
  });
});
