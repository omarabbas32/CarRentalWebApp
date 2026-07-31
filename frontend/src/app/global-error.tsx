"use client";

import "./globals.css";

/**
 * Fires only when the **root layout itself** throws — the providers, the theme
 * script, the font. Everything below it is caught by `app/error.tsx`.
 *
 * This file replaces the root layout when active, so it has to render its own
 * `<html>` and `<body>`. That also means none of the app's chrome is available:
 * no `AuthProvider`, no `Toaster`, and no theme class on `<html>`, because the
 * script that writes it lives in the layout that just failed.
 *
 * So the styling here is deliberately self-contained and works from the OS
 * colour scheme alone. Anything imported from `components/` risks depending on
 * a provider that is not mounted, which would fail inside the failure.
 */
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <title>Something went wrong · CarRental</title>
      </head>
      <body className="flex min-h-full flex-col items-center justify-center gap-6 bg-white p-6 text-center text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">CarRental didn&apos;t start</h1>
          <p className="max-w-prose text-neutral-600 dark:text-neutral-400">
            Something failed before the page could load. Trying again usually fixes
            it.
          </p>
          {error.digest && (
            <p className="text-xs text-neutral-500">
              {/* The only handle on a server-side error: it matches a line in
                  the server log. */}
              Reference: {error.digest}
            </p>
          )}
        </div>

        <button
          onClick={() => unstable_retry()}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:outline-none dark:bg-neutral-50 dark:text-neutral-900"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
