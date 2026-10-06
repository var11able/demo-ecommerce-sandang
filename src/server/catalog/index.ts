import "server-only";
import type {
  Category,
  Colour,
  Colourway,
  ProductDetail,
  ProductLabel,
  ProductSort,
  ProductSummary,
} from "@/contracts/catalog";
import { getDb } from "../db";
import { notFound } from "../errors";

export const lowStockThreshold = 5;
export const newProductDays = 30;

const dayMs = 24 * 60 * 60 * 1000;

type VariantStock = { price: number; stock: number; reserved: number; weightGrams: number };

export function sellableUnits(variant: { stock: number; reserved: number }): number {
  return Math.max(0, variant.stock - variant.reserved);
}

export function productLabel(
  product: { createdAt: Date; variants: VariantStock[] },
  now: Date = new Date(),
): ProductLabel {
  const available = product.variants.map(sellableUnits);
  const totalAvailable = available.reduce((sum, units) => sum + units, 0);
  if (totalAvailable > 0 && totalAvailable <= lowStockThreshold) {
    return "low_stock";
  }
  if (now.getTime() - product.createdAt.getTime() <= newProductDays * dayMs) {
    return "new";
  }
  return null;
}

function cheapestVariant(variants: VariantStock[]): VariantStock | undefined {
  return variants.reduce<VariantStock | undefined>(
    (cheapest, variant) => (!cheapest || variant.price < cheapest.price ? variant : cheapest),
    undefined,
  );
}

type ColourFields = {
  slug: string;
  colourName: string | null;
  colourHex: string | null;
  styleGroup: string | null;
};

function colourOf(product: ColourFields): Colour | null {
  return product.colourName && product.colourHex
    ? { name: product.colourName, hex: product.colourHex }
    : null;
}

function ownColourway(product: ColourFields): Colourway[] {
  const colour = colourOf(product);
  return colour ? [{ slug: product.slug, colour }] : [];
}

async function colourwaysByStyleGroup(products: ColourFields[]): Promise<Map<string, Colourway[]>> {
  const groups = [
    ...new Set(products.flatMap((product) => (product.styleGroup ? [product.styleGroup] : []))),
  ];
  const byGroup = new Map<string, Colourway[]>();
  if (groups.length === 0) {
    return byGroup;
  }
  const siblings = await getDb().product.findMany({
    where: {
      isPublished: true,
      styleGroup: { in: groups },
      colourName: { not: null },
      colourHex: { not: null },
      variants: { some: {} },
    },
    select: { slug: true, colourName: true, colourHex: true, styleGroup: true },
    orderBy: [{ createdAt: "asc" }, { slug: "asc" }],
  });
  for (const sibling of siblings) {
    if (sibling.styleGroup) {
      byGroup.set(sibling.styleGroup, [
        ...(byGroup.get(sibling.styleGroup) ?? []),
        ...ownColourway(sibling),
      ]);
    }
  }
  return byGroup;
}

function colourwaysOf(product: ColourFields, byGroup: Map<string, Colourway[]>): Colourway[] {
  return product.styleGroup ? (byGroup.get(product.styleGroup) ?? []) : ownColourway(product);
}

export async function listCategories(): Promise<Category[]> {
  const categories = await getDb().category.findMany({
    where: { products: { some: { isPublished: true, variants: { some: {} } } } },
    orderBy: [{ position: "asc" }, { name: "asc" }],
    include: {
      products: {
        where: { isPublished: true },
        orderBy: { createdAt: "asc" },
        select: { images: true },
        take: 1,
      },
    },
  });
  return categories.map((category) => ({
    slug: category.slug,
    name: category.name,
    image: category.products[0]?.images[0] ?? null,
  }));
}

export type ProductFilter = { category?: string; q?: string; sort?: ProductSort; limit?: number };

export async function listProducts(filter: ProductFilter = {}): Promise<ProductSummary[]> {
  const search = filter.q?.trim();
  const products = await getDb().product.findMany({
    where: {
      isPublished: true,
      variants: { some: {} },
      ...(filter.category ? { category: { slug: filter.category } } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
              { material: { contains: search, mode: "insensitive" } },
              { colourName: { contains: search, mode: "insensitive" } },
              { category: { name: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: { category: { select: { slug: true } }, variants: true },
    orderBy: [{ createdAt: "desc" }, { name: "asc" }],
  });

  const now = new Date();
  const colourways = await colourwaysByStyleGroup(products);
  const summaries = products.flatMap((product) => {
    const cheapest = cheapestVariant(product.variants);
    if (!cheapest) {
      return [];
    }
    return [
      {
        slug: product.slug,
        name: product.name,
        colour: colourOf(product),
        colourways: colourwaysOf(product, colourways),
        categorySlug: product.category.slug,
        image: product.images[0] ?? null,
        priceFrom: cheapest.price,
        weightGrams: cheapest.weightGrams,
        inStock: product.variants.some((variant) => sellableUnits(variant) > 0),
        label: productLabel(product, now),
      },
    ];
  });

  const sorted =
    filter.sort === "price_asc"
      ? summaries.toSorted((a, b) => a.priceFrom - b.priceFrom)
      : filter.sort === "price_desc"
        ? summaries.toSorted((a, b) => b.priceFrom - a.priceFrom)
        : summaries;
  return filter.limit ? sorted.slice(0, filter.limit) : sorted;
}

export async function getProduct(slug: string): Promise<ProductDetail> {
  const product = await getDb().product.findFirst({
    where: { slug, isPublished: true },
    include: {
      category: { select: { slug: true, name: true } },
      variants: { orderBy: [{ position: "asc" }, { price: "asc" }] },
    },
  });
  if (!product || product.variants.length === 0) {
    throw notFound("Product not found");
  }
  const colourways = await colourwaysByStyleGroup([product]);
  return {
    slug: product.slug,
    name: product.name,
    description: product.description,
    material: product.material,
    colour: colourOf(product),
    colourways: colourwaysOf(product, colourways),
    category: product.category,
    images: product.images,
    label: productLabel(product),
    variants: product.variants.map((variant) => ({
      id: variant.id,
      name: variant.name,
      price: variant.price,
      weightGrams: variant.weightGrams,
      available: sellableUnits(variant),
    })),
  };
}
