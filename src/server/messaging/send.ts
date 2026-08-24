import { and, eq, inArray, isNull } from "drizzle-orm";

import { db } from "@/server/db";
import { conversations, mentions, messages, users } from "@/server/db/schema";
import { transport } from "@/server/realtime";

import { getRoomForUser } from "./queries";
import {
  containsLink,
  consumeRateLimit,
  LINK_GATE_HOURS,
  MESSAGE_LIMIT,
} from "./rate-limit";

export const MESSAGE_MAX_LENGTH = 4000;

export type SendResult =
  | { ok: true; messageId: string }
  | { ok: false; error: string };

/** @username, ignoring emails and any @ that is part of a longer token. */
function extractMentions(body: string): string[] {
  const found = new Set<string>();
  const pattern = /(?:^|[^a-z0-9_@])@([a-z][a-z0-9_]{2,19})\b/gi;

  for (const match of body.matchAll(pattern)) {
    found.add(match[1].toLowerCase());
  }
  return [...found];
}

type Author = {
  id: string;
  isAdmin: boolean;
  createdAt: Date;
  bannedUntil: Date | null;
};

/**
 * Persist a message, then fan it out. Order matters: the database is the source
 * of truth, and realtime only broadcasts what is already committed. A client
 * must never be told about a message that failed to save.
 */
export async function sendMessage(
  author: Author,
  roomSlug: string,
  rawBody: string,
  replyToId?: string | null,
): Promise<SendResult> {
  const body = rawBody.trim();

  if (!body) return { ok: false, error: "Message is empty." };
  if (body.length > MESSAGE_MAX_LENGTH) {
    return { ok: false, error: `Keep it under ${MESSAGE_MAX_LENGTH} characters.` };
  }

  if (author.bannedUntil && author.bannedUntil > new Date()) {
    return { ok: false, error: "You cannot post right now." };
  }

  // Membership is re-checked here and not trusted from the page that rendered
  // the composer, because a server action is a public endpoint.
  const room = await getRoomForUser(author.id, roomSlug);
  if (!room) return { ok: false, error: "You are not in this room." };

  if (room.type === "announce" && !author.isAdmin) {
    return { ok: false, error: "Only mods post in this room." };
  }

  const accountAgeHours = (Date.now() - author.createdAt.getTime()) / 3_600_000;
  if (!author.isAdmin && accountAgeHours < LINK_GATE_HOURS && containsLink(body)) {
    return {
      ok: false,
      error: `New accounts cannot post links for the first ${LINK_GATE_HOURS} hours.`,
    };
  }

  const limit = await consumeRateLimit(
    `msg:${author.id}`,
    MESSAGE_LIMIT.max,
    MESSAGE_LIMIT.windowSeconds,
  );
  if (!limit.allowed) {
    return { ok: false, error: "You are sending messages too quickly. Wait a minute." };
  }

  /**
   * A reply target is only accepted when it lives in this same room and is not
   * deleted. The id comes from the client, so without this check anyone could
   * quote a message out of a conversation they cannot read — the quote text is
   * rendered to everyone in the room.
   */
  let replyTo: string | null = null;
  if (replyToId) {
    const [parent] = await db
      .select({ id: messages.id })
      .from(messages)
      .where(
        and(
          eq(messages.id, replyToId),
          eq(messages.conversationId, room.id),
          isNull(messages.deletedAt),
        ),
      )
      .limit(1);

    if (!parent) return { ok: false, error: "That message is no longer available." };
    replyTo = parent.id;
  }

  const handles = extractMentions(body);

  const messageId = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(messages)
      .values({
        conversationId: room.id,
        authorId: author.id,
        kind: "text",
        body,
        replyToId: replyTo,
      })
      .returning({ id: messages.id });

    if (handles.length) {
      const mentioned = await tx
        .select({ id: users.id })
        .from(users)
        .where(and(inArray(users.username, handles), isNull(users.deletedAt)));

      if (mentioned.length) {
        await tx
          .insert(mentions)
          .values(mentioned.map((m) => ({ messageId: row.id, userId: m.id })))
          .onConflictDoNothing();
      }
    }

    return row.id;
  });

  await transport.publish({
    type: "message.new",
    conversationId: room.id,
    messageId,
  });

  return { ok: true, messageId };
}

/** Author fields sendMessage needs, loaded once per request. */
export async function loadAuthor(userId: string): Promise<Author | null> {
  const [row] = await db
    .select({
      id: users.id,
      isAdmin: users.isAdmin,
      createdAt: users.createdAt,
      bannedUntil: users.bannedUntil,
    })
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.deletedAt)))
    .limit(1);

  return row ?? null;
}

/** Rooms are looked up by slug often enough to warrant its own helper. */
export async function conversationIdBySlug(slug: string): Promise<string | null> {
  const [row] = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(eq(conversations.slug, slug))
    .limit(1);

  return row?.id ?? null;
}
