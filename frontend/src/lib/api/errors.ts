/**
 * Turning the API's responses into messages a person can act on.
 *
 * The backend throws plain `Exception` for every business-rule failure —
 * "Car is not available for the selected dates.", "Invalid email or password."
 * — and `ExceptionHandlingMiddleware` logs those and returns a generic
 * `{ "error": "An internal server error occurred." }` with status 500.
 *
 * So on a 500 the operation context is the *only* information available about
 * what went wrong. `mapApiError` is where that context becomes a sentence.
 *
 * Raw server text never reaches a user.
 */

/** Every call the app makes. Adding an endpoint means adding a key here. */
export type ApiOperation =
  // auth
  | "register"
  | "login"
  | "refresh"
  | "logout"
  // cars
  | "searchCars"
  | "getCars"
  | "getCar"
  | "createCar"
  | "updateCar"
  | "deleteCar"
  | "uploadCarImage"
  | "deleteCarImage"
  | "setPrimaryCarImage"
  // bookings
  | "createBooking"
  | "getBookings"
  | "getBooking"
  | "cancelBooking"
  | "startTrip"
  | "endTrip"
  | "getBookingInspections"
  | "uploadInspectionPhoto"
  | "deleteInspectionPhoto"
  // users
  | "createUser"
  | "getUser"
  | "updateUser"
  | "deleteUser"
  | "uploadVerificationDocument"
  | "getPendingVerifications"
  | "processVerification"
  // messages
  | "sendMessage"
  | "getThreads"
  | "getBookingMessages"
  | "markThreadRead"
  | "getUnreadMessageCount"
  // reviews
  | "createReview"
  | "deleteReview"
  | "getCarReviews"
  | "getUserReviews"
  | "getBookingReviews"
  // notifications
  | "getNotifications"
  | "getUnreadNotificationCount"
  | "markNotificationRead"
  | "markAllNotificationsRead"
  /**
   * Not an endpoint. For a failure that never reached the request layer at all
   * — a bug inside a fetcher — so that `error.operation` is honest instead of
   * naming whichever call the placeholder happened to be.
   */
  | "unknown";

/** Field name → messages, camelCased from the server's PascalCase keys. */
export type FieldErrors = Record<string, string[]>;

export class ApiError extends Error {
  readonly status: number;
  readonly operation: ApiOperation;
  readonly fieldErrors?: FieldErrors;
  /** True when the request never reached the server. */
  readonly isNetworkError: boolean;

  constructor(init: {
    status: number;
    operation: ApiOperation;
    message: string;
    fieldErrors?: FieldErrors;
    isNetworkError?: boolean;
  }) {
    super(init.message);
    this.name = "ApiError";
    this.status = init.status;
    this.operation = init.operation;
    this.fieldErrors = init.fieldErrors;
    this.isNetworkError = init.isNetworkError ?? false;
  }

  get isUnauthenticated() {
    return this.status === 401;
  }
  get isForbidden() {
    return this.status === 403;
  }
  get isNotFound() {
    return this.status === 404;
  }
  get isValidation() {
    return this.status === 400;
  }
  /**
   * A refused-but-legitimate request — deleting a car that still has bookings,
   * say. Unlike a 500, the server's message is written for the user and is
   * carried through by `ConflictException`, so `message` is worth showing.
   */
  get isConflict() {
    return this.status === 409;
  }
  /**
   * ASP.NET's fixed-window limiter rejects with 503 by default; 429 is the
   * conventional code and may be configured later. Treat both as rate limiting.
   */
  get isRateLimited() {
    return this.status === 429 || this.status === 503;
  }
}

/**
 * What a 500 means, per operation. These are the business-rule failures listed
 * in phases/README.md, translated from the server's internal wording.
 *
 * Errors explain what went wrong and what to do. No apologies, no error codes.
 */
