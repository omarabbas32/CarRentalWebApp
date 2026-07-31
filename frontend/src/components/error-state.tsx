"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, RotateCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * The shared failure surface.
 *
 * Messages come from `mapApiError`, which turns an operation plus a status into
 * a sentence — the server's own text is generic ("An internal server error
 * occurred.") and never reaches a user.
 *
 * Two things beyond the message.
 *
 * **A dead connection is not a broken server.** The API runs on localhost in
 * development and will be down regularly; "Can't reach the server" tells
 * someone to check their connection, while "something went wrong" sends them
 * to file a bug. Pass `error` and the distinction is made here rather than at
 * twenty call sites.
 *
 * **Every failure is retryable.** A client component passes its `reload`; a
 * server-rendered page passes `"refresh"`, which re-runs the server render
 * through the router instead of reloading the document and throwing away the
 * rest of the session.
 */
export function ErrorState({
  title,
  message,
  action,
  retry,
  error,
}: {
  title: string;
  message: string;
  action?: { href: string; label: string };
  /** `"refresh"` re-runs the server render; a function is called as-is. */
  retry?: "refresh" | (() => void);
  /** Structural on purpose — anything with the flag will do. */
  error?: { isNetworkError?: boolean };
}) {
  const router = useRouter();
  const offline = error?.isNetworkError === true;

  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-5 rounded-xl border border-dashed px-6 py-16 text-center"
    >
      {offline ? (
        <WifiOff className="size-8 text-muted-foreground" aria-hidden />
      ) : (
        <AlertCircle className="size-8 text-muted-foreground" aria-hidden />
      )}

      <div className="space-y-2">
        <h2 className="text-h2">{offline ? "Can't reach the server" : title}</h2>
        <p className="max-w-prose text-muted-foreground">{message}</p>
      </div>

      {(retry || action) && (
        <div className="flex flex-wrap justify-center gap-2">
          {retry && (
            <Button onClick={() => (retry === "refresh" ? router.refresh() : retry())}>
              <RotateCw className="size-4" aria-hidden />
              Try again
            </Button>
          )}
          {action && (
            <Button asChild variant={retry ? "ghost" : "outline"}>
              <Link href={action.href}>{action.label}</Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
