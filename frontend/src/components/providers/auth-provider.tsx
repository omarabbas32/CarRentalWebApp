"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import {
  getServerSnapshot,
  getSnapshot,
  signIn,
  signOut,
  signUp,
  subscribe,
  type AuthState,
  type Session,
} from "@/lib/auth/session-store";
import { UserRole } from "@/lib/enums";

/**
 * React binding over `lib/auth/session-store`.
 *
 * The store is a plain module, not context state, so this provider holds no
 * state of its own — it exists to keep `layout.tsx` composing the way the rest
 * of the app expects, and so a future change of mechanism has one seam.
 *
 * Reading through `useSyncExternalStore` means rehydration needs no effect and
 * no `mounted` flag, which the React Compiler lint rules would reject anyway.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useAuth(): AuthState & {
  signIn: typeof signIn;
  signUp: typeof signUp;
  signOut: typeof signOut;
} {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { ...state, signIn, signUp, signOut };
}

/** The signed-in user, or null. Convenience over `useAuth().session`. */
export function useSession(): Session | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot).session;
}

export function useHasRole(...roles: UserRole[]): boolean {
  const session = useSession();
  return session !== null && roles.includes(session.role);
}

/** Admin and Staff share every workbench surface the API grants them. */
export const STAFF_ROLES = [UserRole.Admin, UserRole.Staff] as const;

export type { Session };
