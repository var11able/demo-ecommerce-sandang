import "server-only";
import { getDb } from "../db";
import { seedAccounts, type SeedAccountsResult } from "./accounts";
import { demoCatalogue, type SeedCategory } from "./catalogue-data";

export { seedAccounts } from "./accounts";
export { demoLogins, type DemoLogin } from "./demo-accounts";

const dayMs = 24 * 60 * 60 * 1000;

export type SeedCatalogueOptions = {
  catalogue?: SeedCategory[];
  now?: Date;
  restoreStock?: boolean;
};

export async function seedCatalogue(options: SeedCatalogueOptions = {}): Promise<void> {
  const catalogue = options.catalogue ?? demoCatalogue;
  const now = options.now ?? new Date();
  const db = getDb();

  for (const [categoryPosition, seedCategory] of catalogue.entries()) {
    const category = await db.category.upsert({
      where: { slug: seedCategory.slug },
      create: { slug: seedCategory.slug, name: seedCategory.name, position: categoryPosition },
      update: { name: seedCategory.name, position: categoryPosition },
    });

    for (const seedProduct of seedCategory.products) {
      const productFields = {
        name: seedProduct.name,
        material: seedProduct.material,
        colourName: seedProduct.colour?.name ?? null,
        colourHex: seedProduct.colour?.hex ?? null,
        styleGroup: seedProduct.styleGroup ?? null,
        description: seedProduct.description,
        images: seedProduct.images,
        isPublished: true,
        categoryId: category.id,
      };
      const product = await db.product.upsert({
        where: { slug: seedProduct.slug },
        create: {
          ...productFields,
          slug: seedProduct.slug,
          createdAt: new Date(now.getTime() - seedProduct.addedDaysAgo * dayMs),
        },
        update: productFields,
      });

      for (const [variantPosition, seedVariant] of seedProduct.variants.entries()) {
        await db.variant.upsert({
          where: { productId_name: { productId: product.id, name: seedVariant.name } },
          create: { ...seedVariant, productId: product.id, position: variantPosition },
          update: {
            price: seedVariant.price,
            weightGrams: seedVariant.weightGrams,
            position: variantPosition,
            ...(options.restoreStock ? { stock: seedVariant.stock } : {}),
          },
        });
      }
    }
  }
}

export async function seedDemoData(): Promise<SeedAccountsResult> {
  await seedCatalogue();
  return seedAccounts();
}
