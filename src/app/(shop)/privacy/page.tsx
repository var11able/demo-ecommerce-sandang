import type { Metadata } from "next";
import { HelpArticle } from "@/components/help-article";
import { findHelpPage } from "@/lib/help-content";

const page = findHelpPage("privacy")!;

export const metadata: Metadata = { title: page.title, description: page.intro };

export default function PrivacyPage() {
  return <HelpArticle page={page} />;
}
