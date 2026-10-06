"use client";

import Link from "next/link";
import { copy } from "@/lib/copy";
import "./globals.css";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <main className="mx-auto flex max-w-content flex-col items-start gap-4 px-4 py-16 lg:px-8">
          <h1 className="text-heading-lg">{copy.error.title}</h1>
          <p className="text-body-lg text-ink-soft">{copy.error.body}</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={reset}
              className="inline-flex min-h-11 items-center rounded-control border border-ink px-6 text-body"
            >
              {copy.error.retry}
            </button>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center rounded-control px-6 text-body underline underline-offset-4"
            >
              {copy.error.backHome}
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
