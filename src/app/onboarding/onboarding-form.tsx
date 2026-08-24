"use client";

import { useActionState } from "react";

import { USERNAME_MAX, USERNAME_MIN } from "@/lib/username";

import { onboardAction, type OnboardState } from "./actions";

type Props = {
  suggestedUsername: string;
  inviteRequired: boolean;
};

export function OnboardingForm({ suggestedUsername, inviteRequired }: Props) {
  const [state, action, pending] = useActionState<OnboardState, FormData>(onboardAction, {});

  const errorFor = (field: OnboardState["field"]) =>
    state.field === field ? state.error : undefined;

  return (
    <form action={action} className="flex w-full flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="username" className="text-sm font-medium text-ink">
          Choose your username
        </label>

        <div className="flex items-center rounded-lg border border-line bg-surface transition-colors focus-within:border-accent">
          <span className="select-none pl-3 text-sm text-faint">@</span>
          <input
            id="username"
            name="username"
            defaultValue={suggestedUsername}
            required
            autoFocus
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            minLength={USERNAME_MIN}
            maxLength={USERNAME_MAX}
            className="w-full bg-transparent px-1.5 py-3 text-sm text-ink outline-none placeholder:text-faint"
            placeholder="yourname"
            aria-describedby="username-hint"
            aria-invalid={Boolean(errorFor("username"))}
          />
        </div>

        <p id="username-hint" className="text-xs leading-relaxed text-muted">
          Lowercase letters, numbers and underscores. This is how people find you — your
          phone number is never shown to anyone.
        </p>
        {errorFor("username") && (
          <p className="text-xs text-danger">{errorFor("username")}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="inviteCode"
          className="flex items-baseline gap-2 text-sm font-medium text-ink"
        >
          Invite code
          {!inviteRequired && <span className="text-xs font-normal text-faint">optional</span>}
        </label>

        <input
          id="inviteCode"
          name="inviteCode"
          required={inviteRequired}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="REVERT-XXXX-XXXX"
          className="rounded-lg border border-line bg-surface px-3 py-3 text-sm text-ink outline-none transition-colors placeholder:text-faint focus:border-accent"
          aria-invalid={Boolean(errorFor("invite"))}
        />

        {!inviteRequired && (
          <p className="text-xs text-muted">Leave it blank if you do not have one.</p>
        )}
        {errorFor("invite") && <p className="text-xs text-danger">{errorFor("invite")}</p>}
      </div>

      {errorFor("form") && <p className="text-xs text-danger">{errorFor("form")}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Setting up…" : "Enter Revert"}
      </button>
    </form>
  );
}
