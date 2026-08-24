import Link from "next/link";
import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";

import { listRoomsForUser } from "@/server/messaging/queries";
import { ensureDbUser } from "@/server/users/sync";

const TYPE_HINT: Record<string, string> = {
  announce: "mods",
  ama: "quiet",
};

export default async function RoomsLayout({ children }: LayoutProps<"/rooms">) {
  // Signed in but not onboarded means there are no rooms to show yet.
  const me = await ensureDbUser();
  if (!me) redirect("/onboarding");

  const rooms = await listRoomsForUser(me.id);

  return (
    <div className="flex h-dvh overflow-hidden bg-canvas">
      <aside className="flex w-64 shrink-0 flex-col border-r border-line bg-surface">
        <div className="flex items-center justify-between px-4 py-4">
          <Link
            href="/"
            className="text-sm font-semibold tracking-tight text-ink transition-opacity hover:opacity-70"
          >
            Revert
          </Link>
          <UserButton
            appearance={{ elements: { avatarBox: { width: 28, height: 28 } } }}
          />
        </div>

        <p className="px-4 pb-2 text-[11px] font-semibold uppercase tracking-widest text-faint">
          Rooms
        </p>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-4">
          {rooms.map((room) => (
            <Link
              key={room.id}
              href={`/rooms/${room.slug}`}
              className="group flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-muted transition-colors hover:bg-raised hover:text-ink"
            >
              <span className="text-faint">#</span>
              <span className="min-w-0 flex-1 truncate">{room.name}</span>

              {TYPE_HINT[room.type] && room.unread === 0 && (
                <span className="shrink-0 text-[10px] uppercase tracking-wide text-faint">
                  {TYPE_HINT[room.type]}
                </span>
              )}

              {room.unread > 0 && (
                <span className="shrink-0 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-accent-ink">
                  {room.unread > 99 ? "99+" : room.unread}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="border-t border-line px-4 py-3">
          <p className="truncate text-xs font-medium text-ink">@{me.username}</p>
          <p className="truncate text-[11px] text-faint">
            {me.company ?? me.college ?? "Add your profile"}
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
