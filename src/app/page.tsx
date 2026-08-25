import type { ReactNode } from "react";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";

import { Avatar } from "@/components/avatar";
import { Logo, LogoMark } from "@/components/logo";
import { SocialIcon } from "@/components/social-icon";
import { publicMemberCount } from "@/server/messaging/queries";

import { ChatPreview } from "./chat-preview";
import { HowItWorks } from "./how-it-works";
import { WhatYouGet } from "./what-you-get";
import { WhatsComing } from "./whats-coming";

/**
 * Written for someone arriving from the WhatsApp channel.
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

const CHANNEL_URL = "https://whatsapp.com/channel/0029Vb67tYF0rGiSuzXcHw2C";

/**
 * minianon's own page, which is itself a MiniLink page — so the two constants
 * below are the profile and the product it runs on.
 *
 * Previously called TOPMATE_URL, which it has never been: Topmate is the
 * booking link underneath.
 */
const PROFILE_URL = "https://link.minianon.in/tusharbhardwaj";

/**
 * The other projects. Mentioned where a person can mention them, not sold.
 *
 * ShortlistMe is the one worth naming to this audience in particular: everyone
 * reading this page is mid-hunt, and it turns a resume into a portfolio.
 */
const MINILINK_URL = "https://link.minianon.in";
const SHORTLISTME_URL = "https://shortlistme.site";

/**
 * ShortlistMe first, because it is the one of the two that a reader of this page
 * can actually use. Descriptions stay to what is checkable — neither site's own
 * reach claims appear here, since the whole argument of this page is that it
 * does not overstate.
 */
const PROJECTS = [
  {
    name: "ShortlistMe",
    body: "Upload a resume and it builds you a portfolio site.",
    href: SHORTLISTME_URL,
    logo: "/logos/shortlistme.svg",
  },
  {
    name: "MiniLink",
    body: "A free and open source link-in-bio page. The profile above runs on it.",
    href: MINILINK_URL,
    logo: "/logos/minilink.png",
  },
];

/** Booking goes straight to Topmate. */
const BOOKING_URL = "https://topmate.io/tusharbhardwaj";

/**
 * A real address someone can write to. A community asking people to trust it
 * with their job hunt needs a way to be reached that is not a form nobody
 * answers — and recruiters wanting to post openings need somewhere to ask.
 */
const EMAIL = "tusharbhardwaj2617@gmail.com";

const SPONSOR_URL = "https://github.com/sponsors/minianon";

/**
 * A face for the section that is about a person.
 *
 * 609x688 at the source and rendered into an 88px circle, which next/image
 * resizes and re-encodes rather than shipping the whole thing — the point of
 * routing it through Avatar. Portrait rather than square, so object-cover trims
 * a few percent off the top and bottom to make the circle.
 *
 * Set back to null if the file ever moves: a missing image 404s, where the
 * initials fallback looks deliberate.
 */
const PHOTO: string | null = "/avatars/me.jpeg";

/**
 * Kartik, who has been sending pull requests. Credited by name and face rather
 * than in a commit log nobody reads.
 *
 * The photo comes from GitHub rather than a file in the repo, so it follows
 * whatever he sets there instead of going stale. avatars.githubusercontent.com
 * is already an allowed remote pattern for uploaded avatars, so this costs no
 * config; the canonical /u/<id> URL is used because github.com/<user>.png
 * redirects to it and github.com itself is not on the allow-list.
 */
const CONTRIBUTOR_URL = "https://github.com/kaizakin";
const CONTRIBUTOR_PHOTO: string | null = "https://avatars.githubusercontent.com/u/143219880?v=4";

/** Size of the WhatsApp channel. Rounded down, because it moves. */
const CHANNEL_SIZE = "2,000+";

/**
 * Real quotes from real people only. The array is empty until there are some —
 * an invented testimonial on a page whose entire promise is trust would be the
 * worst possible thing to ship.
 */
