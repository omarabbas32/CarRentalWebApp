import Image from "next/image";
import Link from "next/link";
import { Star, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cloudinaryThumb, IMAGE_WIDTHS } from "@/lib/cloudinary";
import { carCategoryLabel, transmissionTypeLabel } from "@/lib/enums";
import { formatMoney } from "@/lib/pricing";
import type { CarSearchResultDto } from "@/types/api";
import { toSearchQuery, type SearchState } from "@/lib/search-params";

/**
 * `CarSearchResultDto` carries `imageUrls`, so a card never needs a second
 * fetch. Only the search endpoint returns them — a card built from `CarDto`
 * would have no photo at all, which is why this takes the search DTO
 * specifically.
 */
export function CarCard({
  car,
  search,
}: {
  car: CarSearchResultDto;
  /** Carried into the detail link so the dates survive the click. */
  search: Pick<SearchState, "start" | "end">;
}) {
  const cover = car.imageUrls[0];
  const href = `/cars/${car.id}${toSearchQuery({ start: search.start, end: search.end })}`;

  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-xl border transition-shadow hover:shadow-md focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {cover ? (
          <Image
            src={cloudinaryThumb(cover, IMAGE_WIDTHS.cardThumb)}
            alt={`${car.make} ${car.model}`}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <PlaceholderPhoto />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-h3">
            {car.make} {car.model}
          </h3>
          {car.totalReviews > 0 && (
            <span className="flex shrink-0 items-center gap-1 text-caption tabular-nums">
              <Star className="size-3.5 fill-current text-primary" aria-hidden />
              {car.averageRating.toFixed(1)}
              <span className="text-muted-foreground">({car.totalReviews})</span>
            </span>
          )}
        </div>

        <p className="text-caption text-muted-foreground">
          {car.year} · {carCategoryLabel[car.category]} · {car.locationCity}
        </p>

        <p className="flex items-center gap-3 text-caption text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="size-3.5" aria-hidden />
            {car.seats} seats
          </span>
          <span>{transmissionTypeLabel[car.transmission]}</span>
        </p>

        <p className="mt-auto pt-2">
          <span className="text-h2 tabular-nums">{formatMoney(car.pricePerDay)}</span>
          <span className="text-caption text-muted-foreground"> / day</span>
        </p>
      </div>
    </Link>
  );
}

function PlaceholderPhoto() {
  return (
    <div
      className="flex size-full items-center justify-center bg-gradient-to-br from-primary/10 to-muted"
      aria-hidden
    >
      <span className="text-label uppercase text-muted-foreground">No photo yet</span>
    </div>
  );
}

/**
 * Holds the exact dimensions of a loaded card so the grid does not reflow when
 * results arrive.
 */
export function CarCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border">
      <Skeleton className="aspect-[4/3] rounded-none" />
      <div className="flex flex-col gap-2 p-4">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3.5 w-1/2" />
        <Skeleton className="h-3.5 w-2/3" />
        <Skeleton className="mt-2 h-6 w-24" />
      </div>
    </div>
  );
}
