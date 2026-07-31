import { Skeleton } from "@/components/ui/skeleton";

export default function TripsLoading() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8 lg:px-12">
      <Skeleton className="h-9 w-40" />
      <div className="mt-8 space-y-4">
        <Skeleton className="h-9 w-64" />
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
      <span className="sr-only" role="status">
        Loading your trips
      </span>
    </div>
  );
}
