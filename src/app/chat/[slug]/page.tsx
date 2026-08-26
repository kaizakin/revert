import { notFound, redirect } from "next/navigation";

import {
  getRoomForUser,
  listMessages,
  roomStats,
  unreadMarker,
} from "@/server/messaging/queries";
import { ensureDbUser } from "@/server/users/sync";

import { RoomView } from "./room-view";

const TYPE_NOTE: Partial<Record<string, string>> = {
  announce: "Only mods post here",
  ama: "Quiet — only the host and mentions notify you",
};

export async function generateMetadata({ params }: PageProps<"/chat/[slug]">) {
  const { slug } = await params;
  return { title: `${slug} · Revert` };
}

export default async function ConversationPage({ params }: PageProps<"/chat/[slug]">) {
  const { slug } = await params;

  const me = await ensureDbUser();
  if (!me) redirect("/onboarding");

  const room = await getRoomForUser(me.id, slug);
  if (!room) notFound();

  /*
   * Read before the page marks the room read, and passed down as a fixed value:
   * the divider has to survive the read receipt that lands a second later, or it
   * disappears while you are still looking at it.
   */
  const [messages, stats, marker] = await Promise.all([
    listMessages(room.id, me.id, { showReadReceipts: me.showReadReceipts }),
    roomStats(room.id),
    unreadMarker(room.id, me.id),
  ]);

  const canPost = room.type !== "announce" || me.isAdmin;
  const note = TYPE_NOTE[room.type];
  const name = room.name ?? slug;

  return (
    <RoomView
      slug={slug}
      name={name}
      note={note}
      stats={stats}
      conversationId={room.id}
      meId={me.id}
      meUsername={me.username}
      canPost={canPost}
      canPin={me.isAdmin}
      avatarUrl={room.avatarUrl}
      meAvatarUrl={me.avatarUrl}
      postDeniedReason="Only mods post in this room."
      initialMessages={messages}
      marker={marker}
    />
  );
}
