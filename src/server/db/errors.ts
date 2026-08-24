/**
 * postgres.js wraps the driver error inside `cause`, so the constraint name is
 * never on the top-level message. Reading err.message directly means unique
 * violations get reported to users as "something went wrong", which is how a
 * taken username ends up looking like a server fault.
 */

export type PgErrorInfo = {
  code?: string;
  constraint?: string;
};

/** Walk the cause chain and pull out the Postgres error code and constraint. */
export function pgError(err: unknown): PgErrorInfo {
  let current: unknown = err;

  for (let depth = 0; current && depth < 5; depth++) {
    if (typeof current === "object") {
      const candidate = current as { code?: unknown; constraint_name?: unknown; cause?: unknown };

      const code = typeof candidate.code === "string" ? candidate.code : undefined;
      const constraint =
        typeof candidate.constraint_name === "string" ? candidate.constraint_name : undefined;

      if (code || constraint) return { code, constraint };

      current = candidate.cause;
      continue;
    }
    break;
  }

  return {};
}

/** 23505 is unique_violation. */
export function isUniqueViolation(err: unknown, constraint?: string): boolean {
  const info = pgError(err);
  if (info.code !== "23505") return false;
  return constraint ? info.constraint === constraint : true;
}
