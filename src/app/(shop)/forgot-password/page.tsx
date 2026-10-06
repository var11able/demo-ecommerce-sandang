import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/password-reset-forms";
import { Notice } from "@/components/ui/notice";
import { copy } from "@/lib/copy";
import { getStoreSettings } from "@/server/store";

export const metadata: Metadata = { title: copy.auth.forgotTitle };

export default function ForgotPasswordPage() {
  const { demoMode } = getStoreSettings();
  return (
    <div className="mx-auto flex max-w-form flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h1 className="text-heading-lg">{copy.auth.forgotTitle}</h1>
        <p className="text-body-lg text-ink-soft">{copy.auth.forgotIntro}</p>
      </div>
      {demoMode && <Notice title={copy.auth.demoNoEmail} />}
      <ForgotPasswordForm />
    </div>
  );
}
