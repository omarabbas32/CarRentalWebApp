import Link from "next/link";
import { Suspense } from "react";
import { CarCard, CarCardSkeleton } from "@/components/cars/car-card";
import { SearchBar } from "@/components/search/search-bar";
import { searchCars } from "@/lib/api/cars";
import { defaultSearchRange } from "@/lib/dates";
import { CarCategory, carCategoryLabel } from "@/lib/enums";
import { searchHref } from "@/lib/search-params";

/** Deep links into the same search the results page runs. */
const FEATURED_CATEGORIES = [
  CarCategory.Economy,
  CarCategory.SUV,
  CarCategory.Luxury,
  CarCategory.Convertible,
  CarCategory.Minivan,
  CarCategory.Pickup,
];

export default function Home() {
  // Tomorrow → +3 days. Both dates are required by the API, so the hero is
  // never in a state that cannot be submitted.
  const range = defaultSearchRange();

  return (
    <>
      <section className="border-b bg-gradient-to-b from-primary/6 to-transparent">
        <div className="mx-auto w-full max-w-7xl px-6 py-16 lg:px-12 lg:py-24">
          <div className="max-w-prose space-y-4">
            <h1 className="text-display">Someone nearby has the car you need.</h1>
            <p className="text-muted-foreground">
              Rent from people in your city, by the day. No counters, no queues.
            </p>
          </div>

          <SearchBar
            initial={{ city: "", start: range.start, end: range.end, features: [], page: 1 }}
            className="mt-8 max-w-4xl"
          />

          <nav aria-label="Browse by category" className="mt-6 flex flex-wrap gap-2">
            {FEATURED_CATEGORIES.map((category) => (
              <Link
                key={category}
                href={searchHref({ category, start: range.start, end: range.end })}
                className="rounded-full border px-3 py-1.5 text-caption text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {carCategoryLabel[category]}
              </Link>
            ))}
          </nav>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 py-14 lg:px-12">
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-h1">Free on your dates</h2>
            <p className="text-caption tabular-nums text-muted-foreground">
              Available {range.start.toLocaleDateString()} – {range.end.toLocaleDateString()}
            </p>
          </div>
          <Link
            href={searchHref({ start: range.start, end: range.end })}
            className="text-body underline underline-offset-4"
          >
            See all
          </Link>
        </div>

        <Suspense fallback={<FeaturedSkeleton />}>
          <Featured />
        </Suspense>
      </section>
    </>
  );
}

/**
 * There is no featured endpoint. These come from the same `/api/cars/search`
 * call the results page makes — inventing a separate concept would mean
 * inventing a second source of truth for what is available.
 */
async function Featured() {
  const range = defaultSearchRange();

  // Only the fetch is guarded. JSX must not be constructed inside try/catch:
  // React renders it later, so a render-time error would escape this handler
  // anyway — and the lint rules reject the pattern for exactly that reason.
  let result;
  try {
    result = await searchCars({
      start: range.start,
      end: range.end,
      pageNumber: 1,
      pageSize: 6,
    });
  } catch {
    // The landing page is not the place to explain a backend outage — the
    // search page surfaces the real error. Here the section steps aside.
    return null;
  }

  if (result.cars.length === 0) {
    return (
      <p className="mt-8 rounded-xl border border-dashed px-6 py-12 text-center text-muted-foreground">
        No cars are listed for these dates yet.
      </p>
    );
  }

  return (
    <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {result.cars.map((car) => (
        <CarCard key={car.id} car={car} search={range} />
      ))}
    </div>
  );
}

function FeaturedSkeleton() {
  return (
    <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 3 }, (_, i) => (
        <CarCardSkeleton key={i} />
      ))}
    </div>
  );
}
