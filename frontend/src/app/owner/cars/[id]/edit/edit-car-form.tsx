"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { BasicsFields, PricingFields, SpecsFields } from "@/components/owner/car-fields";
import { PhotoManager } from "@/components/owner/photo-manager";
import { ErrorState } from "@/components/error-state";
import { useAuth } from "@/components/providers/auth-provider";
import { getCar, updateCar } from "@/lib/api/cars";
import { ApiError } from "@/lib/api/errors";
import {
  draftFromCar,
  forgetCreatedCar,
  toCarInput,
  validateCarDraft,
  type CarDraft,
  type CarDraftField,
} from "@/lib/car-form";
import { UserRole } from "@/lib/enums";
import { useAsync } from "@/lib/use-async";
import type { CarDto } from "@/types/api";

export function EditCarForm({ carId }: { carId: string }) {
  // One call. `CarDto` carries its images now, so the page no longer pairs
  // this with a search call to hydrate the photo manager.
  const state = useAsync(() => getCar(carId), [carId]);

  if (state.status === "loading") return <EditSkeleton />;

  if (state.status === "error") {
    return (
      <div className="p-4 lg:p-6">
        <ErrorState
          title="We couldn't load this listing"
          message={state.error.message}
          error={state.error}
          retry={state.reload}
          action={{ href: "/owner/cars", label: "Back to my listings" }}
        />
      </div>
    );
  }

  // Keyed by id so switching between listings resets the form state rather
  // than editing one car's fields into another's draft.
  return <Editor key={state.data.id} car={state.data} onSaved={state.reload} />;
}

function Editor({ car, onSaved }: { car: CarDto; onSaved: () => void }) {
  const { session } = useAuth();

  /**
   * `PUT /api/cars/{id}` is a **replace, not a patch** — every field on the
   * request overwrites its column. Starting from the car the server currently
   * holds is what stops editing the price from blanking the address.
   */
  const [draft, setDraft] = useState<CarDraft>(() => draftFromCar(car));
  const [isAvailable, setIsAvailable] = useState(car.isAvailable);
  const [isActive, setIsActive] = useState(car.isActive);

  const [submitting, setSubmitting] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [serverError, setServerError] = useState<ApiError | null>(null);

  const errors = validateCarDraft(draft);

  // `UpdateCarCommandHandler` throws `ForbiddenAccessException` for anyone who
  // is not the owner, Admin or Staff. Mirrored here so the refusal arrives
  // before the form is filled in rather than after it is submitted.
  const isPrivileged =
    session?.role === UserRole.Admin || session?.role === UserRole.Staff;
  const canEdit = isPrivileged || session?.userId === car.ownerId;

  function set<K extends CarDraftField>(field: K, value: CarDraft[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
    setServerError(null);
  }

  function errorFor(field: CarDraftField): string[] | undefined {
    const fromServer = serverError?.fieldErrors?.[field];
    if (fromServer?.length) return fromServer;
    if (showErrors && errors[field]) return [errors[field]];
    return undefined;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;

    if (Object.keys(errors).length > 0) {
      setShowErrors(true);
      return;
    }

    setSubmitting(true);
    setServerError(null);

    try {
      // Every field, every time — including the two flags, which live outside
      // `CarInput` because create has no equivalent of them.
      await updateCar(car.id, { ...toCarInput(draft), isAvailable, isActive });
      toast.success("Listing saved");
      onSaved();
    } catch (cause) {
      if (cause instanceof ApiError) {
        setServerError(cause);
        setShowErrors(true);
      } else {
        toast.error("Something went wrong. Try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!canEdit) {
    return (
      <div className="p-4 lg:p-6">
        <ErrorState
          title="This isn't your listing"
          message="Only the owner of a car can edit it."
          action={{ href: "/owner/cars", label: "Back to my listings" }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 p-4 lg:p-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/owner/cars">
            <ArrowLeft className="size-4" aria-hidden />
            My listings
          </Link>
        </Button>
        <h1 className="mt-2 text-h1">
          {car.year} {car.make} {car.model}
        </h1>
        <p className="text-muted-foreground">
          {car.locationCity}, {car.locationState}
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-8">
        {serverError && !serverError.fieldErrors && (
          <Alert variant="destructive">
            <AlertDescription>{serverError.message}</AlertDescription>
          </Alert>
        )}

        <section className="space-y-4">
          <h2 className="text-h2">Availability</h2>
          <div className="space-y-3 rounded-xl border p-4">
            <div className="flex items-start gap-2.5">
              <Checkbox
                id="isActive"
                checked={isActive}
                onCheckedChange={(checked) => setIsActive(checked === true)}
              />
              <div className="space-y-0.5">
                <Label htmlFor="isActive" className="font-normal">
                  Listed
                </Label>
                <p className="text-caption text-muted-foreground">
                  Off takes the car out of search entirely. Use this instead of
                  deleting — deleting can&apos;t be undone, and is refused outright
                  once the car has any booking history.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Checkbox
                id="isAvailable"
                checked={isAvailable}
                onCheckedChange={(checked) => setIsAvailable(checked === true)}
              />
              <div className="space-y-0.5">
                <Label htmlFor="isAvailable" className="font-normal">
                  Available to book
                </Label>
                <p className="text-caption text-muted-foreground">
                  Off keeps the listing but stops new bookings — for a service, a
                  repair, or a week you need the car yourself.
                </p>
              </div>
            </div>
          </div>
        </section>

        <Separator />

        <section className="space-y-4">
          <h2 className="text-h2">Basics</h2>
          <BasicsFields draft={draft} set={set} errorFor={errorFor} />
        </section>

        <Separator />

        <section className="space-y-4">
          <h2 className="text-h2">Specs &amp; features</h2>
          <SpecsFields draft={draft} set={set} errorFor={errorFor} />
        </section>

        <Separator />

        <section className="space-y-4">
          <h2 className="text-h2">Location &amp; pricing</h2>
          <PricingFields draft={draft} set={set} errorFor={errorFor} />
        </section>

        <div className="flex flex-wrap gap-3 border-t pt-6">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving…" : "Save changes"}
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/owner/cars">Cancel</Link>
          </Button>
        </div>
      </form>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-h2">Photos</h2>
        <PhotoManager
          carId={car.id}
          images={car.images}
          onChanged={() => {
            // Arriving here from the wizard's recovery banner means the
            // listing that was left without photos now has some. Stop
            // offering to finish it.
            forgetCreatedCar();
            onSaved();
          }}
        />
      </section>
    </div>
  );
}

function EditSkeleton() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 p-4 lg:p-6">
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-64 w-full" />
      <span className="sr-only">Loading this listing</span>
    </div>
  );
}
