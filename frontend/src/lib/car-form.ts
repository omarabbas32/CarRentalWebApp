import type { CarInput } from "@/lib/api/cars";
import { CarCategory, FuelType, TransmissionType } from "@/lib/enums";
import type { CarDto } from "@/types/api";

/**
 * The car form: one draft shape, one validator, two screens.
 *
 * `CreateCarCommandValidator` and `UpdateCarCommandValidator` are
 * character-for-character identical, so the wizard and the edit page share
 * everything here.
 *
 * Every rule below mirrors one `RuleFor` in those validators. The copy does
 * not: FluentValidation says "VIN must contain only valid characters", which
 * tells a user nothing they can act on. Messages here say what to do — the
 * server's wording never reaches the screen.
 *
 * Numbers are held as **strings**. A number input that round-trips through
 * `Number()` on every keystroke fights the person typing it: "1" becomes 1,
 * clearing the field becomes 0, and a half-typed "1." vanishes. Conversion
 * happens once, in `toCarInput`.
 */

export type CarDraft = {
  make: string;
  model: string;
  year: string;
  color: string;
  licensePlate: string;
  vin: string;
  /**
   * `null` until chosen, deliberately. `IsInEnum()` passes for `0`, so a
   * pre-selected default would silently submit "Manual" / "Petrol" / "Economy"
   * for an owner who never looked at the field.
   */
  transmission: TransmissionType | null;
  fuelType: FuelType | null;
  category: CarCategory | null;
  seats: string;
  doors: string;
  mileage: string;
  hasGPS: boolean;
  hasBluetooth: boolean;
  hasUSBCharging: boolean;
  hasChildSeat: boolean;
  hasAirConditioning: boolean;
  hasBackupCamera: boolean;
  lat: string;
  lng: string;
  locationAddress: string;
  locationCity: string;
  locationState: string;
  pricePerDay: string;
  pricePerWeek: string;
  pricePerMonth: string;
  securityDeposit: string;
  dailyMileageLimit: string;
  extraMileageCharge: string;
};

export type CarDraftField = keyof CarDraft;

export const EMPTY_DRAFT: CarDraft = {
  make: "",
  model: "",
  year: "",
  color: "",
  licensePlate: "",
  vin: "",
  transmission: null,
  fuelType: null,
  category: null,
  seats: "",
  doors: "",
  mileage: "",
  hasGPS: false,
  hasBluetooth: false,
  hasUSBCharging: false,
  hasChildSeat: false,
  hasAirConditioning: false,
  hasBackupCamera: false,
  lat: "",
  lng: "",
  locationAddress: "",
  locationCity: "",
  locationState: "",
  pricePerDay: "",
  pricePerWeek: "",
  pricePerMonth: "",
  securityDeposit: "",
  dailyMileageLimit: "",
  extraMileageCharge: "",
};

/* ------------------------------------------------------------------ *
 * Rules
 * ------------------------------------------------------------------ */

export const MIN_YEAR = 1900;

/** The validator reads `DateTime.Now.Year + 1`, so this is not a constant. */
export function maxYear(now: Date = new Date()): number {
  return now.getFullYear() + 1;
}

export const VIN_LENGTH = 17;

/**
 * `^[A-HJ-NPR-Z0-9]*$` — the standard VIN alphabet. I, O and Q are excluded
 * because they are indistinguishable from 1 and 0 in the stamped plate.
 */
export const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]*$/;

/** Uppercases and strips separators, so a VIN copied off a document works. */
export function normaliseVin(value: string): string {
  return value.toUpperCase().replace(/[\s-]/g, "");
}

export type CarFormErrors = Partial<Record<CarDraftField, string>>;

