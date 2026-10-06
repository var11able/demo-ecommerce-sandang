"use client";

import { useEffect, useState } from "react";
import type { newsletterResponseSchema } from "@/contracts/newsletter";
import { callApi } from "@/lib/api-client";
import { copy } from "@/lib/copy";
import { ButtonLink } from "./ui/button";

type State = "working" | "done" | "invalid";

export function UnsubscribeView({ token }: { token: string | null }) {
  const [state, setState] = useState<State>(token ? "working" : "invalid");

  useEffect(() => {
    if (!token) {
      return;
    }
    let cancelled = false;
    callApi<typeof newsletterResponseSchema>("/newsletter/unsubscribe", {
      method: "POST",
      body: { token },
    }).then((result) => {
      if (!cancelled) {
        setState(result.ok ? "done" : "invalid");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div aria-live="polite" className="flex max-w-prose flex-col items-start gap-4 py-12">
      <h1 className="text-heading-lg">
        {state === "working"
          ? copy.newsletter.unsubscribing
          : state === "done"
            ? copy.newsletter.unsubscribed
            : copy.newsletter.badLink}
      </h1>
      {state !== "working" && (
        <p className="text-body-lg text-ink-soft">
          {state === "done" ? copy.newsletter.unsubscribedBody : copy.newsletter.badLinkBody}
        </p>
      )}
      <ButtonLink href="/" variant="secondary">
        {copy.newsletter.backToShop}
      </ButtonLink>
    </div>
  );
}
