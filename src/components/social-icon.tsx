import type { SocialKey } from "@/lib/profile";

/**
 * Inline brand marks. Kept as paths rather than an icon package so the profile
 * does not pull a dependency for six glyphs, and so they inherit currentColor.
 */
const PATHS: Record<SocialKey, string> = {
  github:
    "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12",
  linkedin:
    "M4.98 3.5a2.5 2.5 0 11-.02 5 2.5 2.5 0 01.02-5zM3 9h4v12H3V9zm7 0h3.8v1.7h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V21h-4v-5.5c0-1.3-.02-3-1.83-3-1.83 0-2.11 1.43-2.11 2.9V21h-4V9z",
  x: "M17.53 3h3.2l-6.99 8 8.26 10h-6.2l-4.86-5.95L5.2 21H2l7.4-8.46L1.5 3h6.35l4.5 5.5L17.53 3zm-1.1 16h1.77L7.06 4.78H5.16L16.43 19z",
  leetcode:
    "M13.48 2.3a1.2 1.2 0 011.7 1.7l-3.1 3.15 4.3 4.35a1.2 1.2 0 01-1.7 1.7l-4.3-4.35-3.2 3.25c-1.1 1.12-1.1 2.9 0 4.02l3.2 3.25 4.3-4.35a1.2 1.2 0 011.7 1.7l-4.3 4.35a3.4 3.4 0 01-4.84 0l-3.2-3.25a5.75 5.75 0 010-8.06l6.24-6.36zM14 12.9h6.8a1.2 1.2 0 010 2.4H14a1.2 1.2 0 010-2.4z",
  codeforces:
    "M4.5 9.5A1.5 1.5 0 016 11v8a1.5 1.5 0 01-1.5 1.5h-1A1.5 1.5 0 012 19v-8a1.5 1.5 0 011.5-1.5h1zm7.5-6A1.5 1.5 0 0113.5 5v14a1.5 1.5 0 01-1.5 1.5h-1A1.5 1.5 0 019.5 19V5A1.5 1.5 0 0111 3.5h1zm7.5 8A1.5 1.5 0 0121 13v6a1.5 1.5 0 01-1.5 1.5h-1A1.5 1.5 0 0117 19v-6a1.5 1.5 0 011.5-1.5h1z",
  website:
    "M12 2a10 10 0 100 20 10 10 0 000-20zm0 2c1.3 0 2.5 1.9 3.1 4.7H8.9C9.5 5.9 10.7 4 12 4zM7.9 8.7A13 13 0 019 5.2 8 8 0 004.6 8.7h3.3zm7.2-3.5a13 13 0 011.1 3.5h3.2a8 8 0 00-4.3-3.5zM4.1 10.7a8.2 8.2 0 000 2.6h3.4a20 20 0 010-2.6H4.1zm5.4 0a18 18 0 000 2.6h5a18 18 0 000-2.6h-5zm7 0a20 20 0 010 2.6h3.4a8.2 8.2 0 000-2.6H16.5zm-8.6 4.6H4.6A8 8 0 009 18.8a13 13 0 01-1.1-3.5zm2.1 0c.6 2.8 1.8 4.7 3.1 4.7s2.5-1.9 3.1-4.7H8.9zm7.3 0a13 13 0 01-1.1 3.5 8 8 0 004.3-3.5h-3.2z",
};

/**
 * LinkedIn's mark, split at the dot over the i.
 *
 * Split here rather than at the call site because the whole point is that the
 * dot is a separate piece of the drawing, and the seam is in the path data. It
 * carries `ac-jump` unconditionally: that class does nothing outside an
 * `rv-motion` hover scope, so a profile link is unaffected and the footer gets
 * a dot that hops without a second copy of this path existing anywhere.
 *
 * The remainder starts with an absolute M, so the two halves draw exactly where
 * the single path did.
 */
const LINKEDIN_DOT = "M4.98 3.5a2.5 2.5 0 11-.02 5 2.5 2.5 0 01.02-5z";

export function SocialIcon({
  provider,
  className = "h-4 w-4",
}: {
  provider: SocialKey;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      {provider === "linkedin" && (
        <path className="ac-jump" d={LINKEDIN_DOT} fill="currentColor" />
      )}
      <path
        d={provider === "linkedin" ? PATHS.linkedin.slice(LINKEDIN_DOT.length) : PATHS[provider]}
        fill="currentColor"
      />
    </svg>
  );
}
