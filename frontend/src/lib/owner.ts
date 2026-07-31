import { BookingStatus } from "@/lib/enums";
import type { BookingDto } from "@/types/api";

/**
 * The owner workbench's derivations and rules.
 *
 * Two reasons this is a module rather than logic inline in components.
 *
 * There is **no analytics endpoint**. Every number on the dashboard is computed
 * here from the one `GET /api/bookings?ownerId={me}` call, so the arithmetic is
 * worth pinning in `npm run verify:logic` — a miscounted tile is a wrong
 * number presented with the same confidence as a right one.
 *
 * And the inbox renders exactly one action per booking status. Each mapping
 * mirrors a guard in a specific handler; offering a control the handler refuses
 * produces a guaranteed 500 with no detail the user can act on.
 */

/* ------------------------------------------------------------------ *
 * Inbox actions
 * ------------------------------------------------------------------ */

export type InboxAction = "start" | "end" | "view";

/**
 * `StartTripCommandHandler` accepts `Confirmed` **or** `Pending` — which is why
 * Start trip is live on a pending row despite nothing having accepted it.
 * `EndTripCommandHandler` accepts `InProgress` alone. Everything else is
 * read-only.
 *
 * `Disputed` gets `view`: no handler moves it anywhere, so every button would
 * be a dead end.
 */
export function inboxAction(status: BookingStatus): InboxAction {
  switch (status) {
    case BookingStatus.Pending:
    case BookingStatus.Confirmed:
      return "start";
    case BookingStatus.InProgress:
      return "end";
    case BookingStatus.Completed:
    case BookingStatus.Cancelled:
    case BookingStatus.Disputed:
      return "view";
  }
}

/**
 * Shown under the disabled Accept button.
 *
 * The README documents `Pending → Confirmed` as "owner accepts", but no
 * endpoint implements it. The control stays on screen and disabled rather than
 * being dropped: hiding it would make the gap invisible to whoever builds the
 * endpoint, and would leave an owner wondering why a request they never
 * accepted can be started.
 */
export const ACCEPT_UNAVAILABLE =
  "Accepting isn't wired up yet — no endpoint moves a booking from pending to confirmed. Starting the trip works regardless.";

export type InboxTab = {
  value: string;
  label: string;
  /** Widened to the enum for the same reason as `TRIP_TABS` in lib/bookings.ts. */
  statuses: readonly BookingStatus[];
  empty: string;
};

/**
 * Every `BookingStatus` appears in exactly one tab. A status falling through
 * all four would hide a booking from the owner entirely — `verify:logic`
 * checks the partition is total and disjoint.
 */
export const INBOX_TABS: readonly InboxTab[] = [
  {
    value: "requests",
    label: "Requests",
    statuses: [BookingStatus.Pending],
    empty: "No new requests.",
  },
  {
    value: "upcoming",
    label: "Upcoming",
    statuses: [BookingStatus.Confirmed],
    empty: "Nothing confirmed yet.",
  },
  {
    value: "underway",
    label: "Under way",
    statuses: [BookingStatus.InProgress],
    empty: "No car is out right now.",
  },
  {
    value: "finished",
    label: "Finished",
    statuses: [BookingStatus.Completed, BookingStatus.Cancelled, BookingStatus.Disputed],
    empty: "No finished trips yet.",
  },
];

/**
 * `BookingDto` carries `renterId` and no name.
 *
 * The alternative is a `GET /api/users/{id}` per row — an N+1 on a table that
 * exists to be scanned quickly. A truncated id is honest about what the API
 * returns; a name would be worth having, and belongs on the DTO.
 */
export function renterLabel(renterId: string): string {
  return `Renter ${renterId.slice(0, 8)}`;
}

/* ------------------------------------------------------------------ *
 * Listings
 * ------------------------------------------------------------------ */

/**
 * Which cars can never be deleted.
 *
 * `BookingConfiguration` maps `Booking → Car` with
 * `OnDelete(DeleteBehavior.Restrict)`, and `DeleteCarCommandHandler` checks
 * only ownership before calling `Remove`. So a car with **any** booking row
 * against it — completed and cancelled ones included — fails on the foreign
 * key inside `SaveChangesAsync`. That surfaces as a `DbUpdateException`, which
 * `ExceptionHandlingMiddleware` turns into a generic 500 saying nothing.
 *
 * The owner would click Remove, wait, and be told "We couldn't remove this
 * car" with no reason and no way forward. Knowing which cars are affected
 * ahead of time is what lets the UI explain it instead.
 */
export function carIdsWithBookings(bookings: readonly BookingDto[]): Set<string> {
  return new Set(bookings.map((booking) => booking.carId));
}

/* ------------------------------------------------------------------ *
 * Dates
 * ------------------------------------------------------------------ */

/** Local-day comparison — the owner's day, not UTC's. */
export function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/* ------------------------------------------------------------------ *
 * Needs your attention
 * ------------------------------------------------------------------ */

export type AttentionKind =
  | "return-overdue"
  | "pickup-overdue"
  | "pickup-today"
  | "new-request";

