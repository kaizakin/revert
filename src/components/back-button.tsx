import Link from "next/link";

/**
 * Always goes to the landing page.
 *
 * Deliberately a link rather than router.back(): history-based back is
 * unpredictable here — on a directly-opened tab it does nothing, and when
 * someone arrives from Google it walks them off the site. A fixed destination
 * also means it can be a plain anchor, so it works before hydration and
 * middle-click opens it in a new tab.
 */
export function BackButton() {
  return (
    <Link
      href="/"
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
    </Link>
  );
}
