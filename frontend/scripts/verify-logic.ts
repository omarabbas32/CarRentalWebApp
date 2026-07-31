/**
 * Executable checks over the pure logic in lib/ — pricing, dates, Cloudinary
 * URLs, error mapping and enum values.
 *
 * These exist because lib/pricing.ts duplicates arithmetic that lives in
 * CreateBookingCommandHandler. The duplication is deliberate (the quote must
 * match the booking), which makes drift the risk — so the formula is pinned
 * here against an independent replication of the C#.
 *
 * Run: npm run verify:logic
 */
import assert from "node:assert/strict";

import { daysBetween, toUtcIso, isValidSearchRange, defaultSearchRange } from "@/lib/dates";
import { priceBreakdown, breakdownFromBooking } from "@/lib/pricing";
import { cloudinaryThumb, isCloudinaryUrl } from "@/lib/cloudinary";
import { toFieldErrors, mapApiError, ApiError } from "@/lib/api/errors";
import { isPasswordValid, passwordRuleResults, nameError, isEmailValid } from "@/lib/auth/password";
import { canCancelBooking, isBookingParticipant, TRIP_TABS } from "@/lib/bookings";
import { safeNext } from "@/components/auth/redirect-if-authenticated";
import { parseRoleName, parseCategoryName, carCategoryName, CarCategory, UserRole, BookingStatus, bookingStatusLabel, enumValues } from "@/lib/enums";

let passed = 0;
const check = (name: string, fn: () => void) => {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
};

console.log("\ndates");
check("daysBetween truncates toward zero, like (int) in C#", () => {
  const a = new Date("2026-08-01T10:00:00Z");
  assert.equal(daysBetween(a, new Date("2026-08-04T10:00:00Z")), 3);
  // 3.96 days bills as 3 — the server casts to int, it does not round up.
  assert.equal(daysBetween(a, new Date("2026-08-05T09:00:00Z")), 3);
  // ...and 2.96 days bills as 2, for the same reason.
  assert.equal(daysBetween(a, new Date("2026-08-04T09:00:00Z")), 2);
});
check("daysBetween floors to a minimum of 1", () => {
  const a = new Date("2026-08-01T10:00:00Z");
  assert.equal(daysBetween(a, new Date("2026-08-01T18:00:00Z")), 1);
  assert.equal(daysBetween(a, a), 1);
  assert.equal(daysBetween(a, new Date("2026-07-30T10:00:00Z")), 1);
});
check("toUtcIso emits UTC and rejects an invalid date", () => {
  assert.equal(toUtcIso(new Date("2026-08-01T10:00:00Z")), "2026-08-01T10:00:00.000Z");
  assert.ok(toUtcIso(new Date()).endsWith("Z"));
  assert.throws(() => toUtcIso(new Date("nonsense")));
});
check("search range mirrors SearchFilters.Validate", () => {
  const s = new Date("2026-08-01");
  assert.equal(isValidSearchRange(s, new Date("2026-08-05")), true);
  assert.equal(isValidSearchRange(s, s), false, "start must precede end");
  assert.equal(isValidSearchRange(new Date("2026-08-05"), s), false);
  assert.equal(isValidSearchRange(s, new Date("2027-08-05")), false, "365 day cap");
});
check("defaultSearchRange is tomorrow -> +3 days", () => {
  const { start, end } = defaultSearchRange();
  assert.equal(daysBetween(start, end), 3);
  assert.ok(start.getTime() > Date.now() - 86_400_000);
});

console.log("\npricing (mirrors CreateBookingCommandHandler)");
check("subtotal + 10% + 5% + deposit", () => {
  const b = priceBreakdown(100, 250, new Date("2026-08-01"), new Date("2026-08-05"));
  assert.equal(b.totalDays, 4);
  assert.equal(b.subtotal, 400);
  assert.equal(b.serviceFee, 40);
  assert.equal(b.taxAmount, 20);
  assert.equal(b.securityDeposit, 250);
  assert.equal(b.total, 710, "total must include the deposit");
});
check("a sub-day booking still bills one day", () => {
  const b = priceBreakdown(75.5, 0, new Date("2026-08-01T09:00:00Z"), new Date("2026-08-01T17:00:00Z"));
  assert.equal(b.totalDays, 1);
  assert.equal(b.subtotal, 75.5);
  assert.equal(b.total, 75.5 + 7.55 + 3.775);
});
check("breakdownFromBooking reads the server's snapshot verbatim", () => {
  const b = breakdownFromBooking({
    totalDays: 4, pricePerDay: 100, subTotal: 400,
    serviceFee: 40, taxAmount: 20, securityDeposit: 250, totalAmount: 710,
  });
  assert.equal(b.total, 710);
  assert.equal(b.subtotal, 400);
});
check("client formula agrees with the server's arithmetic", () => {
  // Replicate the C# exactly and compare.
  for (const [rate, dep, days] of [[100, 250, 4], [45.25, 0, 1], [199.99, 500, 12]] as const) {
    const start = new Date("2026-08-01T00:00:00Z");
    const end = new Date(start.getTime() + days * 86_400_000);
    const subtotal = days * rate;
    const server = subtotal + subtotal * 0.10 + subtotal * 0.05 + dep;
    assert.equal(priceBreakdown(rate, dep, start, end).total, server);
  }
});

