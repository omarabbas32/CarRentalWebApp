"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Car, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/error-state";
import { useAuth } from "@/components/providers/auth-provider";
import { getBookings } from "@/lib/api/bookings";
import { deleteCar, getCars } from "@/lib/api/cars";
import { ApiError } from "@/lib/api/errors";
import { cloudinaryThumb, IMAGE_WIDTHS } from "@/lib/cloudinary";
import { carCategoryLabel, transmissionTypeLabel } from "@/lib/enums";
import { carIdsWithBookings } from "@/lib/owner";
import { formatMoney } from "@/lib/pricing";
import { useAsync } from "@/lib/use-async";
import type { CarDto } from "@/types/api";

export function OwnerListings() {
  const { session } = useAuth();
  const ownerId = session?.userId;

  // The bookings call is not for display. It is how the page knows which cars
  // the server will refuse to delete before an owner clicks — see
  // `carIdsWithBookings`. `getCars` now carries images, so there is no second
  // hydration call any more.
  const state = useAsync(
    () => Promise.all([getCars(), getBookings({ ownerId, pageSize: 100 })]),
    [ownerId],
  );

  if (state.status === "loading") return <ListingsSkeleton />;

  if (state.status === "error") {
    return (
      <div className="p-4 lg:p-6">
        <ErrorState
          title="We couldn't load your listings"
          message={state.error.message}
          error={state.error}
          retry={state.reload}
        />
      </div>
    );
  }

  const [allCars, bookingsResult] = state.data;
  const undeletable = carIdsWithBookings(bookingsResult.bookings);

  /**
   * **API gap.** There is no `GET /api/cars?ownerId=`, and `GET /api/cars` is
   * unpaginated and unfiltered — it returns *every* car on the platform. The
   * owner's own are picked out here, client-side.
   *
   * Fine at demo scale and nowhere near it beyond: the response grows with the
   * whole catalogue while this page shows one owner's handful. It is the first
   * thing to fix on the backend list — see phases/phase-6-owner.md § task 2.
   */
  const cars = allCars.filter((car) => car.ownerId === ownerId);

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-h1">My listings</h1>
          <p className="text-caption tabular-nums text-muted-foreground">
            {cars.length === 0
              ? "Nothing listed yet"
              : `${cars.length} car${cars.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <Button asChild>
          <Link href="/owner/cars/new">
            <Plus className="size-4" aria-hidden />
            List a car
          </Link>
        </Button>
      </header>

      {cars.length === 0 ? (
        <EmptyListings />
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {cars.map((car) => (
            <ListingCard
              key={car.id}
              car={car}
              hasBookings={undeletable.has(car.id)}
              onDeleted={state.reload}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function ListingCard({
  car,
  hasBookings,
  onDeleted,
}: {
  car: CarDto;
  hasBookings: boolean;
  onDeleted: () => void;
}) {
  // `images` arrives primary-first, so the cover is simply the first one.
  const cover = car.images[0]?.url;

  return (
    <li className="flex flex-col overflow-hidden rounded-xl border">
      <div className="relative aspect-[4/3] bg-muted">
        {cover ? (
          <Image
            src={cloudinaryThumb(cover, IMAGE_WIDTHS.cardThumb)}
            alt={`${car.make} ${car.model}`}
            fill
            sizes="(min-width: 1280px) 25vw, (min-width: 640px) 45vw, 100vw"
            className="object-cover"
          />
        ) : (
          <div
            className="flex size-full items-center justify-center bg-gradient-to-br from-primary/10 to-muted"
            aria-hidden
          >
            <span className="text-label uppercase text-muted-foreground">No photo</span>
          </div>
        )}

        <div className="absolute top-2 left-2 flex flex-wrap gap-1.5">
          <StateChip car={car} />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h2 className="text-h3">
          {car.year} {car.make} {car.model}
        </h2>

        <p className="flex items-center gap-1.5 text-caption text-muted-foreground">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          {car.locationCity}, {car.locationState}
        </p>

        <p className="text-caption text-muted-foreground">
          {carCategoryLabel[car.category]} · {transmissionTypeLabel[car.transmission]} ·{" "}
          {car.seats} seats
        </p>

        <p className="mt-auto pt-2">
          <span className="text-h2 tabular-nums">{formatMoney(car.pricePerDay)}</span>
          <span className="text-caption text-muted-foreground"> / day</span>
        </p>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" asChild className="flex-1">
            <Link href={`/owner/cars/${car.id}/edit`}>
              <Pencil className="size-4" aria-hidden />
              Edit
            </Link>
          </Button>
          <DeleteCarDialog car={car} hasBookings={hasBookings} onDeleted={onDeleted} />
        </div>

        {hasBookings && (
          <p className="text-caption text-muted-foreground">
            This car has bookings against it, so it can&apos;t be deleted. Un-list it
            on the edit page to take it out of search.
          </p>
        )}
      </div>
    </li>
  );
}

/**
 * `isActive` and `isAvailable` are separate flags and mean different things —
 * a listing can be live but blocked out for the week. Only the state that
 * needs explaining is shown; a car that is both active and available is the
 * unremarkable case and gets no chip.
 */
function StateChip({ car }: { car: CarDto }) {
  if (!car.isActive) {
    return (
      <span className="rounded-full bg-status-cancelled-bg px-2.5 py-1 text-caption font-medium text-status-cancelled">
        Not listed
      </span>
    );
  }
  if (!car.isAvailable) {
    return (
      <span className="rounded-full bg-status-pending-bg px-2.5 py-1 text-caption font-medium text-status-pending">
        Unavailable
      </span>
    );
  }
  return null;
}

/**
 * Delete is disabled — not hidden — for a car the database will refuse to
 * remove. Hiding it would leave an owner hunting for a control that used to be
 * there; the tooltip-free inline note on the card says why instead.
 */
function DeleteCarDialog({
  car,
  hasBookings,
  onDeleted,
}: {
  car: CarDto;
  hasBookings: boolean;
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleDelete() {
    if (submitting) return;
    setSubmitting(true);
    try {
      await deleteCar(car.id);
      toast.success(`${car.make} ${car.model} removed`);
      setOpen(false);
      onDeleted();
    } catch (cause) {
      toast.error(
        cause instanceof ApiError ? cause.message : "We couldn't remove this car.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={hasBookings}
        aria-label={`Remove ${car.make} ${car.model}`}
      >
        <Trash2 className="size-4" aria-hidden />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Remove the {car.make} {car.model}?
            </DialogTitle>
            <DialogDescription>
              It stops appearing in search straight away, and this can&apos;t be
              undone.
            </DialogDescription>
          </DialogHeader>

          <p className="text-caption text-muted-foreground">
            To pause a listing instead, turn off <strong>Listed</strong> on the edit
            page — that is reversible, and this is not.
          </p>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>
              Keep it
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting ? "Removing…" : "Remove listing"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function EmptyListings() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed px-6 py-16 text-center">
      <Car className="size-8 text-muted-foreground" aria-hidden />
      <div className="space-y-1">
        <h2 className="text-h2">No cars listed yet</h2>
        <p className="max-w-prose text-muted-foreground">
          Listing takes about five minutes. Have the VIN and the odometer reading to
          hand — both are on the car.
        </p>
      </div>
      <Button asChild>
        <Link href="/owner/cars/new">List your first car</Link>
      </Button>
    </div>
  );
}

function ListingsSkeleton() {
  return (
    <div className="space-y-6 p-4 lg:p-6">
      <Skeleton className="h-10 w-48" />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex flex-col overflow-hidden rounded-xl border">
            <Skeleton className="aspect-[4/3] rounded-none" />
            <div className="flex flex-col gap-2 p-4">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-3.5 w-1/2" />
              <Skeleton className="mt-2 h-6 w-24" />
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Loading your listings</span>
    </div>
  );
}
