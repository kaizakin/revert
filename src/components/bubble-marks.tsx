/**
 * Bubble ornaments: delivery ticks and the tail.
 *
 * Both were text or CSS before. "✓✓" sat on the text baseline and collided with
 * the message above it, and the tail was a border triangle, which is a hard
 * wedge where WhatsApp has a curve — the thing that made ours look broken.
 */

export type TickState = "pending" | "sent" | "read";

export function Tick({ state }: { state: TickState }) {
  if (state === "pending") {
    return (
      <svg viewBox="0 0 16 16" className="h-[15px] w-[15px] shrink-0" aria-label="Sending">
        <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.3" />
        <path
          d="M8 4.8V8l2.1 1.3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  /**
   * Two offset checks, drawn as one glyph so the pair keeps its spacing at any
   * size. Blue once everyone has read it, matching the convention people
   * already know from WhatsApp.
   */
  return (
    <svg
      viewBox="0 0 18 12"
      className={`h-[15px] w-[17px] shrink-0 ${state === "read" ? "text-[#53bdeb]" : ""}`}
      aria-label={state === "read" ? "Read by everyone" : "Sent"}
    >
      <path
        d="M1 6.6 4.2 9.8 10.6 2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 6.6 10.2 9.8 16.6 2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * The tail, as a filled curve rather than a CSS border wedge. `currentColor`
 * means the caller sets it from the same token as the bubble, so the two can
 * never drift apart.
 */
export function BubbleTail({ side }: { side: "left" | "right" }) {
  /**
   * Hangs off a squared-off corner, so the straight edge at x=0 meets the
   * bubble flush. Curving it back inward is what gives the flick shape rather
   * than the hard wedge a CSS border triangle produces.
   */
  const path =
    side === "right"
      ? "M0 0 H8 C8 5.2 5 9.4 0 11.5 Z"
      : "M8 0 H0 C0 5.2 3 9.4 8 11.5 Z";

  return (
    <svg
      viewBox="0 0 8 12"
      width={8}
      height={12}
      aria-hidden
      className={`absolute top-0 ${side === "right" ? "-right-2" : "-left-2"}`}
    >
      <path d={path} fill="currentColor" />
    </svg>
  );
}
