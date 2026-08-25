"use client";

import { useEffect, useState } from "react";

import { Tick } from "@/components/bubble-marks";
import { avatarColour, initials } from "@/lib/avatar";

/**
 * A rotating set of fake conversations for the landing page.
 *
 * Rendered from the same tokens and tick component as the real room rather than
 * screenshots, so it cannot drift out of date, works in light and dark, and
 * costs nothing to load. The whole panel is aria-hidden — it is illustration,
 * and the copy beside it already says everything it shows.
 *
 * Each scene shows a different thing the group is for, because one scene can
 * only argue one of them.
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
      body: "Anyone interviewed at Google recently? What did rounds 2 and 3 look like?",
      time: "9:41 am",
    },
    {
      from: "arjun",
      body: "3 rounds. DSA, then system design, then Googleyness. They reverted in 6 days.",
      time: "9:43 am",
      reaction: "🙏",
    },
    {
      body: "For round 2, do not just solve it — say your tradeoffs out loud. That is what they are scoring.",
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
      body: "Well earned. Post the rounds when you get a minute — it helps the next person.",
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
      from: "priya",
      body: "Same. See you at the farm.",
      time: "11:05 pm",
    },
    {
      body: "Both of you had interviews this week. That is the part that counts.",
      time: "11:09 pm",
      mine: true,
      read: true,
    },
  ],
];

const SCENE_MS = 7000;

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

export function ChatPreview() {
  const [scene, setScene] = useState(0);

  /**
   * Rotation is set up only when motion is welcome. Auto-advancing content is
   * exactly what prefers-reduced-motion covers, so the check gates whether the
   * interval exists at all rather than shortening it — and reading the media
   * query here keeps this out of the render path.
   */
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = window.setInterval(() => {
      setScene((current) => (current + 1) % SCENES.length);
    }, SCENE_MS);

    return () => window.clearInterval(timer);
  }, []);

  const lines = SCENES[scene];

  return (
    <div
      aria-hidden
      className="w-full overflow-hidden rounded-2xl border border-line bg-surface shadow-xl"
    >
      <div className="flex items-center gap-2.5 border-b border-line bg-surface px-3.5 py-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-accent-ink">
          MA
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-[13px] font-semibold text-ink">Mini Anon Hub</span>
          <span className="truncate text-[11px] text-muted">2,041 members · 96 online</span>
        </span>
      </div>

      {/*
        Keyed by scene so React remounts the lines and the entry animations
        restart. Without the key the nodes persist and only the text swaps,
        which reads as a glitch rather than a new conversation.
      */}
      <div
        key={scene}
        className="chat-pattern relative flex min-h-[13.5rem] flex-col justify-end gap-2 px-3.5 py-4"
      >
        {lines.map((line, index) => (
          <div
            key={index}
            className="chat-line"
            style={{ animationDelay: `${0.2 + index * 0.7}s` }}
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