export function validateCarDraft(
  draft: CarDraft,
  options: { now?: Date } = {},
): CarFormErrors {
  const now = options.now ?? new Date();
  const errors: CarFormErrors = {};

  const required = (field: CarDraftField, message: string) => {
    if (draft[field] === "" || String(draft[field]).trim() === "") {
      errors[field] = message;
      return false;
    }
    return true;
  };

  const maxLength = (field: CarDraftField, limit: number, noun: string) => {
    const value = String(draft[field]).trim();
    if (value.length > limit) {
      errors[field] = `${noun} is ${value.length} characters. Keep it to ${limit}.`;
    }
  };

  if (required("make", "Which make is it? Toyota, Ford, BMW…")) {
    maxLength("make", 50, "That");
  }
  if (required("model", "Which model is it?")) {
    maxLength("model", 50, "That");
  }

  // Year
  if (required("year", "Which model year is it?")) {
    const year = Number(draft.year);
    const max = maxYear(now);
    if (!Number.isInteger(year)) {
      errors.year = "Enter the year as four digits.";
    } else if (year < MIN_YEAR || year > max) {
      errors.year = `Enter a year between ${MIN_YEAR} and ${max}.`;
    }
  }

  required("color", "What colour is it?");

  if (required("licensePlate", "Add the plate so renters can identify the car.")) {
    maxLength("licensePlate", 20, "That plate");
  }

  // VIN — the rule people get wrong, so the message names the specific problem.
  const vin = normaliseVin(draft.vin);
  if (vin === "") {
    errors.vin = `A VIN is ${VIN_LENGTH} characters, printed on the dashboard or the driver's door frame.`;
  } else if (/[IOQ]/.test(vin)) {
    errors.vin = "VINs never contain I, O or Q — those are a 1 and two 0s.";
  } else if (!VIN_PATTERN.test(vin)) {
    errors.vin = "Use letters and numbers only — no spaces or punctuation.";
  } else if (vin.length !== VIN_LENGTH) {
    errors.vin = `${vin.length} of ${VIN_LENGTH} characters.`;
  }

  if (draft.transmission === null) errors.transmission = "Pick a transmission.";
  if (draft.fuelType === null) errors.fuelType = "Pick a fuel type.";
  if (draft.category === null) errors.category = "Pick the class renters will search by.";

  integerInRange(draft, errors, "seats", 1, 20, "How many seats? Between 1 and 20.");
  integerInRange(draft, errors, "doors", 1, 10, "How many doors? Between 1 and 10.");

  if (required("mileage", "Add the current odometer reading.")) {
    const mileage = Number(draft.mileage);
    if (!Number.isFinite(mileage) || mileage < 0) {
      errors.mileage = "Enter the odometer reading as a whole number.";
    }
  }

  required("locationAddress", "Where is the car picked up from?");
  required("locationCity", "Which city? Renters search by exact city name.");
  required("locationState", "Which state or region?");

  // `Location` is a non-nullable `Point` and there is no geocoding endpoint, so
  // coordinates are collected rather than derived. Sending 0,0 would put every
  // car in the Gulf of Guinea.
  coordinate(draft, errors, "lat", 90, "latitude");
  coordinate(draft, errors, "lng", 180, "longitude");

  if (required("pricePerDay", "Set a daily price.")) {
    const price = Number(draft.pricePerDay);
    if (!Number.isFinite(price) || price <= 0) {
      errors.pricePerDay = "The daily price has to be more than 0.";
    }
  }

  if (required("securityDeposit", "Set a deposit, or 0 for none.")) {
    const deposit = Number(draft.securityDeposit);
    if (!Number.isFinite(deposit) || deposit < 0) {
      errors.securityDeposit = "A deposit can't be negative. Use 0 for none.";
    }
  }

  // Unvalidated server-side and defaulted to zero, so these stay optional in
  // the UI — but a *negative* value would be stored verbatim and shown to
  // renters, so what is entered is still checked.
  optionalNonNegative(draft, errors, "pricePerWeek", "A weekly price can't be negative.");
  optionalNonNegative(draft, errors, "pricePerMonth", "A monthly price can't be negative.");
  optionalNonNegative(
    draft,
    errors,
    "dailyMileageLimit",
    "A mileage limit can't be negative. Leave it blank for unlimited.",
  );
  optionalNonNegative(
    draft,
    errors,
    "extraMileageCharge",
    "An extra-mileage charge can't be negative.",
  );

  return errors;
}

function integerInRange(
  draft: CarDraft,
  errors: CarFormErrors,
  field: "seats" | "doors",
  min: number,
  max: number,
  message: string,
) {
  const raw = draft[field].trim();
  const value = Number(raw);
  if (raw === "" || !Number.isInteger(value) || value < min || value > max) {
    errors[field] = message;
  }
}

