"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, PartyPopper } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BasicsFields, PricingFields, SpecsFields } from "@/components/owner/car-fields";
import { PhotoManager } from "@/components/owner/photo-manager";
import { createCar, getCar } from "@/lib/api/cars";
import { ApiError } from "@/lib/api/errors";
import {
  clearDraft,
  EMPTY_DRAFT,
  errorsForStep,
  forgetCreatedCar,
  isDraftDirty,
  LAST_INPUT_STEP,
  loadDraft,
  recallCreatedCar,
  rememberCreatedCar,
  saveDraft,
  toCarInput,
  validateCarDraft,
  WIZARD_STEPS,
  type CarDraft,
  type CarDraftField,
} from "@/lib/car-form";
import { useAsync } from "@/lib/use-async";
import { cn } from "@/lib/utils";

/**
 * Basics → Specs & features → Location & pricing → Photos.
 *
 * The car is created at the end of step three, because
 * `POST /api/cars/{id}/images` needs an id to attach photos to. Step four
 * therefore operates on a listing that already exists — which is stated on the
 * step rather than left for the owner to discover by closing the tab.
 *
 * Everything typed is written to `localStorage` on every change. Filling this
 * in means a walk to the car for the VIN and the odometer; losing it to a
 * refresh is the difference between a listing and an abandoned one.
 */
