import type { NextRequest } from "next/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";

import { checkUsername } from "@/lib/username";
import { softDeleteByClerkId, upsertFromClerk } from "@/server/users/sync";

/**
 * Authoritative user sync in production. Configure at Clerk > Webhooks with
 * events user.created, user.updated and user.deleted, pointing at
 * /api/webhooks/clerk, and put the signing secret in
 * CLERK_WEBHOOK_SIGNING_SECRET.
 *
 * This route is public in src/proxy.ts — it must be, since Clerk calls it
 * unauthenticated. Its only trust boundary is the Svix signature, which is why
 * verifyWebhook runs before anything else touches the database.
 */
export async function POST(req: NextRequest) {
  if (!process.env.CLERK_WEBHOOK_SIGNING_SECRET) {
    // Fail loudly rather than accepting unsigned payloads.
    return new Response("Webhook not configured", { status: 500 });
  }

  let event: Awaited<ReturnType<typeof verifyWebhook>>;
  try {
    event = await verifyWebhook(req);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "user.created":
      case "user.updated": {
        const data = event.data;

        const primary = data.email_addresses.find(
          (e) => e.id === data.primary_email_address_id,
        );
        const email = primary?.email_address ?? data.email_addresses[0]?.email_address;

        // No username yet means the user has not finished onboarding. Creating
        // a row now would burn a name in a unique index for nothing.
        const candidate = data.username ? checkUsername(data.username) : null;
        if (!email || !candidate?.ok) {
          return new Response("Skipped: incomplete profile", { status: 200 });
        }

        await upsertFromClerk({
          clerkId: data.id,
          username: candidate.username,
          email,
          avatarUrl: data.image_url ?? null,
          displayName:
            [data.first_name, data.last_name].filter(Boolean).join(" ").trim() || null,
        });

        return new Response("ok", { status: 200 });
      }

      case "user.deleted": {
        if (event.data.id) await softDeleteByClerkId(event.data.id);
        return new Response("ok", { status: 200 });
      }

      default:
        return new Response("ignored", { status: 200 });
    }
  } catch (err) {
    // A 500 makes Clerk retry, which is what we want for a transient DB error.
    console.error("[clerk webhook] failed", event.type, err);
    return new Response("Handler error", { status: 500 });
  }
}
