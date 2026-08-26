import type { ReactNode } from "react";

/**
 * Six things the room does, each shown before it is described.
 *
 * The panels are illustrations, not screenshots: built from the same tokens as
 * the real room, so they cannot drift out of date, they work on black and on
 * paper, and they cost nothing to load. Every one is aria-hidden — the title and
 * body underneath already say what the panel shows, and a screen reader reading
 * out a fake job post as though it were real would be worse than silence.
 *
 * Each panel animates on hover, and the motion is specific to what the panel is
 * claiming: results land in order, an answer arrives a beat after its question,
 * a referral draws itself across to the person inside. The animation classes are
 * defined in globals.css, since they need keyframes and nth-child delays.
 *
 * Nothing is hidden until hover. A phone has no hover, so a panel that only
 * assembled itself on mouse-over would be a dead rectangle on the device most of
 * this page's traffic arrives on. Every animation ends where the panel already
 * rests.
 */

/** Fixed-height frame, so all six panels align across a row. */
function Panel({ children }: { children: ReactNode }) {
  return (
    <div
      aria-hidden
      className="flex h-[152px] flex-col overflow-hidden rounded-md border border-line bg-raised p-3 transition-colors duration-200 group-hover:border-line-strong"
    >
      {children}
    </div>
  );
}

/** A label/value row. The shared shape is most of what makes the panels read as one set. */
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

/**
 * A person. Initials rather than photographs, so nobody invented has a face.
 *
 * One line, not two. Stacking the name above the meta made the row 42px tall,
 * and three of those overflowed the fixed frame by 25px — which the frame then
 * clipped in silence. One line also matches Row's density, so a member list and
 * a result list read as the same family.
 */
function MemberRow({
  initials,
  name,
  meta,
}: {
  initials: string;
  name: string;
  meta: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded border border-line bg-surface px-2 py-1">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[9px] font-semibold text-accent">
        {initials}
      </span>
      <span className="truncate text-[12px] font-medium text-ink">{name}</span>
      <span className="ml-auto shrink-0 text-[10px] text-faint">{meta}</span>
    </div>
  );
}

function SearchPanel() {
  return (
    <Panel>
      {/*
        The query is the first beat, so the results read as answering it rather
        than as three rows that happen to be stacked.

        Two results, not three. A third row overflowed the fixed frame by 24px
        at 375px wide, and the frame clips silently — so it looked fine on a
        desktop and quietly ate a row on a phone.
      */}
      <div className="wyg-stagger flex flex-col gap-1.5">
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
        <span className="wyg-ask max-w-[88%] rounded-md rounded-tl-sm bg-bubble-in px-2.5 py-1.5 text-[12px] leading-[1.45] text-bubble-in-ink">
          Anyone done round 2 at Google recently?
        </span>

        <span className="wyg-reply ml-auto max-w-[88%] rounded-md rounded-tr-sm bg-bubble-out px-2.5 py-1.5 text-[12px] leading-[1.45] text-bubble-out-ink">
          System design. Say your tradeoffs out loud. That is what they score.
        </span>
      </div>
    </Panel>
  );
}

function ReferralPanel() {
  return (
    <Panel>
      <div className="flex flex-col gap-1.5">
        <div className="wyg-ask">
          <MemberRow initials="pr" name="@priya" meta="looking for a referral" />
        </div>

        {/* The line draws from the person asking to the person already inside. */}
        <div className="flex items-center gap-1.5 px-2 py-0.5">
          <span className="wyg-draw h-px flex-1 origin-left bg-accent" />
          <svg
            viewBox="0 0 24 24"
            className="wyg-arrow h-3 w-3 shrink-0 text-accent"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h13M13 7l5 5-5 5" />
          </svg>
        </div>

        <div className="wyg-reply">
          <MemberRow initials="ak" name="@akhil" meta="already at Zoho" />
        </div>
      </div>
    </Panel>
  );
}

function MembersPanel() {
  return (
    <Panel>
      <div className="wyg-pop-stagger flex flex-col gap-1.5">
        <MemberRow initials="pr" name="@priya" meta="Backend · Bengaluru" />
        <MemberRow initials="ak" name="@akhil" meta="Zoho · 3 yrs" />
        <MemberRow initials="sn" name="@sneha" meta="Data · Pune" />
      </div>
    </Panel>
  );
}

/**
 * Small pill switch. Decorative, so it is a span rather than an input — a real
 * checkbox here would be a control that does nothing, announced to a screen
 * reader as though it did.
 */