const BUSINESS_FAILURE: Record<ApiOperation, string> = {
  register: "That email is already registered. Try signing in instead.",
  login: "Email or password is incorrect.",
  refresh: "Your session has expired. Sign in again.",
  logout: "We couldn't sign you out cleanly. Your session has been cleared here.",

  searchCars: "We couldn't run that search. Try adjusting your dates or filters.",
  getCars: "We couldn't load the cars.",
  // GetCarById throws a plain Exception for a missing car, so a bad ID lands
  // here as a 500 rather than a 404. The wording has to cover both.
  getCar: "We couldn't load this car. It may have been removed.",
  createCar: "We couldn't save this car. Check the details and try again.",
  updateCar: "We couldn't save your changes. This car may have been removed.",
  deleteCar: "We couldn't remove this car.",
  uploadCarImage: "That photo didn't upload. Try a smaller file.",
  deleteCarImage: "We couldn't remove that photo.",
  setPrimaryCarImage: "We couldn't make that the cover photo.",

  createBooking: "Those dates were just taken. Try different dates.",
  getBookings: "We couldn't load your bookings.",
  getBooking: "We couldn't load this booking.",
  cancelBooking: "This booking can no longer be cancelled.",
  startTrip: "This trip can't be started — it may already be under way.",
  endTrip: "This trip can't be ended — it may not have started yet.",
  getBookingInspections: "We couldn't load the inspection record.",
  uploadInspectionPhoto: "That photo didn't upload. Try a smaller file.",
  deleteInspectionPhoto: "We couldn't remove that photo.",

  createUser: "We couldn't create that account.",
  getUser: "We couldn't load this profile.",
  updateUser: "We couldn't save your changes.",
  deleteUser: "We couldn't delete this account.",
  uploadVerificationDocument: "That document didn't upload. Try a smaller file.",
  getPendingVerifications: "We couldn't load the review queue.",
  processVerification: "We couldn't record that decision.",

  sendMessage: "That message didn't send. Try again.",
  getThreads: "We couldn't load your messages.",
  getBookingMessages: "We couldn't load this conversation.",
  markThreadRead: "We couldn't mark this conversation as read.",
  getUnreadMessageCount: "We couldn't check for new messages.",

  createReview: "We couldn't save your review.",
  deleteReview: "We couldn't remove that review.",
  getCarReviews: "We couldn't load the reviews for this car.",
  getUserReviews: "We couldn't load these reviews.",
  getBookingReviews: "We couldn't load the reviews for this trip.",

  getNotifications: "We couldn't load your notifications.",
  getUnreadNotificationCount: "We couldn't check for new notifications.",
  markNotificationRead: "We couldn't mark that as read.",
  markAllNotificationsRead: "We couldn't mark those as read.",

  unknown: "Something went wrong. Try again.",
};

/** What a 404 means, where the endpoint actually returns one. */
const NOT_FOUND: Partial<Record<ApiOperation, string>> = {
  getCar: "We couldn't find this car. It may have been removed.",
  getBooking: "We couldn't find this booking.",
  getUser: "We couldn't find this profile.",
  updateUser: "That account no longer exists.",
  deleteUser: "That account no longer exists.",
  cancelBooking: "That booking no longer exists.",
  startTrip: "That booking no longer exists.",
  endTrip: "That booking no longer exists.",
  createBooking: "That car is no longer listed.",
  uploadCarImage: "That car no longer exists.",
  deleteCarImage: "That photo no longer exists.",
  setPrimaryCarImage: "That photo no longer exists.",
  deleteCar: "That car no longer exists.",
  updateCar: "That car no longer exists.",
  getBookingInspections: "We couldn't find that booking.",
  uploadInspectionPhoto: "That booking no longer exists.",
  deleteInspectionPhoto: "That photo no longer exists.",
  uploadVerificationDocument: "That account no longer exists.",
  processVerification: "That account no longer exists.",
  sendMessage: "That booking no longer exists.",
  getBookingMessages: "That booking no longer exists.",
  markThreadRead: "That booking no longer exists.",
  createReview: "That booking no longer exists.",
  getBookingReviews: "That booking no longer exists.",
  deleteReview: "That review has already been removed.",
  markNotificationRead: "That notification no longer exists.",
};

/**
 * Fallback wording for a 409, used only when the body could not be read.
 *
 * Normally the server's own message wins here — it is the one status whose
 * text is written for the user rather than for a log.
 */
const CONFLICT: Partial<Record<ApiOperation, string>> = {
  deleteCar:
    "This car has bookings against it and can't be deleted. Turn off Listed to take it out of search instead.",
  uploadInspectionPhoto:
    "The inspection doesn't exist yet — start or end the trip first.",
  // `CreateReviewCommandHandler` throws `ConflictException` for both the
  // already-reviewed and the trip-not-finished cases, and its wording is
  // better than anything guessable from the status alone. These are only
  // reached when the body could not be read.
  createReview: "You can't review this trip right now.",
};

/** What a 403 means. The server's own text is generic; context is better. */
const FORBIDDEN: Partial<Record<ApiOperation, string>> = {
  createBooking: "Only renters can request a car.",
  cancelBooking: "You can only cancel your own bookings.",
  createCar: "Only owners can list a car.",
  updateCar: "You can only edit your own cars.",
  deleteCar: "You can only remove your own cars.",
  uploadCarImage: "You can only add photos to your own cars.",
  deleteCarImage: "You can only remove photos from your own cars.",
  setPrimaryCarImage: "You can only change the cover on your own cars.",
  getBookingInspections: "You can only see inspections for your own bookings.",
  uploadInspectionPhoto: "Only the car's owner can add inspection photos.",
  deleteInspectionPhoto: "Only the car's owner can remove inspection photos.",
  startTrip: "Only the car's owner can start this trip.",
  endTrip: "Only the car's owner can end this trip.",
  getPendingVerifications: "You don't have access to the review queue.",
  processVerification: "You don't have permission to review documents.",
  // Threads have exactly two sides. Admin and Staff can read one but not post
  // into it, so this is what an admin sees if they try.
  sendMessage: "You can only message the other person on your own bookings.",
  getBookingMessages: "You can only read conversations about your own bookings.",
  markThreadRead: "You can only read conversations about your own bookings.",
  createReview: "You can only review your own trips.",
  getBookingReviews: "You can only see reviews for your own trips.",
  deleteReview: "You don't have permission to remove reviews.",
  deleteUser: "You don't have permission to delete accounts.",
};

