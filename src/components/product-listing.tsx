import type { ProductSort, ProductSummary } from "@/contracts/catalog";
import { copy } from "@/lib/copy";
import { ProductGrid } from "./product-card";
import { SortPills } from "./sort-pills";
import { ButtonLink } from "./ui/button";

export function ProductListing({
  title,
  products,
  basePath,
  sort,
  query,
  emptyMessage,
}: {
  title: string;
  products: ProductSummary[];
  basePath: string;
  sort: ProductSort;
  query?: string;
  emptyMessage: string;
}) {
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4">
        <h1 className="text-heading-lg lg:text-display">{title}</h1>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SortPills basePath={basePath} current={sort} query={query} />
          <p className="text-caption text-muted">{copy.catalogue.productCount(products.length)}</p>
        </div>
      </header>
      {products.length > 0 ? (
        <ProductGrid products={products} />
      ) : (
        <div className="flex flex-col items-start gap-4 py-12">
          <p className="text-heading">{emptyMessage}</p>
          <ButtonLink href="/search" variant="secondary">
            {copy.catalogue.backToAll}
          </ButtonLink>
        </div>
      )}
    </div>
  );
}
