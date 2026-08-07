-- Marks the demo accounts identity- and licence-verified.
--
-- Doing this through the API would need an Admin token and an uploaded
-- document per person, which is a lot of machinery just to clear a badge, so
-- the rows are written directly.
--
-- It only ever touches the throwaway accounts `frontend/scripts/seed-scenario.mts`
-- creates — emails matching 'owner.%@example.com' or 'renter.%@example.com' —
-- so it cannot affect a real user.
--
-- DEV DATABASES ONLY. Re-runnable.
--
--   psql -h localhost -U postgres -d CarRentalDb \
--        -f backend/Infrastructure/Data/Scripts/seed-demo-extras.sql

BEGIN;

-- ---------------------------------------------------------------------------
-- Verified identities
-- ---------------------------------------------------------------------------
-- Car photos are NOT handled here. `seed-scenario.mts` uploads real ones
-- through `POST /api/cars/{id}/images`, so they genuinely reach Cloudinary and
-- the multipart path gets exercised. Only verification is left, because that
-- needs an Admin token plus an uploaded document to do properly.
-- Two places have to agree: the booleans on Users, which is what UserDto
-- exposes and what the UI reads, and the per-document statuses on
-- UserVerifications, which is what the staff console reads. Setting only the
-- booleans leaves the review queue showing documents as still pending.

UPDATE "Users"
SET "IdentityVerified" = true,
    "DriverLicenseVerified" = true,
    "EmailVerified" = true,
    "UpdatedAt" = now() AT TIME ZONE 'utc'
WHERE "Email" LIKE 'owner.%@example.com'
   OR "Email" LIKE 'renter.%@example.com';

INSERT INTO "UserVerifications" (
    "Id", "UserId",
    "GovernmentIdNumber", "GovernmentIdType", "GovernmentIdImageUrl", "GovernmentIdStatus",
    "DriverLicenseNumber", "DriverLicenseState", "DriverLicenseExpiryDate",
    "DriverLicenseFrontImageUrl", "DriverLicenseBackImageUrl", "DriverLicenseStatus"
)
SELECT gen_random_uuid(),
       u."Id",
       'DEMO-' || left(replace(u."Id"::text, '-', ''), 8),
       1,                                        -- GovernmentIdType.NationalId
       (SELECT "ImageUrl" FROM "CarImages" ORDER BY "DisplayOrder" LIMIT 1),
       1,                                        -- VerificationStatus.Verified
       'DL-' || left(replace(u."Id"::text, '-', ''), 8),
       'Beirut',
       (now() AT TIME ZONE 'utc') + interval '3 years',
       (SELECT "ImageUrl" FROM "CarImages" ORDER BY "DisplayOrder" LIMIT 1),
       (SELECT "ImageUrl" FROM "CarImages" ORDER BY "DisplayOrder" OFFSET 1 LIMIT 1),
       1                                         -- VerificationStatus.Verified
FROM "Users" u
WHERE (u."Email" LIKE 'owner.%@example.com' OR u."Email" LIKE 'renter.%@example.com')
  AND NOT EXISTS (SELECT 1 FROM "UserVerifications" v WHERE v."UserId" = u."Id");

-- Re-running after a document was rejected in the console puts it back.
UPDATE "UserVerifications" v
SET "GovernmentIdStatus" = 1,
    "DriverLicenseStatus" = 1
FROM "Users" u
WHERE v."UserId" = u."Id"
  AND (u."Email" LIKE 'owner.%@example.com' OR u."Email" LIKE 'renter.%@example.com');

COMMIT;

\echo ''
\echo 'Seeded demo extras:'
SELECT u."Email",
       u."IdentityVerified" AS id_ok,
       u."DriverLicenseVerified" AS licence_ok,
       (SELECT count(*) FROM "Cars" c WHERE c."OwnerId" = u."Id") AS cars,
       (SELECT count(*) FROM "CarImages" ci
          JOIN "Cars" c2 ON c2."Id" = ci."CarId"
         WHERE c2."OwnerId" = u."Id") AS photos
FROM "Users" u
WHERE u."Email" LIKE 'owner.%@example.com' OR u."Email" LIKE 'renter.%@example.com'
ORDER BY u."CreatedAt" DESC;
