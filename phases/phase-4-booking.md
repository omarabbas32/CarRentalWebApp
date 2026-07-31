# Phase 4 — Booking

**Depends on:** Phase 3
**Delivers:** the renter loop closes — request a car, see it, cancel it, find it later.

---

## Why this phase exists

This is where money and state appear, and where the backend's generic 500s hurt most. Two
rules carry the phase: the client never computes an authoritative price, and the UI never
offers an action the server would reject.

---

## Tasks

### 1. Checkout `/cars/[id]/book`

Dates → car summary → verification nudge → cancellation note, with a locked price card on
the right.

The price card renders `lib/pricing.ts` — day count, subtotal, 10% service fee, 5% tax,
security deposit, total. All figures `.tabular`. After the booking returns, **re-render from
the returned `BookingDto`**, not from the local computation. The server is the authority;
the local formula exists so the quote does not surprise.

The button reads **"Request this car"**, not "Book now". New bookings land in `Pending`.

`createBooking` sends `{ carId, startDate, endDate }` and nothing else — `renterId` comes
from the JWT. Both dates go through `toUtcIso()`.

Verification is a **nudge, not a gate**. The backend does not require verified documents to
book, and blocking here would misrepresent the system. Show the user's verification state
with a link to `/account/verification`; let them proceed either way.

On failure the only signal is a generic 500, so `mapApiError('createBooking', 500)` renders
*Those dates were just taken. Try different dates.* — with a route back to search.

Requires the Renter role (`[Authorize(Roles = "Renter,Admin,Staff")]`). An Owner-role user
gets a 403; explain it rather than showing a raw error.

### 2. Booking detail `/bookings/[id]`

A status timeline mirroring the real machine:
`Pending → Confirmed → InProgress → Completed`. `Cancelled` and `Disputed` **replace** the
track with a terminal state rather than sitting on it.

Receipt section from the snapshotted `BookingDto` fields — `pricePerDay`, `totalDays`,
`subTotal`, `serviceFee`, `taxAmount`, `securityDeposit`, `totalAmount`.

Cancel opens a dialog with a reason field, posting
`{ bookingId, cancellationReason }` — no `cancelledByUserId`.

**No refund figure is promised.** The backend never computes `refundAmount`; inventing one
would be a lie with money attached.

Cancel is **not rendered at all** once status is `Completed` or `Cancelled`, matching the
handler guards. Rendering a button whose only outcome is a 500 is a defect.

`GET /api/bookings/{id}` is unauthenticated and returns any booking by ID. Guard client-side
so a renter only reaches their own, and note in a comment that this is not enforced
server-side.

The extra-mileage line reads from `booking.extraMileageCharge` and will always be zero:
`MileageLimit` is never copied from the car at creation. Render it, or omit it until the
backend fix lands — but do not fabricate the figure.

### 3. My trips `/trips`

One query — `GET /api/bookings?renterId={me}` — and three client-side tabs:

| Tab | Statuses |
|---|---|
| Upcoming | `Pending`, `Confirmed` |
| Active | `InProgress` |
| Past | `Completed`, `Cancelled` |

The empty state sits **inside** the list, so two upcoming trips and an invitation to book
another can coexist. An empty tab is not an empty page.

`BookingRow` shows car make · model · year · colour, city, dates, status badge and total.
`BookingDto` denormalises the car fields, so no per-row car fetch is needed. It carries **no
car image** — either omit the thumbnail or accept an N+1; prefer omitting until the backend
adds it.

### 4. `BookingStatusBadge`

Dot + label + background for every status, from the colour map in `DESIGN.md` §2. Colour is
never the only signal — it must read in greyscale and for colour-blind users.

---

## Done when

Verified against the running API in Phase 8 with `npm run verify:live`, which registers a
throwaway renter, books the first car, and cancels it.

- [x] Checkout totals match the returned `BookingDto` to the cent. *(live: the client quote
      is compared component by component against the server's snapshot)*
- [x] A booking for taken dates surfaces a human message and a route back to search.
      *(live: the second booking is refused as a bare 500 and becomes "Those dates were just
      taken. Try different dates.")*
- [x] The timeline shows the correct stage; a cancelled booking shows a terminal state.
      *(live: a new booking lands in `Pending`, and cancelling moves it to `Cancelled`;
      `BOOKING_TIMELINE` excludes the terminal states, checked in `verify:logic`)*
- [x] Cancel is absent — not disabled — on completed and cancelled bookings. *(live:
      `canCancelBooking` is asserted false immediately after the cancel lands)*
- [x] Cancelling with a reason moves the booking to `Cancelled` and the UI reflects it
      without a manual refresh. *(live: status, `cancellationReason` and `cancelledAt` are
      all read back; the UI refetches through `state.reload`)*
- [x] `/trips` tabs partition correctly and each has its own in-list empty state.
      *(`verify:logic` proves the partition is total and disjoint over every status)*
- [x] No refund amount appears anywhere. *(no refund figure exists in the codebase — only
      comments explaining why)*
- [x] Every date sent is UTC; no Npgsql `DateTimeKind` 500s. *(live: the whole loop writes
      dates and none returned a 500)*

---

## Notes

Two dead paths to leave visible but honest: the extra-mileage charge (always zero until
`MileageLimit` is populated) and any `Pending → Confirmed` transition (no endpoint exists —
see Phase 6). Marking them beats hiding them; the next person then knows what to build.