const TESTIMONIALS: { quote: string; name: string; role: string }[] = [];

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
    q: "Is the WhatsApp channel going away?",
    a: "No. The channel stays exactly where it is, and it is still the fastest way to hear that a role exists. Revert is where you can do something about it — ask what the interview was like, or find the person who already works there. Use both. Nothing is being taken away.",
  },
  {
    q: "Does it cost anything?",
    a: "No. Joining, posting, asking and answering are free. If something paid ever shows up it will be an extra on the side, not a gate in front of the room.",
  },
  {
    q: "Who can see my details?",
    a: "Other members see your username, and whatever you choose to put on your profile. They never see your email, and there is no phone number to see — we never ask for one.",
  },
  {
    q: "What if I already have a job?",
    a: "Plenty of people here do. They are the ones answering questions and passing on referrals, which is most of what makes the room worth being in.",
  },
  {
    q: "Can I post an opening myself?",
    a: "Yes, anyone can. If you know about a role, post it — and unlike a forward, it stays searchable for the person who starts looking next month.",
  },
  {
    q: "What happens to fake recruiters?",
    a: "Report them. Reports get read and acted on, because a job community without moderation fills up with fake recruiters fast.",
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

/**
 * The YouTube mark. Local for the same reason WhatsAppIcon is: SocialIcon's set
 * is driven by SOCIAL_PROVIDERS, which is what members can put on their own
 * profile. Widening that to light one footer row would change a product feature
 * as a side effect.
 */
function YouTubeIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <path
        fill="currentColor"
        d="M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 00.5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 002.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 002.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.6 15.6V8.4l6.2 3.6-6.2 3.6z"
      />
    </svg>
  );
}

/**
 * A phrase in the accent with a highlighter bar under it.
 *
 * Colour alone was carrying the hero's promise, and colour alone is the emphasis
 * a skimming reader misses. Shared so the two places that lean on a phrase mark
 * it the same way rather than drifting apart.
 */
function Highlighted({ children }: { children: ReactNode }) {
  return (
    <span className="relative inline-block text-accent">
      {children}
      <span
        aria-hidden
        className="absolute inset-x-0 -bottom-[0.04em] h-[0.09em] rounded-full bg-accent/40"
      />
    </span>
  );
}

/**
 * The arrow that arrives on hover, marking a row as a link that leaves the page.
 * Shared by the project cards and the contributor credit, so the two read as the
 * same kind of thing rather than as a card and a loose line of text.
 */
function ExternalArrow() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 motion-reduce:transition-none"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M7 17L17 7M10 7h7v7" />
    </svg>
  );
}

/**
 * A heart, drawn rather than typed.
 *
 * The emoji was the problem, not the sentiment. Emoji ignore letter-spacing, so
 * it broke the eyebrow's tracking, and its own multicolour palette fought a
 * label that is otherwise a single accent colour. A path takes exactly the size
 * and baseline offset it is given.
 *
 * Red as a literal, like the tick's white check: a heart is red in both themes,
 * and the one red token here means "danger".
 */
function HeartIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="ml-1.5 inline-block h-[11px] w-[11px] align-[-0.05em] text-[#e0245e]"
      aria-hidden
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M12 21C12 21 3 14.6 3 8.9 3 6.2 5.1 4 7.7 4c1.7 0 3.3.9 4.3 2.3C13 4.9 14.6 4 16.3 4 18.9 4 21 6.2 21 8.9 21 14.6 12 21 12 21z"
      />
    </svg>
  );
}

/**
 * The verified tick, next to the name.
 *
 * The scalloped edge is what makes it read as a verification badge rather than a
 * generic blue circle — a plain disc with a check in it looks like a form
 * validation state. The outline is a twelve-lobe rosette generated from its own
 * geometry (valleys on radius 8.6, lobe tips on 10, each lobe one arc), not any
 * platform's asset: this marks the owner of this page, and it should not pass
 * itself off as somebody else's verification.
 *
 * The check is white in both themes. That is the convention, and any of our inks
 * would flip with the theme and stop reading as a tick.
 */
function VerifiedTick() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[19px] w-[19px] shrink-0 text-verified"
      role="img"
      aria-label="Verified"
    >
      <path
        fill="currentColor"
        d="M12.00 3.40A2.31 2.31 0 0 1 16.30 4.55A2.31 2.31 0 0 1 19.45 7.70A2.31 2.31 0 0 1 20.60 12.00A2.31 2.31 0 0 1 19.45 16.30A2.31 2.31 0 0 1 16.30 19.45A2.31 2.31 0 0 1 12.00 20.60A2.31 2.31 0 0 1 7.70 19.45A2.31 2.31 0 0 1 4.55 16.30A2.31 2.31 0 0 1 3.40 12.00A2.31 2.31 0 0 1 4.55 7.70A2.31 2.31 0 0 1 7.70 4.55A2.31 2.31 0 0 1 12.00 3.40Z"
      />
      <path
        d="M8.1 12.3l2.6 2.6 5.2-5.4"
        fill="none"
        stroke="#fff"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * minianon's own accounts, for the footer.
 *
 * A person's links rather than the product's, which is why they belong in the
 * footer: someone still deciding whether to join the room does not need them,
 * and someone who already decided might.
 */
