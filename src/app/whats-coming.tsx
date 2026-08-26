import type { ReactNode } from "react";

/**
 * What is coming, shown rather than listed.
 *
 * Animates on hover, on the same wyg-* beats as "What you get" — not on the
 * autoplaying clock the step demo uses. These are three parallel things a reader
 * can look at in any order, so there is nothing for a sequence to say; the step
 * demo autoplays because its three panels are one process in order. Sharing the
 * hover system also means no progress bar here, since there is no turn to report.
 *
 * The panels illustrate things that do not exist yet, which is the risk in this
 * section: a mock convincing enough to read as a screenshot would be promising a
 * feature nobody can use. So they stay deliberately schematic, they are all
 * aria-hidden, and the copy above them still says "in roughly this order".
 *
 * Nothing is hidden until hover — a phone has no hover, and a panel that only
 * assembled itself on mouse-over would be a dead rectangle there.
 */

/** Fixed-height frame, so the three panels align across the row. */
function Panel({ children }: { children: ReactNode }) {
  return (
    <div
      aria-hidden
      className="flex h-[132px] flex-col overflow-hidden rounded-md border border-line bg-raised p-3 transition-colors duration-200 group-hover:border-line-strong"
    >
      {children}
    </div>
  );
}

/**
 * A label/value row. No beat class: the stagger lives on the parent, which
 * animates its direct children in order.
 *
 * py-1 rather than py-1.5, and the avatar a size down. Three of the taller rows
 * plus a header overflowed the frame by 9px, and the frame clips in silence.
 */
function Row({ left, right }: { left: string; right: string }) {
  return (
    <span className="flex items-center justify-between gap-2 rounded border border-line bg-surface px-2.5 py-1">
      <span className="truncate text-[12px] font-medium text-ink">{left}</span>
      <span className="shrink-0 text-[10px] text-faint">{right}</span>
    </span>
  );
}

function Person({ initials, name, meta }: { initials: string; name: string; meta: string }) {
  return (
    <span className="flex items-center gap-2 rounded border border-line bg-surface px-2 py-1">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[9px] font-semibold text-accent">
        {initials}
      </span>
      <span className="truncate text-[11px] text-muted">
        <span className="font-medium text-ink">{name}</span> · {meta}
      </span>
    </span>
  );
}

/** One to one: a thread that is not the room. */
function DirectPanel() {
  return (
    <Panel>
      <span className="wyg-stagger flex flex-col gap-1.5">
        <Person initials="pr" name="@priya" meta="direct" />

        <span className="max-w-[88%] rounded-md rounded-tl-sm bg-bubble-in px-2 py-1 text-[11px] leading-[1.4] text-bubble-in-ink">
          Is the Zoho role still open?
        </span>

        <span className="ml-auto max-w-[88%] rounded-md rounded-tr-sm bg-bubble-out px-2 py-1 text-[11px] leading-[1.4] text-bubble-out-ink">
          Yes, send me your resume
        </span>
      </span>
    </Panel>
  );
}

/** Company by company: one room per employer, with someone already inside. */
function RoomsPanel() {
  return (
    <Panel>
      <span className="wyg-stagger flex flex-col gap-1.5">
        <Row left="Amazon" right="42 inside" />
        <Row left="Zoho" right="18 inside" />
        <Row left="Swiggy" right="9 inside" />
      </span>
    </Panel>
  );
}

/**
 * Beyond a CV: what someone built and where they are going, not a job history.
 * Pops rather than rises, so a person arriving reads differently from rows
 * landing in a list.
 */
function ProfilePanel() {
  return (
    <Panel>
      <span className="wyg-pop-stagger flex flex-col gap-1.5">
        <Person initials="sn" name="@sneha" meta="Data · Pune" />
        <Row left="Built" right="3 projects" />
        <Row left="Wants" right="analytics" />
      </span>
    </Panel>
  );
}

/**
 * Directions, not dates. Someone who finds one room needs to know more is
 * coming; someone who is promised a date and does not get it stops believing the
 * rest of the page.
 */
const COMING: {
  title: string;
  body: string;
  tag: string;
  panel: ReactNode;
}[] = [
  {
    title: "Direct messages",
    body: "Reply to someone privately about a role without either of you swapping numbers first.",
    tag: "One to one",
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
    <ul className="mt-10 grid gap-5 sm:grid-cols-3">
      {COMING.map((item) => (
        <li
          key={item.title}
          className="wyg-card group flex flex-col rounded-md border border-line bg-surface p-5 transition-shadow hover:shadow-[inset_0_0_0_1px_var(--rv-accent)] motion-reduce:transition-none"
        >
          {item.panel}

          <span className="mt-4 font-display text-[16px] font-semibold text-ink">
            {item.title}
          </span>

          <span className="mt-2 text-[15px] leading-[1.6] text-muted">{item.body}</span>

          {/* mt-auto pins the tag to the bottom, so tags line up across the row. */}
          <span className="mt-auto pt-3 text-[13px] font-medium text-accent">{item.tag}</span>
        </li>
      ))}
    </ul>
  );
}