function Switch({ on, late = false }: { on: boolean; late?: boolean }) {
  return (
    <span
      className={`relative block h-3.5 w-6 shrink-0 rounded-full ${
        on ? "bg-accent" : "bg-line-strong"
      } ${on ? "wyg-track" : ""} ${on && late ? "wyg-track-late" : ""}`}
    >
      <span
        className={`absolute top-0.5 h-2.5 w-2.5 rounded-full bg-surface ${
          on ? "right-0.5" : "left-0.5"
        } ${on ? "wyg-knob" : ""} ${on && late ? "wyg-knob-late" : ""}`}
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
      <div className="wyg-stagger flex flex-col gap-1.5">
        {rows.map((row, index) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-2 rounded border border-line bg-surface px-2.5 py-2"
          >
            <span className="truncate text-[12px] text-ink">{row.label}</span>
            {/* Only the switches already on have anywhere to travel from. */}
            <Switch on={row.on} late={index === 1} />
          </div>
        ))}
      </div>
    </Panel>
  );
}

function ProfilePanel() {
  return (
    <Panel>
      {/* The person first, then what the room knows about them. Three beats. */}
      <div className="wyg-stagger flex flex-col gap-1.5">
        <div className="flex items-center gap-2.5 pb-1">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[13px] font-semibold text-accent">
            pr
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-[12px] font-semibold text-ink">@priya</span>
            <span className="truncate text-[11px] text-faint">Backend · Bengaluru</span>
          </span>
        </div>

        <Row left="Username" right="@priya" dim />
        <Row left="Phone number" right="never asked" dim />
      </div>
    </Panel>
  );
}

/**
 * The claims themselves, apart from the panels that illustrate them.
 *
 * Split out because the auth page makes three of these same six claims, and it
 * has to make them in the same words: someone clicks "Join the room" under one
 * of these headings and lands on the form still holding the sentence they just
 * read. Two copies of that sentence in two files is a promise kept by nobody —
 * this way the auth page cannot drift, because it has no copy of its own.
 */
export const CLAIMS = {
  findable: {
    title: "Openings stay findable",
    body: "Every post is searchable later. Nothing scrolls away at 2am while you are asleep.",
  },
  answered: {
    title: "Ask, and get answered",
    body: "Reply to any message, mention anyone, and find the answer again next week.",
  },
  referral: {
    title: "Ask for a referral",
    body: "Find who is already inside a company and ask them directly, instead of firing off one more cold application.",
  },
  people: {
    title: "People, not just posts",
    body: "See who else is here, what they work on, and who is actually worth asking.",
  },
  notifications: {
    title: "Notifications you control",
    body: "Mute the room and still get mentions. A live QnA will not blow up your phone any more.",
  },
  username: {
    title: "A username, not a number",
    body: "You join as a name you pick. There is no number to leak, because we never ask you for one.",
  },
} as const;

/**
 * Panels stay beside their claim rather than in the data, because each one is
 * bespoke markup anyway — a {claim, panel} array would just be a lookup table
 * with one entry per branch.
 *
 * Ordered as what you can do first, then how the room treats you.
 */
const CARDS = [
  { ...CLAIMS.findable, panel: <SearchPanel /> },
  { ...CLAIMS.answered, panel: <ReplyPanel /> },
  { ...CLAIMS.referral, panel: <ReferralPanel /> },
  { ...CLAIMS.people, panel: <MembersPanel /> },
  { ...CLAIMS.notifications, panel: <NotificationsPanel /> },
  { ...CLAIMS.username, panel: <ProfilePanel /> },
];

/**
 * `alt` selects the cell background, and it has to match the ground of the
 * section this sits in. The hairlines are the grid's own background showing
 * through a 1px gap, which means the cells must be opaque — so this cannot just
 * inherit, and a wrong value shows as panels floating on the wrong colour.
 */
export function WhatYouGet({ alt = false }: { alt?: boolean }) {
  return (
    <ul className="mt-10 grid gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-2">
      {CARDS.map((card) => (
        <li
          key={card.title}
          className={`wyg-card group flex flex-col p-6 transition-shadow hover:shadow-[inset_0_0_0_1px_var(--rv-accent)] motion-reduce:transition-none ${
            alt ? "bg-canvas-alt" : "bg-canvas"
          }`}
        >
          {card.panel}

          <h3 className="mt-5 font-display text-[16px] font-semibold text-ink">{card.title}</h3>
          <p className="mt-2 text-[15px] leading-[1.6] text-muted">{card.body}</p>
        </li>
      ))}
    </ul>
  );
}
