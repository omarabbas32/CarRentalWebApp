# Frontend build phases

The frontend is specified in [`frontend/DESIGN.md`](../frontend/DESIGN.md) and mocked in
`carrental-mockups.html`. This directory breaks that spec into ordered, shippable phases.

| Phase | Scope | Depends on | State |
|---|---|---|---|
| [0 — Scaffold](phase-0-scaffold.md) | Land the spec, stand up Next.js + design tokens | — | done |
| [1 — API layer](phase-1-api-layer.md) | Typed client, enums, pricing, auth store | 0 | done |
| [2 — Auth & shell](phase-2-auth-shell.md) | `AppShell`, login, register, route guards | 1 | done · 1 open |
| [3 — Discovery](phase-3-discovery.md) | Landing, search, car detail | 2 | done |
| [4 — Booking](phase-4-booking.md) | Checkout, booking detail, my trips | 3 | done |
| [5 — Account & verification](phase-5-account-verification.md) | Profile, KYC upload | 2 | done |
| [6 — Owner workbench](phase-6-owner.md) | Dashboard, listings, wizard, inbox, inspection | 2 | done |
| [7 — Admin](phase-7-admin.md) | Verification queue, user table | 2 | done |
| [8 — Hardening](phase-8-hardening.md) | Error boundaries, a11y, mobile, CI | 3–7 | done · 1 open |

Phases 5, 6 and 7 are independent of each other once 1–4 land. They can be reordered or
built in parallel.

Two boxes are deliberately still open, both because they need a person rather than a
script: a token left idle for an hour to prove the refresh timer fires unattended
(phase 2), and the renter loop driven start to finish by keyboard alone (phase 8).

### Checking your work

| Command | Needs | Covers |
|---|---|---|
| `npm run verify:logic` | nothing | pricing, dates, validators, booking and owner rules |
| `npm run verify:client` | nothing | the request layer against a stub server |
| `npm run verify:contrast` | nothing | WCAG AA over the real tokens, both themes |
| `npm run verify` | nothing | the three above — this is what CI runs |
| `npm run verify:live` | a running API **and** a database | the real contract; **writes rows** |

