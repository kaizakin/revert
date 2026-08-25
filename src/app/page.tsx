import type { ReactNode } from "react";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";

import { Avatar } from "@/components/avatar";
import { Logo, LogoMark } from "@/components/logo";
import { SocialIcon } from "@/components/social-icon";
import { publicMemberCount } from "@/server/messaging/queries";

import { ChatPreview } from "./chat-preview";
import { HowItWorks } from "./how-it-works";

/**
 * Written for someone arriving from the WhatsApp group.
 *
 * They already trust minianon and already live the problem, so the page does
 * not argue that job hunting is hard — it answers what this is, whether it is
 * safe, and how to get in. The previous version spent its best screen space
 * explaining the problem back to the people who know it best.
 *
 * Laid out as full-bleed bands of alternating warm paper rather than one narrow
 * column cut by hairlines. A rule between sections asks the reader to notice a
 * divider; a change of ground lets them feel the section end without looking at
 * it. Headings are set large and light in the display face — weight is not what
 * makes a headline read as designed, size and tight tracking are, and bold at
 * 52px just reads as a template.
 */

const TOPMATE_URL = "https://link.minianon.in/tusharbhardwaj";
const GROUP_URL = "https://whatsapp.com/channel/0029Vb67tYF0rGiSuzXcHw2C";

/** Booking goes straight to Topmate; the short link is the profile page. */
const BOOKING_URL = "https://topmate.io/tusharbhardwaj";

/**
 * A real address someone can write to. A community asking people to trust it
 * with their job hunt needs a way to be reached that is not a form nobody
 * answers — and recruiters wanting to post openings need somewhere to ask.
 */
const EMAIL = "tusharbhardwaj2617@gmail.com";

const SPONSOR_URL = "https://github.com/sponsors/minianon";

/**
 * Drop a photo at public/minianon.jpg and set this to "/minianon.jpg".
 * Left null rather than pointing at a file that is not there yet — a missing
 * image 404s instead of degrading, and the initials fallback looks deliberate.
 */
const PHOTO: string | null = null;

/** Size of the WhatsApp group. Rounded down, because it moves. */
const GROUP_SIZE = "2,000+";

/**
 * Real quotes from real people only. The array is empty until there are some —
 * an invented testimonial on a page whose entire promise is trust would be the
 * worst possible thing to ship.
 */
const TESTIMONIALS: { quote: string; name: string; role: string }[] = [];

/**
 * Directions, not dates. Someone who finds one room needs to know more is
 * coming; someone who is promised a date and does not get it stops believing
 * the rest of the page.
 */
const COMING = [
  {
    title: "Direct messages",
    body: "Reply to someone privately about a role without either of you swapping numbers first.",
    icon: (
      <>
        <path d="M15.5 12.5a5.5 5.5 0 01-8 4.9L4 18.5l1.1-3.5a5.5 5.5 0 117-2.5z" />
        <path d="M17 8.2A5.5 5.5 0 0120 18l1 3-3.4-1.1a5.5 5.5 0 01-4.6-.5" />
      </>
    ),
  },
  {
    title: "Referral rooms",
    body: "Company-wise rooms where people already inside can pass a profile along.",
    icon: (
      <>
        <circle cx="8" cy="8.5" r="3" />
        <path d="M3 19c0-2.8 2.2-5 5-5" />
        <path d="M13 15.5h6M16.5 12.5l3 3-3 3" />
      </>
    ),
  },
  {
    title: "Profiles worth reading",
    body: "A page that shows what you have built and where you are trying to go, not a CV.",
    icon: (
      <>
        <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
        <circle cx="9" cy="10.5" r="2" />
        <path d="M5.8 16c.5-1.7 1.7-2.5 3.2-2.5s2.7.8 3.2 2.5M15 9.5h3.5M15 13h3.5" />
      </>
    ),
  },
];

