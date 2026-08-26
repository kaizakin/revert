/* Type only, so the schema — and the driver it imports — never reaches the
   browser bundle. */
import type { SystemMeta } from "@/server/db/schema";

/**
 * Moderation options, in a module the browser can import.
 *
 * The server module reaches for the database, so a menu component cannot pull
 * these from there without dragging the driver into the bundle.
 */

export type BanDuration = "5m" | "15m" | "30m" | "1h" | "24h" | "7d" | "forever";

export const BAN_OPTIONS: { value: BanDuration; label: string }[] = [
  { value: "5m", label: "5 minutes" },
  { value: "15m", label: "15 minutes" },
  { value: "30m", label: "30 minutes" },
  { value: "1h", label: "1 hour" },
  { value: "24h", label: "24 hours" },
  { value: "7d", label: "7 days" },
  { value: "forever", label: "Forever" },
];

export const BAN_MINUTES: Record<Exclude<BanDuration, "forever">, number> = {
  "5m": 5,
  "15m": 15,
  "30m": 30,
  "1h": 60,
  "24h": 60 * 24,
  "7d": 60 * 24 * 7,
};

/**
 * A date far enough out that it will never arrive, used for a permanent ban.
 *
 * One column serves both cases this way: every read is the same "is it still in
 * the future" comparison, and a timed ban lapsing needs nothing to run. The cost
 * is that the raw value is nonsense to look at, so anything showing a ban to a
 * person has to ask isPermanent first rather than printing the date.
 */
export const PERMANENT_BAN_UNTIL = new Date("9999-12-31T00:00:00.000Z");

export function isPermanentBan(until: Date | string | null | undefined): boolean {
  if (!until) return false;
  return new Date(until).getUTCFullYear() >= 9999;
}

/** Null when they are free to post. */
export function banExpiry(duration: BanDuration): Date {
  if (duration === "forever") return PERMANENT_BAN_UNTIL;
  return new Date(Date.now() + BAN_MINUTES[duration] * 60 * 1000);
}

/** How a ban reads to a person, given when it ends. */
export function describeBan(until: Date | string | null | undefined): string | null {
  if (!until) return null;
  if (isPermanentBan(until)) return "Banned indefinitely";

  const ms = new Date(until).getTime() - Date.now();
  if (ms <= 0) return null;

  const minutes = Math.ceil(ms / 60000);
  if (minutes < 60) return `Muted for ${minutes} more ${minutes === 1 ? "minute" : "minutes"}`;

  const hours = Math.ceil(minutes / 60);
  if (hours < 24) return `Muted for ${hours} more ${hours === 1 ? "hour" : "hours"}`;

  const days = Math.ceil(hours / 24);
  return `Muted for ${days} more ${days === 1 ? "day" : "days"}`;
}

export type MemberRole = "member" | "moderator" | "admin";

/**
 * The two questions worth asking, rather than comparing strings at each site.
 *
 * Deleting and banning are shared; pinning, editing the group and changing
 * somebody's role are not. Naming them apart is what stops a later check
 * accidentally handing a moderator the admin's powers by asking the loose
 * question in a place that meant the strict one.
 */
export const canModerate = (role: MemberRole) => role === "admin" || role === "moderator";

export const isAdmin = (role: MemberRole) => role === "admin";

/**
 * How long is left, as a phrase that finishes "you can post again in ___".
 *
 * Rounded up, because rounding down promises a moment that has not arrived —
 * somebody told "1 minute" who tries in fifty seconds is refused again and
 * learns the number is a guess.
 */
export function remainingBan(until: Date | string): string {
  const ms = new Date(until).getTime() - Date.now();
  if (ms <= 0) return "a moment";

  const minutes = Math.ceil(ms / 60000);
  if (minutes < 60) return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;

  const hours = Math.ceil(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"}`;

  const days = Math.ceil(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"}`;
}


/**
 * One sentence for everybody, used as the stored body.
 *
 * Not what anybody reads in the room — that is built per viewer from the same
 * meta. This exists so a row is still legible to anything looking at the table
 * directly, and so a client too old to know about `meta` shows a sentence
 * rather than a blank.
 */
export function fallbackSystemText(meta: SystemMeta): string {
  const who = `@${meta.target}`;
  const by = `by @${meta.actor}`;

  switch (meta.action) {
    case "ban":
      return meta.until
        ? `${who} was muted for ${remainingBan(meta.until)} ${by}`
        : `${who} was banned ${by}`;
    case "unban":
      return `${who} can post again ${by}`;
    case "promote":
      return `${who} was made a moderator ${by}`;
    case "demote":
      return `${who} is no longer a moderator ${by}`;
  }
}

/**
 * The same event, told to the person it happened to.
 *
 * Reading your own name in the third person about something done to you is the
 * detail that makes a room feel like it is talking about you rather than to
 * you.
 */
export function systemText(meta: SystemMeta, viewerUsername: string): string {
  const isYou = meta.target.toLowerCase() === viewerUsername.toLowerCase();
  const by = `by @${meta.actor}`;

  /*
   * Told to you, the actor is the subject: "@tushar made you a moderator".
   * Told about somebody else, the target is: "@priya was made a moderator by
   * @tushar". Keeping the passive form for both produced "you are no longer a
   * moderator by @tushar", which is not a sentence anybody says.
   */
  if (isYou) {
    const who = `@${meta.actor}`;

    switch (meta.action) {
      case "ban":
        return meta.until
          ? `${who} muted you. You can post again in ${remainingBan(meta.until)}.`
          : `${who} banned you from sending messages.`;
      case "unban":
        return `${who} lifted your mute. You can post again.`;
      case "promote":
        return `${who} made you a moderator.`;
      case "demote":
        return `${who} removed you as a moderator.`;
    }
  }

  switch (meta.action) {
    case "ban":
      return meta.until
        ? `@${meta.target} was muted for ${remainingBan(meta.until)} ${by}`
        : `@${meta.target} was banned ${by}`;
    case "unban":
      return `@${meta.target} was unmuted ${by}`;
    case "promote":
      return `@${meta.target} was made a moderator ${by}`;
    case "demote":
      return `@${meta.target} was removed as a moderator ${by}`;
  }
}
