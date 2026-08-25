import Link from "next/link";
import { auth } from "@clerk/nextjs/server";

import { ChatPreview } from "./chat-preview";

/**
 * Written for someone arriving from the WhatsApp group.
 *
 * They already trust minianon and already live the problem, so the page does
 * not argue that job hunting is hard — it answers what this is, whether it is
 * safe, and how to get in. The previous version spent its best screen space
 * explaining the problem back to the people who know it best.
 */

const TOPMATE_URL = "https://link.minianon.in/tusharbhardwaj";
const GROUP_URL = "https://whatsapp.com/channel/0029Vb67tYF0rGiSuzXcHw2C";

const POINTS = [
  {
    title: "No phone numbers",
    body: "You join as a username. Nobody in the group can see your number, because we never ask for it.",
    icon: (
      <>
        <path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6l7-3z" />
        <path d="M9.5 12.5l1.8 1.8 3.4-3.6" />
      </>
    ),
  },
  {
    title: "Openings stay findable",
    body: "Every job post is searchable later. Nothing scrolls away at 2am while you are asleep.",
    icon: (
      <>
        <circle cx="11" cy="11" r="6.5" />
        <path d="M16 16l4.5 4.5" />
      </>
    ),
  },
  {
    title: "Notifications you control",
    body: "Mute the room and still get mentions. A live QnA will not blow up your phone any more.",
    icon: (
      <>
        <path d="M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6z" />
        <path d="M10 19a2 2 0 004 0" />
      </>
    ),
  },
  {
    title: "Ask and get answered",
    body: "Reply to any message, tag anyone, and find the answer again next week.",
    icon: (
      <>
        <path d="M21 12a8 8 0 01-11.6 7.1L4 21l1.9-5.4A8 8 0 1121 12z" />
      </>
    ),
  },
];

