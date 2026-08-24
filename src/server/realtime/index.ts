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

import { createSupabaseTransport } from "./supabase";
import { channelFor, type RealtimeEvent, type RealtimeTransport } from "./types";

export { channelFor };
export type { RealtimeEvent, RealtimeTransport };

const noop: RealtimeTransport = {
  channelFor,
  async publish(event) {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[realtime] no transport configured, dropping", event.type);
    }
  },
};

let resolved: RealtimeTransport | null = null;

/**
 * Resolved on first use rather than at module load.
 *
 * This previously used require() inside an ES module to avoid pulling the
 * service-role key into a client bundle. That works in dev and is fragile in a
 * bundled serverless build, where `require` may not exist at all — and because
 * it ran at module scope, a failure took down every route that imports this
 * file, surfacing as an opaque 500 rather than an error anyone could read.
 *
 * A static import is safe here: this module is server-only, and the key is read
 * at call time, not import time.
 */
function getTransport(): RealtimeTransport {
  if (resolved) return resolved;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  resolved = url && key ? createSupabaseTransport(url, key) : noop;
  return resolved;
}

export const transport: RealtimeTransport = {
  channelFor,
  publish: (event) => getTransport().publish(event),
};
