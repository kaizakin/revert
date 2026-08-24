"use client";

import { useActionState } from "react";

import { SOCIAL_PROVIDERS } from "@/lib/profile";
import type { PublicProfile } from "@/server/users/profile";

import { saveProfileAction, type ProfileState } from "./actions";

const WORK_OPTIONS = [
  { value: "", label: "Prefer not to say" },
  { value: "working", label: "Working" },
  { value: "student", label: "Student" },
  { value: "looking", label: "Looking for a job" },
];

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

const inputClass =
  "rounded-lg border border-line bg-surface px-3 py-2.5 text-[14px] text-ink outline-none transition-colors placeholder:text-faint focus:border-accent";

export function ProfileForm({
  profile,
  showReadReceipts,
}: {
  profile: PublicProfile;
  showReadReceipts: boolean;
}) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(
    saveProfileAction,
    {},
  );

  const handleFor = (key: string) =>
    profile.socials.find((social) => social.provider === key)?.handle ?? "";

  return (
    <form action={action} className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-faint">About you</h2>

        <Field label="Display name" hint="Optional. Your username stays @{profile.username}.">
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

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-faint">Links</h2>
          <p className="mt-1 text-[12px] text-muted">
            Paste a handle or a full URL — either works.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {SOCIAL_PROVIDERS.map((provider) => (
            <Field key={provider.key} label={provider.label}>
              <input
                name={provider.key}
                defaultValue={handleFor(provider.key)}
                className={inputClass}
                placeholder={provider.placeholder}
                autoCapitalize="none"
                spellCheck={false}
              />
            </Field>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
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
