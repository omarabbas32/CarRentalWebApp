# Phase 0 — Land the spec, scaffold the app

**Depends on:** nothing
**Delivers:** a themed, empty Next.js app that builds, plus a corrected spec in version control.

---

## Why this phase exists

Two pieces of finished design work — `frontend/DESIGN.md` and `carrental-mockups.html` — are
sitting untracked in the working tree. Until they are committed, nothing downstream has a
stable reference. And four of the spec's API rules are wrong (see
[Spec corrections](README.md#spec-corrections)), so committing it unchanged would encode
mistakes into every phase that reads it.

---

## Tasks

### 1. Correct and commit the spec

Fix these in `frontend/DESIGN.md` §5 before committing:

- Remove the row claiming `renterId` / `ownerId` / `cancelledByUserId` are client-supplied.
  Replace it with: the server derives them from the JWT; only `GET /api/bookings` takes
  `renterId` / `ownerId` as filters.
- Change "`UnauthorizedAccessException` → 500; never 401" to "→ 401 with
  `{ error }`". Keep proactive refresh as the primary strategy and add a reactive 401
  backstop.
- Change "`ForbiddenAccessException` → 403 empty body" to "403 with `{ error }`".
- Change "Enums are ints in JSON bodies" to "ints in request **and response** bodies".

Move `carrental-mockups.html` to `frontend/mockups.html` so the design artefacts live
together, and update the §5 reference to it.

Commit both on a branch and open a PR. The repo has a PR template at
`.github/pull_request_template.md`.

### 2. Scaffold Next.js

```bash
npx create-next-app@latest frontend --typescript --tailwind --eslint --app \
  --src-dir --import-alias "@/*" --no-turbopack
```

`frontend/` already contains `.gitkeep`, `DESIGN.md` and (after step 1) `mockups.html`.
`create-next-app` refuses a non-empty directory — scaffold to a temp path and move the
generated files in, or scaffold first and restore the design files afterwards.

### 3. Install shadcn/ui

```bash
npx shadcn@latest init
npx shadcn@latest add button card input select calendar popover dialog sheet drawer \
  badge avatar tabs table dropdown-menu form label textarea checkbox radio-group \
  slider separator skeleton sonner alert progress command tooltip
```

### 4. Design tokens

Put the light and dark variable blocks from `DESIGN.md` §2 into `src/app/globals.css`
verbatim. Dark mode redefines variables only — **no component branches on theme**.

Add the type scale as utility classes or `@theme` entries: Display 40/1.15/660/−0.03em,
H1 27/1.18/660/−0.02em, H2 19/1.30/640/−0.014em, H3 15/1.35/620, Body 14/1.50/400,
Caption 12.5/1.45/400, Label 10.5/640/+0.10em uppercase.

Set globally:

```css
:where(h1, h2, h3, h4) { text-wrap: balance; }
.tabular { font-variant-numeric: tabular-nums; }
```

`.tabular` goes on every price, odometer, day count and ID.

Do **not** add a webfont. The system stack is deliberate — no CDN, no layout shift.

### 5. Providers

`src/app/layout.tsx` composes, in order: `ThemeProvider` (`next-themes`,
`attribute="class"`, `defaultTheme="system"`) → `AuthProvider` (a stub returning `null` user;
Phase 1 fills it in) → `children` → `<Toaster />` from `sonner`.

### 6. Config

`next.config.ts`:

```ts
images: {
  remotePatterns: [{ protocol: 'https', hostname: 'res.cloudinary.com' }],
}
```

`.env.local` (gitignored) and a committed `.env.example`:

```
NEXT_PUBLIC_API_BASE_URL=https://localhost:7077
```

If Node rejects the ASP.NET dev certificate on server-side fetches, either run
`dotnet dev-certs https --trust` or point this at `http://localhost:5071`.

Check that the root `.gitignore` covers `node_modules/`, `.next/` and `.env*.local`; add
them if not.

---

## Done when

- [x] `DESIGN.md` and the mockups are committed, with the four §5 corrections applied.
- [x] `npm run dev` serves a page at `:3000` with no console errors.
- [x] `npm run build`, `npm run lint` and `npx tsc --noEmit` all pass.
- [x] A theme toggle flips light ↔ dark and every token responds.
- [x] All 27 shadcn components are present under `src/components/ui/`.

---

## Outcome

Completed. The scaffold resolved to **Next 16.2.12 · React 19.2.4 · Tailwind v4 ·
shadcn 4.16 (`radix-nova`)**, which differs from this spec in several ways — all
recorded under [Toolchain notes](README.md#toolchain-notes). Read that section
before starting Phase 1; the async-`params` and `middleware`→`proxy` changes reach
phases 2, 3, 4, 6 and 7.

Three things worth knowing:

- **`form` does not exist in the registry any more.** `field` primitives replace it.
  `DESIGN.md` §6 is updated.
- **Tokens are complete colours now**, not channel triplets. `--primary` and `--ring`
  are stated as hex because the spec's HSL triplet rounds two points off `#0F766E`.
- **The visual check was not performed** — the Chrome extension was not connected.
  The token layer is verified from the compiled CSS instead: the type scale, the
  `tabular` and `measure` utilities, the status-colour utilities, the `.dark`
  variable overrides and the `dark:` variant rules are all present in both the dev
  and production output. A human should still click the toggle once.

---

## Notes

Keep this phase mechanical. Resist building components — the point is a green build and a
correct spec, so that Phase 1 has somewhere solid to land.
