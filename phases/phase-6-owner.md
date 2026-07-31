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

- [x] Dashboard stats derive from one bookings call; earnings are labelled as estimated.
- [x] Listings show only the signed-in owner's cars.
- [x] The wizard survives a refresh mid-flow via the `localStorage` draft.
- [x] Every validator rule fires client-side before submit, with actionable copy.
- [x] Create → upload photos → set cover completes, and a mid-flow failure recovers to edit
      rather than losing the car. Set-cover needed a backend endpoint, which now exists.
- [x] Editing one field does not reset the others.
- [x] The inbox renders exactly one action per status; Accept is visible, disabled, and
      explained.
- [x] Start trip on a `Pending` booking moves it to `InProgress`.
- [x] End trip moves it to `Completed`; fuel and cleanliness are clamped client-side.
- [x] The inspection form is usable one-handed at tablet width.

---

## Outcome

Complete, at `/owner` under [`OwnerShell`](../frontend/src/components/layout/owner-shell.tsx)
and a `RoleGuard` for Owner, Admin and Staff — the same three roles `CreateCar`,
`UpdateCar`, `StartTrip` and `EndTrip` carry on their `[Authorize]` attributes.

The logic that decides what the UI offers lives in
[`lib/owner.ts`](../frontend/src/lib/owner.ts),
[`lib/car-form.ts`](../frontend/src/lib/car-form.ts) and
[`lib/inspection.ts`](../frontend/src/lib/inspection.ts), and is pinned by
`npm run verify:logic` — 71 checks, up from 40.

### Three backend defects found here — and fixed

The owner surfaces were built against the API as it was, working around all three. The
workarounds were then deleted, because the backend was fixed in the same phase. All three
were code-only — the `InspectionPhotos` table already existed — so **no migration was
needed.** Full write-up in [phases/README.md § Fixed](README.md#fixed).

**A car with any booking history could never be deleted.** `BookingConfiguration` maps
`Booking → Car` with `OnDelete(DeleteBehavior.Restrict)` and `DeleteCarCommandHandler`
checked only ownership before calling `Remove`, so the foreign key rejected the delete inside
`SaveChangesAsync` and the owner got an unexplained 500. The handler now counts the bookings
first and throws a new `ConflictException` — 409, carrying a message written for the owner
that names the count and the reversible alternative. The listings page still disables Delete
pre-emptively, off the bookings call it already makes, so the refusal is visible before the
click rather than after it.

**Nothing returned a car image's id**, so a photo could only be deleted in the session that
uploaded it and a cover could only be set by re-uploading the same photograph.
`CarDto.Images` now carries `CarImageDto` — id, URL, type, `IsPrimary`, display order —
and `PUT /api/cars/images/{imageId}/primary` promotes an existing photo.
[`PhotoManager`](../frontend/src/components/owner/photo-manager.tsx) does all three actions
on any photo, and `lib/car-images.ts` — the search-call hydration workaround — is deleted.
Phase 3's car detail page lost its `hydrateImages` double-fetch with it.

**No endpoint accepted inspection photos.** `POST /api/bookings/{id}/inspections/{type}/photos`
and `GET /api/bookings/{id}/inspections` now exist, the latter returning everything an
inspection recorded — fuel, cleanliness, damage description, photos — none of which
`BookingDto` carries. Photos attach *after* `/start` or `/end`, because those are what create
the inspection row: the same shape as the add-car wizard, for the same reason. Uploading
before it exists is refused with a 409 rather than an empty inspection being conjured to hang
a photo off.

Routing them through the car image endpoint was the obvious shortcut and would have been
wrong: `/api/cars/search` returns every one of a car's images, so damage photos would have
appeared in the public listing.

### Also: the car image endpoints are authorized now

`POST /api/cars/{id}/images` and `DELETE /api/cars/images/{imageId}` carried no
`[Authorize]` at all — any caller could upload to, or delete from, any car on the platform.
Adding a third unauthenticated write endpoint next to them was not defensible, so all three
now carry the attribute and check ownership through `CarOwnership.EnsureCanManage`, matching
what `CreateCar`, `UpdateCar` and `DeleteCar` have always done.

### Coordinates are typed in

`Location` is a non-nullable `Point` on create and there is no geocoding endpoint, so
latitude and longitude are collected as fields with a note explaining why. Sending `0,0`
would put every car in the Gulf of Guinea, so the pair is required and range-checked —
the only validation either value ever gets.

### Earnings are the subtotal, and say so

`totalAmount` includes the platform's 10% service fee, 5% tax and a security deposit the
renter gets back — none of it the owner's money. The tile sums `subTotal` over completed
trips and is labelled *"estimated, before fees"*. There are no payment records anywhere in
this system, so even that is an estimate of what was billed, not of what was paid out.

### Notes

The seam this document predicted — listings (tasks 1–4) against trips (tasks 5–6) — held.
They share only the shell, `lib/owner.ts` and the renter-label helper.