`verify:live` takes about 90 seconds, most of it waiting out the `/api/auth` rate-limit
window on purpose — see [rate limiting](#rate-limiting).

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
| `POST` | `/api/auth/register` | public — Renter and Owner only | `AuthenticationResult` |
| `POST` | `/api/auth/login` | public | `AuthenticationResult` |
| `POST` | `/api/auth/refresh` | public | `AuthenticationResult` |
| `POST` | `/api/auth/logout` | public | `204` |
| `GET` | `/api/cars/search` | public | `{ cars, totalCount, pageNumber, pageSize, totalPages }` |
| `GET` | `/api/cars` | public | `CarDto[]`, unpaginated |
| `GET` | `/api/cars/{id}` | public | `CarDto` — images included |
| `POST` | `/api/cars` | Owner, Admin, Staff | `201` + car `Guid` |
| `PUT` | `/api/cars/{id}` | Owner, Admin, Staff | `204` |
| `DELETE` | `/api/cars/{id}` | Admin, Owner, Staff | `204`, or `409` if it has bookings |
| `POST` | `/api/cars/{id}/images` | Owner, Admin, Staff | image `Guid` |
| `DELETE` | `/api/cars/images/{imageId}` | Owner, Admin, Staff | `204` |
| `PUT` | `/api/cars/images/{imageId}/primary` | Owner, Admin, Staff | `204` |
| `POST` | `/api/bookings` | Renter, Admin, Staff | booking `Guid` |
| `GET` | `/api/bookings` | **public** | `{ bookings, totalCount, pageNumber, pageSize, totalPages }` |
| `GET` | `/api/bookings/{id}` | **public** | `BookingDto` |
| `POST` | `/api/bookings/{id}/cancel` | Renter, Admin, Staff | `204` |
| `POST` | `/api/bookings/{id}/start` | Owner, Admin, Staff | `204` |
| `POST` | `/api/bookings/{id}/end` | Owner, Admin, Staff | `204` |
| `GET` | `/api/bookings/{id}/inspections` | signed in, participants only | `TripInspectionDto[]` |
| `POST` | `/api/bookings/{id}/inspections/{type}/photos` | Owner, Admin, Staff | photo `Guid` |
| `DELETE` | `/api/bookings/inspections/photos/{photoId}` | Owner, Admin, Staff | `204` |
| `POST` | `/api/users` | Admin | user `Guid` |
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

The three car-image routes were on that list until Phase 6. They now carry the attribute and
their handlers check ownership through `CarOwnership.EnsureCanManage`, matching `CreateCar`,
`UpdateCar` and `DeleteCar`. `POST /api/users` left it in Phase 8 — it can create an account
of *any* role, so it is Admin-only now. The booking queries, `GET`/`PUT /api/users/{id}` and
the verification upload are still open.

### Status codes

`ExceptionHandlingMiddleware` is the only place exceptions become status codes:

| Exception | Status | Body |
|---|---|---|
| `ValidationException` | `400` | `{ "errors": { "PropertyName": ["message", …] } }` |
| `NotFoundException` | `404` | `{ "error": "…" }` |
| `UnauthorizedAccessException` | `401` | `{ "error": "Authentication is required." }` |
| `ForbiddenAccessException` | `403` | `{ "error": "You do not have permission…" }` |
| `ConflictException` | `409` | `{ "error": "…" }` — **written for the user** |
| anything else | `500` | `{ "error": "An internal server error occurred." }` |

Business-rule failures throw plain `Exception` — "Car is not available for the selected
dates.", "Booking is already cancelled." — so they arrive as a **generic 500 with no
detail**. The client must supply the human message from operation context.

`ConflictException` is the exception to that, added in Phase 6. It is for a request that was
understood and permitted but that the current state refuses — deleting a car that still has
bookings. Its message is written for the caller and the client shows it verbatim; every other
status has its wording supplied client-side by `mapApiError`. Prefer it over a plain
`Exception` for any refusal a user can act on.

**Every "not found" is a 404 now.** `GetCarById`, `UpdateCar` and `DeleteCar` used to throw a
plain `Exception` for a missing car, so it came back as a 500 and a detail page could not tell
"no such car" from "server broke". All three throw `NotFoundException` as of Phase 6, matching
the user and booking handlers.

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
| upload image / document / photo | "Image upload failed." / "Document upload failed." / "Photo upload failed." |
| process verification | "No verification record found for this user." |

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

**Verified against the running API: it returns `503`, not `429`.** Eight rapid login
attempts produced `500 500 500 500 503 503 503 503` — the first four are the business-rule
failure for bad credentials, then the limiter takes over from the fifth. `DESIGN.md`
assumed 429; the client treats both as rate limiting.

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

## Security: privilege escalation via self-registration — FIXED

**Anyone could make themselves an Admin.** Reproduced against the running API on 2026-07-31,
fixed in Phase 8.

`RegisterCommandValidator` validated `Role` with `IsInEnum()`, and `UserRole` contains
`Admin = 2` and `Staff = 3`. `POST /api/auth/register` is public and unauthenticated, so the
role was simply whatever the caller asked for:

```bash
curl -X POST http://localhost:5071/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"x@example.com","password":"Passw0rd!","firstName":"X","lastName":"Y","role":2}'
# -> 200, {"role":"Admin", "token":"..."}   (now 400)
```

That token then opened every Staff/Admin surface.
`GET /api/users/pending-verifications` returned other users' **passport and driving-licence
image URLs**, and `POST /api/users/{id}/process-verification` and `DELETE /api/users/{id}`
became available.

The frontend only ever offered Renter and Owner, but that was cosmetic — the API accepted
any value regardless of what the UI sent.

**There were two routes in, not one.** `POST /api/users` (`CreateUserCommand`) was *also*
public, *also* took any `UserRole`, and had **no password rule at all** — so it granted the
same escalation and let the resulting Admin have a one-character password.

Both are closed:

```csharp
// RegisterCommandValidator — self-service sign-up, public
RuleFor(v => v.Role)
    .Must(r => r == UserRole.Renter || r == UserRole.Owner)
    .WithMessage("You can register as a renter or an owner.");

// CreateUserCommand — provisioning, Admin only
[Authorize(Roles = "Admin")]
public record CreateUserCommand(...)
```

`CreateUserCommandValidator` now carries the same five password rules as registration,
character for character, so the two cannot drift into accepting different passwords.

Privileged accounts are provisioned, not self-served. The provisioning path is
`Infrastructure/Data/DbSeeder.cs`, seeded from `Seed:Admin` in configuration, plus the
now-Admin-only `POST /api/users`.

> The `Admin` test account created during the original reproduction
> (`esc1785502655@example.com`) has been deleted from the local dev database, along with its
> refresh token. The two remaining privileged accounts are `adminOmar@admin.com` and the
> seeded `admin@carrental.local`.

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
- **`MileageLimit` is never copied from `car.DailyMileageLimit`** at booking creation, so
  the extra-mileage branch is dead code and the line always renders zero.
- **No `[Authorize]` on several state-changing use cases** — user create and update, and
  verification document upload, are still unauthenticated. The car image routes were on this
  list and are not any more.
- **No file size or MIME validation server-side.** An oversized upload becomes a 500.
- **`GET /api/bookings` and `GET /api/bookings/{id}` have no authorization** — any caller can
  read any booking by id, or list someone else's by passing their user id as a filter.
- **There is no `GET /api/cars?ownerId=`.** Owner listings filter the unpaginated
  `GET /api/cars` client-side. The response grows with the whole catalogue while the page
  shows one owner's handful.

### Fixed

Three defects found in Phase 6 were fixed alongside it. All three were code-only — the
`InspectionPhotos` table already existed — so **no migration was needed**.

- **A car with any booking history could never be deleted.** `Booking → Car` is mapped
  `OnDelete(DeleteBehavior.Restrict)` and `DeleteCarCommandHandler` checked only ownership
  before calling `Remove`, so the foreign key rejected the delete inside `SaveChangesAsync`
  and the owner got an unexplained 500. It now counts the bookings first and throws
  `ConflictException` with the count and the reversible alternative. Deleting a car it does
  accept now also removes its images from Cloudinary, which previously leaked.
- **Nothing returned a car image's id.** `CarDto` had no images at all, so `GET /api/cars`
  and `GET /api/cars/{id}` gave a caller no way to delete a photo or change a cover — the id
  existed only in the response to the upload that created it. `CarDto.Images` is now a
  `CarImageDto[]` carrying id, URL, type, `IsPrimary` and display order, ordered primary
  first; `PUT /api/cars/images/{imageId}/primary` promotes an existing photo. Deleting a
  cover promotes the next by display order, and the first photo on a car becomes its cover
  whether or not the caller asked. The three image routes are authorized and ownership-checked.
- **No endpoint accepted inspection photos.** `TripInspection.Photos` and the
  `InspectionPhoto` `DbSet` existed and nothing wrote to either.
  `POST /api/bookings/{id}/inspections/{type}/photos` and the matching delete now do, and
  `GET /api/bookings/{id}/inspections` reads back the whole inspection — fuel, cleanliness,
  damage description and photos, none of which `BookingDto` carries. Photos attach after
  `/start` or `/end` has created the inspection; uploading before that is a `409` saying so.
- **Three car handlers returned 500 instead of 404.** `GetCarById`, `UpdateCar` and
  `DeleteCar` threw plain `Exception` for a missing car. All three throw `NotFoundException`.
