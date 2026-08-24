import { notFound, redirect } from "next/navigation";

import { getRoomForUser, listMessages } from "@/server/messaging/queries";
import { ensureDbUser } from "@/server/users/sync";

import { RoomView } from "./room-view";

const TYPE_NOTE: Partial<Record<string, string>> = {
  announce: "Only mods post here.",
  ama: "Quiet room — only the host and mentions of you will notify you.",
};

export async function generateMetadata({ params }: PageProps<"/rooms/[slug]">) {
  const { slug } = await params;
  return { title: `#${slug} · Revert` };
}

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
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-0.5 px-6 py-3.5">
          <h1 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <span className="text-faint">#</span>
            {room.name}
          </h1>
          <p className="text-xs leading-relaxed text-muted">
            {room.topic}
            {TYPE_NOTE[room.type] ? ` ${TYPE_NOTE[room.type]}` : ""}
          </p>
        </div>
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
