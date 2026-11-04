import { sql } from "drizzle-orm";
import { db } from "./index";

/**
 * Schema bootstrap.
 *
 * Drizzle's generated migrations (drizzle/) are the source of truth for
 * production (Neon) via `npm run db:push` / `db:migrate`. This file holds the
 * same DDL written idempotently so the app can also create — and upgrade — its
 * own tables on boot, which makes local development (PGlite) and the very
 * first Vercel deploy work with zero manual steps.
 *
 * The app started as a single-teacher site and now hosts many teachers side by
 * side; the ALTER statements below upgrade older databases in place:
 *   teacher table → student.teacher_id / hadith.teacher_id / message.teacher_id
 *   student.login_code → per-teacher hadith copies.
 * Data backfill lives in ./tenancy.ts (needs generated codes, so it is code).
 */
const INIT_SQL = `
CREATE TABLE IF NOT EXISTS "user" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "email" text NOT NULL UNIQUE,
  "email_verified" boolean DEFAULT false NOT NULL,
  "image" text,
  "username" text UNIQUE,
  "display_username" text,
  "role" text DEFAULT 'student' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "session" (
  "id" text PRIMARY KEY NOT NULL,
  "expires_at" timestamp NOT NULL,
  "token" text NOT NULL UNIQUE,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "ip_address" text,
  "user_agent" text,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS "account" (
  "id" text PRIMARY KEY NOT NULL,
  "account_id" text NOT NULL,
  "provider_id" text NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "access_token" text,
  "refresh_token" text,
  "id_token" text,
  "access_token_expires_at" timestamp,
  "refresh_token_expires_at" timestamp,
  "scope" text,
  "password" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "verification" (
  "id" text PRIMARY KEY NOT NULL,
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "teacher" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL UNIQUE REFERENCES "user"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "code" text NOT NULL UNIQUE,
  "display_code" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "student" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL UNIQUE REFERENCES "user"("id") ON DELETE cascade,
  "teacher_id" text REFERENCES "teacher"("id") ON DELETE cascade,
  "display_name" text NOT NULL,
  "login_code" text UNIQUE,
  "avatar_url" text,
  "phone" text,
  "competition_opt_in" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "hadith" (
  "id" text PRIMARY KEY NOT NULL,
  "teacher_id" text REFERENCES "teacher"("id") ON DELETE cascade,
  "order" integer NOT NULL,
  "title" text NOT NULL,
  "arabic_text" text NOT NULL,
  "narrator" text,
  "takhrij" text,
  "text_edited" boolean DEFAULT false NOT NULL,
  "published" boolean DEFAULT false NOT NULL,
  "published_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "recitation" (
  "id" text PRIMARY KEY NOT NULL,
  "student_id" text NOT NULL REFERENCES "student"("id") ON DELETE cascade,
  "hadith_id" text NOT NULL REFERENCES "hadith"("id") ON DELETE cascade,
  "recited" boolean DEFAULT false NOT NULL,
  "recited_at" timestamp,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "recitation_note" (
  "id" text PRIMARY KEY NOT NULL,
  "student_id" text NOT NULL REFERENCES "student"("id") ON DELETE cascade,
  "hadith_id" text NOT NULL REFERENCES "hadith"("id") ON DELETE cascade,
  "mistakes" text,
  "body" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "recitation_note_student_hadith_uidx" ON "recitation_note" USING btree ("student_id","hadith_id");
CREATE INDEX IF NOT EXISTS "recitation_note_student_idx" ON "recitation_note" USING btree ("student_id");

CREATE TABLE IF NOT EXISTS "achievement" (
  "id" text PRIMARY KEY NOT NULL,
  "student_id" text NOT NULL REFERENCES "student"("id") ON DELETE cascade,
  "type" text NOT NULL,
  "hadith_id" text REFERENCES "hadith"("id") ON DELETE set null,
  "title" text NOT NULL,
  "description" text,
  "awarded_at" timestamp DEFAULT now() NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "competition_settings" (
  "id" text PRIMARY KEY DEFAULT 'main' NOT NULL,
  "enabled" boolean DEFAULT false NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "message" (
  "id" text PRIMARY KEY NOT NULL,
  "teacher_id" text REFERENCES "teacher"("id") ON DELETE cascade,
  "text" text NOT NULL,
  "category" text,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "site_meta" (
  "key" text PRIMARY KEY NOT NULL,
  "value" text NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "registration_settings" (
  "id" text PRIMARY KEY DEFAULT 'main' NOT NULL,
  "enabled" boolean DEFAULT false NOT NULL,
  "code" text,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- ── Upgrades for databases created before multi-teacher support ──────────
ALTER TABLE "student" ADD COLUMN IF NOT EXISTS "phone" text;
ALTER TABLE "student" ADD COLUMN IF NOT EXISTS "teacher_id" text;
ALTER TABLE "student" ADD COLUMN IF NOT EXISTS "login_code" text;

ALTER TABLE "hadith" ADD COLUMN IF NOT EXISTS "narrator" text;
ALTER TABLE "hadith" ADD COLUMN IF NOT EXISTS "takhrij" text;
ALTER TABLE "hadith" ADD COLUMN IF NOT EXISTS "text_edited" boolean DEFAULT false NOT NULL;
ALTER TABLE "hadith" ADD COLUMN IF NOT EXISTS "teacher_id" text;

ALTER TABLE "message" ADD COLUMN IF NOT EXISTS "teacher_id" text;

-- «order» used to be unique on its own; now each teacher owns her own copy,
-- so uniqueness becomes (teacher_id, order).
ALTER TABLE "hadith" DROP CONSTRAINT IF EXISTS "hadith_order_unique";
ALTER TABLE "hadith" DROP CONSTRAINT IF EXISTS "hadith_order_key";
CREATE UNIQUE INDEX IF NOT EXISTS "hadith_teacher_order_uidx" ON "hadith" ("teacher_id","order");
CREATE UNIQUE INDEX IF NOT EXISTS "student_login_code_uidx" ON "student" ("login_code");
CREATE INDEX IF NOT EXISTS "student_teacher_idx" ON "student" ("teacher_id");
CREATE INDEX IF NOT EXISTS "message_teacher_idx" ON "message" ("teacher_id");

CREATE UNIQUE INDEX IF NOT EXISTS "recitation_student_hadith_uidx" ON "recitation" USING btree ("student_id","hadith_id");
CREATE INDEX IF NOT EXISTS "recitation_hadith_idx" ON "recitation" USING btree ("hadith_id");
CREATE INDEX IF NOT EXISTS "recitation_student_idx" ON "recitation" USING btree ("student_id");
`;

let readyPromise: Promise<void> | null = null;

async function runInit() {
  // One statement per round trip — Postgres' extended query protocol
  // (used by both PGlite and the Neon serverless driver) rejects
  // multi-statement strings.
  const statements = INIT_SQL.split(";\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => (s.endsWith(";") ? s : `${s};`));

  for (const statement of statements) {
    await db.execute(sql.raw(statement));
  }
}

/** Create any missing tables. Safe to call repeatedly; runs once per process. */
export function ensureSchema(): Promise<void> {
  if (!readyPromise) {
    readyPromise = runInit().catch((err) => {
      readyPromise = null; // allow a retry on the next request
      throw err;
    });
  }
  return readyPromise;
}