const STEPS = [
  {
    title: "Pick a username",
    body: "Sign in with Google or an email address. Choose the name people will know you by — that is the only identity anyone here sees.",
  },
  {
    title: "You are already in",
    body: "Mini Anon Hub opens straight away. No invite code, no approval queue, nobody vetting you before you can read anything.",
  },
  {
    title: "Post, ask, or just read",
    body: "Drop an opening, ask what to do about a rejected application, or lurk until something is worth replying to. All three are fine.",
  },
];

const FAQ = [
  {
    q: "Is the WhatsApp group going away?",
    a: "No. The group stays exactly where it is. Revert is where the openings stay searchable and where you can ask something without handing your number to two thousand people. Use both, or use whichever one you like — nothing is being taken away.",
  },
  {
    q: "Does it cost anything?",
    a: "No. Joining, posting, asking and answering are free. If something paid ever shows up it will be an extra on the side, not a gate in front of the group.",
  },
  {
    q: "Who can see my details?",
    a: "Other members see your username, and whatever you choose to put on your profile. They never see your email, and there is no phone number to see — we never ask for one.",
  },
  {
    q: "What if I already have a job?",
    a: "Plenty of people here do. They are the ones answering questions and passing on referrals, which is most of what makes the group worth being in.",
  },
];

/**
 * The WhatsApp mark. Not part of SocialIcon: that set is for links people put
 * on their profile, and a WhatsApp entry there would invite exactly the phone
 * number sharing this whole product exists to avoid.
 */
function WhatsAppIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <path
        fill="currentColor"
        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347M12.05 21.785h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.002-5.45 4.436-9.884 9.888-9.884a9.82 9.82 0 0 1 6.988 2.898 9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413"
      />
    </svg>
  );
}

const POINTS = [
  {
    title: "No phone numbers",
    body: "You join as a username. Nobody in the group can see your number, because we never ask for it.",
    tag: "Private by default",
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
    tag: "Always searchable",
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
    tag: "Quiet by choice",
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
    tag: "Answers that stay",
    icon: (
      <>
        <path d="M21 12a8 8 0 01-11.6 7.1L4 21l1.9-5.4A8 8 0 1121 12z" />
      </>
    ),
  },
];

/**
 * The two rooms side by side.
 *
 * Written to be fair rather than flattering: the group is where all of these
 * people already are, and the FAQ two sections down promises it is not going
 * anywhere. Every left-hand cell is a real property of a two-thousand-person
 * WhatsApp channel, not a strawman — overstating it here would undercut the
 * one thing the page is actually selling, which is trust.
 */
const COMPARISON = [
  {
    row: "Who you are",
    group: "A phone number, visible to everyone in it",
    revert: "A username you pick",
  },
  {
    row: "Finding an old opening",
    group: "Scroll back until you find it",
    revert: "Search for it, any time",
  },
  {
    row: "Notifications",
    group: "All of them, or leave the group",
    revert: "Mute the room, still get mentions",
  },
  {
    row: "Asking a question",
    group: "Buried under the next twenty messages",
    revert: "Replied to, and still there next week",
  },
  {
    row: "Getting in",
    group: "Someone has to add you",
    revert: "Sign in, and you are in",
  },
];

/** Present, in the accent. Paired with CrossMark, never used on its own. */
function CheckMark() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="mt-0.5 h-4 w-4 shrink-0 text-accent"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 10.5l4 4 8-9" />
    </svg>
  );
}

/**
 * Absent. Deliberately faint rather than red — these are not failures, they are
 * what a group chat is, and colouring them like errors would read as a smear.
 */
function CrossMark() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="mt-0.5 h-4 w-4 shrink-0 text-faint"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5.5 5.5l9 9M14.5 5.5l-9 9" />
    </svg>
  );
}

/**
 * A band of the page. `alt` swaps to the warmer paper and rules its edges, so
 * neighbouring sections separate on their own — nothing else in the page draws a
 * horizontal line. `wide` is for grids; prose stays at max-w-3xl, because a
 * measure much past that is genuinely harder to read.
 */
