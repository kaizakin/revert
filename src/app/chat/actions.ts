"use server";

import {
  getRoomForUser,
  listMessages,
  getPinnedMessage,
  listRoomMembers,
  markRead,
  roomStats,
  searchMessages,
  setPinned,
  type PinnedMessage,
  type SearchHit,
  touchLastActive,
  type MessageRow,
  type RoomMember,
  type RoomStats,
} from "@/server/messaging/queries";
import { toggleReaction } from "@/server/messaging/reactions";
import { loadAuthor, sendMessage } from "@/server/messaging/send";
import {
  applyReciprocity,
  getPublicProfile,
  type PublicProfile,
} from "@/server/users/profile";
import { getDbUser } from "@/server/users/sync";

export type SendState = { error?: string };

export async function sendMessageAction(
  _prev: SendState,
  formData: FormData,
): Promise<SendState> {
  const me = await getDbUser();
  if (!me) return { error: "You are signed out." };

  const author = await loadAuthor(me.id);
  if (!author) return { error: "Account not found." };

  const slug = String(formData.get("slug") ?? "");
  const body = String(formData.get("body") ?? "");
  const replyToId = String(formData.get("replyToId") ?? "") || null;

  const result = await sendMessage(author, slug, body, replyToId);
  if (!result.ok) return { error: result.error };

  /**
   * No revalidatePath here. The message is broadcast and the client fetches the
   * new rows itself, so re-rendering the whole route server-side only adds
   * latency — and it was the second source of the message, which is what made a
   * sent message appear twice before settling.
   */
  return {};
}

/**
 * Fetch messages newer than a timestamp. The realtime broadcast carries only an
 * id, so the client calls this to read the actual rows — the database stays the
 * only source of message content, and a spoofed broadcast cannot inject text.
 */
export async function fetchNewMessages(
  slug: string,
  afterIso: string,
): Promise<MessageRow[]> {
  const me = await getDbUser();
  if (!me) return [];

  const room = await getRoomForUser(me.id, slug);
  if (!room) return [];

  const after = new Date(afterIso);
  if (Number.isNaN(after.getTime())) return [];

  return listMessages(room.id, me.id, { after });
}

/** Re-read the current page of messages, for when reactions change. */
export async function refetchMessages(slug: string): Promise<MessageRow[]> {
  const me = await getDbUser();
  if (!me) return [];

  const room = await getRoomForUser(me.id, slug);
  if (!room) return [];

  return listMessages(room.id, me.id);
}

export type ReactState = { error?: string };

export async function toggleReactionAction(
  slug: string,
  messageId: string,
  emoji: string,
): Promise<ReactState> {
  const me = await getDbUser();
  if (!me) return { error: "You are signed out." };

  const result = await toggleReaction(me.id, messageId, emoji);
  if (!result.ok) return { error: result.error };

  // Same as sending: the client reloads the page of messages itself, so a
  // server re-render here would only add latency.
  return {};
}

export async function markRoomRead(slug: string, messageId?: string) {
  const me = await getDbUser();
  if (!me) return;

  const room = await getRoomForUser(me.id, slug);
  if (!room) return;

  await markRead(me.id, room.id, messageId);
  await touchLastActive(me.id);
}

export type RoomInfo = {
  name: string;
  topic: string | null;
  stats: RoomStats;
  members: RoomMember[];
};

/** Group info for the side panel: description plus every member. */
export async function fetchRoomInfo(slug: string): Promise<RoomInfo | null> {
  const me = await getDbUser();
  if (!me) return null;

  const room = await getRoomForUser(me.id, slug);
  if (!room) return null;

  const [stats, members] = await Promise.all([roomStats(room.id), listRoomMembers(room.id)]);

  return { name: room.name ?? slug, topic: room.topic, stats, members };
}

/**
 * A member profile for the side panel. Reciprocity is applied here rather than
 * in the panel, so a hidden last-seen never reaches the browser at all.
 */
export async function fetchProfile(username: string): Promise<PublicProfile | null> {
  const me = await getDbUser();
  if (!me) return null;

  const profile = await getPublicProfile(username);
  if (!profile) return null;

  return applyReciprocity(profile, { showLastActive: me.showLastActive });
}

export type MentionCandidate = {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

/**
 * Members of this room matching a partial handle, for the @ menu.
 *
 * Scoped to the room and gated on the caller's membership, so the composer
 * cannot be used to enumerate everyone on the platform.
 */
export async function searchRoomMembers(
  slug: string,
  query: string,
): Promise<MentionCandidate[]> {
  const me = await getDbUser();
  if (!me) return [];

  const room = await getRoomForUser(me.id, slug);
  if (!room) return [];

  const needle = query.trim().toLowerCase();
  const members = await listRoomMembers(room.id);

  return members
    .filter((m) => m.id !== me.id)
    .filter(
      (m) =>
        !needle ||
        m.username.toLowerCase().startsWith(needle) ||
        (m.displayName ?? "").toLowerCase().includes(needle),
    )
    .slice(0, 8)
    .map((m) => ({
      username: m.username,
      displayName: m.displayName,
      avatarUrl: m.avatarUrl,
    }));
}

/** Pinning is a moderation action, so it is admin-only and re-checked here. */
export async function setPinnedAction(
  slug: string,
  messageId: string | null,
): Promise<{ error?: string }> {
  const me = await getDbUser();
  if (!me) return { error: "You are signed out." };
  if (!me.isAdmin) return { error: "Only mods can pin messages." };

  const room = await getRoomForUser(me.id, slug);
  if (!room) return { error: "You are not in this room." };

  await setPinned(room.id, messageId, me.id);
  return {};
}

export async function fetchPinned(slug: string): Promise<PinnedMessage | null> {
  const me = await getDbUser();
  if (!me) return null;

  const room = await getRoomForUser(me.id, slug);
  if (!room) return null;

  return getPinnedMessage(room.id);
}

export async function searchInRoom(slug: string, query: string): Promise<SearchHit[]> {
  const me = await getDbUser();
  if (!me) return [];

  const room = await getRoomForUser(me.id, slug);
  if (!room) return [];

  return searchMessages(room.id, query);
}

/**
 * Stamp the caller as present and return the room's current counts.
 *
 * One round trip does both deliberately. Presence has to be refreshed on a
 * timer anyway — lastActiveAt was only written when messages changed, so
 * someone reading a quiet room went "offline" after the activity window — and
 * the counts need the same cadence. Two separate polls would double the
 * traffic for no benefit.
 */
export async function syncPresence(slug: string): Promise<RoomStats | null> {
  const me = await getDbUser();
  if (!me) return null;

  const room = await getRoomForUser(me.id, slug);
  if (!room) return null;

  await touchLastActive(me.id);
  return roomStats(room.id);
}
