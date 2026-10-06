import type { Metadata } from "next";
import { ProductListing } from "@/components/product-listing";
import { productSortSchema } from "@/contracts/catalog";
import { copy } from "@/lib/copy";
import { listProducts } from "@/server/catalog";

type Props = PageProps<"/search">;

function readQuery(value: string | string[] | undefined): string | undefined {
  const text = (Array.isArray(value) ? value[0] : value)?.trim().slice(0, 100);
  return text ? text : undefined;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const query = readQuery((await searchParams).q);
  return { title: query ? copy.catalogue.searchTitle(query) : copy.catalogue.allTitle };
}

export default async function SearchPage({ searchParams }: Props) {
  const parameters = await searchParams;
  const query = readQuery(parameters.q);
  const sort = productSortSchema.catch("newest").parse(parameters.sort);
  const products = await listProducts({ q: query, sort });
  return (
    <ProductListing
      title={query ? copy.catalogue.searchTitle(query) : copy.catalogue.allTitle}
      products={products}
      basePath="/search"
      sort={sort}
      query={query}
      emptyMessage={copy.catalogue.empty}
    />
  );
}
