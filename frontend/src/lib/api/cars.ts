import type { CarDto, Point, SearchCarsResult } from "@/types/api";
import {
  carCategoryName,
  type CarCategory,
  type CarFeatureKey,
  type CarImageType,
  type FuelType,
  type TransmissionType,
} from "@/lib/enums";
import { toUtcIso } from "@/lib/dates";
import { apiRequest } from "./client";

export type SearchCarsInput = {
  /** Matched exactly and lowercased server-side — a typo returns zero results. */
  city?: string;
  state?: string;
  start: Date;
  end: Date;
  minPrice?: number;
  maxPrice?: number;
  category?: CarCategory;
  /** Only the six keys in `CAR_FEATURES` are recognised server-side. */
  features?: CarFeatureKey[];
  minRating?: number;
  pageNumber?: number;
  pageSize?: number;
};

/**
 * `GET /api/cars/search` — the only endpoint that returns images, and the only
 * paginated car listing.
 *
 * Both dates are required. The handler also excludes cars that are inactive or
 * unavailable, cars with a blocking `CarAvailability` range, and cars with a
 * `Confirmed` or `InProgress` booking that overlaps.
 *
 * Note it does **not** exclude cars with a `Pending` booking, while
 * `CreateBooking` refuses anything that is not `Cancelled`. A car can therefore
 * appear here and be refused at checkout — see phases/README.md § known defects.
 *
 * Server-side validation returns 400: start must precede end, the range cannot
 * exceed 365 days, min price cannot exceed max, rating must be 0–5.
 */
export function searchCars(input: SearchCarsInput) {
  return apiRequest<SearchCarsResult>("searchCars", "/api/cars/search", {
    auth: false,
    query: {
      city: input.city,
      state: input.state,
      startDate: toUtcIso(input.start),
      endDate: toUtcIso(input.end),
      minPrice: input.minPrice,
      maxPrice: input.maxPrice,
      // Typed `string?` server-side and parsed case-insensitively against the
      // C# enum, so this is the enum *name*, not the int and not the label.
      category: input.category !== undefined ? carCategoryName[input.category] : undefined,
      features: input.features as string[] | undefined,
      minRating: input.minRating,
      pageNumber: input.pageNumber,
      pageSize: input.pageSize,
    },
  });
}

/**
 * `GET /api/cars` — every car, unpaginated, with no filters at all.
 *
 * There is no `?ownerId=`, so owner listings filter this client-side. Fine at
 * demo scale; the first thing to fix. See phases/phase-6-owner.md.
 */
export function getCars() {
  return apiRequest<CarDto[]>("getCars", "/api/cars", { auth: false });
}

/**
 * `GET /api/cars/{id}` — returns a `CarDto`, which has **no images**.
 *
 * A missing car throws a plain `Exception` server-side, so it arrives as a 500,
 * not a 404. Callers cannot distinguish "no such car" from "server broke".
 */
export function getCar(id: string) {
  return apiRequest<CarDto>("getCar", `/api/cars/${id}`, { auth: false });
}

/** Every field `CreateCarRequest` accepts. Enums are ints. */
export type CarInput = {
  make: string;
  model: string;
  year: number;
  color: string;
  licensePlate: string;
  /** Exactly 17 characters, `[A-HJ-NPR-Z0-9]` — no I, O or Q. */
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
  /** Non-nullable server-side. There is no geocoding endpoint. */
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
};

/** Returns the new car's id. Requires Owner, Admin or Staff. */
export function createCar(input: CarInput) {
  return apiRequest<string>("createCar", "/api/cars", {
    method: "POST",
    body: input,
  });
}

/**
 * `PUT /api/cars/{id}` is a **replace, not a patch** — it takes every field
 * plus `isAvailable` and `isActive`. Load the current car, merge, send it all,
 * or omitted fields reset.
 */
export function updateCar(
  id: string,
  input: CarInput & { isAvailable: boolean; isActive: boolean },
) {
  return apiRequest<void>("updateCar", `/api/cars/${id}`, {
    method: "PUT",
    body: input,
  });
}

export function deleteCar(id: string) {
  return apiRequest<void>("deleteCar", `/api/cars/${id}`, { method: "DELETE" });
}

/**
 * `POST /api/cars/{id}/images` — multipart. Returns the new image's id.
 *
 * Needs a car id, which is why the add-car wizard creates the car first and
 * uploads photos afterwards.
 *
 * There is **no size or MIME validation server-side**; an oversized file
 * becomes a 500. Validate before calling this.
 */
export function uploadCarImage(
  carId: string,
  file: File,
  type: CarImageType,
  isPrimary: boolean,
) {
  const formData = new FormData();
  formData.append("File", file);
  formData.append("Type", String(type));
  formData.append("IsPrimary", String(isPrimary));

  return apiRequest<string>("uploadCarImage", `/api/cars/${carId}/images`, {
    method: "POST",
    formData,
  });
}

/** Note the route is `/api/cars/images/{imageId}` — not nested under a car. */
export function deleteCarImage(imageId: string) {
  return apiRequest<void>("deleteCarImage", `/api/cars/images/${imageId}`, {
    method: "DELETE",
  });
}
