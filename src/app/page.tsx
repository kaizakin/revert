import Link from "next/link";
import { auth } from "@clerk/nextjs/server";

const PROBLEMS = [
  "Joining a group hands your phone number to thousands of strangers.",
  "The best opening of the week scrolls away before most people wake up.",
  "One QnA session notifies everybody, so people mute the group and miss the jobs too.",
  "Applications disappear into a void, and nobody tells you why.",
];

const REASONS = [
  {
    title: "Your number stays yours",
    body: "You are a username here. Nobody sees your phone number, because we never ask for it.",
  },
  {
    title: "Job posts that do not vanish",
    body: "Openings stay searchable and filterable instead of scrolling away in twenty minutes.",
  },
  {
    title: "Quiet by default",
    body: "Mute any room. During a live session only the host and mentions of you can notify you.",
  },
  {
    title: "Profiles worth reading",
    body: "GitHub, LeetCode and LinkedIn on every profile, so you know who you are talking to.",
  },
];

export default async function LandingPage() {
  // <SignedIn>/<SignedOut> were removed in Clerk Core 3, and this is a server
  // component, so reading the session directly is simpler anyway.
  const { userId } = await auth();
  const signedIn = Boolean(userId);

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b border-line bg-canvas/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
          <span className="text-base font-semibold tracking-tight text-ink">Revert</span>

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
        <section className="flex flex-col gap-7 py-20 sm:py-28">
          <span className="w-fit rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-muted">
            by minianon
          </span>

          <h1 className="max-w-3xl text-4xl font-semibold leading-[1.08] tracking-tight text-ink sm:text-6xl">
            The professional network for people who don&apos;t have one.
          </h1>

          <p className="max-w-xl text-lg leading-relaxed text-muted">
            Chat, job openings and real referrals — where you are a username, not a phone
            number.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
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
                  Create your account
                </Link>
                <Link
                  href="/sign-in"
                  className="rounded-lg border border-line bg-surface px-6 py-3.5 text-sm font-semibold text-ink transition-colors hover:border-line-strong"
                >
                  I already have one
                </Link>
              </>
            )}
          </div>
        </section>

        <section className="border-t border-line py-16">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-faint">
            The problem
          </h2>
          <ul className="mt-6 flex max-w-2xl flex-col gap-3">
            {PROBLEMS.map((problem) => (
              <li key={problem} className="flex gap-3 text-base leading-relaxed text-ink">
                <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                {problem}
              </li>
            ))}
          </ul>
          <p className="mt-6 max-w-2xl text-base text-muted">
            Every part of this is fixable. None of it is fixable inside a WhatsApp group.
          </p>
        </section>

        <section className="border-t border-line py-16">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-faint">
            What Revert does differently
          </h2>
          <ul className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2">
            {REASONS.map((reason) => (
              <li key={reason.title} className="flex flex-col gap-2">
                <h3 className="text-base font-semibold text-ink">{reason.title}</h3>
                <p className="text-sm leading-relaxed text-muted">{reason.body}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto w-full max-w-5xl px-6 py-8">
          <p className="max-w-2xl text-xs leading-relaxed text-faint">
            Revert — by minianon. Messages are private, not end-to-end encrypted: reports
            get read and acted on, because a job community without moderation fills up with
            fake recruiters fast.
          </p>
        </div>
      </footer>
    </div>
  );
}
