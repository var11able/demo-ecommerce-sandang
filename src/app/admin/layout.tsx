import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { AdminNav } from "@/components/admin/admin-nav";
import { LogoutButton } from "@/components/logout-button";
import { SkipLink } from "@/components/skip-link";
import { Notice } from "@/components/ui/notice";
import { copy } from "@/lib/copy";
import { getViewer } from "../_lib/viewer";

export const metadata: Metadata = {
  title: { default: copy.admin.title, template: `%s · ${copy.admin.title}` },
  robots: { index: false },
};

export default async function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  await connection();
  const viewer = await getViewer();
  if (!viewer) {
    redirect("/login?next=/admin/orders");
  }
  if (viewer.role === "customer") {
    notFound();
  }
  const demo = viewer.role === "demo_admin";
  return (
    <div className="min-h-screen">
      <SkipLink />
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-content flex-wrap items-center justify-between gap-4 px-4 py-4 lg:px-8">
          <div className="flex items-center gap-6">
            <Link href="/admin/orders" className="text-heading-sm">
              {copy.store.name} {copy.admin.title}
            </Link>
            <AdminNav showSubscribers={!demo} />
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-caption underline underline-offset-4">
              {copy.admin.backToShop}
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto flex max-w-content flex-col gap-6 px-4 py-8 lg:px-8">
        {demo && <Notice title={copy.admin.demoNoticeTitle}>{copy.admin.demoNotice}</Notice>}
        {children}
      </main>
    </div>
  );
}
