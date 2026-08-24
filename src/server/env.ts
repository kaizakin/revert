/**
 * Loads env files for standalone scripts (seed, drizzle-kit).
 *
 * Next.js loads .env.local automatically, so the running app never needs this.
 * Plain `dotenv/config` only reads `.env`, which is why scripts were seeing an
 * unset DATABASE_URL. Import this first, before anything that reads process.env.
 */
import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });
