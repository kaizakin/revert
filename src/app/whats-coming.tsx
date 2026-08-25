import type { CSSProperties, ReactNode } from "react";

/**
 * What is coming, shown rather than listed.
 *
 * Same treatment as "How it works" and on the same clock: these reuse the hiw-*
 * beats, the shared cycle and --hiw-index, so a card here lights up in step with
 * the step demo above it instead of running its own competing rhythm. One dial,
 * --hiw-cycle, still paces everything.
 *
 * The panels are illustrations of things that do not exist yet, which is the one
 * risk in this section: a mock convincing enough to look like a screenshot would
 * be promising a feature that is not built. So they stay deliberately schematic,
 * they are all aria-hidden, and the copy under them keeps saying "coming".
 */

/** Fixed-height frame, matching the step demo so the two sections rhyme. */
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

/** A label/value row, same shape as the ones in the other panels. */
function Row({ beat, left, right }: { beat: string; left: string; right: string }) {
  return (
    <span
      className={`${beat} flex items-center justify-between gap-2 rounded border border-line bg-surface px-2.5 py-1`}
    >
      <span className="truncate text-[12px] font-medium text-ink">{left}</span>
      <span className="shrink-0 text-[10px] text-faint">{right}</span>
    </span>
  );
}

function Person({ initials, name, meta }: { initials: string; name: string; meta: string }) {
  return (
    <>
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[9px] font-semibold text-accent">
        {initials}
      </span>
      <span className="truncate text-[11px] text-muted">
        <span className="font-medium text-ink">{name}</span> · {meta}
      </span>
    </>
  );
}

/** One to one: a thread that is not the room. */
function DirectPanel() {
  return (
    <Frame>
      <span className="hiw-a flex items-center gap-2 rounded border border-line bg-surface px-2 py-1">
        <Person initials="pr" name="@priya" meta="direct" />
      </span>

      <span className="mt-2 flex flex-col gap-1.5">
        <span className="hiw-b max-w-[88%] rounded-md rounded-tl-sm bg-bubble-in px-2 py-1 text-[11px] leading-[1.4] text-bubble-in-ink">
          Is the Zoho role still open?
        </span>

        <span className="hiw-c ml-auto max-w-[88%] rounded-md rounded-tr-sm bg-bubble-out px-2 py-1 text-[11px] leading-[1.4] text-bubble-out-ink">
          Yes — send me your resume
        </span>
      </span>
    </Frame>
  );
}

/** Company by company: one room per employer, with someone already inside. */
function RoomsPanel() {
  return (
    <Frame>
      <span className="flex flex-col gap-1.5">
        <Row beat="hiw-a" left="Amazon" right="42 inside" />
        <Row beat="hiw-b" left="Zoho" right="18 inside" />
        <Row beat="hiw-c" left="Swiggy" right="9 inside" />
      </span>
    </Frame>
  );
}

/** Beyond a CV: what someone built and where they are going, not a job history. */
function ProfilePanel() {
  return (
    <Frame>
      <span className="hiw-a flex items-center gap-2 rounded border border-line bg-surface px-2 py-1">
        <Person initials="sn" name="@sneha" meta="Data · Pune" />
      </span>

      <span className="mt-2 flex flex-col gap-1.5">
        <Row beat="hiw-b" left="Built" right="3 projects" />
        <Row beat="hiw-c" left="Wants" right="analytics" />
      </span>
    </Frame>
  );
}

/**
 * Directions, not dates. Someone who finds one room needs to know more is
 * coming; someone who is promised a date and does not get it stops believing the
 * rest of the page. Only the thing actually being built next carries a badge.
 */
const COMING: {
  title: string;
  body: string;
  tag: string;
  badge?: string;
  panel: ReactNode;
}[] = [
  {
    title: "Direct messages",
    body: "Reply to someone privately about a role without either of you swapping numbers first.",
    tag: "One to one",
    badge: "Next",
    panel: <DirectPanel />,
  },
  {
    title: "Referral rooms",
    body: "Company-wise rooms where people already inside can pass a profile along.",
    tag: "Company by company",
    panel: <RoomsPanel />,
  },
  {
    title: "Profiles worth reading",
    body: "A page that shows what you have built and where you are trying to go, not a CV.",
    tag: "Beyond a CV",
    panel: <ProfilePanel />,
  },
];

export function WhatsComing() {
  return (
    <ol className="mt-10 grid gap-5 sm:grid-cols-3">
      {COMING.map((item, index) => (
        <li
          key={item.title}
          className="relative flex flex-col overflow-hidden rounded-md border border-line bg-surface p-5"
          style={{ "--hiw-index": index } as CSSProperties}
        >
          {/* Same progress treatment as the step demo, on the same clock. */}
          <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-line">
            <span className="hiw-progress block h-full bg-accent" />
          </span>

          {/*
            Fixed height whether or not there is a badge, so the panels below
            still line up across the row.
          */}
          <span className="flex h-5 items-center justify-end">
            {item.badge && (
              <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-accent">
                {item.badge}
              </span>
            )}
          </span>

          <div className="mt-3">{item.panel}</div>

          <span className="mt-4 font-display text-[16px] font-semibold text-ink">
            {item.title}
          </span>

          <span className="mt-2 text-[15px] leading-[1.6] text-muted">{item.body}</span>

          {/* mt-auto pins the tag to the bottom, so tags line up across the row. */}
          <span className="mt-auto pt-3 text-[13px] font-medium text-accent">{item.tag}</span>
        </li>
      ))}
    </ol>
  );
}
