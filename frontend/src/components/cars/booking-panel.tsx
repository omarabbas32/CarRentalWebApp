"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { priceBreakdown, formatMoney } from "@/lib/pricing";
import { toDateInputValue } from "@/lib/dates";
import type { CarDto } from "@/types/api";

/**
 * The live price quote, from `lib/pricing.ts` — the same arithmetic the server
 * runs at booking time, so the number here is the number charged.
 *
 * Sticky on desktop; below 768px it becomes a fixed bottom bar so the price and
 * the action stay in thumb reach.
 */
export function BookingPanel({
  car,
  start,
  end,
}: {
  car: CarDto;
  start: Date;
  end: Date;
}) {
  const price = priceBreakdown(car.pricePerDay, car.securityDeposit, start, end);
  const bookHref = `/cars/${car.id}/book?from=${toDateInputValue(start)}&to=${toDateInputValue(end)}`;

  return (
    <>
      {/* Desktop */}
      <aside className="hidden md:block">
        <div className="sticky top-24 space-y-4 rounded-xl border p-5">
          <p>
            <span className="text-h1 tabular-nums">{formatMoney(car.pricePerDay)}</span>
            <span className="text-muted-foreground"> / day</span>
          </p>

          <Separator />

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

          <Button asChild className="w-full">
            {/* "Request", not "Book" — new bookings land in Pending. */}
            <Link href={bookHref}>Request this car</Link>
          </Button>

          <p className="text-caption text-muted-foreground">
            You won&apos;t be charged yet. The owner confirms first.
          </p>
        </div>
      </aside>

      {/* Mobile: fixed bottom bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-4 border-t bg-background/95 px-6 py-3 backdrop-blur md:hidden">
        <div className="min-w-0">
          <p className="text-h3 tabular-nums">{formatMoney(price.total)}</p>
          <p className="text-caption tabular-nums text-muted-foreground">
            {price.totalDays} day{price.totalDays === 1 ? "" : "s"}, all in
          </p>
        </div>
        <Button asChild className="ml-auto">
          <Link href={bookHref}>Continue</Link>
        </Button>
      </div>
    </>
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
