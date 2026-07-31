# CarRental — frontend

Next.js 16 App Router client for the [.NET 9 API](../README.md) in this repository.

- **Design spec:** [`DESIGN.md`](DESIGN.md) — screens, tokens, copy rules
- **Build phases:** [`../phases/`](../phases/) — what was built when, and the API
  facts each phase was verified against
- **Next 16 warning:** [`AGENTS.md`](AGENTS.md) — this is not the Next.js most
  documentation describes; read the bundled guides before writing app code

---

## Prerequisites

| Requirement | Notes |
| --- | --- |
| **Node 20+** | Next 16 and the React Compiler lint rules need it. CI uses 22. |
| **The API running** | Everything past the landing page needs it. See [below](#running-against-the-api). |
| **PostgreSQL** | Only indirectly — the API needs it. |

No Cloudinary account is needed on this side; photos are absolute URLs the API
returns.

---

## Quick start

```bash
cd frontend
npm install
cp .env.example .env.local     # then edit if your API is not on the default port
npm run dev
```

Open http://localhost:3000.

---

## Environment

One variable, in `.env.local`:

```
NEXT_PUBLIC_API_BASE_URL=https://localhost:7077
```

It is read **per call** rather than captured at module load, so the verification
scripts can point the client at a stub server. Next inlines
`process.env.NEXT_PUBLIC_*` at build time wherever it appears, so this is
identical in the browser bundle.

If it is unset you get a console warning in development and every request goes
to a relative URL, which will 404.

### Running against the API

The backend ships two dev profiles (`backend/API/Properties/launchSettings.json`):

| Profile | URL |
| --- | --- |
| https | `https://localhost:7077` |
| http | `http://localhost:5071` |

`http://localhost:3000` is already whitelisted under `Cors:AllowedOrigins` in
`backend/API/appsettings.json`, so the browser side needs no further setup.

**The https profile needs the dev certificate trusted.** Node rejects it on
server-side fetches — which is most of the search and car-detail pages, since
they render on the server. Either trust it once:

```bash
dotnet dev-certs https --trust
```

…or point `NEXT_PUBLIC_API_BASE_URL` at the http profile instead.

Start the API from the repository root:

```bash
dotnet run --project backend/API
```

---

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server on :3000 (Turbopack) |
| `npm run build` | Production build |
| `npm run lint` | ESLint, flat config — `next lint` was removed in Next 16 |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run verify` | The three hermetic check suites below |
| `npm run verify:logic` | Pure logic: pricing, dates, validators, booking rules |
| `npm run verify:client` | The API client against a stub server |
| `npm run verify:contrast` | WCAG contrast over the real tokens, both themes |
| `npm run verify:live` | The renter loop against the **running** API |

`npm run verify` is what CI runs. It touches no network and no database.

### Why there are verification scripts and not a test runner

The risk in this codebase is **drift from the API**, not regressions in
component rendering. `lib/pricing.ts` duplicates arithmetic that lives in
`CreateBookingCommandHandler`; `lib/car-form.ts` duplicates every rule in
`CreateCarCommandValidator`. The duplication is deliberate — a quote has to
match the booking that comes back, and a form has to reject what the server
would reject — which makes drift the thing worth pinning.

`verify:live` is the only one that proves the contract, because only a running
.NET API can confirm property names and status codes. It registers a throwaway
renter, books a car and cancels it, so it **writes to the database**. It skips
itself if the API is unreachable.

---

## Layout

```
src/
├── app/
│   ├── (auth)/              login, register — no site chrome
│   ├── (site)/              the renter-facing app, under AppShell
│   ├── owner/               the owner workbench, under OwnerShell
│   ├── ops-console-9d4f1a/  staff console — the directory name IS the
│   │                        obscured path, see lib/admin-routes.ts
│   ├── error.tsx            per-segment boundaries; global-error.tsx is the
│   └── not-found.tsx        backstop for a failing root layout
├── components/
│   ├── ui/                  shadcn primitives — regenerate, don't hand-edit
│   └── …                    feature components
├── lib/
│   ├── api/                 one module per resource + the request layer
│   ├── enums.ts             mirrors of the backend enums; the ints are contract
│   └── …                    pure logic, exercised by verify:logic
└── types/api.ts             hand-written DTO mirrors — these *are* the contract
```

There is no OpenAPI codegen step. `types/api.ts` and `lib/enums.ts` are
hand-maintained; check them against `/swagger` when the backend changes.

---

## Things that will surprise you

**Every enum is an int on the wire.** `Program.cs` registers no
`JsonStringEnumConverter`. `AuthenticationResult.role` is the single exception —
it is a string.

**Query strings differ from bodies.** `SearchCarsRequest.Category` is typed
`string?` server-side and wants the enum *name*; `SearchBookingsRequest.Status`
binds either form.

**Business-rule failures arrive as a bare 500.** The API throws plain
`Exception` for "car is not available", "booking already cancelled" and the
rest, so the operation context is the only information available.
`lib/api/errors.ts` is where that context becomes a sentence. Raw server text
never reaches a user. The exception is **409**, whose message is written for the
reader and is passed through verbatim.

**Rate limiting returns 503, not 429.** `/api/auth/*` shares one
5-requests-per-minute budget across login, register, refresh and logout. The
client treats both codes as rate limiting.

**Dates must be UTC.** All datetime columns are `timestamptz` and Npgsql throws
on a non-UTC `DateTime` — a local-time ISO string is a 500, not a validation
error. Everything crossing the wire goes through `toUtcIso()`.

**Tokens live in `localStorage`.** The API returns them in the response body and
offers no cookie flow, so this is the available option, not the preferred one.
Refresh is proactive, scheduled off `expiry`; nothing ever retries, because a
refresh loop would exhaust the shared auth budget and lock the user out.

---

## Accessibility and mobile

Both are checked, not assumed:

- `npm run verify:contrast` parses `globals.css` and measures every text and
  UI-boundary pair against WCAG AA in **both** themes. It caught
  `--muted-foreground` sitting at 4.48:1 against a 4.5 requirement.
- Layouts are verified at a 390px mobile viewport with no horizontal scroll.
- Status is never carried by colour alone — every pill is dot + label +
  background.
- Interactive targets are 44px minimum.
