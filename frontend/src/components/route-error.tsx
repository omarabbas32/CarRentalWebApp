"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/error-state";
import { ApiError } from "@/lib/api/errors";

/**
 * The body of every `error.tsx` in the app.
 *
 * Two things it does that a bare error page does not.
 *
 * **The retry refetches.** Next 16 passes `unstable_retry`, which re-runs the
 * boundary's children — server fetches included. A page reload would also work
 * and would throw away the rest of the session to do it.
 *
 * **A network failure reads differently from a server fault.** "Can't reach the
 * server" tells someone to check their connection; "something went wrong" sends
 * them to file a bug. The API runs on localhost in development and *will* be
 * down sometimes, so this is the common case, not the exotic one.
 *
 * Note the classification only works for errors thrown in **client**
 * components. React serialises errors from server components with a generic
 * message in production to avoid leaking internals, leaving only `digest` —
 * which is why the fallback wording is honest about not knowing.
 */
export function RouteError({
  error,
  retry,
  title = "Something went wrong",
  action,
}: {
  error: Error & { digest?: string };
  retry: () => void;
  title?: string;
  action?: { href: string; label: string };
}) {
  useEffect(() => {
    // The digest is the only handle on a server-component error — it matches a
    // line in the server log. Without this the two cannot be connected.
    console.error("[route error]", error.digest ?? "(no digest)", error);
  }, [error]);

  const apiError = error instanceof ApiError ? error : undefined;

  return (
    <ErrorState
      title={title}
      message={apiError?.message ?? "This page didn't load. Trying again usually fixes it."}
      error={apiError}
      retry={retry}
      action={action}
    />
  );
}
