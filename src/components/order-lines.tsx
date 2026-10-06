import Image from "next/image";
import Link from "next/link";
import { Price } from "./ui/price";

export type DisplayLine = {
  key: string;
  productName: string;
  productSlug: string;
  variantName: string;
  image: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

export function OrderLines({ lines }: { lines: DisplayLine[] }) {
  return (
    <ul className="border-t border-line">
      {lines.map((line) => (
        <li key={line.key} className="flex gap-4 border-b border-line py-4">
          <Link
            href={`/products/${line.productSlug}`}
            className="relative block size-20 shrink-0 overflow-hidden bg-fog"
          >
            {line.image && (
              <Image src={line.image} alt="" fill sizes="80px" className="object-cover" />
            )}
          </Link>
          <div className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-2">
            <div>
              <p className="text-body-lg">{line.productName}</p>
              <p className="text-caption text-muted">
                {line.variantName} · {line.quantity} × <Price amount={line.unitPrice} />
              </p>
            </div>
            <p className="text-body">
              <Price amount={line.lineTotal} />
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