const SOCIALS = [
  {
    label: "minianon.in",
    href: "https://www.minianon.in/",
    icon: <SocialIcon provider="website" className="h-4 w-4 shrink-0" />,
  },
  {
    label: "GitHub",
    href: "https://github.com/minianon",
    icon: <SocialIcon provider="github" className="h-4 w-4 shrink-0" />,
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/minianon",
    icon: <SocialIcon provider="linkedin" className="h-4 w-4 shrink-0" />,
  },
  {
    label: "X",
    href: "https://x.com/minianondev",
    icon: <SocialIcon provider="x" className="h-4 w-4 shrink-0" />,
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/channel/UCqq8kNn9yKvsl95MeiFPIeg",
    icon: <YouTubeIcon />,
  },
];

/**
 * The two rooms side by side.
 *
 * The comparison is against a WhatsApp *channel*, not a group, and the
 * difference matters: a channel is a broadcast. Only the owner posts, everyone
 * else gets an emoji reaction and nothing more, and followers cannot see or
 * reach each other at all. So every row here is about the half a broadcast
 * cannot do — asking, answering, and reaching the person who replied.
 *
 * Deliberately not about phone numbers. A channel already hides a follower's
 * number from the owner and from other followers, so claiming otherwise would
 * be false, and false in the one direction this page cannot afford: it is
 * selling trust to people who can check.
 */
