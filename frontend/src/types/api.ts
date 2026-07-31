/**
 * Hand-written mirrors of the backend DTOs. There is no OpenAPI codegen step,
 * so these files *are* the contract — check them against `/swagger` when the
 * backend changes.
 *
 * Every enum-typed field is a number on the wire (see lib/enums.ts).
 * Every `DateTime` is an ISO-8601 string in UTC.
 * Every `decimal` is a JSON number.
 */

import type {
  BookingStatus,
  CarCategory,
  CarImageType,
  FuelType,
  GovernmentIdType,
  InspectionType,
  TransmissionType,
  UserRole,
  UserStatus,
  VerificationStatus,
} from "@/lib/enums";

/** `Domain.Booking.Point` — non-nullable on a car. */
export type Point = {
  lat: number;
  lng: number;
};

/** `Application.Common.Models.AuthenticationResult`. */
export type AuthenticationResult = {
  token: string;
  refreshToken: string;
  /** ISO-8601. Drives the proactive refresh timer; the token lives 60 minutes. */
  expiry: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  /** The one enum the API sends as a string. Convert with `parseRoleName`. */
  role: string;
};

/**
 * `Application.Cars.Common.CarImageDto`.
 *
 * Carries the **id**, which is what `DELETE /api/cars/images/{imageId}` and
 * `PUT /api/cars/images/{imageId}/primary` need. `CarSearchResultDto` still
 * sends bare URLs, which is all a renter browsing results uses.
 */
export type CarImageDto = {
  id: string;
  url: string;
  type: CarImageType;
  isPrimary: boolean;
  displayOrder: number;
};

/**
 * `Application.Cars.Common.CarDto`.
 *
 * `images` was added to the DTO when the owner surfaces landed — before that
 * this type had none, and every caller that needed a photo had to pair its
 * fetch with a search call and match on id. Ordered primary first, then by
 * display order, the same as `CarSearchResultDto.imageUrls`.
 */
export type CarDto = {
  id: string;
  ownerId: string;
  make: string;
  model: string;
  year: number;
  color: string;
  licensePlate: string;
  vin: string;
  transmission: TransmissionType;
  fuelType: FuelType;
  seats: number;
  doors: number;
  mileage: number;
  category: CarCategory;
  hasGPS: boolean;
  hasBluetooth: boolean;
  hasUSBCharging: boolean;
  hasChildSeat: boolean;
  hasAirConditioning: boolean;
  hasBackupCamera: boolean;
  location: Point;
  locationAddress: string;
  locationCity: string;
  locationState: string;
  pricePerDay: number;
  pricePerWeek: number;
  pricePerMonth: number;
  securityDeposit: number;
  dailyMileageLimit: number;
  extraMileageCharge: number;
  isAvailable: boolean;
  isActive: boolean;
  averageRating: number;
  totalReviews: number;
  totalTrips: number;
  createdAt: string;
  images: CarImageDto[];
};

/**
 * `Application.Cars.Common.CarSearchResultDto`.
 *
 * Differs from `CarDto` by more than images: it has **no** `vin`, `mileage`,
 * `location`, `isActive` or `dailyMileageLimit`… but it does have `imageUrls`,
 * ordered primary-first then by display order.
 */
export type CarSearchResultDto = {
  id: string;
  ownerId: string;
  make: string;
  model: string;
  year: number;
  color: string;
  licensePlate: string;
  transmission: TransmissionType;
  fuelType: FuelType;
  seats: number;
  doors: number;
  category: CarCategory;
  hasGPS: boolean;
  hasBluetooth: boolean;
  hasUSBCharging: boolean;
  hasChildSeat: boolean;
  hasAirConditioning: boolean;
  hasBackupCamera: boolean;
  locationAddress: string;
  locationCity: string;
  locationState: string;
  pricePerDay: number;
  pricePerWeek: number;
  pricePerMonth: number;
  securityDeposit: number;
  dailyMileageLimit: number;
  extraMileageCharge: number;
  averageRating: number;
  totalReviews: number;
  totalTrips: number;
  isAvailable: boolean;
  createdAt: string;
  imageUrls: string[];
};

