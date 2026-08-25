"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { avatarColour, initials } from "@/lib/avatar";

type Props = {
  url: string | null;
  username: string;
  /** Rendered size of the clickable avatar, in pixels. */
  size?: number;
  className?: string;
};

/**
 * Avatar that opens full screen when tapped, the way a profile picture does in
 * WhatsApp. Falls back to initials, which are not clickable — there is nothing
 * to enlarge.
 */
export function AvatarLightbox({
  url,
  username,
  size = 96,
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);

    // Stop the chat behind the overlay from scrolling under it.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!url) {
    return (
      <span
        className={`flex items-center justify-center rounded-full font-semibold text-white ${className}`}
        style={{
          width: size,
          height: size,
          backgroundColor: avatarColour(username),
          fontSize: Math.round(size / 3),
        }}
        aria-hidden
      >
        {initials(username)}
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`View photo of ${username} full screen`}
        className={`shrink-0 overflow-hidden rounded-full transition-opacity hover:opacity-90 ${className}`}
        style={{ width: size, height: size }}
      >
        <Image
          src={url}
          alt=""
          width={size}
          height={size}
          className="h-full w-full object-cover"
        />
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Photo of ${username}`}
          className="fixed inset-0 z-50 flex flex-col bg-black/95"
        >
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-[15px] font-medium text-white">
              @{username}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close photo"
              autoFocus
              className="rounded-full p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
                <path
                  d="M6 6l12 12M18 6L6 18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          {/*
            Clicking the backdrop closes, so it has to be a real button for
            keyboard and screen-reader users. The image sits above it and stops
            propagation, so tapping the photo itself does not close.
          */}
          <button
            type="button"
            aria-label="Close photo"
            onClick={() => setOpen(false)}
            className="flex flex-1 cursor-default items-center justify-center p-6"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`Photo of ${username}`}
              onClick={(event) => event.stopPropagation()}
              className="max-h-full max-w-full cursor-auto rounded-lg object-contain"
            />
          </button>
        </div>
      )}
    </>
  );
}
