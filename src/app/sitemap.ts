import type { MetadataRoute } from "next";
import { helpLinks } from "@/lib/help-content";
import { listCategories, listProducts } from "@/server/catalog";
import { getStoreSettings } from "@/server/store";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { origin } = getStoreSettings();
  const [categories, products] = await Promise.all([listCategories(), listProducts()]);
  const paths = [
    "/",
    "/search",
    ...categories.map((category) => `/categories/${category.slug}`),
    ...products.map((product) => `/products/${product.slug}`),
    ...helpLinks.map((link) => link.href),
    "/credits",
  ];
  return paths.map((path) => ({ url: `${origin}${path}` }));
}
