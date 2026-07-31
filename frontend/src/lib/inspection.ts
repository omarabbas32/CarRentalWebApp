import { BookingStatus } from "@/lib/enums";

/**
 * The pickup and return inspection.
 *
 * **Nothing on this form is validated server-side.** `StartTripRequest` and
 * `EndTripRequest` carry `FuelLevel` and `Cleanliness` as bare `int`s, no
 * validator is registered for either command, and the handlers copy them onto
 * a `TripInspection` unchecked. The domain comments say `// 0-100` and
 * `// 1-5`; nothing enforces it. A fuel level of 900 would be stored and shown
 * back.
 *
 * So the rules here are not a convenience layer over server validation — they
 * are the only validation that exists, which is why they are pinned in
 * `npm run verify:logic`.
 */

export const FUEL_MIN = 0;
export const FUEL_MAX = 100;
export const CLEANLINESS_MIN = 1;
export const CLEANLINESS_MAX = 5;

export function clampFuel(value: number): number {
  if (!Number.isFinite(value)) return FUEL_MIN;
  return Math.min(FUEL_MAX, Math.max(FUEL_MIN, Math.round(value)));
}

export function clampCleanliness(value: number): number {
  if (!Number.isFinite(value)) return CLEANLINESS_MIN;
  return Math.min(CLEANLINESS_MAX, Math.max(CLEANLINESS_MIN, Math.round(value)));
}

/** Words, not stars — two people at a car need to agree on what they mean. */
export const CLEANLINESS_LABELS: Record<number, string> = {
  1: "Filthy",
  2: "Dirty",
  3: "Acceptable",
  4: "Clean",
  5: "Spotless",
};

export type InspectionMode = "pickup" | "return";

/**
 * Which inspection a booking is due, or `null` when it is due none.
 *
 * `StartTripCommandHandler` accepts `Confirmed` **or** `Pending` —
 * hence a pickup on a request nobody accepted, which is the only reason the
 * inbox can offer Start trip on a pending row. `EndTripCommandHandler` accepts
 * `InProgress` alone. Both refusals are thrown as a plain `Exception` and
 * arrive as a bare 500, so the form must not be reachable in any other state.
 */
export function inspectionModeFor(status: BookingStatus): InspectionMode | null {
  switch (status) {
    case BookingStatus.Pending:
    case BookingStatus.Confirmed:
      return "pickup";
    case BookingStatus.InProgress:
      return "return";
    default:
      return null;
  }
}

export type InspectionDraft = {
  /** The odometer, as typed. */
  mileage: string;
  fuelLevel: number;
  cleanliness: number;
  hasDamage: boolean;
  damageDescription: string;
  /** `datetime-local` value, in the owner's own time zone. */
  at: string;
};

export type InspectionErrors = Partial<Record<keyof InspectionDraft, string>>;

export function validateInspection(
  draft: InspectionDraft,
  context: { mode: InspectionMode; startMileage: number | null },
): InspectionErrors {
  const errors: InspectionErrors = {};

  const raw = draft.mileage.trim();
  const mileage = Number(raw);
  if (raw === "") {
    errors.mileage = "Read the odometer and enter it.";
  } else if (!Number.isInteger(mileage) || mileage < 0) {
    errors.mileage = "Enter the odometer as a whole number of kilometres.";
  } else if (
    context.mode === "return" &&
    context.startMileage !== null &&
    mileage < context.startMileage
  ) {
    // Not a server rule — there is no server rule. But an end reading below the
    // start one makes `TotalMileage` negative, and the number is the record of
    // what happened on the trip.
    errors.mileage = `It read ${context.startMileage.toLocaleString()} km at pick-up, so it can't be lower now.`;
  }

  if (draft.fuelLevel < FUEL_MIN || draft.fuelLevel > FUEL_MAX) {
    errors.fuelLevel = `Fuel runs from ${FUEL_MIN} to ${FUEL_MAX}.`;
  }

  if (draft.cleanliness < CLEANLINESS_MIN || draft.cleanliness > CLEANLINESS_MAX) {
    errors.cleanliness = `Pick a rating from ${CLEANLINESS_MIN} to ${CLEANLINESS_MAX}.`;
  }

  // A damage flag with no description records that something was wrong and
  // nothing about what — useless to whoever reads it later, and to whoever
  // ends up disputing it.
  if (draft.hasDamage && draft.damageDescription.trim() === "") {
    errors.damageDescription = "Describe the damage — what it is and where.";
  }

  if (draft.at.trim() === "") {
    errors.at = "When did this happen?";
  } else if (Number.isNaN(new Date(draft.at).getTime())) {
    errors.at = "That date and time isn't valid.";
  }

  return errors;
}
