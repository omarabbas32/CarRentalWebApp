import { Skeleton } from "@/components/ui/skeleton";

/**
 * Covers navigating between owner routes. Each page also renders its own
 * skeleton while its data loads — this one is for the gap before the page
 * component itself is on screen.
 */
export default function OwnerLoading() {
  return (
    <div className="space-y-6 p-4 lg:p-6">
      <Skeleton className="h-10 w-56" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
      <Skeleton className="h-64 w-full" />
      <span className="sr-only" role="status">
        Loading
      </span>
    </div>
  );
}
