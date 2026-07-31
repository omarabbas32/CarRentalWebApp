"use client";

import { Check, Circle } from "lucide-react";
import { passwordRuleResults, ALLOWED_SPECIAL_CHARACTERS } from "@/lib/auth/password";
import { cn } from "@/lib/utils";

/**
 * The server's password policy, shown live as the user types.
 *
 * A rejected password costs one of only five auth requests per minute, so the
 * point is that the user never submits one the API will refuse.
 *
 * The list is a live region: a sighted user sees ticks appear, and a screen
 * reader hears the count change rather than nothing at all.
 */
export function PasswordChecklist({ password }: { password: string }) {
  const rules = passwordRuleResults(password);
  const met = rules.filter((r) => r.satisfied).length;

  return (
    <div className="space-y-2">
      <p className="sr-only" aria-live="polite">
        {met} of {rules.length} password requirements met
      </p>

      <ul className="grid gap-1.5 sm:grid-cols-2">
        {rules.map((rule) => (
          <li
            key={rule.id}
            className={cn(
              "flex items-center gap-2 text-caption transition-colors",
              rule.satisfied ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {rule.satisfied ? (
              <Check className="size-3.5 shrink-0 text-primary" aria-hidden />
            ) : (
              <Circle className="size-3.5 shrink-0 opacity-40" aria-hidden />
            )}
            {rule.label}
          </li>
        ))}
      </ul>

      {/* The accepted set is narrower than most people assume — `+` and `=`
          are not in it — so saying "a special character" without saying which
          would leave a user guessing after a rejection. */}
      <p className="text-caption text-muted-foreground">
        Special characters: <span className="font-mono">{ALLOWED_SPECIAL_CHARACTERS}</span>
      </p>
    </div>
  );
}
