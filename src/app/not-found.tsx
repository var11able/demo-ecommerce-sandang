import { ButtonLink } from "@/components/ui/button";
import { copy } from "@/lib/copy";

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-content flex-col items-start gap-4 px-4 py-16 lg:px-8">
      <h1 className="text-heading-lg">{copy.notFound.title}</h1>
      <p className="max-w-prose text-body-lg text-ink-soft">{copy.notFound.body}</p>
      <ButtonLink href="/" variant="secondary">
        {copy.notFound.back}
      </ButtonLink>
    </main>
  );
}
