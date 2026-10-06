import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/password-reset-forms";
import { copy } from "@/lib/copy";

export const metadata: Metadata = { title: copy.auth.resetTitle, robots: { index: false } };

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const { token } = await searchParams;
  return (
    <div className="mx-auto flex max-w-form flex-col gap-8">
      <h1 className="text-heading-lg">{copy.auth.resetTitle}</h1>
      {typeof token === "string" && token.length > 0 ? (
        <ResetPasswordForm token={token} />
      ) : (
        <p className="text-body text-ink-soft">
          {copy.auth.missingToken}{" "}
          <Link href="/forgot-password" className="underline underline-offset-4">
            {copy.auth.askAgain}
          </Link>
        </p>
      )}
    </div>
  );
}