const COMPARISON = [
  {
    row: "Asking a doubt",
    channel: "You cannot — only the owner can post",
    revert: "Ask in the room, and get answers",
  },
  {
    row: "Replying to an opening",
    channel: "An emoji reaction, and nothing else",
    revert: "A real reply, on the message itself",
  },
  {
    row: "Talking to other members",
    channel: "Followers cannot see or reach each other",
    revert: "Reply to anyone, mention anyone",
  },
  {
    row: "Asking for a referral",
    channel: "Nowhere to ask",
    revert: "Ask someone who already works there",
  },
  {
    row: "Finding an old opening",
    channel: "Scroll the feed until you find it",
    revert: "Search for it, any time",
  },
  {
    row: "Who else is here",
    channel: "No way to tell",
    revert: "A member list, with profiles",
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
 * simply what a broadcast is for, and colouring them like errors would read as a
 * smear on the thing that brought everyone here.
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
  id,
  children,
}: {
  alt?: boolean;
  wide?: boolean;
  /**
   * An anchor, so a section can be linked to directly. The footer used to be
   * the only referrer; these are kept now for sharing a link straight to the
   * steps or the questions.
   */
  id?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={`px-6 py-20 ${alt ? "border-y border-line bg-canvas-alt" : ""} ${
        /* Clears the sticky header when jumped to from a footer link. */
        id ? "scroll-mt-16" : ""
      }`}
    >
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

const PRIMARY_BUTTON =
  "inline-flex h-11 items-center justify-center rounded-md bg-accent px-5 text-[14px] font-medium text-accent-ink transition-opacity hover:opacity-90";

const SECONDARY_BUTTON =
  "inline-flex h-11 items-center justify-center rounded-md border border-line bg-surface px-5 text-[14px] font-medium text-ink transition-colors hover:border-line-strong";

/** Quiet underline for links inside running prose. */
const PROSE_LINK =
  "text-ink underline decoration-line-strong underline-offset-2 transition-colors hover:text-accent";

/** Small caps label. Used in the footer columns and above the projects list. */
const MICRO_LABEL = "text-[11px] font-semibold uppercase tracking-[0.12em] text-faint";

const FOOTER_LINK =
  "flex w-fit items-center gap-2 text-[13px] text-muted transition-colors hover:text-ink";

export default async function LandingPage() {
  const { userId } = await auth();
  const signedIn = Boolean(userId);

  /**
   * The landing page is the one route that must never fail — it is what a
   * WhatsApp link opens. A member count is worth showing but not worth a 500,
   * so a database that is down just costs the number.
   *
   * Shown next to the size of the WhatsApp channel, which is the number that
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
              {/*
                A line of continuity, then the difference, the difference in
                accent. The break is hard rather than left to the browser:
                "Same alerts." landing alone is what earns the second line.

                Tracking is a notch looser than the rest of the display type,
                and looser again on the phone, because "alerts" carries an "rt"
                — the tightest pair in this face. At -0.04em its ink overlaps by
                0.48px at 52px and 0.81px at 38px. These values clear it at 52px
                and land it at dead zero at 38px, which is as tight as this word
                goes. Measured per glyph rather than eyeballed, so treat it as a
                floor: tighter than this, or a heavier weight, needs new words.
              */}
              <h1 className="font-display text-[38px] font-normal leading-[1.1] tracking-[-0.01em] text-ink sm:text-[52px] sm:tracking-[-0.03em]">
                Same alerts.
                <br />
                <Highlighted>Now you can reply.</Highlighted>
              </h1>

              <p className="mt-6 max-w-lg text-[17px] leading-[1.6] text-muted">
                Every opening from the channel, plus somewhere to ask about it — what the
                interview was actually like, or who you already know inside. You join as a
                username, and nothing scrolls away.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                {signedIn ? (
                  <Link href="/chat/hub" className={PRIMARY_BUTTON}>
                    Open Revert
                  </Link>
                ) : (
                  <>
                    <Link href="/sign-up" className={PRIMARY_BUTTON}>
                      Join the room
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

              {/*
                The two numbers, inline under the ask rather than in a band of
                their own below the fold. As a full-width strip they were a
                near-empty shelf between the hero and the first real section;
                here they are what they always were — evidence for the button
                directly above them.

                The channel figure carries the trust, the room figure is
                queried rather than claimed so it stays honest as it grows, and
                zero hides rather than reading as broken.
              */}
              <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line pt-6 text-[13px] text-muted">
                {/*
                  The attribution moved down here from above the headline. As an
                  eyebrow it was the first thing the eye landed on, and it is not
                  a hook — it is a reason to trust the hook. This row is already
                  the "why believe this" block, so it belongs with the counts
                  rather than in front of the claim.
                */}
                <span>
                  By <span className="font-semibold text-ink">minianon</span> · for my
                  community
                  <HeartIcon />
                </span>

                <span className="flex items-center gap-2">
                  <WhatsAppIcon className="h-4 w-4 shrink-0 text-[#25D366]" />
                  <span>
                    <span className="font-semibold text-ink">{CHANNEL_SIZE}</span> follow the{" "}
                    <a
                      href={CHANNEL_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline decoration-line-strong underline-offset-2 transition-colors hover:text-accent"
                    >
                      channel
                    </a>
                  </span>
                </span>

                {members > 0 && (
                  <span className="flex items-center gap-2">
                    <LogoMark size={16} />
                    <span>
                      <span className="font-semibold text-ink">
                        {members.toLocaleString("en-IN")}
                      </span>{" "}
                      {members === 1 ? "is" : "are"} in the room
                    </span>
                  </span>
                )}
              </div>
            </div>

            <ChatPreview />
          </div>
        </section>

        {/*
          Before the comparison, not after it. Someone who has only ever
          followed a channel needs to know what happens when they tap Join
          before they get an argument about why they should — not knowing is
          what stops a signup, and no amount of side-by-side fixes that.
        */}
        <Section alt wide id="how-it-works">
          <Eyebrow>Getting in</Eyebrow>
          <Heading>How it works</Heading>

          <HowItWorks steps={STEPS} />
        </Section>

        {/*
          A real table, because it is real tabular data — five properties
          compared across two rooms. On a phone the header row is dropped and
          each row becomes a labelled block; the column names come back as
          sm:hidden labels inside the cells, which keeps every value attributed
          without making the page scroll sideways.
        */}
        <Section wide>
          <Eyebrow>Side by side</Eyebrow>
          <Heading>The channel ends where your questions start.</Heading>

          <p className="mt-4 max-w-2xl text-[15px] leading-[1.7] text-muted">
            The channel is how two thousand people hear about a role, and it is staying
            exactly as it is. It just cannot do the other half — the asking, the
            answering, and getting to the person who knows.
          </p>

          <div className="mt-10 overflow-hidden rounded-md border border-line">
            <table className="w-full text-left">
              <caption className="sr-only">
                The WhatsApp channel and Revert compared across six things people run
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
                    WhatsApp channel
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
                            WhatsApp channel
                          </span>
                          {item.channel}
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
          Shows before it tells. Each card leads with a small panel built from
          the room's own tokens, because "searchable" and "notifications you
          control" are abstract until you have seen the shape of them — these
          claims used to be a plain icon list that said the same thing without
          showing any of it.

          The heading deliberately does not count the cards. It said "Four
          things" for exactly as long as it took to add a fifth.
        */}
        <Section alt wide id="what-you-get">
          <Eyebrow>What you get</Eyebrow>
          <Heading>What a feed cannot do</Heading>

          {/*
            `alt` has to match this section's own ground. The hairlines are the
            grid's background showing through a 1px gap, so the cells must be
            opaque — and a cell painted the wrong shade would show as a panel
            floating on the wrong colour rather than as a bordered field.
          */}
          <WhatYouGet alt />
        </Section>

        {/*
          People join a community because of a person, and minianon is the
          reason anyone is on this page at all. Worth a face rather than a
          footer credit.
        */}
        {/*
          One column, like every other section on the page.

          Two columns were the problem rather than the spacing inside them: the
          bio is short and the meta beside it was long, so whichever side lost
          left a void, and no gutter width fixes that. Flowing it — name, prose,
          then a bordered field of the projects, then the credit — means there is
          no second column to balance against, and it reads with the same rhythm
          as What you get and What is coming.

          Naming the projects here still costs the Join button nothing, which is
          why they are down here and not in a band further up.
        */}
        <Section wide>
          <Eyebrow>Who runs this</Eyebrow>
          {/* Marked the same way as the hero's promise, not just coloured. */}
          <Heading>
            Built by <Highlighted>minianon</Highlighted>
          </Heading>

          <div className="mt-10 flex items-center gap-4">
            <Avatar
              src={PHOTO}
              name="minianon"
              size={72}
              className="shrink-0 ring-2 ring-gold"
            />

            {/*
              The tick sits after the name, where every platform puts it, which
              is most of why it is recognised without explanation.
            */}
            <span className="flex min-w-0 items-center gap-1.5">
              <a
                href={PROFILE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate font-display text-[17px] font-semibold text-ink transition-colors hover:text-accent"
              >
                Tushar Bhardwaj
              </a>

              <VerifiedTick />
            </span>
          </div>

          {/* Capped well inside the section: full width would be an unreadable measure. */}
          <p className="mt-6 max-w-2xl text-[15px] leading-[1.7] text-muted">
            I have been running the channel for a while now — posting openings,
            answering the same questions at midnight, and watching good roles scroll
            away before anyone saw them. Revert is the room that channel never had.
          </p>

          <p className="mt-4 max-w-2xl text-[15px] leading-[1.7] text-muted">
            If you want to talk through a resume, a switch, or where to even start, you
            can{" "}
            <a
              href={BOOKING_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={PROSE_LINK}
            >
              book time with me
            </a>
            . Otherwise I am in the room, same as everyone else.
          </p>

          <div className="mt-12">
            <span className={MICRO_LABEL}>Also built</span>

            {/*
              The same bordered field the rest of the page uses for a set of
              things, at full width — as a narrow stack in a side column these
              read as two boxes floating on the ground rather than one field. The
              hairlines are the grid's background showing through a 1px gap, so
              the cells have to be opaque and match this section's canvas.
            */}
            <ul className="mt-3 grid gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-2">
              {PROJECTS.map((project) => (
                <li key={project.name} className="bg-canvas">
                  <a
                    href={project.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex h-full flex-col gap-1.5 p-5 transition-shadow hover:shadow-[inset_0_0_0_1px_var(--rv-accent)] motion-reduce:transition-none"
                  >
                    <span className="flex items-center gap-2 font-display text-[15px] font-semibold text-ink transition-colors group-hover:text-accent">
                      {/*
                        Each project's own mark, copied into public/logos rather
                        than hotlinked, so a card here does not go blank when
                        another deployment is down.

                        A plain img on purpose: at 18px the optimiser buys
                        nothing, and putting an SVG through it would mean
                        enabling dangerouslyAllowSVG for every image on the site,
                        including the avatars members upload.
                      */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={project.logo}
                        alt=""
                        width={18}
                        height={18}
                        className="h-[18px] w-[18px] shrink-0 rounded-sm"
                      />

                      {project.name}

                      <ExternalArrow />
                    </span>

                    <span className="text-[14px] leading-[1.55] text-muted">
                      {project.body}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/*
            A credit, not a card. One box on its own was the thing that looked
            stranded — a single cell has no field to belong to, and at full width
            it is mostly empty. A rule and a row says the same thing and settles
            the section instead of leaving another rectangle hanging.
          */}
          <div className="mt-12 border-t border-line pt-6">
            <span className={MICRO_LABEL}>Thanks to</span>

            <a
              href={CONTRIBUTOR_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group mt-3 flex w-fit items-center gap-3"
            >
              <Avatar
                src={CONTRIBUTOR_PHOTO}
                name="Kartik"
                size={36}
                className="shrink-0 ring-1 ring-line"
              />

              <span className="flex min-w-0 flex-col">
                <span className="flex items-center gap-1.5 font-display text-[15px] font-semibold text-ink transition-colors group-hover:text-accent">
                  Kartik
                  <ExternalArrow />
                </span>
                <span className="text-[12px] text-faint">@kaizakin · contributor</span>
              </span>
            </a>
          </div>
        </Section>

        <Section alt wide>
          <Eyebrow>On the way</Eyebrow>
          <Heading>What is coming</Heading>

          <p className="mt-4 max-w-2xl text-[15px] leading-[1.7] text-muted">
            One room today, on purpose — a quiet room full of people beats five empty
            ones. Next, in roughly this order:
          </p>

          <WhatsComing />
        </Section>

        {TESTIMONIALS.length > 0 && (
          <Section wide>
            <Eyebrow>In their words</Eyebrow>
            <Heading>From the room</Heading>

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

        {/*
          Native details/summary rather than a JavaScript accordion: it is
          keyboard operable, findable by the browser's own in-page search even
          while collapsed, and works before hydration. One column rather than
          two, because a question and its answer read badly across a gutter.

          The first one is open, so the section does not look like a wall of
          closed doors — and it is the question everyone actually arrives with.
        */}
        <Section id="faq">
          <Eyebrow>Before you join</Eyebrow>
          <Heading>Questions people ask</Heading>

          <div className="mt-10 divide-y divide-line overflow-hidden rounded-md border border-line bg-canvas">
            {FAQ.map((item, index) => (
              <details key={item.q} open={index === 0} className="group">
                {/*
                  No background change on hover. Filling the row with `raised`
                  painted a grey band across the whole width, which read as a
                  selected row rather than a hovered one. The chevron picking up
                  the accent is enough of a signal, and it points at the thing
                  that is about to move.
                */}
                <summary className="group/row flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-display text-[16px] font-semibold text-ink [&::-webkit-details-marker]:hidden">
                  {item.q}

                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4 shrink-0 text-faint transition-[transform,color] duration-300 group-open:rotate-180 group-hover/row:text-accent motion-reduce:transition-none"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M6 9.5l6 6 6-6" />
                  </svg>
                </summary>

                <p className="px-5 pb-5 text-[15px] leading-[1.7] text-muted">{item.a}</p>
              </details>
            ))}
          </div>

          {/*
            An exit for the question that is not on the list. A closed FAQ with no
            way out tells someone their question does not count — and the address
            is already on the page, so this costs a line and answers the one thing
            six answers cannot.
          */}
          <p className="mt-5 text-[14px] leading-[1.7] text-muted">
            Not on the list?{" "}
            <a href={`mailto:${EMAIL}`} className={PROSE_LINK}>
              Write to me
            </a>{" "}
            and I will answer it.
          </p>
        </Section>

        {/*
          No ads and no paywall means someone has to cover the bills. Asked for
          plainly and once, with no guilt and nothing withheld from people who
          scroll past — this is a job community, and most of it is broke.

          Set at hero scale rather than inside a card: it is the last thing on
          the page, so it gets to be a statement instead of a box.
        */}
        <section className="border-t border-line bg-canvas-alt px-6 py-24">
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
                  Join the room
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
          {/*
            Four groups rather than two. One brand block and one link column
            left a third of the footer as dead space on a wide screen, which is
            what made it read as unfinished — the fix is more structure, not
            more centring.
          */}
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))] lg:gap-8">
            <div className="flex max-w-sm flex-col gap-3">
              <Logo size={28} />

              <p className="text-[13px] leading-[1.7] text-muted">
                Job alerts, questions and referrals — where you are a username, not a phone
                number.
              </p>

              {/* The same two numbers as the strip up top, kept honest the same way. */}
              <p className="text-[12px] leading-[1.7] text-faint">
                {CHANNEL_SIZE} follow the channel
                {members > 0
                  ? `. ${members.toLocaleString("en-IN")} ${
                      members === 1 ? "person is" : "people are"
                    } in the room.`
                  : "."}
              </p>
            </div>

            {/*
              minianon's own accounts, in place of the in-page anchors that were
              here. The anchors were the more useful thing for a reader, but this
              is a page about a person's community and the person is allowed a
              column — the section ids stay in the markup either way, so the
              links are still shareable.
            */}
            <nav className="flex flex-col gap-3">
              <span className={MICRO_LABEL}>Follow</span>

              {SOCIALS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={FOOTER_LINK}
                >
                  {social.icon}
                  {social.label}
                </a>
              ))}
            </nav>

            <nav className="flex flex-col gap-3">
              <span className={MICRO_LABEL}>Elsewhere</span>

              <a
                href={CHANNEL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={FOOTER_LINK}
              >
                <WhatsAppIcon />
                Job alerts channel
              </a>

              {/* Persistent and cheap: a footer row costs the page nothing. */}
              <a
                href={MINILINK_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={FOOTER_LINK}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden>
                  <path
                    d="M10.5 13.5a3.5 3.5 0 005 0l3-3a3.5 3.5 0 00-5-5l-1 1"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  />
                  <path
                    d="M13.5 10.5a3.5 3.5 0 00-5 0l-3 3a3.5 3.5 0 005 5l1-1"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  />
                </svg>
                MiniLink
              </a>

              <a
                href={SHORTLISTME_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={FOOTER_LINK}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden>
                  <path
                    d="M6 3.5h7.5L18 8v12.5H6z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M13.5 3.5V8H18M9 12.5h6M9 16h4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                ShortlistMe
              </a>

              <a
                href={BOOKING_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={FOOTER_LINK}
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
                Book a call
              </a>

              {/*
                The address stays visible rather than hiding behind the word
                "email": a mailto is useless to anyone without a mail client
                configured, and a recruiter wanting to post a role needs
                something they can copy. break-all because it is one long word
                in a narrow column.
              */}
              <a
                href={`mailto:${EMAIL}`}
                className="flex items-start gap-2 break-all text-[13px] text-muted transition-colors hover:text-ink"
              >
                <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0" aria-hidden>
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
            </nav>

            <nav className="flex flex-col gap-3">
              <span className={MICRO_LABEL}>Get in</span>

              {signedIn ? (
                <Link href="/chat/hub" className={FOOTER_LINK}>
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
                  Open the room
                </Link>
              ) : (
                <>
                  <Link href="/sign-up" className={FOOTER_LINK}>
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
                    Join the room
                  </Link>

                  <Link href="/sign-in" className={FOOTER_LINK}>
                    Sign in
                  </Link>
                </>
              )}

              <a
                href={SPONSOR_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={FOOTER_LINK}
              >
                <SocialIcon provider="github" className="h-4 w-4 shrink-0" />
                Sponsor
              </a>
            </nav>
          </div>

          <div className="mt-12 flex flex-col gap-4 border-t border-line pt-7 lg:flex-row lg:items-start lg:justify-between lg:gap-12">
            {/*
              Kept in the footer rather than buried in a policy page: it is the
              one thing about Revert that could otherwise be assumed wrongly,
              and the promise is privacy.
            */}
            <p className="max-w-2xl text-[12px] leading-[1.7] text-faint">
              Messages are private, not end-to-end encrypted. Reports get read and acted on,
              because a job community without moderation fills up with fake recruiters fast.
            </p>

            <p className="shrink-0 text-[12px] text-faint">
              © 2026 Revert · built by{" "}
              <a
                href={PROFILE_URL}
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
