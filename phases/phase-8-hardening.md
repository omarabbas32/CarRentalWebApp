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

- [ ] Killing the API mid-session produces a clear, retryable message on every route.
- [ ] A bad ID shows "not found", not "something went wrong".
- [ ] The full renter loop is completable by keyboard alone.
- [ ] Contrast passes AA in both themes.
- [ ] Every route works at 390px with no horizontal scroll.
- [ ] Lint, typecheck and build all pass in CI on a pull request.
- [ ] `frontend/README.md` gets a new developer running against the API without help.

---

## Notes

Do this incrementally rather than as one pass at the end — a11y and mobile debt is far
cheaper to fix in the phase that created it. Treat this file as the standing checklist each
phase closes against, and this phase as the final sweep.
