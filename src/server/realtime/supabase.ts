import { channelFor, type RealtimeEvent, type RealtimeTransport } from "./types";

/**
 * Publishes over Realtime's HTTP broadcast endpoint rather than opening a
 * websocket from the server. A serverless function that has to connect, wait
 * for SUBSCRIBED, then send, pays that handshake on every message — and may be
 * frozen before it finishes.
 */
export function createSupabaseTransport(url: string, serviceKey: string): RealtimeTransport {
  const endpoint = `${url.replace(/\/$/, "")}/realtime/v1/api/broadcast`;

  return {
    channelFor,

    async publish(event: RealtimeEvent) {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          messages: [
            {
              topic: channelFor(event.conversationId),
              event: event.type,
              payload: event,
            },
          ],
        }),
      });

      if (!res.ok) {
        // A failed broadcast must not fail the request. The message is already
        // committed; the reader will catch up on their next fetch or reload.
        console.error("[realtime] broadcast failed", res.status, await res.text());
      }
    },
  };
}
