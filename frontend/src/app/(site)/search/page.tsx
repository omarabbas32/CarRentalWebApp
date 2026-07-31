import type { Metadata } from "next";
import { Suspense } from "react";
import { CarCard, CarCardSkeleton } from "@/components/cars/car-card";
import { FilterRail, FilterSheet } from "@/components/search/filter-controls";
import { SearchEmptyState } from "@/components/search/empty-state";
import { SearchPagination } from "@/components/search/pagination";
import { SearchBar } from "@/components/search/search-bar";
import { ErrorState } from "@/components/error-state";
import { searchCars } from "@/lib/api/cars";
import { ApiError } from "@/lib/api/errors";
import { parseSearchParams, type RawSearchParams, type SearchState } from "@/lib/search-params";

export const metadata: Metadata = {
  title: "Find a car · CarRental",
};

/**
 * Rendered on the server: all the state is in the URL, so there is nothing to
 * hydrate before the first fetch can happen. That also keeps the results in the
 * initial HTML.
 *
 * `searchParams` is a Promise in Next 16 — it must be awaited.
 */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const raw = await searchParams;
  const state = parseSearchParams(raw);

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-8 lg:px-12">
      <SearchBar initial={state} className="mb-8" />

      <div className="flex gap-8">
        <FilterRail state={state} />

        <div className="min-w-0 flex-1 space-y-6">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-h1">
              {state.city ? `Cars in ${state.city}` : "Available cars"}
            </h1>
            <FilterSheet state={state} />
          </div>

          {/* Keyed on the query so switching pages or filters shows skeletons
              again rather than the previous page's results going stale. */}
          <Suspense key={JSON.stringify(raw)} fallback={<ResultsSkeleton />}>
            <Results state={state} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

async function Results({ state }: { state: SearchState }) {
  let result;
  try {
    result = await searchCars({
      city: state.city || undefined,
      start: state.start,
      end: state.end,
      minPrice: state.minPrice,
      maxPrice: state.maxPrice,
      category: state.category,
      features: state.features,
      minRating: state.minRating,
      pageNumber: state.page,
      pageSize: 20,
    });
  } catch (cause) {
    const error = cause instanceof ApiError ? cause : null;

    // A 400 here is the server rejecting the query itself — an inverted range
    // or an out-of-bounds rating. parseSearchParams corrects what it can, so
    // reaching this means something it cannot.
    return (
      <ErrorState
        title={error?.isValidation ? "That search isn't valid" : "We couldn't run that search"}
        message={error?.message ?? "Something went wrong. Try again."}
      />
    );
  }

  if (result.cars.length === 0) {
    return (
      <div className="grid gap-5">
        <SearchEmptyState state={state} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {result.cars.map((car) => (
          <CarCard key={car.id} car={car} search={state} />
        ))}
      </div>

      <SearchPagination
        state={state}
        totalPages={result.totalPages}
        totalCount={result.totalCount}
      />
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }, (_, i) => (
        <CarCardSkeleton key={i} />
      ))}
      <span className="sr-only">Loading results</span>
    </div>
  );
}
