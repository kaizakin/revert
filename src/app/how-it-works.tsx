import type { CSSProperties, ReactNode } from "react";

type Step = { title: string; body: string };

/**
 * The three steps, each demonstrated rather than described.
 *
 * A username gets typed and cleared as available, the room opens with a post
 * already in it, and the three things you can do once you are inside arrive one
 * at a time. The panels loop and run in sequence — a short demo, not a caption.
 *
 * Timing lives in globals.css. Every animated element shares one cycle length,
 * so nothing can drift; a panel's place in the sequence is its --hiw-offset, and
 * a beat's place inside a panel is a percentage window of that cycle.
 *
 * There is no scroll trigger and no client JavaScript at all. An earlier version
 * gated this on an IntersectionObserver, which bought nothing: the loop is
 * decorative, browsers already throttle animations on offscreen elements, and
 * the observer was a dependency that could fail with the section left frozen.
 * CSS runs it, `prefers-reduced-motion` stops it, and the resting state is the
 * finished state — so with motion off the panels read as static illustrations.
 *
 * The connector line between step numbers is gone. It was positioned against
 * badges that sat at the top of each column, and with a panel above them it had
 * nowhere to run that did not cross the copy.
 */

/** Seconds between one panel starting its run and the next. */
const STEP_OFFSET = 3;

/** Fixed-height frame, so the three panels align across the row. */
function Frame({ children }: { children: ReactNode }) {
  return (
    <div
      aria-hidden
      className="flex h-[132px] flex-col overflow-hidden rounded-md border border-line bg-raised p-3"
    >
      {children}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-3 w-3 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 10.5l4 4 8-9" />
    </svg>
  );
}

/** Step one: the name types itself, then comes back clear. */
function UsernamePanel() {
  return (
    <Frame>
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
        Choose a username
      </span>

      <span className="hiw-a mt-2 flex items-center gap-0.5 rounded border border-line bg-surface px-2.5 py-2 font-mono text-[12px] text-ink">
        <span className="text-faint">@</span>
        {/*
          Width animates in `ch` under a stepped easing, which is what makes it
          read as typing rather than as a wipe. It needs the inline-block and the
          clipping to have a width to animate at all.
        */}
        <span className="hiw-type inline-block overflow-hidden whitespace-nowrap align-middle">
          priya
        </span>
        <span className="hiw-caret inline-block h-3.5 w-px shrink-0 bg-accent" />
      </span>

      <span className="hiw-c mt-2.5 flex items-center gap-1.5 text-[11px] font-medium text-accent">
        <CheckIcon />
        available
      </span>
    </Frame>
  );
}

/** Step two: the room is simply there, with something already in it. */
function RoomPanel() {
  return (
    <Frame>
      <span className="hiw-a flex items-center gap-2 rounded border border-line bg-surface px-2 py-1.5">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[9px] font-semibold text-accent">
          MA
        </span>
        <span className="truncate text-[11px] text-muted">
          <span className="font-medium text-ink">Mini Anon Hub</span> · 2,041 members
        </span>
      </span>

      <span className="mt-2 flex flex-col gap-1.5">
        <span className="hiw-b max-w-[88%] rounded-md rounded-tl-sm bg-bubble-in px-2 py-1 text-[11px] leading-[1.4] text-bubble-in-ink">
          Amazon · SDE Intern · 2027
        </span>

        <span className="hiw-c ml-auto max-w-[88%] rounded-md rounded-tr-sm bg-bubble-out px-2 py-1 text-[11px] leading-[1.4] text-bubble-out-ink">
          Applied, thanks
        </span>
      </span>
    </Frame>
  );
}

/** Step three: all three are equally fine, so all three arrive. */
function ActionsPanel() {
  const rows = [
    { beat: "hiw-a", label: "Post an opening" },
    { beat: "hiw-b", label: "Ask about a rejection" },
    { beat: "hiw-c", label: "Just read" },
  ];

  return (
    <Frame>
      <span className="flex flex-col gap-1.5">
        {rows.map((row) => (
          <span
            key={row.label}
            className={`${row.beat} flex items-center gap-2 rounded border border-line bg-surface px-2.5 py-1.5 text-[11px] text-ink`}
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
            {row.label}
          </span>
        ))}
      </span>
    </Frame>
  );
}

/** Paired with STEPS by position. Extra steps get copy without a panel. */
const PANELS = [<UsernamePanel key="u" />, <RoomPanel key="r" />, <ActionsPanel key="a" />];

export function HowItWorks({ steps }: { steps: Step[] }) {
  return (
    <ol className="mt-10 grid gap-9 sm:grid-cols-3 sm:gap-7">
      {steps.map((step, index) => (
        <li
          key={step.title}
          className="flex flex-col"
          style={{ "--hiw-offset": `${index * STEP_OFFSET}s` } as CSSProperties}
        >
          {PANELS[index]}

          <span className="mt-4 flex items-center gap-2.5">
            <span
              aria-hidden
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent font-display text-[12px] font-semibold text-accent-ink"
            >
              {index + 1}
            </span>

            <span className="font-display text-[16px] font-semibold text-ink">{step.title}</span>
          </span>

          <span className="mt-2 text-[15px] leading-[1.6] text-muted">{step.body}</span>
        </li>
      ))}
    </ol>
  );
}
