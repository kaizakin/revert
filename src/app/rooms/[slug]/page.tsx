import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { avatarColour, initials } from "@/lib/avatar";
import { getRoomForUser, listMessages, roomMemberCount } from "@/server/messaging/queries";
import { ensureDbUser } from "@/server/users/sync";

import { RoomView } from "./room-view";

const TYPE_NOTE: Partial<Record<string, string>> = {
  announce: "Only mods post here",
  ama: "Quiet — only the host and mentions notify you",
};

export async function generateMetadata({ params }: PageProps<"/rooms/[slug]">) {
  const { slug } = await params;
  return { title: `${slug} · Revert` };
}

export default async function RoomPage({ params }: PageProps<"/rooms/[slug]">) {
  const { slug } = await params;

  const me = await ensureDbUser();
  if (!me) redirect("/onboarding");

  const room = await getRoomForUser(me.id, slug);
  if (!room) notFound();

  const [messages, members] = await Promise.all([
    listMessages(room.id, me.id),
    roomMemberCount(room.id),
  ]);

  const canPost = room.type !== "announce" || me.isAdmin;
  const note = TYPE_NOTE[room.type];

  return (
    <>
      <header className="flex items-center gap-3 border-b border-line bg-surface px-4 py-2.5">
        {/* Back to the chat list, which is the only nav on a phone. */}
        <Link
          href="/rooms"
          aria-label="Back to chats"
          className="-ml-1 rounded-full p-1.5 text-muted transition-colors hover:bg-raised hover:text-ink sm:hidden"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
            <path
              d="M15 5l-7 7 7 7"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </Link>

        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-white"
          style={{ backgroundColor: avatarColour(room.slug) }}
          aria-hidden
        >
          {initials(room.name)}
        </span>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[15px] font-semibold text-ink">{room.name}</h1>
          <p className="truncate text-[12px] text-muted">
            {members} {members === 1 ? "member" : "members"}
            {note ? ` · ${note}` : ""}
          </p>
        </div>

        {/* Search inside a room and room settings arrive with message search
            and profiles, so they are shown disabled rather than faked. */}
        <span
          title="Search in room — not built yet"
          aria-hidden
          className="flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-full text-faint/60"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
            <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>
        <span
          title="Room settings — not built yet"
          aria-hidden
          className="flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-full text-faint/60"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
            <circle cx="12" cy="5" r="1.6" fill="currentColor" />
            <circle cx="12" cy="12" r="1.6" fill="currentColor" />
            <circle cx="12" cy="19" r="1.6" fill="currentColor" />
          </svg>
        </span>
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
