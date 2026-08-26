"use client";

import type { PinDuration } from "@/lib/pins";

const OPTIONS: { value: PinDuration; label: string }[] = [
  { value: "24h", label: "24 hours" },
  { value: "7d", label: "7 days" },
  { value: "forever", label: "Until removed" },
];

/**
 * How long to pin something for.
 *
 * Every pin gets an end date by default rather than living forever by default.
 * A room fills up with notices nobody remembers putting there, and the person
 * who pinned the interview thread last March is not coming back to take it
 * down — so the question is asked once, at the only moment anybody is thinking
 * about it.
 */
export function PinMenu({
  align,
  atCapacity,
  replacing,
  onPick,
  onClose,
}: {
  align: "left" | "right";
  /** The room already holds the maximum, so this pin pushes one out. */
  atCapacity: boolean;
  /** What would go, so the warning names it rather than just counting. */
  replacing: string | null;
  onPick: (duration: PinDuration) => void;
  onClose: () => void;
}) {
  return (
    <>
      <button
        type="button"
        aria-hidden
        tabIndex={-1}
        onClick={onClose}
        className="fixed inset-0 z-30 cursor-default bg-transparent"
      />

      <div
        role="menu"
        aria-label="Pin for how long"
        className={`absolute bottom-full z-40 mb-1.5 w-56 overflow-hidden rounded-xl border border-line bg-surface shadow-xl animate-in fade-in zoom-in-95 duration-100 ${
          align === "right" ? "right-0" : "left-0"
        }`}
      >
        <p className="px-3 pt-2.5 pb-1 text-[10.5px] font-bold uppercase tracking-wider text-faint">
          Pin for
        </p>

        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="menuitem"
            onClick={() => onPick(option.value)}
            className="flex w-full items-center px-3 py-2 text-left text-[13px] text-ink transition-colors hover:bg-raised"
          >
            {option.label}
          </button>
        ))}

        {/*
          Said before the tap, not after. Finding out that pinning one thing
          silently took down another is how a room loses a notice nobody
          noticed was gone.
        */}
        {atCapacity && (
          <p className="border-t border-line bg-raised/50 px-3 py-2 text-[11.5px] leading-relaxed text-muted">
            This room already has three pins. The oldest
            {replacing ? (
              <>
                {" — "}
                <span className="text-ink">
                  &ldquo;{replacing.slice(0, 40)}
                  {replacing.length > 40 ? "…" : ""}&rdquo;
                </span>
                {" — "}
              </>
            ) : (
              " one "
            )}
            will be unpinned.
          </p>
        )}
      </div>
    </>
  );
}
