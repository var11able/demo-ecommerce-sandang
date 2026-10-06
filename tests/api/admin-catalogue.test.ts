import { beforeEach, describe, expect, it } from "vitest";
import { GET as listCategories, POST as createCategory } from "@/app/api/v1/admin/categories/route";
import { PATCH as updateCategory } from "@/app/api/v1/admin/categories/[id]/route";
import { GET as listProducts, POST as createProduct } from "@/app/api/v1/admin/products/route";
import { PATCH as updateProduct } from "@/app/api/v1/admin/products/[id]/route";
import { POST as createVariant } from "@/app/api/v1/admin/variants/route";
import { PATCH as updateVariant } from "@/app/api/v1/admin/variants/[id]/route";
import { GET as publicProduct } from "@/app/api/v1/products/[slug]/route";
import { adminProductResponseSchema } from "@/contracts/admin";
import { getDb } from "@/server/db";
import { registerAdmin, registerCustomer } from "../support/accounts";
import { createTestProduct } from "../support/catalogue";
import { resetDatabase } from "../support/database";
import { callRoute, readJson } from "../support/http";

const newProduct = {
  categorySlug: "tops",
  name: "Linen Shirt",
  description: "A relaxed shirt in washed linen.",
  material: "Linen",
  images: ["/catalogue/tee-white.jpg"],
  isPublished: true,
  variants: [{ name: "M", price: 95000, stock: 12, weightGrams: 250 }],
};

describe("Admin catalogue", () => {
  beforeEach(async () => {
    await resetDatabase();
    await createTestProduct({ categorySlug: "tops" });
  });

  it("creates a Product with its Variants, which then shows in the shop", async () => {
    const admin = await registerAdmin();
    const response = await callRoute(createProduct, {
      method: "POST",
      cookie: admin.cookie,
      body: newProduct,
    });
    expect(response.status).toBe(201);
    const { product } = adminProductResponseSchema.parse(await readJson(response));
    expect(product).toMatchObject({
      slug: "linen-shirt",
      categorySlug: "tops",
      isPublished: true,
    });
    expect(product.variants).toEqual([
      expect.objectContaining({ name: "M", price: 95000, stock: 12, reserved: 0 }),
    ]);
    expect((await callRoute(publicProduct, { params: { slug: "linen-shirt" } })).status).toBe(200);
  });

  it("saves a Product's material, colour, and style group, and can clear the colour", async () => {
    const admin = await registerAdmin();
    const created = await callRoute(createProduct, {
      method: "POST",
      cookie: admin.cookie,
      body: {
        ...newProduct,
        colour: { name: "Sage", hex: "#9caf88" },
        styleGroup: "linen-shirt",
      },
    });
    expect(created.status).toBe(201);
    const { product } = adminProductResponseSchema.parse(await readJson(created));
    expect(product).toMatchObject({
      material: "Linen",
      colour: { name: "Sage", hex: "#9caf88" },
      styleGroup: "linen-shirt",
    });

    const cleared = await callRoute(updateProduct, {
      method: "PATCH",
      cookie: admin.cookie,
      params: { id: product.id },
      body: { colour: null, styleGroup: null },
    });
    expect(adminProductResponseSchema.parse(await readJson(cleared)).product).toMatchObject({
      colour: null,
      styleGroup: null,
    });
  });

  it.each([
    ["a colour that is not #rrggbb", { colour: { name: "Sage", hex: "sage" } }],
    ["a colour without a name", { colour: { name: " ", hex: "#9caf88" } }],
    ["a style group that is not a slug", { styleGroup: "Linen Shirt" }],
  ])("refuses %s", async (_, change) => {
    const admin = await registerAdmin();
    const response = await callRoute(createProduct, {
      method: "POST",
      cookie: admin.cookie,
      body: { ...newProduct, ...change },
    });
    expect(response.status).toBe(400);
  });

  it("accepts a photo uploaded to the Vercel Blob store", async () => {
    const admin = await registerAdmin();
    const blobPhoto =
      "https://abc123xyz.public.blob.vercel-storage.com/uploads/0123456789abcdef0123456789abcdef.jpg";
    const response = await callRoute(createProduct, {
      method: "POST",
      cookie: admin.cookie,
      body: { ...newProduct, images: [blobPhoto] },
    });
    expect(response.status).toBe(201);
    expect(adminProductResponseSchema.parse(await readJson(response)).product.images).toEqual([
      blobPhoto,
    ]);
  });

  it.each([
    "https://evil.example/uploads/0123456789abcdef0123456789abcdef.jpg",
    "https://abc.public.blob.vercel-storage.com.evil.example/uploads/0123456789abcdef0123456789abcdef.jpg",
    "http://abc123.public.blob.vercel-storage.com/uploads/0123456789abcdef0123456789abcdef.jpg",
    "https://abc123.public.blob.vercel-storage.com/other/0123456789abcdef0123456789abcdef.jpg",
  ])("refuses a photo address that is not the store's: %s", async (image) => {
    const admin = await registerAdmin();
    const response = await callRoute(createProduct, {
      method: "POST",
      cookie: admin.cookie,
      body: { ...newProduct, images: [image] },
    });
    expect(response.status).toBe(400);
  });

  it("refuses a photo path that is not one of the store's photos", async () => {
    const admin = await registerAdmin();
    const response = await callRoute(createProduct, {
      method: "POST",
      cookie: admin.cookie,
      body: { ...newProduct, images: ["https://evil.example/x.jpg"] },
    });
    expect(response.status).toBe(400);
  });

  it("edits a Product and hides it by unpublishing", async () => {
    const admin = await registerAdmin();
    const product = await createTestProduct({ slug: "editable" });
    const response = await callRoute(updateProduct, {
      method: "PATCH",
      cookie: admin.cookie,
      params: { id: product.id },
      body: { name: "Renamed", isPublished: false },
    });
    expect(response.status).toBe(200);
    expect(adminProductResponseSchema.parse(await readJson(response)).product.name).toBe("Renamed");
    expect((await callRoute(publicProduct, { params: { slug: "editable" } })).status).toBe(404);
  });

  it("sets Stock, but never below the units reserved for unpaid Orders", async () => {
    const admin = await registerAdmin();
    const product = await createTestProduct({ variants: [{ stock: 10, reserved: 4 }] });
    const variantId = product.variants[0]!.id;
    const patch = (body: unknown) =>
      callRoute(updateVariant, {
        method: "PATCH",
        cookie: admin.cookie,
        params: { id: variantId },
        body,
      });

    expect((await patch({ stock: 25, price: 61000 })).status).toBe(200);
    expect(await getDb().variant.findUniqueOrThrow({ where: { id: variantId } })).toMatchObject({
      stock: 25,
      price: 61000,
      reserved: 4,
    });
    const tooLow = await patch({ stock: 3 });
    expect(tooLow.status).toBe(409);
    expect(await readJson(tooLow)).toMatchObject({
      error: { message: "Stock cannot be lower than the 4 units reserved for unpaid orders." },
    });
    expect((await patch({ stock: -1 })).status).toBe(400);
  });

  it("adds a Variant to a Product", async () => {
    const admin = await registerAdmin();
    const product = await createTestProduct();
    const response = await callRoute(createVariant, {
      method: "POST",
      cookie: admin.cookie,
      body: { productId: product.id, name: "1 kg", price: 300000, stock: 3, weightGrams: 1000 },
    });
    expect(response.status).toBe(201);
    expect(
      adminProductResponseSchema.parse(await readJson(response)).product.variants,
    ).toHaveLength(2);
  });

  it("lists unpublished Products too", async () => {
    const admin = await registerAdmin();
    await createTestProduct({ slug: "draft", published: false });
    const response = await callRoute(listProducts, { cookie: admin.cookie });
    const body = (await readJson(response)) as { products: { slug: string }[] };
    expect(body.products.map((product) => product.slug)).toContain("draft");
  });

  it("creates and renames Categories", async () => {
    const admin = await registerAdmin();
    const created = await callRoute(createCategory, {
      method: "POST",
      cookie: admin.cookie,
      body: { name: "Noodles" },
    });
    expect(created.status).toBe(201);
    const { category } = (await readJson(created)) as { category: { id: string; slug: string } };
    expect(category.slug).toBe("noodles");
    const renamed = await callRoute(updateCategory, {
      method: "PATCH",
      cookie: admin.cookie,
      params: { id: category.id },
      body: { name: "Noodles and rice" },
    });
    expect(renamed.status).toBe(200);
  });

  it("is closed to Customers", async () => {
    const customer = await registerCustomer();
    expect((await callRoute(listProducts, { cookie: customer.cookie })).status).toBe(403);
    expect(
      (
        await callRoute(createProduct, {
          method: "POST",
          cookie: customer.cookie,
          body: newProduct,
        })
      ).status,
    ).toBe(403);
  });
});

