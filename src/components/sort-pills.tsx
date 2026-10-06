import type { ProductSort } from "@/contracts/catalog";
import { copy } from "@/lib/copy";
import { NavPill } from "./ui/nav-pill";

const sorts: ProductSort[] = ["newest", "price_asc", "price_desc"];

export function SortPills({
  basePath,
  current,
  query,
}: {
  basePath: string;
  current: ProductSort;
  query?: string;
}) {
  return (
    <nav aria-label={copy.catalogue.sortLabel}>
      <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 py-1 sm:mx-0 sm:px-0">
        {sorts.map((sort) => {
          const params = new URLSearchParams();
          if (query) {
            params.set("q", query);
          }
          if (sort !== "newest") {
            params.set("sort", sort);
          }
          const search = params.toString();
          return (
            <li key={sort}>
              <NavPill
                href={search ? `${basePath}?${search}` : basePath}
                current={sort === current}
              >
                {copy.catalogue.sort[sort]}
              </NavPill>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
