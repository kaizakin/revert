import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { avatarColour, initials } from "@/lib/avatar";
import { getRoomForUser, listMessages, roomStats } from "@/server/messaging/queries";
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

  const [messages, stats] = await Promise.all([
    listMessages(room.id, me.id),
    roomStats(room.id),
  ]);

  const canPost = room.type !== "announce" || me.isAdmin;
  const note = TYPE_NOTE[room.type];
  const name = room.name ?? slug;

  /**
   * Passed into RoomView rather than rendered here, because the whole bar is
   * the button that opens group info and that state lives in the client
   * component.
   */
  const header = (
    <div className="flex items-center gap-3 border-b border-line bg-surface px-4 py-2.5">
      {/* Back to the chat list, which is the only nav on a phone. */}
      <Link
        href="/rooms"
        aria-label="Back to chats"
        onClick={(event) => event.stopPropagation()}
        className="-ml-1 rounded-full p-1.5 text-muted transition-colors hover:bg-raised hover:text-ink sm:hidden"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
          <path
            d="M15 5l-7 7 7 7"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
          />
        </svg>
      </Link>

      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-white"
        style={{ backgroundColor: avatarColour(slug) }}
        aria-hidden
      >
        {initials(name)}
      </span>

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[15px] font-semibold text-ink">{name}</h1>
        <p className="truncate text-[12px] text-muted">
          {stats.total} {stats.total === 1 ? "member" : "members"}
          {stats.active > 0 && ` · ${stats.active} online`}
          {note ? ` · ${note}` : ""}
        </p>
      </div>

      <span
        aria-hidden
        className="flex h-9 w-9 items-center justify-center rounded-full text-muted"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
          <circle cx="12" cy="5" r="1.6" fill="currentColor" />
          <circle cx="12" cy="12" r="1.6" fill="currentColor" />
          <circle cx="12" cy="19" r="1.6" fill="currentColor" />
        </svg>
      </span>
    </div>
  );

  return (
    <RoomView
      slug={slug}
      header={header}
      conversationId={room.id}
      meId={me.id}
      meUsername={me.username}
      canPost={canPost}
      postDeniedReason="Only mods post in this room."
      initialMessages={messages}
    />
  );
}
