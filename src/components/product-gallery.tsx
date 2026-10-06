import Image from "next/image";
import { copy } from "@/lib/copy";

export function ProductGallery({ name, images }: { name: string; images: string[] }) {
  const [main, ...rest] = images;
  return (
    <div className="flex flex-col gap-4">
      <div className="relative aspect-product w-full overflow-hidden bg-fog">
        {main && (
          <Image
            src={main}
            alt={copy.product.photoOf(name)}
            fill
            priority
            sizes="(min-width: 1440px) 700px, (min-width: 1024px) 50vw, 100vw"
            className="object-cover"
          />
        )}
      </div>
      {rest.length > 0 && (
        <ul className="grid grid-cols-2 gap-4">
          {rest.map((image) => (
            <li key={image} className="relative aspect-product overflow-hidden bg-fog">
              <Image src={image} alt="" fill sizes="300px" className="object-cover" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
