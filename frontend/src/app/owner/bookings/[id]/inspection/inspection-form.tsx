"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Camera, Info } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { BookingStatusBadge } from "@/components/bookings/booking-status-badge";
import { InspectionPhotos } from "@/components/owner/inspection-photos";
import { ErrorState } from "@/components/error-state";
import { useAuth } from "@/components/providers/auth-provider";
import { endTrip, getBooking, startTrip } from "@/lib/api/bookings";
import { ApiError } from "@/lib/api/errors";
import { isBookingParticipant } from "@/lib/bookings";
import { BookingStatus, InspectionType } from "@/lib/enums";
import {
  CLEANLINESS_LABELS,
  CLEANLINESS_MAX,
  CLEANLINESS_MIN,
  clampCleanliness,
  clampFuel,
  FUEL_MAX,
  FUEL_MIN,
  inspectionModeFor,
  validateInspection,
  type InspectionDraft,
} from "@/lib/inspection";
import { renterLabel } from "@/lib/owner";
import { useAsync } from "@/lib/use-async";
import { cn } from "@/lib/utils";
import type { BookingDto } from "@/types/api";

/**
 * One component, two modes.
 *
 * Pickup and return post the same six fields to different routes; only the
 * mileage field name, the heading and the button label differ. Two components
 * would be two places for the fuel range to drift.
 *
 * Designed to be read by two people standing at a car: one column, large
 * targets, and nothing that only appears on hover. Both are on phones, one of
 * them in the rain.
 */
export function InspectionForm({ bookingId }: { bookingId: string }) {
  const state = useAsync(() => getBooking(bookingId), [bookingId]);

  if (state.status === "loading") return <FormSkeleton />;

  if (state.status === "error") {
    return (
      <div className="p-4 lg:p-6">
        <ErrorState
          title="We couldn't load this booking"
          message={state.error.message}
          error={state.error}
          retry={state.reload}
          action={{ href: "/owner/bookings", label: "Back to bookings" }}
        />
      </div>
    );
  }

  return <Inspection booking={state.data} />;
}

