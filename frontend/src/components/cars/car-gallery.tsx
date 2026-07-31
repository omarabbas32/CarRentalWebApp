"use client";

import Image from "next/image";
import { useState } from "react";
import { cloudinaryThumb, IMAGE_WIDTHS } from "@/lib/cloudinary";
import { cn } from "@/lib/utils";

export function CarGallery({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = useState(0);

  if (images.length === 0) {
    return (
      <div className="flex aspect-[16/10] items-center justify-center rounded-xl border bg-gradient-to-br from-primary/10 to-muted">
        <span className="text-label uppercase text-muted-foreground">
          No photos yet
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-[16/10] overflow-hidden rounded-xl border bg-muted">
        <Image
          src={cloudinaryThumb(images[active], IMAGE_WIDTHS.galleryMain)}
          alt={images.length > 1 ? `${alt} — photo ${active + 1} of ${images.length}` : alt}
          fill
          sizes="(min-width: 1024px) 60vw, 100vw"
          className="object-cover"
          priority
        />
      </div>

      {images.length > 1 && (
        <ul className="flex gap-2 overflow-x-auto pb-1">
          {images.map((url, index) => (
            <li key={url}>
              <button
                type="button"
                onClick={() => setActive(index)}
                aria-label={`Show photo ${index + 1}`}
                aria-current={index === active}
                className={cn(
                  "relative size-16 shrink-0 overflow-hidden rounded-lg border transition-opacity",
                  index === active ? "border-primary" : "opacity-70 hover:opacity-100",
                )}
              >
                <Image
                  src={cloudinaryThumb(url, IMAGE_WIDTHS.galleryThumb)}
                  alt=""
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
