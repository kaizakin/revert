"use client";

import { useActionState, useEffect, useState } from "react";

import { SocialIcon } from "@/components/social-icon";
import { avatarColour, initials } from "@/lib/avatar";
import { SOCIAL_PROVIDERS } from "@/lib/profile";
import { USERNAME_MAX, USERNAME_MIN } from "@/lib/username";
import type { AvatarPreset } from "@/server/users/avatar-presets";
import type { PublicProfile } from "@/server/users/profile";
import type { AvailabilityResult } from "@/server/users/rename";

import { checkUsernameAction, saveProfileAction, type ProfileState } from "./actions";

const WORK_OPTIONS = [
  { value: "", label: "Prefer not to say" },
  { value: "working", label: "Working" },
  { value: "student", label: "Student" },
  { value: "looking", label: "Looking for a job" },
];

const inputClass =
  "rounded-lg border border-line bg-surface px-3 py-2.5 text-[14px] text-ink outline-none transition-colors placeholder:text-faint focus:border-accent";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-faint">{hint}</span>}
    </label>
  );
}

function UsernameField({ current }: { current: string }) {
  const [value, setValue] = useState(current);

  /**
   * Only the fetched answer is stored, tagged with the value it was fetched
   * for. Everything shown is derived from that plus the current input, so the
   * effect never has to setState synchronously to correct stale UI.
   */
  const [checked, setChecked] = useState<{ for: string; result: AvailabilityResult } | null>(
    null,
  );

  const trimmed = value.trim().toLowerCase();
  const isCurrent = trimmed === current;

  useEffect(() => {
    if (isCurrent) return;

    // Debounced, so typing does not fire a request per keystroke.
    const timer = setTimeout(() => {
      void checkUsernameAction(value).then((result) => {
        setChecked({ for: value.trim().toLowerCase(), result });
      });
    }, 400);

    return () => clearTimeout(timer);
  }, [value, isCurrent]);

  const result: AvailabilityResult | "checking" = isCurrent
    ? { status: "unchanged" }
    : checked?.for === trimmed
      ? checked.result
      : "checking";

  const message =
    result === "checking"
      ? { text: "Checking…", tone: "text-faint" }
      : result.status === "available"
        ? { text: "Available", tone: "text-accent" }
        : result.status === "taken"
          ? { text: "Already taken", tone: "text-danger" }
          : result.status === "invalid"
            ? { text: result.reason, tone: "text-danger" }
            : { text: "This is your current username.", tone: "text-faint" };

  const mark =
    result === "checking"
      ? { glyph: "…", tone: "text-faint" }
      : result.status === "available"
        ? { glyph: "✓", tone: "text-accent" }
        : { glyph: "✕", tone: "text-danger" };

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="username" className="text-[13px] font-medium text-ink">
        Username
      </label>

      <div className="flex items-center rounded-lg border border-line bg-surface transition-colors focus-within:border-accent">
        <span className="select-none pl-3 text-[14px] text-faint">@</span>
        <input
          id="username"
          name="username"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          minLength={USERNAME_MIN}
          maxLength={USERNAME_MAX}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          className="w-full bg-transparent px-1.5 py-2.5 text-[14px] text-ink outline-none"
        />
        {!isCurrent && (
          <span aria-hidden className={`pr-3 text-[15px] ${mark.tone}`}>
            {mark.glyph}
          </span>
        )}
      </div>

      <span className={`text-[11px] ${message.tone}`} aria-live="polite">
        {message.text}
      </span>
    </div>
  );
}

