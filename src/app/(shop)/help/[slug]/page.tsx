import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HelpArticle } from "@/components/help-article";
import { findHelpPage, sandboxPaymentDetails } from "@/lib/help-content";
import { getStoreSettings } from "@/server/store";

type Props = PageProps<"/help/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = findHelpPage((await params).slug);
  return page ? { title: page.title, description: page.intro } : {};
}

export default async function HelpPage({ params }: Props) {
  const page = findHelpPage((await params).slug);
  if (!page || page.slug === "privacy") {
    notFound();
  }
  const showTestDetails = page.slug === "how-to-pay" && getStoreSettings().sandboxPayments;
  return <HelpArticle page={page} extra={showTestDetails ? sandboxPaymentDetails : undefined} />;
}
