import type { ReactNode } from "react";

/**
 * Turn message text into links: URLs and @mentions.
 *
 * Done by splitting the string, never by building HTML. Message bodies are user
 * input, and generating markup from them to get a couple of links would be an
 * injection hole in exchange for a convenience.
 */

/** http(s) or a bare www. host. Stops at whitespace or an angle bracket. */
const URL_PATTERN = /(https?:\/\/[^\s<>]+|www\.[^\s<>]+)/gi;

const MENTION_PATTERN = /(^|[^a-zA-Z0-9_@])@([a-zA-Z][a-zA-Z0-9_]{2,19})\b/g;

/**
 * Trailing punctuation is almost always sentence punctuation rather than part
 * of the address — "see example.com." should not link the full stop. Closing
 * brackets only come off when unmatched, so a URL containing a bracketed path
 * survives.
 */
function trimUrlTail(raw: string): { url: string; tail: string } {
  let url = raw;
  let tail = "";

  for (;;) {
    const last = url.at(-1);
    if (!last) break;

    if (".,;:!?".includes(last)) {
      tail = last + tail;
      url = url.slice(0, -1);
      continue;
    }

    if (last === ")" && !url.includes("(")) {
      tail = last + tail;
      url = url.slice(0, -1);
      continue;
    }

    break;
  }

  return { url, tail };
}

/** Only http and https become links — javascript: in an href is script injection. */
function safeHref(url: string): string | null {
  const candidate = /^https?:\/\//i.test(url) ? url : `https://${url}`;

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.href;
  } catch {
    return null;
  }
}

function renderMentions(
  text: string,
  onOpenProfile: (username: string) => void,
  keyPrefix: string,
): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;

  MENTION_PATTERN.lastIndex = 0;

  while ((match = MENTION_PATTERN.exec(text)) !== null) {
    const [full, lead, handle] = match;
    const start = match.index + lead.length;

    if (start > last) out.push(text.slice(last, start));

    const isAll = handle.toLowerCase() === "all";
    const key = `${keyPrefix}-m${start}`;

    out.push(
      isAll ? (
        <span key={key} className="rounded px-0.5 font-semibold text-mention">
          @all
        </span>
      ) : (
        <button
          key={key}
          type="button"
          onClick={() => onOpenProfile(handle.toLowerCase())}
          title={`Open @${handle}'s profile`}
          className="rounded px-0.5 font-semibold text-mention transition-opacity hover:opacity-80"
        >
          @{handle}
        </button>
      ),
    );

    last = match.index + full.length;
  }

  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function renderRichText(
  body: string | null,
  onOpenProfile: (username: string) => void,
): ReactNode {
  if (!body) return null;

  const out: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;

  URL_PATTERN.lastIndex = 0;

  // URLs first, then mentions inside whatever is left, so an @ inside a URL
  // is never treated as a handle.
  while ((match = URL_PATTERN.exec(body)) !== null) {
    if (match.index > last) {
      out.push(...renderMentions(body.slice(last, match.index), onOpenProfile, `u${match.index}`));
    }

    const { url, tail } = trimUrlTail(match[0]);
    const href = safeHref(url);

    out.push(
      href ? (
        <a
          key={`l${match.index}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="font-medium text-mention underline underline-offset-2 hover:opacity-80"
        >
          {url}
        </a>
      ) : (
        url
      ),
    );

    if (tail) out.push(tail);
    last = match.index + match[0].length;
  }

  if (last < body.length) {
    out.push(...renderMentions(body.slice(last), onOpenProfile, `t${last}`));
  }

  return out;
}
