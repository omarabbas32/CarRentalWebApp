"use client";

import { RouteError } from "@/components/route-error";

/**
 * The backstop for anything under the root layout that no nearer boundary
 * caught. `global-error.tsx` sits above this and only fires when the root
 * layout itself throws.
 */
export default function RootError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-24 lg:px-12">
      <RouteError
        error={error}
        retry={unstable_retry}
        action={{ href: "/", label: "Go home" }}
      />
    </div>
  );
}
