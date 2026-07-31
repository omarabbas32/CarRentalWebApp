"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MIN_YEAR,
  maxYear,
  normaliseVin,
  VIN_LENGTH,
  type CarDraft,
  type CarDraftField,
} from "@/lib/car-form";
import {
  CAR_FEATURES,
  carCategoryLabel,
  CarCategory,
  enumValues,
  fuelTypeLabel,
  FuelType,
  transmissionTypeLabel,
  TransmissionType,
} from "@/lib/enums";

/**
 * The car form's fields, in the three groups the wizard steps through.
 *
 * They live apart from both screens because the add wizard and the edit page
 * post to validators that are character-for-character identical — two copies
 * of thirty inputs would drift, and the drift would show up as a 400 on one
 * screen and not the other.
 */
export type CarFieldsProps = {
  draft: CarDraft;
  set: <K extends CarDraftField>(field: K, value: CarDraft[K]) => void;
  /** Local rule, or the server's own message for the field, or nothing. */
  errorFor: (field: CarDraftField) => string[] | undefined;
};

function errorProps(errors: string[] | undefined) {
  return {
    invalid: errors ? true : undefined,
    messages: errors?.map((message) => ({ message })),
  };
}

/* ------------------------------------------------------------------ *
 * Step 1 — Basics
 * ------------------------------------------------------------------ */

