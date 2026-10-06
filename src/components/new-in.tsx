import type { Category, ProductSummary } from "@/contracts/catalog";
import { copy } from "@/lib/copy";
import { ProductGrid } from "./product-card";
import { NavPill } from "./ui/nav-pill";

export function NewIn({
  categories,
  current,
  products,
}: {
  categories: Pick<Category, "slug" | "name">[];
  current: string | undefined;
  products: ProductSummary[];
}) {
  const tabs = [
    { href: "/#new-in", label: copy.home.newInAll, current: current === undefined },
    ...categories.map((category) => ({
      href: `/?category=${category.slug}#new-in`,
      label: category.name,
      current: current === category.slug,
    })),
  ];
  return (
    <section id="new-in" aria-labelledby="new-in-title" className="flex scroll-mt-4 flex-col gap-6">
      <h2 id="new-in-title" className="text-heading-sm">
        {copy.home.newInTitle}
      </h2>
      <nav aria-label={copy.home.newInFilter}>
        <ul className="-mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {tabs.map((tab) => (
            <li key={tab.href}>
              <NavPill href={tab.href} current={tab.current}>
                {tab.label}
              </NavPill>
            </li>
          ))}
        </ul>
      </nav>
      <ProductGrid products={products} />
    </section>
  );
}
