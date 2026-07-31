"use client";

import { AlertCircle, Clock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ApiError } from "@/lib/api/errors";

/**
 * The form-level error for the auth screens.
 *
 * Rate limiting gets its own presentation because it is a different situation
 * with a different remedy: the credentials may be perfectly correct, and the
 * only action is to wait. `/api/auth/*` allows five requests per minute across
 * login, register, refresh and logout combined, so a user who mistypes a
 * password a few times can hit it while doing nothing unusual.
 */
export function AuthError({ error }: { error: ApiError | null }) {
  if (!error) return null;

  if (error.isRateLimited) {
    return (
      <Alert>
        <Clock className="size-4" aria-hidden />
        <AlertTitle>Too many attempts</AlertTitle>
        <AlertDescription>
          Wait about a minute, then try again. Signing in, registering and
          refreshing all share the same limit.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert variant="destructive">
      <AlertCircle className="size-4" aria-hidden />
      <AlertDescription>{error.message}</AlertDescription>
    </Alert>
  );
}
