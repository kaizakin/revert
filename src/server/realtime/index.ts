/**
 * Realtime transport boundary.
 *
 * Every message write goes through our own API routes and is persisted first;
 * this layer only fans out what is already in the database. Keeping the
 * transport behind one interface means swapping Supabase Realtime for Ably or
 * Centrifugo later is a change to this folder, not to the messaging code.
 *
 * Never publish anything from the client directly — the client only subscribes.
 */

export type RealtimeEvent =
  | { type: "message.new"; conversationId: string; messageId: string }
  | { type: "message.edited"; conversationId: string; messageId: string }
  | { type: "message.deleted"; conversationId: string; messageId: string }
  | { type: "reaction.changed"; conversationId: string; messageId: string }
  | { type: "presence.typing"; conversationId: string; userId: string };

export interface RealtimeTransport {
  /** Fan out an event to everyone subscribed to a conversation. Server-side only. */
  publish(event: RealtimeEvent): Promise<void>;
  /** Channel name for a conversation, shared by publisher and subscriber. */
  channelFor(conversationId: string): string;
}

export const channelFor = (conversationId: string) => `conversation:${conversationId}`;

/**
 * Placeholder until Supabase keys are in place. Implemented in
 * ./supabase.ts once NEXT_PUBLIC_SUPABASE_URL is set.
 */
export const transport: RealtimeTransport = {
  async publish(event) {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[realtime] publish (no transport configured yet)", event);
    }
  },
  channelFor,
};
