import type { AuthenticationResult } from "@/types/api";
import type { UserRole } from "@/lib/enums";
import { apiRequest } from "./client";

/**
 * `/api/auth/*` — the four routes that share **one 5-request-per-minute
 * budget**. Login, register, refresh and logout all compete for it, and the
 * limiter has no queue.
 *
 * Never retry any of these automatically. A refresh loop will exhaust the
 * window and lock the user out of signing in.
 *
 * None of them send a bearer token: refresh takes the expiring token in the
 * body, and the rest are unauthenticated by definition.
 */

export type RegisterInput = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  /** Int on the wire. Only Renter (0) and Owner (1) are self-service. */
  role: UserRole;
};

export function register(input: RegisterInput) {
  return apiRequest<AuthenticationResult>("register", "/api/auth/register", {
    method: "POST",
    body: input,
    auth: false,
  });
}

export function login(email: string, password: string) {
  return apiRequest<AuthenticationResult>("login", "/api/auth/login", {
    method: "POST",
    body: { email, password },
    auth: false,
  });
}

/**
 * Rotates the refresh token: redeeming one revokes it and links it to its
 * replacement, so a reused token is detectable server-side.
 *
 * `ipAddress` is a non-nullable string on `RefreshTokenCommand`, and a browser
 * cannot know its own address — it is only used for the audit trail on the
 * token record. An empty string satisfies the contract.
 */
export function refresh(token: string, refreshToken: string) {
  return apiRequest<AuthenticationResult>("refresh", "/api/auth/refresh", {
    method: "POST",
    body: { token, refreshToken, ipAddress: "" },
    auth: false,
  });
}

/** Revokes the refresh token server-side. Returns 204. */
export function logout(refreshToken: string) {
  return apiRequest<void>("logout", "/api/auth/logout", {
    method: "POST",
    body: { refreshToken, ipAddress: "" },
    auth: false,
  });
}
