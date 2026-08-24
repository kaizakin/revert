"use client";

import { useRouter } from "next/navigation";

/**
 * Goes back if there is somewhere to go back to, otherwise home.
 *
 * router.back() on a directly-opened tab either does nothing or leaves the site
 * entirely, so the history length is checked first. A plain link home would be
 * predictable but loses the person's place when they came from inside the app.
 */
export function BackButton({ fallback = "/" }: { fallback?: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push(fallback);
      }}
      className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-3.5 py-2 text-[13px] font-medium text-ink transition-colors hover:border-line-strong hover:bg-raised"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
        <path
          d="M14 6l-6 6 6 6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
        />
      </svg>
      Back
    </button>
  );
}
