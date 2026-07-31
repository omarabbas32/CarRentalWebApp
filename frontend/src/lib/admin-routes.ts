/**
 * The admin console lives under an unguessable path rather than `/admin`.
 *
 * **This is obscurity, not security.** Be clear about what it does and does not
 * buy:
 *
 *  - It does stop drive-by discovery: crawlers, dictionary scans and idle
 *    URL-guessing never reach it, and the pages carry `noindex`.
 *  - It does **not** hide anything from a determined visitor. Next.js ships
 *    every route in the client-side router manifest, so anyone reading the
 *    JavaScript bundle can recover this path in under a minute.
 *
 * The real controls are elsewhere, and must stay there:
 *  - `GetPendingVerificationsQuery` and `ProcessVerificationCommand` both carry
 *    `[Authorize(Roles = "Staff,Admin")]` — genuine server-side enforcement,
 *    and unusually for this API, actually present.
 *  - `RoleGuard` keeps the wrong role out of the UI.
 *
 * Treat this path as a speed bump. If it leaks, nothing is compromised.
 *
 * ---
 *
 * **Changing it:** the App Router derives routes from directory names, so this
 * constant cannot generate the folder. To move the console, rename the
 * directory `src/app/<this-value>/` **and** update this constant — they must
 * match or every internal link 404s.
 */
export const ADMIN_BASE = "/ops-console-9d4f1a";

export const adminRoutes = {
  home: ADMIN_BASE,
  verifications: `${ADMIN_BASE}/verifications`,
  users: `${ADMIN_BASE}/users`,
} as const;
