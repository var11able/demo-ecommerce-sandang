import "server-only";
import type {
  AdminCategory,
  AdminProduct,
  CreateProductBody,
  UpdateProductBody,
  VariantInput,
} from "@/contracts/admin";
import type { Colour } from "@/contracts/catalog";
import { getDb } from "../db";
import { StoreError, notFound } from "../errors";

export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

async function translateUniqueViolation<T>(work: () => Promise<T>, message: string): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new StoreError("conflict", message);
    }
    throw error;
  }
}

const productInclude = {
  category: { select: { slug: true, name: true } },
  variants: { orderBy: [{ position: "asc" as const }, { price: "asc" as const }] },
};

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  material: string;
  colourName: string | null;
  colourHex: string | null;
  styleGroup: string | null;
  description: string;
  images: string[];
  isPublished: boolean;
  category: { slug: string; name: string };
  variants: {
    id: string;
    name: string;
    price: number;
    stock: number;
    reserved: number;
    weightGrams: number;
  }[];
};

function toAdminProduct(product: ProductRow): AdminProduct {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    categorySlug: product.category.slug,
    categoryName: product.category.name,
    material: product.material,
    colour:
      product.colourName && product.colourHex
        ? { name: product.colourName, hex: product.colourHex }
        : null,
    styleGroup: product.styleGroup,
    description: product.description,
    images: product.images,
    isPublished: product.isPublished,
    variants: product.variants.map((variant) => ({
      id: variant.id,
      name: variant.name,
      price: variant.price,
      stock: variant.stock,
      reserved: variant.reserved,
      weightGrams: variant.weightGrams,
    })),
  };
}

function colourColumns(colour: Colour | null | undefined): {
  colourName?: string | null;
  colourHex?: string | null;
} {
  if (colour === undefined) {
    return {};
  }
  return { colourName: colour?.name ?? null, colourHex: colour?.hex ?? null };
}

async function categoryIdFor(slug: string): Promise<string> {
  const category = await getDb().category.findUnique({ where: { slug }, select: { id: true } });
  if (!category) {
    throw new StoreError("invalid_request", "Choose an existing category.");
  }
  return category.id;
}

export async function listAdminProducts(): Promise<AdminProduct[]> {
  const products = await getDb().product.findMany({
    include: productInclude,
    orderBy: [{ category: { position: "asc" } }, { name: "asc" }],
  });
  return products.map(toAdminProduct);
}

export async function getAdminProduct(id: string): Promise<AdminProduct> {
  const product = await getDb().product.findUnique({ where: { id }, include: productInclude });
  if (!product) {
    throw notFound("Product not found");
  }
  return toAdminProduct(product);
}

export async function createProduct(input: CreateProductBody): Promise<AdminProduct> {
  const categoryId = await categoryIdFor(input.categorySlug);
  const slug = input.slug ?? slugify(input.name);
  if (!slug) {
    throw new StoreError("invalid_request", "Give the product a name with letters or numbers.");
  }
  const product = await translateUniqueViolation(
    () =>
      getDb().product.create({
        data: {
          categoryId,
          slug,
          name: input.name,
          description: input.description,
          material: input.material,
          ...colourColumns(input.colour ?? null),
          styleGroup: input.styleGroup ?? null,
          images: input.images,
          isPublished: input.isPublished,
          variants: {
            create: input.variants.map((variant, position) => ({ ...variant, position })),
          },
        },
        include: productInclude,
      }),
    "Another product already uses that address, or two sizes share a name.",
  );
  return toAdminProduct(product);
}

export async function updateProduct(id: string, input: UpdateProductBody): Promise<AdminProduct> {
  const { categorySlug, colour, ...fields } = input;
  const categoryId = categorySlug ? await categoryIdFor(categorySlug) : undefined;
  const existing = await getDb().product.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    throw notFound("Product not found");
  }
  const product = await translateUniqueViolation(
    () =>
      getDb().product.update({
        where: { id },
        data: { ...fields, ...colourColumns(colour), ...(categoryId ? { categoryId } : {}) },
        include: productInclude,
      }),
    "Another product already uses that address.",
  );
  return toAdminProduct(product);
}

export async function createVariant(productId: string, input: VariantInput): Promise<AdminProduct> {
  const product = await getDb().product.findUnique({
    where: { id: productId },
    include: { variants: { select: { position: true } } },
  });
  if (!product) {
    throw notFound("Product not found");
  }
  const position = Math.max(-1, ...product.variants.map((variant) => variant.position)) + 1;
  await translateUniqueViolation(
    () => getDb().variant.create({ data: { ...input, productId, position } }),
    "This product already has a size with that name.",
  );
  return getAdminProduct(productId);
}

export async function updateVariant(
  id: string,
  input: Partial<VariantInput>,
): Promise<AdminProduct> {
  const db = getDb();
  const productId = await db.$transaction(async (tx) => {
    const [variant] = await tx.$queryRaw<{ product_id: string; reserved: number }[]>`
      SELECT "product_id", "reserved" FROM "variant" WHERE "id" = ${id}::uuid FOR UPDATE
    `;
    if (!variant) {
      throw notFound("Variant not found");
    }
    if (input.stock !== undefined && input.stock < variant.reserved) {
      throw new StoreError(
        "conflict",
        `Stock cannot be lower than the ${variant.reserved} units reserved for unpaid orders.`,
      );
    }
    await translateUniqueViolation(
      () => tx.variant.update({ where: { id }, data: input }),
      "This product already has a size with that name.",
    );
    return variant.product_id;
  });
  return getAdminProduct(productId);
}

export async function listAdminCategories(): Promise<AdminCategory[]> {
  const categories = await getDb().category.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: [{ position: "asc" }, { name: "asc" }],
  });
  return categories.map((category) => ({
    id: category.id,
    slug: category.slug,
    name: category.name,
    position: category.position,
    productCount: category._count.products,
  }));
}

export async function createCategory(input: {
  name: string;
  slug?: string;
}): Promise<AdminCategory> {
  const slug = input.slug ?? slugify(input.name);
  const position = await getDb().category.count();
  const category = await translateUniqueViolation(
    () => getDb().category.create({ data: { name: input.name, slug, position } }),
    "Another category already uses that address.",
  );
  return {
    id: category.id,
    slug: category.slug,
    name: category.name,
    position: category.position,
    productCount: 0,
  };
}

export async function updateCategory(
  id: string,
  input: { name?: string; slug?: string; position?: number },
): Promise<AdminCategory> {
  const existing = await getDb().category.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    throw notFound("Category not found");
  }
  await translateUniqueViolation(
    () => getDb().category.update({ where: { id }, data: input }),
    "Another category already uses that address.",
  );
  const [category] = (await listAdminCategories()).filter((item) => item.id === id);
  if (!category) {
    throw notFound("Category not found");
  }
  return category;
}
