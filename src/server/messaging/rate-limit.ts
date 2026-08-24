import { sql } from "drizzle-orm";

import { db } from "@/server/db";
import { rateLimits } from "@/server/db/schema";

/**
 * Fixed-window counter in Postgres.
 *
 * Not the most precise algorithm — a burst can straddle two windows — but it is
 * one atomic statement with no extra infrastructure, and the point here is
 * stopping flooding, not perfect fairness. Move to Redis if writes get heavy.
 */
export async function consumeRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; remaining: number }> {
  const [row] = await db
    .insert(rateLimits)
    .values({ key, windowStart: new Date(), count: 1 })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        // Reset the window if it has expired, otherwise increment.
        count: sql`case
          when ${rateLimits.windowStart} < now() - (${windowSeconds} * interval '1 second')
          then 1
          else ${rateLimits.count} + 1
        end`,
        windowStart: sql`case
          when ${rateLimits.windowStart} < now() - (${windowSeconds} * interval '1 second')
          then now()
          else ${rateLimits.windowStart}
        end`,
      },
    })
    .returning({ count: rateLimits.count });

  const used = row?.count ?? 1;
  return { allowed: used <= limit, remaining: Math.max(0, limit - used) };
}

export const MESSAGE_LIMIT = { max: 20, windowSeconds: 60 };

/**
 * New accounts cannot post links. Job communities attract "pay me for a
 * referral" fraud, and a fresh account dropping a link is the shape of it.
 */
export const LINK_GATE_HOURS = 48;

const LINK_PATTERN = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|in|io|co|net|org|me|app|dev|xyz|link|gg)\b)/i;

export function containsLink(body: string): boolean {
  return LINK_PATTERN.test(body);
}
