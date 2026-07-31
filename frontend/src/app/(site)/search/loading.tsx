import { CarCardSkeleton } from "@/components/cars/car-card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shown while navigating **to** `/search`. The `Suspense` boundary inside the
 * page covers re-running the query when filters change; this covers arriving.
 *
 * Skeletons rather than a spinner, holding the final dimensions, so the grid
 * does not jump when results land.
 */
export default function SearchLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-8 lg:px-12">
      <Skeleton className="mb-8 h-16 w-full rounded-xl" />

      <div className="flex gap-8">
        <div className="hidden w-64 shrink-0 space-y-6 lg:block">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>

        <div className="min-w-0 flex-1 space-y-6">
          <Skeleton className="h-9 w-56" />
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <CarCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>

      <span className="sr-only" role="status">
        Loading cars
      </span>
    </div>
  );
}
