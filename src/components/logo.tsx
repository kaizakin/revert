import {
  MARK_PATHS,
  MARK_RADIUS,
  MARK_STROKE,
  MARK_VIEWBOX,
} from "@/lib/mark";

/**
 * The Revert mark on its tile.
 *
 * Geometry lives in @/lib/mark, which the favicon and the touch icon are also
 * generated from — the drawing exists once.
 *
 * The tile uses the accent token and the arrow uses accent-ink, so the mark
 * follows the theme without a second asset for dark mode. It inverts on the way
 * through: white on deep green in light, dark ink on mint in dark.
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
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden bg-accent text-accent-ink ${className}`}
      style={{ width: size, height: size, borderRadius: size * MARK_RADIUS }}
      aria-hidden
    >
      {/*
        Sized to the whole tile rather than a fraction of it, so the stroke
        resolves to size/16 device pixels. The padding that keeps the mark off
        the corners is drawn into the path data instead — see MARK_STROKE.
      */}
      <svg
        viewBox={`0 0 ${MARK_VIEWBOX} ${MARK_VIEWBOX}`}
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeWidth={MARK_STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {MARK_PATHS.map((d) => (
          <path key={d} d={d} />
        ))}
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
