import type { ReactNode } from "react";

/**
 * Four things the room does, each shown before it is described.
 *
 * The panels are illustrations, not screenshots: built from the same tokens as
 * the real room, so they cannot drift out of date, they work on black and on
 * paper, and they cost nothing to load. Every one is aria-hidden — the title and
 * body underneath already say what the panel shows, and a screen reader reading
 * out a fake job post as though it were real would be worse than silence.
 *
 * They are deliberately small and quiet. A preview that tries to be a full
 * screenshot competes with the chat deck in the hero; these only need to make
 * the claim underneath them concrete.
 */

/** Fixed-height frame, so all four panels align across a row. */
function Panel({ children }: { children: ReactNode }) {
  return (
    <div
      aria-hidden
      className="flex h-[152px] flex-col overflow-hidden rounded-md border border-line bg-raised p-3"
    >
      {children}
    </div>
  );
}

/** One row inside a panel. The shared shape is most of what makes them read as one set. */
function Row({
  left,
  right,
  dim = false,
}: {
  left: ReactNode;
  right: ReactNode;
  dim?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded border border-line bg-surface px-2.5 py-1.5">
      <span className={`truncate text-[12px] ${dim ? "text-muted" : "font-medium text-ink"}`}>
        {left}
      </span>
      <span className="shrink-0 text-[11px] text-faint">{right}</span>
    </div>
  );
}

function SearchPanel() {
  return (
    <Panel>
      <div className="flex items-center gap-2 rounded border border-line bg-surface px-2.5 py-2">
        <svg
          viewBox="0 0 24 24"
          className="h-3.5 w-3.5 shrink-0 text-faint"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <circle cx="11" cy="11" r="6.5" />
          <path d="M16 16l4.5 4.5" />
        </svg>
        <span className="text-[12px] text-faint">backend intern</span>
      </div>

      {/*
        Two results, not three. A third row overflowed the fixed frame by 24px
        at 375px wide, and the frame clips silently — so it looked fine on a
        desktop and quietly ate a row on a phone.
      */}
      <div className="mt-2 flex flex-col gap-1.5">
        <Row left="Amazon" right="2 weeks ago" />
        <Row left="Zoho" right="last month" />
      </div>
    </Panel>
  );
}

function ReplyPanel() {
  return (
    <Panel>
      <div className="flex flex-col gap-2">
        <span className="max-w-[88%] rounded-md rounded-tl-sm bg-bubble-in px-2.5 py-1.5 text-[12px] leading-[1.45] text-bubble-in-ink">
          Anyone done round 2 at Google recently?
        </span>

        <span className="ml-auto max-w-[88%] rounded-md rounded-tr-sm bg-bubble-out px-2.5 py-1.5 text-[12px] leading-[1.45] text-bubble-out-ink">
          System design. Say your tradeoffs out loud — that is what they score.
        </span>
      </div>
    </Panel>
  );
}

/** Small pill switch. Purely decorative, so it is a span rather than an input. */
function Switch({ on }: { on: boolean }) {
  return (
    <span
      className={`relative block h-3.5 w-6 shrink-0 rounded-full ${
        on ? "bg-accent" : "bg-line-strong"
      }`}
    >
      <span
        className={`absolute top-0.5 h-2.5 w-2.5 rounded-full bg-surface ${
          on ? "right-0.5" : "left-0.5"
        }`}
      />
    </span>
  );
}

function NotificationsPanel() {
  const rows: { label: string; on: boolean }[] = [
    { label: "Mute this room", on: true },
    { label: "Mentions of you", on: true },
    { label: "Every message", on: false },
  ];

  return (
    <Panel>
      <div className="flex flex-col gap-1.5">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-2 rounded border border-line bg-surface px-2.5 py-2"
          >
            <span className="truncate text-[12px] text-ink">{row.label}</span>
            <Switch on={row.on} />
          </div>
        ))}
      </div>
    </Panel>
  );
}

function ProfilePanel() {
  return (
    <Panel>
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[13px] font-semibold text-accent">
          pr
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-[12px] font-semibold text-ink">@priya</span>
          <span className="truncate text-[11px] text-faint">Backend · Bengaluru</span>
        </span>
      </div>

      <div className="mt-3 flex flex-col gap-1.5">
        <Row left="Username" right="@priya" dim />
        <Row left="Phone number" right="never asked" dim />
      </div>
    </Panel>
  );
}

/**
 * Copy lives beside its panel rather than in a data array, because each panel is
 * bespoke markup anyway — an array of {title, body, panel} would just be a
 * lookup table with one entry per branch.
 */
const CARDS = [
  {
    title: "Openings stay findable",
    body: "Every post is searchable later. Nothing scrolls away at 2am while you are asleep.",
    panel: <SearchPanel />,
  },
  {
    title: "Ask, and get answered",
    body: "Reply to any message, mention anyone, and find the answer again next week.",
    panel: <ReplyPanel />,
  },
  {
    title: "Notifications you control",
    body: "Mute the room and still get mentions. A live QnA will not blow up your phone any more.",
    panel: <NotificationsPanel />,
  },
  {
    title: "A username, not a number",
    body: "You join as a name you pick. There is no number to leak, because we never ask you for one.",
    panel: <ProfilePanel />,
  },
];

export function WhatYouGet() {
  return (
    <ul className="mt-10 grid gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-2">
      {CARDS.map((card) => (
        <li key={card.title} className="flex flex-col bg-canvas p-6">
          {card.panel}

          <h3 className="mt-5 text-[16px] font-semibold text-ink">{card.title}</h3>
          <p className="mt-2 text-[15px] leading-[1.6] text-muted">{card.body}</p>
        </li>
      ))}
    </ul>
  );
}
