import Link from "next/link";
import { redirect } from "next/navigation";

import { listRoomsForUser } from "@/server/messaging/queries";
import { ensureDbUser } from "@/server/users/sync";

import { ChatList } from "./chat-list";

/**
 * On a narrow screen the layout hides its sidebar, so this route has to render
 * the chat list itself — otherwise going back from a room landed on an empty
 * panel meant for wide screens, with no way to reach another chat.
 *
 * Above md the sidebar is present, so the list would be duplicated; there this
 * shows a placeholder instead.
 */
export default async function ChatIndexPage() {
  const me = await ensureDbUser();
  if (!me) redirect("/onboarding");

  const rooms = await listRoomsForUser(me.id);
  const first = rooms[0];

  return (
    <>
      <div className="flex flex-1 flex-col bg-surface md:hidden">
        <ChatList rooms={rooms} />
      </div>

      <div className="hidden flex-1 items-center justify-center bg-chat-bg px-6 md:flex">
        <p className="max-w-xs text-center text-sm leading-relaxed text-muted">
          {first ? (
            <>
              Pick a chat on the left to start reading.
              <br />
              <Link href={`/chat/${first.slug}`} className="text-accent underline">
                Open {first.name}
              </Link>
            </>
          ) : (
            "You are not in any rooms yet."
          )}
        </p>
      </div>
    </>
  );
}
