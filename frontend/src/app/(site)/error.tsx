"use client";

import { RouteError } from "@/components/route-error";

/** Keeps the site chrome — header, nav, footer — while the page below fails. */
export default function SiteError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-16 lg:px-12">
      <RouteError
        error={error}
        retry={unstable_retry}
        title="This page didn't load"
        action={{ href: "/search", label: "Find a car" }}
      />
    </div>
  );
}
