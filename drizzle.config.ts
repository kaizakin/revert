import { defineConfig } from "drizzle-kit";

import "./src/server/env";

export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Migrations run against the direct connection, not the pooler.
    url: process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL!,
  },
  strict: true,
  verbose: true,
});
