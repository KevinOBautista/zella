import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { PGlite, type Transaction } from "@electric-sql/pglite";
import { citext } from "@electric-sql/pglite/contrib/citext";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

const ROOT = path.resolve(import.meta.dirname, "../..");
const MIGRATIONS_DIR = path.join(ROOT, "supabase/migrations");

export type Db = PGlite;
export type Tx = Transaction;

/**
 * Fresh embedded Postgres with the Supabase shim and every migration in
 * supabase/migrations applied in order — the same files `supabase db push`
 * ships to production.
 */
export async function createMigratedDb(): Promise<Db> {
  const db = await PGlite.create({ extensions: { citext, pg_trgm, pgcrypto } });
  await db.exec(readFileSync(path.join(import.meta.dirname, "supabase-shim.sql"), "utf8"));
  for (const file of readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort()) {
    try {
      await db.exec(readFileSync(path.join(MIGRATIONS_DIR, file), "utf8"));
    } catch (err) {
      throw new Error(`migration ${file} failed: ${(err as Error).message}`);
    }
  }
  return db;
}

export type Actor =
  | { role: "anon" }
  | { role: "authenticated"; userId: string }
  | { role: "service_role" };

/**
 * Runs `fn` the way PostgREST would for a request: JWT claims set for the
 * transaction and the matching database role assumed. Always rolled back
 * unless `commit` is true, so tests stay independent.
 */
export async function as<T>(db: Db, actor: Actor, fn: (tx: Tx) => Promise<T>, opts: { commit?: boolean } = {}): Promise<T> {
  const claims = actor.role === "authenticated" ? { role: actor.role, sub: actor.userId } : { role: actor.role };
  let result: T;
  await db.transaction(async (tx) => {
    await tx.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(claims)]);
    await tx.exec(`set local role ${actor.role}`);
    result = await fn(tx);
    if (!opts.commit) await tx.rollback();
  }).catch((err: unknown) => {
    // PGlite surfaces an explicit rollback as an error; only rethrow real failures.
    if (!(err instanceof Error && /rollback/i.test(err.message))) throw err;
  });
  return result!;
}

/** Captures a Postgres error from `fn` (inside a savepoint-free transaction). */
export async function pgError(fn: () => Promise<unknown>): Promise<{ code?: string; message: string; detail?: string } | null> {
  try {
    await fn();
    return null;
  } catch (err) {
    const e = err as { code?: string; message: string; detail?: string };
    return { code: e.code, message: e.message, detail: e.detail };
  }
}

let counter = 0;

/** Creates an auth user (as the migration role) and returns its id. */
export async function createUser(db: Db, email = `user${++counter}@example.test`): Promise<string> {
  const { rows } = await db.query<{ id: string }>("insert into auth.users (email) values ($1) returning id", [email]);
  return rows[0]!.id;
}

export async function createRealSeller(db: Db, opts: { userId?: string; username?: string } = {}) {
  const userId = opts.userId ?? (await createUser(db));
  const username = opts.username ?? `seller${++counter}x`;
  const { rows } = await db.query<{ id: string }>(
    `insert into seller_profiles (user_id, account_type, display_name, username, city, state)
     values ($1, 'individual', 'Real Seller', $2, 'Buffalo', 'NY') returning id`,
    [userId, username],
  );
  return { userId, sellerId: rows[0]!.id };
}

export async function createRealProperty(db: Db, sellerId: string, opts: { status?: string; visibility?: string } = {}) {
  const slug = `real-${++counter}`;
  const { rows } = await db.query<{ id: string }>(
    `insert into properties (seller_id, slug, title, listing_status, address_line_1, city, state, postal_code, address_visibility, published_at)
     values ($1, $2, 'Real home', $3, '1 Real St', 'Buffalo', 'NY', '14201', $4, now()) returning id`,
    [sellerId, slug, opts.status ?? "for_sale", opts.visibility ?? "full"],
  );
  return { propertyId: rows[0]!.id, slug };
}

export async function createOpenHouse(db: Db, propertyId: string, sellerId: string, startsInHours = 24) {
  const { rows } = await db.query<{ id: string }>(
    `insert into open_houses (property_id, seller_id, starts_at, ends_at)
     values ($1, $2, now() + make_interval(hours => $3), now() + make_interval(hours => $3 + 2)) returning id`,
    [propertyId, sellerId, startsInHours],
  );
  return rows[0]!.id;
}
