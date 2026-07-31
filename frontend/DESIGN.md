# CarRental — Frontend UI/UX Specification

**Stack:** Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui
**Backend:** .NET 9 API at `https://localhost:7077` (dev). `http://localhost:3000` is already whitelisted in `Cors:AllowedOrigins`.
**Mockups:** [`mockups.html`](mockups.html) — 15 clickable screens, annotated. Open it directly in a browser.
**Build plan:** [`../phases/`](../phases/) — this spec broken into nine ordered phases, with a verified API reference.

---

## 1. Product read

Four audiences, one app:

| Role | Job to be done | Entry point |
|---|---|---|
| **Renter** | Find a car free on my dates, near me, and book it | Landing → Search |
| **Owner** | List a car, accept trips, hand it over and get it back documented | `/owner` |
| **Staff / Admin** | Clear the verification queue | `/admin` |
| **Everyone** | Prove who I am once | `/account/verification` |

The renter path is the product. Owner and admin surfaces are workbenches — denser, table-led, optimised for repetition rather than browsing.

---

## 2. Design system

### Tokens

Declared once in `app/globals.css` as shadcn CSS variables so every installed component inherits them. Dark mode redefines the variables only — **no component ever branches on theme**.

```css
:root {
  --background: 0 0% 100%;
  --foreground: 168 24% 6%;         /* near-black, cooled toward the accent */
  --muted: 168 14% 96%;
  --muted-foreground: 170 6% 45%;
  --border: 168 10% 90%;
  --primary: 175 76% 26%;           /* #0F766E teal-700 */
  --primary-foreground: 0 0% 100%;
  --radius: 0.75rem;
}
.dark {
  --background: 168 16% 5%;
  --foreground: 168 14% 93%;
  --muted: 170 14% 10%;
  --muted-foreground: 168 8% 58%;
  --border: 170 14% 16%;
  --primary: 172 66% 50%;           /* #2DD4BF — brighter teal holds on a dark ground */
  --primary-foreground: 174 80% 8%;
}
```

**One accent.** Teal marks actions and active state, nothing else. Neutrals are biased slightly toward it so the palette reads as one family instead of grey-plus-a-colour.

**Semantic status colours are separate from the accent** and never stand in for it:

| `BookingStatus` | Label | Light fg / bg | Dark fg / bg |
|---|---|---|---|
| `0 Pending` | Pending | `#8A4B04` / `#FDF0DC` | `#F0B429` / `#33260A` |
| `1 Confirmed` | Confirmed | `#0B5850` / `#D9EFEB` | `#5EEAD4` / `#0E332E` |
| `2 InProgress` | In progress | `#1A47B8` / `#DEE8FD` | `#93B4FF` / `#132244` |
| `3 Completed` | Completed | `#54605D` / `#EDF1F0` | `#9AA7A4` / `#1D2726` |
| `4 Cancelled` | Cancelled | `#A3231F` / `#FBE3E1` | `#FCA5A1` / `#3A1917` |
| `5 Disputed` | Disputed | same as Cancelled | same as Cancelled |

Every status pill carries **dot + label + background**. Colour is never the only signal — it reads in greyscale and for colour-blind users.

### Type

System stack (`ui-sans-serif, system-ui, "Segoe UI Variable Text", ...`) — no webfont, no CDN, no layout shift.

| Role | Size / line-height | Weight | Tracking |
|---|---|---|---|
| Display | 40 / 1.15 | 660 | −0.03em |
| H1 | 27 / 1.18 | 660 | −0.02em |
| H2 | 19 / 1.30 | 640 | −0.014em |
| H3 | 15 / 1.35 | 620 | — |
| Body | 14 / 1.50 | 400 | — |
| Caption | 12.5 / 1.45 | 400 | — |
| Label (uppercase) | 10.5 | 640 | +0.10em |

`font-variant-numeric: tabular-nums` on every price, odometer, day count and ID.
`text-wrap: balance` on all headings. Running copy capped near 65ch.

### Spacing & layout

4px base. Page gutter 24px mobile / 48px desktop. Max content width 1280px. Cards `rounded-xl` with a 1px border and no shadow at rest; `shadow-md` on hover. Overlays get `shadow-xl`. Sibling groups are laid out with flex/grid + `gap` — never per-element margins.

---

## 3. Route map

