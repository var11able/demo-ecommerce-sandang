import Link from "next/link";
import type { ReactNode } from "react";
import type { Category } from "@/contracts/catalog";
import { copy } from "@/lib/copy";

function FooterLinks({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="label-caps">{title}</h2>
      <ul className="flex flex-col gap-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-body text-ink-soft underline-offset-4 hover:underline"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteFooter({
  categories,
  helpLinks = [],
  newsletter,
}: {
  categories: Pick<Category, "slug" | "name">[];
  helpLinks?: { href: string; label: string }[];
  newsletter?: ReactNode;
}) {
  const shopLinks = [
    { href: "/search", label: copy.nav.all },
    ...categories.map((category) => ({
      href: `/categories/${category.slug}`,
      label: category.name,
    })),
  ];
  return (
    <footer className="mt-16 border-t border-line">
      <div className="grid gap-10 px-4 py-12 md:grid-cols-2 lg:grid-cols-3 lg:px-8">
        <div className="md:col-span-2 lg:col-span-1">{newsletter}</div>
        <FooterLinks title={copy.nav.shop} links={shopLinks} />
        {helpLinks.length > 0 && <FooterLinks title={copy.help.title} links={helpLinks} />}
      </div>
      <div className="px-4 lg:px-8">
        <div className="flex flex-col gap-2 border-t border-line py-6 text-caption text-muted sm:flex-row sm:justify-between">
          <p>{copy.store.information}</p>
          <Link href="/credits" className="underline-offset-4 hover:underline">
            {copy.credits.title}
          </Link>
        </div>
      </div>
    </footer>
  );
}
