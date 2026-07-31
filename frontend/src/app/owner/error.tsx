"use client";

import { RouteError } from "@/components/route-error";

/** Keeps the owner sidebar while the workbench page below it fails. */
export default function OwnerError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <div className="p-4 lg:p-6">
      <RouteError
        error={error}
        retry={unstable_retry}
        title="This page didn't load"
        action={{ href: "/owner", label: "Back to the dashboard" }}
      />
    </div>
  );
}
