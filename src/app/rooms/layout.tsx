import Link from "next/link";
import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";

import { listRoomsForUser, type RoomSummary } from "@/server/messaging/queries";
import { ensureDbUser } from "@/server/users/sync";

const TYPE_HINT: Record<string, string> = {
  announce: "mods only",
  ama: "quiet",
};

function shortTime(value: Date | null) {
  if (!value) return "";

  const today = new Date();
  const isToday = value.toDateString() === today.toDateString();
  if (isToday) {
    return value
      .toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true })
      .toLowerCase();
  }

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (value.toDateString() === yesterday.toDateString()) return "Yesterday";

  return value.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function RoomRow({ room }: { room: RoomSummary }) {
  const preview = room.lastBody
    ? `${room.lastAuthor ? `${room.lastAuthor}: ` : ""}${room.lastBody}`
    : (TYPE_HINT[room.type] ?? room.topic ?? "No messages yet");

  return (
    <Link
      href={`/rooms/${room.slug}`}
      className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-raised"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-raised text-base font-semibold text-muted">
        #
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[15px] font-medium text-ink">{room.name}</span>
          <span
            className={`shrink-0 text-[11px] ${room.unread > 0 ? "font-semibold text-accent" : "text-faint"}`}
          >
            {shortTime(room.lastAt)}
          </span>
        </span>

        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-[13px] text-muted">{preview}</span>
          {room.unread > 0 && (
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-accent-ink">
              {room.unread > 99 ? "99+" : room.unread}
            </span>
          )}
        </span>
      </span>
    </Link>
  );
}

export default async function RoomsLayout({ children }: LayoutProps<"/rooms">) {
  // Signed in but not onboarded means there are no rooms to show yet.
  const me = await ensureDbUser();
  if (!me) redirect("/onboarding");

  const rooms = await listRoomsForUser(me.id);

  return (
    <div className="flex h-dvh overflow-hidden bg-canvas">
      <aside className="hidden w-80 shrink-0 flex-col border-r border-line bg-surface sm:flex">
        <div className="flex items-center justify-between px-4 py-3.5">
          <Link
            href="/"
            className="text-base font-semibold tracking-tight text-ink transition-opacity hover:opacity-70"
          >
            Revert
          </Link>
          <UserButton appearance={{ elements: { avatarBox: { width: 30, height: 30 } } }} />
        </div>

        <div className="flex-1 overflow-y-auto">
          {rooms.map((room) => (
            <RoomRow key={room.id} room={room} />
          ))}
        </div>

        <div className="border-t border-line px-4 py-3">
          <p className="truncate text-[13px] font-medium text-ink">@{me.username}</p>
          <p className="truncate text-[11px] text-faint">
            {me.company ?? me.college ?? "Add your profile"}
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
