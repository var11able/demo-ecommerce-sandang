import { connection } from "next/server";
import type { ReactNode } from "react";
import { AnnouncementBar, DemoBar } from "@/components/demo-bar";
import { HeaderActions } from "@/components/header-actions";
import { SiteFooter } from "@/components/site-footer";
import { NewsletterForm } from "@/components/newsletter-form";
import { SiteHeader } from "@/components/site-header";
import { SkipLink } from "@/components/skip-link";
import { helpLinks } from "@/lib/help-content";
import { getCartItemCount } from "@/server/cart";
import { listCategories } from "@/server/catalog";
import { flatShippingFee, getStoreSettings } from "@/server/store";
import { getViewer } from "../_lib/viewer";

export default async function ShopLayout({ children }: Readonly<{ children: ReactNode }>) {
  await connection();
  const [categories, viewer] = await Promise.all([listCategories(), getViewer()]);
  const cartCount = viewer ? await getCartItemCount(viewer.id) : 0;
  const { demoMode } = getStoreSettings();
  return (
    <>
      <SkipLink />
      {demoMode ? <DemoBar /> : <AnnouncementBar shippingFee={flatShippingFee} />}
      <SiteHeader
        categories={categories}
        actions={<HeaderActions loggedIn={viewer !== null} cartCount={cartCount} />}
      />
      <main id="main" className="px-4 py-8 lg:px-8 lg:py-12">
        {children}
      </main>
      <SiteFooter
        categories={categories}
        helpLinks={helpLinks}
        newsletter={<NewsletterForm demoNotice={demoMode} />}
      />
    </>
  );
}