function Inspection({ booking }: { booking: BookingDto }) {
  const router = useRouter();
  const { session } = useAuth();
  const mode = inspectionModeFor(booking.status);

  const [draft, setDraft] = useState<InspectionDraft>(() => ({
    mileage: "",
    // Deliberately not pre-filled. A default of "full" is the value most likely
    // to be left untouched and least likely to be true.
    fuelLevel: 50,
    cleanliness: 3,
    hasDamage: false,
    damageDescription: "",
    at: toDateTimeLocal(new Date()),
  }));
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  /**
   * Set once the hand-over is recorded. Photos attach to the inspection row
   * that `/start` and `/end` create, so there is nothing to attach them to
   * until this point — the same reason the add-car wizard puts photos last.
   */
  const [recorded, setRecorded] = useState(false);

  // `GET /api/bookings/{id}` has no authorization at all — it returns any
  // booking to any caller. This is a courtesy, not a control; the real fix
  // belongs on the handler.
  if (!isBookingParticipant(booking, session)) {
    return (
      <div className="p-4 lg:p-6">
        <ErrorState
          title="This isn't your booking"
          message="Only the people on a booking can see its inspection."
          action={{ href: "/owner/bookings", label: "Back to bookings" }}
        />
      </div>
    );
  }

  if (mode === null) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-5 p-4 lg:p-6">
        <BackLink />
        <ErrorState
          title="Nothing to inspect"
          // Both handlers throw for any other status, and the throw arrives as
          // a bare 500 — so the form is not offered rather than offered and
          // refused.
          message="This trip is already finished, so there's no hand-over to record."
          action={{ href: "/owner/bookings", label: "Back to bookings" }}
        />
      </div>
    );
  }

  const errors = validateInspection(draft, {
    mode,
    startMileage: booking.startMileage,
  });

  function set<K extends keyof InspectionDraft>(field: K, value: InspectionDraft[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function errorFor(field: keyof InspectionDraft): string[] | undefined {
    return showErrors && errors[field] ? [errors[field]] : undefined;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting || mode === null) return;

    if (Object.keys(errors).length > 0) {
      setShowErrors(true);
      return;
    }

    setSubmitting(true);

    // Clamped again on the way out. The inputs already constrain both, but
    // these two numbers have no server-side guard whatsoever — this is the
    // last place anything can check them.
    const shared = {
      fuelLevel: clampFuel(draft.fuelLevel),
      cleanliness: clampCleanliness(draft.cleanliness),
      hasDamage: draft.hasDamage,
      damageDescription: draft.hasDamage ? draft.damageDescription.trim() : undefined,
    };
    // The picker works in local time; `toUtcIso` inside the API module converts.
    // Npgsql throws on a non-UTC DateTime, so this is a 500 if skipped.
    const at = new Date(draft.at);
    const mileage = Number(draft.mileage.trim());

    try {
      if (mode === "pickup") {
        await startTrip(booking.id, {
          ...shared,
          actualPickupDateTime: at,
          startMileage: mileage,
        });
        toast.success("Trip started");
      } else {
        await endTrip(booking.id, {
          ...shared,
          actualReturnDateTime: at,
          endMileage: mileage,
        });
        toast.success("Trip ended — deposit returned");
      }
      // Straight to photos rather than back to the inbox. The booking has
      // already moved on; leaving now is fine and the button says so.
      setRecorded(true);
    } catch (cause) {
      toast.error(
        cause instanceof ApiError ? cause.message : "Something went wrong. Try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const isPickup = mode === "pickup";

  if (recorded) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-6 p-4 lg:p-6">
        <BackLink />

        <header className="space-y-2">
          <h1 className="text-h1">{isPickup ? "Trip started" : "Trip ended"}</h1>
          <p className="text-muted-foreground">
            {isPickup
              ? "The car is out. Add photos of how it left, while you're standing next to it."
              : "The car is back and the deposit is returned. Add photos of how it came back."}
          </p>
        </header>

        <InspectionPhotos
          bookingId={booking.id}
          type={isPickup ? InspectionType.Pickup : InspectionType.Return}
        />

        <div className="border-t pt-6">
          <Button size="lg" className="w-full" onClick={() => router.push("/owner/bookings")}>
            Done
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-4 lg:p-6">
      <BackLink />

      <header className="space-y-2">
        <h1 className="text-h1">{isPickup ? "Hand over the car" : "Take the car back"}</h1>
        <p className="text-muted-foreground">
          {booking.carYear} {booking.carMake} {booking.carModel} ·{" "}
          {renterLabel(booking.renterId)}
        </p>
        <BookingStatusBadge status={booking.status} />
      </header>

      {isPickup && booking.status === BookingStatus.Pending && (
        <Alert>
          <Info className="size-4" aria-hidden />
          <AlertDescription>
            This request was never formally accepted — nothing in the API does that
            yet. Starting the trip confirms it in practice.
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-8">
        <Field data-invalid={errorFor("mileage") ? true : undefined}>
          <FieldLabel htmlFor="mileage" className="text-h3">
            Odometer
          </FieldLabel>
          <Input
            id="mileage"
            value={draft.mileage}
            inputMode="numeric"
            autoFocus
            placeholder="km"
            onChange={(e) => set("mileage", e.target.value)}
            aria-invalid={errorFor("mileage") ? true : undefined}
            className="h-14 text-h2 tabular-nums"
          />
          {isPickup ? (
            <p className="text-caption text-muted-foreground">
              Read it off the dashboard now — it&apos;s what the return is measured
              against.
            </p>
          ) : (
            booking.startMileage !== null && (
              <p className="text-caption text-muted-foreground">
                It read {booking.startMileage.toLocaleString()} km at pick-up.
              </p>
            )
          )}
          <FieldError errors={errorFor("mileage")?.map((message) => ({ message }))} />
        </Field>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-baseline justify-between gap-4">
            <Label htmlFor="fuel" className="text-h3">
              Fuel
            </Label>
            <span className="text-h2 tabular-nums">{draft.fuelLevel}%</span>
          </div>
          <Slider
            id="fuel"
            value={[draft.fuelLevel]}
            min={FUEL_MIN}
            max={FUEL_MAX}
            step={5}
            onValueChange={([value]) => set("fuelLevel", clampFuel(value))}
            aria-label="Fuel level"
          />
          <div className="flex justify-between text-caption text-muted-foreground">
            <span>Empty</span>
            <span>Half</span>
            <span>Full</span>
          </div>
        </div>

        <Separator />

        <fieldset className="space-y-3">
          <legend className="text-h3">Cleanliness</legend>
          {/* Five large targets rather than a slider: this is a judgement with
              five named values, not a continuous quantity. */}
          <div className="grid grid-cols-5 gap-2">
            {Array.from(
              { length: CLEANLINESS_MAX - CLEANLINESS_MIN + 1 },
              (_, i) => CLEANLINESS_MIN + i,
            ).map((value) => {
              const active = draft.cleanliness === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => set("cleanliness", clampCleanliness(value))}
                  aria-pressed={active}
                  className={cn(
                    "flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border px-1 py-2 transition-colors",
                    active
                      ? "border-primary bg-primary/10 font-medium"
                      : "text-muted-foreground hover:bg-accent",
                  )}
                >
                  <span className="text-h3 tabular-nums">{value}</span>
                  <span className="text-caption leading-tight">
                    {CLEANLINESS_LABELS[value]}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Checkbox
              id="hasDamage"
              checked={draft.hasDamage}
              onCheckedChange={(checked) => set("hasDamage", checked === true)}
              className="mt-1 size-5"
            />
            <Label htmlFor="hasDamage" className="text-h3 font-normal">
              There&apos;s damage to record
            </Label>
          </div>

          {draft.hasDamage && (
            <Field data-invalid={errorFor("damageDescription") ? true : undefined}>
              <FieldLabel htmlFor="damageDescription">What and where?</FieldLabel>
              <Textarea
                id="damageDescription"
                rows={4}
                value={draft.damageDescription}
                onChange={(e) => set("damageDescription", e.target.value)}
                placeholder="Scratch along the passenger door, about 10 cm…"
                aria-invalid={errorFor("damageDescription") ? true : undefined}
              />
              <FieldError
                errors={errorFor("damageDescription")?.map((message) => ({ message }))}
              />
            </Field>
          )}
        </div>

        <Separator />

        <Field data-invalid={errorFor("at") ? true : undefined}>
          <FieldLabel htmlFor="at">
            {isPickup ? "Handed over at" : "Returned at"}
          </FieldLabel>
          <Input
            id="at"
            type="datetime-local"
            value={draft.at}
            onChange={(e) => set("at", e.target.value)}
            aria-invalid={errorFor("at") ? true : undefined}
            className="h-12"
          />
          <p className="text-caption text-muted-foreground">
            Defaults to now. Change it if you&apos;re writing this up later.
          </p>
          <FieldError errors={errorFor("at")?.map((message) => ({ message }))} />
        </Field>

        <Separator />

        {/* Photos come after the hand-over is recorded: they attach to the
            inspection row that /start and /end create, so there is nothing to
            attach them to until this form is submitted. */}
        <section className="space-y-2 rounded-xl border border-dashed p-4">
          <h2 className="flex items-center gap-2 text-h3 text-muted-foreground">
            <Camera className="size-4" aria-hidden />
            Photos
          </h2>
          <p className="text-caption text-muted-foreground">
            You&apos;ll be asked for photos next, once this is saved.
          </p>
        </section>

        <div className="sticky bottom-0 -mx-4 border-t bg-background/95 px-4 py-4 backdrop-blur lg:mx-0 lg:rounded-b-xl lg:px-0">
          <Button
            type="submit"
            size="lg"
            disabled={submitting}
            className="h-14 w-full text-body"
          >
            {submitting
              ? "Saving…"
              : isPickup
                ? "Start trip"
                : // The label says the outcome, not the operation.
                  "End trip & return deposit"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function BackLink() {
  return (
    <Button variant="ghost" size="sm" asChild className="-ml-2">
      <Link href="/owner/bookings">
        <ArrowLeft className="size-4" aria-hidden />
        Bookings
      </Link>
    </Button>
  );
}

/** `2026-07-31T14:30` — what a `datetime-local` input expects, in local time. */
function toDateTimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function FormSkeleton() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-4 lg:p-6">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-14 w-full" />
      <span className="sr-only">Loading the booking</span>
    </div>
  );
}