function coordinate(
  draft: CarDraft,
  errors: CarFormErrors,
  field: "lat" | "lng",
  limit: number,
  noun: string,
) {
  const raw = draft[field].trim();
  if (raw === "") {
    errors[field] = `Add the ${noun}. There's no address lookup yet, so coordinates are entered by hand.`;
    return;
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || value < -limit || value > limit) {
    errors[field] = `A ${noun} runs from −${limit} to ${limit}.`;
  }
}

function optionalNonNegative(
  draft: CarDraft,
  errors: CarFormErrors,
  field: CarDraftField,
  message: string,
) {
  const raw = String(draft[field]).trim();
  if (raw === "") return;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) errors[field] = message;
}

/* ------------------------------------------------------------------ *
 * Steps
 * ------------------------------------------------------------------ */

/**
 * Photos come last because `POST /api/cars/{id}/images` needs a car id — the
 * wizard has to create the car before it has anywhere to put them.
 *
 * Each step lists the fields it is responsible for. `verify:logic` checks that
 * every field the validator can flag belongs to exactly one step: a field
 * owned by no step would block submission with nothing highlighted anywhere,
 * and a field owned by two would fail the same person twice.
 */
export const WIZARD_STEPS = [
  {
    id: "basics",
    title: "Basics",
    hint: "What the car is.",
    fields: ["make", "model", "year", "color", "licensePlate", "vin"],
  },
  {
    id: "specs",
    title: "Specs & features",
    hint: "How it drives and what's in it.",
    fields: ["transmission", "fuelType", "category", "seats", "doors", "mileage"],
  },
  {
    id: "pricing",
    title: "Location & pricing",
    hint: "Where renters collect it, and what it costs.",
    fields: [
      "locationAddress",
      "locationCity",
      "locationState",
      "lat",
      "lng",
      "pricePerDay",
      "pricePerWeek",
      "pricePerMonth",
      "securityDeposit",
      "dailyMileageLimit",
      "extraMileageCharge",
    ],
  },
  {
    id: "photos",
    title: "Photos",
    hint: "Added after the listing is created.",
    fields: [],
  },
] as const satisfies readonly {
  id: string;
  title: string;
  hint: string;
  fields: readonly CarDraftField[];
}[];

export type WizardStepId = (typeof WIZARD_STEPS)[number]["id"];

/** The step index the wizard must submit from — the last one before Photos. */
export const LAST_INPUT_STEP = WIZARD_STEPS.length - 2;

