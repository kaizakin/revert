import Link from "next/link";
import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";

import { listRoomsForUser } from "@/server/messaging/queries";
import { ensureDbUser } from "@/server/users/sync";

const TYPE_HINT: Record<string, string> = {
  announce: "mods only",
  ama: "quiet",
};

export default async function RoomsLayout({ children }: LayoutProps<"/rooms">) {
  // Anyone signed in but not onboarded has no rooms to show yet.
  const me = await ensureDbUser();
  if (!me) redirect("/onboarding");

  const rooms = await listRoomsForUser(me.id);

  return (
    <div className="flex flex-1 overflow-hidden">
      <aside className="flex w-60 shrink-0 flex-col border-r border-black/10 dark:border-white/10">
        <div className="flex items-center justify-between px-4 py-4">
          <Link href="/" className="text-sm font-semibold tracking-tight">
            Revert
          </Link>
          <UserButton />
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-4">
          {rooms.map((room) => (
            <Link
              key={room.id}
              href={`/rooms/${room.slug}`}
              className="group flex items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10"
            >
              <span className="flex min-w-0 items-baseline gap-1.5">
                <span className="text-black/35 dark:text-white/35">#</span>
                <span className="truncate">{room.name}</span>
                {TYPE_HINT[room.type] && (
                  <span className="shrink-0 text-[10px] uppercase tracking-wide text-black/30 dark:text-white/30">
                    {TYPE_HINT[room.type]}
                  </span>
                )}
              </span>
              {room.unread > 0 && (
                <span className="ml-2 shrink-0 rounded-full bg-black px-1.5 py-0.5 text-[10px] font-medium text-white dark:bg-white dark:text-black">
                  {room.unread > 99 ? "99+" : room.unread}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="border-t border-black/10 px-4 py-3 text-xs text-black/45 dark:border-white/10 dark:text-white/45">
          @{me.username}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
