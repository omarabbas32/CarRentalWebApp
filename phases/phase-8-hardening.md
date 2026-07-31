# Phase 8 — Hardening

**Depends on:** Phases 3–7
**Delivers:** the app fails gracefully, works on a phone, is usable without a mouse, and
cannot regress silently.

---

## Why this phase exists

Every previous phase optimised for the happy path. This one covers what happens when the API
is down, the screen is 390px wide, or the user never touches a pointing device — and then
locks the result in with CI so it stays true.

---

## Tasks

### 1. Error and loading boundaries

Per route segment:

- `error.tsx` — `ErrorState` with a retry that actually refetches, not a page reload.
- `loading.tsx` — skeletons matching final dimensions, not spinners, wherever the shape is
  known (search grid, car detail, trips list, owner tables).
- `not-found.tsx` — for a bad car or booking ID, distinct from a generic error.
- A global `error.tsx` at the app root as the backstop.

A 404 from the API renders "not found", not "something went wrong". `NotFoundException`
already maps to a real 404 with `{ error }`, so this distinction is available — use it.

### 2. Network and offline states

The API runs on localhost during development and **will** be down sometimes. A failed fetch
with no response must not surface as a blank page: show *Can't reach the server* with a
retry, distinct from a server error.

### 3. Accessibility pass

- Every interactive element reachable and operable by keyboard, in a sensible tab order.
- Visible focus rings — do not remove the outline without replacing it.
- Dialogs and sheets trap focus and restore it on close; Escape closes.
- Form fields have real `<label>` associations; errors are linked via `aria-describedby`
  and announced.
- Status badges carry dot + label + background — colour is never the only signal.
- Images have alt text; decorative images are `alt=""`.
- Contrast meets WCAG AA in **both** themes. The status colour pairs in `DESIGN.md` §2 were
  chosen for this — verify rather than assume.
- Loading regions use `aria-busy` or live regions so a screen reader is not left silent.

### 4. Mobile pass at 390px

Walk every route at 390px:

- Filters collapse into a sheet with an active count.
- The car detail booking panel becomes a fixed bottom bar, keeping price and action in thumb
  reach.
- Trip cards lead with the photo.
- 44px minimum touch targets throughout.
- **Nothing depends on hover** — cards get a resting border, not hover-only affordances.
- The inspection form is one column and usable while standing at a car.
- No horizontal scroll anywhere; wide tables scroll inside their own container.

### 5. Performance

- `next/image` everywhere, with `cloudinaryThumb` sizing grid thumbnails rather than
  shipping full-resolution originals.
- No layout shift on load — skeletons already hold dimensions; verify CLS.
- Check the client bundle for anything large that slipped in.
- Server-render what can be server-rendered; the search page's URL-held state makes it a
  good candidate.

### 6. CI

Extend `.github/workflows/ci.yml` with a frontend job:

```yaml
- run: npm ci
  working-directory: frontend
- run: npm run lint
- run: npx tsc --noEmit
- run: npm run build
```

Read the existing workflow first and match its conventions rather than bolting on a second
style. Trigger on changes under `frontend/**`.

### 7. Documentation

- `frontend/README.md` — prerequisites, env vars, how to run against the local API, how to
  trust the dev certificate.
- Update the root `README.md`: the Roadmap currently lists "Frontend" as planned. Replace
  that with what actually shipped.
- Fold the [known backend defects](README.md#known-backend-defects) into GitHub issues if
  they are not already filed. The repo has an issue template at
  `.github/ISSUE_TEMPLATE/bug_report.md`.

---

## Done when

- [x] Killing the API mid-session produces a clear, retryable message on every route.
- [x] A bad ID shows "not found", not "something went wrong".
- [ ] The full renter loop is completable by keyboard alone. **Not verified** — see below.
- [x] Contrast passes AA in both themes. Measured, not assumed: `npm run verify:contrast`.
- [x] Every route works at 390px with no horizontal scroll. Measured across 15 routes.
- [x] Lint, typecheck and build all pass in CI on a pull request.
- [x] `frontend/README.md` gets a new developer running against the API without help.

---

## Outcome

Complete bar one item, which is recorded honestly below rather than ticked.

### Boundaries

`error.tsx` per segment — root, `(site)`, `owner`, the staff console — plus
`global-error.tsx` for a failing root layout and two `not-found.tsx` files. All of them
share [`RouteError`](../frontend/src/components/route-error.tsx).

The retry **refetches**. Next 16 passes `unstable_retry`, which re-runs the boundary's
children including server fetches; a page reload would also work and would throw away the
rest of the session to do it. `global-error.tsx` styles itself from the OS colour scheme,
because it replaces the root layout and therefore runs without the theme script, the
providers or the toaster — anything imported from `components/` risks failing inside the
failure.

`GetCarById` throwing `NotFoundException` is what made the second box tickable. Until it
did, a bad car id and a broken server were the same 500, and calling `notFound()` would
have been a guess. `/cars/<unknown-guid>` now renders *"This car isn't listed any more"*.

### A dead connection is not a broken server

`ErrorState` takes the `ApiError` and swaps its own heading to **"Can't reach the server"**
when `isNetworkError` is set, and every fetch failure in the app now carries a retry —
`state.reload` from a client component, `"refresh"` from a server-rendered page, which
re-runs the server render through the router instead of reloading the document.

`useAsync` used to wrap non-`ApiError` failures with `operation: "getBookings"` hard-coded,
so reading `error.operation` anywhere else gave a confidently wrong answer. There is a
neutral `"unknown"` operation for that case now.

### Contrast: two real failures

`npm run verify:contrast` parses `globals.css` — rather than restating the values, which
would drift the first time a token was tuned — and measures 40 pairs across both themes:
body and muted text on every surface, button labels, the focus ring, and all five status
pills against their own backgrounds.

It found `--muted-foreground` at **4.48:1** on the page and **4.12:1** on `--muted`,
against a 4.5 requirement. `DESIGN.md` had said these pairs were chosen for AA; two of
them were not. Lightness moved from 45% to 42%. Secondary text carries prices, dates and
every form hint, so it was the wrong thing to have borderline.

Now wired into `npm run verify`, so it runs in CI.

### 390px, measured

Chrome over the DevTools protocol with real mobile emulation, asserting
`documentElement.scrollWidth === clientWidth` on 15 routes — public, authenticated and
error — with a signed-in owner session injected into `localStorage` for the owner ones.
All pass.

One note rather than a defect: the **List a car** button in `OwnerShell`'s nav sits past
390px inside the nav's own `overflow-x-auto`, so it needs a sideways nudge to reach. The
page does not scroll, and `/owner/cars` carries the same action in its header.

### Not verified: keyboard-only renter loop

Focus rings are intact, dialogs come from Radix and trap focus, every input has a real
`<label>`, errors bind through `aria-describedby`, and the booking-inbox row got a real
`<button>` because a `<tr>` with an `onClick` is not reachable by keyboard. But nobody has
actually driven search → car → checkout → cancel using only the keyboard, and the box says
so.

### CI

A `Frontend (Next 16)` job runs install, lint, typecheck, `npm run verify` and build.
Deliberately **not** path-filtered to `frontend/**`: GitHub supports path filters only at
the workflow level, a per-job one needs a third-party action, and this repo uses official
actions only. A skipped required check also reports as pending, which is worse than running
an inexpensive job every time.

---

## Notes

Do this incrementally rather than as one pass at the end — a11y and mobile debt is far
cheaper to fix in the phase that created it. Treat this file as the standing checklist each
phase closes against, and this phase as the final sweep.
