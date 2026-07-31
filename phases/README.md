# Frontend build phases

The frontend is specified in [`frontend/DESIGN.md`](../frontend/DESIGN.md) and mocked in
`carrental-mockups.html`. This directory breaks that spec into ordered, shippable phases.

| Phase | Scope | Depends on |
|---|---|---|
| [0 — Scaffold](phase-0-scaffold.md) | Land the spec, stand up Next.js + design tokens | — |
| [1 — API layer](phase-1-api-layer.md) | Typed client, enums, pricing, auth store | 0 |
| [2 — Auth & shell](phase-2-auth-shell.md) | `AppShell`, login, register, route guards | 1 |
| [3 — Discovery](phase-3-discovery.md) | Landing, search, car detail | 2 |
| [4 — Booking](phase-4-booking.md) | Checkout, booking detail, my trips | 3 |
| [5 — Account & verification](phase-5-account-verification.md) | Profile, KYC upload | 2 |
| [6 — Owner workbench](phase-6-owner.md) | Dashboard, listings, wizard, inbox, inspection | 2 |
| [7 — Admin](phase-7-admin.md) | Verification queue, user table | 2 |
| [8 — Hardening](phase-8-hardening.md) | Error boundaries, a11y, mobile, CI | 3–7 |

Phases 5, 6 and 7 are independent of each other once 1–4 land. They can be reordered or
built in parallel.

---

## Verified API facts

