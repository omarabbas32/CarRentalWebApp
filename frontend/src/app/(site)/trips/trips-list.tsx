"use client";

import Link from "next/link";
import { BookingRow } from "@/components/bookings/booking-row";
import { ErrorState } from "@/components/error-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/components/providers/auth-provider";
import { getBookings } from "@/lib/api/bookings";
import { TRIP_TABS } from "@/lib/bookings";
import { searchHref } from "@/lib/search-params";
import { useAsync } from "@/lib/use-async";
import type { BookingDto } from "@/types/api";

/**
 * One query, three tabs.
 *
 * `GET /api/bookings?renterId={me}` returns everything; the split into
 * Upcoming / Active / Past is client-side. Fetching three times — once per
 * status — would triple the requests to show the same rows.
 *
 * The tab definitions live in lib/bookings.ts so the partition can be checked
 * for completeness by `npm run verify:logic` — a status falling through all
 * three tabs would make a booking silently vanish from the user's list.
 */
export function TripsList() {
  const { session } = useAuth();
  const renterId = session?.userId;

  const state = useAsync(
    () => getBookings({ renterId, pageSize: 100 }),
    [renterId],
  );

  if (state.status === "loading") return <ListSkeleton />;

  if (state.status === "error") {
    return <ErrorState
        title="We couldn't load your trips"
        message={state.error.message}
        error={state.error}
        retry={state.reload}
      />;
  }

  const all = state.data.bookings;

  return (
    <Tabs defaultValue="upcoming" className="space-y-6">
      <TabsList>
        {TRIP_TABS.map((tab) => {
          const count = all.filter((b) => tab.statuses.includes(b.status)).length;
          return (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
              {count > 0 && (
                <span className="ml-1.5 tabular-nums text-muted-foreground">{count}</span>
              )}
            </TabsTrigger>
          );
        })}
      </TabsList>

      {TRIP_TABS.map((tab) => (
        <TabsContent key={tab.value} value={tab.value}>
          <TripGroup
            bookings={all.filter((b) => tab.statuses.includes(b.status))}
            empty={tab.empty}
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}

/**
 * The invitation to book sits **inside** the list, not in place of it — so two
 * upcoming trips and "find another" can coexist. An empty tab is not an empty
 * page.
 */
function TripGroup({ bookings, empty }: { bookings: BookingDto[]; empty: string }) {
  return (
    <div className="space-y-4">
      {bookings.length > 0 && (
        <ul className="space-y-3">
          {bookings.map((booking) => (
            <BookingRow key={booking.id} booking={booking} />
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-dashed px-5 py-4">
        <p className="text-muted-foreground">
          {bookings.length === 0 ? empty : "Going somewhere else?"}
        </p>
        <Button variant="outline" size="sm" asChild className="ml-auto">
          <Link href={searchHref({})}>Find a car</Link>
        </Button>
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-9 w-64" />
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-20 w-full" />
      ))}
      <span className="sr-only">Loading your trips</span>
    </div>
  );
}