function Section({
  alt = false,
  wide = false,
  children,
}: {
  alt?: boolean;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={`px-6 py-20 ${alt ? "border-y border-line bg-canvas-alt" : ""}`}>
      <div className={`mx-auto w-full ${wide ? "max-w-5xl" : "max-w-3xl"}`}>{children}</div>
    </section>
  );
}

/** Accent label above a heading. Says what the section is before it argues it. */
function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="mb-3.5 text-[13px] font-medium uppercase tracking-[0.07em] text-accent">
      {children}
    </p>
  );
}

/**
 * Section heading. Same face as the hero, but at its natural tracking.
 *
 * Negative tracking that flatters the hero breaks here: at 600 weight the extra
 * ink eats the sidebearings, and -0.03em put eight letter pairs into overlap at
 * 28px (worst was "rt", -0.89px). Space Grotesk is already compact at this size
 * and does not need the help.
 */
function Heading({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-display text-[26px] font-semibold tracking-normal text-ink sm:text-[28px]">
      {children}
    </h2>
  );
}

/** Small line-art tile. One radius, one hairline, no shadow — same as the cards. */
function IconTile({ children }: { children: ReactNode }) {
  return (
    <span
      aria-hidden
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-line bg-surface text-accent"
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
        {children}
      </svg>
    </span>
  );
}

const PRIMARY_BUTTON =
  "inline-flex h-11 items-center justify-center rounded-md bg-accent px-5 text-[14px] font-medium text-accent-ink transition-opacity hover:opacity-90";

const SECONDARY_BUTTON =
  "inline-flex h-11 items-center justify-center rounded-md border border-line bg-surface px-5 text-[14px] font-medium text-ink transition-colors hover:border-line-strong";

/** Quiet underline for links inside running prose. */
const PROSE_LINK =
  "text-ink underline decoration-line-strong underline-offset-2 transition-colors hover:text-accent";