export default async function LandingPage() {
  const { userId } = await auth();
  const signedIn = Boolean(userId);

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b border-line bg-canvas/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-3.5">
          <span className="flex items-center gap-2">
            <span
              aria-hidden
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-[13px] font-bold text-accent-ink"
            >
              R
            </span>
            <span className="text-[15px] font-semibold tracking-tight text-ink">Revert</span>
          </span>

          <nav className="flex items-center gap-1 text-sm">
            {signedIn ? (
              <Link
                href="/chat/hub"
                className="rounded-lg bg-accent px-4 py-2 font-semibold text-accent-ink transition-opacity hover:opacity-90"
              >
                Open Revert
              </Link>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="rounded-lg px-3 py-2 text-muted transition-colors hover:text-ink"
                >
                  Sign in
                </Link>
                <Link
                  href="/sign-up"
                  className="rounded-lg bg-accent px-4 py-2 font-semibold text-accent-ink transition-opacity hover:opacity-90"
                >
                  Join
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6">
        <section className="grid items-center gap-10 py-14 lg:grid-cols-[1fr_minmax(0,26rem)] lg:gap-14 lg:py-20">
          <div className="flex flex-col gap-5">
            <span className="w-fit rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-muted">
              by{" "}
              <a
                href={TOPMATE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-ink underline decoration-line underline-offset-2 transition-colors hover:decoration-ink"
              >
                minianon
              </a>{" "}
              · for the{" "}
              <a
                href={GROUP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-ink underline decoration-line underline-offset-2 transition-colors hover:decoration-ink"
              >
                job alerts group
              </a>
            </span>

            <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight text-ink sm:text-5xl">
              Our group,
              <br />
              <span className="text-accent">without your number.</span>
            </h1>

            <p className="max-w-lg text-[17px] leading-relaxed text-muted">
              Same job alerts, same people, same questions answered. Except you join as a
              username, the openings stay searchable, and you decide what is allowed to
              notify you.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              {signedIn ? (
                <Link
                  href="/chat/hub"
                  className="rounded-lg bg-accent px-6 py-3.5 text-sm font-semibold text-accent-ink transition-opacity hover:opacity-90"
                >
                  Open Revert
                </Link>
              ) : (
                <>
                  <Link
                    href="/sign-up"
                    className="rounded-lg bg-accent px-6 py-3.5 text-sm font-semibold text-accent-ink transition-opacity hover:opacity-90"
                  >
                    Join the group
                  </Link>
                  <Link
                    href="/sign-in"
                    className="rounded-lg border border-line bg-surface px-6 py-3.5 text-sm font-semibold text-ink transition-colors hover:border-line-strong"
                  >
                    I already joined
                  </Link>
                </>
              )}
            </div>

            <p className="text-xs text-faint">
              Takes about twenty seconds. Google or email — no phone number, ever.
            </p>
          </div>

          <ChatPreview />
        </section>

        <section className="border-t border-line py-14">
          <ul className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
            {POINTS.map((point) => (
              <li key={point.title} className="flex items-start gap-3.5">
                <span
                  aria-hidden
                  className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-accent"
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
                    {point.icon}
                  </svg>
                </span>
                <span className="flex flex-col gap-1">
                  <span className="text-[15px] font-semibold text-ink">{point.title}</span>
                  <span className="text-sm leading-relaxed text-muted">{point.body}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/*
          The one objection worth answering head on. Someone leaving a WhatsApp
          group they have used for months wants to know what happens to it, and
          an unanswered doubt is what stops a signup.
        */}
        <section className="border-t border-line py-14">
          <div className="flex max-w-2xl flex-col gap-3">
            <h2 className="text-lg font-semibold tracking-tight text-ink">
              Is the WhatsApp group going away?
            </h2>
            <p className="text-sm leading-relaxed text-muted">
              No. The{" "}
              <a
                href={GROUP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-ink underline underline-offset-2 hover:text-accent"
              >
                WhatsApp group
              </a>{" "}
              stays exactly where it is. Revert is where the openings stay searchable
              and where you can ask something without handing your number to two thousand
              people. Use both, or use whichever one you like — nothing is being taken away.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto w-full max-w-5xl px-6 py-10">
          <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
            <div className="flex max-w-xs flex-col gap-2.5">
              <span className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-[13px] font-bold text-accent-ink"
                >
                  R
                </span>
                <span className="text-[15px] font-semibold tracking-tight text-ink">
                  Revert
                </span>
              </span>
              <p className="text-[13px] leading-relaxed text-muted">
                Job alerts, questions and referrals — where you are a username, not a phone
                number.
              </p>
            </div>

            <nav className="flex flex-col gap-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-faint">
                Elsewhere
              </span>

              <a
                href={GROUP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-fit items-center gap-2 text-[13px] text-muted transition-colors hover:text-ink"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden>
                  <path
                    d="M20 11.9a8 8 0 01-11.9 7L4 20l1.2-4A8 8 0 1120 11.9z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinejoin="round"
                  />
                </svg>
                Job alerts group
              </a>

              <a
                href={TOPMATE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-fit items-center gap-2 text-[13px] text-muted transition-colors hover:text-ink"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden>
                  <circle cx="12" cy="8.5" r="3.6" fill="none" stroke="currentColor" strokeWidth="1.7" />
                  <path
                    d="M4.5 20c0-4.1 3.4-7.5 7.5-7.5s7.5 3.4 7.5 7.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  />
                </svg>
                Book time with minianon
              </a>

              <Link
                href="/sign-in"
                className="flex w-fit items-center gap-2 text-[13px] text-muted transition-colors hover:text-ink"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden>
                  <path
                    d="M10 17l5-5-5-5M15 12H3M13 3h6a2 2 0 012 2v14a2 2 0 01-2 2h-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Sign in
              </Link>
            </nav>
          </div>

          <div className="mt-8 flex flex-col gap-3 border-t border-line pt-6">
            {/*
              Kept in the footer rather than buried in a policy page: it is the
              one thing about Revert that could otherwise be assumed wrongly,
              and the promise is privacy.
            */}
            <p className="max-w-2xl text-[11.5px] leading-relaxed text-faint">
              Messages are private, not end-to-end encrypted. Reports get read and acted on,
              because a job community without moderation fills up with fake recruiters fast.
            </p>

            <p className="text-[11.5px] text-faint">
              © 2026 Revert · built by{" "}
              <a
                href={TOPMATE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 transition-colors hover:text-ink"
              >
                minianon
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
