import { z } from "zod";

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;

/**
 * Names nobody may claim. Two groups:
 *  - route and system names, so a profile can never shadow a real page
 *  - authority names, so nobody can impersonate the platform or its staff
 */
export const RESERVED_USERNAMES = new Set([
  // platform / authority
  "revert",
  "revertapp",
  "admin",
  "administrator",
  "root",
  "support",
  "help",
  "helpdesk",
  "mod",
  "mods",
  "moderator",
  "staff",
  "team",
  "official",
  "verified",
  "system",
  "bot",
  "security",
  "billing",
  "payments",
  "noreply",
  "minianon",
  // Mention keywords, so nobody can register a name that shadows @all.
  "all",
  "everyone",
  "here",
  "channel",
  // route names
  "api",
  "app",
  "auth",
  "login",
  "logout",
  "signin",
  "signup",
  "sign-in",
  "sign-up",
  "onboarding",
  "settings",
  "profile",
  "me",
  "u",
  "user",
  "users",
  "room",
  "rooms",
  "jobs",
  "job",
  "ask",
  "ama",
  "general",
  "search",
  "explore",
  "about",
  "terms",
  "privacy",
  "legal",
  "contact",
  "static",
  "public",
  "assets",
  "_next",
  "webhooks",
  "new",
  "edit",
  "delete",
]);

/**
 * Lowercase letters, digits and underscores. Must start with a letter, so a
 * username can never be confused with an id, and must not end in an
 * underscore or contain a run of them.
 */
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(USERNAME_MIN, `At least ${USERNAME_MIN} characters.`)
  .max(USERNAME_MAX, `At most ${USERNAME_MAX} characters.`)
  .regex(/^[a-z]/, "Must start with a letter.")
  .regex(/[a-z0-9]$/, "Must end with a letter or number.")
  .regex(/^[a-z0-9_]+$/, "Only lowercase letters, numbers and underscores.")
  .refine((v) => !v.includes("__"), "No repeated underscores.")
  .refine((v) => !RESERVED_USERNAMES.has(v), "That username is reserved.");

export type UsernameCheck =
  | { ok: true; username: string }
  | { ok: false; error: string };

/** Validate and normalise in one step. Always store the returned value. */
export function checkUsername(input: string): UsernameCheck {
  const result = usernameSchema.safeParse(input);
  if (!result.success) {
    return { ok: false, error: result.error.issues[0]?.message ?? "Invalid username." };
  }
  return { ok: true, username: result.data };
}
