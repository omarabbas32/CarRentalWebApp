# Phase 5 — Account and verification

**Depends on:** Phase 2 (independent of 3, 4, 6, 7)
**Delivers:** a user can maintain their profile and submit identity documents.

---

## Why this phase exists

Verification is the one flow every role shares. It is also the flow where the UI is most
tempted to invent structure the data model cannot hold — three documents, but only two
statuses — and where the server does the least validation.

---

## Tasks

### 1. Profile `/account`

Read `GET /api/users/{id}` → `UserDto`: email, phone, first and last name, role, status, and
the two verification booleans (`identityVerified`, `driverLicenseVerified`).

Edit via `PUT /api/users/{id}` with `{ email, phoneNumber, firstName, lastName }`. Role,
status and the verification flags are **not** editable here — the update command does not
accept them.

`UpdateUserCommandValidator` is the source of the client-side rules; mirror it rather than
guessing. Password change has no endpoint: show it disabled with an explanation, per
`DESIGN.md` §5.

`PUT /api/users/{id}` carries **no server-side authorization** — any caller can update any
user by ID. Guard client-side to the signed-in user and comment that the server does not
enforce it. Worth an issue on the backend track.

### 2. Verification `/account/verification`

Three upload tiles — **licence front**, **licence back**, **government ID** — each with its
own status pill, drag-and-drop, preview, and a progress bar across the top.

Upload posts `multipart/form-data` to `POST /api/users/{id}/verification`:

| Field | Type |
|---|---|
| `File` | the file |
| `Type` | `VerificationDocumentType` int — `GovernmentId 0`, `DriverLicenseFront 1`, `DriverLicenseBack 2` |
| `IdType` | `GovernmentIdType` int, government ID only — `Passport 0`, `NationalId 1`, `DriversLicense 2` |

Returns `{ url }`.

**The backend collapses licence front and back into a single `DriverLicenseStatus`.**
Approving either side flips both tiles together. Mirror the data model; do not invent
granularity the system cannot persist.

Statuses come from `VerificationStatus`: `Pending 0`, `Verified 1`, `Rejected 2`,
`Unverified 3`. Note that `UserDto` exposes only two **booleans**, while
`PendingVerificationDto` exposes the full status — so a renter can see verified-or-not but
not pending-versus-rejected. Confirm what `GET /api/users/{id}` actually returns before
designing the pill states; if only booleans are available, the tile shows *Verified* or
*Not verified* and nothing finer.

> **API gap.** `reason` is accepted on review and never stored, so a rejection message
> cannot yet be specific. Show a generic rejection state and link to the backend fix.

**Client-side file validation is the only validation.** There is no size or MIME check
server-side, and an oversized upload becomes a 500. Enforce before upload:

- MIME in `image/jpeg`, `image/png`, `image/webp` (confirm what Cloudinary is configured to
  accept);
- a maximum size — 10MB is a reasonable default; verify against Kestrel's multipart limit,
  which defaults to ~28MB;
- reject with a message saying what to do, not what is wrong.

`POST /api/users/{id}/verification` is also **unauthenticated** — any caller can upload
documents against any user ID. Guard client-side and file it.

---

## Done when

- [x] Profile loads, edits save, and validation errors land on the right fields.
- [x] All three tiles upload and preview; progress is real (`XMLHttpRequest`).
- [x] Approving a licence side flips both licence tiles together — **verified live**.
- [x] An oversized, empty or wrong-type file is rejected client-side with an actionable
      message, never reaching the server.
- [x] Government ID upload sends `IdType`; the other two do not.
- [x] Verification state is reflected on the checkout nudge from Phase 4.

---

## Outcome

Complete. `/account` and `/account/verification` build and serve. Upload was exercised
against the live API and Cloudinary — `POST /api/users/{id}/verification` returned
`{"url":"https://res.cloudinary.com/…"}`. 37 offline checks pass.

### Security finding — self-registration grants Admin

Found while testing the verification queue. `POST /api/auth/register` accepts `role: 2` and
returns an Admin token, which reads other users' identity documents. Full detail and fix in
[phases/README.md](README.md#security-privilege-escalation-via-self-registration). **This
outranks every other backend item.**

### Resolved: the open question in §2

This document asked whether `GET /api/users/{id}` exposes verification *status* or only
booleans. **Only booleans** — confirmed live, before and after an upload:

| | before upload | after uploading a licence |
|---|---|---|
| `driverLicenseVerified` | `false` | `false` |

The underlying `VerificationStatus` is set to `Pending` by the upload handler, but it lives
on `UserVerification` and is returned **only** by the Staff/Admin `pending-verifications`
endpoint. So a renter who submits a document and reloads the page would see "Not sent" on
something they definitely sent.

The tiles therefore record submissions in `localStorage` (`carrental.verification.sent`) —
a fact about what the user did, not a claim about the review outcome — and the copy is
explicit: *"You'll see 'Verified' here once it's done — we can't show progress before
then."* Delete that workaround once `UserDto` carries the two statuses.

> **API gap, now the second priority after the security fix.** Add
> `governmentIdStatus` and `driverLicenseStatus` to `UserDto`. Without them a user cannot
> tell submitted from rejected, and `reason` is still never stored — confirmed, the
> `pending-verifications` payload has no reason field at all.

### Phone numbers block every profile edit

`RegisterCommand` never collects a phone number, so every account created through sign-up
has `phoneNumber: ""`. But `UpdateUserCommandValidator` **requires** one matching
`^\+?[1-9]\d{1,14}$`. A user who only wanted to correct a typo in their name gets a 400 on
a field they were never asked for.

The form states this up front with an inline notice rather than letting them discover it on
submit, and the hint spells out the format — E.164, no spaces or dashes, no leading zero.

### Notes

Upload uses `XMLHttpRequest` because `fetch` reports no upload progress. These are phone
photos over phone connections; a bar that does not move reads as a hang, and a user who
refreshes mid-upload loses the file. `lib/api/upload.ts` keeps the same bearer token and
`ApiError` wording as `apiRequest`.
