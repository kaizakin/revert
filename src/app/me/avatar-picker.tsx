"use client";

import { useActionState, useState } from "react";

import { avatarColour, initials } from "@/lib/avatar";
import type { AvatarPreset } from "@/server/users/avatar-presets";

import { chooseAvatarAction, uploadAvatarAction, type AvatarState } from "./actions";

type Props = {
  username: string;
  currentUrl: string | null;
  presets: AvatarPreset[];
};

export function AvatarPicker({ username, currentUrl, presets }: Props) {
  const [selected, setSelected] = useState(currentUrl);
  const [choiceError, setChoiceError] = useState<string | null>(null);
  const [uploadState, uploadAction, uploading] = useActionState<AvatarState, FormData>(
    uploadAvatarAction,
    {},
  );

  const shown = uploadState.url ?? selected;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        {shown ? (
          // Avatars come from Supabase Storage and /public; a plain img avoids
          // configuring remote patterns for a 72px circle.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shown}
            alt="Your avatar"
            width={72}
            height={72}
            className="h-18 w-18 rounded-full object-cover"
          />
        ) : (
          <span
            className="flex h-18 w-18 items-center justify-center rounded-full text-xl font-semibold text-white"
            style={{ backgroundColor: avatarColour(username) }}
            aria-hidden
          >
            {initials(username)}
          </span>
        )}

        <form action={uploadAction} className="flex flex-col gap-2">
          <label className="text-sm font-medium text-ink" htmlFor="avatar">
            Upload your own
          </label>
          <div className="flex items-center gap-2">
            <input
              id="avatar"
              name="avatar"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="max-w-56 text-[13px] text-muted file:mr-3 file:rounded-md file:border-0 file:bg-raised file:px-3 file:py-1.5 file:text-[13px] file:text-ink"
            />
            <button
              type="submit"
              disabled={uploading}
              className="rounded-lg bg-accent px-3 py-1.5 text-[13px] font-semibold text-accent-ink disabled:opacity-50"
            >
              {uploading ? "Uploading…" : "Upload"}
            </button>
          </div>
          <p className="text-[11px] text-faint">PNG, JPEG or WebP, up to 2 MB.</p>
          {uploadState.error && (
            <p className="text-[11px] text-danger">{uploadState.error}</p>
          )}
        </form>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-ink">Or pick one</p>

        {presets.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line px-3 py-4 text-[13px] leading-relaxed text-muted">
            No preset avatars yet. Drop image files into{" "}
            <code className="rounded bg-raised px-1 py-0.5 text-[12px]">public/avatars/</code>{" "}
            and they show up here automatically.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => {
              const active = shown === preset.url;

              return (
                <button
                  key={preset.url}
                  type="button"
                  title={preset.label}
                  aria-label={preset.label}
                  aria-pressed={active}
                  onClick={async () => {
                    setSelected(preset.url);
                    const result = await chooseAvatarAction(preset.url);
                    if (result.error) {
                      setChoiceError(result.error);
                      setSelected(currentUrl);
                    } else {
                      setChoiceError(null);
                    }
                  }}
                  className={`overflow-hidden rounded-full transition-all ${
                    active ? "ring-2 ring-accent ring-offset-2 ring-offset-canvas" : "opacity-80 hover:opacity-100"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preset.url}
                    alt=""
                    width={48}
                    height={48}
                    className="h-12 w-12 object-cover"
                  />
                </button>
              );
            })}
          </div>
        )}

        {choiceError && <p className="text-[11px] text-danger">{choiceError}</p>}
      </div>
    </div>
  );
}
