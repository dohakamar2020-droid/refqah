import { sql } from "drizzle-orm";
import { db } from "./index";

/**
 * Schema bootstrap.
 *
 * Drizzle's generated migration (drizzle/0000_init.sql) is the source of truth
 * for production (Neon) via `npm run db:push` / `db:migrate`. This file holds
 * the same DDL written idempotently so the app can also create its own tables
 * on first boot — which makes local development (PGlite) and the very first
 * Vercel deploy work with zero manual steps.
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

CREATE TABLE IF NOT EXISTS "student" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL UNIQUE REFERENCES "user"("id") ON DELETE cascade,
  "display_name" text NOT NULL,
  "avatar_url" text,
  "phone" text,
  "competition_opt_in" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "hadith" (
  "id" text PRIMARY KEY NOT NULL,
  "order" integer NOT NULL UNIQUE,
  "title" text NOT NULL,
  "arabic_text" text NOT NULL,
  "narrator" text,
  "takhrij" text,
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
  "text" text NOT NULL,
  "category" text,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Added after the initial schema: optional WhatsApp number on the student profile
ALTER TABLE "student" ADD COLUMN IF NOT EXISTS "phone" text;

-- الراوي والتخريج: replaced the single "source" field
ALTER TABLE "hadith" ADD COLUMN IF NOT EXISTS "narrator" text;
ALTER TABLE "hadith" ADD COLUMN IF NOT EXISTS "takhrij" text;

CREATE TABLE IF NOT EXISTS "registration_settings" (
  "id" text PRIMARY KEY DEFAULT 'main' NOT NULL,
  "enabled" boolean DEFAULT false NOT NULL,
  "code" text,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

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
