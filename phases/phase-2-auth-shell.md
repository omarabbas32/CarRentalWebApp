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

- [ ] Register with a valid password → signed in and landed on `/`.
- [ ] Every one of the six password rules lights up independently while typing.
- [ ] A hard refresh keeps the user signed in.
- [ ] A token left to expire refreshes silently, with no visible interruption.
- [ ] Six rapid submits produce the rate-limit message, not a generic error.
- [ ] A signed-out visit to `/trips` redirects to login and returns there after signing in.
- [ ] Logout clears storage and a back-button press does not restore the session.

---

## Notes

Do not build a "forgot password" flow — no endpoint exists. If the affordance is shown, it
ships disabled with an explanation, per `DESIGN.md` §5: features with no endpoint appear in
the design and ship disabled rather than being silently dropped.
