"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

/**
 * The resolved theme is unknowable during SSR, so the usual `mounted` flag is
 * used to avoid a hydration mismatch — but that means setState inside an
 * effect, which the React Compiler lint rules reject.
 *
 * Both icons are rendered instead and swapped by the `dark:` variant off the
 * class next-themes writes onto <html>. No state, no effect, no mismatch, and
 * the correct icon is painted on first frame rather than after hydration.
 */
export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle dark mode"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Moon className="size-4 dark:hidden" aria-hidden />
      <Sun className="hidden size-4 dark:block" aria-hidden />
    </Button>
  );
}
