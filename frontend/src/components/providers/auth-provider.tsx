"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * Phase 0 stub.
 *
 * Phase 1 replaces the body of this file with the real session store: the
 * payload from `/api/auth/login` or `/api/auth/register` persisted client-side,
 * plus a proactive refresh timer scheduled off `expiry`. There is no
 * `GET /api/auth/me`, so that response payload is the only source of session
 * state — see phases/phase-1-api-layer.md §9.
 *
 * The shape is deliberately fixed now so that components written against it in
 * the meantime do not need rewriting.
 */
export type Session = {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  /** `AuthenticationResult.role` is a string, unlike every other enum. */
  role: string;
  token: string;
  refreshToken: string;
  expiry: string;
};

type AuthContextValue = {
  session: Session | null;
  /** False while the persisted session is being rehydrated on mount. */
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextValue>({
  session: null,
  isLoading: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <AuthContext.Provider value={{ session: null, isLoading: false }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
