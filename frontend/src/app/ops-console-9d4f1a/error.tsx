"use client";

import { RouteError } from "@/components/route-error";
import { adminRoutes } from "@/lib/admin-routes";

export default function ConsoleError({
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
        action={{ href: adminRoutes.verifications, label: "Back to the queue" }}
      />
    </div>
  );
}
