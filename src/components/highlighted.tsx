import type { ReactNode } from "react";

/**
 * A phrase in the accent with a highlighter bar under it.
 *
 * Colour alone was carrying the promise, and colour alone is the emphasis a
 * skimming reader misses.
 *
 * Shared rather than copied because it is now used on the landing page and on
 * the auth page, and those are the two screens a visitor sees back to back —
 * a mark that drifted between them would be visible in a way it never is
 * inside one page.
 */
export function Highlighted({ children }: { children: ReactNode }) {
  return (
    <span className="relative inline-block text-accent">
      {children}
      <span
        aria-hidden
        className="absolute inset-x-0 -bottom-[0.04em] h-[0.09em] rounded-full bg-accent/40"
      />
    </span>
  );
}
