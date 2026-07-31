import type { AuthenticationResult } from "@/types/api";
import { parseRoleName, UserRole } from "@/lib/enums";
import * as authApi from "@/lib/api/auth";
import { registerTokenProvider, registerUnauthorizedHandler } from "@/lib/api/client";

/**
 * The session store.
 *
 * There is no `GET /api/auth/me`, so the login or register response payload is
 * the *only* source of session state. It is persisted client-side and re-read
 * on load.
 *
 * Refresh is **proactive**, scheduled off the `expiry` field. The token lives
 * 60 minutes and `ClockSkew` is zero, so it is rejected the instant it lapses.
 * A reactive 401 handler is wired up as a backstop, but it must not be the
 * primary mechanism.
 *
 * Nothing here ever retries. `/api/auth/*` shares one 5-request-per-minute
 * budget across login, register, refresh and logout — a refresh loop would
 * exhaust the window and lock the user out of signing in.
 *
 * This is a plain module store rather than a React context so that it can be
 * read with `useSyncExternalStore`: no setState-in-effect for rehydration, and
 * a `storage` listener keeps tabs in step for free.
 *
 * Note: the token is held in localStorage, which is readable by any script on
 * the origin. An httpOnly cookie would be safer, but the API returns tokens in
 * the response body and offers no cookie flow, so this is the available option.
 */

const STORAGE_KEY = "carrental.session";
/** Refresh this long before expiry, so a slow network still beats the clock. */
const REFRESH_LEAD_MS = 60_000;

export type Session = {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  token: string;
  refreshToken: string;
  /** ISO-8601, as returned by the API. */
  expiry: string;
};

export type AuthState = {
  session: Session | null;
  /** True until the persisted session has been read. Server renders as true. */
  isLoading: boolean;
};

const SERVER_STATE: AuthState = { session: null, isLoading: true };
const SIGNED_OUT: AuthState = { session: null, isLoading: false };

/**
 * Cached so `getSnapshot` returns a referentially stable value — returning a
 * fresh object each call makes `useSyncExternalStore` loop forever.
 */
let state: AuthState = SERVER_STATE;

const listeners = new Set<() => void>();
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

function setState(next: AuthState) {
  state = next;
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): AuthState {
  return state;
}

export function getServerSnapshot(): AuthState {
  return SERVER_STATE;
}

export function getSession(): Session | null {
  return state.session;
}

// --- persistence -----------------------------------------------------------

function read(): Session | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    // A stored session missing fields is corrupt, not partially usable.
    if (!parsed?.token || !parsed?.refreshToken || !parsed?.expiry) return null;
    return parsed;
  } catch {
    return null;
  }
}

function write(session: Session | null) {
  try {
    if (session) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Private browsing or a full quota. The in-memory session still works for
    // this tab; it just will not survive a reload.
  }
}

export function toSession(result: AuthenticationResult): Session {
  return {
    userId: result.userId,
    email: result.email,
    firstName: result.firstName,
    lastName: result.lastName,
    role: parseRoleName(result.role),
    token: result.token,
    refreshToken: result.refreshToken,
    expiry: result.expiry,
  };
}

// --- refresh scheduling ----------------------------------------------------

function clearRefreshTimer() {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
}

function msUntilRefresh(expiry: string): number {
  const expiresAt = new Date(expiry).getTime();
  if (Number.isNaN(expiresAt)) return 0;
  return expiresAt - Date.now() - REFRESH_LEAD_MS;
}

function scheduleRefresh(session: Session) {
  clearRefreshTimer();
  const delay = msUntilRefresh(session.expiry);

  if (delay <= 0) {
    // Already inside the lead window (or expired) — refresh now. A token that
    // has fully lapsed will simply fail and sign the user out, which is
    // correct: the alternative is a session that appears live and is not.
    void runRefresh();
    return;
  }

  refreshTimer = setTimeout(() => void runRefresh(), delay);
}

let refreshInFlight: Promise<void> | null = null;

async function runRefresh(): Promise<void> {
  // Two triggers can coincide — the timer and a 401 backstop. One request.
  if (refreshInFlight) return refreshInFlight;

  const current = state.session;
  if (!current) return;

  refreshInFlight = (async () => {
    try {
      const result = await authApi.refresh(current.token, current.refreshToken);
      const session = toSession(result);
      write(session);
      setState({ session, isLoading: false });
      scheduleRefresh(session);
    } catch {
      // No retry, by design. The refresh token has been rotated or revoked;
      // asking again cannot succeed and only spends the rate-limit budget.
      clearSession();
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

// --- actions ---------------------------------------------------------------

function adopt(result: AuthenticationResult): Session {
  const session = toSession(result);
  write(session);
  setState({ session, isLoading: false });
  scheduleRefresh(session);
  return session;
}

export async function signIn(email: string, password: string): Promise<Session> {
  return adopt(await authApi.login(email, password));
}

export async function signUp(input: authApi.RegisterInput): Promise<Session> {
  return adopt(await authApi.register(input));
}

export async function signOut(): Promise<void> {
  const current = state.session;
  clearRefreshTimer();

  // Revoke server-side first, but never let a failure strand the user in a
  // signed-in UI — the local session is cleared either way.
  if (current) {
    try {
      await authApi.logout(current.refreshToken);
    } catch {
      // Already revoked, expired, or rate-limited. Nothing to recover.
    }
  }

  clearSession();
}

function clearSession() {
  clearRefreshTimer();
  write(null);
  setState(SIGNED_OUT);
}

// --- startup ---------------------------------------------------------------

/**
 * Runs once when the module is first evaluated in the browser — before React
 * renders, so there is no signed-out flash for a user who is signed in.
 */
function hydrate() {
  const stored = read();

  if (!stored) {
    setState(SIGNED_OUT);
    return;
  }

  // A session whose token has fully lapsed is not worth resuming: the refresh
  // token may still be live, so let scheduleRefresh decide rather than
  // discarding it here.
  setState({ session: stored, isLoading: false });
  scheduleRefresh(stored);
}

if (typeof window !== "undefined") {
  registerTokenProvider(() => state.session?.token ?? null);

  // Backstop only. `UnauthorizedAccessException` does map to 401, so this can
  // fire — but proactive refresh should mean it rarely does.
  registerUnauthorizedHandler(() => {
    if (state.session) void runRefresh();
  });

  // Cross-tab: signing out in one tab signs out the others.
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY) return;
    const stored = read();
    if (!stored) {
      clearRefreshTimer();
      setState(SIGNED_OUT);
    } else {
      setState({ session: stored, isLoading: false });
      scheduleRefresh(stored);
    }
  });

  hydrate();
}
