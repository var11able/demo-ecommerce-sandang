"use client";

import { useEffect, useState } from "react";
import type { HealthReport } from "@/contracts/health";
import { copy } from "@/lib/copy";

type HealthView =
  { state: "checking" } | { state: "answered"; report: HealthReport } | { state: "unreachable" };

function isHealthReport(body: unknown): body is HealthReport {
  return (
    typeof body === "object" &&
    body !== null &&
    "status" in body &&
    "database" in body &&
    (body.database === "up" || body.database === "down")
  );
}

async function fetchHealth(signal: AbortSignal): Promise<HealthView> {
  const response = await fetch("/api/v1/health", { cache: "no-store", signal });
  const body: unknown = await response.json().catch(() => null);
  return isHealthReport(body) ? { state: "answered", report: body } : { state: "unreachable" };
}

export function HealthStatus() {
  const [view, setView] = useState<HealthView>({ state: "checking" });

  useEffect(() => {
    const controller = new AbortController();
    fetchHealth(controller.signal)
      .then(setView)
      .catch(() => {
        if (!controller.signal.aborted) {
          setView({ state: "unreachable" });
        }
      });
    return () => controller.abort();
  }, []);

  return (
    <section aria-live="polite" className="flex flex-col gap-3">
      <h1 className="text-heading-lg">{copy.status.title}</h1>
      {view.state === "checking" && <p>{copy.status.checking}</p>}
      {view.state === "unreachable" && <p>{copy.status.unreachable}</p>}
      {view.state === "answered" && (
        <>
          <p>{copy.status.api(view.report.status)}</p>
          <p>{copy.status.database(view.report.database)}</p>
        </>
      )}
    </section>
  );
}
