"use server";

import { revalidatePath } from "next/cache";

import {
  getRoomForUser,
  listMessages,
  listRoomMembers,
  markRead,
  roomStats,
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

  const result = await sendMessage(author, slug, body);
  if (!result.ok) return { error: result.error };

  revalidatePath(`/chat/${slug}`);
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

  revalidatePath(`/chat/${slug}`);
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
