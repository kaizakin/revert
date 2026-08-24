import Link from "next/link";
import { auth } from "@clerk/nextjs/server";

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
    body: "Mute any room. During a live session only the host and mentions of you will notify you.",
  },
  {
    title: "Profiles you can trust",
    body: "GitHub and LeetCode verified by login, not by pasting a link anyone could fake.",
  },
];

export default async function LandingPage() {
  // <SignedIn>/<SignedOut> were removed in Clerk Core 3. This is a server
  // component, so reading the session directly is simpler anyway.
  const { userId } = await auth();
  const signedIn = Boolean(userId);

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between px-6 py-5">
        <span className="text-lg font-semibold tracking-tight">Revert</span>
        <nav className="flex items-center gap-3 text-sm">
          {signedIn ? (
            <Link
              href="/rooms/general"
              className="rounded-md bg-black px-3.5 py-2 font-medium text-white dark:bg-white dark:text-black"
            >
              Open Revert
            </Link>
          ) : (
            <>
              <Link href="/sign-in" className="text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white">
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="rounded-md bg-black px-3.5 py-2 font-medium text-white dark:bg-white dark:text-black"
              >
                Join
              </Link>
            </>
          )}
        </nav>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
        <div className="flex w-full max-w-2xl flex-col gap-6">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            The professional network for people who don&apos;t have one.
          </h1>

          <p className="max-w-xl text-base leading-relaxed text-black/60 dark:text-white/60">
            Job hunting runs on WhatsApp groups that leak your phone number to thousands of
            strangers and lose every good opening in twenty minutes. Revert is chat, job
            openings and referrals — where you are a username, not a number.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            {signedIn ? (
              <Link
                href="/rooms/general"
                className="rounded-md bg-black px-5 py-3 text-sm font-medium text-white dark:bg-white dark:text-black"
              >
                Open Revert
              </Link>
            ) : (
              <>
                <Link
                  href="/sign-up"
                  className="rounded-md bg-black px-5 py-3 text-sm font-medium text-white dark:bg-white dark:text-black"
                >
                  Join with an invite code
                </Link>
                <Link
                  href="/sign-in"
                  className="rounded-md border border-black/15 px-5 py-3 text-sm font-medium dark:border-white/20"
                >
                  I already have an account
                </Link>
              </>
            )}
          </div>

          <p className="text-xs text-black/45 dark:text-white/45">
            Invite-only while we are small.
          </p>
        </div>

        <ul className="mt-20 grid w-full max-w-2xl gap-8 sm:grid-cols-2">
          {REASONS.map((reason) => (
            <li key={reason.title} className="flex flex-col gap-1.5">
              <h2 className="text-sm font-medium">{reason.title}</h2>
              <p className="text-sm leading-relaxed text-black/55 dark:text-white/55">
                {reason.body}
              </p>
            </li>
          ))}
        </ul>
      </main>

      <footer className="px-6 py-8 text-xs text-black/45 dark:text-white/45">
        Revert — by minianon. Messages are private, not end-to-end encrypted; reports get
        read and acted on.
      </footer>
    </div>
  );
}
