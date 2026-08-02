import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A read-only star rating.
 *
 * The number is always rendered beside the stars, never implied by them:
 * DESIGN.md §2 requires that nothing be communicated by a visual alone, and
 * counting five small shapes is slower than reading "4.5" anyway.
 */
export function Stars({
  rating,
  size = "sm",
  className,
}: {
  rating: number;
  size?: "sm" | "md";
  className?: string;
}) {
  const rounded = Math.round(rating);

  return (
    <span className={cn("inline-flex items-center gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          aria-hidden
          className={cn(
            size === "sm" ? "size-3.5" : "size-4",
            value <= rounded
              ? "fill-status-pending text-status-pending"
              : "text-muted-foreground/40",
          )}
        />
      ))}
      <span className="sr-only">{rating} out of 5</span>
    </span>
  );
}
