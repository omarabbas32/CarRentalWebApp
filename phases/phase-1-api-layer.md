# Phase 1 — The API layer

**Depends on:** Phase 0
**Delivers:** every endpoint callable and fully typed, with no UI.

---

## Why this phase exists

This is the load-bearing phase. Every screen in phases 2–7 is a thin arrangement of calls
made here. The backend has sharp edges — generic 500s for business failures, int enums, UTC
strictness, a 5/min auth budget — and each one should be absorbed in exactly one place. If
these leak into components, they leak into twenty of them.

Build it with no UI at all. Verify from a scratch route or a test file.

---

## Tasks

### 1. `src/lib/enums.ts`

TypeScript enums for all eleven backend enums, with the numeric values in
[the inventory](README.md#enums), plus a label map per enum for display.

```ts
export enum BookingStatus { Pending = 0, Confirmed = 1, InProgress = 2, Completed = 3, Cancelled = 4, Disputed = 5 }

export const bookingStatusLabel: Record<BookingStatus, string> = {
  [BookingStatus.Pending]: 'Pending',
  [BookingStatus.InProgress]: 'In progress',
  // …
}
```

Labels are user-facing copy, not enum names — `In progress`, not `InProgress`.

`AuthenticationResult.role` is a **string** (`"Renter"`, `"Owner"`, `"Admin"`, `"Staff"`).
Export a `parseRoleName(name: string): UserRole` for it and use it at exactly one boundary:
the auth store.

Also export the status pill colour map from `DESIGN.md` §2 keyed by `BookingStatus`, with
light and dark foreground and background per status.

### 2. `src/types/api.ts`

Hand-mirror the DTOs. There is no OpenAPI codegen step, so these are the contract:
`AuthenticationResult`, `CarDto`, `CarSearchResultDto`, `BookingDto`, `UserDto`,
`PendingVerificationDto`, `Point`, and the paged-result wrapper.

Two shapes to get right:

- `CarDto` has **no** `imageUrls`. Only `CarSearchResultDto` does. Encode that in the types
  so the gap is a compile error rather than a runtime `undefined`.
- `CarDto.location` is `Point { lat: number; lng: number }` and is non-nullable on create.

Verify the paged wrapper's exact property names against `/swagger` before writing it —
`GetCarsQueryHandler` and `GetBookingsQueryHandler` are the source of truth.

### 3. `src/lib/dates.ts`

```ts
export function toUtcIso(d: Date): string
```

Every date crossing the wire goes through it. Npgsql throws on a non-UTC `DateTime`, so a
local-time ISO string is a 500. Pickers work in local time and convert on the way out.

Also `daysBetween(start, end)` mirroring the server: floored day difference, minimum 1.

### 4. `src/lib/pricing.ts`

One module, one export, mirroring `CreateBookingCommandHandler` exactly:

```ts
export function priceBreakdown(pricePerDay: number, securityDeposit: number, start: Date, end: Date): {
  totalDays: number; subtotal: number; serviceFee: number; taxAmount: number; total: number
}
```

`serviceFee = subtotal × 0.10`, `taxAmount = subtotal × 0.05`,
`total = subtotal + serviceFee + taxAmount + securityDeposit`.

Nothing else in the app may compute a price. The checkout quote and the returned booking
must agree, and one formula in one file is what guarantees that.

### 5. `src/lib/cloudinary.ts`

```ts
export function cloudinaryThumb(url: string, width: number): string
```

Injects a transformation segment after `/upload/`. Guard against a URL that already has
one, and pass through anything that is not a Cloudinary URL unchanged.

### 6. `src/lib/api/client.ts`

A `fetch` wrapper that:

- prefixes `NEXT_PUBLIC_API_BASE_URL`;
- injects `Authorization: Bearer <token>` from the auth store when present;
- serialises bodies as JSON with **int** enums, and query strings with the conventions in
  [Serialization](README.md#serialization) — `category` as a name, booking `status` either way;
- on a non-2xx, parses the body and throws a typed `ApiError { status, fieldErrors?, message }`.

The `400` body is `{ errors: { PropertyName: [msg, …] } }` with PascalCase C# property names.
Parse it into a camelCase field-error map so react-hook-form can consume it directly.

### 7. `mapApiError(operation, status)`

The single most important function in this phase. Business failures throw plain `Exception`
server-side and arrive as a **generic 500 with no detail** — the operation context is the
only information available about what actually went wrong.

```ts
mapApiError('createBooking', 500)  // 'Those dates were just taken. Try different dates.'
mapApiError('login', 500)          // 'Email or password is incorrect.'
mapApiError('cancelBooking', 500)  // 'This booking can no longer be cancelled.'
```

**Raw server text never reaches a user.** Every operation the app performs gets an entry.
The known business-rule 500s worth mapping:

| Operation | Server message | User-facing |
|---|---|---|
| create booking | "Car is not available for the selected dates." | Those dates were just taken |
| cancel booking | "Booking is already cancelled." / "Completed bookings cannot be cancelled." | This booking can no longer be cancelled |
| login | credential failure | Email or password is incorrect |

Handle `401`, `403`, `404` and `400` generically — those carry real information.

### 8. Endpoint modules

One file per resource under `src/lib/api/`: `auth.ts`, `cars.ts`, `bookings.ts`, `users.ts`.
Cover every route in [the inventory](README.md#endpoint-inventory). Each function is typed
in and out, and passes its own operation key to `mapApiError`.

`createBooking` takes `{ carId, startDate, endDate }` and **nothing else** — no `renterId`.
`cancelBooking` takes `{ bookingId, cancellationReason }` — no `cancelledByUserId`.

### 9. Auth store

There is no `GET /api/auth/me`, so the session is built entirely from the login or register
response payload (`userId`, `email`, `firstName`, `lastName`, `role`, `token`, `refreshToken`,
`expiry`) and persisted client-side.

Refresh is **proactive**: schedule it off the `expiry` field, firing ~60s early. The token
lives 60 minutes and `ClockSkew` is zero, so an expired token is rejected the instant it
lapses. Add a reactive 401 backstop — the middleware does return 401 — but do not rely on
it as the primary mechanism.

Refresh competes with login, register and logout for **one 5-request-per-minute budget**.
Never retry a failed refresh in a loop; a refresh storm locks the user out of logging in.

`POST /api/auth/refresh` needs `{ token, refreshToken, ipAddress }` and logout needs
`{ refreshToken, ipAddress }`. The browser cannot know its own IP — send `null` or an empty
string and confirm the server tolerates it. If it does not, that is a backend fix.

### 10. `RoleGuard`

A component that reads the store and redirects when the role does not match. Note that
several state-changing endpoints have no server-side authorization at all (see the inventory)
— the guard is a UX affordance, not a security boundary, and should be commented as such.

---

## Done when

- [ ] Every endpoint has a typed function; `npx tsc --noEmit` passes.
- [ ] Register → login → a token-bearing call → refresh → logout all succeed against a
      running API.
- [ ] A booking created through the client returns totals matching `priceBreakdown()` to
      the cent.
- [ ] A 400 from `POST /api/cars` produces a camelCase field-error map.
- [ ] A forced business-rule 500 (book already-booked dates) surfaces a human sentence,
      never "An internal server error occurred."
- [ ] Six rapid auth calls surface the rate-limit state rather than a generic failure.

---

## Notes

Confirm the rate-limit status code against the running API before writing the handler.
ASP.NET's fixed-window limiter rejects with **503** by default, not 429, and `DESIGN.md`
assumes 429. Handle whichever it actually returns — and both, cheaply.
