import type { Metadata } from "next";
import { ErrorState } from "@/components/error-state";
import { RoleGuard } from "@/components/auth/role-guard";
import { getCar } from "@/lib/api/cars";
import { ApiError } from "@/lib/api/errors";
import { UserRole } from "@/lib/enums";
import { parseSearchParams, type RawSearchParams } from "@/lib/search-params";
import type { CarDto } from "@/types/api";
import { Checkout } from "./checkout";

export const metadata: Metadata = {
  title: "Request this car · CarRental",
};

/**
 * The car is fetched on the server — it is public data, and rendering it in the
 * initial HTML means the page is useful the moment the guard resolves.
 *
 * Everything that depends on the session (the verification nudge, the submit)
 * lives in the client component, because the token is in client storage.
 *
 * `CreateBookingCommand` carries `[Authorize(Roles = "Renter,Admin,Staff")]`, so
 * an Owner-role account genuinely cannot book. The guard mirrors that rather
 * than letting them reach a 403.
 */
export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<RawSearchParams>;
}) {
  const [{ id }, raw] = await Promise.all([params, searchParams]);
  const { start, end } = parseSearchParams(raw);

  let car: CarDto;
  try {
    car = await getCar(id);
  } catch (cause) {
    const error = cause instanceof ApiError ? cause : null;
    return (
      <div className="mx-auto w-full max-w-7xl px-6 py-16 lg:px-12">
        <ErrorState
          title="We couldn't load this car"
          message={error?.message ?? "Something went wrong. Try again."}
          action={{ href: "/search", label: "Back to search" }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-8 lg:px-12">
      <RoleGuard roles={[UserRole.Renter, UserRole.Admin, UserRole.Staff]}>
        <Checkout car={car} start={start} end={end} />
      </RoleGuard>
    </div>
  );
}
