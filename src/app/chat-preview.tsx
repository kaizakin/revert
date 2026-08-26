"use client";

import { useEffect, useState } from "react";

import { Avatar } from "@/components/avatar";
import { Tick } from "@/components/bubble-marks";
import { avatarColour, initials } from "@/lib/avatar";

/**
 * A deck of fake conversations for the landing page.
 *
 * Rendered from the same tokens and tick component as the real room rather than
 * screenshots, so it cannot drift out of date, works in light and dark, and
 * costs nothing to load. The whole panel is aria-hidden — it is illustration,
 * and the copy beside it already says everything it shows.
 *
 * Each scene shows a different thing the group is for, because one scene can
 * only argue one of them. They are stacked like cards: the live one is on top,
 * the next two peek out below it, and when a scene ends its card drops to the
 * back of the deck and the one behind comes forward.
 */

type Line = {
  from?: string;
  body: string;
  time: string;
  mine?: boolean;
  read?: boolean;
  reaction?: string;
  /** Structured job post, rendered as label/value rows with a link. */
  job?: { company: string; role: string; batch: string; url: string };
};

const SCENES: Line[][] = [
  // Guidance — the reason someone joins rather than following a job board.
  [
    {
      from: "priya",
      body: "Anyone interviewed at Google recently? How is round 2?",
      time: "9:41 am",
      reaction: "🙏",
    },
    {
      body: "System design. Say your tradeoffs out loud. That is what they score.",
      time: "9:46 am",
      mine: true,
      read: true,
    },
  ],

  // Job alert — the thing the WhatsApp group already does, except findable.
  [
    {
      body: "",
      time: "10:12 am",
      mine: true,
      read: true,
      job: {
        company: "Amazon",
        role: "Software Engineering Intern",
        batch: "2027",
        url: "amazon.jobs/en/jobs/10506481",
      },
    },
    {
      from: "neha",
      body: "Applied. Thank you 🙏",
      time: "10:14 am",
    },
  ],

  // Referrals — the thing no job board can replicate.
  [
    {
      from: "rahul",
      body: "I have 3 referral slots at Flipkart this quarter. Backend, 1 to 3 years.",
      time: "4:02 pm",
      reaction: "🔥",
    },
    {
      from: "sana",
      body: "Sending my resume now. 2 years on Java and Spring.",
      time: "4:04 pm",
    },
  ],

  // Outcomes — proof that the room works.
  [
    {
      from: "vikram",
      body: "Got the offer 🎉 The mock interview last week is what saved me on system design.",
      time: "6:20 pm",
      reaction: "🎉",
    },
    {
      body: "Well earned. Post the rounds when you get a minute. It helps the next person.",
      time: "6:22 pm",
      mine: true,
      read: true,
    },
  ],

  // Shared knowledge — searchable later, which WhatsApp cannot do.
  [
    {
      from: "aisha",
      body: "Zeta interview experience: 4 rounds, 2 DSA, 1 low level design, 1 hiring manager.",
      time: "8:15 pm",
      reaction: "👍",
    },
    {
      from: "kiran",
      body: "Searched this before my call yesterday. Exactly matched.",
      time: "8:31 pm",
    },
  ],

  // Just people, being people.
  [
    {
      from: "dev",
      body: "4 rejections this week. Considering a career in farming 🌾",
      time: "11:04 pm",
      reaction: "😂",
    },
    {
      body: "You had 4 interviews this week. That is the part that counts.",
      time: "11:09 pm",
      mine: true,
      read: true,
    },
  ],
];

/**
 * Scene timing, derived rather than picked.
 *
 * It used to be a flat 11s with no relationship to the animation it was waiting
 * on: the second bubble lands at 2.3s, so the panel then sat still for nearly
 * nine seconds. Most of every scene was dead air, which is what made a short
 * animation feel like a long wait.
 *
 * Now the scene is exactly as long as the conversation takes to arrive plus a
 * dwell to read it, so changing the stagger cannot silently reopen that gap.
 */
const FIRST_DELAY_MS = 150;

/** Between one bubble and the next. This spacing is what makes it read as talk. */
const LINE_STAGGER_MS = 1250;

/** Must match the .chat-line duration in globals.css. */
const ENTRY_MS = 900;

/** Reading time once the last bubble has landed. These are two short messages. */
const DWELL_MS = 3200;

const LONGEST_SCENE = Math.max(...SCENES.map((lines) => lines.length));

const SCENE_MS =
  FIRST_DELAY_MS + (LONGEST_SCENE - 1) * LINE_STAGGER_MS + ENTRY_MS + DWELL_MS;

function JobCard({ job }: { job: NonNullable<Line["job"]> }) {
  return (
    <span className="flex flex-col gap-0.5 text-[13px] leading-[1.4]">
      {[
        ["Company", job.company],
        ["Role", job.role],
        ["Batch", job.batch],
      ].map(([label, value]) => (
        <span key={label}>
          <span className="opacity-60">{label}: </span>
          <span className="font-medium">{value}</span>
        </span>
      ))}
      <span className="mt-1 truncate text-mention underline underline-offset-2">{job.url}</span>
    </span>
  );
}

