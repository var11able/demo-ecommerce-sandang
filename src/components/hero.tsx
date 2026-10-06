import Image from "next/image";
import { copy } from "@/lib/copy";
import { ButtonLink } from "./ui/button";

export function Hero({ image }: { image: string }) {
  return (
    <section className="-mx-4 -mt-8 flex flex-col gap-8 lg:-mx-8 lg:-mt-12">
      <div
        data-hero-photo
        className="relative aspect-product w-full overflow-hidden bg-fog sm:aspect-hero"
      >
        <Image
          src={image}
          alt={copy.home.heroPhoto}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      </div>
      <div className="flex flex-col items-start gap-6 px-4 lg:flex-row lg:items-end lg:justify-between lg:px-8">
        <div className="flex max-w-prose flex-col gap-3">
          <p data-hero-step className="label-caps">
            {copy.home.heroLabel}
          </p>
          <h1 data-hero-step className="text-heading-lg lg:text-display">
            {copy.home.heroTitle}
          </h1>
          <p data-hero-step className="text-body-lg text-ink-soft">
            {copy.home.heroBody}
          </p>
        </div>
        <div data-hero-step>
          <ButtonLink href="/search" variant="secondary">
            {copy.home.heroCta}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
