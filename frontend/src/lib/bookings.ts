import { BookingStatus, UserRole } from "@/lib/enums";
import type { BookingDto } from "@/types/api";

/**
 * Booking rules that decide what the UI offers.
 *
 * These live here rather than inline in components so they can be exercised by
 * `npm run verify:logic`. Each one mirrors a guard in a specific handler, and
 * getting one wrong means rendering a control whose only outcome is a 500.
 */

/**
 * `CancelBookingCommandHandler` throws for a booking that is already
 * `Cancelled` ("Booking is already cancelled.") or is `Completed`
 * ("Completed bookings cannot be cancelled."). Both arrive as a generic 500.
 *
 * `Disputed` is *not* refused by the handler, so cancelling stays available —
 * matching the server rather than guessing at intent.
 */
export function canCancelBooking(status: BookingStatus): boolean {
  return status !== BookingStatus.Completed && status !== BookingStatus.Cancelled;
}

/**
 * `GET /api/bookings/{id}` has **no server-side authorization** — it returns
 * any booking by id. This is the only thing standing between one renter and
 * another's booking, and being client-side it is a courtesy, not a control.
 * The real fix belongs on the handler.
 */
export function isBookingParticipant(
  booking: Pick<BookingDto, "renterId" | "ownerId">,
  session: { userId: string; role: UserRole } | null,
): boolean {
  if (!session) return false;
  if (session.role === UserRole.Admin || session.role === UserRole.Staff) return true;
  return booking.renterId === session.userId || booking.ownerId === session.userId;
}

export type TripTab = {
  value: string;
  label: string;
  /** Widened to the enum deliberately: `as const` narrows these to literal
      unions, and `.includes(someBookingStatus)` then fails to typecheck. */
  statuses: readonly BookingStatus[];
  empty: string;
};

/**
 * The three tabs on `/trips`, from one query.
 *
 * Every `BookingStatus` appears in exactly one tab — a status that fell through
 * all three would make a booking vanish from the user's list with no
 * indication, which is why `verify:logic` checks the partition is total and
 * disjoint.
 */
export const TRIP_TABS: readonly TripTab[] = [
  {
    value: "upcoming",
    label: "Upcoming",
    statuses: [BookingStatus.Pending, BookingStatus.Confirmed],
    empty: "Nothing booked yet.",
  },
  {
    value: "active",
    label: "Active",
    statuses: [BookingStatus.InProgress],
    empty: "No trip under way.",
  },
  {
    value: "past",
    label: "Past",
    statuses: [BookingStatus.Completed, BookingStatus.Cancelled, BookingStatus.Disputed],
    empty: "No finished trips yet.",
  },
];