function Bubble({ line }: { line: Line }) {
  const mine = Boolean(line.mine);

  return (
    <div className={`flex items-start gap-2 ${mine ? "justify-end" : "justify-start"}`}>
      {!mine && (
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
          style={{ backgroundColor: avatarColour(line.from ?? "") }}
        >
          {initials(line.from ?? "?")}
        </span>
      )}

      <div className="relative flex max-w-[78%] flex-col">
        <div
          className={`px-2.5 pt-1.5 ${line.reaction ? "pb-3.5" : "pb-1.5"} shadow-sm ${
            mine ? "bg-bubble-out text-bubble-out-ink" : "bg-bubble-in text-bubble-in-ink"
          }`}
          style={{ borderRadius: mine ? "8px 0 8px 8px" : "0 8px 8px 8px" }}
        >
          {!mine && <p className="mb-px text-[12px] font-semibold text-mention">@{line.from}</p>}

          {line.job ? (
            <JobCard job={line.job} />
          ) : (
            <p className="text-[13.5px] leading-[1.35]">{line.body}</p>
          )}

          <span className="mt-0.5 flex items-center justify-end gap-1 text-[10px] leading-none text-bubble-meta">
            {line.time}
            {mine && <Tick state={line.read ? "read" : "sent"} />}
          </span>
        </div>

        {line.reaction && (
          <div className={`relative z-10 -mt-2.5 flex ${mine ? "justify-end pr-2" : "pl-2"}`}>
            <span className="rounded-full bg-raised px-1.5 py-px text-[11px] shadow-sm ring-1 ring-line">
              {line.reaction}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * One panel, and it never moves.
 *
 * This was a deck: six of these stacked with a 20px offset and a slight shrink,
 * rotating one to the back every scene. A deck needs an offset that is large
 * next to the card, and this card is not far off 300px tall — so after the
 * shrink ate into the offset, the cards behind showed as a few pixels of
 * ghosted duplicate edge with five shadows piling up along it. The geometry was
 * never going to read as a deck at this size, and the whole panel shifting
 * every eleven seconds pulled attention off the headline beside it.
 *
 * So the room holds still and the conversation in it changes. That is also
 * closer to what is true: this is one room where different things get asked,
 * not six separate cards.
 */
function ScenePanel({
  lines,
  /** Bumped when the conversation changes, to replay the bubbles. */
  turn,
}: {
  lines: Line[];
  turn: number;
}) {
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-line bg-surface shadow-xl">
      <div className="flex items-center gap-2.5 border-b border-line bg-surface px-3.5 py-2.5">
        <Avatar src="/groups/mini-anon-hub.jpeg" name="Mini Anon Hub" size={32} priority />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-[13px] font-semibold text-ink">Mini Anon Hub</span>
          <span className="truncate text-[11px] text-muted">2,041 members · 96 online</span>
        </span>
      </div>

      {/*
        Keyed on the turn, so React remounts the lines and their entry
        animations restart with every new conversation.

        The height is fixed and the lines sit at the bottom, which is what lets
        the panel hold still: every scene is two lines, but even if one were not,
        the room would not resize under the reader.

        The delays come from the same constants the scene length is derived
        from, so the wait between scenes always ends a fixed dwell after the last
        bubble rather than whenever a hardcoded number said so.
      */}
      <div
        key={turn}
        className="chat-pattern relative flex h-[13.5rem] flex-col justify-end gap-2 overflow-hidden px-3.5 py-4"
      >
        {lines.map((line, index) => (
          <div
            key={index}
            className="chat-line"
            style={{
              animationDelay: `${FIRST_DELAY_MS + index * LINE_STAGGER_MS}ms`,
            }}
          >
            <Bubble line={line} />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 border-t border-line bg-surface px-3.5 py-2.5">
        <span className="flex-1 rounded-lg bg-raised px-3 py-2 text-[12.5px] text-faint">
          Type a message
        </span>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-ink">
          <svg viewBox="0 0 24 24" className="h-4 w-4">
            <path d="M3.4 20.4 21 12 3.4 3.6 3.4 10l12 2-12 2z" fill="currentColor" />
          </svg>
        </span>
      </div>
    </div>
  );
}

export function ChatPreview() {
  /**
   * Counts forward forever rather than wrapping, so it can key the lines and
   * replay their entry on every change. A wrapped index cannot tell the first
   * pass from the fourth, so React would reuse the same nodes and the bubbles
   * would never animate again.
   */
  const [turn, setTurn] = useState(0);

  /**
   * The rotation exists only when motion is welcome. Content that advances by
   * itself is exactly what prefers-reduced-motion covers, so the check gates
   * whether the interval is created at all rather than shortening it — and
   * reading the media query here keeps it out of the render path.
   */
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = window.setInterval(() => {
      setTurn((current) => current + 1);
    }, SCENE_MS);

    return () => window.clearInterval(timer);
  }, []);

  return (
    /*
      pointer-events-none because this is illustration: it should not swallow a
      click meant for anything around it.
    */
    <div aria-hidden className="pointer-events-none w-full">
      <ScenePanel lines={SCENES[turn % SCENES.length]} turn={turn} />
    </div>
  );
}
