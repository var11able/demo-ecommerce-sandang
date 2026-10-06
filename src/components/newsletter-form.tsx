"use client";

import { useState, type FormEvent } from "react";
import type { newsletterResponseSchema } from "@/contracts/newsletter";
import { callApi } from "@/lib/api-client";
import { copy } from "@/lib/copy";
import { durations } from "@/lib/motion-presets";
import { Swap } from "./motion/swap";
import { Button } from "./ui/button";

type State =
  { kind: "idle" } | { kind: "sending" } | { kind: "sent" } | { kind: "error"; message: string };

const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function NewsletterForm({ demoNotice }: { demoNotice: boolean }) {
  const [state, setState] = useState<State>({ kind: "idle" });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    if (!looksLikeEmail.test(email)) {
      setState({ kind: "error", message: copy.newsletter.invalid });
      return;
    }
    setState({ kind: "sending" });
    const result = await callApi<typeof newsletterResponseSchema>("/newsletter/subscribers", {
      method: "POST",
      body: { email },
    });
    if (result.ok) {
      setState({ kind: "sent" });
    } else {
      setState({
        kind: "error",
        message: result.fields?.email ?? result.message,
      });
    }
  }

  return (
    <section aria-labelledby="newsletter-title" className="flex flex-col gap-3">
      <h2 id="newsletter-title" className="text-heading-sm">
        {copy.newsletter.title}
      </h2>
      <p className="text-body text-ink-soft">{copy.newsletter.body}</p>
      <Swap swapKey={state.kind === "sent" ? "sent" : "form"} duration={durations.quick}>
        {state.kind === "sent" ? (
          <p role="status" className="text-heading-sm">
            {copy.newsletter.sent}
          </p>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-2">
            <label htmlFor="newsletter-email" className="sr-only">
              {copy.newsletter.emailLabel}
            </label>
            <div className="flex gap-2">
              <input
                id="newsletter-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder={copy.newsletter.placeholder}
                aria-invalid={state.kind === "error" ? true : undefined}
                aria-describedby={state.kind === "error" ? "newsletter-error" : undefined}
                className="min-h-11 min-w-0 flex-1 rounded-control border border-ink bg-surface px-4 text-body"
              />
              <Button type="submit" variant="primary" disabled={state.kind === "sending"}>
                {state.kind === "sending" ? copy.newsletter.sending : copy.newsletter.subscribe}
              </Button>
            </div>
            {state.kind === "error" && (
              <p id="newsletter-error" role="alert" className="text-caption text-danger">
                {state.message}
              </p>
            )}
            {demoNotice && (
              <p className="text-caption text-muted">{copy.auth.demoDetailsWarning}</p>
            )}
          </form>
        )}
      </Swap>
    </section>
  );
}