function AvatarField({
  username,
  currentUrl,
  presets,
}: {
  username: string;
  currentUrl: string | null;
  presets: AvatarPreset[];
}) {
  const [preset, setPreset] = useState(currentUrl);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  // Object URLs have to be revoked or the blob leaks for the page lifetime.
  useEffect(() => {
    return () => {
      if (filePreview) URL.revokeObjectURL(filePreview);
    };
  }, [filePreview]);

  const shown = filePreview ?? preset;

  return (
    <div className="flex flex-col gap-4">
      {/* Carries the choice into the single form submit, so nothing is written
          until Save. */}
      <input type="hidden" name="avatarPreset" value={preset ?? ""} />

      <div className="flex items-center gap-4">
        {shown ? (
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

        <div className="flex flex-col gap-1.5">
          <label htmlFor="avatar" className="text-[13px] font-medium text-ink">
            Upload your own
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
            className="max-w-64 text-[13px] text-muted file:mr-3 file:rounded-md file:border-0 file:bg-raised file:px-3 file:py-1.5 file:text-[13px] file:text-ink"
          />
          <p className="text-[11px] text-faint">
            PNG, JPEG or WebP, up to 2 MB. Applied when you save.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-[13px] font-medium text-ink">Or pick one</p>

        {presets.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line px-3 py-4 text-[13px] leading-relaxed text-muted">
            No preset avatars yet. Drop image files into{" "}
            <code className="rounded bg-raised px-1 py-0.5 text-[12px]">public/avatars/</code> and
            they show up here automatically.
          </p>
        ) : (
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
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={option.url}
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
      </div>
    </div>
  );
}

export function ProfileForm({
  profile,
  showReadReceipts,
  presets,
}: {
  profile: PublicProfile;
  showReadReceipts: boolean;
  presets: AvatarPreset[];
}) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(saveProfileAction, {});

  const handleFor = (key: string) =>
    profile.socials.find((social) => social.provider === key)?.handle ?? "";

  return (
    <form action={action} className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-faint">Picture</h2>
        <AvatarField
          username={profile.username}
          currentUrl={profile.avatarUrl}
          presets={presets}
        />
      </section>

      <section className="flex flex-col gap-4 border-t border-line pt-8">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-faint">About you</h2>

        <UsernameField current={profile.username} />

        <Field
          label="Display name"
          hint={`Optional. Your username stays @${profile.username} unless you change it above.`}
        >
          <input
            name="displayName"
            defaultValue={profile.displayName ?? ""}
            maxLength={60}
            className={inputClass}
            placeholder="How you want to be shown"
          />
        </Field>

        <Field label="Headline" hint="One line. Shows under your name.">
          <input
            name="headline"
            defaultValue={profile.headline ?? ""}
            maxLength={120}
            className={inputClass}
            placeholder="Backend developer, 2 years, looking to switch"
          />
        </Field>

        <Field label="About">
          <textarea
            name="about"
            defaultValue={profile.about ?? ""}
            maxLength={600}
            rows={4}
            className={`${inputClass} resize-y`}
            placeholder="What you work on, what you are looking for, what you can help with."
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Status">
            <select
              name="workStatus"
              defaultValue={profile.workStatus ?? ""}
              className={inputClass}
            >
              {WORK_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Location">
            <input
              name="location"
              defaultValue={profile.location ?? ""}
              maxLength={80}
              className={inputClass}
              placeholder="Bangalore"
            />
          </Field>

          <Field label="Company">
            <input
              name="company"
              defaultValue={profile.company ?? ""}
              maxLength={80}
              className={inputClass}
              placeholder="Where you work"
            />
          </Field>

          <Field label="College">
            <input
              name="college"
              defaultValue={profile.college ?? ""}
              maxLength={80}
              className={inputClass}
              placeholder="Where you studied"
            />
          </Field>
        </div>
      </section>

      <section className="flex flex-col gap-4 border-t border-line pt-8">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-faint">Links</h2>
          <p className="mt-1 text-[12px] text-muted">
            Paste a handle or a full URL — either works.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {SOCIAL_PROVIDERS.map((provider) => (
            <label key={provider.key} className="flex flex-col gap-1.5">
              <span className="flex items-center gap-1.5 text-[13px] font-medium text-ink">
                <SocialIcon provider={provider.key} className="h-4 w-4 text-muted" />
                {provider.label}
              </span>
              <input
                name={provider.key}
                defaultValue={handleFor(provider.key)}
                className={inputClass}
                placeholder={provider.placeholder}
                autoCapitalize="none"
                spellCheck={false}
              />
            </label>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3 border-t border-line pt-8">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-faint">Privacy</h2>

        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="showLastActive"
            defaultChecked={profile.showLastActive}
            className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
          />
          <span className="flex flex-col">
            <span className="text-[13px] text-ink">Show when I was last active</span>
            <span className="text-[11px] text-faint">
              Turn this off and you also stop seeing it for everyone else.
            </span>
          </span>
        </label>

        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="showReadReceipts"
            defaultChecked={showReadReceipts}
            className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
          />
          <span className="flex flex-col">
            <span className="text-[13px] text-ink">Send read receipts</span>
            <span className="text-[11px] text-faint">
              Same trade: turn it off and you cannot see anyone else&apos;s either.
            </span>
          </span>
        </label>
      </section>

      <div className="flex items-center gap-3 border-t border-line pt-5">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-accent px-5 py-2.5 text-[14px] font-semibold text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save profile"}
        </button>

        {state.saved && <span className="text-[13px] text-accent">Saved</span>}
        {state.error && <span className="text-[13px] text-danger">{state.error}</span>}
      </div>
    </form>
  );
}
