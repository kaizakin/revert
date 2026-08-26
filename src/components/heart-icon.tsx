/**
 * A heart, drawn rather than typed.
 *
 * The emoji was the problem, not the sentiment. Emoji ignore letter-spacing, so
 * it broke the eyebrow's tracking, and its own multicolour palette fought a
 * label that is otherwise a single accent colour. A path takes exactly the size
 * and baseline offset it is given — and, unlike an emoji, it can beat.
 *
 * Shared rather than copied because both places it appears say the same
 * sentence about the same community, and the landing page and the auth page are
 * two screens a visitor sees back to back.
 *
 * Red as a literal, like the tick's white check: a heart is red in both themes,
 * and the one red token here means "danger".
 */
export function HeartIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="ml-1.5 inline-block h-[11px] w-[11px] align-[-0.05em] text-[#e0245e]"
      aria-hidden
      focusable="false"
    >
      {/* Beats when the line it sits in is hovered — see .rv-motion in globals.css. */}
      <path
        className="ac-beat"
        fill="currentColor"
        d="M12 21C12 21 3 14.6 3 8.9 3 6.2 5.1 4 7.7 4c1.7 0 3.3.9 4.3 2.3C13 4.9 14.6 4 16.3 4 18.9 4 21 6.2 21 8.9 21 14.6 12 21 12 21z"
      />
    </svg>
  );
}
