"use client";

import { useActionState } from "react";

import { USERNAME_MAX, USERNAME_MIN } from "@/lib/username";

import { onboardAction, type OnboardState } from "./actions";

export function OnboardingForm({ suggestedUsername }: { suggestedUsername: string }) {
  const [state, action, pending] = useActionState<OnboardState, FormData>(onboardAction, {});

  const fieldError = (field: OnboardState["field"]) =>
    state.field === field ? state.error : undefined;

  return (
    <form action={action} className="flex w-full max-w-sm flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label htmlFor="username" className="text-sm font-medium">
          Choose your username
        </label>
        <div className="flex items-center rounded-md border border-black/15 dark:border-white/20 focus-within:border-black dark:focus-within:border-white">
          <span className="pl-3 text-sm text-black/40 dark:text-white/40 select-none">@</span>
          <input
            id="username"
            name="username"
            defaultValue={suggestedUsername}
            required
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            minLength={USERNAME_MIN}
            maxLength={USERNAME_MAX}
            pattern="[a-z][a-z0-9_]*[a-z0-9]"
            className="w-full bg-transparent px-2 py-2.5 text-sm outline-none"
            aria-describedby="username-hint"
            aria-invalid={Boolean(fieldError("username"))}
          />
        </div>
        <p id="username-hint" className="text-xs text-black/50 dark:text-white/50">
          Lowercase letters, numbers and underscores. This is how people find you — your
          phone number is never shown.
        </p>
        {fieldError("username") && (
          <p className="text-xs text-red-600 dark:text-red-400">{fieldError("username")}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="inviteCode" className="text-sm font-medium">
          Invite code
        </label>
        <input
          id="inviteCode"
          name="inviteCode"
          required
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="REVERT-XXXX"
          className="rounded-md border border-black/15 dark:border-white/20 px-3 py-2.5 text-sm outline-none focus:border-black dark:focus:border-white"
          aria-invalid={Boolean(fieldError("invite"))}
        />
        {fieldError("invite") && (
          <p className="text-xs text-red-600 dark:text-red-400">{fieldError("invite")}</p>
        )}
      </div>

      {fieldError("form") && (
        <p className="text-xs text-red-600 dark:text-red-400">{fieldError("form")}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-black px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {pending ? "Setting up…" : "Enter Revert"}
      </button>
    </form>
  );
}
