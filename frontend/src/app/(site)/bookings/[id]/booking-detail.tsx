"use client";

import Link from "next/link";
import { BookingStatusBadge } from "@/components/bookings/booking-status-badge";
import { BookingTimeline } from "@/components/bookings/booking-timeline";
import { CancelBookingDialog } from "@/components/bookings/cancel-dialog";
import { BookingReviews } from "@/components/reviews/booking-reviews";
import { ErrorState } from "@/components/error-state";
import { MessageThread } from "@/components/messages/message-thread";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/providers/auth-provider";
import { getBooking } from "@/lib/api/bookings";
import { canCancelBooking, isBookingParticipant } from "@/lib/bookings";
import { BookingStatus } from "@/lib/enums";
import { breakdownFromBooking, formatMoney } from "@/lib/pricing";
import { useAsync } from "@/lib/use-async";

export function BookingDetail({ bookingId }: { bookingId: string }) {
  const { session } = useAuth();
  const state = useAsync(() => getBooking(bookingId), [bookingId]);

  if (state.status === "loading") return <DetailSkeleton />;

  if (state.status === "error") {
    return (
      <ErrorState
        title="We couldn't load this booking"
        message={state.error.message}
        error={state.error}
        retry={state.reload}
        action={{ href: "/trips", label: "Back to my trips" }}
      />
    );
  }

  const booking = state.data;

  const isParticipant = isBookingParticipant(booking, session);

  if (!isParticipant) {
    return (
      <ErrorState
        title="This booking isn't yours"
        message="You can only view trips you're part of."
        action={{ href: "/trips", label: "Back to my trips" }}
      />
    );
  }

  const price = breakdownFromBooking(booking);

  const canCancel = canCancelBooking(booking.status);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-h1">
            {booking.carMake} {booking.carModel} {booking.carYear}
          </h1>
          <p className="text-muted-foreground">
            {booking.carLocationCity}, {booking.carLocationState}
          </p>
        </div>
        <BookingStatusBadge status={booking.status} />
      </header>

      <BookingTimeline status={booking.status} />

      {booking.status === BookingStatus.Pending && (
        <p className="rounded-xl border border-dashed px-4 py-3 text-caption text-muted-foreground">
          Waiting for the owner to accept. You&apos;ll keep your place until they do.
        </p>
      )}

      <Separator />

      <section className="space-y-4">
        <h2 className="text-h2">Your trip</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
          <Spec label="Pick-up" value={formatDate(booking.startDate)} />
          <Spec label="Return" value={formatDate(booking.endDate)} />
          <Spec
            label="Length"
            value={`${booking.totalDays} day${booking.totalDays === 1 ? "" : "s"}`}
          />
          <Spec label="Booked" value={formatDate(booking.createdAt)} />
          {booking.actualPickupDateTime && (
            <Spec label="Collected" value={formatDate(booking.actualPickupDateTime)} />
          )}
          {booking.actualReturnDateTime && (
            <Spec label="Returned" value={formatDate(booking.actualReturnDateTime)} />
          )}
        </dl>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-h2">Receipt</h2>
        {/* Read back from the booking the server priced and snapshotted —
            never recomputed here. */}
        <dl className="space-y-2 rounded-xl border p-5">
          <Row
            label={`${formatMoney(booking.pricePerDay)} × ${booking.totalDays} day${booking.totalDays === 1 ? "" : "s"}`}
            value={formatMoney(price.subtotal)}
          />
          <Row label="Service fee" value={formatMoney(price.serviceFee)} />
          <Row label="Tax" value={formatMoney(price.taxAmount)} />
          <Row label="Security deposit" value={formatMoney(price.securityDeposit)} />
          {/* `extraMileageCharge` is always null: nothing copies the car's
              DailyMileageLimit onto the booking, so the overage branch is dead
              code server-side. Shown only if it ever becomes non-zero. */}
          {booking.extraMileageCharge != null && booking.extraMileageCharge > 0 && (
            <Row label="Extra mileage" value={formatMoney(booking.extraMileageCharge)} />
          )}
          <Separator className="my-2" />
          <Row label="Total" value={formatMoney(price.total)} emphasis />
        </dl>
      </section>

      {booking.status === BookingStatus.Cancelled && booking.cancellationReason && (
        <>
          <Separator />
          <section className="space-y-2">
            <h2 className="text-h2">Cancellation</h2>
            <p className="text-muted-foreground">
              {formatDate(booking.cancelledAt)} — &ldquo;{booking.cancellationReason}&rdquo;
            </p>
          </section>
        </>
      )}

      <Separator />

      <BookingReviews booking={booking} />

      <Separator />

      {/* The booking is the thread. There is no other way to reach this
          conversation, because a thread belongs to a booking. */}
      <MessageThread booking={booking} />

      {canCancel && (
        <>
          <Separator />
          <div className="flex flex-wrap items-center gap-4">
            <CancelBookingDialog bookingId={booking.id} onCancelled={state.reload} />
            <Link
              href="/trips"
              className="text-caption text-muted-foreground underline underline-offset-4"
            >
              Back to my trips
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-label uppercase text-muted-foreground">{label}</dt>
      <dd className="text-body tabular-nums">{value}</dd>
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

function DetailSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-9 w-72" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-48 w-full" />
      <span className="sr-only">Loading booking</span>
    </div>
  );
}
