import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * The shared failure surface.
 *
 * Messages come from `mapApiError`, which turns an operation plus a status into
 * a sentence — the server's own text is generic ("An internal server error
 * occurred.") and never reaches a user.
 */
export function ErrorState({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: { href: string; label: string };
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-5 rounded-xl border border-dashed px-6 py-16 text-center"
    >
      <AlertCircle className="size-8 text-muted-foreground" aria-hidden />
      <div className="space-y-2">
        <h2 className="text-h2">{title}</h2>
        <p className="max-w-prose text-muted-foreground">{message}</p>
      </div>
      {action && (
        <Button asChild variant="outline">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      )}
    </div>
  );
}