/** `Application.Cars.Queries.SearchCars.SearchCarsResult`. */
export type SearchCarsResult = {
  cars: CarSearchResultDto[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
};

/**
 * `Application.Bookings.Common.BookingDto`.
 *
 * The car fields are denormalised onto every booking, so a list needs no
 * per-row car fetch — but there is **no car image and no renter name**, which
 * is why booking rows show neither. See phases/README.md § known defects.
 *
 * `mileageLimit` and `extraMileageCharge` are always null/zero: nothing copies
 * `car.dailyMileageLimit` onto the booking at creation.
 */
export type BookingDto = {
  id: string;
  carId: string;
  carMake: string;
  carModel: string;
  carYear: number;
  carColor: string;
  carLocationCity: string;
  carLocationState: string;
  renterId: string;
  ownerId: string;
  startDate: string;
  endDate: string;
  actualPickupDateTime: string | null;
  actualReturnDateTime: string | null;
  pricePerDay: number;
  totalDays: number;
  subTotal: number;
  serviceFee: number;
  taxAmount: number;
  securityDeposit: number;
  totalAmount: number;
  mileageLimit: number | null;
  startMileage: number | null;
  endMileage: number | null;
  totalMileage: number | null;
  extraMileageCharge: number | null;
  status: BookingStatus;
  cancelledAt: string | null;
  cancelledByUserId: string | null;
  cancellationReason: string | null;
  createdAt: string;
};

/**
 * `Application.Bookings.Common.TripInspectionDto`.
 *
 * Everything the hand-over recorded. `BookingDto` carries only the mileage
 * readings and the actual pickup/return times — the fuel level, cleanliness
 * rating, damage description and photos were written to `TripInspections` and
 * had no way out of the database until `GET /api/bookings/{id}/inspections`.
 */
export type TripInspectionDto = {
  id: string;
  bookingId: string;
  type: InspectionType;
  inspectedByUserId: string;
  inspectionDateTime: string;
  /** 0–100. Unvalidated server-side; see lib/inspection.ts. */
  fuelLevel: number;
  /** 1–5, likewise. */
  cleanliness: number;
  generalConditionNotes: string | null;
  hasDamage: boolean;
  damageDescription: string | null;
  photos: InspectionPhotoDto[];
};

export type InspectionPhotoDto = {
  id: string;
  photoUrl: string;
  description: string | null;
};

/** `Application.Bookings.Queries.GetBookings.GetBookingsResult`. */
export type GetBookingsResult = {
  bookings: BookingDto[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
};

/**
 * `Application.Users.Common.UserDto`.
 *
 * Verification is exposed here as two **booleans**, not statuses — a renter can
 * see verified-or-not but not pending-versus-rejected. Only the admin queue
 * (`PendingVerificationDto`) sees the full `VerificationStatus`.
 */
export type UserDto = {
  id: string;
  email: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  identityVerified: boolean;
  driverLicenseVerified: boolean;
  createdAt: string;
};

/**
 * `Application.Users.Queries.GetPendingVerifications.PendingVerificationDto`.
 *
 * One row per *user*, carrying up to three document URLs but only **two**
 * statuses — licence front and back share `driverLicenseStatus`. The admin
 * queue expands this into one reviewable row per outstanding document, and a
 * decision on either licence side moves both.
 */
export type PendingVerificationDto = {
  userId: string;
  fullName: string;
  email: string;
  governmentIdImageUrl: string | null;
  governmentIdType: GovernmentIdType | null;
  governmentIdStatus: VerificationStatus;
  driverLicenseFrontImageUrl: string | null;
  driverLicenseBackImageUrl: string | null;
  driverLicenseStatus: VerificationStatus;
  driverLicenseExpiryDate: string | null;
};