/**
 * Urgency order, most urgent first. DESIGN.md §4.9 names three kinds; the
 * fourth — a pick-up whose date has passed and which was never started — is
 * added because without it a `Confirmed` booking that nobody collected
 * disappears from the list entirely once its day is over.
 */
export const ATTENTION_ORDER: readonly AttentionKind[] = [
  "return-overdue",
  "pickup-overdue",
  "pickup-today",
  "new-request",
];

export type AttentionItem = {
  booking: BookingDto;
  kind: AttentionKind;
  /** The instant the row is sorted by within its group. */
  at: Date;
};

/**
 * A booking lands in **one** group — the most urgent it qualifies for. Listing
 * it twice would inflate the count and make the same job look like two.
 */
export function classifyAttention(
  booking: BookingDto,
  now: Date,
): AttentionKind | null {
  const start = new Date(booking.startDate);
  const end = new Date(booking.endDate);

  if (booking.status === BookingStatus.InProgress) {
    return end < now ? "return-overdue" : null;
  }

  if (
    booking.status === BookingStatus.Pending ||
    booking.status === BookingStatus.Confirmed
  ) {
    if (isSameLocalDay(start, now)) return "pickup-today";
    if (start < startOfLocalDay(now)) return "pickup-overdue";
    // A confirmed booking in the future needs nothing from the owner yet; a
    // pending one still needs a decision.
    return booking.status === BookingStatus.Pending ? "new-request" : null;
  }

  return null;
}

export function buildAttentionList(
  bookings: readonly BookingDto[],
  now: Date,
): AttentionItem[] {
  const items: AttentionItem[] = [];

  for (const booking of bookings) {
    const kind = classifyAttention(booking, now);
    if (!kind) continue;
    items.push({
      booking,
      kind,
      // Overdue returns sort by how late they are; everything else by when it
      // is due to happen.
      at: new Date(kind === "return-overdue" ? booking.endDate : booking.startDate),
    });
  }

  return items.sort((a, b) => {
    const rank = ATTENTION_ORDER.indexOf(a.kind) - ATTENTION_ORDER.indexOf(b.kind);
    return rank !== 0 ? rank : a.at.getTime() - b.at.getTime();
  });
}

/* ------------------------------------------------------------------ *
 * Stat tiles
 * ------------------------------------------------------------------ */

export type OwnerStats = {
  /** `Pending` — waiting on the owner, in as much as anything can be. */
  newRequests: number;
  /** `InProgress` — cars currently out. */
  tripsUnderWay: number;
  /** Pick-ups scheduled for today, in any pre-trip status. */
  pickupsToday: number;
  /**
   * Sum of `subTotal` over completed trips.
   *
   * **`subTotal`, not `totalAmount`.** The total includes the platform's 10%
   * service fee, 5% tax and a security deposit the renter gets back — none of
   * which is the owner's money. There are no payment records anywhere in this
   * system, so even this is an estimate of what was billed, not of what was
   * paid out, which is why the tile says so.
   */
  estimatedEarnings: number;
};

export function ownerStats(bookings: readonly BookingDto[], now: Date): OwnerStats {
  let newRequests = 0;
  let tripsUnderWay = 0;
  let pickupsToday = 0;
  let estimatedEarnings = 0;

  for (const booking of bookings) {
    if (booking.status === BookingStatus.Pending) newRequests++;
    if (booking.status === BookingStatus.InProgress) tripsUnderWay++;
    if (booking.status === BookingStatus.Completed) estimatedEarnings += booking.subTotal;

    const startsToday = isSameLocalDay(new Date(booking.startDate), now);
    const preTrip =
      booking.status === BookingStatus.Pending ||
      booking.status === BookingStatus.Confirmed;
    if (startsToday && preTrip) pickupsToday++;
  }

  return { newRequests, tripsUnderWay, pickupsToday, estimatedEarnings };
}

/* ------------------------------------------------------------------ *
 * Today
 * ------------------------------------------------------------------ */

export type TimelineEvent = {
  booking: BookingDto;
  type: "pickup" | "return";
  at: Date;
  /** Already handed over or already taken back. */
  done: boolean;
};

/**
 * Everything happening today, in clock order — both ends of a same-day rental
 * appear as two separate events, because they are two separate jobs.
 *
 * Cancelled bookings are excluded: there is nothing to turn up for.
 */
export function todayTimeline(
  bookings: readonly BookingDto[],
  now: Date,
): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  for (const booking of bookings) {
    if (booking.status === BookingStatus.Cancelled) continue;

    const start = new Date(booking.startDate);
    const end = new Date(booking.endDate);

    if (isSameLocalDay(start, now)) {
      events.push({
        booking,
        type: "pickup",
        at: start,
        done: booking.actualPickupDateTime !== null,
      });
    }
    if (isSameLocalDay(end, now)) {
      events.push({
        booking,
        type: "return",
        at: end,
        done: booking.actualReturnDateTime !== null,
      });
    }
  }

  return events.sort((a, b) => a.at.getTime() - b.at.getTime());
}
