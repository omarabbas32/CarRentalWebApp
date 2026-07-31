import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * The catch-all 404 — an address that matches no route at all.
 *
 * Route-specific ones sit nearer their segment: a car id that does not exist is
 * a different message from a URL that was never a page.
 */
export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-prose flex-col items-center gap-6 px-6 py-24 text-center lg:px-12">
      <div className="space-y-2">
        <p className="text-label uppercase text-muted-foreground">404</p>
        <h1 className="text-h1">There&apos;s nothing at this address</h1>
        <p className="text-muted-foreground">
          The link may be out of date, or the page may have moved.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button asChild>
          <Link href="/search">Find a car</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </div>
  );
}
