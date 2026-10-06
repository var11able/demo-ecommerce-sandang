import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SwatchLinks } from "@/components/colour-swatches";
import { JsonLd } from "@/components/json-ld";
import { ProductGallery } from "@/components/product-gallery";
import { ProductPurchase } from "@/components/product-purchase";
import { SmallLabel } from "@/components/ui/small-label";
import type { ProductDetail } from "@/contracts/catalog";
import { copy } from "@/lib/copy";
import { formatRupiah } from "@/lib/format";
import { usesClothingSizes } from "@/lib/sizes";
import { productStructuredData } from "@/lib/structured-data";
import { getProduct } from "@/server/catalog";
import { StoreError } from "@/server/errors";
import { getStoreSettings } from "@/server/store";

type Props = PageProps<"/products/[slug]">;

async function findProduct(slug: string): Promise<ProductDetail | null> {
  try {
    return await getProduct(slug);
  } catch (error) {
    if (error instanceof StoreError && error.code === "not_found") {
      return null;
    }
    throw error;
  }
}

function shareTitle(product: ProductDetail): string {
  return product.colour ? `${product.name}, ${product.colour.name}` : product.name;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await findProduct((await params).slug);
  if (!product) {
    return { title: copy.notFound.title };
  }
  const lowestPrice = Math.min(...product.variants.map((variant) => variant.price));
  const shareDescription = `${formatRupiah(lowestPrice)} · ${product.description}`;
  const photo = product.images[0];
  return {
    title: shareTitle(product),
    description: product.description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      siteName: copy.store.name,
      type: "website",
      url: `/products/${product.slug}`,
      title: shareTitle(product),
      description: shareDescription,
      ...(photo ? { images: [{ url: photo, alt: copy.product.photoOf(product.name) }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: shareTitle(product),
      description: shareDescription,
    },
    other: {
      "product:price:amount": String(lowestPrice),
      "product:price:currency": "IDR",
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const product = await findProduct((await params).slug);
  if (!product) {
    notFound();
  }
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const details = [
    { term: copy.product.material, value: product.material },
    ...(product.colour ? [{ term: copy.product.colourLabel, value: product.colour.name }] : []),
    {
      term: copy.product.category,
      value: (
        <Link
          href={`/categories/${product.category.slug}`}
          className="underline underline-offset-4"
        >
          {product.category.name}
        </Link>
      ),
    },
  ];

  return (
    <div className="mx-auto grid w-full max-w-content gap-10 pb-24 sm:pb-0 lg:grid-cols-2 lg:gap-16">
      <JsonLd data={productStructuredData(product, getStoreSettings().origin)} nonce={nonce} />
      <div className="flex flex-col gap-2">
        <ProductGallery name={product.name} images={product.images} />
        <p className="text-caption text-muted">
          {copy.product.placeholderPhoto}{" "}
          <Link href="/credits" className="underline underline-offset-4">
            {copy.product.photoCredits}
          </Link>
        </p>
      </div>
      <div className="flex flex-col gap-6">
        {product.label && <SmallLabel>{copy.catalogue.labels[product.label]}</SmallLabel>}
        <h1 className="text-heading-lg">{product.name}</h1>
        <SwatchLinks colourways={product.colourways} current={product.slug} />
        <ProductPurchase
          variants={product.variants}
          sizeGuideHref={
            usesClothingSizes(product.variants.map((variant) => variant.name))
              ? "/help/size-guide"
              : undefined
          }
        />
        <section className="flex flex-col gap-3 border-t border-line pt-6">
          <h2 className="text-heading-sm">{copy.product.description}</h2>
          <p className="max-w-prose text-body-lg text-ink-soft">{product.description}</p>
        </section>
        <section className="border-t border-line pt-6">
          <h2 className="sr-only">{copy.product.details}</h2>
          <dl className="flex flex-col">
            {details.map((detail) => (
              <div
                key={detail.term}
                className="flex justify-between gap-4 border-b border-line py-3 text-body"
              >
                <dt className="text-muted">{detail.term}</dt>
                <dd className="text-right">{detail.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  );
}
