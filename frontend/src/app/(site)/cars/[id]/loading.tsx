import { Skeleton } from "@/components/ui/skeleton";

/** Holds the detail page's two-column shape so the booking panel does not jump. */
export default function CarDetailLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-8 pb-28 md:pb-8 lg:px-12">
      <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_20rem] lg:gap-14">
        <div className="min-w-0 space-y-8">
          <Skeleton className="aspect-[16/10] w-full rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-9 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </div>
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
      <span className="sr-only" role="status">
        Loading this car
      </span>
    </div>
  );
}
