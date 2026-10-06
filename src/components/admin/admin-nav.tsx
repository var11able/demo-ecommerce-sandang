"use client";

import { usePathname } from "next/navigation";
import { copy } from "@/lib/copy";
import { NavPill } from "../ui/nav-pill";

export function AdminNav({ showSubscribers }: { showSubscribers: boolean }) {
  const pathname = usePathname();
  const links = [
    { href: "/admin/orders", label: copy.admin.nav.orders },
    { href: "/admin/products", label: copy.admin.nav.products },
    { href: "/admin/categories", label: copy.admin.nav.categories },
    ...(showSubscribers
      ? [
          { href: "/admin/subscribers", label: copy.admin.nav.subscribers },
          { href: "/admin/emails", label: copy.admin.nav.emails },
        ]
      : []),
  ];
  return (
    <nav aria-label={copy.admin.title}>
      <ul className="flex flex-wrap gap-2">
        {links.map((link) => (
          <li key={link.href}>
            <NavPill href={link.href} current={pathname.startsWith(link.href)}>
              {link.label}
            </NavPill>
          </li>
        ))}
      </ul>
    </nav>
  );
}
