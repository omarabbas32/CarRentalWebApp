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

- [x] Every endpoint has a typed function; `npm run typecheck` and `npm run lint` pass.
- [x] Register → login → a token-bearing call → refresh → logout all succeed against a
      running API. *(Phase 8: `npm run verify:live` drives all five in order.)*
- [x] `priceBreakdown()` agrees with an independent replication of the C# arithmetic,
      including the truncate-toward-zero day count and the minimum of one day.
- [x] A 400 body produces a camelCase field-error map (checked against a synthetic
      payload; not yet against a real 400).
- [x] A business-rule 500 surfaces a human sentence for every operation, never
      "An internal server error occurred."
- [x] Both 429 and 503 are treated as rate limiting.

---

## Outcome

Complete as buildable, typed code. `npm run verify:logic` runs 22 checks over the pure
logic — pricing, dates, Cloudinary URLs, error mapping and enum values — and all pass.

**Verified against the live API** (2026-07-31, API on `http://localhost:5071`). Every
assumption this phase was built on now has a real response behind it:

| Assumption | Result |
|---|---|
| `AuthenticationResult` shape | ✅ exactly `token, refreshToken, expiry, userId, email, firstName, lastName, role` |
| `role` is a string, not an int | ✅ `"Owner"` |
| Search wrapper is `{ cars, … }` | ✅ `cars, totalCount, pageNumber, pageSize, totalPages` |
| Bookings wrapper is `{ bookings, … }` | ✅ same five keys |
| `imageUrls` only on the search DTO | ✅ present there, and `vin` is absent — matches `types/api.ts` |
| Enums are ints in responses | ✅ `transmission: 1`, `category: 3` |
| 400 body is `{ errors: { Key: [msg] } }` | ✅ `{"errors":{"SearchCarsQuery":["Start date must be before end date"]}}` |
| `ipAddress: ""` accepted on refresh | ✅ 200, and the refresh token rotates |
| `ipAddress: ""` accepted on logout | ✅ 204 |
| Rate limiter status code | ⚠️ **503, not 429** — see [rate limiting](README.md#rate-limiting) |
| Bad credentials | ✅ generic 500, as designed for |

**Closed out in Phase 8.** The full token lifecycle now runs in `verify:live` rather than
being spot-checked by hand: register → login → a bearer call → refresh → logout, ending
with an assertion that the revoked refresh token is refused.

That addition is also where the rate limiter stopped being a footnote. The suite spends
three of its five-per-minute `/api/auth` requests on registrations, so refresh and logout
came back as the limiter's 503 rather than being tested at all. The script now waits the
window out before the token-lifecycle group, with the reason written next to the wait —
it is the one place in the suite that proves the limit is real.

What shipped:

| File | Role |
|---|---|
| `lib/enums.ts` | 11 enums + labels, `parseRoleName`, `carCategoryName`, `CAR_FEATURES`, status classes |
| `types/api.ts` | DTO mirrors. `CarDto` had no images at all until Phase 6 extended the backend DTO; it now carries `CarImageDto[]`, ids included |
| `lib/dates.ts` | `toUtcIso`, `daysBetween`, search-range validation |
| `lib/pricing.ts` | the only pricing arithmetic in the app |
| `lib/cloudinary.ts` | `cloudinaryThumb`, transformation-aware and pass-through safe |
| `lib/api/errors.ts` | `ApiError`, `mapApiError` over 24 operations, PascalCase→camelCase field errors |
| `lib/api/client.ts` | fetch wrapper; token and 401 handler injected by registration to avoid a cycle |
| `lib/api/{auth,cars,bookings,users}.ts` | every endpoint, typed |
| `lib/auth/session-store.ts` | module store; proactive refresh, no retry, cross-tab sync |
| `components/providers/auth-provider.tsx` | `useSyncExternalStore` binding |
| `components/auth/role-guard.tsx` | client-side gating, documented as *not* a security boundary |

Decisions worth knowing:

- **The session store is a plain module, not React state.** Read via
  `useSyncExternalStore`, so rehydration needs no effect — the React Compiler lint rules
  reject setState-in-effect — and a `storage` listener syncs tabs for free.
- **`parseRoleName` throws on an unknown role** rather than defaulting to `Renter`.
  Defaulting would hand a renter's UI to someone the server considers something else.
- **Refresh never retries.** A failed refresh clears the session. Retrying spends the
  shared 5/min budget and can lock the user out of signing in.
- **The 401 backstop is skipped for `/api/auth/*`**, or a failing refresh would trigger
  another refresh.

---

## Notes

`DESIGN.md` assumed the rate limiter returns 429; ASP.NET's fixed-window limiter rejects
with **503** by default. Both are handled, but confirm which it actually returns.
