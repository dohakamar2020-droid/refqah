import { mkdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import * as schema from "./schema";

export { schema };
export * from "./schema";

/**
 * Database client.
 *
 * - If DATABASE_URL is set → Neon PostgreSQL (serverless driver, works on Vercel).
 * - Otherwise → embedded PGlite (a real Postgres engine compiled to WASM) stored
 *   under PGLITE_DIR, so the exact same Drizzle/Postgres code runs locally with
 *   no external service.
 *
 * The client is created lazily (via the Proxy below) so that merely importing
 * this module — e.g. inside a `next build` worker — does not open/lock the
 * PGlite data directory.
 */
function createDb() {
  if (process.env.DATABASE_URL) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    return drizzleNeon(pool, { schema });
  }
  const dir = process.env.PGLITE_DIR ?? "./.data/pglite";
  // PGlite will not create nested directories itself.
  mkdirSync(dir, { recursive: true });
  const client = new PGlite(dir);
  return drizzlePglite(client, { schema });
}

type Db = ReturnType<typeof createDb>;

const globalForDb = globalThis as unknown as { __refqahDb?: Db };

function getDb(): Db {
  return (globalForDb.__refqahDb ??= createDb());
}

export const db: Db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb() as object, prop, receiver);
  },
});
