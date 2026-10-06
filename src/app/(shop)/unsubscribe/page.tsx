import type { Metadata } from "next";
import { UnsubscribeView } from "@/components/unsubscribe-view";
import { unsubscribeBodySchema } from "@/contracts/newsletter";
import { copy } from "@/lib/copy";

export const metadata: Metadata = {
  title: copy.newsletter.unsubscribeTitle,
  robots: { index: false },
  referrer: "no-referrer",
};

export default async function UnsubscribePage({ searchParams }: PageProps<"/unsubscribe">) {
  const { token } = await searchParams;
  const parsed = unsubscribeBodySchema.safeParse({
    token: Array.isArray(token) ? token[0] : token,
  });
  return <UnsubscribeView token={parsed.success ? parsed.data.token : null} />;
}
