import Link from "next/link";

import { AuthCard } from "@/components/auth-card";
import { BackButton } from "@/components/back-button";

const FEATURES = [
  {
    title: "Private by default",
    body: "Your phone number is never shared, because we never ask for it.",
    icon: (
      <>
        <path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6l7-3z" />
        <path d="M9.5 12.5l1.8 1.8 3.4-3.6" />
      </>
    ),
  },
  {
    title: "Jobs that stay findable",
    body: "Openings stay searchable instead of scrolling away in twenty minutes.",
    icon: (
      <>
        <circle cx="11" cy="11" r="6.5" />
        <path d="M16 16l4.5 4.5" />
      </>
    ),
  },
  {
    title: "Quiet when you need it",
    body: "Mute any room. During a session only the host and mentions reach you.",
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
          <span
            aria-hidden
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-[15px] font-bold text-accent-ink"
          >
            R
          </span>
          <span className="text-lg font-semibold tracking-tight text-ink">Revert</span>
        </Link>

        <div className="relative flex flex-col gap-10">
          <div className="flex flex-col gap-5">
            <span className="w-fit rounded-full border border-line bg-canvas px-3 py-1 text-[12px] font-medium text-muted">
              by minianon
            </span>

            <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight text-ink">
              One username.
              <br />
              <span className="text-accent">No phone number.</span>
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
          © 2026 <span className="font-medium text-muted">minianon</span> · Revert
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