export default async function LandingPage() {
  const { userId } = await auth();
  const signedIn = Boolean(userId);

  /**
   * The landing page is the one route that must never fail — it is what a
   * WhatsApp link opens. A member count is worth showing but not worth a 500,
   * so a database that is down just costs the number.
   *
   * Shown next to the size of the WhatsApp group, which is the number that
   * carries the trust. A small count beside it reads as early rather than
   * empty — but zero would just look broken, so that one hides.
   */
  const members = await publicMemberCount().catch(() => 0);

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b border-line bg-canvas/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-3.5">
          <Logo size={28} />

          <nav className="flex items-center gap-1.5 text-sm">
            {signedIn ? (
              <Link
                href="/chat/hub"
                className="inline-flex h-9 items-center rounded-md bg-accent px-4 text-[14px] font-medium text-accent-ink transition-opacity hover:opacity-90"
              >
                Open Revert
              </Link>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="inline-flex h-9 items-center rounded-md px-3 text-[14px] text-muted transition-colors hover:text-ink"
                >
                  Sign in
                </Link>
                <Link
                  href="/sign-up"
                  className="inline-flex h-9 items-center rounded-md bg-accent px-4 text-[14px] font-medium text-accent-ink transition-opacity hover:opacity-90"
                >
                  Join
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="px-6 pt-14 pb-16 lg:pt-20 lg:pb-20">
          <div className="mx-auto grid w-full max-w-5xl items-center gap-12 lg:grid-cols-[1fr_minmax(0,26rem)] lg:gap-14">
            <div className="flex flex-col">
              <Eyebrow>By minianon · for the job alerts group</Eyebrow>

              {/*
                Two lines of statement, one of promise, the promise in accent.
                The break is hard rather than left to the browser: "Our group,"
                landing alone is the whole point of the line.
              */}
              {/*
                Tracking is looser on the phone on purpose. The same -0.04em
                that looks tight at 52px collides at 38px — measured, not
                guessed: "it" in "without" overlaps by 0.2px there.
              */}
              <h1 className="font-display text-[38px] font-normal leading-[1.1] tracking-[-0.03em] text-ink sm:text-[52px] sm:tracking-[-0.04em]">
                Our group,
                <br />
                <span className="text-accent">without your number.</span>
              </h1>

              <p className="mt-6 max-w-lg text-[17px] leading-[1.6] text-muted">
                Same job alerts, same people, same questions answered. Except you join as a
                username, the openings stay searchable, and you decide what is allowed to
                notify you.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                {signedIn ? (
                  <Link href="/chat/hub" className={PRIMARY_BUTTON}>
                    Open Revert
                  </Link>
                ) : (
                  <>
                    <Link href="/sign-up" className={PRIMARY_BUTTON}>
                      Join the group
                    </Link>
                    <Link href="/sign-in" className={SECONDARY_BUTTON}>
                      I already joined
                    </Link>
                  </>
                )}
              </div>

              <p className="mt-4 text-[13px] text-faint">
                Takes about twenty seconds. Google or email — no phone number, ever.
              </p>
            </div>

            <ChatPreview />
          </div>
        </section>

        {/*
          The WhatsApp figure is what carries the trust; the Revert figure is
          queried rather than claimed, so it stays honest as it grows. A thin
          band rather than a card — it is evidence for the hero above it, not a
          section of its own.
        */}
        <section className="border-y border-line bg-canvas-alt px-6 py-5">
          <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-8 gap-y-3">
            <p className="flex items-center gap-2.5 text-[14px] text-muted">
              <WhatsAppIcon className="h-5 w-5 shrink-0 text-[#25D366]" />
              <span>
                <span className="text-[17px] font-semibold text-ink">{GROUP_SIZE}</span> in the{" "}
                <a
                  href={GROUP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={PROSE_LINK}
                >
                  WhatsApp group
                </a>
              </span>
            </p>

            {members > 0 && (
              <p className="flex items-center gap-2.5 text-[14px] text-muted">
                <LogoMark size={20} />
                <span>
                  <span className="text-[17px] font-semibold text-ink">
                    {members.toLocaleString("en-IN")}
                  </span>{" "}
                  {members === 1 ? "person is" : "people are"} already on Revert
                </span>
              </p>
            )}
          </div>
        </section>

        <Section wide>
          <Eyebrow>What changes</Eyebrow>
          <Heading>The parts that kept breaking, fixed.</Heading>

          {/*
            One bordered field rather than four floating cards. The hairlines
            are the grid's own background showing through a 1px gap, so every
            join meets exactly and there are no doubled or orphaned borders to
            chase with nth-child rules.
          */}
          <ul className="mt-10 grid gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-2">
            {POINTS.map((point) => (
              <li key={point.title} className="flex flex-col gap-3 bg-canvas p-6">
                <IconTile>{point.icon}</IconTile>
                <span className="text-[16px] font-semibold text-ink">{point.title}</span>
                <span className="text-[15px] leading-[1.6] text-muted">{point.body}</span>
                {/* mt-auto pins the tag to the bottom, so it lines up across a row. */}
                <span className="mt-auto pt-1 text-[13px] font-medium text-accent">
                  {point.tag}
                </span>
              </li>
            ))}
          </ul>
        </Section>

        {/*
          A real table, because it is real tabular data — five properties
          compared across two rooms. On a phone the header row is dropped and
          each row becomes a labelled block; the column names come back as
          sm:hidden labels inside the cells, which keeps every value attributed
          without making the page scroll sideways.
        */}
        <Section alt wide>
          <Eyebrow>Side by side</Eyebrow>
          <Heading>The same group, in a room built for it</Heading>

          <p className="mt-4 max-w-2xl text-[15px] leading-[1.7] text-muted">
            Nothing here is a knock on the group — it is where all of us already are,
            and it is staying. This is just what a group chat cannot do.
          </p>

          <div className="mt-10 overflow-hidden rounded-md border border-line">
            <table className="w-full text-left">
              <caption className="sr-only">
                The WhatsApp group and Revert compared across five things people run
                into.
              </caption>

              <thead className="hidden sm:table-header-group">
                <tr className="bg-raised">
                  <th scope="col" className="w-[28%] px-5 py-3">
                    <span className="sr-only">What is being compared</span>
                  </th>
                  <th
                    scope="col"
                    className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-faint"
                  >
                    WhatsApp group
                  </th>
                  <th
                    scope="col"
                    className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-accent"
                  >
                    Revert
                  </th>
                </tr>
              </thead>

              <tbody>
                {COMPARISON.map((item) => (
                  <tr
                    key={item.row}
                    className="block border-t border-line max-sm:first:border-t-0 sm:table-row"
                  >
                    <th
                      scope="row"
                      className="block px-5 pt-5 text-[15px] font-semibold text-ink sm:table-cell sm:py-4 sm:align-top"
                    >
                      {item.row}
                    </th>

                    <td className="block px-5 pt-3 sm:table-cell sm:py-4 sm:align-top">
                      <span className="flex items-start gap-2.5">
                        <CrossMark />
                        <span className="text-[15px] leading-[1.5] text-muted">
                          <span className="mb-0.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-faint sm:hidden">
                            WhatsApp group
                          </span>
                          {item.group}
                        </span>
                      </span>
                    </td>

                    <td className="block px-5 pt-3 pb-5 sm:table-cell sm:py-4 sm:align-top">
                      <span className="flex items-start gap-2.5">
                        <CheckMark />
                        <span className="text-[15px] leading-[1.5] text-ink">
                          <span className="mb-0.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-accent sm:hidden">
                            Revert
                          </span>
                          {item.revert}
                        </span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/*
          Someone whose only group chat has ever been WhatsApp does not know
          what happens after they tap Join. Not knowing is what stops a signup,
          so the three steps are spelled out plainly.
        */}
        <Section wide>
          <Eyebrow>Getting in</Eyebrow>
          <Heading>How it works</Heading>

          <HowItWorks steps={STEPS} />
        </Section>

        {/*
          People join a community because of a person, and minianon is the
          reason anyone is on this page at all. Worth a face rather than a
          footer credit.
        */}
        <Section alt>
          <div className="flex flex-col gap-7 sm:flex-row sm:items-start sm:gap-8">
            <Avatar src={PHOTO} name="minianon" size={88} className="shrink-0 ring-1 ring-line" />

            <div className="flex flex-col">
              <Eyebrow>Who runs this</Eyebrow>
              <Heading>Built by minianon</Heading>

              <p className="mt-5 text-[15px] leading-[1.7] text-muted">
                I am Tushar. I have been running the job alerts group for a while now —
                posting openings, answering the same questions at midnight, and watching
                good roles scroll away before anyone saw them. Revert is that group with
                the parts that kept breaking fixed.
              </p>

              <p className="mt-4 text-[15px] leading-[1.7] text-muted">
                If you want to talk through a resume, a switch, or where to even start,
                you can{" "}
                <a
                  href={BOOKING_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={PROSE_LINK}
                >
                  book time with me
                </a>
                . Otherwise I am in the group, same as everyone else.
              </p>
            </div>
          </div>
        </Section>

        <Section wide>
          <Eyebrow>On the way</Eyebrow>
          <Heading>What is coming</Heading>

          <p className="mt-4 max-w-2xl text-[15px] leading-[1.7] text-muted">
            One room today, on purpose — a quiet room full of people beats five empty
            ones. Next, in roughly this order:
          </p>

          <ul className="mt-10 grid gap-6 sm:grid-cols-3">
            {COMING.map((item) => (
              <li
                key={item.title}
                className="flex flex-col gap-3 rounded-md border border-line bg-surface p-5"
              >
                <IconTile>{item.icon}</IconTile>
                <span className="text-[16px] font-semibold text-ink">{item.title}</span>
                <span className="text-[15px] leading-[1.6] text-muted">{item.body}</span>
              </li>
            ))}
          </ul>
        </Section>

        {TESTIMONIALS.length > 0 && (
          <Section wide>
            <Eyebrow>In their words</Eyebrow>
            <Heading>From the group</Heading>

            <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {TESTIMONIALS.map((item) => (
                <li
                  key={item.quote}
                  className="flex flex-col gap-5 rounded-md border border-line bg-surface p-5"
                >
                  <blockquote className="text-[15px] leading-[1.6] text-ink">
                    &ldquo;{item.quote}&rdquo;
                  </blockquote>
                  <div className="flex flex-col">
                    <span className="text-[14px] font-semibold text-ink">{item.name}</span>
                    <span className="text-[13px] text-faint">{item.role}</span>
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        )}

        <Section alt wide>
          <Eyebrow>Before you join</Eyebrow>
          <Heading>Questions people ask</Heading>

          <dl className="mt-10 grid gap-x-12 gap-y-8 sm:grid-cols-2">
            {FAQ.map((item) => (
              <div key={item.q} className="flex flex-col gap-2">
                <dt className="text-[16px] font-semibold text-ink">{item.q}</dt>
                <dd className="text-[15px] leading-[1.6] text-muted">{item.a}</dd>
              </div>
            ))}
          </dl>
        </Section>

        {/*
          No ads and no paywall means someone has to cover the bills. Asked for
          plainly and once, with no guilt and nothing withheld from people who
          scroll past — this is a job community, and most of it is broke.

          Set at hero scale rather than inside a card: it is the last thing on
          the page, so it gets to be a statement instead of a box.
        */}
        <section className="border-t border-line px-6 py-24">
          <div className="mx-auto flex w-full max-w-3xl flex-col items-center text-center">
            <h2 className="font-display text-[30px] font-normal leading-[1.15] tracking-[-0.02em] text-ink sm:text-[40px]">
              Revert is free,
              <br />
              <span className="text-accent">and stays free.</span>
            </h2>

            <p className="mt-6 max-w-xl text-[16px] leading-[1.7] text-muted">
              No ads, no data sold, nobody paying to reach you. It is one person and a
              server bill. If it has been useful and you are in a position to, you can
              chip in — and if you are not, ignore this and use it anyway. That is what
              it is for.
            </p>

            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              {!signedIn && (
                <Link href="/sign-up" className={PRIMARY_BUTTON}>
                  Join the group
                </Link>
              )}

              <a
                href={SPONSOR_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={`${signedIn ? PRIMARY_BUTTON : SECONDARY_BUTTON} gap-2`}
              >
                <SocialIcon provider="github" className="h-[18px] w-[18px] shrink-0" />
                Sponsor on GitHub
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto w-full max-w-5xl px-6 py-14">
          <div className="flex flex-col gap-10 sm:flex-row sm:justify-between">
            <div className="flex max-w-xs flex-col gap-3">
              <Logo size={28} />
              <p className="text-[13px] leading-[1.7] text-muted">
                Job alerts, questions and referrals — where you are a username, not a phone
                number.
              </p>
            </div>

            <nav className="flex flex-col gap-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">
                Elsewhere
              </span>

              <a
                href={GROUP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-fit items-center gap-2 text-[13px] text-muted transition-colors hover:text-ink"
              >
                <WhatsAppIcon />
                Job alerts group
              </a>

              <a
                href={BOOKING_URL}
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

              <a
                href={`mailto:${EMAIL}`}
                className="flex w-fit items-center gap-2 text-[13px] text-muted transition-colors hover:text-ink"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden>
                  <path
                    d="M3.5 6.5h17v11h-17z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M3.5 7.5l8.5 6 8.5-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {EMAIL}
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

          <div className="mt-10 flex flex-col gap-3 border-t border-line pt-7">
            {/*
              Kept in the footer rather than buried in a policy page: it is the
              one thing about Revert that could otherwise be assumed wrongly,
              and the promise is privacy.
            */}
            <p className="max-w-2xl text-[12px] leading-[1.7] text-faint">
              Messages are private, not end-to-end encrypted. Reports get read and acted on,
              because a job community without moderation fills up with fake recruiters fast.
            </p>

            <p className="text-[12px] text-faint">
              © 2026 Revert · built by{" "}
              <a
                href={TOPMATE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-line-strong underline-offset-2 transition-colors hover:text-ink"
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