describe("the demo Admin", () => {
  beforeEach(async () => {
    await resetDatabase();
    await createTestProduct({ categorySlug: "tops" });
  });

  it("can view and edit Products and Stock", async () => {
    const demo = await registerAdmin("demo_admin");
    const product = await createTestProduct();
    expect((await callRoute(listProducts, { cookie: demo.cookie })).status).toBe(200);
    expect(
      (
        await callRoute(updateVariant, {
          method: "PATCH",
          cookie: demo.cookie,
          params: { id: product.variants[0]!.id },
          body: { stock: 30 },
        })
      ).status,
    ).toBe(200);
  });

  it("cannot create Products or change Categories", async () => {
    const demo = await registerAdmin("demo_admin");
    const created = await callRoute(createProduct, {
      method: "POST",
      cookie: demo.cookie,
      body: newProduct,
    });
    expect(created.status).toBe(403);
    expect(await readJson(created)).toMatchObject({
      error: { message: "The demo Admin cannot do this." },
    });
    expect(
      (
        await callRoute(createCategory, {
          method: "POST",
          cookie: demo.cookie,
          body: { name: "X" },
        })
      ).status,
    ).toBe(403);
    const category = await getDb().category.findFirstOrThrow();
    expect(
      (
        await callRoute(updateCategory, {
          method: "PATCH",
          cookie: demo.cookie,
          params: { id: category.id },
          body: { name: "Changed" },
        })
      ).status,
    ).toBe(403);
    expect((await callRoute(listCategories, { cookie: demo.cookie })).status).toBe(200);
  });
});
