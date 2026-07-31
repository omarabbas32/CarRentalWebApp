# Phase 6 — Owner workbench

**Depends on:** Phase 2 (independent of 3, 4, 5, 7)
**Delivers:** an owner can list a car, see demand, hand it over and take it back documented.

---

## Why this phase exists

The owner surface is a workbench, not a storefront — denser, table-led, optimised for
repetition rather than browsing. It is also where the backend gaps are most visible, and the
design decision is to **show them on screen** rather than paper over them.

---

## Tasks

### 1. `OwnerShell` and dashboard `/owner`

Sidebar shell: Dashboard · My listings · Bookings.

Four stat tiles, an urgency-ordered **"Needs your attention"** list (overdue returns →
today's pick-ups → new requests), and a today timeline.

Every number is derived client-side from `GET /api/bookings?ownerId={me}`. There is no
analytics endpoint. Earnings are labelled **"estimated, before fees"** — the app has no
payment records, and an unqualified figure would be a claim it cannot support.

### 2. My listings `/owner/cars`

> **API gap.** There is no `GET /api/cars?ownerId=`. Owner listings come from the
> **unpaginated** `GET /api/cars` filtered client-side on `ownerId`. Fine at demo scale,
> first thing to fix. Comment the workaround at the call site.

Table or card grid with cover photo, make · model · year, city, price per day, availability
and active state, plus edit and delete actions.

### 3. Add-car wizard `/owner/cars/new`

Four steps: **Basics → Specs & features → Location & pricing → Photos**. Draft persists to
`localStorage` between steps.

Photos are step four because `POST /api/cars/{id}/images` needs a car ID. The sequence is:
create the car → upload each photo → set the cover. A failure after creation must not
strand the user — recover to the edit page for the created car rather than losing it.

Live validation mirrors `CreateCarCommandValidator` exactly:

| Field | Rule |
|---|---|
| Make, Model | required, ≤50 chars |
| Year | 1900 → current year + 1 |
| Colour | required |
| License plate | required, ≤20 chars |
| VIN | exactly 17 chars, `^[A-HJ-NPR-Z0-9]*$` — no I, O or Q |
| Seats | 1–20 |
| Doors | 1–10 |
| Mileage | ≥ 0 |
| PricePerDay | > 0 |
| SecurityDeposit | ≥ 0 |
| LocationAddress, LocationCity, LocationState | required |
| Transmission, FuelType, Category | valid enum |

Errors say **what to do**, not what is wrong: *"16 of 17 characters. VINs never contain I, O
or Q."* — not *"Invalid VIN"*.

`Location` is a non-nullable `Point { lat, lng }` on create. There is no geocoding endpoint,
so either add a map picker or collect coordinates explicitly — but the field cannot be
skipped.

Note that `PricePerWeek`, `PricePerMonth`, `DailyMileageLimit` and `ExtraMileageCharge` are
unvalidated server-side and default to zero. Decide deliberately whether they are optional
in the UI.

Requires the Owner, Admin or Staff role.

### 4. Edit and photo manager `/owner/cars/[id]/edit`

`PUT /api/cars/{id}` takes the **full** car object plus `IsAvailable` and `IsActive` — it is
a replace, not a patch. Load the current `CarDto`, merge edits, send everything, or fields
silently reset.

Photo manager: upload (`Type` is `CarImageType` — `Exterior 0`, `Interior 1`, `Engine 2`,
`Document 3` — plus `IsPrimary`), set cover, delete via
`DELETE /api/cars/images/{imageId}`.

`CarDto` carries no images, so the manager needs the same search-call workaround as Phase 3.

Both image endpoints are **unauthenticated** — any caller can upload to or delete from any
car. Guard client-side; file the issue.

### 5. Booking inbox `/owner/bookings`

Status-filtered table with a detail panel, from `GET /api/bookings?ownerId={me}`.

**One action per status.** Buttons that would 500 are never rendered:

| Status | Action |
|---|---|
| `Pending`, `Confirmed` | Start trip |
| `InProgress` | End trip |
| `Completed`, `Cancelled` | View |

> **API gap, shown on screen.** No endpoint moves a booking `Pending → Confirmed`, despite
> the README's state diagram. The **Accept** button stays visible and **disabled** with an
> inline explanation, so the gap is obvious to whoever builds the endpoint. The start-trip
> handler accepts `Pending` directly, which is why Start trip is live on a pending row.

`BookingDto` carries no renter name — only `renterId`. Either fetch per row via
`GET /api/users/{id}` (an N+1) or show a truncated ID until the backend adds it. Prefer the
latter; note the choice.

### 6. Trip inspection `/owner/bookings/[id]/inspection`

**One component, two modes.** Pickup and return post the same shape to `/start` and `/end`;
only the mileage field name, the heading and the button label differ.

| Mode | Endpoint | Mileage field | Datetime field |
|---|---|---|---|
| Pickup | `POST /api/bookings/{id}/start` | `StartMileage` | `ActualPickupDateTime` |
| Return | `POST /api/bookings/{id}/end` | `EndMileage` | `ActualReturnDateTime` |

Shared fields: `FuelLevel`, `Cleanliness`, `HasDamage`, `DamageDescription`.

Odometer · fuel slider (0–100) · cleanliness 1–5 · damage toggle and description · photo
strip.

Designed to be read by two people standing at the car: large targets, one column on tablet,
nothing hover-only. The end-trip button reads **"End trip & return deposit"** — it says the
outcome.

> **No server-side validation exists on this form.** Fuel 0–100 and cleanliness 1–5 are
> documented but unenforced — the client is the only guard. Enforce both, and require a
> description when `HasDamage` is set.

Both endpoints require the Owner, Admin or Staff role, and both send datetimes — route them
through `toUtcIso()`.

---

## Done when

- [ ] Dashboard stats derive from one bookings call; earnings are labelled as estimated.
- [ ] Listings show only the signed-in owner's cars.
- [ ] The wizard survives a refresh mid-flow via the `localStorage` draft.
- [ ] Every validator rule fires client-side before submit, with actionable copy.
- [ ] Create → upload photos → set cover completes, and a mid-flow failure recovers to edit
      rather than losing the car.
- [ ] Editing one field does not reset the others.
- [ ] The inbox renders exactly one action per status; Accept is visible, disabled, and
      explained.
- [ ] Start trip on a `Pending` booking moves it to `InProgress`.
- [ ] End trip moves it to `Completed`; fuel and cleanliness are clamped client-side.
- [ ] The inspection form is usable one-handed at tablet width.

---

## Notes

This is the largest phase. If it needs splitting, the seam is between listings (tasks 1–4)
and trips (tasks 5–6) — they share only the shell.
