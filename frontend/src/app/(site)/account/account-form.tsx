"use client";

import Link from "next/link";
import { useState } from "react";
import { BadgeCheck, Info, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/error-state";
import { useAuth } from "@/components/providers/auth-provider";
import { getUser, updateUser } from "@/lib/api/users";
import { ApiError } from "@/lib/api/errors";
import { isEmailValid, nameError } from "@/lib/auth/password";
import { userRoleLabel, userStatusLabel } from "@/lib/enums";
import { useAsync } from "@/lib/use-async";
import type { UserDto } from "@/types/api";

/**
 * `UpdateUserCommandValidator` requires a phone number matching
 * `^\+?[1-9]\d{1,14}$` — E.164, so no spaces, dashes or brackets, and no
 * leading zero.
 */
const PHONE_PATTERN = /^\+?[1-9]\d{1,14}$/;

export function AccountForm() {
  const { session } = useAuth();
  const userId = session?.userId;
  const state = useAsync(() => getUser(userId!), [userId]);

  if (!userId || state.status === "loading") return <FormSkeleton />;

  if (state.status === "error") {
    return <ErrorState
        title="We couldn't load your profile"
        message={state.error.message}
        error={state.error}
        retry={state.reload}
      />;
  }

  return <ProfileFields user={state.data} onSaved={state.reload} />;
}

function ProfileFields({ user, onSaved }: { user: UserDto; onSaved: () => void }) {
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [email, setEmail] = useState(user.email);
  const [phoneNumber, setPhoneNumber] = useState(user.phoneNumber);

  const [submitting, setSubmitting] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [serverError, setServerError] = useState<ApiError | null>(null);

  /**
   * Registration never collects a phone number — `RegisterCommand` has no such
   * field — so every account created through sign-up starts with `""`. But the
   * update validator *requires* one. Without saying so up front, a user who
   * only wanted to fix a typo in their name would get a 400 on a field they
   * were never asked for.
   */
  const phoneMissingFromSignup = user.phoneNumber === "";

  const localErrors = {
    firstName: nameError(firstName, "First"),
    lastName: nameError(lastName, "Last"),
    email: isEmailValid(email) ? null : "Enter a valid email address.",
    phoneNumber:
      phoneNumber.trim() === ""
        ? "A phone number is required to save your profile."
        : PHONE_PATTERN.test(phoneNumber.trim())
          ? null
          : "Use the international format — country code first, digits only, like +962791234567.",
  };
  const hasLocalErrors = Object.values(localErrors).some(Boolean);

  function errorFor(field: keyof typeof localErrors): string[] | undefined {
    const fromServer = serverError?.fieldErrors?.[field];
    if (fromServer?.length) return fromServer;
    if (showErrors && localErrors[field]) return [localErrors[field]];
    return undefined;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;

    if (hasLocalErrors) {
      setShowErrors(true);
      return;
    }

    setSubmitting(true);
    setServerError(null);

    try {
      await updateUser(user.id, {
        email: email.trim(),
        phoneNumber: phoneNumber.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      toast.success("Profile saved");
      onSaved();
    } catch (cause) {
      if (cause instanceof ApiError) setServerError(cause);
      else toast.error("Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {phoneMissingFromSignup && (
          <Alert>
            <Info className="size-4" aria-hidden />
            <AlertDescription>
              Add a phone number to finish setting up your account. It&apos;s required
              before any profile change can be saved.
            </AlertDescription>
          </Alert>
        )}

        {serverError && !serverError.fieldErrors && (
          <Alert variant="destructive">
            <AlertDescription>{serverError.message}</AlertDescription>
          </Alert>
        )}

        <FieldGroup>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={errorFor("firstName") ? true : undefined}>
              <FieldLabel htmlFor="firstName">First name</FieldLabel>
              <Input
                id="firstName"
                value={firstName}
                maxLength={50}
                onChange={(e) => setFirstName(e.target.value)}
                aria-invalid={errorFor("firstName") ? true : undefined}
              />
              <FieldError errors={errorFor("firstName")?.map((message) => ({ message }))} />
            </Field>

            <Field data-invalid={errorFor("lastName") ? true : undefined}>
              <FieldLabel htmlFor="lastName">Last name</FieldLabel>
              <Input
                id="lastName"
                value={lastName}
                maxLength={50}
                onChange={(e) => setLastName(e.target.value)}
                aria-invalid={errorFor("lastName") ? true : undefined}
              />
              <FieldError errors={errorFor("lastName")?.map((message) => ({ message }))} />
            </Field>
          </div>

          <Field data-invalid={errorFor("email") ? true : undefined}>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={errorFor("email") ? true : undefined}
            />
            <FieldError errors={errorFor("email")?.map((message) => ({ message }))} />
          </Field>

          <Field data-invalid={errorFor("phoneNumber") ? true : undefined}>
            <FieldLabel htmlFor="phoneNumber">Phone</FieldLabel>
            <Input
              id="phoneNumber"
              type="tel"
              inputMode="tel"
              value={phoneNumber}
              placeholder="+962791234567"
              onChange={(e) => setPhoneNumber(e.target.value)}
              aria-describedby="phone-hint"
              aria-invalid={errorFor("phoneNumber") ? true : undefined}
            />
            <p id="phone-hint" className="text-caption text-muted-foreground">
              Country code first, digits only — no spaces or dashes.
            </p>
            <FieldError errors={errorFor("phoneNumber")?.map((message) => ({ message }))} />
          </Field>
        </FieldGroup>

        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : "Save changes"}
        </Button>
      </form>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-h2">Account</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          <ReadOnly label="Role" value={userRoleLabel[user.role]} />
          <ReadOnly label="Status" value={userStatusLabel[user.status]} />
          <ReadOnly label="Member since" value={new Date(user.createdAt).toLocaleDateString()} />
        </dl>
        <p className="text-caption text-muted-foreground">
          {/* `UpdateUserCommand` accepts only the four fields above. */}
          Role and status are set by CarRental and can&apos;t be changed here.
        </p>
      </section>

      <Separator />

      <VerificationSummary user={user} />

      <Separator />

      <section className="space-y-2">
        <h2 className="text-h2">Password</h2>
        <p className="max-w-prose text-muted-foreground">
          Changing your password isn&apos;t available yet.
        </p>
        {/* Shown disabled rather than dropped: no endpoint exists, and hiding
            it would make the gap invisible to whoever builds it. */}
        <Button variant="outline" disabled>
          Change password
        </Button>
      </section>
    </div>
  );
}

/**
 * `UserDto` carries two **booleans**, not the underlying `VerificationStatus`.
 * A renter can therefore see verified-or-not, but not pending-versus-rejected —
 * so this summary says nothing more than the data supports.
 */
function VerificationSummary({ user }: { user: UserDto }) {
  const both = user.identityVerified && user.driverLicenseVerified;

  return (
    <section className="space-y-4">
      <h2 className="text-h2">Verification</h2>

      <div className="flex items-start gap-3 rounded-xl border p-4">
        {both ? (
          <BadgeCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        ) : (
          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
        )}
        <div className="space-y-2">
          <p className="text-h3">
            {both ? "Your documents are verified" : "Verification incomplete"}
          </p>
          <ul className="space-y-1 text-caption text-muted-foreground">
            <li>Government ID — {user.identityVerified ? "verified" : "not verified"}</li>
            <li>
              Driving licence — {user.driverLicenseVerified ? "verified" : "not verified"}
            </li>
          </ul>
          <Button variant="outline" size="sm" asChild>
            <Link href="/account/verification">
              {both ? "View documents" : "Upload documents"}
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-label uppercase text-muted-foreground">{label}</dt>
      <dd className="text-body">{value}</dd>
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-9 w-32" />
      <span className="sr-only">Loading your profile</span>
    </div>
  );
}
