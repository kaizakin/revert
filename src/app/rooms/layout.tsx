import Link from "next/link";
import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";

import { listRoomsForUser } from "@/server/messaging/queries";
import { ensureDbUser } from "@/server/users/sync";

import { ChatList } from "./chat-list";

/**
 * Icon rail. Chats is the only live destination; the rest are Phase 2 and 3 and
 * are rendered disabled rather than hidden, so the shape of the app is visible
 * without pretending the features exist.
 */
const RAIL = [
  { key: "chats", label: "Chats", href: "/rooms", live: true },
  { key: "dms", label: "Direct messages — Phase 2", href: null, live: false },
  { key: "status", label: "Status — Phase 3", href: null, live: false },
  { key: "people", label: "Member directory — Phase 2", href: null, live: false },
];

function RailIcon({ name }: { name: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const };

  if (name === "chats") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <path d="M21 12a8 8 0 01-11.6 7.1L4 21l1.9-5.4A8 8 0 1121 12z" {...common} />
      </svg>
    );
  }
  if (name === "dms") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <path d="M4 6h16v12H4z" {...common} />
        <path d="M4 7l8 6 8-6" {...common} />
      </svg>
    );
  }
  if (name === "status") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <circle cx="12" cy="12" r="8" strokeDasharray="4 3" {...common} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <circle cx="9" cy="9" r="3.5" {...common} />
      <path d="M3 19c0-3.3 2.7-6 6-6s6 2.7 6 6" {...common} />
      <path d="M16 6.5a3.5 3.5 0 010 6M18 19c0-2.4-1-4.5-2.6-5.8" {...common} />
    </svg>
  );
}

export default async function RoomsLayout({ children }: LayoutProps<"/rooms">) {
  // Signed in but not onboarded means there are no rooms to show yet.
  const me = await ensureDbUser();
  if (!me) redirect("/onboarding");

  const rooms = await listRoomsForUser(me.id);

  return (
    <div className="flex h-dvh overflow-hidden bg-canvas">
      <nav className="hidden w-14 shrink-0 flex-col items-center justify-between border-r border-line bg-surface py-3 sm:flex">
        <div className="flex flex-col items-center gap-1">
          {RAIL.map((item) =>
            item.live && item.href ? (
              <Link
                key={item.key}
                href={item.href}
                aria-label={item.label}
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-raised text-ink"
              >
                <RailIcon name={item.key} />
              </Link>
            ) : (
              <span
                key={item.key}
                title={item.label}
                aria-disabled
                className="flex h-10 w-10 cursor-not-allowed items-center justify-center rounded-lg text-faint/60"
              >
                <RailIcon name={item.key} />
              </span>
            ),
          )}
        </div>

        <UserButton appearance={{ elements: { avatarBox: { width: 32, height: 32 } } }} />
      </nav>

      <aside className="hidden w-84 shrink-0 flex-col border-r border-line bg-surface sm:flex">
        <ChatList rooms={rooms} />

        <div className="border-t border-line px-4 py-2.5">
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
