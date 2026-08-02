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
import { buildReviewQueue, countPhantomRows } from "@/lib/verification-queue";
import { validateImageFile, MAX_UPLOAD_BYTES } from "@/lib/uploads";
import { canCancelBooking, isBookingParticipant, TRIP_TABS } from "@/lib/bookings";
import { buildAttentionList, carIdsWithBookings, inboxAction, INBOX_TABS, ownerStats, renterLabel, todayTimeline } from "@/lib/owner";
import { EMPTY_DRAFT, errorsForStep, normaliseVin, toCarInput, validateCarDraft, WIZARD_STEPS, type CarDraft } from "@/lib/car-form";
import { clampCleanliness, clampFuel, inspectionModeFor, validateInspection } from "@/lib/inspection";
import { safeNext } from "@/components/auth/redirect-if-authenticated";
import { canReviewBooking, formatRating, ownReview, reviewDirectionFor, starDistribution } from "@/lib/reviews";
import { canMessageOnBooking, counterpartyOf, groupMessagesByDay } from "@/lib/messages";
import { isUnread, notificationHref, notificationIcon } from "@/lib/notifications";
import type { MessageDto, ReviewDto } from "@/types/api";
import { parseRoleName, parseCategoryName, carCategoryName, CarCategory, UserRole, BookingStatus, bookingStatusLabel, enumValues, VerificationStatus, VerificationDocumentType, GovernmentIdType, governmentIdTypeLabel, TransmissionType, FuelType, NotificationType, ReviewType } from "@/lib/enums";
import type { BookingDto } from "@/types/api";

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
check("409 is the one status whose server message is shown, not replaced", () => {
  // ConflictException carries text written for the user — "this car has 3
  // bookings against it". `toApiError` passes it through; these are only the
  // fallbacks for a body that couldn't be read.
  assert.ok(new ApiError({ status: 409, operation: "deleteCar", message: "" }).isConflict);
  assert.match(mapApiError("deleteCar", 409), /Turn off Listed/);
  assert.match(mapApiError("uploadInspectionPhoto", 409), /start or end the trip first/);
  assert.ok(!new ApiError({ status: 500, operation: "deleteCar", message: "" }).isConflict);
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

console.log("\nupload validation (the only validation there is)");
const fakeFile = (type: string, size: number) => ({ type, size }) as File;
check("accepts the image types Cloudinary handles", () => {
  assert.equal(validateImageFile(fakeFile("image/jpeg", 500_000)), null);
  assert.equal(validateImageFile(fakeFile("image/png", 500_000)), null);
  assert.equal(validateImageFile(fakeFile("image/webp", 500_000)), null);
});
check("rejects PDFs by name — the common mistake for scanned documents", () => {
  const msg = validateImageFile(fakeFile("application/pdf", 100_000));
  assert.ok(msg);
  assert.match(msg, /PDFs aren't supported/);
  // UploadImageAsync uses ImageUploadParams, so a PDF fails server-side as an
  // opaque 500 with nothing for the user to act on.
});
check("rejects oversized and empty files before they reach the server", () => {
  const big = validateImageFile(fakeFile("image/jpeg", MAX_UPLOAD_BYTES + 1));
  assert.ok(big);
  assert.match(big, /under 10\.0 MB/);
  const empty = validateImageFile(fakeFile("image/jpeg", 0));
  assert.ok(empty);
  // A zero-length file makes UploadImageAsync return "", which the handler
  // turns into "Document upload failed." — a 500 with no detail.
  assert.match(empty, /empty/);
});
check("every message says what to do, not what is wrong", () => {
  for (const f of [
    fakeFile("application/pdf", 10),
    fakeFile("image/gif", 10),
    fakeFile("image/jpeg", MAX_UPLOAD_BYTES + 1),
  ]) {
    const msg = validateImageFile(f);
    assert.ok(msg && !/^invalid/i.test(msg), `unhelpful message: ${msg}`);
  }
});

console.log("\nverification review queue");
const row = (over: Partial<Record<string, unknown>> = {}) => ({
  userId: "u1", fullName: "A B", email: "a@b.c",
  governmentIdImageUrl: null, governmentIdType: null,
  governmentIdStatus: VerificationStatus.Pending,
  driverLicenseFrontImageUrl: null, driverLicenseBackImageUrl: null,
  driverLicenseStatus: VerificationStatus.Pending,
  driverLicenseExpiryDate: null,
  ...over,
} as Parameters<typeof buildReviewQueue>[0][number]);

check("drops phantom rows — Pending is the enum default, not a real submission", () => {
  // A brand-new UserVerification has both statuses at 0 (= Pending) with no
  // images. The API's filter is status-only, so these arrive as reviewable.
  const items = buildReviewQueue([row()], governmentIdTypeLabel);
  assert.equal(items.length, 0, "nothing was actually uploaded");
  assert.equal(countPhantomRows([row()]), 2, "and both are reported, not hidden");
});
check("a government ID with an image becomes one reviewable item", () => {
  const items = buildReviewQueue(
    [row({ governmentIdImageUrl: "https://x/id.png", governmentIdType: GovernmentIdType.Passport })],
    governmentIdTypeLabel,
  );
  assert.equal(items.length, 1);
  assert.equal(items[0].documentType, VerificationDocumentType.GovernmentId);
  assert.equal(items[0].idTypeLabel, "Passport");
  assert.equal(items[0].images.length, 1);
});
check("licence front and back are ONE decision carrying both images", () => {
  // The backend stores a single DriverLicenseStatus and ProcessVerification
  // flips DriverLicenseVerified from either side — so two rows would let a
  // reviewer act twice on one decision, resolving the other invisibly.
  const items = buildReviewQueue(
    [row({
      driverLicenseFrontImageUrl: "https://x/front.png",
      driverLicenseBackImageUrl: "https://x/back.png",
    })],
    governmentIdTypeLabel,
  );
  assert.equal(items.length, 1);
  assert.equal(items[0].images.length, 2);
  assert.deepEqual(items[0].images.map((i) => i.label), ["Front", "Back"]);
  assert.equal(items[0].documentType, VerificationDocumentType.DriverLicenseFront);
});
check("a licence with only one side uploaded is still reviewable", () => {
  const items = buildReviewQueue(
    [row({ driverLicenseFrontImageUrl: "https://x/front.png" })],
    governmentIdTypeLabel,
  );
  assert.equal(items.length, 1);
  assert.equal(items[0].images.length, 1);
});
check("already-decided documents leave the queue", () => {
  const items = buildReviewQueue(
    [row({
      governmentIdImageUrl: "https://x/id.png",
      governmentIdStatus: VerificationStatus.Verified,
      driverLicenseFrontImageUrl: "https://x/front.png",
      driverLicenseStatus: VerificationStatus.Rejected,
    })],
    governmentIdTypeLabel,
  );
  assert.equal(items.length, 0);
});
check("one user can contribute two items, each with a stable key", () => {
  const items = buildReviewQueue(
    [row({
      governmentIdImageUrl: "https://x/id.png",
      driverLicenseFrontImageUrl: "https://x/front.png",
    })],
    governmentIdTypeLabel,
  );
  assert.equal(items.length, 2);
  assert.deepEqual(items.map((i) => i.key), ["u1:id", "u1:licence"]);
});

console.log("\nowner inbox");
check("every status maps to exactly one action, and only to a live one", () => {
  // Start accepts Pending or Confirmed; End accepts InProgress alone. Anything
  // else has no handler that would take it, and a button there is a 500.
  assert.equal(inboxAction(BookingStatus.Pending), "start");
  assert.equal(inboxAction(BookingStatus.Confirmed), "start");
  assert.equal(inboxAction(BookingStatus.InProgress), "end");
  assert.equal(inboxAction(BookingStatus.Completed), "view");
  assert.equal(inboxAction(BookingStatus.Cancelled), "view");
  assert.equal(inboxAction(BookingStatus.Disputed), "view");
});
check("inbox tabs partition every status exactly once", () => {
  const all = enumValues(BookingStatus);
  for (const status of all) {
    const matches = INBOX_TABS.filter((t) => t.statuses.includes(status));
    assert.equal(matches.length, 1, `status ${status} matched ${matches.length} tabs`);
  }
  assert.equal(INBOX_TABS.flatMap((t) => [...t.statuses]).length, all.length);
});
check("renter labels are short and derived from the id alone", () => {
  // BookingDto carries no renter name. A per-row GET /api/users/{id} would be
  // an N+1 on a table built to be scanned.
  assert.equal(renterLabel("a1b2c3d4-0000-0000-0000-000000000000"), "Renter a1b2c3d4");
});

console.log("\nowner dashboard");
const booking = (over: Partial<BookingDto> = {}): BookingDto => ({
  id: "b1", carId: "c1", carMake: "Toyota", carModel: "Corolla", carYear: 2022,
  carColor: "Silver", carLocationCity: "Amman", carLocationState: "Amman",
  renterId: "r1", ownerId: "o1",
  startDate: "2026-08-01T10:00:00Z", endDate: "2026-08-04T10:00:00Z",
  actualPickupDateTime: null, actualReturnDateTime: null,
  pricePerDay: 100, totalDays: 3, subTotal: 300, serviceFee: 30, taxAmount: 15,
  securityDeposit: 250, totalAmount: 595,
  mileageLimit: null, startMileage: null, endMileage: null, totalMileage: null,
  extraMileageCharge: null,
  status: BookingStatus.Pending, cancelledAt: null, cancelledByUserId: null,
  cancellationReason: null, createdAt: "2026-07-20T10:00:00Z",
  ...over,
});
// Local noon, so "today" comparisons don't straddle a UTC date boundary.
const noon = new Date(2026, 7, 1, 12, 0, 0);

check("earnings count the subtotal of completed trips, not the total billed", () => {
  // totalAmount includes the 10% fee, the 5% tax and a deposit that goes back
  // to the renter. None of it is the owner's money.
  const stats = ownerStats(
    [
      booking({ id: "1", status: BookingStatus.Completed, subTotal: 300, totalAmount: 595 }),
      booking({ id: "2", status: BookingStatus.Completed, subTotal: 120, totalAmount: 300 }),
      booking({ id: "3", status: BookingStatus.InProgress, subTotal: 999 }),
    ],
    noon,
  );
  assert.equal(stats.estimatedEarnings, 420, "in-progress trips are not earnings yet");
});
check("tiles count what their labels claim", () => {
  const stats = ownerStats(
    [
      booking({ id: "1", status: BookingStatus.Pending, startDate: new Date(2026, 7, 20).toISOString() }),
      booking({ id: "2", status: BookingStatus.InProgress, startDate: new Date(2026, 6, 25).toISOString() }),
      booking({ id: "3", status: BookingStatus.Confirmed, startDate: new Date(2026, 7, 1, 9).toISOString() }),
      booking({ id: "4", status: BookingStatus.Cancelled, startDate: new Date(2026, 7, 1, 9).toISOString() }),
    ],
    noon,
  );
  assert.equal(stats.newRequests, 1);
  assert.equal(stats.tripsUnderWay, 1);
  assert.equal(stats.pickupsToday, 1, "a cancelled booking is not a pick-up");
});
check("attention list is ordered by urgency, then by time", () => {
  const items = buildAttentionList(
    [
      booking({ id: "request", status: BookingStatus.Pending, startDate: new Date(2026, 7, 20).toISOString() }),
      booking({ id: "today", status: BookingStatus.Confirmed, startDate: new Date(2026, 7, 1, 16).toISOString() }),
      booking({ id: "overdue-return", status: BookingStatus.InProgress, endDate: new Date(2026, 6, 30).toISOString() }),
      booking({ id: "missed", status: BookingStatus.Confirmed, startDate: new Date(2026, 6, 29).toISOString() }),
    ],
    noon,
  );
  assert.deepEqual(
    items.map((i) => i.booking.id),
    ["overdue-return", "missed", "today", "request"],
  );
});
check("a booking appears in the list at most once", () => {
  // A pending booking due today is one job, not a request *and* a pick-up.
  const due = booking({ status: BookingStatus.Pending, startDate: new Date(2026, 7, 1, 9).toISOString() });
  const items = buildAttentionList([due], noon);
  assert.equal(items.length, 1);
  assert.equal(items[0].kind, "pickup-today");
});
check("finished and future-confirmed bookings need nothing", () => {
  const quiet = [
    booking({ id: "1", status: BookingStatus.Completed }),
    booking({ id: "2", status: BookingStatus.Cancelled }),
    booking({ id: "3", status: BookingStatus.Confirmed, startDate: new Date(2026, 7, 20).toISOString() }),
    booking({ id: "4", status: BookingStatus.InProgress, endDate: new Date(2026, 7, 20).toISOString() }),
  ];
  assert.equal(buildAttentionList(quiet, noon).length, 0);
});
check("today's timeline has both ends of a trip, in clock order", () => {
  const events = todayTimeline(
    [
      booking({ id: "out", status: BookingStatus.Confirmed, startDate: new Date(2026, 7, 1, 15).toISOString() }),
      booking({
        id: "back", status: BookingStatus.InProgress,
        startDate: new Date(2026, 6, 28).toISOString(),
        endDate: new Date(2026, 7, 1, 9).toISOString(),
      }),
    ],
    noon,
  );
  assert.deepEqual(events.map((e) => [e.booking.id, e.type]), [["back", "return"], ["out", "pickup"]]);
  assert.equal(events[0].done, false, "done comes off the actual timestamp, not the clock");
});
check("deletable cars are the ones with no booking history at all", () => {
  // Booking -> Car is OnDelete(Restrict), so the FK refuses the delete and the
  // owner gets an unexplained 500.
  const ids = carIdsWithBookings([
    booking({ carId: "c1", status: BookingStatus.Cancelled }),
    booking({ carId: "c2", status: BookingStatus.Completed }),
  ]);
  assert.ok(ids.has("c1"), "even a cancelled booking blocks the delete");
  assert.ok(ids.has("c2"));
  assert.equal(ids.has("c3"), false);
});

console.log("\ncar form (mirrors CreateCarCommandValidator)");
const validDraft: CarDraft = {
  ...EMPTY_DRAFT,
  make: "Toyota", model: "Corolla", year: "2022", color: "Silver",
  licensePlate: "ABC-1234", vin: "1HGBH41JXMN109186",
  transmission: TransmissionType.Automatic, fuelType: FuelType.Petrol,
  category: CarCategory.Compact,
  seats: "5", doors: "4", mileage: "42000",
  lat: "31.9539", lng: "35.9106",
  locationAddress: "12 Rainbow St", locationCity: "Amman", locationState: "Amman",
  pricePerDay: "45", securityDeposit: "200",
};
const at2026 = { now: new Date(2026, 0, 1) };

check("a complete draft passes", () => {
  assert.deepEqual(validateCarDraft(validDraft, at2026), {});
});
check("VIN rules match Length(17) + ^[A-HJ-NPR-Z0-9]*$", () => {
  const vin = (v: string) => validateCarDraft({ ...validDraft, vin: v }, at2026).vin;
  assert.equal(vin("1HGBH41JXMN109186"), undefined);
  assert.match(vin("1HGBH41JXMN10918")!, /16 of 17/, "says how far off, not 'invalid'");
  assert.match(vin("1HGBH41JXMN1091867")!, /18 of 17/);
  assert.match(vin("1HGBH41JXMN10918O")!, /never contain I, O or Q/);
  assert.match(vin("1HGBH41JXMN10918I")!, /never contain I, O or Q/);
  assert.match(vin("1HGBH41JXMN10918Q")!, /never contain I, O or Q/);
  assert.ok(vin(""), "required");
});
check("a VIN is normalised the way it is written down", () => {
  // Copied off a document with separators, or typed on a phone keyboard.
  assert.equal(normaliseVin("1hgbh41j-xmn 109186"), "1HGBH41JXMN109186");
  assert.deepEqual(validateCarDraft({ ...validDraft, vin: "1hgbh41jxmn109186" }, at2026), {});
});
check("year spans 1900 to next year, like DateTime.Now.Year + 1", () => {
  const year = (y: string) => validateCarDraft({ ...validDraft, year: y }, at2026).year;
  assert.equal(year("1900"), undefined);
  assert.equal(year("2027"), undefined, "next year's models are allowed");
  assert.ok(year("1899"));
  assert.ok(year("2028"));
  assert.ok(year(""));
});
check("seats 1-20, doors 1-10, mileage >= 0, price > 0, deposit >= 0", () => {
  const field = (over: Partial<CarDraft>) => validateCarDraft({ ...validDraft, ...over }, at2026);
  assert.equal(field({ seats: "1" }).seats, undefined);
  assert.equal(field({ seats: "20" }).seats, undefined);
  assert.ok(field({ seats: "0" }).seats);
  assert.ok(field({ seats: "21" }).seats);
  assert.equal(field({ doors: "10" }).doors, undefined);
  assert.ok(field({ doors: "11" }).doors);
  assert.equal(field({ mileage: "0" }).mileage, undefined);
  assert.ok(field({ mileage: "-1" }).mileage);
  assert.ok(field({ pricePerDay: "0" }).pricePerDay, "GreaterThan(0), not >=");
  assert.equal(field({ securityDeposit: "0" }).securityDeposit, undefined);
  assert.ok(field({ securityDeposit: "-1" }).securityDeposit);
});
check("enums must be chosen, because 0 is a real value", () => {
  // IsInEnum() passes for 0, so a pre-selected default would silently submit
  // Manual / Petrol / Economy for an owner who never opened the field.
  const errors = validateCarDraft(
    { ...validDraft, transmission: null, fuelType: null, category: null },
    at2026,
  );
  assert.ok(errors.transmission && errors.fuelType && errors.category);
});
check("coordinates are required and bounded — there is no geocoding endpoint", () => {
  const field = (over: Partial<CarDraft>) => validateCarDraft({ ...validDraft, ...over }, at2026);
  assert.ok(field({ lat: "" }).lat);
  assert.ok(field({ lat: "91" }).lat);
  assert.ok(field({ lng: "-181" }).lng);
  assert.equal(field({ lat: "0", lng: "0" }).lat, undefined, "0,0 is valid, if unlikely");
});
check("the four unvalidated price fields stay optional but can't go negative", () => {
  const field = (over: Partial<CarDraft>) => validateCarDraft({ ...validDraft, ...over }, at2026);
  assert.deepEqual(field({ pricePerWeek: "", pricePerMonth: "", dailyMileageLimit: "", extraMileageCharge: "" }), {});
  assert.ok(field({ pricePerWeek: "-1" }).pricePerWeek);
  assert.ok(field({ extraMileageCharge: "-1" }).extraMileageCharge);
});
check("every message says what to do, not what is wrong", () => {
  const messages = Object.values(validateCarDraft(EMPTY_DRAFT, at2026));
  assert.ok(messages.length > 0);
  for (const message of messages) {
    assert.ok(!/^invalid/i.test(message!), `unhelpful message: ${message}`);
    assert.ok(!/must not exceed|is required\./i.test(message!), `server wording leaked: ${message}`);
  }
});
check("every validatable field belongs to exactly one wizard step", () => {
  // A field owned by no step blocks submission with nothing highlighted
  // anywhere; a field owned by two fails the same person twice.
  const flagged = Object.keys(validateCarDraft(EMPTY_DRAFT, at2026));
  for (const field of flagged) {
    const steps = WIZARD_STEPS.filter((s) => (s.fields as readonly string[]).includes(field));
    assert.equal(steps.length, 1, `${field} is owned by ${steps.length} steps`);
  }
});
check("a step reports only its own errors, so a later step never blocks Next", () => {
  const errors = validateCarDraft(EMPTY_DRAFT, at2026);
  assert.ok(errorsForStep(errors, 0).make, "basics owns make");
  assert.equal(errorsForStep(errors, 0).pricePerDay, undefined, "pricing does not");
  assert.deepEqual(errorsForStep(errors, 3), {}, "photos has no fields");
});
check("toCarInput sends ints for enums and 0 for blank optionals", () => {
  const input = toCarInput(validDraft);
  assert.equal(input.transmission, 1, "Automatic = 1, as an int");
  assert.equal(input.category, CarCategory.Compact);
  assert.equal(input.pricePerWeek, 0, "blank means 0, which is what the API stores");
  assert.deepEqual(input.location, { lat: 31.9539, lng: 35.9106 });
  assert.equal(input.vin, "1HGBH41JXMN109186");
});

console.log("\ntrip inspection (the client is the only guard)");
check("only Pending, Confirmed and InProgress reach a form", () => {
  assert.equal(inspectionModeFor(BookingStatus.Pending), "pickup", "the start handler takes Pending");
  assert.equal(inspectionModeFor(BookingStatus.Confirmed), "pickup");
  assert.equal(inspectionModeFor(BookingStatus.InProgress), "return");
  for (const status of [BookingStatus.Completed, BookingStatus.Cancelled, BookingStatus.Disputed]) {
    assert.equal(inspectionModeFor(status), null);
  }
});
check("fuel and cleanliness are clamped to their documented ranges", () => {
  // Nothing on the server checks either. These comments in the domain —
  // "// 0-100", "// 1-5" — are the whole specification.
  assert.equal(clampFuel(-20), 0);
  assert.equal(clampFuel(900), 100);
  assert.equal(clampFuel(47.6), 48);
  assert.equal(clampFuel(Number.NaN), 0);
  assert.equal(clampCleanliness(0), 1);
  assert.equal(clampCleanliness(9), 5);
  assert.equal(clampCleanliness(Number.NaN), 1);
});
const inspection = (over = {}) => ({
  mileage: "42100", fuelLevel: 60, cleanliness: 4,
  hasDamage: false, damageDescription: "", at: "2026-08-01T14:30",
  ...over,
});
check("a return reading below the pick-up reading is refused", () => {
  const errors = validateInspection(inspection({ mileage: "41000" }), {
    mode: "return",
    startMileage: 42000,
  });
  assert.match(errors.mileage!, /42,000 km at pick-up/);
  // Not a server rule — there is no server rule — but it makes TotalMileage
  // negative, and that number is the record of the trip.
  assert.deepEqual(
    validateInspection(inspection({ mileage: "42100" }), { mode: "return", startMileage: 42000 }),
    {},
  );
});
check("damage recorded with no description is refused", () => {
  const errors = validateInspection(inspection({ hasDamage: true }), {
    mode: "pickup", startMileage: null,
  });
  assert.ok(errors.damageDescription);
  assert.deepEqual(
    validateInspection(inspection({ hasDamage: true, damageDescription: "Scratch on the door" }), {
      mode: "pickup", startMileage: null,
    }),
    {},
  );
});
check("the odometer is required and whole", () => {
  const errors = (mileage: string) =>
    validateInspection(inspection({ mileage }), { mode: "pickup", startMileage: null }).mileage;
  assert.ok(errors(""));
  assert.ok(errors("-1"));
  assert.ok(errors("42.5"));
  assert.equal(errors("0"), undefined, "a brand-new car reads 0");
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

console.log("\nreviews");

/** A booking, as far as the review rules are concerned. */
const trip = (status: BookingStatus) => ({
  renterId: "renter-1",
  ownerId: "owner-1",
  status,
});
const renterSide = { userId: "renter-1", role: UserRole.Renter };
const ownerSide = { userId: "owner-1", role: UserRole.Owner };
const adminSide = { userId: "admin-1", role: UserRole.Admin };
const outsider = { userId: "nobody", role: UserRole.Renter };

check("direction follows which side of the booking you are on", () => {
  assert.equal(reviewDirectionFor(trip(BookingStatus.Completed), renterSide), ReviewType.RenterToOwner);
  assert.equal(reviewDirectionFor(trip(BookingStatus.Completed), ownerSide), ReviewType.OwnerToRenter);
  assert.equal(reviewDirectionFor(trip(BookingStatus.Completed), outsider), null);
  assert.equal(reviewDirectionFor(trip(BookingStatus.Completed), null), null);
});

check("Admin has no side, so cannot review", () => {
  // Mirrors BookingAccess.EnsureThreadParticipant, which — unlike
  // EnsureParticipant — does not exempt Admin or Staff. A review needs a
  // reviewer and a reviewee; a third party is neither.
  assert.equal(reviewDirectionFor(trip(BookingStatus.Completed), adminSide), null);
  assert.equal(canReviewBooking(trip(BookingStatus.Completed), adminSide, []), false);
});

check("only a Completed trip can be reviewed", () => {
  // Completed is the only status meaning a trip actually happened, and
  // CreateReviewCommandHandler throws ConflictException for every other one.
  // `enumValues` returns plain numbers, so narrow before indexing the label map.
  for (const value of enumValues(BookingStatus)) {
    const status = value as BookingStatus;
    assert.equal(
      canReviewBooking(trip(status), renterSide, []),
      status === BookingStatus.Completed,
      `status ${bookingStatusLabel[status]}`,
    );
  }
});

check("one review per direction, and the two are independent", () => {
  const done = trip(BookingStatus.Completed);
  const renterReview = { type: ReviewType.RenterToOwner };

  // The renter has used their turn...
  assert.equal(canReviewBooking(done, renterSide, [renterReview]), false);
  // ...and the owner's is untouched by that.
  assert.equal(canReviewBooking(done, ownerSide, [renterReview]), true);
});

check("ownReview returns your side's review, never the other's", () => {
  const done = trip(BookingStatus.Completed);
  const reviews = [
    { id: "a", type: ReviewType.RenterToOwner },
    { id: "b", type: ReviewType.OwnerToRenter },
  ] as ReviewDto[];

  assert.equal(ownReview(done, renterSide, reviews)?.id, "a");
  assert.equal(ownReview(done, ownerSide, reviews)?.id, "b");
  assert.equal(ownReview(done, adminSide, reviews), null);
});

check("star distribution buckets, totals and averages agree", () => {
  const d = starDistribution([{ rating: 5 }, { rating: 5 }, { rating: 3 }, { rating: 1 }]);
  assert.deepEqual(d.counts, [1, 0, 1, 0, 2]);
  assert.equal(d.total, 4);
  assert.equal(d.average, 3.5);
  // The counts must account for every review, or the bar chart quietly lies.
  assert.equal(d.counts.reduce((a, b) => a + b, 0), d.total);
});

check("out-of-range ratings are discarded, not mis-bucketed", () => {
  // Cannot come from the validator, but a hand-edited row should not corrupt
  // the chart or write outside the array.
  const d = starDistribution([{ rating: 0 }, { rating: 6 }, { rating: 4 }]);
  assert.deepEqual(d.counts, [0, 0, 0, 1, 0]);
  assert.equal(d.total, 1);
});

check("an empty distribution does not divide by zero", () => {
  const d = starDistribution([]);
  assert.equal(d.total, 0);
  assert.equal(d.average, 0);
  assert.equal(formatRating(0), "—");
});

check("ratings render without a pointless decimal", () => {
  assert.equal(formatRating(4), "4");
  assert.equal(formatRating(4.25), "4.3");
  assert.equal(formatRating(3.5), "3.5");
});

console.log("\nmessages");

const thread = { renterId: "renter-1", ownerId: "owner-1" };

check("the counterparty is the other participant", () => {
  assert.equal(counterpartyOf(thread, renterSide), "owner-1");
  assert.equal(counterpartyOf(thread, ownerSide), "renter-1");
  assert.equal(counterpartyOf(thread, outsider), null);
  assert.equal(counterpartyOf(thread, null), null);
});

check("Admin can read a thread but has nobody to send to", () => {
  // The read/write asymmetry on the server: EnsureParticipant exempts Admin,
  // EnsureThreadParticipant does not. Rendering a composer for them would
  // produce a 403 on the first send.
  assert.equal(counterpartyOf(thread, adminSide), null);
  assert.equal(canMessageOnBooking(thread, adminSide), false);
});

check("a cancelled or completed trip keeps its thread open", () => {
  // SendMessageCommandHandler has no status guard, deliberately: damage
  // disputes and deposit queries happen after the trip, not during it.
  assert.equal(canMessageOnBooking(thread, renterSide), true);
  assert.equal(canMessageOnBooking(thread, ownerSide), true);
});

check("messages group into local days, in order", () => {
  const msg = (id: string, sentAt: string) =>
    ({
      id,
      sentAt,
      bookingId: "b",
      senderId: "s",
      senderFirstName: "S",
      receiverId: "r",
      content: "x",
      readAt: null,
    }) as MessageDto;

  // Built from local parts so this holds in whatever timezone the suite runs
  // in — the same reason groupMessagesByDay does not use toISOString().
  const morning = new Date(2026, 4, 10, 9, 0, 0).toISOString();
  const lateSameDay = new Date(2026, 4, 10, 23, 30, 0).toISOString();
  const justAfterMidnight = new Date(2026, 4, 11, 0, 30, 0).toISOString();

  const groups = groupMessagesByDay([
    msg("a", morning),
    msg("b", lateSameDay),
    msg("c", justAfterMidnight),
  ]);

  assert.equal(groups.length, 2);
  assert.deepEqual(groups[0].messages.map((m) => m.id), ["a", "b"]);
  assert.deepEqual(groups[1].messages.map((m) => m.id), ["c"]);
  assert.equal(groups[0].day, "2026-05-10");
  assert.equal(groups[1].day, "2026-05-11");
});

check("an empty thread groups to nothing", () => {
  assert.deepEqual(groupMessagesByDay([]), []);
});

console.log("\nnotifications");

check("every notification type has somewhere to go", () => {
  // The check that matters: adding a NotificationType without giving it a
  // route fails here rather than shipping a notification nobody can click.
  for (const type of enumValues(NotificationType)) {
    const href = notificationHref({ type, relatedEntityId: "booking-1" });
    assert.ok(href.startsWith("/"), `type ${type} produced ${href}`);
  }
});

check("every notification type has an icon", () => {
  for (const type of enumValues(NotificationType)) {
    assert.ok(notificationIcon(type).length > 0, `type ${type}`);
  }
});

check("booking notifications link to the booking, not the list", () => {
  assert.equal(
    notificationHref({ type: NotificationType.BookingRequested, relatedEntityId: "b1" }),
    "/bookings/b1",
  );
  assert.equal(
    notificationHref({ type: NotificationType.MessageReceived, relatedEntityId: "b1" }),
    "/bookings/b1",
  );
});

check("a booking notification with no id falls back rather than linking to /bookings/null", () => {
  assert.equal(
    notificationHref({ type: NotificationType.TripEnded, relatedEntityId: null }),
    "/trips",
  );
});

check("verification notifications ignore the id entirely", () => {
  // They carry none — there is one verification per person, on their own page.
  assert.equal(
    notificationHref({ type: NotificationType.VerificationApproved, relatedEntityId: null }),
    "/account/verification",
  );
  assert.equal(
    notificationHref({ type: NotificationType.VerificationRejected, relatedEntityId: "ignored" }),
    "/account/verification",
  );
});

check("unread is the absence of a timestamp", () => {
  assert.equal(isUnread({ readAt: null }), true);
  assert.equal(isUnread({ readAt: "2026-05-10T09:00:00Z" }), false);
});

console.log("\nerror mapping for the new endpoints");

check("every new operation has a human sentence for a 500", () => {
  const operations = [
    "sendMessage",
    "getThreads",
    "getBookingMessages",
    "markThreadRead",
    "getUnreadMessageCount",
    "createReview",
    "deleteReview",
    "getCarReviews",
    "getUserReviews",
    "getBookingReviews",
    "getNotifications",
    "getUnreadNotificationCount",
    "markNotificationRead",
    "markAllNotificationsRead",
  ] as const;

  for (const operation of operations) {
    const message = mapApiError(operation, 500);
    assert.ok(message.length > 0, operation);
    assert.ok(
      !message.toLowerCase().includes("internal server error"),
      `${operation} leaked the server's wording`,
    );
  }
});

check("a 409 on createReview carries the server's own sentence", () => {
  // ConflictException messages are written for the user and client.ts passes
  // them through verbatim. The CONFLICT map is only the unreadable-body case.
  const conflict = new ApiError({
    status: 409,
    operation: "createReview",
    message: "You have already reviewed this trip.",
  });
  assert.equal(conflict.isConflict, true);
  assert.equal(conflict.message, "You have already reviewed this trip.");
});

check("sendMessage explains a 403 in terms of bookings", () => {
  assert.match(mapApiError("sendMessage", 403), /booking/i);
});

console.log(`\n${passed} checks passed\n`);
