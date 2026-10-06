import type { Metadata } from "next";
import Image from "next/image";
import { copy } from "@/lib/copy";
import {
  photoCredits,
  photographerProfile,
  unsplashHome,
  type PhotoCredit,
} from "@/lib/photo-credits";

export const metadata: Metadata = { title: copy.credits.title, description: copy.credits.intro };

const linkClasses = "underline underline-offset-4";

function CreditLine({ credit }: { credit: PhotoCredit }) {
  if (!credit.photographer) {
    return (
      <p className="text-caption text-muted">
        {copy.credits.unknown}{" "}
        <a href={credit.source} className={linkClasses}>
          {copy.credits.original}
        </a>
      </p>
    );
  }
  return (
    <p className="text-caption text-muted">
      {copy.credits.photoBy}{" "}
      <a href={photographerProfile(credit.photographer)} className={linkClasses}>
        {credit.photographer.name}
      </a>{" "}
      {copy.credits.on}{" "}
      <a href={unsplashHome} className={linkClasses}>
        {copy.credits.unsplash}
      </a>
      {" · "}
      <a href={credit.source} className={linkClasses}>
        {copy.credits.original}
      </a>
    </p>
  );
}

function CreditList({ title, credits }: { title: string; credits: PhotoCredit[] }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-heading-sm">{title}</h2>
      <ul className="flex flex-col">
        {credits.map((credit) => (
          <li key={credit.image} className="flex items-center gap-4 border-b border-line py-3">
            <span className="relative block w-12 shrink-0 overflow-hidden bg-fog aspect-product">
              <Image src={credit.image} alt="" fill sizes="48px" className="object-cover" />
            </span>
            <div className="flex flex-col gap-1">
              <p className="text-body">{credit.subject}</p>
              <CreditLine credit={credit} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function CreditsPage() {
  return (
    <article className="mx-auto flex max-w-prose flex-col gap-8">
      <header className="flex flex-col gap-3">
        <h1 className="text-heading-lg lg:text-display">{copy.credits.title}</h1>
        <p className="text-body-lg text-ink-soft">{copy.credits.intro}</p>
      </header>
      <CreditList
        title={copy.credits.products}
        credits={photoCredits.filter((credit) => credit.group === "products")}
      />
      <CreditList
        title={copy.credits.home}
        credits={photoCredits.filter((credit) => credit.group === "home")}
      />
    </article>
  );
}
