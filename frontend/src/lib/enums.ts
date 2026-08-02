/**
 * Mirrors of the backend enums in `backend/Domain/**`.
 *
 * `Program.cs` registers no `JsonStringEnumConverter`, so every one of these
 * crosses the wire as an **int**, in both request and response bodies. The
 * numeric values here are the contract — do not reorder them.
 *
 * Query strings are the exception: `SearchCarsRequest.Category` is typed
 * `string?` and parsed with a case-insensitive `Enum.TryParse`, so it takes a
 * *name*. `SearchBookingsRequest.Status` is a typed enum and model-binds either
 * form.
 *
 * Labels are user-facing copy, not enum names — "In progress", not "InProgress".
 */

export enum UserRole {
  Renter = 0,
  Owner = 1,
  Admin = 2,
  Staff = 3,
}

export const userRoleLabel: Record<UserRole, string> = {
  [UserRole.Renter]: "Renter",
  [UserRole.Owner]: "Owner",
  [UserRole.Admin]: "Admin",
  [UserRole.Staff]: "Staff",
};

/**
 * `AuthenticationResult.role` is the one field the API sends as a string.
 * This is the only place that conversion happens.
 */
export function parseRoleName(name: string): UserRole {
  switch (name) {
    case "Renter":
      return UserRole.Renter;
    case "Owner":
      return UserRole.Owner;
    case "Admin":
      return UserRole.Admin;
    case "Staff":
      return UserRole.Staff;
    default:
      // An unknown role must not silently become Renter — that would hand out
      // a renter's UI to someone the server considers something else.
      throw new Error(`Unrecognised role from API: ${name}`);
  }
}

export enum UserStatus {
  Active = 0,
  Inactive = 1,
  Suspended = 2,
}

export const userStatusLabel: Record<UserStatus, string> = {
  [UserStatus.Active]: "Active",
  [UserStatus.Inactive]: "Inactive",
  [UserStatus.Suspended]: "Suspended",
};

export enum VerificationStatus {
  Pending = 0,
  Verified = 1,
  Rejected = 2,
  Unverified = 3,
}

export const verificationStatusLabel: Record<VerificationStatus, string> = {
  [VerificationStatus.Pending]: "In review",
  [VerificationStatus.Verified]: "Verified",
  [VerificationStatus.Rejected]: "Rejected",
  [VerificationStatus.Unverified]: "Not submitted",
};

export enum GovernmentIdType {
  Passport = 0,
  NationalId = 1,
  DriversLicense = 2,
}

export const governmentIdTypeLabel: Record<GovernmentIdType, string> = {
  [GovernmentIdType.Passport]: "Passport",
  [GovernmentIdType.NationalId]: "National ID",
  [GovernmentIdType.DriversLicense]: "Driver's licence",
};

export enum VerificationDocumentType {
  GovernmentId = 0,
  DriverLicenseFront = 1,
  DriverLicenseBack = 2,
}

export const verificationDocumentTypeLabel: Record<
  VerificationDocumentType,
  string
> = {
  [VerificationDocumentType.GovernmentId]: "Government ID",
  [VerificationDocumentType.DriverLicenseFront]: "Licence — front",
  [VerificationDocumentType.DriverLicenseBack]: "Licence — back",
};

export enum BookingStatus {
  Pending = 0,
  Confirmed = 1,
  InProgress = 2,
  Completed = 3,
  Cancelled = 4,
  Disputed = 5,
}

export const bookingStatusLabel: Record<BookingStatus, string> = {
  [BookingStatus.Pending]: "Pending",
  [BookingStatus.Confirmed]: "Confirmed",
  [BookingStatus.InProgress]: "In progress",
  [BookingStatus.Completed]: "Completed",
  [BookingStatus.Cancelled]: "Cancelled",
  [BookingStatus.Disputed]: "Disputed",
};

/**
 * Tailwind classes for the status pill, keyed to the tokens in `globals.css`.
 * Disputed deliberately shares Cancelled's colours — DESIGN.md §2.
 *
 * Every pill renders dot + label + background. Colour is never the only
 * signal, so these read in greyscale and for colour-blind users.
 */
export const bookingStatusClasses: Record<BookingStatus, string> = {
  [BookingStatus.Pending]: "text-status-pending bg-status-pending-bg",
  [BookingStatus.Confirmed]: "text-status-confirmed bg-status-confirmed-bg",
  [BookingStatus.InProgress]: "text-status-inprogress bg-status-inprogress-bg",
  [BookingStatus.Completed]: "text-status-completed bg-status-completed-bg",
  [BookingStatus.Cancelled]: "text-status-cancelled bg-status-cancelled-bg",
  [BookingStatus.Disputed]: "text-status-cancelled bg-status-cancelled-bg",
};

/** The lifecycle a booking travels. Terminal states are not on the track. */
export const BOOKING_TIMELINE = [
  BookingStatus.Pending,
  BookingStatus.Confirmed,
  BookingStatus.InProgress,
  BookingStatus.Completed,
] as const;

export const BOOKING_TERMINAL_STATUSES = [
  BookingStatus.Cancelled,
  BookingStatus.Disputed,
] as const;

export enum InspectionType {
  Pickup = 0,
  Return = 1,
}

/**
 * Which way round a review points. `Domain.Booking.ReviewType`.
 *
 * Only `RenterToOwner` feeds a car's rating — an owner's opinion of a renter
 * says nothing about the car.
 */
export enum ReviewType {
  RenterToOwner = 0,
  OwnerToRenter = 1,
}

