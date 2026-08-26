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
