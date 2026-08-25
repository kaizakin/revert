import { Tick } from "@/components/bubble-marks";
import { avatarColour, initials } from "@/lib/avatar";

/**
 * A fake conversation for the landing page.
 *
 * Rendered from the same tokens and tick component as the real room rather than
 * a screenshot, so it cannot drift out of date, it works in light and dark, and
 * it costs nothing to load. It is decorative — hidden from screen readers,
 * which get the surrounding copy instead.
 */

type Line = {
  from?: string;
  body: string;
  time: string;
  mine?: boolean;
  read?: boolean;
  reaction?: string;
};

const LINES: Line[] = [
  {
    from: "priya",
    body: "Anyone here interviewed at Zoho recently? What did rounds 2 and 3 look like?",
    time: "9:41 am",
  },
  {
    from: "arjun",
    body: "3 rounds. DSA, then system design, then culture. They reverted in 4 days.",
    time: "9:43 am",
    reaction: "🙏",
  },
  {
    body: "For round 2, do not just solve it — say your tradeoffs out loud. That is what they are actually scoring.",
    time: "9:46 am",
    mine: true,
    read: true,
  },
];

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
          {!mine && (
            <p className="mb-px text-[12px] font-semibold text-mention">@{line.from}</p>
          )}

          <p className="text-[13.5px] leading-[1.35]">{line.body}</p>

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

      <div className="chat-pattern relative flex flex-col gap-2 px-3.5 py-4">
        {LINES.map((line, index) => (
          <div
            key={index}
            className="chat-line"
            /* Each line waits its turn, so the panel plays as a conversation. */
            style={{ animationDelay: `${0.25 + index * 0.9}s` }}
          >
            <Bubble line={line} />
          </div>
        ))}

        {/* Sits where the reply will land and fades out as it arrives. */}
        <div className="chat-typing pointer-events-none absolute bottom-4 right-3.5 flex items-center gap-1 rounded-lg bg-bubble-out px-2.5 py-2 shadow-sm">
          {[0, 1, 2].map((dot) => (
            <span
              key={dot}
              className="chat-dot h-1.5 w-1.5 rounded-full bg-bubble-out-ink"
              style={{ animationDelay: `${dot * 0.15}s` }}
            />
          ))}
        </div>
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
