import { z } from "zod";

/**
 * Shared by the form and the server action, so client and server cannot
 * disagree about what is valid.
 */

export const SOCIAL_PROVIDERS = [
  { key: "github", label: "GitHub", placeholder: "octocat" },
  { key: "linkedin", label: "LinkedIn", placeholder: "your-handle" },
  { key: "x", label: "X", placeholder: "handle" },
  { key: "leetcode", label: "LeetCode", placeholder: "handle" },
  { key: "codeforces", label: "Codeforces", placeholder: "handle" },
] as const;

export type SocialKey = (typeof SOCIAL_PROVIDERS)[number]["key"];

export const PROFILE_URL_BASE: Record<SocialKey, string> = {
  github: "https://github.com/",
  linkedin: "https://www.linkedin.com/in/",
  x: "https://x.com/",
  leetcode: "https://leetcode.com/u/",
  codeforces: "https://codeforces.com/profile/",
};

/**
 * A handle, not a URL. People paste whole URLs, so strip anything that looks
 * like one and keep the last path segment — otherwise the stored handle turns
 * into a broken link when we build the profile URL from it.
 */
export function normalizeHandle(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  // Query and hash go first. Splitting on / ? and # together and then taking
  // the last segment picks the query string, so x.com/jack?ref=abc becomes
  // "ref=abc" instead of "jack".
  const withoutQuery = trimmed.replace(/^https?:\/\//i, "").split(/[?#]/)[0];
  const segments = withoutQuery.split("/").filter(Boolean);

  // For a URL the handle is the last path segment; for a bare handle there is
  // only one segment anyway.
  const candidate = segments.at(-1) ?? "";
  return candidate.replace(/^@/, "");
}

const handleSchema = z.string().transform(normalizeHandle)
  .refine((value) => value === "" || /^[A-Za-z0-9._-]{1,60}$/.test(value), {
    message: "Letters, numbers, dots, dashes and underscores only.",
  });

export const WORK_STATUS = ["working", "student", "looking"] as const;

export const profileSchema = z.object({
  displayName: z.string().trim().max(60, "Keep it under 60 characters.").optional(),
  headline: z.string().trim().max(120, "Keep it under 120 characters.").optional(),
  about: z.string().trim().max(600, "Keep it under 600 characters.").optional(),
  workStatus: z.enum(WORK_STATUS).nullish(),
  company: z.string().trim().max(80).optional(),
  college: z.string().trim().max(80).optional(),
  location: z.string().trim().max(80).optional(),
  showLastActive: z.boolean(),
  showReadReceipts: z.boolean(),
  github: handleSchema.optional(),
  linkedin: handleSchema.optional(),
  x: handleSchema.optional(),
  leetcode: handleSchema.optional(),
  codeforces: handleSchema.optional(),
});

export type ProfileInput = z.infer<typeof profileSchema>;

export function profileUrl(provider: SocialKey, handle: string) {
  return `${PROFILE_URL_BASE[provider]}${handle}`;
}

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_MIME = ["image/png", "image/jpeg", "image/webp"];