```
app/
  layout.tsx                              fonts · ThemeProvider · Toaster · AuthProvider
  page.tsx                                Landing
  (auth)/login/page.tsx                   Sign in          — no site chrome
  (auth)/register/page.tsx                Register
  search/page.tsx                         Results + filters
  cars/[id]/page.tsx                      Car detail
  cars/[id]/book/page.tsx                 Checkout
  bookings/[id]/page.tsx                  Booking detail / receipt
  trips/page.tsx                          Renter trips (Upcoming | Active | Past)
  account/page.tsx                        Profile
  account/verification/page.tsx           KYC upload
  owner/layout.tsx                        sidebar shell
  owner/page.tsx                          Dashboard
  owner/cars/page.tsx                     My listings
  owner/cars/new/page.tsx                 4-step wizard
  owner/cars/[id]/edit/page.tsx           Edit + photo manager
  owner/bookings/page.tsx                 Booking inbox
  owner/bookings/[id]/inspection/page.tsx Start / End trip
  admin/layout.tsx                        sidebar shell
  admin/verifications/page.tsx            Review queue
  admin/users/page.tsx                    User table
```

**All search and filter state lives in the URL** (`nuqs` or `useSearchParams`). Result sets are shareable, refresh is lossless, and the back button behaves.

---

## 4. Screens

Full visual reference is in [`mockups.html`](mockups.html). This section records the behaviour that a picture doesn't carry.

### 4.1 Landing `/`
Hero with a floating search bar: **Where · From · Until · Search**. Dates are **pre-filled** (tomorrow → +3 days) — the API requires both, so there is no date-less browse to fall back to. Category chips deep-link to `/search?category=SUV`. Featured cars come from the same `/api/cars/search` call the results page uses; there is no separate featured endpoint.

### 4.2 Search `/search`
Left filter rail on desktop, bottom `Sheet` under 1024px with an active-filter count on the trigger chip.

Filters: price range · category · transmission · fuel · seats · features · min rating. The six feature checkboxes map exactly to the keys the backend recognises — `gps`, `bluetooth`, `usb`, `childseat`, `ac`, `backupcamera`. Anything else is silently ignored server-side, so the UI never offers a filter that does nothing.

Card grid, 20/page, server-side pagination. Skeleton cards hold the final dimensions so nothing jumps.

**Empty state offers two one-click repairs** — *widen the dates* and *clear filters*. City matching is exact and lowercase server-side, so a typo returns zero results and needs that escape hatch.

### 4.3 Car detail `/cars/[id]`
Gallery → specs grid → feature chips → mileage & deposit → owner card. Sticky booking panel on the right with the live price breakdown; under 768px it becomes a fixed bottom bar showing total + Continue.

Unavailable features render struck through rather than hidden — absence is information when comparing two cars.

> **API gap.** `GET /api/cars/{id}` returns a `CarDto` with **no images**. Only `/api/cars/search` returns `imageUrls`. Until the DTO is extended the page pairs the car fetch with a search call to hydrate the gallery and falls back to a branded placeholder. This is the single highest-value backend fix.

### 4.4 Checkout `/cars/[id]/book`
Dates → car summary → verification nudge → cancellation note, with a locked price card on the right.

The button reads **"Request this car"**, not "Book now", because new bookings land in `Pending`.

Verification is a **nudge, not a gate** — the backend doesn't require verified documents to book, and blocking here would misrepresent the system.

### 4.5 Booking detail `/bookings/[id]`
Status timeline mirroring the real machine: `Pending → Confirmed → InProgress → Completed`. `Cancelled` / `Disputed` replace the track with a terminal state rather than sitting on it.

Cancel opens a dialog with a reason field. **No refund figure is promised** — the backend never computes `refundAmount`. Cancel is not rendered at all once status is `Completed` or `Cancelled`, matching the handler guards.

### 4.6 My trips `/trips`
One query (`GET /api/bookings?renterId={me}`), three client-side tabs: Upcoming = `Pending|Confirmed`, Active = `InProgress`, Past = `Completed|Cancelled`. The empty state sits *inside* the list, so two upcoming trips and an invitation to book another can coexist.

### 4.7 Auth `/login` `/register`
Split screen. The register form shows a **live password checklist** matching the server's FluentValidation rule (≥8, upper, lower, digit, special from the allowed set) so a user never submits a password the API will reject.

Role is chosen with two cards → `UserRole` int (`Renter 0` / `Owner 1`).

**Rate limiting is designed for, not discovered.** `/api/auth/*` allows **5 requests per minute shared across all four routes** — login, register, refresh and logout compete for one budget. Submit disables during flight, there is no auto-retry, and 429 gets its own "wait about a minute" state.

Registration uses `/api/auth/register`, never `POST /api/users` — the latter skips the strong-password policy and returns no token.

### 4.8 Verification `/account/verification`
Three upload tiles — licence front, licence back, government ID — each with its own status pill, drag-drop, preview, and progress bar across the top.

The backend collapses licence front and back into a single `DriverLicenseStatus`, so approving either side flips both tiles together. The UI mirrors the data model rather than inventing granularity it can't persist.

