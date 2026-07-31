"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/providers/auth-provider";

/**
 * Sends an already-signed-in visitor away from the auth screens.
 *
 * Returns whether a redirect is pending, so the caller can render nothing
 * rather than flashing a sign-in form at someone who is already signed in.
 *
 * `next` is read from the query string so a guarded route can round-trip:
 * `/trips` → `/login?next=%2Ftrips` → sign in → `/trips`.
 */
export function useRedirectIfAuthenticated(): boolean {
  const { session, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const isAuthenticated = session !== null;
  const next = safeNext(searchParams.get("next"));

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    router.replace(next);
  }, [isLoading, isAuthenticated, next, router]);

  return isAuthenticated;
}

export function useNextPath(): string {
  const searchParams = useSearchParams();
  return safeNext(searchParams.get("next"));
}

/**
 * Only same-origin paths. An unchecked `next` is an open redirect: a crafted
 * `/login?next=https://evil.example` would bounce a freshly-signed-in user
 * off-site, which is exactly when they are least likely to notice.
 *
 * Exported so `scripts/verify-logic.ts` can pin the behaviour.
 */
export function safeNext(value: string | null): string {
  if (!value) return "/";
  if (!value.startsWith("/")) return "/";
  // `//evil.example` and `/\evil.example` are protocol-relative URLs, not paths.
  if (value.startsWith("//") || value.startsWith("/\\")) return "/";
  return value;
}