export function BasicsFields({ draft, set, errorFor }: CarFieldsProps) {
  const vin = normaliseVin(draft.vin);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id="make"
          label="Make"
          value={draft.make}
          maxLength={50}
          placeholder="Toyota"
          onChange={(v) => set("make", v)}
          errors={errorFor("make")}
        />
        <TextField
          id="model"
          label="Model"
          value={draft.model}
          maxLength={50}
          placeholder="Corolla"
          onChange={(v) => set("model", v)}
          errors={errorFor("model")}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id="year"
          label="Year"
          value={draft.year}
          inputMode="numeric"
          placeholder={String(new Date().getFullYear())}
          onChange={(v) => set("year", v)}
          errors={errorFor("year")}
          hint={`${MIN_YEAR} to ${maxYear()} — next year's models are allowed.`}
        />
        <TextField
          id="color"
          label="Colour"
          value={draft.color}
          placeholder="Silver"
          onChange={(v) => set("color", v)}
          errors={errorFor("color")}
        />
      </div>

      <TextField
        id="licensePlate"
        label="Licence plate"
        value={draft.licensePlate}
        maxLength={20}
        onChange={(v) => set("licensePlate", v)}
        errors={errorFor("licensePlate")}
      />

      <TextField
        id="vin"
        label="VIN"
        value={draft.vin}
        // Uppercased on the way in, so a VIN copied off a document or a phone
        // keyboard's lowercase doesn't fail a rule the owner can't see.
        onChange={(v) => set("vin", normaliseVin(v))}
        errors={errorFor("vin")}
        className="font-mono tracking-wider uppercase"
        hint={
          vin.length > 0 && vin.length < VIN_LENGTH
            ? `${vin.length} of ${VIN_LENGTH} characters.`
            : "17 characters, on the dashboard by the windscreen or inside the driver's door."
        }
      />
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Step 2 — Specs & features
 * ------------------------------------------------------------------ */

export function SpecsFields({ draft, set, errorFor }: CarFieldsProps) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <EnumField
          id="transmission"
          label="Transmission"
          value={draft.transmission}
          options={enumValues(TransmissionType).map((v) => ({
            value: v,
            label: transmissionTypeLabel[v as TransmissionType],
          }))}
          onChange={(v) => set("transmission", v as TransmissionType)}
          errors={errorFor("transmission")}
        />
        <EnumField
          id="fuelType"
          label="Fuel"
          value={draft.fuelType}
          options={enumValues(FuelType).map((v) => ({
            value: v,
            label: fuelTypeLabel[v as FuelType],
          }))}
          onChange={(v) => set("fuelType", v as FuelType)}
          errors={errorFor("fuelType")}
        />
      </div>

      <EnumField
        id="category"
        label="Class"
        value={draft.category}
        options={enumValues(CarCategory).map((v) => ({
          value: v,
          label: carCategoryLabel[v as CarCategory],
        }))}
        onChange={(v) => set("category", v as CarCategory)}
        errors={errorFor("category")}
        hint="Renters filter search results by this."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <TextField
          id="seats"
          label="Seats"
          value={draft.seats}
          inputMode="numeric"
          onChange={(v) => set("seats", v)}
          errors={errorFor("seats")}
        />
        <TextField
          id="doors"
          label="Doors"
          value={draft.doors}
          inputMode="numeric"
          onChange={(v) => set("doors", v)}
          errors={errorFor("doors")}
        />
        <TextField
          id="mileage"
          label="Odometer"
          value={draft.mileage}
          inputMode="numeric"
          onChange={(v) => set("mileage", v)}
          errors={errorFor("mileage")}
          hint="In km."
        />
      </div>

      <fieldset className="space-y-3">
        <legend className="text-label uppercase text-muted-foreground">Features</legend>
        {/* Exactly the six keys `SearchCarsQueryHandler` recognises. Offering a
            seventh would let an owner tick something no renter can filter on. */}
        <ul className="grid gap-2.5 sm:grid-cols-2">
          {CAR_FEATURES.map((feature) => (
            <li key={feature.key} className="flex items-center gap-2.5">
              <Checkbox
                id={`feature-${feature.key}`}
                checked={draft[feature.field]}
                onCheckedChange={(checked) => set(feature.field, checked === true)}
              />
              <Label htmlFor={`feature-${feature.key}`} className="font-normal">
                {feature.label}
              </Label>
            </li>
          ))}
        </ul>
      </fieldset>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Step 3 — Location & pricing
 * ------------------------------------------------------------------ */

export function PricingFields({ draft, set, errorFor }: CarFieldsProps) {
  return (
    <div className="space-y-6">
      <section className="space-y-5">
        <h3 className="text-label uppercase text-muted-foreground">Where it lives</h3>

        <TextField
          id="locationAddress"
          label="Pick-up address"
          value={draft.locationAddress}
          onChange={(v) => set("locationAddress", v)}
          errors={errorFor("locationAddress")}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            id="locationCity"
            label="City"
            value={draft.locationCity}
            onChange={(v) => set("locationCity", v)}
            errors={errorFor("locationCity")}
            // City matching in `SearchCarsQueryHandler` is an exact lowercase
            // comparison, so a misspelling makes the car unfindable rather than
            // merely harder to find.
            hint="Matched exactly when renters search — check the spelling."
          />
          <TextField
            id="locationState"
            label="State or region"
            value={draft.locationState}
            onChange={(v) => set("locationState", v)}
            errors={errorFor("locationState")}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            id="lat"
            label="Latitude"
            value={draft.lat}
            inputMode="decimal"
            placeholder="31.9539"
            onChange={(v) => set("lat", v)}
            errors={errorFor("lat")}
          />
          <TextField
            id="lng"
            label="Longitude"
            value={draft.lng}
            inputMode="decimal"
            placeholder="35.9106"
            onChange={(v) => set("lng", v)}
            errors={errorFor("lng")}
          />
        </div>
        <p className="text-caption text-muted-foreground">
          {/* `Location` is a non-nullable `Point` on create and there is no
              geocoding endpoint, so the field cannot be skipped or derived. */}
          Coordinates are entered by hand — there&apos;s no address lookup yet. Right-click
          the spot in any maps app and copy the pair it shows.
        </p>
      </section>

      <section className="space-y-5">
        <h3 className="text-label uppercase text-muted-foreground">Pricing</h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            id="pricePerDay"
            label="Price per day"
            value={draft.pricePerDay}
            inputMode="decimal"
            onChange={(v) => set("pricePerDay", v)}
            errors={errorFor("pricePerDay")}
            hint="The only rate the booking total is built from."
          />
          <TextField
            id="securityDeposit"
            label="Security deposit"
            value={draft.securityDeposit}
            inputMode="decimal"
            onChange={(v) => set("securityDeposit", v)}
            errors={errorFor("securityDeposit")}
            hint="Added to the total and returned at the end. 0 for none."
          />
        </div>

        {/* Optional, and labelled as such. These four are accepted, stored and
            never validated server-side — and nothing reads them back when a
            booking is priced, so a weekly rate here does not discount anything
            yet. Saying so beats an owner discovering it from an invoice. */}
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            id="pricePerWeek"
            label="Price per week (optional)"
            value={draft.pricePerWeek}
            inputMode="decimal"
            onChange={(v) => set("pricePerWeek", v)}
            errors={errorFor("pricePerWeek")}
          />
          <TextField
            id="pricePerMonth"
            label="Price per month (optional)"
            value={draft.pricePerMonth}
            inputMode="decimal"
            onChange={(v) => set("pricePerMonth", v)}
            errors={errorFor("pricePerMonth")}
          />
        </div>
        <p className="text-caption text-muted-foreground">
          Weekly and monthly rates are stored but not yet used — every booking is
          priced from the daily rate.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            id="dailyMileageLimit"
            label="Daily mileage limit (optional)"
            value={draft.dailyMileageLimit}
            inputMode="numeric"
            onChange={(v) => set("dailyMileageLimit", v)}
            errors={errorFor("dailyMileageLimit")}
            hint="Blank or 0 shows as unlimited."
          />
          <TextField
            id="extraMileageCharge"
            label="Extra mileage charge (optional)"
            value={draft.extraMileageCharge}
            inputMode="decimal"
            onChange={(v) => set("extraMileageCharge", v)}
            errors={errorFor("extraMileageCharge")}
            hint="Per km over the limit."
          />
        </div>
        <p className="text-caption text-muted-foreground">
          {/* `MileageLimit` is never copied from the car onto the booking at
              creation, so the overage branch is dead code. */}
          Mileage limits aren&apos;t enforced on bookings yet, so overage is never
          charged automatically.
        </p>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Primitives
 * ------------------------------------------------------------------ */

function TextField({
  id,
  label,
  value,
  onChange,
  errors,
  hint,
  className,
  ...input
}: {
  id: CarDraftField;
  label: string;
  value: string;
  onChange: (value: string) => void;
  errors?: string[];
  hint?: string;
  className?: string;
  maxLength?: number;
  placeholder?: string;
  inputMode?: "numeric" | "decimal" | "tel";
}) {
  const { invalid, messages } = errorProps(errors);
  const hintId = hint ? `${id}-hint` : undefined;

  return (
    <Field data-invalid={invalid}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid}
        aria-describedby={hintId}
        className={className}
        {...input}
      />
      {hint && (
        <p id={hintId} className="text-caption text-muted-foreground">
          {hint}
        </p>
      )}
      <FieldError errors={messages} />
    </Field>
  );
}

/**
 * Enums arrive and leave as ints, and `null` means "not chosen" — `0` is a
 * real value for all three of these, so an unselected trigger cannot be
 * represented by a number.
 */
function EnumField({
  id,
  label,
  value,
  options,
  onChange,
  errors,
  hint,
}: {
  id: CarDraftField;
  label: string;
  value: number | null;
  options: { value: number; label: string }[];
  onChange: (value: number) => void;
  errors?: string[];
  hint?: string;
}) {
  const { invalid, messages } = errorProps(errors);

  return (
    <Field data-invalid={invalid}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select
        value={value === null ? undefined : String(value)}
        onValueChange={(v) => onChange(Number(v))}
      >
        <SelectTrigger id={id} className="w-full" aria-invalid={invalid}>
          <SelectValue placeholder="Choose one" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={String(option.value)}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hint && <p className="text-caption text-muted-foreground">{hint}</p>}
      <FieldError errors={messages} />
    </Field>
  );
}
