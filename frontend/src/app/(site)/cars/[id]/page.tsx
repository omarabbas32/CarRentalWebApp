import type { Metadata } from "next";
import { Check, Gauge, Star, X } from "lucide-react";
import { BookingPanel } from "@/components/cars/booking-panel";
import { CarGallery } from "@/components/cars/car-gallery";
import { ErrorState } from "@/components/error-state";
import { Separator } from "@/components/ui/separator";
import { getCar, searchCars } from "@/lib/api/cars";
import { ApiError } from "@/lib/api/errors";
import {
  CAR_FEATURES,
  carCategoryLabel,
  fuelTypeLabel,
  transmissionTypeLabel,
} from "@/lib/enums";
import { formatMoney } from "@/lib/pricing";
import { parseSearchParams, type RawSearchParams } from "@/lib/search-params";
import type { CarDto } from "@/types/api";

export const metadata: Metadata = {
  title: "Car details · CarRental",
};

/**
 * `params` and `searchParams` are both Promises in Next 16.
 *
 * The dates arrive from the card link so the quote matches what the user was
 * looking at; `parseSearchParams` falls back to the default range otherwise.
 */
export default async function CarDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<RawSearchParams>;
}) {
  const [{ id }, raw] = await Promise.all([params, searchParams]);
  const { start, end } = parseSearchParams(raw);

  let car: CarDto;
  try {
    car = await getCar(id);
  } catch (cause) {
    const error = cause instanceof ApiError ? cause : null;
    // A missing car throws a plain Exception server-side, so it arrives as a
    // 500 rather than a 404 — this page genuinely cannot tell "no such car"
    // from "server broke". The wording covers both, and `notFound()` is not
    // called because that would assert something unknown.
    return (
      <div className="mx-auto w-full max-w-7xl px-6 py-16 lg:px-12">
        <ErrorState
          title="We couldn't load this car"
          message={error?.message ?? "Something went wrong. Try again."}
          action={{ href: "/search", label: "Back to search" }}
        />
      </div>
    );
  }

  const images = await hydrateImages(car);

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-8 pb-28 md:pb-8 lg:px-12">
      <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_20rem] lg:gap-14">
        <div className="min-w-0 space-y-8">
          <CarGallery images={images} alt={`${car.make} ${car.model}`} />

          <header className="space-y-2">
            <h1 className="text-h1">
              {car.make} {car.model} {car.year}
            </h1>
            <p className="text-muted-foreground">
              {carCategoryLabel[car.category]} · {car.locationCity}, {car.locationState}
            </p>
            {car.totalReviews > 0 && (
              <p className="flex items-center gap-1.5 text-body tabular-nums">
                <Star className="size-4 fill-current text-primary" aria-hidden />
                {car.averageRating.toFixed(1)}
                <span className="text-muted-foreground">
                  ({car.totalReviews} review{car.totalReviews === 1 ? "" : "s"} ·{" "}
                  {car.totalTrips} trip{car.totalTrips === 1 ? "" : "s"})
                </span>
              </p>
            )}
          </header>

          <Separator />

          <section className="space-y-4">
            <h2 className="text-h2">Specs</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              <Spec label="Transmission" value={transmissionTypeLabel[car.transmission]} />
              <Spec label="Fuel" value={fuelTypeLabel[car.fuelType]} />
              <Spec label="Seats" value={String(car.seats)} />
              <Spec label="Doors" value={String(car.doors)} />
              <Spec label="Colour" value={car.color} />
              <Spec label="Odometer" value={`${car.mileage.toLocaleString()} km`} />
            </dl>
          </section>

          <Separator />

          <section className="space-y-4">
            <h2 className="text-h2">Features</h2>
            {/* Absent features are struck through rather than hidden —
                absence is information when comparing two cars. */}
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {CAR_FEATURES.map((feature) => {
                const has = car[feature.field];
                return (
                  <li
                    key={feature.key}
                    className={
                      has
                        ? "flex items-center gap-2 text-body"
                        : "flex items-center gap-2 text-body text-muted-foreground line-through decoration-1"
                    }
                  >
                    {has ? (
                      <Check className="size-4 shrink-0 text-primary" aria-hidden />
                    ) : (
                      <X className="size-4 shrink-0 opacity-50" aria-hidden />
                    )}
                    {feature.label}
                    <span className="sr-only">
                      {has ? " — included" : " — not available"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          <Separator />

          <section className="space-y-4">
            <h2 className="text-h2">Mileage &amp; deposit</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              <Spec
                label="Daily mileage"
                value={
                  car.dailyMileageLimit > 0
                    ? `${car.dailyMileageLimit.toLocaleString()} km`
                    : "Unlimited"
                }
              />
              <Spec
                label="Extra mileage"
                value={
                  car.extraMileageCharge > 0
                    ? `${formatMoney(car.extraMileageCharge)} / km`
                    : "—"
                }
              />
              <Spec label="Security deposit" value={formatMoney(car.securityDeposit)} />
            </dl>
            <p className="flex items-start gap-2 text-caption text-muted-foreground">
              <Gauge className="mt-0.5 size-4 shrink-0" aria-hidden />
              The deposit is held with the booking total and returned when the trip
              ends.
            </p>
          </section>
        </div>

        <BookingPanel car={car} start={start} end={end} />
      </div>
    </div>
  );
}

/**
 * **API gap.** `GET /api/cars/{id}` returns a `CarDto` with no images — only
 * `/api/cars/search` returns `imageUrls`. Until `CarDto` carries them, the page
 * pairs the car fetch with a search call and picks this car out of the results.
 *
 * It is best-effort: search only returns cars that are active, available and
 * unbooked for the range, so a car that is listed but unavailable will simply
 * show the placeholder. Delete this the moment the DTO is extended — see
 * phases/README.md § known defects.
 */
async function hydrateImages(car: CarDto): Promise<string[]> {
  try {
    const range = { start: new Date(), end: new Date(Date.now() + 86_400_000) };
    const result = await searchCars({
      city: car.locationCity,
      start: range.start,
      end: range.end,
      pageSize: 100,
    });
    return result.cars.find((c) => c.id === car.id)?.imageUrls ?? [];
  } catch {
    return [];
  }
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-label uppercase text-muted-foreground">{label}</dt>
      <dd className="text-body tabular-nums">{value}</dd>
    </div>
  );
}
