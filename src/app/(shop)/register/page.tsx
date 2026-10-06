import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { copy } from "@/lib/copy";
import { getStoreSettings } from "@/server/store";
import { getViewer, safeNextPath } from "../../_lib/viewer";

export const metadata: Metadata = { title: copy.auth.registerTitle };

export default async function RegisterPage({ searchParams }: PageProps<"/register">) {
  const nextPath = safeNextPath((await searchParams).next);
  if (await getViewer()) {
    redirect(nextPath);
  }
  return (
    <div className="mx-auto flex max-w-form flex-col gap-8">
      <h1 className="text-heading-lg">{copy.auth.registerTitle}</h1>
      <AuthForm mode="register" nextPath={nextPath} demoWarning={getStoreSettings().demoMode} />
    </div>
  );
}