console.log("\ncloudinary");
check("injects a transformation after /upload/", () => {
  assert.equal(
    cloudinaryThumb("https://res.cloudinary.com/demo/image/upload/v123/car.jpg", 640),
    "https://res.cloudinary.com/demo/image/upload/c_limit,f_auto,q_auto,w_640/v123/car.jpg",
  );
});
check("does not compound an existing transformation", () => {
  const already = "https://res.cloudinary.com/demo/image/upload/c_fill,w_100/v1/car.jpg";
  assert.equal(cloudinaryThumb(already, 640), already);
});
check("passes through foreign hosts and junk unchanged", () => {
  assert.equal(cloudinaryThumb("/placeholder.svg", 640), "/placeholder.svg");
  assert.equal(cloudinaryThumb("https://example.com/a.jpg", 640), "https://example.com/a.jpg");
  assert.equal(cloudinaryThumb("", 640), "");
  assert.equal(isCloudinaryUrl("not a url"), false);
});

console.log("\nerror mapping");
check("400 field errors camelCase from PascalCase", () => {
  const fe = toFieldErrors({ PricePerDay: ["must be > 0"], "Location.Lat": ["required"] });
  assert.deepEqual(fe, { pricePerDay: ["must be > 0"], "location.lat": ["required"] });
});
check("acronyms follow .NET's camelCase policy, not naive lowercasing", () => {
  // FluentValidation sends the raw C# property name; the form fields are named
  // after the camelCased response body. Getting this wrong means a VIN error
  // binds to `vIN` and never reaches its input.
  const fe = toFieldErrors({
    VIN: ["17 characters"],
    HasGPS: ["x"],
    HasUSBCharging: ["x"],
    Seats: ["x"],
  });
  assert.deepEqual(Object.keys(fe ?? {}), ["vin", "hasGPS", "hasUSBCharging", "seats"]);
});
check("empty or malformed error payloads yield undefined", () => {
  assert.equal(toFieldErrors(null), undefined);
  assert.equal(toFieldErrors({}), undefined);
  assert.equal(toFieldErrors({ Foo: [] }), undefined);
});
check("a business-rule 500 becomes a human sentence, never the server text", () => {
  assert.equal(mapApiError("createBooking", 500), "Those dates were just taken. Try different dates.");
  assert.equal(mapApiError("login", 500), "Email or password is incorrect.");
  assert.equal(mapApiError("register", 500), "That email is already registered. Try signing in instead.");
  for (const op of ["createBooking", "login", "getCar", "endTrip"] as const) {
    assert.ok(!mapApiError(op, 500).includes("internal server error"));
  }
});
check("rate limiting covers both 429 and ASP.NET's default 503", () => {
  const msg = "Too many attempts. Wait about a minute and try again.";
  assert.equal(mapApiError("login", 429), msg);
  assert.equal(mapApiError("login", 503), msg);
  assert.ok(new ApiError({ status: 503, operation: "login", message: "" }).isRateLimited);
  assert.ok(new ApiError({ status: 429, operation: "login", message: "" }).isRateLimited);
});
check("network failure is distinct from a server error", () => {
  assert.match(mapApiError("getCars", 0), /Can't reach the server/);
  assert.ok(new ApiError({ status: 0, operation: "getCars", message: "", isNetworkError: true }).isNetworkError);
});
check("403 and 404 carry operation-specific wording", () => {
  assert.equal(mapApiError("createBooking", 403), "Only renters can request a car.");
  assert.equal(mapApiError("getBooking", 404), "We couldn't find this booking.");
});

console.log("\nenums");
check("role names map to the backend's ints", () => {
  assert.equal(parseRoleName("Renter"), UserRole.Renter);
  assert.equal(parseRoleName("Owner"), UserRole.Owner);
  assert.equal(parseRoleName("Admin"), UserRole.Admin);
  assert.equal(parseRoleName("Staff"), UserRole.Staff);
  assert.equal(UserRole.Renter, 0);
  assert.equal(UserRole.Staff, 3);
});
check("an unknown role throws rather than defaulting to Renter", () => {
  assert.throws(() => parseRoleName("Superuser"));
});
check("category query value is the enum name, not the label", () => {
  assert.equal(carCategoryName[CarCategory.FullSize], "FullSize");
  assert.equal(parseCategoryName("fullsize"), CarCategory.FullSize);
  assert.equal(parseCategoryName("SUV"), CarCategory.SUV);
  assert.equal(parseCategoryName("nope"), undefined);
});
check("booking status ints and labels match the domain enum", () => {
  assert.equal(BookingStatus.Pending, 0);
  assert.equal(BookingStatus.Disputed, 5);
  assert.equal(bookingStatusLabel[BookingStatus.InProgress], "In progress");
});

console.log("\npassword policy (mirrors RegisterCommandValidator)");
check("accepts a password satisfying all five rules", () => {
  assert.equal(isPasswordValid("Passw0rd!"), true);
  assert.equal(isPasswordValid("aB3$aaaa"), true);
});
check("rejects each rule independently", () => {
  assert.equal(isPasswordValid("Pw0rd!"), false, "under 8 characters");
  assert.equal(isPasswordValid("password0!"), false, "no uppercase");
  assert.equal(isPasswordValid("PASSWORD0!"), false, "no lowercase");
  assert.equal(isPasswordValid("Password!"), false, "no digit");
  assert.equal(isPasswordValid("Password0"), false, "no special character");
});
check("special-character set matches the C# character class exactly", () => {
  // From RegisterCommandValidator: [\^$*.\[\]{}()?\-""!@#%&/\\,><':;|_~`]
  const accepted = `^$*.[]{}()?-"!@#%&/\\,><':;|_~\``;
  for (const ch of accepted) {
    assert.equal(isPasswordValid(`Passw0rd${ch}`), true, `should accept ${ch}`);
  }
  // Characters people reach for that the server does NOT accept. This is why
  // the form spells the set out instead of saying "a special character".
  for (const ch of ["+", "=", " "]) {
    assert.equal(isPasswordValid(`Passw0rd${ch}`), false, `should reject ${ch}`);
  }
});
check("checklist reports rules individually", () => {
  const results = passwordRuleResults("passw0rd");
  assert.equal(results.length, 5);
  assert.equal(results.find((r) => r.id === "length")?.satisfied, true);
  assert.equal(results.find((r) => r.id === "digit")?.satisfied, true);
  assert.equal(results.find((r) => r.id === "uppercase")?.satisfied, false);
  assert.equal(results.find((r) => r.id === "special")?.satisfied, false);
});
check("name and email rules match the validator", () => {
  assert.equal(nameError("", "First"), "First name is required.");
  assert.equal(nameError("   ", "Last"), "Last name is required.");
  assert.equal(nameError("a".repeat(50), "First"), null);
  assert.ok(nameError("a".repeat(51), "First"));
  assert.equal(isEmailValid("nour@example.com"), true);
  assert.equal(isEmailValid("nope"), false);
});

console.log("\nbooking rules");
check("cancel is offered only where the handler accepts it", () => {
  // Refused server-side: "Booking is already cancelled." / "Completed bookings
  // cannot be cancelled." Rendering the control in those states would produce
  // a guaranteed 500.
  assert.equal(canCancelBooking(BookingStatus.Pending), true);
  assert.equal(canCancelBooking(BookingStatus.Confirmed), true);
  assert.equal(canCancelBooking(BookingStatus.InProgress), true);
  assert.equal(canCancelBooking(BookingStatus.Disputed), true, "handler does not refuse it");
  assert.equal(canCancelBooking(BookingStatus.Completed), false);
  assert.equal(canCancelBooking(BookingStatus.Cancelled), false);
});
check("trip tabs partition every status exactly once", () => {
  // A status matching no tab would make a booking disappear from /trips with
  // no indication at all.
  const all = enumValues(BookingStatus);
  for (const status of all) {
    const matches = TRIP_TABS.filter((t) => t.statuses.includes(status));
    assert.equal(matches.length, 1, `status ${status} matched ${matches.length} tabs`);
  }
  const covered = TRIP_TABS.flatMap((t) => [...t.statuses]);
  assert.equal(covered.length, all.length, "no status counted twice");
});
check("booking access is limited to its participants", () => {
  const booking = { renterId: "renter-1", ownerId: "owner-1" };
  const as = (userId: string, role: UserRole) => ({ userId, role });

  assert.equal(isBookingParticipant(booking, as("renter-1", UserRole.Renter)), true);
  assert.equal(isBookingParticipant(booking, as("owner-1", UserRole.Owner)), true);
  assert.equal(isBookingParticipant(booking, as("someone-else", UserRole.Renter)), false);
  assert.equal(isBookingParticipant(booking, null), false, "signed out");
  // Staff and Admin review other people's bookings by design.
  assert.equal(isBookingParticipant(booking, as("admin", UserRole.Admin)), true);
  assert.equal(isBookingParticipant(booking, as("staff", UserRole.Staff)), true);
});

console.log("\npost-sign-in redirect");
check("keeps same-origin paths", () => {
  assert.equal(safeNext("/trips"), "/trips");
  assert.equal(safeNext("/cars/abc/book?from=search"), "/cars/abc/book?from=search");
});
check("refuses off-site destinations", () => {
  // An unchecked `next` is an open redirect, and sign-in is exactly when a
  // user is least likely to notice being bounced somewhere else.
  assert.equal(safeNext("https://evil.example"), "/");
  assert.equal(safeNext("//evil.example"), "/", "protocol-relative");
  assert.equal(safeNext("/\\evil.example"), "/", "backslash variant");
  assert.equal(safeNext("javascript:alert(1)"), "/");
  assert.equal(safeNext(null), "/");
  assert.equal(safeNext(""), "/");
});

console.log(`\n${passed} checks passed\n`);