Everything below was read off the backend source, not inferred from the spec. Where it
contradicts `DESIGN.md`, **this file is correct** — see [Spec corrections](#spec-corrections).

### Base URL

| Profile | URL |
|---|---|
| https | `https://localhost:7077` |
| http | `http://localhost:5071` |

`Cors:AllowedOrigins` in `backend/API/appsettings.json` whitelists `http://localhost:3000`,
`:5173` and `:4200`, with `AllowAnyHeader`, `AllowAnyMethod` and `AllowCredentials`. The
Next.js dev server on `:3000` is covered.

The https profile uses the ASP.NET dev certificate, which Node rejects on server-side
fetches. Either trust it (`dotnet dev-certs https --trust`) or point server-side calls at
the http profile.

### Endpoint inventory

| Method | Route | Auth (from `[Authorize]` on the request type) | Returns |
|---|---|---|---|
| `POST` | `/api/auth/register` | public | `AuthenticationResult` |
| `POST` | `/api/auth/login` | public | `AuthenticationResult` |
| `POST` | `/api/auth/refresh` | public | `AuthenticationResult` |
| `POST` | `/api/auth/logout` | public | `204` |
| `GET` | `/api/cars/search` | public | `{ cars, totalCount, pageNumber, pageSize, totalPages }` |
| `GET` | `/api/cars` | public | `CarDto[]`, unpaginated |
| `GET` | `/api/cars/{id}` | public | `CarDto` — **no images** |
| `POST` | `/api/cars` | Owner, Admin, Staff | `201` + car `Guid` |
| `PUT` | `/api/cars/{id}` | Owner, Admin, Staff | `204` |
| `DELETE` | `/api/cars/{id}` | Admin, Owner, Staff | `204` |
| `POST` | `/api/cars/{id}/images` | **public** | image `Guid` |
| `DELETE` | `/api/cars/images/{imageId}` | **public** | `204` |
| `POST` | `/api/bookings` | Renter, Admin, Staff | booking `Guid` |
| `GET` | `/api/bookings` | **public** | `{ bookings, totalCount, pageNumber, pageSize, totalPages }` |
| `GET` | `/api/bookings/{id}` | **public** | `BookingDto` |
| `POST` | `/api/bookings/{id}/cancel` | Renter, Admin, Staff | `204` |
| `POST` | `/api/bookings/{id}/start` | Owner, Admin, Staff | `204` |
| `POST` | `/api/bookings/{id}/end` | Owner, Admin, Staff | `204` |
| `POST` | `/api/users` | **public** | user `Guid` |
| `GET` | `/api/users/{id}` | **public** | `UserDto` |
| `PUT` | `/api/users/{id}` | **public** | `204` |
| `DELETE` | `/api/users/{id}` | Admin | `204` |
| `POST` | `/api/users/{id}/verification` | **public** | `{ url }` |
| `GET` | `/api/users/pending-verifications` | Staff, Admin | `PendingVerificationDto[]` |
| `POST` | `/api/users/{id}/process-verification` | Staff, Admin | `204` |

Routes marked **public** are not a design choice — no controller carries `[Authorize]`, and
authorization is applied only by `AuthorizationBehavior` reading the attribute off the
MediatR request type. Anything whose command or query lacks the attribute is unauthenticated.
The frontend must still gate these in the UI; it just cannot rely on the server to do so.

### Status codes

`ExceptionHandlingMiddleware` is the only place exceptions become status codes:

| Exception | Status | Body |
|---|---|---|
| `ValidationException` | `400` | `{ "errors": { "PropertyName": ["message", …] } }` |
| `NotFoundException` | `404` | `{ "error": "…" }` |
| `UnauthorizedAccessException` | `401` | `{ "error": "Authentication is required." }` |
| `ForbiddenAccessException` | `403` | `{ "error": "You do not have permission…" }` |
| anything else | `500` | `{ "error": "An internal server error occurred." }` |

Business-rule failures throw plain `Exception` — "Car is not available for the selected
dates.", "Booking is already cancelled." — so they arrive as a **generic 500 with no
detail**. The client must supply the human message from operation context.

**Not every "not found" is a 404.** `GetCarById`, `UpdateCar` and `DeleteCar` throw plain
`Exception` rather than `NotFoundException`, so a **missing car returns 500**. Users and
bookings use the typed exception and do return 404. A car detail page therefore cannot tell
"no such car" from "server broke" — see [known defects](README.md#known-backend-defects).

The full list of business-rule 500s, from the handler source:

| Operation | Server message (never shown to the user) |
|---|---|
| register | "User with this email already exists." |
| login | "Invalid email or password." |
| refresh | "Invalid token." |
| create booking | "Car is not available for the selected dates." |
| cancel booking | "Booking is already cancelled." / "Completed bookings cannot be cancelled." |
| start trip | "Trip can only be started for Confirmed or Pending bookings." |
| end trip | "Trip can only be ended for InProgress bookings." |
| upload image / document | "Image upload failed." / "Document upload failed." |
| process verification | "No verification record found for this user." |
| get / update / delete car | "Car with ID {id} not found." |

The `400` body maps directly onto form fields: keys are PascalCase C# property names.

### Serialization

`Program.cs` registers bare `AddControllers()` with no `JsonStringEnumConverter`, so
**every enum is an int in both request and response bodies**. Query strings differ:
`SearchCarsRequest.Category` is typed `string?`, while `SearchBookingsRequest.Status` is a
typed enum that model-binds either a name or an int.

All datetime columns are `timestamptz`. Npgsql throws on non-UTC `DateTime`, so every date
crossing the wire goes through a single `toUtcIso()` helper.

### Enums

```
UserRole                 Renter 0 · Owner 1 · Admin 2 · Staff 3
UserStatus               Active 0 · Inactive 1 · Suspended 2
VerificationStatus       Pending 0 · Verified 1 · Rejected 2 · Unverified 3
GovernmentIdType         Passport 0 · NationalId 1 · DriversLicense 2
VerificationDocumentType GovernmentId 0 · DriverLicenseFront 1 · DriverLicenseBack 2
BookingStatus            Pending 0 · Confirmed 1 · InProgress 2 · Completed 3 · Cancelled 4 · Disputed 5
InspectionType           Pickup 0 · Return 1
TransmissionType         Manual 0 · Automatic 1 · SemiAutomatic 2
FuelType                 Petrol 0 · Diesel 1 · Electric 2 · Hybrid 3 · LPG 4
CarCategory              Economy 0 · Compact 1 · Intermediate 2 · Standard 3 · FullSize 4 ·
                         Luxury 5 · Premium 6 · SUV 7 · Minivan 8 · Convertible 9 · Pickup 10
CarImageType             Exterior 0 · Interior 1 · Engine 2 · Document 3
```

`AuthenticationResult.role` is the one exception — a **string**, not an int.

### Pricing

Computed and snapshotted server-side in `CreateBookingCommandHandler`:

```
totalDays   = floor(end - start) in days, minimum 1
subtotal    = totalDays × car.PricePerDay
serviceFee  = subtotal × 0.10
taxAmount   = subtotal × 0.05
totalAmount = subtotal + serviceFee + taxAmount + car.SecurityDeposit
```

The client never sends money. `lib/pricing.ts` mirrors this formula so the quote shown
before submit matches the booking that comes back.

### Rate limiting

A fixed-window limiter of **5 requests per minute shared across the whole `/api/auth`
surface** — login, register, refresh and logout compete for one budget, `QueueLimit = 0`.
Exceeding it returns `503` by default, not `429`; confirm which against the running API and
handle both.

---

## Spec corrections

`frontend/DESIGN.md` was written before commit `48f94d7 "fix : identity"`. Four rules in §5
are now wrong and must be fixed in Phase 0 before code is written against them.

1. **`renterId` and `cancelledByUserId` are no longer client-supplied.** Both handlers read
   `ICurrentUserService.UserId` off the JWT. `CreateBookingCommand` is
   `(CarId, StartDate, EndDate)`; `CancelBookingCommand` is `(BookingId, CancellationReason)`.
   Sending the old fields sends properties the DTOs do not have. Only `GET /api/bookings`
   still accepts `renterId` / `ownerId`, as filters.

2. **`UnauthorizedAccessException` maps to 401, not 500.** The middleware has an explicit
   401 case. Proactive refresh scheduled off `expiry` remains the right primary strategy,
   but a reactive 401 backstop is now viable and worth having.

3. **`ForbiddenAccessException` returns a JSON body**, not an empty 403:
   `{ "error": "You do not have permission to perform this action." }`.

4. **Enums are ints in responses too**, not only in request bodies.

---

## Toolchain notes

Recorded during Phase 0. The scaffold resolved to newer major versions than
`DESIGN.md` assumed, and several of its conventions differ.

**Next.js 16.2.12 · React 19.2.4 · Tailwind v4 · shadcn 4.16 (`radix-nova`)**

Next 16 ships its own `AGENTS.md` warning that its APIs differ from most training
data, and bundles its documentation at `frontend/node_modules/next/dist/docs/`.
**Read the relevant guide there before writing app code** — the full breaking-change
list is in `01-app/02-guides/upgrading/version-16.md`. The ones that reach this project:

| Change | Affects |
|---|---|
| `params` and `searchParams` are **async** — `await` them | every dynamic route in phases 3, 4, 6, 7 |
| `middleware.ts` is renamed **`proxy.ts`** | route guards, if done at the edge (Phase 2) |
| Turbopack is the default bundler for `dev` and `build` | — |
| `images.domains` is deprecated; `remotePatterns` only | done in Phase 0 |
| `images.qualities` now defaults to `[75]` alone | `cloudinaryThumb`, Phase 1 |
| `next lint` is removed — call `eslint` directly | CI, Phase 8 |
| Parallel routes require an explicit `default.js` | owner/admin shells, phases 6–7 |
| ESLint flat config only | Phase 8 |

**Tokens are complete colours, not channel triplets.** shadcn no longer writes
`--background: 0 0% 100%` for use as `hsl(var(--background))`; `@theme inline` maps
`--color-*: var(--*)`, so each variable must resolve to a colour on its own.
`globals.css` therefore wraps the spec's triplets as `hsl(...)`. Two exceptions:
`--primary` and `--ring` are stated as hex, because `hsl(175 76% 26%)` rounds to
`#10756C` — two points off the named brand colour `#0F766E`.

**`--accent` stays neutral.** In shadcn's vocabulary `accent` is the hover/active
*surface*, not the brand accent. The teal lives in `--primary` alone; making
`--accent` teal would turn every dropdown row and calendar cell teal.

**No `form` component.** See `frontend/DESIGN.md` §6 — `field` primitives replace it.

**The React Compiler lint rules are on.** `react-hooks/set-state-in-effect` rejects
the conventional `const [mounted, setMounted] = useState(false); useEffect(() =>
setMounted(true), [])` hydration guard. Prefer a CSS-driven solution where one
exists — `theme-toggle.tsx` renders both icons and swaps them with the `dark:`
variant, which also paints correctly on the first frame.

---

## Known backend defects

Found while verifying the API. None block the frontend; all are worth an issue.

- **Overlap check misses the enclosing case.** `CreateBookingCommandHandler.cs:41` tests
  `(start >= b.Start && start < b.End) || (end > b.Start && end <= b.End)`. A requested
  range that strictly contains an existing booking satisfies neither clause and is accepted.
  The standard predicate is `start < b.End && end > b.Start` — which
  `SearchCarsQueryHandler.cs:52` already uses correctly. The two disagree.
- **Search and booking-create disagree on what blocks a car.** Search excludes only
  `Confirmed` and `InProgress`; create excludes everything except `Cancelled`. A car with a
  `Pending` booking therefore **appears available in search and is refused at checkout** —
  the user hits "Those dates were just taken" on a car the site just offered them. This is
  the most user-visible of the defects here.
- **`Completed` bookings still block creation** — that check excludes only `Cancelled`.
- **Three car handlers return 500 instead of 404.** `GetCarById`, `UpdateCar` and
  `DeleteCar` throw plain `Exception` for a missing car where every user and booking handler
  throws `NotFoundException`.
- **`MileageLimit` is never copied from `car.DailyMileageLimit`** at booking creation, so
  the extra-mileage branch is dead code and the line always renders zero.
- **No `[Authorize]` on several state-changing use cases** — car image upload and delete,
  user create and update, and verification document upload are all unauthenticated.
- **No file size or MIME validation server-side.** An oversized upload becomes a 500.
