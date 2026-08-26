import Link from "next/link";

import { AuthCard } from "@/components/auth-card";
import { Highlighted } from "@/components/highlighted";
import { LogoMark } from "@/components/logo";
import { BackButton } from "@/components/back-button";

import { CLAIMS } from "@/app/what-you-get";

/**
 * All six claims the landing page makes, in the same words and the same order.
 *
 * The words come from CLAIMS rather than being retyped here, so they cannot
 * drift: someone clicks "Join the room" under one of these headings and arrives
 * holding the sentence they just read, and the moment they are deciding whether
 * to trust the form is the worst place for the two pages to disagree about what
 * this is.
 *
 * Titles only, no body copy. Three claims with a paragraph each and six claims
 * with none both fit this column; six claims with paragraphs do not, and the
 * overflow would push the sign-in form itself below the fold on a 720px screen.
 * Beside a form the shorter list is also the better read — nobody halfway
 * through typing a username is reading paragraphs, they are checking what they
 * are joining. The paragraphs are a scroll away on the page they came from.
 *
 * The icons carry what the panels carry on the landing page, so each has to be
 * the right one: the shield belongs to the claim about being protected, and the
 * bell to notifications — it was previously sitting on the username claim, a
 * bell against the one promise on the page about nothing leaking.
 */
const FEATURES = [
  {
    ...CLAIMS.findable,
    icon: (
      <>
        <circle cx="11" cy="11" r="6.5" />
        <path d="M16 16l4.5 4.5" />
      </>
    ),
  },
  {
    ...CLAIMS.answered,
    icon: <path d="M21 12a8 8 0 01-11.6 7.1L4 21l1.9-5.4A8 8 0 1121 12z" />,
  },
  {
    ...CLAIMS.referral,
    icon: (
      <>
        <circle cx="8" cy="8.5" r="3" />
        <path d="M3 19c0-2.8 2.2-5 5-5" />
        <path d="M13 15.5h6M16.5 12.5l3 3-3 3" />
      </>
    ),
  },
  {
    ...CLAIMS.people,
    icon: (
      <>
        <circle cx="9" cy="9" r="3.2" />
        <path d="M3.5 19c0-3 2.5-5.5 5.5-5.5s5.5 2.5 5.5 5.5" />
        <path d="M16 6.8a3.2 3.2 0 010 5.9M20.5 19c0-2.2-.9-4.2-2.4-5.4" />
      </>
    ),
  },
  {
    ...CLAIMS.notifications,
    icon: (
      <>
        <path d="M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6z" />
        <path d="M10 19a2 2 0 004 0" />
      </>
    ),
  },
  {
    ...CLAIMS.username,
    icon: (
      <>
        <path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6l7-3z" />
        <path d="M9.5 12.5l1.8 1.8 3.4-3.6" />
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
            {/* The accent eyebrow the landing page puts above every heading. */}
            <p className="text-[13px] font-medium uppercase tracking-[0.07em] text-accent">
              By{" "}
              <a
                href="https://link.minianon.in/tusharbhardwaj"
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-accent/40 underline-offset-2 transition-colors hover:text-ink"
              >
                minianon
              </a>{" "}
              · for my community 💚
            </p>

            {/*
              The headline the visitor just clicked, set exactly as the hero
              sets it at this size. The hero's own note calls -0.01em at 38px a
              measured floor for these words — "alerts" carries an "rt", the
              tightest pair in Space Grotesk — and this was running -0.02em at
              36px, which is past it. Same words, same face, same size: there
              was nothing for the two screens to disagree about.
            */}
            <h1 className="font-display text-[38px] font-normal leading-[1.1] tracking-[-0.01em] text-ink">
              Same alerts.
              <br />
              <Highlighted>Now you can reply.</Highlighted>
            </h1>
          </div>

          {/*
            The bordered field the landing page uses for a set of things, rather
            than three items floating in a column. Hairlines are the grid's own
            background showing through a 1px gap, so the cells have to be opaque
            and match this column's surface.
          */}
          <ul className="grid gap-px overflow-hidden rounded-md border border-line bg-line">
            {FEATURES.map((feature) => (
              <li
                key={feature.title}
                className="group flex items-center gap-3 bg-surface px-5 py-3.5 transition-shadow hover:shadow-[inset_0_0_0_1px_var(--rv-accent)] motion-reduce:transition-none"
              >
                {/*
                  Same tile as a landing panel, down to the border lifting on
                  hover — it stands in for one, so it should answer to the
                  pointer the way one does.
                */}
                <span
                  aria-hidden
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line bg-raised text-accent transition-colors duration-200 group-hover:border-line-strong"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {feature.icon}
                  </svg>
                </span>

                <span className="font-display text-[16px] font-semibold text-ink">
                  {feature.title}
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
