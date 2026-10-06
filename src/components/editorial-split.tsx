import Image from "next/image";
import Link from "next/link";

export type EditorialStory = { href: string; image: string; alt: string; label: string };

export function EditorialSplit({ stories }: { stories: EditorialStory[] }) {
  return (
    <section className="-mx-4 grid gap-8 sm:grid-cols-2 sm:gap-1 lg:-mx-8">
      {stories.map((story) => (
        <Link
          key={story.href}
          href={story.href}
          data-editorial
          className="group flex flex-col gap-3"
        >
          <span className="relative block aspect-product w-full overflow-hidden bg-fog">
            <Image
              src={story.image}
              alt={story.alt}
              fill
              sizes="(min-width: 640px) 50vw, 100vw"
              className="object-cover"
            />
          </span>
          <span className="px-4 label-caps group-hover:underline group-hover:underline-offset-4 lg:px-8">
            {story.label}
          </span>
        </Link>
      ))}
    </section>
  );
}
