/**
 * The password policy, mirrored from `RegisterCommandValidator`.
 *
 * The register form shows these as a live checklist so a user never submits a
 * password the API will reject — a rejection costs one of only five auth
 * requests per minute, shared across login, register, refresh and logout.
 *
 * The server remains the authority. This exists to stop the round trip, not to
 * replace it.
 */

/**
 * The special characters the server accepts, verbatim from the validator's
 * character class:
 *
 *   [\^$*.\[\]{}()?\-""!@#%&/\\,><':;|_~`]
 *
 * (In a C# verbatim string `""` is a single `"`.)
 *
 * Note what is absent: `+`, `=`, `+`, and whitespace are **not** accepted. A
 * user whose habitual password uses `+` would otherwise be told only that their
 * password needs "a special character" while being refused for using one.
 */
export const ALLOWED_SPECIAL_CHARACTERS = "^ $ * . [ ] { } ( ) ? - \" ! @ # % & / \\ , > < ' : ; | _ ~ `";

const SPECIAL_CHARACTER = /[\^$*.[\]{}()?\-"!@#%&/\\,><':;|_~`]/;

export type PasswordRule = {
  id: string;
  label: string;
  test: (password: string) => boolean;
};

export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: "length",
    label: "At least 8 characters",
    test: (p) => p.length >= 8,
  },
  {
    id: "uppercase",
    label: "An uppercase letter",
    test: (p) => /[A-Z]/.test(p),
  },
  {
    id: "lowercase",
    label: "A lowercase letter",
    test: (p) => /[a-z]/.test(p),
  },
  {
    id: "digit",
    label: "A number",
    test: (p) => /[0-9]/.test(p),
  },
  {
    id: "special",
    label: "A special character",
    test: (p) => SPECIAL_CHARACTER.test(p),
  },
];

export function passwordRuleResults(password: string) {
  return PASSWORD_RULES.map((rule) => ({
    ...rule,
    satisfied: rule.test(password),
  }));
}

export function isPasswordValid(password: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(password));
}

/** `EmailAddress()` in FluentValidation is permissive; this matches its spirit. */
export function isEmailValid(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** Both names are required and capped at 50 characters server-side. */
export const NAME_MAX_LENGTH = 50;

export function nameError(value: string, field: "First" | "Last"): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return `${field} name is required.`;
  if (trimmed.length > NAME_MAX_LENGTH) {
    return `${field} name must be ${NAME_MAX_LENGTH} characters or fewer.`;
  }
  return null;
}
