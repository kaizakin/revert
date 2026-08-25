/**
 * Idempotent seed. Safe to re-run: every insert is guarded by onConflictDoNothing
 * or a lookup, so running it twice changes nothing.
 *
 *   npm run db:seed
 */
import "../env";

import { eq } from "drizzle-orm";

import { db } from "./index";
import { conversations, spaces } from "./schema";

const SPACE = {
  slug: "revert",
  name: "Revert",
  description: "Job openings, guidance and referrals — without sharing your number.",
};

/**
 * `announce` marks a room where regular members do not post.
 * `ama` marks a room where only the host and direct mentions are allowed to push.
 */
/**
 * One room for now. Extra rooms split a small community into empty rooms —
 * better to have a single busy chat and add #jobs and #ama back when there are
 * enough people to fill them.
 */
const ROOMS = [
  {
    /**
     * The slug is the URL and is deliberately short and stable. It is not
     * derived from the display name, so renaming the group never breaks a
     * link someone already shared.
     */
    slug: "hub",
    name: "Mini Anon Hub",
    topic: "Jobs, questions and everything else. No phone numbers, ever.",
    avatarUrl: "/groups/mini-anon-hub.jpeg",
    type: "chat" as const,
    isDefault: true,
  },
];

async function main() {
  const [space] = await db
    .insert(spaces)
    .values(SPACE)
    .onConflictDoNothing({ target: spaces.slug })
    .returning();

  const spaceRow =
    space ?? (await db.select().from(spaces).where(eq(spaces.slug, SPACE.slug)).limit(1))[0];

  if (!spaceRow) throw new Error("Could not create or find the space.");
  console.log(`space: ${spaceRow.name} (${spaceRow.id})`);

  for (const room of ROOMS) {
    await db
      .insert(conversations)
      .values({
        spaceId: spaceRow.id,
        kind: "room",
        type: room.type,
        slug: room.slug,
        name: room.name,
        topic: room.topic,
        avatarUrl: room.avatarUrl,
        isDefault: room.isDefault,
      })
      .onConflictDoNothing({ target: [conversations.spaceId, conversations.slug] });

    console.log(`  room #${room.slug.padEnd(8)} type=${room.type}`);
  }

  console.log("seed complete");
  process.exit(0);
}

main().catch((err) => {
  console.error("seed failed:", err);
  process.exit(1);
});
