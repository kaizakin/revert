"use client";

import { useEffect, useState } from "react";

import Image from "next/image";

import { avatarColour, initials } from "@/lib/avatar";
import type { AvatarPreset } from "@/server/users/avatar-presets";

type Props = {
  /** Seeds the fallback colour and initials before a picture is chosen. */
  seed: string;
  currentUrl: string | null;
  presets: AvatarPreset[];
  compact?: boolean;
};

/**
 * Picture picker for both onboarding and the profile page.
 *
 * Nothing is uploaded or saved on click: the preset choice rides along in a
 * hidden input and the file in the file input, so the whole thing applies on
 * the form's single submit. An earlier version saved on click, which changed
 * your picture even if you then abandoned the form.
 */
export function AvatarField({ seed, currentUrl, presets, compact }: Props) {
  const [preset, setPreset] = useState(currentUrl);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  // Object URLs have to be revoked or the blob leaks for the page lifetime.
  useEffect(() => {
    return () => {
      if (filePreview) URL.revokeObjectURL(filePreview);
    };
  }, [filePreview]);

  const shown = filePreview ?? preset;
  const size = compact ? "h-16 w-16" : "h-18 w-18";

  return (
    <div className="flex flex-col gap-4">
      <input type="hidden" name="avatarPreset" value={preset ?? ""} />

      <div className="flex items-center gap-4">
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shown}
            alt="Your picture"
            className={`${size} shrink-0 rounded-full object-cover`}
          />
        ) : (
          <span
            className={`${size} flex shrink-0 items-center justify-center rounded-full text-lg font-semibold text-white`}
            style={{ backgroundColor: avatarColour(seed) }}
            aria-hidden
          >
            {initials(seed || "?")}
          </span>
        )}

        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="avatar" className="text-[13px] font-medium text-ink">
            Upload a picture
          </label>
          <input
            id="avatar"
            name="avatar"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => {
              const file = event.target.files?.[0];
              setFilePreview(file ? URL.createObjectURL(file) : null);
            }}
            className="max-w-full text-[13px] text-muted file:mr-3 file:rounded-md file:border-0 file:bg-raised file:px-3 file:py-1.5 file:text-[13px] file:text-ink"
          />
          <p className="text-[11px] text-faint">PNG, JPEG or WebP, up to 2 MB.</p>
        </div>
      </div>

      {presets.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[13px] font-medium text-ink">Or pick one</p>
          <div className="flex flex-wrap gap-2">
            {presets.map((option) => {
              const active = !filePreview && preset === option.url;

              return (
                <button
                  key={option.url}
                  type="button"
                  title={option.label}
                  aria-label={option.label}
                  aria-pressed={active}
                  onClick={() => {
                    setPreset(option.url);
                    setFilePreview(null);
                  }}
                  className={`overflow-hidden rounded-full transition-all ${
                    active
                      ? "ring-2 ring-accent ring-offset-2 ring-offset-canvas"
                      : "opacity-75 hover:opacity-100"
                  }`}
                >
                  <Image
                    src={option.url}
                    alt=""
                    width={44}
                    height={44}
                    className="h-11 w-11 object-cover"
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
