import Image from "next/image";
import Link from "next/link";
import type { ProductSummary } from "@/contracts/catalog";
import { copy } from "@/lib/copy";
import { SwatchRow } from "./colour-swatches";
import { Price } from "./ui/price";

export function ProductCard({
  product,
  priority = false,
}: {
  product: ProductSummary;
  priority?: boolean;
}) {
  return (
    <article className="group flex flex-col gap-3">
      <Link href={`/products/${product.slug}`} className="flex flex-col gap-2">
        <div className="relative aspect-product w-full overflow-hidden bg-fog">
          {product.image && (
            <Image
              src={product.image}
              alt={copy.product.photoOf(product.name)}
              fill
              priority={priority}
              sizes="(min-width: 1024px) 25vw, 50vw"
              className="object-cover"
            />
          )}
        </div>
        <div className="flex flex-col gap-1">
          <SwatchRow colourways={product.colourways} />
          {product.label && product.inStock && (
            <p className="label-caps">{copy.catalogue.labels[product.label]}</p>
          )}
          <h3 className="text-caption group-hover:underline group-hover:underline-offset-4">
            {product.name}
          </h3>
          {product.colour && <p className="text-caption text-muted">{product.colour.name}</p>}
          {product.inStock ? (
            <p className="text-caption">
              <Price amount={product.priceFrom} />
            </p>
          ) : (
            <p className="text-caption text-muted">{copy.catalogue.outOfStock}</p>
          )}
        </div>
      </Link>
    </article>
  );
}

export function ProductGrid({ products }: { products: ProductSummary[] }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4 lg:gap-x-6">
      {products.map((product, index) => (
        <li key={product.slug} data-arrival>
          <ProductCard product={product} priority={index < 4} />
        </li>
      ))}
    </ul>
  );
}
