"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import type { passwordResetResponseSchema } from "@/contracts/accounts";
import { callApi } from "@/lib/api-client";
import { copy } from "@/lib/copy";
import { Button } from "./ui/button";
import { Notice } from "./ui/notice";
import { TextField } from "./ui/text-field";

type State =
  | { kind: "idle" }
  | { kind: "pending" }
  | { kind: "done"; message: string }
  | { kind: "failed"; message: string };

export function ForgotPasswordForm() {
  const [state, setState] = useState<State>({ kind: "idle" });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email"));
    setState({ kind: "pending" });
    const result = await callApi<typeof passwordResetResponseSchema>("/auth/password-reset", {
      method: "POST",
      body: { email },
    });
    setState(
      result.ok
        ? { kind: "done", message: result.data.message }
        : { kind: "failed", message: result.message },
    );
  }

  if (state.kind === "done") {
    return <Notice tone="success" role="status" title={state.message} />;
  }
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <TextField
        id="email"
        name="email"
        type="email"
        label={copy.auth.email}
        autoComplete="email"
        required
      />
      <p role="alert" className="text-caption text-danger empty:hidden">
        {state.kind === "failed" ? state.message : null}
      </p>
      <Button type="submit" variant="primary" fullWidth disabled={state.kind === "pending"}>
        {state.kind === "pending" ? copy.auth.sendingLink : copy.auth.sendLink}
      </Button>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, setState] = useState<State>({ kind: "idle" });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get("password"));
    setState({ kind: "pending" });
    const result = await callApi<typeof passwordResetResponseSchema>(
      "/auth/password-reset/confirm",
      { method: "POST", body: { token, password } },
    );
    setState(
      result.ok
        ? { kind: "done", message: result.data.message }
        : { kind: "failed", message: result.message },
    );
  }

  if (state.kind === "done") {
    return (
      <Notice tone="success" role="status" title={state.message}>
        <Link href="/login" className="underline underline-offset-4">
          {copy.auth.backToLogIn}
        </Link>
      </Notice>
    );
  }
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <TextField
        id="password"
        name="password"
        type="password"
        label={copy.auth.newPassword}
        hint={copy.auth.passwordHint}
        autoComplete="new-password"
        required
        minLength={10}
        maxLength={128}
      />
      {state.kind === "failed" && (
        <div role="alert" className="flex flex-col gap-2">
          <p className="text-caption text-danger">{state.message}</p>
          <Link href="/forgot-password" className="text-caption underline underline-offset-4">
            {copy.auth.askAgain}
          </Link>
        </div>
      )}
      <Button type="submit" variant="primary" fullWidth disabled={state.kind === "pending"}>
        {state.kind === "pending" ? copy.auth.savingPassword : copy.auth.savePassword}
      </Button>
    </form>
  );
}
