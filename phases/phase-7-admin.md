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

- [ ] The queue expands multi-document users into per-document rows.
- [ ] The counter is accurate and updates after each decision.
- [ ] Approve advances to the next item with no mouse travel.
- [ ] Reject requires a reason before enabling.
- [ ] A licence decision collapses both front and back rows at once.
- [ ] Document images are legible and zoomable.
- [ ] A `Renter`-role user hitting `/admin` gets a clean 403, not a crash.
- [ ] `/admin/users` is honest about what the API supports.

---

## Notes

This is the smallest phase and a good first one to hand to someone new — the endpoints are
few, the authorization is real, and the surface is self-contained.
