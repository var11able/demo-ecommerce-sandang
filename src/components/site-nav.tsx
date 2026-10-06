"use client";

import { usePathname } from "next/navigation";
import type { Category } from "@/contracts/catalog";
import { copy } from "@/lib/copy";
import { NavPill } from "./ui/nav-pill";

export function SiteNav({ categories }: { categories: Pick<Category, "slug" | "name">[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label={copy.nav.categories} className="min-w-0">
      <ul className="-mx-4 flex gap-1 overflow-x-auto px-4 py-1 lg:mx-0 lg:px-0">
        <li>
          <NavPill href="/search" current={pathname === "/search"}>
            {copy.nav.all}
          </NavPill>
        </li>
        {categories.map((category) => {
          const href = `/categories/${category.slug}`;
          return (
            <li key={category.slug}>
              <NavPill href={href} current={pathname === href}>
                {category.name}
              </NavPill>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
