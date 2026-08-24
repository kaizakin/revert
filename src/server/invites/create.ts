/**
 * Mint invite codes.
 *
 *   npm run invite -- 10          10 single-use codes
 *   npm run invite -- 5 wave1     5 codes labelled wave1
 *   npm run invite -- 1 vip 50    1 code good for 50 uses
 */
import "../env";

import { randomBytes } from "node:crypto";

import { db } from "../db";
import { inviteCodes } from "../db/schema";

/** Crockford-ish alphabet: no O/0, I/1 or L confusion when read off a screen. */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generateCode(): string {
  const bytes = randomBytes(8);
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return `REVERT-${out.slice(0, 4)}-${out.slice(4)}`;
}

async function main() {
  const howMany = Number(process.argv[2] ?? 10);
  const label = process.argv[3] ?? null;
  const maxUses = Number(process.argv[4] ?? 1);

  if (!Number.isInteger(howMany) || howMany < 1 || howMany > 500) {
    throw new Error("Count must be between 1 and 500.");
  }

  const rows = Array.from({ length: howMany }, () => ({
    code: generateCode(),
    label,
    maxUses,
  }));

  const created = await db.insert(inviteCodes).values(rows).returning();

  console.log(`created ${created.length} code(s)${label ? ` labelled ${label}` : ""}, ${maxUses} use(s) each:\n`);
  for (const row of created) console.log("  " + row.code);

  process.exit(0);
}

main().catch((err) => {
  console.error("invite creation failed:", err);
  process.exit(1);
});
