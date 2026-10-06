import { serializeJsonLd } from "@/lib/structured-data";

export function JsonLd({ data, nonce }: { data: unknown; nonce: string | undefined }) {
  return (
    <script
      type="application/ld+json"
      nonce={nonce}
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
