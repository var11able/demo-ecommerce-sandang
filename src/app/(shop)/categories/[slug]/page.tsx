import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductListing } from "@/components/product-listing";
import { productSortSchema } from "@/contracts/catalog";
import { copy } from "@/lib/copy";
import { listCategories, listProducts } from "@/server/catalog";

type Props = PageProps<"/categories/[slug]">;

async function findCategory(slug: string) {
  const categories = await listCategories();
  return categories.find((category) => category.slug === slug);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = await findCategory((await params).slug);
  return { title: category?.name ?? copy.notFound.title };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const category = await findCategory(slug);
  if (!category) {
    notFound();
  }
  const sort = productSortSchema.catch("newest").parse((await searchParams).sort);
  const products = await listProducts({ category: slug, sort });
  return (
    <ProductListing
      title={category.name}
      products={products}
      basePath={`/categories/${slug}`}
      sort={sort}
      emptyMessage={copy.catalogue.emptyCategory}
    />
  );
}
