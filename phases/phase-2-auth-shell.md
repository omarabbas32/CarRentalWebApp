# Phase 2 — Auth and app shell

**Depends on:** Phase 1
**Delivers:** a user can register, sign in, stay signed in across a refresh, and sign out.

---

## Why this phase exists

Every subsequent phase needs a signed-in user and a frame to render into. This phase is also
where the 5-request-per-minute auth budget becomes visible for the first time — it is a
design constraint here, not a bug to discover later.

---

## Tasks

### 1. `AppShell`

Header with logo, primary nav, theme toggle and user menu. Nav is role-aware: a Renter sees
*Find a car* and *My trips*; an Owner additionally sees *Owner*; Admin and Staff see *Admin*.
Signed-out users see *Sign in* and *Register*.

Copy follows `DESIGN.md` §7 — *Find a car*, not *Browse listings*. *My trips*, not *Bookings*.

The auth routes are a separate route group with **no site chrome**:
`src/app/(auth)/login` and `src/app/(auth)/register`.

### 2. `/login`

Split screen. Email and password, submit disabled while in flight.

There is no useful server message on a credential failure — it arrives as a generic 500 —
so the form shows `mapApiError('login', 500)`: *Email or password is incorrect.*

On success, write the session and redirect to `?next=` if present, otherwise `/`.

### 3. `/register`

Split screen, matching layout.

**Live password checklist** mirroring `RegisterCommandValidator` exactly, so a user never
submits a password the API will reject:

- at least 8 characters
- an uppercase letter — `[A-Z]`
- a lowercase letter — `[a-z]`
- a number — `[0-9]`
- a special character from `^ $ * . [ ] { } ( ) ? - " ! @ # % & / \ , > < ' : ; | _ ~ \``

Each rule shows satisfied / unsatisfied as the user types. Do not gate submit on the
checklist alone — the server is still the authority, and a 400 maps back onto fields.

First and last name are required, max 50 characters each.

Role is chosen with two cards → `UserRole` int: **Renter 0**, **Owner 1**. Admin and Staff
are not self-service and must not appear.

Register via `POST /api/auth/register` — **never** `POST /api/users`. The latter skips the
strong-password policy, returns no token, and is unauthenticated.

### 4. Rate-limit state

`/api/auth/*` shares **one 5-request-per-minute window** across login, register, refresh and
logout, with no queue. Design for it:

- submit disables during flight;
- no auto-retry anywhere;
- the limit response gets its own state — *Too many attempts. Wait about a minute and try
  again.* — distinct from a credential error.

Confirm the actual status code first: ASP.NET's fixed-window limiter returns **503** by
default, though `DESIGN.md` assumes 429. Handle both.

### 5. Route guards

Wrap protected segments in `RoleGuard`. Unauthenticated users hitting a protected route
redirect to `/login?next=<path>`. A signed-in user with the wrong role gets a 403 page, not
a redirect loop.

Guarded segments: `/trips`, `/account/**`, `/bookings/**`, `/cars/[id]/book` (Renter),
`/owner/**` (Owner), `/admin/**` (Admin, Staff).

The session lives in client storage, so guards run client-side. Render a skeleton, not
protected content, while the store rehydrates — otherwise protected markup flashes.

### 6. Session lifecycle

Rehydrate from storage on mount, re-arm the proactive refresh timer against the stored
`expiry`, and clear the session if it has already lapsed. Logout posts to
`/api/auth/logout` (revoking the refresh token server-side), clears storage, and redirects.

---

## Done when

- [x] Register with a valid password → signed in and landed on `/`. *(Phase 8: `verify:live`
      proves register returns a usable session and that its token opens a guarded call. The
      landing redirect itself is client routing, exercised by hand.)*
- [x] Every password rule lights up independently while typing, and the accepted
      special-character set matches the validator's character class exactly.
- [x] A hard refresh keeps the user signed in. *(Phase 8: the 390px sweep injects only
      `carrental.session` into `localStorage` and every guarded route renders its real
      content — which is precisely the rehydration path a hard refresh takes.)*
- [ ] A token left to expire refreshes silently. **Still not verified.** `verify:live`
      proves `refresh` rotates the token and that the rotated one works, but not that the
      *scheduled* timer fires unattended — that needs a session left idle for an hour.
- [x] The rate-limit response gets its own message and presentation, for 429 and 503.
- [x] A signed-out visit to a guarded route redirects to login and returns afterwards
      (`safeNext` verified; the round trip needs a guarded page, which arrives in Phase 3).
- [x] `signOut` clears local state even when the revoke call fails.

---

## Outcome

Complete. Routes build to `/`, `/login`, `/register`. `npm run verify` runs 43 checks
(30 logic + 13 client) and all pass.

**Rule note:** there are **five** password rules, not six — length, uppercase, lowercase,
digit, special. This document previously said six.

### A real bug the client checks caught

`toFieldErrors` lowercased only the first character, so FluentValidation's `VIN` key became
`vIN` and a VIN error would never have bound to its input. Error keys arrive as raw C#
property names — `ExceptionHandlingMiddleware` serialises that dictionary with no options,
so no naming policy applies — while response bodies go through MVC's
`JsonSerializerDefaults.Web` and *are* camelCased. The field names in `types/api.ts` follow
the response bodies, so mapping between them needs .NET's real `JsonNamingPolicy.CamelCase`,
acronyms and all. That algorithm is now ported exactly and pinned:
`VIN → vin`, `HasGPS → hasGPS`, `HasUSBCharging → hasUSBCharging`.

### Two SSR problems found and fixed

Both came from branching on `isLoading`, which is only ever true during server render:

- The header rendered a blank placeholder instead of the sign-in links, so **a visitor with
  JavaScript disabled could never reach the sign-in page**. It now renders the signed-out
  links — real anchors — and swaps to the avatar once the store resolves.
- The nav was gated entirely, so even the public "Find a car" link was missing from the
  server HTML. It now filters rather than gates: SSR yields exactly the public links.

### Decisions

- **Submit is not disabled on invalid input.** A disabled button gives no reason. The first
  attempt reveals what needs fixing; only a clean form spends one of the five requests per
  minute. Submit *is* disabled while a request is in flight.
- **`next` is validated against an open redirect.** `//evil.example`, `/\evil.example`,
  absolute URLs and `javascript:` all collapse to `/`. Sign-in is exactly when a user is
  least likely to notice being bounced off-site.
- **The special-character set is spelled out on screen.** It excludes `+` and `=`, which
  people reach for — "a special character" alone would leave a rejected user guessing.

### Verified against the live API

Register → login → refresh → logout all round-trip successfully, `ipAddress: ""` is
accepted, and the rate limiter was confirmed to return **503** (see
[Phase 1's outcome table](phase-1-api-layer.md#outcome)). The network-error path was also
confirmed in a real browser: with the API down, the register form showed
"Can't reach the server…" rather than leaking an error.

Still to confirm by hand in the browser: session persistence across a hard reload and a
silent refresh at the 59-minute mark.

---

## Notes

Do not build a "forgot password" flow — no endpoint exists. If the affordance is shown, it
ships disabled with an explanation, per `DESIGN.md` §5: features with no endpoint appear in
the design and ship disabled rather than being silently dropped.
