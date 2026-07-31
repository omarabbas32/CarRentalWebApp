"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { AuthError } from "@/components/auth/auth-error";
import {
  useNextPath,
  useRedirectIfAuthenticated,
} from "@/components/auth/redirect-if-authenticated";
import { useAuth } from "@/components/providers/auth-provider";
import { ApiError } from "@/lib/api/errors";

export function LoginForm() {
  const { signIn } = useAuth();
  const router = useRouter();
  const next = useNextPath();
  const alreadySignedIn = useRedirectIfAuthenticated();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<ApiError | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (alreadySignedIn) return null;

  const fieldErrors = error?.fieldErrors;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    // Guard against a double submit: every attempt spends one of five requests
    // per minute, shared with register, refresh and logout.
    if (submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      await signIn(email.trim(), password);
      router.replace(next);
    } catch (cause) {
      // A credential failure arrives as a generic 500 — the server throws a
      // plain Exception — so the wording comes from mapApiError, not the body.
      setError(
        cause instanceof ApiError
          ? cause
          : new ApiError({
              status: 0,
              operation: "login",
              message: "Something went wrong. Try again.",
            }),
      );
      setSubmitting(false);
    }
    // On success the component unmounts on navigation; leaving `submitting`
    // true keeps the button disabled through the transition.
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-h1">Welcome back</h1>
        <p className="text-muted-foreground">Sign in to find a car or manage your trips.</p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <AuthError error={error} />

        <FieldGroup>
          <Field data-invalid={fieldErrors?.email ? true : undefined}>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={fieldErrors?.email ? true : undefined}
            />
            <FieldError errors={fieldErrors?.email?.map((message) => ({ message }))} />
          </Field>

          <Field data-invalid={fieldErrors?.password ? true : undefined}>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={fieldErrors?.password ? true : undefined}
            />
            <FieldError errors={fieldErrors?.password?.map((message) => ({ message }))} />
          </Field>
        </FieldGroup>

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="text-caption text-muted-foreground">
        New here?{" "}
        <Link href="/register" className="text-foreground underline underline-offset-4">
          Create an account
        </Link>
      </p>
    </div>
  );
}
