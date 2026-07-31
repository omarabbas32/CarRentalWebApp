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

- [ ] Profile loads, edits save, and validation errors land on the right fields.
- [ ] All three tiles upload and preview; the progress bar reflects real upload progress.
- [ ] Approving a licence side flips both licence tiles together.
- [ ] An oversized or wrong-type file is rejected client-side with an actionable message —
      never reaching the server.
- [ ] Government ID upload sends `IdType`; the other two do not.
- [ ] Verification state is reflected on the checkout nudge in Phase 4.

---

## Notes

Upload progress needs `XMLHttpRequest` or a streaming body — `fetch` gives no upload
progress events. If the progress bar is not worth that complexity, use an indeterminate
spinner rather than a fake bar.
