"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { UserRole } from "@/lib/enums";

/**
 * Client-side route gating.
 *
 * **This is a UX affordance, not a security boundary.** Most state-changing
 * endpoints on this API carry no `[Authorize]` attribute at all — car image
 * upload and delete, user create and update, verification upload, and every
 * booking query are unauthenticated (see phases/README.md § endpoint
 * inventory). What this guard prevents is a confusing screen, not a determined
 * request. Anything that genuinely must be enforced has to be enforced server
 * side.
 *
 * The session lives in client storage, so the check runs after mount. Render a
 * skeleton while it resolves rather than the protected content — otherwise
 * protected markup is briefly visible to a signed-out visitor.
 */
export function RoleGuard({
  children,
  roles,
  fallback,
}: {
  children: ReactNode;
  /** Omit to require only that someone is signed in. */
  roles?: UserRole[];
  fallback?: ReactNode;
}) {
  const { session, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isAuthenticated = session !== null;
  const isAllowed =
    isAuthenticated && (!roles || roles.length === 0 || roles.includes(session.role));

  // Navigation is a side effect on an external system, which is what effects
  // are for — unlike the setState-in-effect pattern the lint rules reject.
  useEffect(() => {
    if (isLoading || isAuthenticated) return;
    router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [isLoading, isAuthenticated, pathname, router]);

  if (isLoading) return fallback ?? <GuardSkeleton />;

  // The redirect above is in flight; showing nothing beats showing a flash of
  // the sign-in prompt on a page the user is about to leave.
  if (!isAuthenticated) return fallback ?? <GuardSkeleton />;

  if (!isAllowed) return <ForbiddenNotice />;

  return <>{children}</>;
}

function GuardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 px-6 py-12 lg:px-12">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-80" />
      <Skeleton className="h-64 w-full" />
      <span className="sr-only">Loading</span>
    </div>
  );
}

/**
 * A wrong-role user gets an explanation, not a redirect. Bouncing them
 * somewhere else reads as a broken link, and can loop if the destination is
 * also guarded.
 */
function ForbiddenNotice() {
  return (
    <div className="mx-auto w-full max-w-prose px-6 py-24 text-center lg:px-12">
      <h1 className="text-h1">This page isn&apos;t for your account</h1>
      <p className="mt-3 text-muted-foreground">
        Your account doesn&apos;t have access to this area. If you think that&apos;s
        wrong, check you&apos;re signed in with the right account.
      </p>
    </div>
  );
}
