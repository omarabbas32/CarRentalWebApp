# Phase 7 — Admin

**Depends on:** Phase 2 (independent of 3, 4, 5, 6)
**Delivers:** a reviewer can clear the verification queue without leaving the keyboard.

---

## Why this phase exists

The admin surface has exactly one real job: turn `GET /api/users/pending-verifications` into
decisions. It is a **work queue, not a browser** — the design optimises for the tenth item,
not the first.

---

## Tasks

### 1. `AdminShell`

Sidebar shell: Verifications · Users. Guarded to `Admin` and `Staff` — both admin endpoints
carry `[Authorize(Roles = "Staff,Admin")]`, so this guard matches a real server boundary,
unlike most others in the app.

### 2. Verification queue `/admin/verifications`

`GET /api/users/pending-verifications` returns `PendingVerificationDto[]`:

```
userId · fullName · email
governmentIdImageUrl · governmentIdType · governmentIdStatus
driverLicenseFrontImageUrl · driverLicenseBackImageUrl · driverLicenseStatus
driverLicenseExpiryDate
```

**Rows are per document, not per user.** Each DTO carries up to three URLs and two statuses,
which the UI expands into one reviewable row per outstanding document. A user with a pending
ID and a pending licence is two rows.

Approving advances to the next item and keeps the reviewer's hands in one place. A **"1 of
7"** counter sets the expectation up front.

Decisions post to `POST /api/users/{id}/process-verification`:

```
{ documentType: VerificationDocumentType, status: VerificationStatus, reason?: string }
```

Both enums are **ints**. `documentType` is `GovernmentId 0`, `DriverLicenseFront 1`,
`DriverLicenseBack 2`; `status` is `Pending 0`, `Verified 1`, `Rejected 2`, `Unverified 3`.

Because front and back share one `DriverLicenseStatus`, a decision on either collapses both
rows. Reflect that immediately rather than leaving a stale row in the queue.

> **API gap.** `reason` is accepted and never stored. Collect it — the endpoint takes it,
> and it will start working the moment the backend persists it — but do not promise the user
> it will be shown to the applicant.

Layout: document image large enough to actually read, with zoom; applicant details beside
it; approve and reject as primary actions with keyboard shortcuts. Reject requires a reason
before it enables.

Refetch the queue after each decision, or optimistically remove the row and reconcile —
either is fine, but the count must never lie.

### 3. User table `/admin/users`

There is no list-users endpoint. `GET /api/users/{id}` fetches one user by ID and
`DELETE /api/users/{id}` removes one (`Admin` only).

So this page cannot be a table of all users. Options, in order of preference:

1. **Lookup by ID** — a single input, a `UserDto` detail card, and a guarded delete. Honest
   about what the API supports.
2. Derive a partial roster from `pending-verifications` and the `ownerId` / `renterId`
   values on bookings, and label it explicitly as partial.
3. Ship the table shell disabled with an inline note that the endpoint does not exist.

Do not fake a full user list. Whichever option is chosen, add `GET /api/users` to the
backend fix list.

---

## Done when

- [x] The queue expands users into per-**decision** items (see the deviation below).
- [x] The counter is accurate and survives the queue shrinking under the cursor.
- [x] Approve advances with no mouse travel — `A` approve, `R` reject, `←` `→` move.
- [x] Reject requires a reason before it will submit.
- [x] A licence decision resolves front and back together.
- [x] Document images are legible, and open in a new tab to zoom.
- [x] A wrong-role user gets a clean explanation, not a crash.
- [x] The users page is honest about what the API supports.

---

## Outcome

Complete. Built at an **unlisted path** at the user's request.

### The console lives at `/ops-console-9d4f1a`

Not `/admin`, which now 404s. The path is defined once in
[`lib/admin-routes.ts`](../frontend/src/lib/admin-routes.ts); to move it, rename the
directory `src/app/<value>/` **and** the constant — the App Router derives routes from
directory names, so they cannot be generated from it.

Pages carry `robots: noindex, nofollow, nocache`, and the nav link appears only for
signed-in Staff and Admin, so the path is not in the markup an anonymous visitor receives.

> **This is obscurity, not security.** Next.js ships every route in its client-side router
> manifest, so anyone reading the JavaScript bundle recovers the path in under a minute. It
> stops drive-by discovery and crawlers; it stops nothing else. The real controls are
> `[Authorize(Roles = "Staff,Admin")]` on both endpoints — genuine server-side enforcement,
> and unusually for this API, actually present — plus `RoleGuard`. If the path leaks,
> nothing is compromised.

### A backend defect found here: phantom queue entries

`VerificationStatus.Pending` is `0`, which is also the default for a freshly-created
`UserVerification`. `GetPendingVerificationsQueryHandler` filters on **status alone**, so a
user who uploads only a licence appears in the queue as also having a government ID awaiting
review — with `governmentIdImageUrl: null`.

Both rows currently in the live queue are affected. A reviewer following the API literally
would be shown an empty pane with no way to act on it.

`buildReviewQueue` therefore requires an actual image, and `countPhantomRows` surfaces how
many were dropped in a banner — a queue that silently hides entries is indistinguishable
from a broken one.

**Fix:** default the statuses to `Unverified` (3) rather than `Pending` (0), or add
`&& ImageUrl != null` to the query's predicate.

### Deviation: two decisions per user, not three rows

This document specified "one reviewable row per outstanding document". The implementation
renders one item per **decision**: Government ID, and Driving licence with front and back
shown together.

The reason is the data model. There are exactly two statuses — `GovernmentIdStatus` and
`DriverLicenseStatus` — and `ProcessVerification` flips `DriverLicenseVerified` from either
licence side. Three rows would offer a reviewer two independent licence decisions that the
server cannot store separately; acting on one would silently resolve the other. This is the
same principle §4.8 applies to the upload tiles: mirror the data model rather than inventing
granularity it cannot persist. Verified live in Phase 5 — approving the front alone set
`driverLicenseVerified: true`.

### `/ops-console-9d4f1a/users` is a lookup, not a table

There is no list-users endpoint. The page offers lookup by ID, an explicit notice saying
why there is no directory, and the one enumeration that does exist — whoever is currently in
the review queue — labelled as partial. Delete is Admin-only behind a confirmation dialog,
matching `[Authorize(Roles = "Admin")]` on `DeleteUserCommand`.

`GET /api/users` remains on the backend fix list.

### Notes

`reason` is collected on rejection and discarded by the server — confirmed against the live
`pending-verifications` payload, which has no reason field. The UI says so plainly:
*"Recorded for the reviewer only. The applicant won't see this yet."*