/**
 * The message to show for a given operation and status.
 *
 * Callers should prefer `ApiError.message`, which is already built from this.
 * It is exported separately so a caller with only a status code — a server
 * component reading a fetch result, say — can produce the same wording.
 */
export function mapApiError(
  operation: ApiOperation,
  status: number,
  options: { isNetworkError?: boolean } = {},
): string {
  if (options.isNetworkError || status === 0) {
    return "Can't reach the server. Check your connection and try again.";
  }

  switch (status) {
    case 400:
      // The server sent field-level detail; the form renders it. This is only
      // the fallback for a 400 with no usable body.
      return "Some details need fixing. Check the highlighted fields.";
    case 401:
      return "Please sign in to continue.";
    case 403:
      return FORBIDDEN[operation] ?? "You don't have permission to do that.";
    case 404:
      return NOT_FOUND[operation] ?? "We couldn't find what you were looking for.";
    case 409:
      // Only reached when the body was missing or unreadable. `ConflictException`
      // messages are written for the user and the client passes them straight
      // through — see `toApiError`.
      return CONFLICT[operation] ?? "That can't be done while things are as they are.";
    case 429:
    case 503:
      // /api/auth/* shares one 5-request-per-minute budget across login,
      // register, refresh and logout.
      return "Too many attempts. Wait about a minute and try again.";
    case 500:
      return BUSINESS_FAILURE[operation];
    default:
      return status >= 500
        ? BUSINESS_FAILURE[operation]
        : "Something went wrong. Try again.";
  }
}

/**
 * `{ "errors": { "PricePerDay": ["Price per day must be greater than 0."] } }`
 *   → `{ pricePerDay: ["Price per day must be greater than 0."] }`
 *
 * FluentValidation groups by raw C# property name. `ExceptionHandlingMiddleware`
 * serialises that dictionary with no options at all, so no naming policy is
 * applied and the keys arrive PascalCase — `VIN`, `HasGPS`, `PricePerDay`.
 *
 * Response *bodies*, by contrast, go through MVC's `JsonSerializerDefaults.Web`,
 * which camelCases them. The field names in types/api.ts follow those, so
 * mapping an error key onto a form field means applying the same policy —
 * acronyms included. Nested paths like `Location.Lat` convert segment by
 * segment.
 */
export function toFieldErrors(errors: unknown): FieldErrors | undefined {
  if (!errors || typeof errors !== "object") return undefined;

  const out: FieldErrors = {};
  for (const [key, value] of Object.entries(errors as Record<string, unknown>)) {
    const messages = Array.isArray(value)
      ? value.filter((m): m is string => typeof m === "string")
      : typeof value === "string"
        ? [value]
        : [];
    if (messages.length > 0) out[camelCasePath(key)] = messages;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function camelCasePath(key: string): string {
  return key.split(".").map(toCamelCase).join(".");
}

/**
 * A faithful port of .NET's `JsonNamingPolicy.CamelCase`.
 *
 * A naive "lowercase the first character" is wrong for the acronyms this API
 * is full of: `VIN` would become `vIN` rather than `vin`, and a VIN validation
 * error would silently fail to bind to its input. The real policy lowercases a
 * leading run of capitals, stopping before the last one when a lowercase
 * letter follows it.
 *
 *   VIN         → vin
 *   HasGPS      → hasGPS
 *   USBCharging → usbCharging
 *   PricePerDay → pricePerDay
 */
function toCamelCase(name: string): string {
  if (name.length === 0 || !isUpper(name[0])) return name;

  const chars = [...name];
  for (let i = 0; i < chars.length; i++) {
    if (i === 1 && !isUpper(chars[i])) break;

    const hasNext = i + 1 < chars.length;
    if (i > 0 && hasNext && !isUpper(chars[i + 1])) {
      if (chars[i + 1] === " ") chars[i] = chars[i].toLowerCase();
      break;
    }

    chars[i] = chars[i].toLowerCase();
  }
  return chars.join("");
}

function isUpper(ch: string): boolean {
  return ch !== ch.toLowerCase() && ch === ch.toUpperCase();
}
