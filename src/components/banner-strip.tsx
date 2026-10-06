export function BannerStrip({ children }: { children: string }) {
  return (
    <section className="bg-fog px-4 py-16 text-center">
      <p data-banner-line className="mx-auto max-w-content text-heading lg:text-heading-lg">
        {children}
      </p>
    </section>
  );
}