> **API gap.** `reason` is accepted on review and never stored, so a rejection message can't yet be specific.

### 4.9 Owner dashboard `/owner`
Four stat tiles, an urgency-ordered **"Needs your attention"** list (overdue returns → today's pick-ups → new requests), and a today timeline. Every number is derived client-side from `GET /api/bookings?ownerId={me}` — there is no analytics endpoint, and earnings are labelled "estimated, before fees".

> **API gap.** There is no `GET /api/cars?ownerId=`. Owner listings currently come from the unpaginated `GET /api/cars` filtered client-side — fine at demo scale, first thing to fix.

### 4.10 Add-car wizard `/owner/cars/new`
Four steps: **Basics → Specs & features → Location & pricing → Photos**. Draft persists to `localStorage` between steps.

Photos are step four because `POST /api/cars/{id}/images` needs a car ID: the wizard creates the car, then uploads, then sets the cover.

Live validation mirrors the server exactly — VIN is 17 chars, uppercase, no I/O/Q; year 1900 → next year; seats 1–20; doors 1–10; `pricePerDay > 0`. Errors say what to do ("16 of 17 characters"), not what's wrong ("Invalid VIN").

### 4.11 Owner booking inbox `/owner/bookings`
Status-filtered table + detail panel. **One action per status**: `Pending`/`Confirmed` → Start trip · `InProgress` → End trip · `Completed`/`Cancelled` → View. Buttons that would 500 are never rendered.

> **API gap, shown on screen.** No endpoint moves a booking `Pending → Confirmed`, despite the README's state diagram. The Accept button stays visible and disabled with an inline explanation, so the gap is obvious to whoever builds the endpoint. The start-trip handler accepts `Pending` directly, which is why Start trip is live on a pending row.

### 4.12 Trip inspection `/owner/bookings/[id]/inspection`
**One component, two modes.** Pickup and return post the same shape to `/start` and `/end`; only the mileage field name, heading and button label differ. Odometer · fuel slider (0–100) · cleanliness 1–5 · damage toggle + description · photo strip.

Designed to be read by two people standing at the car: large targets, one column on tablet, nothing hover-only.

> **No server-side validation exists on this form.** Fuel 0–100 and cleanliness 1–5 are documented but unenforced — the client is the only guard.
> **The extra-mileage line is currently always zero.** `MileageLimit` is never copied from the car onto the booking at creation, so the overage branch can't fire. One-line backend fix.

### 4.13 Admin verification queue `/admin/verifications`
A work queue, not a browser. Approving advances to the next item and keeps the reviewer's hands in one place; a "1 of 7" counter sets the expectation.

Rows are **per document, not per user** — `pending-verifications` returns a user with up to three URLs and two statuses, which the UI expands into one reviewable row per outstanding document.

### 4.14 Mobile
Filters collapse into a sheet with an active count. The detail booking panel becomes a fixed bottom bar keeping price and action in thumb reach. Trip cards lead with the photo. 44px minimum touch targets; nothing depends on hover.

---

## 5. API integration rules

These are non-negotiable consequences of the backend as it stands.

| Constraint | Rule for the frontend |
|---|---|
| Business failures throw plain `Exception` → **HTTP 500, generic body** | A `mapApiError(operation, status)` layer converts operation context into a human message ("Those dates were just taken", "Email or password is incorrect"). **Raw server text never reaches a user.** |
| `UnauthorizedAccessException` → **401** with `{ error }`; `ForbiddenAccessException` → **403** with `{ error }` | Token refresh is **proactive**, scheduled off the `expiry` field from `AuthenticationResult` — the token lives 60 minutes and `ClockSkew` is zero, so it must not be allowed to lapse. A reactive 401 interceptor is a viable backstop, not the primary mechanism. |
| No `GET /api/auth/me` | Auth state is built from the login/register response payload (`userId`, `role`, `firstName`, `lastName`) and persisted client-side. Route guards read from that store. |
| `renterId` · `cancelledByUserId` are **derived server-side from the JWT** (commit `48f94d7`) | The client never sends them. `CreateBookingCommand` is `(CarId, StartDate, EndDate)`; `CancelBookingCommand` is `(BookingId, CancellationReason)`. Only `GET /api/bookings` takes `renterId` / `ownerId`, as **filters**. |
| Enums are **ints in request *and response* bodies** — `Program.cs` registers no `JsonStringEnumConverter` | One `lib/enums.ts` with TS enums + label maps. Body serialisers send and parse ints. In query strings, `category` is typed `string?` so it sends a name; booking `status` is a typed enum that binds either form. `AuthenticationResult.role` is the one exception — it's a string. |
| All datetime columns are `timestamptz`; Npgsql throws on non-UTC | A single `toUtcIso()` helper guards every date boundary. Pickers work in local time and convert on the way out. |
| Amounts are computed and snapshotted server-side | The client never sends money. `PriceBreakdown` mirrors the formula (`subtotal + 10% + 5% + deposit`) from **one** module so display and server can't drift, and the UI re-renders from the returned booking. |
| Images are absolute Cloudinary URLs | `next.config.ts` → `images.remotePatterns` for `res.cloudinary.com`; a `cloudinaryThumb(url, w)` helper injects transformation segments for grid thumbnails. |
| `/api/auth/*` = 5 req/min, shared | No auto-retry, no aggressive refresh, disabled buttons in flight, explicit 429 state. |
| No reviews / payments / messages / availability endpoints | Ratings are read-only. Message and payment affordances appear in the design and ship disabled rather than being silently dropped. |
| No file-size or MIME validation server-side | Enforced client-side before upload, or a large file becomes a 500. |

---

## 6. Component inventory

`AppShell` · `OwnerShell` · `AdminShell` · `RoleGuard`
`SearchBar` · `FilterRail` · `FilterSheet` · `DateRangePicker`
`CarCard` · `CarCardSkeleton` · `CarGallery` · `SpecGrid` · `FeatureChips`
`PriceBreakdown` — single source of the pricing math
`BookingStatusBadge` · `BookingTimeline` · `BookingRow`
`StatCard` · `WizardStepper` · `PhotoUploader` · `VerificationTile` · `InspectionForm`
`EmptyState` · `ErrorState`

**shadcn/ui installed** (Phase 0, `style: radix-nova`):
`button card input select calendar popover dialog sheet drawer badge avatar tabs table dropdown-menu field label textarea checkbox radio-group slider separator skeleton sonner alert progress command tooltip input-group`

> The `form` component no longer exists in the registry. shadcn replaced the
> react-hook-form `<Form>` wrapper with unopinionated **`field`** primitives —
> `Field`, `FieldLabel`, `FieldError`, `FieldDescription`, `FieldSet`,
> `FieldGroup`. Forms compose these with react-hook-form directly rather than
> through a `<FormField>` render-prop. `input-group` arrived as a dependency of
> `command`.

---

## 7. Copy principles

Written from the user's side of the screen.

- Name things the way people say them — *Find a car*, not *Browse listings*; *My trips*, not *Bookings*.
- Controls say exactly what happens. "Request this car" because the booking lands in `Pending`. "End trip & return deposit" because that's the outcome.
- Errors explain what went wrong and what to do — "16 of 17 characters. VINs never contain I, O or Q." No apologies, no vagueness, no error codes.
- Confirmations are specific: "Nour has the keys. Due back 28 Jul, 18:00."

---

## 8. Backend fixes this design depends on

Ordered by how much they unblock. None are required to *start* — each has a documented workaround above.

1. ~~**Add `images` to `CarDto`**~~ — **done in Phase 6.** `CarDto.images` is a `CarImageDto[]` carrying ids, so the double-fetch is gone and photos can be deleted and re-covered. See [phases/README.md § Fixed](../phases/README.md#fixed).
2. **`GET /api/cars?ownerId=`** — removes the client-side filter over an unpaginated list of every car. Now the largest remaining one.
3. **A `Pending → Confirmed` endpoint** — the README documents "owner accepts" but nothing implements it.
4. **Populate `MileageLimit` from `car.DailyMileageLimit` on booking create** — one line; makes the extra-mileage charge live instead of dead code.
5. ~~**Typed domain exceptions → 400 / 401 / 409**~~ — **partly done in Phase 6.** `ConflictException` → 409 exists and its message reaches the user verbatim; the three car handlers throw `NotFoundException` rather than returning 500 for a missing car. The business-rule 500s in booking create, cancel, start and end are still plain `Exception`s and should follow.
6. **Persist the verification `reason`** — lets a rejected user see why.
7. **Add `renterName` / car image to `BookingDto`** — removes an N+1 fetch on every booking list.

---

## 9. Verification

1. **Review `mockups.html`** — click every screen, resize to ~390px for the mobile layouts, toggle the theme. Loading, empty and error states are shown in place, not described.
2. **Cross-check against the live API** — run `dotnet run --project backend/API`, open `/swagger`, and confirm every field in a mockup exists on the corresponding DTO and every action maps to a real endpoint. Actions with no endpoint must be visibly marked as gaps (they are: sections 4.11, 4.12, 4.8).
3. **Revisions** land by editing `mockups.html` directly — it is version-controlled alongside this spec.
