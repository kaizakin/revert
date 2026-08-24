/**
 * Realtime transport boundary.
 *
 * Every message write goes through our own API routes and is persisted first;
 * this layer only fans out what is already committed. Keeping the transport
 * behind one interface means swapping Supabase Realtime for Ably or Centrifugo
 * later is a change to this folder, not to the messaging code.
 *
 * Clients only ever subscribe. Nothing publishes from the browser.
 *
 * SECURITY TODO before real members join: these are public broadcast channels.
 * Anyone holding the publishable key — which ships to every browser — can
 * subscribe to any conversation topic and read messages as they are sent. Fine
 * for an invite-only alpha among people you know; not acceptable for a product
 * whose promise is privacy. The fix is Realtime private channels, with an RLS
 * policy on realtime.messages checked against a Supabase-compatible JWT minted
 * for the signed-in Clerk user.
 */

export type RealtimeEvent =
  | { type: "message.new"; conversationId: string; messageId: string }
  | { type: "message.edited"; conversationId: string; messageId: string }
  | { type: "message.deleted"; conversationId: string; messageId: string }
  | { type: "reaction.changed"; conversationId: string; messageId: string };

export interface RealtimeTransport {
  /** Fan out an event to everyone subscribed to a conversation. Server-side only. */
  publish(event: RealtimeEvent): Promise<void>;
  /** Channel name for a conversation, shared by publisher and subscriber. */
  channelFor(conversationId: string): string;
}

export const channelFor = (conversationId: string) => `conversation:${conversationId}`;

function resolveTransport(): RealtimeTransport {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (url && key) {
    // Imported lazily so the browser bundle never pulls in a module that
    // references the service role key.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createSupabaseTransport } = require("./supabase") as typeof import("./supabase");
    return createSupabaseTransport(url, key);
  }

  return {
    channelFor,
    async publish(event) {
      if (process.env.NODE_ENV !== "production") {
        console.debug("[realtime] no transport configured, dropping", event.type);
      }
    },
  };
}

export const transport: RealtimeTransport = resolveTransport();
