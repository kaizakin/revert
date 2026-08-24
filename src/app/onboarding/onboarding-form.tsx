"use client";

import { useActionState } from "react";

import { AvatarField } from "@/components/avatar-field";
import { UsernameField } from "@/components/username-field";
import type { AvatarPreset } from "@/server/users/avatar-presets";

import { checkOnboardingUsername, onboardAction, type OnboardState } from "./actions";

const WORK_OPTIONS = [
  { value: "", label: "Prefer not to say" },
  { value: "working", label: "Working" },
  { value: "student", label: "Student" },
  { value: "looking", label: "Looking for a job" },
];

const inputClass =
  "rounded-lg border border-line bg-surface px-3 py-2.5 text-[14px] text-ink outline-none transition-colors placeholder:text-faint focus:border-accent focus:ring-2 focus:ring-accent/20";

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

type Props = {
  suggestedUsername: string;
  inviteRequired: boolean;
  presets: AvatarPreset[];
};

export function OnboardingForm({ suggestedUsername, inviteRequired, presets }: Props) {
  const [state, action, pending] = useActionState<OnboardState, FormData>(onboardAction, {});

  const errorFor = (field: OnboardState["field"]) =>
    state.field === field ? state.error : undefined;

  return (
    <form action={action} className="flex w-full flex-col gap-7">
      <UsernameField
        current=""
        check={checkOnboardingUsername}
        label="Choose your username"
        hint="Lowercase letters, numbers and underscores. This is how people find you — your phone number is never shown to anyone."
        autoFocus
      />
      {errorFor("username") && (
        <p className="-mt-5 text-[11px] text-danger">{errorFor("username")}</p>
      )}

      {/* Only rendered when a code is actually required, so the field is not
          asked for when signup is open. */}
      {inviteRequired && (
        <Field label="Invite code">
          <input
            name="inviteCode"
            required
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="REVERT-XXXX-XXXX"
            className={inputClass}
          />
          {errorFor("invite") && (
            <span className="text-[11px] text-danger">{errorFor("invite")}</span>
          )}
        </Field>
      )}

      <div className="flex flex-col gap-5 border-t border-line pt-7">
        <div>
          <h2 className="text-[13px] font-semibold text-ink">Your profile</h2>
          <p className="mt-0.5 text-[12px] text-muted">
            All optional — you can skip and finish this later.
          </p>
        </div>

        <AvatarField seed={suggestedUsername} currentUrl={null} presets={presets} compact />

        <Field label="Display name" hint="Optional.">
          <input
            name="displayName"
            maxLength={60}
            className={inputClass}
            placeholder="How you want to be shown"
          />
        </Field>

        <Field label="Headline" hint="One line. Shows under your name.">
          <input
            name="headline"
            maxLength={120}
            className={inputClass}
            placeholder="Backend developer, 2 years, looking to switch"
          />
        </Field>

        <Field label="About">
          <textarea
            name="about"
            maxLength={600}
            rows={3}
            className={`${inputClass} resize-y`}
            placeholder="What you work on, what you are looking for, what you can help with."
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Status">
            <select name="workStatus" defaultValue="" className={inputClass}>
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
              maxLength={80}
              className={inputClass}
              placeholder="Bangalore"
            />
          </Field>

          <Field label="Company">
            <input
              name="company"
              maxLength={80}
              className={inputClass}
              placeholder="Where you work"
            />
          </Field>

          <Field label="College">
            <input
              name="college"
              maxLength={80}
              className={inputClass}
              placeholder="Where you studied"
            />
          </Field>
        </div>

        <p className="text-[11px] text-faint">
          Links to GitHub, LinkedIn and the rest can be added on your profile.
        </p>
      </div>

      {errorFor("form") && <p className="text-[11px] text-danger">{errorFor("form")}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-accent px-4 py-3 text-[14px] font-semibold text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Setting up…" : "Enter Revert"}
      </button>
    </form>
  );
}
