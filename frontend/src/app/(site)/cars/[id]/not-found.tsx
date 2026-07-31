import Link from "next/link";
import { CarFront } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * A car id that does not exist — distinct from "the server broke", which was
 * impossible to tell apart until `GetCarById` started throwing
 * `NotFoundException` instead of a plain `Exception`.
 *
 * Reached via `notFound()` in the page when the API answers 404.
 */
export default function CarNotFound() {
  return (
    <div className="mx-auto flex w-full max-w-prose flex-col items-center gap-6 px-6 py-24 text-center lg:px-12">
      <CarFront className="size-8 text-muted-foreground" aria-hidden />
      <div className="space-y-2">
        <h1 className="text-h1">This car isn&apos;t listed any more</h1>
        <p className="text-muted-foreground">
          The owner may have removed it, or the link may be out of date. There are
          others.
        </p>
      </div>
      <Button asChild>
        <Link href="/search">Find a car</Link>
      </Button>
    </div>
  );
}
