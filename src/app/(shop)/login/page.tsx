import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { Notice } from "@/components/ui/notice";
import { copy } from "@/lib/copy";
import { demoLogins } from "@/server/seed";
import { getStoreSettings } from "@/server/store";
import { getViewer, safeNextPath } from "../../_lib/viewer";

export const metadata: Metadata = { title: copy.auth.logInTitle };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const nextPath = safeNextPath((await searchParams).next);
  if (await getViewer()) {
    redirect(nextPath);
  }
  const { demoMode } = getStoreSettings();
  return (
    <div className="mx-auto flex max-w-form flex-col gap-8">
      <h1 className="text-heading-lg">{copy.auth.logInTitle}</h1>
      {demoMode && (
        <Notice title={copy.auth.demoLoginsTitle}>
          <p>{copy.auth.demoLoginsBody}</p>
          <dl className="mt-3 flex flex-col gap-2">
            {demoLogins.map((login) => (
              <div key={login.email}>
                <dt className="text-ink">
                  {login.role === "customer" ? copy.auth.demoCustomer : copy.auth.demoAdmin}
                </dt>
                <dd className="tabular">
                  {login.email} / {login.password}
                </dd>
              </div>
            ))}
          </dl>
        </Notice>
      )}
      <AuthForm mode="login" nextPath={nextPath} demoWarning={false} />
    </div>
  );
}
