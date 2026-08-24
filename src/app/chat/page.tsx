import { redirect } from "next/navigation";

import { listRoomsForUser } from "@/server/messaging/queries";
import { ensureDbUser } from "@/server/users/sync";

/**
 * The chat list itself lives in the layout, so on a phone this route renders
 * as just the list. On a wider screen there is no reason to sit on an empty
 * panel, so it opens the most recent room.
 */
export default async function RoomsIndexPage() {
  const me = await ensureDbUser();
  if (!me) redirect("/onboarding");

  const rooms = await listRoomsForUser(me.id);
  const first = rooms[0];

  return (
    <div className="hidden flex-1 items-center justify-center bg-chat-bg px-6 sm:flex">
      <p className="max-w-xs text-center text-sm leading-relaxed text-muted">
        {first ? (
          <>
            Pick a chat on the left to start reading.
            <br />
            <a href={`/chat/${first.slug}`} className="text-accent underline">
              Open {first.name}
            </a>
          </>
        ) : (
          "You are not in any rooms yet."
        )}
      </p>
    </div>
  );
}
