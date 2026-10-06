import { BannerStrip } from "@/components/banner-strip";
import { EditorialSplit, type EditorialStory } from "@/components/editorial-split";
import { Hero } from "@/components/hero";
import { HomeSequences } from "@/components/home-sequences";
import { NewIn } from "@/components/new-in";
import type { Category } from "@/contracts/catalog";
import { copy } from "@/lib/copy";
import { homePhotos } from "@/lib/home-photos";
import { listCategories, listProducts } from "@/server/catalog";

const newInCount = 8;

const stories = [
  {
    category: "outerwear",
    image: homePhotos.outerwear,
    ...copy.home.editorial.outerwear,
  },
  {
    category: "dresses-and-skirts",
    image: homePhotos.dresses,
    ...copy.home.editorial.dresses,
  },
];

function storiesFor(categories: Category[]): EditorialStory[] {
  return stories
    .filter((story) => categories.some((category) => category.slug === story.category))
    .map(({ category, ...story }) => ({ ...story, href: `/categories/${category}` }));
}

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const requested = (await searchParams).category;
  const categories = await listCategories();
  const current = categories.find((category) => category.slug === requested)?.slug;
  const products = await listProducts({ sort: "newest", limit: newInCount, category: current });

  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-start gap-4 py-12">
        <h1 className="text-heading-lg">{copy.home.emptyTitle}</h1>
        <p className="text-body-lg text-ink-soft">{copy.home.emptyBody}</p>
      </div>
    );
  }

  const editorial = storiesFor(categories);
  return (
    <HomeSequences>
      <div className="flex flex-col gap-16">
        <Hero image={homePhotos.hero} />
        <NewIn categories={categories} current={current} products={products} />
        {editorial.length > 0 && <EditorialSplit stories={editorial} />}
        <div className="-mx-4 lg:-mx-8">
          <BannerStrip>{copy.home.demoBanner}</BannerStrip>
        </div>
      </div>
    </HomeSequences>
  );
}
