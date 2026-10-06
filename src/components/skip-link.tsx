import { copy } from "@/lib/copy";

export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-20 focus:bg-surface focus:p-3"
    >
      {copy.nav.skipToContent}
    </a>
  );
}
