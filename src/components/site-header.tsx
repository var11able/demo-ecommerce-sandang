import Link from "next/link";
import type { ReactNode } from "react";
import type { Category } from "@/contracts/catalog";
import { copy } from "@/lib/copy";
import { cx } from "@/lib/cx";
import { SiteNav } from "./site-nav";

function SearchForm({ id, className }: { id: string; className: string }) {
  return (
    <form action="/search" role="search" className={className}>
      <label htmlFor={id} className="sr-only">
        {copy.nav.searchLabel}
      </label>
      <input
        id={id}
        name="q"
        type="search"
        placeholder={copy.nav.searchPlaceholder}
        className="min-h-11 w-full border-b border-ink-soft bg-transparent px-1 text-caption placeholder:text-muted lg:w-48"
      />
    </form>
  );
}

export function SiteHeader({
  categories,
  actions,
}: {
  categories: Pick<Category, "slug" | "name">[];
  actions?: ReactNode;
}) {
  return (
    <header className="border-b border-ink bg-page">
      <div className="flex flex-col gap-2 px-4 py-2 lg:px-8 2xl:flex-row 2xl:items-center 2xl:gap-6">
        <div className="flex items-center justify-between gap-4 2xl:order-2 2xl:shrink-0">
          <Link href="/" className="text-heading font-bold uppercase lg:text-heading-lg">
            {copy.store.name}
          </Link>
          <div className="flex items-center gap-2 2xl:hidden">
            <SearchForm id="site-search-desktop" className="hidden lg:flex" />
            {actions}
          </div>
        </div>
        <div className="min-w-0 2xl:order-1 2xl:flex-1 2xl:basis-0">
          <SiteNav categories={categories} />
        </div>
        <SearchForm id="site-search" className="flex lg:hidden" />
        <div
          className={cx(
            "hidden items-center gap-2",
            "2xl:order-3 2xl:flex 2xl:flex-1 2xl:basis-0 2xl:justify-end",
          )}
        >
          <SearchForm id="site-search-wide" className="flex" />
          {actions}
        </div>
      </div>
    </header>
  );
}
