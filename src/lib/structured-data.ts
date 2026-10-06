import type { ProductDetail } from "@/contracts/catalog";
import { copy } from "./copy";

const backslash = String.fromCharCode(92);
const lineSeparators = String.fromCharCode(0x2028, 0x2029);
const scriptBreaking = new RegExp(`[<>&${lineSeparators}]`, "g");

export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(
    scriptBreaking,
    (character) => `${backslash}u${character.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
}

function absolute(origin: string, path: string): string {
  return new URL(path, origin).toString();
}

export function productStructuredData(product: ProductDetail, origin: string) {
  const prices = product.variants.map((variant) => variant.price);
  const inStock = product.variants.some((variant) => variant.available > 0);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    sku: product.slug,
    url: absolute(origin, `/products/${product.slug}`),
    image: product.images.map((image) => absolute(origin, image)),
    brand: { "@type": "Brand", name: copy.store.name },
    category: product.category.name,
    ...(product.colour ? { color: product.colour.name } : {}),
    material: product.material,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "IDR",
      lowPrice: Math.min(...prices),
      highPrice: Math.max(...prices),
      offerCount: product.variants.length,
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };
}
