import { auth } from "@clerk/nextjs/server";

/**
 * Diagnostic for deployed environments, where function logs are not always at
 * hand and every database-backed page just returns a bare 500.
 *
 * Reports presence, never values: booleans for the env vars and a short error
 * code for the connection. It sits behind the proxy's auth gate, so it is not
 * public, and it still leaks nothing useful if that ever changes.
 *
 * The database client is imported lazily inside the try. At module scope it
 * throws when DATABASE_URL is missing, which would make this endpoint fail with
 * the same opaque 500 it exists to explain.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) return new Response("Not found", { status: 404 });

  const present = (name: string) => Boolean(process.env[name]?.trim());

  const env = {
    DATABASE_URL: present("DATABASE_URL"),
    DATABASE_URL_DIRECT: present("DATABASE_URL_DIRECT"),
    NEXT_PUBLIC_SUPABASE_URL: present("NEXT_PUBLIC_SUPABASE_URL"),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: present("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    SUPABASE_SERVICE_ROLE_KEY: present("SUPABASE_SERVICE_ROLE_KEY"),
    CLERK_SECRET_KEY: present("CLERK_SECRET_KEY"),
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: present("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"),
  };

  /** Host only, so a misconfigured region or a stale project is visible. */
  let dbHost: string | null = null;
  try {
    const raw = process.env.DATABASE_URL;
    if (raw) dbHost = new URL(raw).host;
  } catch {
    dbHost = "(unparseable)";
  }

  const result: Record<string, unknown> = { env, dbHost };

  try {
    const { db } = await import("@/server/db");
    const { conversations, spaces, users } = await import("@/server/db/schema");

    result.db = "connected";
    result.counts = {
      users: (await db.select().from(users)).length,
      spaces: (await db.select().from(spaces)).length,
      rooms: (await db.select().from(conversations)).map((c) => c.slug),
    };
  } catch (err) {
    const e = err as { code?: string; message?: string; cause?: { code?: string } };
    result.db = "failed";
    result.dbError = {
      code: e.code ?? e.cause?.code ?? null,
      // Message only, never the connection string.
      message: (e.message ?? String(err)).slice(0, 200),
    };
  }

  return Response.json(result, {
    headers: { "cache-control": "no-store" },
  });
}
