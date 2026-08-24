"use client";

import { useEffect, useState } from "react";

import { USERNAME_MAX, USERNAME_MIN } from "@/lib/username";
import type { AvailabilityResult } from "@/server/users/rename";

type Props = {
  /** The name currently stored, or "" during onboarding. */
  current: string;
  check: (raw: string) => Promise<AvailabilityResult>;
  label?: string;
  hint?: string;
  autoFocus?: boolean;
};

/**
 * Username input with a debounced availability check.
 *
 * Only the fetched answer is stored, tagged with the value it was fetched for.
 * Everything shown is derived from that plus the current input, so the effect
 * never has to setState synchronously to correct stale UI.
 */
export function UsernameField({
  current,
  check,
  label = "Username",
  hint,
  autoFocus,
}: Props) {
  const [value, setValue] = useState(current);
  const [checked, setChecked] = useState<{ for: string; result: AvailabilityResult } | null>(
    null,
  );

  const trimmed = value.trim().toLowerCase();
  const isCurrent = trimmed === current;
  const isEmpty = trimmed.length === 0;

  useEffect(() => {
    if (isCurrent || isEmpty) return;

    // Debounced, so typing does not fire a request per keystroke.
    const timer = setTimeout(() => {
      void check(value).then((result) => {
        setChecked({ for: value.trim().toLowerCase(), result });
      });
    }, 400);

    return () => clearTimeout(timer);
  }, [value, isCurrent, isEmpty, check]);

  const result: AvailabilityResult | "checking" | "idle" =
    isEmpty || isCurrent
      ? "idle"
      : checked?.for === trimmed
        ? checked.result
        : "checking";

  const message =
    result === "idle"
      ? null
      : result === "checking"
        ? { text: "Checking…", tone: "text-faint" }
        : result.status === "available"
          ? { text: "Available", tone: "text-accent" }
          : result.status === "taken"
            ? { text: "Already taken", tone: "text-danger" }
            : result.status === "invalid"
              ? { text: result.reason, tone: "text-danger" }
              : null;

  const isBad =
    result !== "idle" &&
    result !== "checking" &&
    (result.status === "taken" || result.status === "invalid");

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="username" className="text-[13px] font-medium text-ink">
        {label}
      </label>

      <div
        className={`flex items-center rounded-lg border bg-surface transition-colors ${
          isBad
            ? "border-danger"
            : "border-line focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20"
        }`}
      >
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
          autoFocus={autoFocus}
          placeholder="yourname"
          className="w-full bg-transparent px-1.5 py-2.5 text-[14px] text-ink outline-none placeholder:text-faint"
        />
        {result !== "idle" && (
          <span
            aria-hidden
            className={`pr-3 text-[15px] ${
              result === "checking"
                ? "text-faint"
                : result.status === "available"
                  ? "text-accent"
                  : "text-danger"
            }`}
          >
            {result === "checking" ? "…" : result.status === "available" ? "✓" : "✕"}
          </span>
        )}
      </div>

      {message ? (
        <span className={`text-[11px] ${message.tone}`} aria-live="polite">
          {message.text}
        </span>
      ) : (
        hint && <span className="text-[11px] text-faint">{hint}</span>
      )}
    </div>
  );
}