export function AddCarWizard() {
  const router = useRouter();

  // Read once, on mount. `RoleGuard` renders a skeleton until the session
  // resolves, so this component never renders on the server and there is no
  // hydration mismatch to guard against.
  const [draft, setDraft] = useState<CarDraft>(() => loadDraft() ?? EMPTY_DRAFT);
  const [step, setStep] = useState(0);
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<ApiError | null>(null);

  /** Set only by a create in *this* session — it drives step four. */
  const [createdCarId, setCreatedCarId] = useState<string | null>(null);

  /**
   * A car created by an earlier run of this wizard that never reached photos.
   * Recovering to it is the alternative to silently offering a blank form that
   * would create the same listing twice.
   */
  const [strandedCarId, setStrandedCarId] = useState<string | null>(() =>
    recallCreatedCar(),
  );

  const errors = validateCarDraft(draft);
  const stepErrors = errorsForStep(errors, step);

  function set<K extends CarDraftField>(field: K, value: CarDraft[K]) {
    setDraft((current) => {
      const next = { ...current, [field]: value };
      saveDraft(next);
      return next;
    });
    setServerError(null);
  }

  function errorFor(field: CarDraftField): string[] | undefined {
    const fromServer = serverError?.fieldErrors?.[field];
    if (fromServer?.length) return fromServer;
    if (showErrors && errors[field]) return [errors[field]];
    return undefined;
  }

  function goNext() {
    if (Object.keys(stepErrors).length > 0) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    setStep((s) => Math.min(s + 1, WIZARD_STEPS.length - 1));
  }

  function goBack() {
    setShowErrors(false);
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleCreate() {
    if (submitting) return;

    // Validated in full, not just the current step — a rule broken back on
    // step one would otherwise surface as a 400 on a screen that can't show it.
    if (Object.keys(errors).length > 0) {
      setShowErrors(true);
      const firstBadStep = WIZARD_STEPS.findIndex((s) =>
        s.fields.some((field) => errors[field]),
      );
      if (firstBadStep >= 0) setStep(firstBadStep);
      return;
    }

    setSubmitting(true);
    setServerError(null);

    try {
      const carId = await createCar(toCarInput(draft));

      // The listing exists from here on. Remember it before anything else can
      // fail, and drop the draft so a later visit starts clean.
      rememberCreatedCar(carId);
      setCreatedCarId(carId);
      setStrandedCarId(null);
      clearDraft();
      setDraft(EMPTY_DRAFT);
      setStep(WIZARD_STEPS.length - 1);
      toast.success("Listing created");
    } catch (cause) {
      if (cause instanceof ApiError) {
        setServerError(cause);
        setShowErrors(true);
        // A 400 names its fields; jump to the first step that owns one so the
        // message is on screen rather than two steps back.
        const badField = Object.keys(cause.fieldErrors ?? {}) as CarDraftField[];
        const target = WIZARD_STEPS.findIndex((s) =>
          s.fields.some((field) => badField.includes(field)),
        );
        if (target >= 0) setStep(target);
      } else {
        toast.error("Something went wrong. Try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  function finish() {
    forgetCreatedCar();
    router.push("/owner/cars");
  }

  const onPhotosStep = step === WIZARD_STEPS.length - 1;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 p-4 lg:p-6">
      <header className="space-y-1">
        <h1 className="text-h1">List a car</h1>
        <p className="text-muted-foreground">
          Have the VIN and the odometer reading to hand — both are on the car.
        </p>
      </header>

      {/* A car left half-finished by a previous visit. Offered before the form,
          because starting over would create a duplicate listing. */}
      {strandedCarId && !createdCarId && (
        <Alert>
          <AlertDescription className="flex flex-wrap items-center gap-3">
            <span>You created a listing last time but didn&apos;t add photos.</span>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/owner/cars/${strandedCarId}/edit`}>Finish it</Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                forgetCreatedCar();
                setStrandedCarId(null);
              }}
            >
              Start a new one
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Stepper current={step} createdCarId={createdCarId} />

      {serverError && !serverError.fieldErrors && (
        <Alert variant="destructive">
          <AlertDescription>{serverError.message}</AlertDescription>
        </Alert>
      )}

      <section className="space-y-5" aria-labelledby="step-title">
        <div className="space-y-1">
          <h2 id="step-title" className="text-h2">
            {WIZARD_STEPS[step].title}
          </h2>
          <p className="text-muted-foreground">{WIZARD_STEPS[step].hint}</p>
        </div>

        {step === 0 && <BasicsFields draft={draft} set={set} errorFor={errorFor} />}
        {step === 1 && <SpecsFields draft={draft} set={set} errorFor={errorFor} />}
        {step === 2 && <PricingFields draft={draft} set={set} errorFor={errorFor} />}
        {onPhotosStep &&
          (createdCarId ? (
            <div className="space-y-5">
              <div className="flex items-start gap-3 rounded-xl border p-4">
                <PartyPopper className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                <div className="space-y-1">
                  <p className="text-h3">The listing is live</p>
                  <p className="text-muted-foreground">
                    Photos can be added now or later — a car with none still appears in
                    search, just without a picture.
                  </p>
                </div>
              </div>

              <WizardPhotos carId={createdCarId} />
            </div>
          ) : (
            <p className="text-muted-foreground">
              Photos are added once the listing exists — the upload endpoint needs a car
              to attach them to. Go back and create it first.
            </p>
          ))}
      </section>

      <div className="flex items-center justify-between gap-3 border-t pt-6">
        <Button
          variant="ghost"
          onClick={goBack}
          disabled={step === 0 || onPhotosStep || submitting}
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back
        </Button>

        {onPhotosStep ? (
          <Button onClick={finish} disabled={!createdCarId}>
            <Check className="size-4" aria-hidden />
            Done
          </Button>
        ) : step === LAST_INPUT_STEP ? (
          <Button onClick={handleCreate} disabled={submitting}>
            {submitting ? "Creating…" : "Create listing"}
          </Button>
        ) : (
          <Button onClick={goNext}>
            Next
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        )}
      </div>

      {isDraftDirty(draft) && !createdCarId && (
        <p className="text-caption text-muted-foreground">
          Saved on this device as you type. Closing the tab won&apos;t lose it.
        </p>
      )}
    </div>
  );
}

/**
 * Step four's photo grid.
 *
 * A separate component so the car can be fetched with a hook — the wizard only
 * has a car id after step three, and hooks cannot be called conditionally. The
 * fetch is what keeps display order and the cover flag in step with the server
 * after each upload.
 */
function WizardPhotos({ carId }: { carId: string }) {
  const state = useAsync(() => getCar(carId), [carId]);

  if (state.status === "loading") return <Skeleton className="h-64 w-full" />;

  if (state.status === "error") {
    return (
      <Alert variant="destructive">
        <AlertDescription className="flex flex-wrap items-center gap-3">
          <span>{state.error.message}</span>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/owner/cars/${carId}/edit`}>Add photos on the edit page</Link>
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <PhotoManager
      carId={carId}
      images={state.data.images}
      onChanged={state.reload}
    />
  );
}

function Stepper({
  current,
  createdCarId,
}: {
  current: number;
  createdCarId: string | null;
}) {
  return (
    <ol className="flex flex-wrap gap-x-2 gap-y-3">
      {WIZARD_STEPS.map((step, index) => {
        // Steps behind the cursor are done; once the car exists, so is
        // everything before photos regardless of where the cursor sits.
        const done = index < current || (createdCarId !== null && index < WIZARD_STEPS.length - 1);
        const active = index === current;

        return (
          <li key={step.id} className="flex min-w-0 flex-1 items-center gap-2">
            <span
              aria-hidden
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full border text-caption font-medium tabular-nums",
                done && "border-primary bg-primary text-primary-foreground",
                active && !done && "border-primary text-primary",
                !done && !active && "text-muted-foreground",
              )}
            >
              {done ? <Check className="size-3.5" /> : index + 1}
            </span>
            <span
              className={cn(
                "truncate text-caption",
                active ? "text-foreground font-medium" : "text-muted-foreground",
              )}
              aria-current={active ? "step" : undefined}
            >
              {step.title}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
