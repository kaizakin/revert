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
const ROOMS = [
  {
    slug: "general",
    name: "general",
    topic: "Introductions and everything else.",
    type: "chat" as const,
    isDefault: true,
  },
  {
    slug: "jobs",
    name: "jobs",
    topic: "Openings, searchable and filterable. Posted by mods.",
    type: "announce" as const,
    isDefault: true,
  },
  {
    slug: "ask",
    name: "ask",
    topic: "Ask anything about resumes, interviews or offers.",
    type: "chat" as const,
    isDefault: true,
  },
  {
    slug: "ama",
    name: "ama",
    topic: "Live sessions. Only the host and mentions of you will notify.",
    type: "ama" as const,
    isDefault: false,
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
