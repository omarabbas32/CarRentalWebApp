# Phase 3 — Renter discovery

**Depends on:** Phase 2
**Delivers:** land → search → compare → arrive at a specific car, all without signing in.

---

## Why this phase exists

This is the product. Everything else is a workbench. It is also the first phase whose state
is genuinely complex, and the rule that resolves it is simple: **all search and filter state
lives in the URL** (`nuqs` or `useSearchParams`). Result sets are shareable, refresh is
lossless, and the back button behaves.

---

## Tasks

### 1. Landing `/`

Hero with a floating search bar: **Where · From · Until · Search**.

Dates are **pre-filled** — tomorrow → +3 days. `GET /api/cars/search` requires both
`startDate` and `endDate`, so there is no date-less browse to fall back to. An empty date
means an empty result set, which reads as a broken site.

Category chips deep-link to `/search?category=SUV`. `category` is a **name** in the query
string — `SearchCarsRequest.Category` is typed `string?`.

Featured cars come from the same `/api/cars/search` call the results page uses. There is no
featured endpoint; do not invent one.

### 2. Search `/search`

Left filter rail on desktop; a bottom `Sheet` under 1024px whose trigger chip carries an
active-filter count.

Filters: price range · category · transmission · fuel · seats · features · min rating.

The six feature checkboxes map to the exact keys the backend recognises — `gps`,
`bluetooth`, `usb`, `childseat`, `ac`, `backupcamera`. Anything else is silently ignored
server-side, so **the UI never offers a filter that does nothing**. Verify this list against
`SearchCarsQueryHandler` before wiring it; if the handler's keys differ, the handler wins.

Transmission, fuel and seats are **not** server-side filters on `SearchCarsRequest` — check
the handler. If they are unsupported, either filter the returned page client-side and label
it honestly, or drop them from the rail. Do not render a control that appears to filter and
does not.

Card grid, `pageSize` 20, server-side pagination. `CarCardSkeleton` holds the final card
dimensions so nothing jumps on load.

**The empty state offers two one-click repairs** — *widen the dates* and *clear filters*.
City matching is exact and lowercase server-side, so a typo returns zero results and needs
that escape hatch.

Server-side validation to surface, from `SearchFilters.Validate`: start must precede end,
the range cannot exceed 365 days, min price cannot exceed max, rating must be 0–5. Page
number below 1 and page size outside 1–100 are silently corrected rather than rejected.

### 3. `CarCard`

Photo (from `imageUrls[0]` via `cloudinaryThumb`), make · model · year, category, city,
seats and transmission, rating, and price per day with `.tabular`.

`CarSearchResultDto` carries `imageUrls` — a card never needs a second fetch. Fall back to a
branded placeholder on an empty array.

### 4. Car detail `/cars/[id]`

Gallery → specs grid → feature chips → mileage and deposit → owner card. Sticky booking
panel on the right with a live price breakdown from `lib/pricing.ts`; under 768px it becomes
a fixed bottom bar showing total and *Continue*.

Unavailable features render **struck through rather than hidden**. Absence is information
when comparing two cars.

> **API gap.** `GET /api/cars/{id}` returns a `CarDto` with **no images** — only
> `/api/cars/search` returns `imageUrls`. Until `CarDto` is extended, pair the car fetch
> with a search call to hydrate the gallery, and fall back to a branded placeholder.
> This is the single highest-value backend fix; see
> [known defects](README.md#known-backend-defects).

The owner card shows what `CarDto` actually carries — `ownerId`, and rating and trip counts.
There is no owner-profile endpoint, so do not render an owner name or avatar that cannot be
fetched.

*Continue* routes to `/cars/[id]/book`, which is Renter-guarded. A signed-out visitor is
sent to `/login?next=…` — do not hide the button, since hiding it hides the product.

---

## Done when

- [ ] Landing search lands on `/search` with dates pre-filled and populated results.
- [ ] Every filter is reflected in the URL; a pasted URL reproduces the exact result set.
- [ ] Back and forward move through filter states correctly.
- [ ] Skeletons occupy the same space as loaded cards — no layout shift.
- [ ] A nonsense city shows the empty state, and both repair buttons work.
- [ ] Pagination is server-side and the page survives a refresh.
- [ ] Car detail renders a gallery despite `CarDto` carrying no images.
- [ ] Absent features are struck through, not missing.
- [ ] At 390px the booking panel becomes a fixed bottom bar.

---

## Notes

Two calls per car-detail page is a known, temporary cost. Comment the workaround at the call
site and link it to the backend fix so it is deleted rather than forgotten once `CarDto`
carries images.
