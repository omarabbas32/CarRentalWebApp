"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle, BadgeCheck, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/providers/auth-provider";
import { createBooking } from "@/lib/api/bookings";
import { getUser } from "@/lib/api/users";
import { ApiError } from "@/lib/api/errors";
import { useAsync } from "@/lib/use-async";
import { formatMoney, priceBreakdown } from "@/lib/pricing";
import { searchHref } from "@/lib/search-params";
import { carCategoryLabel } from "@/lib/enums";
import type { CarDto } from "@/types/api";

export function Checkout({
  car,
  start,
  end,
}: {
  car: CarDto;
  start: Date;
  end: Date;
}) {
  const { session } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<ApiError | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const price = priceBreakdown(car.pricePerDay, car.securityDeposit, start, end);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      // Only the car and the dates. `renterId` comes from the JWT, and the
      // client never sends money — the server prices and snapshots it.
      const bookingId = await createBooking(car.id, start, end);
      router.replace(`/bookings/${bookingId}`);
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause
          : new ApiError({
              status: 0,
              operation: "createBooking",
              message: "Something went wrong. Try again.",
            }),
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_20rem] lg:gap-14">
      <div className="min-w-0 space-y-8">
        <header className="space-y-2">
          <h1 className="text-h1">Review your request</h1>
          <p className="text-muted-foreground">
            {car.make} {car.model} · {car.locationCity}
          </p>
        </header>

        {error && <BookingError error={error} />}

        <section className="space-y-4">
          <h2 className="text-h2">Your dates</h2>
          <dl className="grid grid-cols-2 gap-4 rounded-xl border p-4">
            <div>
              <dt className="text-label uppercase text-muted-foreground">Pick-up</dt>
              <dd className="text-body tabular-nums">{start.toLocaleDateString()}</dd>
            </div>
            <div>
              <dt className="text-label uppercase text-muted-foreground">Return</dt>
              <dd className="text-body tabular-nums">{end.toLocaleDateString()}</dd>
            </div>
          </dl>
          <p className="text-caption text-muted-foreground">
            Need different dates?{" "}
            <Link
              href={`/cars/${car.id}`}
              className="text-foreground underline underline-offset-4"
            >
              Go back to the car
            </Link>
            .
          </p>
        </section>

        <Separator />

        <section className="space-y-4">
          <h2 className="text-h2">The car</h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
            <Spec label="Vehicle" value={`${car.make} ${car.model} ${car.year}`} />
            <Spec label="Category" value={carCategoryLabel[car.category]} />
            <Spec label="Colour" value={car.color} />
            <Spec label="Pick-up" value={car.locationAddress} />
            <Spec label="City" value={`${car.locationCity}, ${car.locationState}`} />
            <Spec label="Seats" value={String(car.seats)} />
          </dl>
        </section>

        <Separator />

        {session && <VerificationNudge userId={session.userId} />}

        <Separator />

        <section className="space-y-2">
          <h2 className="text-h2">Cancelling</h2>
          <p className="max-w-prose text-muted-foreground">
            You can cancel from your trips at any point before the trip starts.
            {/* No refund figure is stated: the backend never computes one, and
                promising a number it cannot honour would be a lie about money. */}
          </p>
        </section>
      </div>

      <aside className="md:block">
        <form onSubmit={handleSubmit} className="sticky top-24 space-y-4 rounded-xl border p-5">
          <h2 className="text-h2">Price</h2>

          <dl className="space-y-2 text-body">
            <Row
              label={`${formatMoney(car.pricePerDay)} × ${price.totalDays} day${price.totalDays === 1 ? "" : "s"}`}
              value={formatMoney(price.subtotal)}
            />
            <Row label="Service fee" value={formatMoney(price.serviceFee)} />
            <Row label="Tax" value={formatMoney(price.taxAmount)} />
            <Row label="Security deposit" value={formatMoney(price.securityDeposit)} />
          </dl>

          <Separator />

          <dl>
            <Row label="Total" value={formatMoney(price.total)} emphasis />
          </dl>

          {/* "Request", not "Book now" — the booking lands in Pending and the
              owner has to accept it. */}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Sending your request…" : "Request this car"}
          </Button>

          <p className="text-caption text-muted-foreground">
            You won&apos;t be charged yet. The deposit is returned when the trip ends.
          </p>
        </form>
      </aside>
    </div>
  );
}

/**
 * A rejected booking is almost always "those dates just went", and the only
 * useful next step is a different car — so the error carries a route back to
 * search rather than leaving the user on a dead page.
 *
 * This is not rare. Search excludes only `Confirmed` and `InProgress` bookings
 * while create refuses anything but `Cancelled`, so a car with a merely
 * *pending* booking is offered and then refused. See phases/README.md.
 */
function BookingError({ error }: { error: ApiError }) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="size-4" aria-hidden />
      <AlertTitle>We couldn&apos;t hold that car</AlertTitle>
      <AlertDescription className="flex flex-col items-start gap-3">
        <span>{error.message}</span>
        <Button variant="outline" size="sm" asChild>
          <Link href={searchHref({})}>Find another car</Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}

/**
 * A **nudge, not a gate**.
 *
 * The backend does not require verified documents to book, so blocking here
 * would misrepresent the system and stop a booking the server would accept.
 *
 * `UserDto` exposes verification as two booleans, not statuses — a renter can
 * see verified-or-not, but not pending-versus-rejected.
 */
function VerificationNudge({ userId }: { userId: string }) {
  const state = useAsync(() => getUser(userId), [userId]);

  if (state.status === "loading") {
    return <Skeleton className="h-20 w-full" />;
  }

  // If the profile cannot be read, say nothing rather than implying a problem
  // with the user's documents.
  if (state.status === "error") return null;

  const { identityVerified, driverLicenseVerified } = state.data;
  if (identityVerified && driverLicenseVerified) {
    return (
      <section className="flex items-start gap-3 rounded-xl border p-4">
        <BadgeCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        <div>
          <p className="text-h3">You&apos;re verified</p>
          <p className="text-caption text-muted-foreground">
            Your ID and licence are on file.
          </p>
        </div>
      </section>
    );
  }

  const missing = [
    !identityVerified && "a government ID",
    !driverLicenseVerified && "your driving licence",
  ].filter(Boolean);

  return (
    <section className="flex items-start gap-3 rounded-xl border p-4">
      <ShieldAlert className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
      <div className="space-y-2">
        <p className="text-h3">Add {missing.join(" and ")}</p>
        <p className="text-caption text-muted-foreground">
          You can still request this car now. Owners are more likely to accept once
          your documents are verified.
        </p>
        <Button variant="outline" size="sm" asChild>
          <Link href="/account/verification">Upload documents</Link>
        </Button>
      </div>
    </section>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-label uppercase text-muted-foreground">{label}</dt>
      <dd className="text-body">{value}</dd>
    </div>
  );
}

function Row({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={emphasis ? "text-h3" : "text-muted-foreground"}>{label}</dt>
      <dd className={emphasis ? "text-h3 tabular-nums" : "tabular-nums"}>{value}</dd>
    </div>
  );
}
