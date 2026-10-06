import { getDb } from "@/server/db";

let counter = 0;

export type TestVariantInput = { name?: string; price?: number; stock?: number; reserved?: number };

export async function createTestProduct(
  options: {
    name?: string;
    slug?: string;
    categorySlug?: string;
    published?: boolean;
    createdAt?: Date;
    description?: string;
    material?: string;
    colour?: { name: string; hex: string };
    styleGroup?: string;
    variants?: TestVariantInput[];
  } = {},
) {
  counter += 1;
  const db = getDb();
  const categorySlug = options.categorySlug ?? "tops";
  const category = await db.category.upsert({
    where: { slug: categorySlug },
    create: { slug: categorySlug, name: categorySlug[0]?.toUpperCase() + categorySlug.slice(1) },
    update: {},
  });
  const variants = options.variants ?? [{}];
  return db.product.create({
    data: {
      name: options.name ?? `Test product ${counter}`,
      slug: options.slug ?? `test-product-${counter}`,
      description: options.description ?? "A product for tests",
      material: options.material ?? "Cotton",
      colourName: options.colour?.name ?? null,
      colourHex: options.colour?.hex ?? null,
      styleGroup: options.styleGroup ?? null,
      images: [`/catalogue/test-${counter}.jpg`],
      isPublished: options.published ?? true,
      categoryId: category.id,
      ...(options.createdAt ? { createdAt: options.createdAt } : {}),
      variants: {
        create: variants.map((variant, index) => ({
          name: variant.name ?? `Size ${index + 1}`,
          price: variant.price ?? 50000 * (index + 1),
          stock: variant.stock ?? 10,
          reserved: variant.reserved ?? 0,
          weightGrams: (index + 1) * 100,
          position: index,
        })),
      },
    },
    include: { variants: { orderBy: { position: "asc" } } },
  });
}
