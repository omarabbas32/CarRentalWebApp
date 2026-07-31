"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Car,
  CheckCircle2,
  Clock,
  Inbox,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BookingStatusBadge } from "@/components/bookings/booking-status-badge";
import { ErrorState } from "@/components/error-state";
import { useAuth } from "@/components/providers/auth-provider";
import { getBookings } from "@/lib/api/bookings";
import { formatMoney } from "@/lib/pricing";
import {
  buildAttentionList,
  inboxAction,
  ownerStats,
  renterLabel,
  todayTimeline,
  type AttentionItem,
  type AttentionKind,
  type TimelineEvent,
} from "@/lib/owner";
import { useAsync } from "@/lib/use-async";
import type { BookingDto } from "@/types/api";

/**
 * The whole dashboard from **one** request.
 *
 * There is no analytics endpoint, so every tile, every row and every time on
 * this page is derived client-side from `GET /api/bookings?ownerId={me}`. The
 * derivations live in lib/owner.ts so `verify:logic` can pin them.
 *
 * `pageSize: 100` is the honest ceiling of that approach: past it the numbers
 * would quietly describe only the first page. A real dashboard needs an
 * endpoint that aggregates server-side.
 */
export function OwnerDashboard() {
  const { session } = useAuth();
  const ownerId = session?.userId;

  // Fixed at mount rather than read on every render, so "today" cannot change
  // underneath a list mid-interaction. It is also never evaluated during SSR:
  // the guard above renders a skeleton until the session resolves.
  const [now] = useState(() => new Date());

  const state = useAsync(
    () => getBookings({ ownerId, pageSize: 100 }),
    [ownerId],
  );

  if (state.status === "loading") return <DashboardSkeleton />;

  if (state.status === "error") {
    return (
      <div className="p-4 lg:p-6">
        <ErrorState
          title="We couldn't load your dashboard"
          message={state.error.message}
          error={state.error}
          retry={state.reload}
        />
      </div>
    );
  }

  const bookings = state.data.bookings;
  const stats = ownerStats(bookings, now);
  const attention = buildAttentionList(bookings, now);
  const timeline = todayTimeline(bookings, now);

  return (
    <div className="space-y-8 p-4 lg:p-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-h1">
            {session?.firstName ? `Hello, ${session.firstName}` : "Dashboard"}
          </h1>
          <p className="text-muted-foreground">
            {now.toLocaleDateString(undefined, {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/owner/bookings">
            All bookings
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </Button>
      </header>

      <section aria-label="Summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="New requests"
          value={String(stats.newRequests)}
          Icon={Inbox}
          note="Awaiting a decision"
        />
        <StatTile
          label="Pick-ups today"
          value={String(stats.pickupsToday)}
          Icon={CalendarClock}
          note="Scheduled to go out"
        />
        <StatTile
          label="Trips under way"
          value={String(stats.tripsUnderWay)}
          Icon={Car}
          note="Cars currently out"
        />
        <StatTile
          label="Earnings"
          value={formatMoney(stats.estimatedEarnings)}
          Icon={Wallet}
          // Not a payout figure and not presented as one. The app holds no
          // payment records at all, and the total excludes the service fee,
          // tax and the deposit — none of which is the owner's money.
          note="Estimated, before fees"
        />
      </section>

      {bookings.length === 0 ? (
        <NoBookingsYet />
      ) : (
        <div className="grid gap-8 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <AttentionList items={attention} />
          <TodayTimeline events={timeline} />
        </div>
      )}
    </div>
  );
}

function StatTile({
  label,
  value,
  note,
  Icon,
}: {
  label: string;
  value: string;
  note: string;
  Icon: typeof Inbox;
}) {
  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" aria-hidden />
        <span className="text-label uppercase">{label}</span>
      </div>
      <p className="mt-2 text-h1 tabular-nums">{value}</p>
      <p className="text-caption text-muted-foreground">{note}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Needs your attention
 * ------------------------------------------------------------------ */

const ATTENTION_COPY: Record<
  AttentionKind,
  { title: string; tone: "urgent" | "normal" }
> = {
  "return-overdue": { title: "Return overdue", tone: "urgent" },
  "pickup-overdue": { title: "Pick-up missed", tone: "urgent" },
  "pickup-today": { title: "Pick-up today", tone: "normal" },
  "new-request": { title: "New request", tone: "normal" },
};

/**
 * Ordered by urgency, not by date — an overdue return outranks a request that
 * arrived more recently, because one is a car nobody has and the other is a
 * decision that can wait an hour.
 */
function AttentionList({ items }: { items: AttentionItem[] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-h2">Needs your attention</h2>

      {items.length === 0 ? (
        <div className="flex items-center gap-3 rounded-xl border border-dashed px-5 py-8">
          <CheckCircle2 className="size-5 shrink-0 text-muted-foreground" aria-hidden />
          <p className="text-muted-foreground">
            Nothing needs you right now. Everything is on schedule.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map(({ booking, kind, at }) => (
            <AttentionRow key={booking.id} booking={booking} kind={kind} at={at} />
          ))}
        </ul>
      )}
    </section>
  );
}

function AttentionRow({
  booking,
  kind,
  at,
}: {
  booking: BookingDto;
  kind: AttentionKind;
  at: Date;
}) {
  const { title, tone } = ATTENTION_COPY[kind];
  const action = inboxAction(booking.status);

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border p-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {tone === "urgent" && (
            <AlertTriangle className="size-4 shrink-0 text-status-cancelled" aria-hidden />
          )}
          <span className="text-h3">{title}</span>
        </div>
        <p className="mt-1 truncate text-muted-foreground">
          {booking.carYear} {booking.carMake} {booking.carModel} ·{" "}
          {renterLabel(booking.renterId)}
        </p>
        <p className="text-caption text-muted-foreground">
          {kind === "return-overdue" ? "Was due back " : "Due "}
          {at.toLocaleString(undefined, {
            day: "numeric",
            month: "short",
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
      </div>

      {action === "view" ? (
        <Button variant="outline" size="sm" asChild>
          <Link href="/owner/bookings">Open</Link>
        </Button>
      ) : (
        <Button size="sm" asChild>
          <Link href={`/owner/bookings/${booking.id}/inspection`}>
            {action === "start" ? "Start trip" : "End trip"}
          </Link>
        </Button>
      )}
    </li>
  );
}

/* ------------------------------------------------------------------ *
 * Today
 * ------------------------------------------------------------------ */

function TodayTimeline({ events }: { events: TimelineEvent[] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-h2">Today</h2>

      {events.length === 0 ? (
        <div className="flex items-center gap-3 rounded-xl border border-dashed px-5 py-8">
          <Clock className="size-5 shrink-0 text-muted-foreground" aria-hidden />
          <p className="text-muted-foreground">Nothing scheduled today.</p>
        </div>
      ) : (
        <ol className="space-y-1 rounded-xl border p-2">
          {events.map((event) => (
            <li
              key={`${event.booking.id}:${event.type}`}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5"
            >
              <time
                dateTime={event.at.toISOString()}
                className="w-16 shrink-0 text-caption tabular-nums text-muted-foreground"
              >
                {event.at.toLocaleTimeString(undefined, {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </time>

              <div className="min-w-0 flex-1">
                <p className="truncate">
                  <span className="font-medium">
                    {event.type === "pickup" ? "Hand over" : "Take back"}
                  </span>{" "}
                  {event.booking.carMake} {event.booking.carModel}
                </p>
                <p className="text-caption text-muted-foreground">
                  {renterLabel(event.booking.renterId)}
                </p>
              </div>

              {/* Done is read off the booking's own timestamps, not inferred
                  from the clock — a pick-up at 09:00 that nobody turned up for
                  is still outstanding at noon. */}
              {event.done ? (
                <CheckCircle2 className="size-4 shrink-0 text-status-completed" aria-hidden />
              ) : (
                <BookingStatusBadge status={event.booking.status} />
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function NoBookingsYet() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed px-6 py-16 text-center">
      <Car className="size-8 text-muted-foreground" aria-hidden />
      <div className="space-y-1">
        <h2 className="text-h2">No bookings yet</h2>
        <p className="max-w-prose text-muted-foreground">
          Once someone requests one of your cars it shows up here, along with what
          needs doing and when.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button asChild>
          <Link href="/owner/cars/new">List a car</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/owner/cars">My listings</Link>
        </Button>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8 p-4 lg:p-6">
      <Skeleton className="h-10 w-64" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
      <div className="grid gap-8 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
      <span className="sr-only">Loading your dashboard</span>
    </div>
  );
}
