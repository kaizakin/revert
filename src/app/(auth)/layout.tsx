import Link from "next/link";

import { AuthCard } from "@/components/auth-card";
import { LogoMark } from "@/components/logo";
import { BackButton } from "@/components/back-button";

/**
 * The same three claims the landing page makes, in the same words.
 *
 * These used to lead on the phone number, which the landing page dropped once
 * it was clear the source is a WhatsApp *channel*: a channel already hides a
 * follower's number, so it was never the difference. Someone clicks "Join the
 * room" under "Now you can reply" and arrives here — the moment they are
 * deciding whether to trust the form is the worst place for the two pages to
 * disagree about what this is.
 */
const FEATURES = [
  {
    title: "Ask, and get answered",
    body: "Reply to any message, mention anyone, and find the answer again next week.",
    icon: (
      <>
        <path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6l7-3z" />
        <path d="M9.5 12.5l1.8 1.8 3.4-3.6" />
      </>
    ),
  },
  {
    title: "Openings stay findable",
    body: "Every post is searchable later. Nothing scrolls away at 2am while you are asleep.",
    icon: (
      <>
        <circle cx="11" cy="11" r="6.5" />
        <path d="M16 16l4.5 4.5" />
      </>
    ),
  },
  {
    title: "A username, not a number",
    body: "You join as a name you pick. There is no number to leak, because we never ask you for one.",
    icon: (
      <>
        <path d="M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6z" />
        <path d="M10 19a2 2 0 004 0" />
      </>
    ),
  },
];

/**
 * Shared shell for sign-in and sign-up.
 *
 * Both routes live in this layout, so moving between them does not re-render
 * the whole page — the branding column stays mounted and only the card swaps.
 * The flip in AuthCard is then a deliberate transition between two cards
 * rather than an animation papering over a full reload.
 */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-line bg-surface px-12 py-10 lg:flex lg:w-[46%]">
        {/* Soft glow, purely decorative. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 top-1/3 h-96 w-96 rounded-full opacity-[0.07] blur-3xl"
          style={{ background: "var(--rv-accent)" }}
        />

        <Link href="/" className="relative flex items-center gap-2.5">
          <LogoMark size={36} />
          <span className="text-lg font-semibold tracking-tight text-ink">Revert</span>
        </Link>

        <div className="relative flex flex-col gap-10">
          <div className="flex flex-col gap-5">
            <span className="w-fit rounded-full border border-line bg-canvas px-3 py-1 text-[12px] font-medium text-muted">
              by{" "}
              <a
                href="https://link.minianon.in/tusharbhardwaj"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-ink underline decoration-line underline-offset-2 transition-colors hover:decoration-ink"
              >
                minianon
              </a>
            </span>

            {/*
              The headline the visitor just clicked, in the display face the
              rest of the product uses. Tracking is looser than the landing
              page's 52px setting because "alerts" carries an "rt", the tightest
              pair in Space Grotesk, and it closes up at smaller sizes.
            */}
            <h1 className="font-display text-4xl font-normal leading-[1.1] tracking-[-0.02em] text-ink">
              Same alerts.
              <br />
              <span className="text-accent">Now you can reply.</span>
            </h1>
          </div>

          <ul className="flex flex-col gap-5">
            {FEATURES.map((feature) => (
              <li key={feature.title} className="flex items-start gap-3.5">
                <span
                  aria-hidden
                  className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-line bg-canvas text-accent"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-[18px] w-[18px]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {feature.icon}
                  </svg>
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="text-[14px] font-semibold text-ink">{feature.title}</span>
                  <span className="text-[13px] leading-relaxed text-muted">{feature.body}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-[12px] text-faint">
          © 2026{" "}
          <a
            href="https://link.minianon.in/tusharbhardwaj"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-muted underline underline-offset-2 transition-colors hover:text-ink"
          >
            minianon
          </a>{" "}
          · Revert
        </p>
      </aside>

      <main className="relative flex flex-1 flex-col px-6 py-8">
        <div className="flex items-center justify-between">
          <BackButton />
          {/* Wordmark on small screens, where the branding column is hidden. */}
          <Link href="/" className="text-base font-semibold tracking-tight text-ink lg:hidden">
            Revert
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center py-10">
          <AuthCard>{children}</AuthCard>
        </div>
      </main>
    </div>
  );
}
