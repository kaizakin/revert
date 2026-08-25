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

      <div className="hidden flex-1 items-center justify-center chat-pattern px-6 md:flex">
        <div className="flex max-w-sm flex-col items-center text-center p-8 rounded-3xl bg-surface/80 border border-line/60 shadow-lg backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-soft text-accent shadow-sm ring-1 ring-accent/20">
            <svg viewBox="0 0 24 24" className="h-8 w-8" aria-hidden>
              <path
                d="M21 12a8 8 0 01-11.6 7.1L4 21l1.9-5.4A8 8 0 1121 12z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <h3 className="text-lg font-bold text-ink tracking-tight">Your Conversations</h3>
          <p className="mt-1.5 text-xs text-muted leading-relaxed">
            Select a chat from the sidebar to view messages, interact with members, and post replies.
          </p>

          {first && (
            <div className="mt-6 w-full">
              <Link
                href={`/chat/${first.slug}`}
                className="flex items-center justify-center gap-2 w-full rounded-xl bg-accent px-4 py-2.5 text-xs font-bold text-accent-ink shadow-sm transition-all hover:brightness-105 active:scale-95"
              >
                <span>Open {first.name}</span>
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                  <path
                    d="M5 12h14M12 5l7 7-7 7"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
