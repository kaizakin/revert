"use server";

import { revalidatePath } from "next/cache";

import { listMessages, markRead, type MessageRow } from "@/server/messaging/queries";
import { getRoomForUser } from "@/server/messaging/queries";
import { loadAuthor, sendMessage } from "@/server/messaging/send";
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

  revalidatePath(`/rooms/${slug}`);
  return {};
}

/**
 * Fetch messages newer than a timestamp. The realtime broadcast carries only an
 * id, so the client calls this to read the actual row — the database stays the
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

  return listMessages(room.id, { after });
}

export async function markRoomRead(slug: string, messageId?: string) {
  const me = await getDbUser();
  if (!me) return;

  const room = await getRoomForUser(me.id, slug);
  if (!room) return;

  await markRead(me.id, room.id, messageId);
}
