import Link from "next/link";
import type { Colourway } from "@/contracts/catalog";
import { copy } from "@/lib/copy";
import { cx } from "@/lib/cx";

function Swatch({ hex, className }: { hex: string; className: string }) {
  return (
    <span
      aria-hidden="true"
      className={cx("block border border-line", className)}
      style={{ backgroundColor: hex }}
    />
  );
}

export function SwatchRow({ colourways }: { colourways: Colourway[] }) {
  if (colourways.length === 0) {
    return null;
  }
  return (
    <div className="flex items-center gap-1">
      <span className="sr-only">
        {copy.product.colourList(colourways.map((colourway) => colourway.colour.name))}
      </span>
      {colourways.map((colourway) => (
        <Swatch key={colourway.slug} hex={colourway.colour.hex} className="size-3" />
      ))}
    </div>
  );
}

export function SwatchLinks({ colourways, current }: { colourways: Colourway[]; current: string }) {
  const currentColour = colourways.find((colourway) => colourway.slug === current)?.colour;
  if (colourways.length === 0) {
    return null;
  }
  return (
    <nav aria-label={copy.product.colourLabel} className="flex flex-col gap-2">
      <p className="text-caption text-muted">
        {copy.product.colourLabel}
        {currentColour && <span className="text-ink">: {currentColour.name}</span>}
      </p>
      <ul className="flex flex-wrap gap-1">
        {colourways.map((colourway) => {
          const selected = colourway.slug === current;
          return (
            <li key={colourway.slug}>
              <Link
                href={`/products/${colourway.slug}`}
                aria-current={selected ? "page" : undefined}
                aria-label={colourway.colour.name}
                title={colourway.colour.name}
                className={cx(
                  "flex size-11 items-center justify-center border",
                  selected ? "border-ink" : "border-transparent hover:border-line",
                )}
              >
                <Swatch hex={colourway.colour.hex} className="size-6" />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