export const reviewTypeLabel: Record<ReviewType, string> = {
  [ReviewType.RenterToOwner]: "Renter's review",
  [ReviewType.OwnerToRenter]: "Owner's review",
};

/**
 * What a notification is about. `Domain.User.NotificationType`.
 *
 * Adding a member here without giving it a route fails
 * `npm run verify:logic` — `notificationHref` is checked exhaustively, because
 * a notification you cannot click is worse than one that was never sent.
 */
export enum NotificationType {
  BookingRequested = 0,
  BookingCancelled = 1,
  TripStarted = 2,
  TripEnded = 3,
  MessageReceived = 4,
  ReviewReceived = 5,
  VerificationApproved = 6,
  VerificationRejected = 7,
}

export const notificationTypeLabel: Record<NotificationType, string> = {
  [NotificationType.BookingRequested]: "Booking request",
  [NotificationType.BookingCancelled]: "Booking cancelled",
  [NotificationType.TripStarted]: "Trip started",
  [NotificationType.TripEnded]: "Trip completed",
  [NotificationType.MessageReceived]: "New message",
  [NotificationType.ReviewReceived]: "New review",
  [NotificationType.VerificationApproved]: "Document approved",
  [NotificationType.VerificationRejected]: "Document rejected",
};

export enum TransmissionType {
  Manual = 0,
  Automatic = 1,
  SemiAutomatic = 2,
}

export const transmissionTypeLabel: Record<TransmissionType, string> = {
  [TransmissionType.Manual]: "Manual",
  [TransmissionType.Automatic]: "Automatic",
  [TransmissionType.SemiAutomatic]: "Semi-automatic",
};

export enum FuelType {
  Petrol = 0,
  Diesel = 1,
  Electric = 2,
  Hybrid = 3,
  LPG = 4,
}

export const fuelTypeLabel: Record<FuelType, string> = {
  [FuelType.Petrol]: "Petrol",
  [FuelType.Diesel]: "Diesel",
  [FuelType.Electric]: "Electric",
  [FuelType.Hybrid]: "Hybrid",
  [FuelType.LPG]: "LPG",
};

export enum CarCategory {
  Economy = 0,
  Compact = 1,
  Intermediate = 2,
  Standard = 3,
  FullSize = 4,
  Luxury = 5,
  Premium = 6,
  SUV = 7,
  Minivan = 8,
  Convertible = 9,
  Pickup = 10,
}

export const carCategoryLabel: Record<CarCategory, string> = {
  [CarCategory.Economy]: "Economy",
  [CarCategory.Compact]: "Compact",
  [CarCategory.Intermediate]: "Intermediate",
  [CarCategory.Standard]: "Standard",
  [CarCategory.FullSize]: "Full size",
  [CarCategory.Luxury]: "Luxury",
  [CarCategory.Premium]: "Premium",
  [CarCategory.SUV]: "SUV",
  [CarCategory.Minivan]: "Minivan",
  [CarCategory.Convertible]: "Convertible",
  [CarCategory.Pickup]: "Pickup",
};

/**
 * The name `/api/cars/search?category=` expects. The server parses this
 * case-insensitively against the C# enum, so it must be the enum's *name*,
 * not the display label — "FullSize", never "Full size".
 */
export const carCategoryName: Record<CarCategory, string> = {
  [CarCategory.Economy]: "Economy",
  [CarCategory.Compact]: "Compact",
  [CarCategory.Intermediate]: "Intermediate",
  [CarCategory.Standard]: "Standard",
  [CarCategory.FullSize]: "FullSize",
  [CarCategory.Luxury]: "Luxury",
  [CarCategory.Premium]: "Premium",
  [CarCategory.SUV]: "SUV",
  [CarCategory.Minivan]: "Minivan",
  [CarCategory.Convertible]: "Convertible",
  [CarCategory.Pickup]: "Pickup",
};

export function parseCategoryName(name: string): CarCategory | undefined {
  const match = Object.entries(carCategoryName).find(
    ([, n]) => n.toLowerCase() === name.trim().toLowerCase(),
  );
  return match ? (Number(match[0]) as CarCategory) : undefined;
}

export enum CarImageType {
  Exterior = 0,
  Interior = 1,
  Engine = 2,
  Document = 3,
}

/**
 * The six feature keys `SearchCarsQueryHandler` actually recognises, with the
 * `CarDto` field each maps to. Anything not in this list is silently ignored
 * server-side, so the UI must never offer a filter outside it.
 *
 * The handler accepts aliases for four of them ("usb charging", "child seat",
 * "airconditioning", "backup camera"); these are the canonical spellings.
 */
export const CAR_FEATURES = [
  { key: "gps", field: "hasGPS", label: "GPS" },
  { key: "bluetooth", field: "hasBluetooth", label: "Bluetooth" },
  { key: "usb", field: "hasUSBCharging", label: "USB charging" },
  { key: "childseat", field: "hasChildSeat", label: "Child seat" },
  { key: "ac", field: "hasAirConditioning", label: "Air conditioning" },
  { key: "backupcamera", field: "hasBackupCamera", label: "Backup camera" },
] as const;

export type CarFeatureKey = (typeof CAR_FEATURES)[number]["key"];
export type CarFeatureField = (typeof CAR_FEATURES)[number]["field"];

/** Enumerate a numeric enum's members without picking up its reverse mapping. */
export function enumValues<T extends Record<string, string | number>>(
  e: T,
): number[] {
  return Object.values(e).filter((v): v is number => typeof v === "number");
}
