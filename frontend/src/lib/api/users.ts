import type { PendingVerificationDto, UserDto } from "@/types/api";
import type {
  GovernmentIdType,
  UserRole,
  VerificationDocumentType,
  VerificationStatus,
} from "@/lib/enums";
import { apiRequest } from "./client";

/**
 * `POST /api/users` — creates a user directly.
 *
 * **Registration must not use this.** It skips the strong-password policy that
 * `RegisterCommandValidator` applies, returns no token, and is unauthenticated.
 * Use `auth.register` instead. Kept here only because the endpoint exists.
 */
export function createUser(input: {
  email: string;
  password: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}) {
  return apiRequest<string>("createUser", "/api/users", {
    method: "POST",
    body: input,
  });
}

/** Unauthenticated server-side — any caller can read any profile by id. */
export function getUser(id: string) {
  return apiRequest<UserDto>("getUser", `/api/users/${id}`);
}

/**
 * `PUT /api/users/{id}` — email, phone and names only. Role, status and the
 * verification flags are not accepted here.
 *
 * `UpdateUserCommandValidator` requires all four: a valid email, both names at
 * 50 characters or fewer, and a phone number matching `^\+?[1-9]\d{1,14}$`
 * (E.164 — no spaces, dashes or brackets).
 *
 * Also unauthenticated server-side: any caller can update any user by id.
 * Guard client-side to the signed-in user.
 */
export function updateUser(
  id: string,
  input: {
    email: string;
    phoneNumber: string;
    firstName: string;
    lastName: string;
  },
) {
  return apiRequest<void>("updateUser", `/api/users/${id}`, {
    method: "PUT",
    body: input,
  });
}

/** Admin only — the one user route with real server-side authorization. */
export function deleteUser(id: string) {
  return apiRequest<void>("deleteUser", `/api/users/${id}`, { method: "DELETE" });
}

/**
 * `POST /api/users/{id}/verification` — multipart. Returns `{ url }`.
 *
 * `idType` applies only to a government ID; the two licence sides omit it.
 *
 * There is **no size or MIME validation server-side**, and no authorization
 * either — any caller can upload documents against any user id. Validate the
 * file before calling this, and guard the caller.
 */
export function uploadVerificationDocument(
  userId: string,
  file: File,
  type: VerificationDocumentType,
  idType?: GovernmentIdType,
) {
  const formData = new FormData();
  formData.append("File", file);
  formData.append("Type", String(type));
  if (idType !== undefined) formData.append("IdType", String(idType));

  return apiRequest<{ url: string }>(
    "uploadVerificationDocument",
    `/api/users/${userId}/verification`,
    { method: "POST", formData },
  );
}

/**
 * Staff and Admin only. One row per *user*, carrying up to three document URLs
 * but only two statuses — the admin queue expands these into one reviewable row
 * per outstanding document.
 */
export function getPendingVerifications() {
  return apiRequest<PendingVerificationDto[]>(
    "getPendingVerifications",
    "/api/users/pending-verifications",
  );
}

/**
 * Staff and Admin only.
 *
 * Because licence front and back share a single `DriverLicenseStatus`, a
 * decision on either side moves both.
 *
 * `reason` is accepted and **never stored**, so a rejected user cannot yet be
 * told why. Collect it anyway — it starts working the moment the backend
 * persists it — but do not promise the applicant will see it.
 */
export function processVerification(
  userId: string,
  input: {
    documentType: VerificationDocumentType;
    status: VerificationStatus;
    reason?: string;
  },
) {
  return apiRequest<void>(
    "processVerification",
    `/api/users/${userId}/process-verification`,
    {
      method: "POST",
      body: {
        documentType: input.documentType,
        status: input.status,
        reason: input.reason ?? null,
      },
    },
  );
}