/** Errors belonging to one step, so an incomplete later step never blocks Next. */
export function errorsForStep(errors: CarFormErrors, stepIndex: number): CarFormErrors {
  const step = WIZARD_STEPS[stepIndex];
  if (!step) return {};
  const out: CarFormErrors = {};
  for (const field of step.fields) {
    if (errors[field]) out[field] = errors[field];
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Conversion
 * ------------------------------------------------------------------ */

/** Blank means "not set", which the API stores as 0. */
function num(value: string): number {
  const trimmed = value.trim();
  return trimmed === "" ? 0 : Number(trimmed);
}

/**
 * Call only on a draft `validateCarDraft` has cleared — the non-null
 * assertions on the enums are safe exactly then, and nowhere else.
 */
export function toCarInput(draft: CarDraft): CarInput {
  return {
    make: draft.make.trim(),
    model: draft.model.trim(),
    year: num(draft.year),
    color: draft.color.trim(),
    licensePlate: draft.licensePlate.trim(),
    vin: normaliseVin(draft.vin),
    transmission: draft.transmission!,
    fuelType: draft.fuelType!,
    seats: num(draft.seats),
    doors: num(draft.doors),
    mileage: num(draft.mileage),
    category: draft.category!,
    hasGPS: draft.hasGPS,
    hasBluetooth: draft.hasBluetooth,
    hasUSBCharging: draft.hasUSBCharging,
    hasChildSeat: draft.hasChildSeat,
    hasAirConditioning: draft.hasAirConditioning,
    hasBackupCamera: draft.hasBackupCamera,
    location: { lat: num(draft.lat), lng: num(draft.lng) },
    locationAddress: draft.locationAddress.trim(),
    locationCity: draft.locationCity.trim(),
    locationState: draft.locationState.trim(),
    pricePerDay: num(draft.pricePerDay),
    pricePerWeek: num(draft.pricePerWeek),
    pricePerMonth: num(draft.pricePerMonth),
    securityDeposit: num(draft.securityDeposit),
    dailyMileageLimit: num(draft.dailyMileageLimit),
    extraMileageCharge: num(draft.extraMileageCharge),
  };
}

/**
 * `PUT /api/cars/{id}` is a **replace, not a patch**. The edit form therefore
 * starts from every field the server currently holds, so saving one change
 * cannot blank the rest.
 */
export function draftFromCar(car: CarDto): CarDraft {
  return {
    make: car.make,
    model: car.model,
    year: String(car.year),
    color: car.color,
    licensePlate: car.licensePlate,
    vin: car.vin,
    transmission: car.transmission,
    fuelType: car.fuelType,
    category: car.category,
    seats: String(car.seats),
    doors: String(car.doors),
    mileage: String(car.mileage),
    hasGPS: car.hasGPS,
    hasBluetooth: car.hasBluetooth,
    hasUSBCharging: car.hasUSBCharging,
    hasChildSeat: car.hasChildSeat,
    hasAirConditioning: car.hasAirConditioning,
    hasBackupCamera: car.hasBackupCamera,
    lat: String(car.location?.lat ?? ""),
    lng: String(car.location?.lng ?? ""),
    locationAddress: car.locationAddress,
    locationCity: car.locationCity,
    locationState: car.locationState,
    pricePerDay: String(car.pricePerDay),
    pricePerWeek: String(car.pricePerWeek),
    pricePerMonth: String(car.pricePerMonth),
    securityDeposit: String(car.securityDeposit),
    dailyMileageLimit: String(car.dailyMileageLimit),
    extraMileageCharge: String(car.extraMileageCharge),
  };
}

/* ------------------------------------------------------------------ *
 * Draft persistence
 * ------------------------------------------------------------------ */

export const DRAFT_KEY = "carrental.car-draft";

/**
 * Filling this form takes several minutes and a walk to the car for the VIN
 * and the odometer. Losing it to a refresh or a closed tab is the difference
 * between a listing and an abandoned one.
 *
 * Merged over `EMPTY_DRAFT` so a draft saved before a field existed still
 * loads instead of arriving with `undefined` in a controlled input.
 */
export function loadDraft(): CarDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CarDraft>;
    if (!parsed || typeof parsed !== "object") return null;
    return { ...EMPTY_DRAFT, ...parsed };
  } catch {
    // Private-mode storage, a quota error, or hand-edited JSON. A lost draft is
    // a bad afternoon; a crash on load is a broken page.
    return null;
  }
}

export function saveDraft(draft: CarDraft): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* Storage is full or blocked — the form still works, it just won't survive. */
  }
}

export function clearDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* As above. */
  }
}

/**
 * The id of a car the wizard created but has not finished adding photos to.
 *
 * `POST /api/cars/{id}/images` needs a car id, so the car has to exist before
 * step four. That leaves a window where the listing is real and the wizard
 * still looks unfinished — and a refresh in that window would otherwise send
 * the owner back to an empty form to create the same car a second time.
 * Remembering the id turns that into a link to the listing they already have.
 */
const CREATED_KEY = "carrental.car-draft.created";

export function rememberCreatedCar(id: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CREATED_KEY, id);
  } catch {
    /* Non-fatal: the wizard still works, it just can't recover a refresh. */
  }
}

export function recallCreatedCar(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(CREATED_KEY);
  } catch {
    return null;
  }
}

export function forgetCreatedCar(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CREATED_KEY);
  } catch {
    /* As above. */
  }
}

/** True when the draft holds anything worth restoring. */
export function isDraftDirty(draft: CarDraft): boolean {
  return (Object.keys(EMPTY_DRAFT) as CarDraftField[]).some(
    (key) => draft[key] !== EMPTY_DRAFT[key],
  );
}
