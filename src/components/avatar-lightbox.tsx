"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { avatarColour, initials } from "@/lib/avatar";

type Props = {
  url: string | null;
  username: string;
  /** Shown above the handle, the way a contact's photo is titled by their name. */
  displayName?: string | null;
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
  displayName,
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
          className="fixed inset-0 z-50 flex flex-col bg-black"
        >
          {/*
            Solid black rather than a tint over the app. A photo viewer that
            leaves the room showing through behind it reads as a popover; this
            is meant to be the only thing on screen.
          */}

          {/*
            The bar sits over the photo, not above it, so the picture keeps the
            whole height. A gradient rather than a filled bar because the top of
            a portrait is usually light and white text on it would vanish —
            the scrim only darkens where the text is.
          */}
          <div className="absolute inset-x-0 top-0 z-10 flex items-center gap-3 bg-gradient-to-b from-black/70 to-transparent px-2 py-3 pb-8">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Back"
              autoFocus
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
                <path
                  d="M15 19l-7-7 7-7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            <span className="flex min-w-0 flex-col">
              <span className="truncate text-[16px] font-medium text-white">
                {displayName ?? `@${username}`}
              </span>
              {displayName && (
                <span className="truncate text-[12px] text-white/70">@{username}</span>
              )}
            </span>
          </div>

          {/*
            Tapping beside the photo closes, which needs to be a real button for
            anyone not using a pointer. The photo sits above it and stops the
            click, so tapping the picture itself does nothing — the same as
            tapping a photo you are already looking at should do.
          */}
          <button
            type="button"
            aria-label="Close photo"
            onClick={() => setOpen(false)}
            className="flex flex-1 cursor-default items-center justify-center"
          >
            {/*
              Edge to edge on a phone, capped on a desktop so a small avatar is
              not blown up across a monitor. No rounding: this is the photo
              itself now, not an avatar standing in for someone.
            */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`Photo of ${username}`}
              onClick={(event) => event.stopPropagation()}
              className="max-h-full w-full max-w-[36rem] cursor-auto object-contain"
            />
          </button>
        </div>
      )}
    </>
  );
}
