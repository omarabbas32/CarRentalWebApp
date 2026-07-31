"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Car, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { AuthError } from "@/components/auth/auth-error";
import { PasswordChecklist } from "@/components/auth/password-checklist";
import {
  useNextPath,
  useRedirectIfAuthenticated,
} from "@/components/auth/redirect-if-authenticated";
import { useAuth } from "@/components/providers/auth-provider";
import { ApiError } from "@/lib/api/errors";
import { UserRole } from "@/lib/enums";
import { isEmailValid, isPasswordValid, nameError } from "@/lib/auth/password";
import { cn } from "@/lib/utils";

/**
 * Registration goes through `/api/auth/register`, never `POST /api/users`.
 * That endpoint skips the strong-password policy, returns no token, and has no
 * authorization at all.
 *
 * Only Renter and Owner are offered. Admin and Staff are not self-service.
 */
const ROLE_CHOICES = [
  {
    role: UserRole.Renter,
    title: "I want to rent",
    description: "Find a car near you and book it for the days you need.",
    Icon: Car,
  },
  {
    role: UserRole.Owner,
    title: "I want to list my car",
    description: "Earn from your car when you are not using it.",
    Icon: KeyRound,
  },
];

export function RegisterForm() {
  const { signUp } = useAuth();
  const router = useRouter();
  const next = useNextPath();
  const alreadySignedIn = useRedirectIfAuthenticated();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>(UserRole.Renter);

  const [error, setError] = useState<ApiError | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showLocalErrors, setShowLocalErrors] = useState(false);

  if (alreadySignedIn) return null;

  const serverFieldErrors = error?.fieldErrors;

  // Computed every render rather than stored, so they cannot drift from input.
  const localErrors = {
    firstName: nameError(firstName, "First"),
    lastName: nameError(lastName, "Last"),
    email: isEmailValid(email) ? null : "Enter a valid email address.",
    password: isPasswordValid(password)
      ? null
      : "Your password does not meet all the requirements yet.",
  };
  const hasLocalErrors = Object.values(localErrors).some(Boolean);

  function errorFor(field: keyof typeof localErrors): string[] | undefined {
    const server = serverFieldErrors?.[field];
    if (server?.length) return server;
    if (showLocalErrors && localErrors[field]) return [localErrors[field]];
    return undefined;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;

    // Submit is not disabled on invalid input — a disabled button gives no
    // reason. Instead the first attempt reveals what needs fixing, and only a
    // clean form spends one of the five requests per minute.
    if (hasLocalErrors) {
      setShowLocalErrors(true);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await signUp({
        email: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role,
      });
      router.replace(next);
    } catch (cause) {
      // A duplicate email throws a plain Exception server-side, so it arrives
      // as a 500 and is worded by mapApiError.
      setError(
        cause instanceof ApiError
          ? cause
          : new ApiError({
              status: 0,
              operation: "register",
              message: "Something went wrong. Try again.",
            }),
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-h1">Create your account</h1>
        <p className="text-muted-foreground">It takes a minute.</p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <AuthError error={error} />

        <fieldset className="space-y-3">
          <legend className="text-label uppercase text-muted-foreground">
            How will you use CarRental?
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {ROLE_CHOICES.map(({ role: value, title, description, Icon }) => {
              const selected = role === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRole(value)}
                  aria-pressed={selected}
                  className={cn(
                    "rounded-xl border p-4 text-left transition-colors",
                    "hover:bg-accent focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none",
                    selected ? "border-primary bg-primary/5" : "border-border",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-5",
                      selected ? "text-primary" : "text-muted-foreground",
                    )}
                    aria-hidden
                  />
                  <span className="mt-2 block text-h3">{title}</span>
                  <span className="mt-1 block text-caption text-muted-foreground">
                    {description}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-caption text-muted-foreground">
            You can still browse and book either way — this just sets up your
            account.
          </p>
        </fieldset>

        <FieldGroup>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={errorFor("firstName") ? true : undefined}>
              <FieldLabel htmlFor="firstName">First name</FieldLabel>
              <Input
                id="firstName"
                name="firstName"
                autoComplete="given-name"
                required
                maxLength={50}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                aria-invalid={errorFor("firstName") ? true : undefined}
              />
              <FieldError errors={errorFor("firstName")?.map((message) => ({ message }))} />
            </Field>

            <Field data-invalid={errorFor("lastName") ? true : undefined}>
              <FieldLabel htmlFor="lastName">Last name</FieldLabel>
              <Input
                id="lastName"
                name="lastName"
                autoComplete="family-name"
                required
                maxLength={50}
                value={lastName}
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
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={errorFor("email") ? true : undefined}
            />
            <FieldError errors={errorFor("email")?.map((message) => ({ message }))} />
          </Field>

          <Field data-invalid={serverFieldErrors?.password ? true : undefined}>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-describedby="password-requirements"
              aria-invalid={serverFieldErrors?.password ? true : undefined}
            />
            <div id="password-requirements" className="pt-1">
              <PasswordChecklist password={password} />
            </div>
            <FieldError
              errors={serverFieldErrors?.password?.map((message) => ({ message }))}
            />
          </Field>
        </FieldGroup>

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Creating your account…" : "Create account"}
        </Button>
      </form>

      <p className="text-caption text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="text-foreground underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </div>
  );
}
