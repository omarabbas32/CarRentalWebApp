"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarX2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingStatusBadge } from "@/components/bookings/booking-status-badge";
import { ErrorState } from "@/components/error-state";
import { useAuth } from "@/components/providers/auth-provider";
import { getBookings } from "@/lib/api/bookings";
import { BookingStatus } from "@/lib/enums";
import {
  ACCEPT_UNAVAILABLE,
  inboxAction,
  INBOX_TABS,
  renterLabel,
  type InboxAction,
} from "@/lib/owner";
import { formatMoney } from "@/lib/pricing";
import { useAsync } from "@/lib/use-async";
import { cn } from "@/lib/utils";
import type { BookingDto } from "@/types/api";

/**
 * One query, four tabs, and exactly one action per row.
 *
 * `GET /api/bookings?ownerId={me}` returns everything; splitting by status
 * client-side avoids four requests for the same rows. The tab definitions live
 * in lib/owner.ts so `verify:logic` can check the partition is total — a
 * status matching no tab would hide a booking from the owner completely.
 */
export function BookingInbox() {
  const { session } = useAuth();
  const ownerId = session?.userId;
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const state = useAsync(
    () => getBookings({ ownerId, pageSize: 100 }),
    [ownerId],
  );

  if (state.status === "loading") return <InboxSkeleton />;

  if (state.status === "error") {
    return (
      <div className="p-4 lg:p-6">
        <ErrorState
          title="We couldn't load your bookings"
          message={state.error.message}
          error={state.error}
          retry={state.reload}
        />
      </div>
    );
  }

  const all = state.data.bookings;
  const selected = all.find((booking) => booking.id === selectedId) ?? null;

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <header>
        <h1 className="text-h1">Bookings</h1>
        <p className="text-caption tabular-nums text-muted-foreground">
          {all.length} in total
        </p>
      </header>

      <Tabs defaultValue={INBOX_TABS[0].value} className="space-y-5">
        <TabsList>
          {INBOX_TABS.map((tab) => {
            const count = all.filter((b) => tab.statuses.includes(b.status)).length;
            return (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
                {count > 0 && (
                  <span className="ml-1.5 tabular-nums text-muted-foreground">
                    {count}
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {INBOX_TABS.map((tab) => {
          const rows = all.filter((b) => tab.statuses.includes(b.status));

          return (
            <TabsContent key={tab.value} value={tab.value}>
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
                <div className="min-w-0">
                  {rows.length === 0 ? (
                    <div className="flex items-center gap-3 rounded-xl border border-dashed px-5 py-12">
                      <CalendarX2
                        className="size-5 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                      <p className="text-muted-foreground">{tab.empty}</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Car</TableHead>
                            <TableHead>Renter</TableHead>
                            <TableHead>Dates</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rows.map((booking) => (
                            <BookingRow
                              key={booking.id}
                              booking={booking}
                              selected={booking.id === selectedId}
                              onSelect={() => setSelectedId(booking.id)}
                            />
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>

                <DetailPanel booking={selected} />
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

function BookingRow({
  booking,
  selected,
  onSelect,
}: {
  booking: BookingDto;
  selected: boolean;
  onSelect: () => void;
}) {
  const action = inboxAction(booking.status);

  return (
    <TableRow
      onClick={onSelect}
      aria-selected={selected}
      className={cn("cursor-pointer", selected && "bg-accent")}
    >
      <TableCell>
        {/* The row is clickable for the mouse, but selection also needs to be
            reachable by keyboard — a `tr` with an onClick is not. */}
        <button
          type="button"
          onClick={onSelect}
          className="text-left focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
        >
          <span className="block font-medium">
            {booking.carMake} {booking.carModel}
          </span>
          <span className="block text-caption text-muted-foreground">
            {booking.carYear} · {booking.carLocationCity}
          </span>
        </button>
      </TableCell>

      {/* `BookingDto` has `renterId` and no name. Fetching one user per row
          would be an N+1 on a table built to be scanned. */}
      <TableCell className="text-muted-foreground">
        {renterLabel(booking.renterId)}
      </TableCell>

      <TableCell className="whitespace-nowrap">
        <div>{formatDate(booking.startDate)}</div>
        <div className="text-caption text-muted-foreground">
          to {formatDate(booking.endDate)}
        </div>
      </TableCell>

      <TableCell className="text-right tabular-nums">
        {formatMoney(booking.totalAmount)}
      </TableCell>

      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          <BookingStatusBadge status={booking.status} />
          <RowAction booking={booking} action={action} />
        </div>
      </TableCell>
    </TableRow>
  );
}

/**
 * Exactly one control, chosen by status. A button whose handler would refuse
 * the booking is never rendered — the refusal comes back as a bare 500 with no
 * detail, so the only way to be helpful is not to offer it.
 */
function RowAction({ booking, action }: { booking: BookingDto; action: InboxAction }) {
  if (action === "view") return null;

  return (
    <Button size="sm" asChild onClick={(e) => e.stopPropagation()}>
      <Link href={`/owner/bookings/${booking.id}/inspection`}>
        {action === "start" ? "Start trip" : "End trip"}
      </Link>
    </Button>
  );
}

function DetailPanel({ booking }: { booking: BookingDto | null }) {
  if (!booking) {
    return (
      <aside className="hidden self-start rounded-xl border border-dashed p-5 xl:block">
        <p className="text-muted-foreground">Select a booking to see its detail.</p>
      </aside>
    );
  }

  const action = inboxAction(booking.status);

  return (
    <aside className="space-y-5 self-start rounded-xl border p-5">
      <div className="space-y-1">
        <h2 className="text-h2">
          {booking.carMake} {booking.carModel}
        </h2>
        <BookingStatusBadge status={booking.status} />
      </div>

      <Separator />

      <dl className="space-y-3">
        <Detail label="Renter" value={renterLabel(booking.renterId)} />
        <Detail label="From" value={formatDateTime(booking.startDate)} />
        <Detail label="To" value={formatDateTime(booking.endDate)} />
        <Detail label="Days" value={String(booking.totalDays)} />
        {booking.actualPickupDateTime && (
          <Detail
            label="Picked up"
            value={formatDateTime(booking.actualPickupDateTime)}
          />
        )}
        {booking.actualReturnDateTime && (
          <Detail
            label="Returned"
            value={formatDateTime(booking.actualReturnDateTime)}
          />
        )}
        {booking.startMileage !== null && (
          <Detail
            label="Odometer out"
            value={`${booking.startMileage.toLocaleString()} km`}
          />
        )}
        {booking.endMileage !== null && (
          <Detail
            label="Odometer in"
            value={`${booking.endMileage.toLocaleString()} km`}
          />
        )}
      </dl>

      <Separator />

      <dl className="space-y-2">
        <Money label="Subtotal" amount={booking.subTotal} />
        <Money label="Service fee" amount={booking.serviceFee} />
        <Money label="Tax" amount={booking.taxAmount} />
        <Money label="Deposit" amount={booking.securityDeposit} />
        <Money label="Total" amount={booking.totalAmount} strong />
      </dl>
      <p className="text-caption text-muted-foreground">
        {/* The owner does not receive the fee, the tax or the deposit. */}
        Your share is the subtotal. The fee and tax go to CarRental; the deposit goes
        back to the renter.
      </p>

      {booking.cancellationReason && (
        <>
          <Separator />
          <div className="space-y-0.5">
            <p className="text-label uppercase text-muted-foreground">
              Cancellation reason
            </p>
            <p className="text-body break-words">{booking.cancellationReason}</p>
          </div>
        </>
      )}

      <Separator />

      <div className="space-y-2">
        {action !== "view" && (
          <Button asChild className="w-full">
            <Link href={`/owner/bookings/${booking.id}/inspection`}>
              {action === "start" ? "Start trip" : "End trip"}
            </Link>
          </Button>
        )}

        {/*
          **API gap, on screen.** Nothing moves a booking `Pending → Confirmed`,
          despite the README's state diagram. The button stays visible and
          disabled so the gap is obvious to whoever builds the endpoint —
          dropping it would leave an owner wondering how a request they never
          accepted became startable.
        */}
        {booking.status === BookingStatus.Pending && (
          <div className="space-y-1.5">
            <Button variant="outline" className="w-full" disabled>
              Accept request
            </Button>
            <p className="flex gap-1.5 text-caption text-muted-foreground">
              <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {ACCEPT_UNAVAILABLE}
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-label uppercase text-muted-foreground">{label}</dt>
      <dd className="text-body">{value}</dd>
    </div>
  );
}

function Money({
  label,
  amount,
  strong,
}: {
  label: string;
  amount: number;
  strong?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4">
      <dt className={cn("text-body", !strong && "text-muted-foreground")}>{label}</dt>
      <dd className={cn("tabular-nums", strong && "font-medium")}>
        {formatMoney(amount)}
      </dd>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function InboxSkeleton() {
  return (
    <div className="space-y-6 p-4 lg:p-6">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-9 w-80" />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
      <span className="sr-only">Loading your bookings</span>
    </div>
  );
}
