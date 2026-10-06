"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { customerResponseSchema } from "@/contracts/accounts";
import { callApi } from "@/lib/api-client";
import { copy } from "@/lib/copy";
import { Button } from "./ui/button";
import { TextField } from "./ui/text-field";

type Mode = "login" | "register";

export function AuthForm({
  mode,
  nextPath,
  demoWarning,
}: {
  mode: Mode;
  nextPath: string;
  demoWarning: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body =
      mode === "login"
        ? { email: String(form.get("email")), password: String(form.get("password")) }
        : {
            name: String(form.get("name")),
            email: String(form.get("email")),
            password: String(form.get("password")),
          };
    setPending(true);
    setMessage(null);
    const result = await callApi<typeof customerResponseSchema>(
      mode === "login" ? "/auth/login" : "/auth/register",
      { method: "POST", body },
    );
    if (result.ok) {
      router.replace(nextPath);
      router.refresh();
      return;
    }
    setPending(false);
    setMessage(result.message);
  }

  const otherHref = `${mode === "login" ? "/register" : "/login"}?next=${encodeURIComponent(nextPath)}`;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      {mode === "register" && (
        <TextField
          id="name"
          name="name"
          label={copy.auth.name}
          autoComplete="name"
          required
          maxLength={100}
        />
      )}
      <TextField
        id="email"
        name="email"
        type="email"
        label={copy.auth.email}
        autoComplete="email"
        required
      />
      <TextField
        id="password"
        name="password"
        type="password"
        label={copy.auth.password}
        hint={mode === "register" ? copy.auth.passwordHint : undefined}
        autoComplete={mode === "login" ? "current-password" : "new-password"}
        required
        minLength={mode === "register" ? 10 : undefined}
        maxLength={128}
      />
      {mode === "login" && (
        <Link
          href="/forgot-password"
          className="-mt-2 inline-flex min-h-11 w-fit items-center text-caption underline underline-offset-4"
        >
          {copy.auth.forgotPassword}
        </Link>
      )}
      <p role="alert" className="text-caption text-danger empty:hidden">
        {message}
      </p>
      <Button type="submit" variant="primary" fullWidth disabled={pending}>
        {mode === "login"
          ? pending
            ? copy.auth.loggingIn
            : copy.auth.logIn
          : pending
            ? copy.auth.registering
            : copy.auth.register}
      </Button>
      {demoWarning && <p className="text-caption text-muted">{copy.auth.demoDetailsWarning}</p>}
      <p className="text-body text-ink-soft">
        {mode === "login" ? copy.auth.noAccount : copy.auth.haveAccount}{" "}
        <Link href={otherHref} className="underline underline-offset-4">
          {mode === "login" ? copy.auth.createAccount : copy.auth.logInInstead}
        </Link>
      </p>
    </form>
  );
}
