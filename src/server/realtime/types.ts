/**
 * Shared shape for the realtime layer, in its own module so the transport
 * implementation and the entry point do not import each other. A cycle between
 * them resolves fine in dev and can leave one side undefined at module init in
 * a bundled build.
 */

import type { MessageRow } from "@/server/messaging/queries";

export type RealtimeEvent =
  | { type: "message.new"; conversationId: string; messageId: string; message?: MessageRow }
  | { type: "message.edited"; conversationId: string; messageId: string }
  | { type: "message.deleted"; conversationId: string; messageId: string }
  | { type: "reaction.changed"; conversationId: string; messageId: string }
  /** A pin was added, replaced or taken down. Everyone's banner has to follow. */
  | { type: "pin.changed"; conversationId: string; messageId: string };

export interface RealtimeTransport {
  /** Fan out an event to everyone subscribed to a conversation. Server-side only. */
  publish(event: RealtimeEvent): Promise<void>;
  /** Channel name for a conversation, shared by publisher and subscriber. */
  channelFor(conversationId: string): string;
}

export const channelFor = (conversationId: string) => `conversation:${conversationId}`;
