/**
 * The Revert mark.
 *
 * A return arrow: it goes out, turns, and comes back. That is what the word
 * means in every sense the product uses it — a reply in chat, a reply from a
 * recruiter, and the undo glyph everyone already reads as "back".
 *
 * The tile uses the accent token and the arrow uses accent-ink, so the mark
 * follows the theme without a second asset for dark mode.
 */

export function LogoMark({
  size = 32,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-[28%] bg-accent text-accent-ink ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg
        viewBox="0 0 32 32"
        width={size * 0.62}
        height={size * 0.62}
        fill="none"
        stroke="currentColor"
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Out to the right, around, and back — the return itself. */}
        <path d="M11 12h7a4.5 4.5 0 0 1 0 9h-3.5" />
        {/* Head pointing back the way it came. */}
        <path d="M13.8 8.8 10.4 12l3.4 3.2" />
      </svg>
    </span>
  );
}

export function Logo({
  size = 28,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <LogoMark size={size} />
      <span
        className="font-semibold tracking-tight text-ink"
        style={{ fontSize: Math.round(size * 0.54) }}
      >
        Revert
      </span>
    </span>
  );
}
