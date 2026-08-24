import { notFound, redirect } from "next/navigation";

import { getRoomForUser, listMessages } from "@/server/messaging/queries";
import { ensureDbUser } from "@/server/users/sync";

import { RoomView } from "./room-view";

const TYPE_NOTE: Partial<Record<string, string>> = {
  announce: "Only mods post here.",
  ama: "Quiet room — only the host and mentions of you will notify you.",
};

export default async function RoomPage({ params }: PageProps<"/rooms/[slug]">) {
  const { slug } = await params;

  const me = await ensureDbUser();
  if (!me) redirect("/onboarding");

  const room = await getRoomForUser(me.id, slug);
  if (!room) notFound();

  const messages = await listMessages(room.id);

  const canPost = room.type !== "announce" || me.isAdmin;

  return (
    <>
      <header className="flex flex-col gap-0.5 border-b border-black/10 px-6 py-3 dark:border-white/10">
        <h1 className="text-sm font-semibold">
          <span className="text-black/35 dark:text-white/35">#</span> {room.name}
        </h1>
        <p className="text-xs text-black/45 dark:text-white/45">
          {room.topic}
          {TYPE_NOTE[room.type] ? ` ${TYPE_NOTE[room.type]}` : ""}
        </p>
      </header>

      <RoomView
        slug={slug}
        conversationId={room.id}
        meId={me.id}
        meUsername={me.username}
        canPost={canPost}
        postDeniedReason="Only mods post in this room."
        initialMessages={messages}
      />
    </>
  );
}
