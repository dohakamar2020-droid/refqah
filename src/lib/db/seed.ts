import { eq, sql, inArray } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { db } from "./index";
import {
  user,
  student,
  account,
  hadith,
  recitation,
  message,
  competitionSettings,
  registrationSettings,
  siteMeta,
  achievement,
} from "./schema";
import { HADITHS, HADITH_CONTENT_VERSION } from "../data/hadiths";
import { MESSAGES } from "../data/messages";

const isProdDb = Boolean(process.env.DATABASE_URL);

function id(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

const META_CONTENT_VERSION = "hadith_content_version";

async function getMetaValue(key: string): Promise<number | null> {
  const [row] = await db
    .select({ value: siteMeta.value })
    .from(siteMeta)
    .where(eq(siteMeta.key, key))
    .limit(1);
  const n = Number(row?.value);
  return Number.isFinite(n) ? n : null;
}

async function setMetaValue(key: string, value: number) {
  await db
    .insert(siteMeta)
    .values({ key, value: String(value), updatedAt: new Date() })
    .onConflictDoUpdate({
      target: siteMeta.key,
      set: { value: String(value), updatedAt: new Date() },
    });
}

/**
 * Sync the 42 hadiths with the bundled content.
 *
 * Two jobs, in order:
 *  1. Insert any hadith that isn't in the database yet.
 *  2. When HADITH_CONTENT_VERSION is higher than the version recorded in
 *     site_meta, push the new narrator/matn/takhrij over the stored text.
 *     Hadiths the teacher edited herself (textEdited) are left alone so her
 *     own wording is never overwritten.
 *
 * Step 2 is what makes content updates actually reach an existing database —
 * inserting missing rows alone would leave a deployed database on stale text.
 */
async function seedHadiths(): Promise<{ inserted: number; updated: number }> {
  const rows = await db
    .select({
      order: hadith.order,
      textEdited: hadith.textEdited,
      narrator: hadith.narrator,
      arabicText: hadith.arabicText,
      takhrij: hadith.takhrij,
    })
    .from(hadith);

  const stored = rows.reduce<Map<number, (typeof rows)[number]>>((m, r) => {
    m.set(r.order, r);
    return m;
  }, new Map());

  // 1 ── insert what's missing
  const missing = HADITHS.filter((h) => !stored.has(h.order));
  if (missing.length > 0) {
    await db.insert(hadith).values(
      missing.map((h) => ({
        id: id("had"),
        order: h.order,
        title: h.title,
        narrator: h.narrator,
        arabicText: h.arabicText,
        takhrij: h.takhrij,
        published: false,
      }))
    );
  }

  // 2 ── push new content when the bundled version moved forward
  const applied = await getMetaValue(META_CONTENT_VERSION);
  const needsSync =
    process.env.FORCE_HADITH_SYNC === "true" ||
    applied === null ||
    applied < HADITH_CONTENT_VERSION;

  let updated = 0;
  if (needsSync) {
    for (const h of HADITHS) {
      const row = stored.get(h.order);
      if (!row || row.textEdited) continue;
      if (
        row.narrator === h.narrator &&
        row.arabicText === h.arabicText &&
        row.takhrij === h.takhrij
      )
        continue;
      await db
        .update(hadith)
        .set({
          narrator: h.narrator,
          arabicText: h.arabicText,
          takhrij: h.takhrij,
          updatedAt: new Date(),
        })
        .where(eq(hadith.order, h.order));
      updated++;
    }
    await setMetaValue(META_CONTENT_VERSION, HADITH_CONTENT_VERSION);
  }

  return { inserted: missing.length, updated };
}

/** Insert the encouragement message library once. */
async function seedMessages() {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(message);
  if ((row?.n ?? 0) > 0) return;
  await db.insert(message).values(
    MESSAGES.map((m) => ({
      id: id("msg"),
      text: m.text,
      category: m.category,
      active: true,
    }))
  );
}

async function seedCompetitionSettings() {
  await db
    .insert(competitionSettings)
    .values({ id: "main", enabled: false })
    .onConflictDoNothing();
  // Self-registration starts switched OFF — the teacher turns it on.
  await db
    .insert(registrationSettings)
    .values({ id: "main", enabled: false, code: null })
    .onConflictDoNothing();
}

/** Create a login (user + credential account + optional student profile). */
export async function createUserWithPassword(input: {
  name: string;
  email: string;
  username: string;
  password: string;
  role: "admin" | "student";
  displayName?: string;
  competitionOptIn?: boolean;
}) {
  const userId = id("usr");
  const now = new Date();

  await db.insert(user).values({
    id: userId,
    name: input.name,
    email: input.email.toLowerCase(),
    emailVerified: true,
    username: input.username.toLowerCase(),
    displayUsername: input.username,
    role: input.role,
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(account).values({
    id: id("acc"),
    accountId: userId,
    providerId: "credential",
    userId,
    password: await hashPassword(input.password),
    createdAt: now,
    updatedAt: now,
  });

  if (input.role === "student") {
    const studentId = id("stu");
    await db.insert(student).values({
      id: studentId,
      userId,
      displayName: input.displayName || input.name,
      competitionOptIn: input.competitionOptIn ?? false,
      createdAt: now,
      updatedAt: now,
    });
    return { userId, studentId };
  }
  return { userId, studentId: null };
}

/**
 * Publish the first 12 hadiths for the local demo database so the journey and
 * the grid have something to show. Never runs against a real (Neon) database.
 */
async function seedDemoPublished() {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(hadith)
    .where(eq(hadith.published, true));
  if ((row?.n ?? 0) > 0) return;
  const now = new Date();
  await db
    .update(hadith)
    .set({ published: true, publishedAt: now })
    .where(inArray(hadith.order, Array.from({ length: 12 }, (_, i) => i + 1)));
}

/**
 * Create the teacher account — but ONLY when explicitly asked for.
 *
 * The app never ships with a default password any more: a fresh installation
 * shows the first-run setup screen (/setup) where the teacher chooses her own
 * credentials. This function exists for headless/CI provisioning, and is
 * reachable from `npm run seed` via SEED_ADMIN=true.
 */
export async function seedAdminFromEnv() {
  if (await hasAdmin()) return false;

  const username = process.env.ADMIN_USERNAME || "admin";
  const email = process.env.ADMIN_EMAIL || "admin@refqah.local";
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return false;

  await createUserWithPassword({
    name: process.env.ADMIN_NAME || "المعلمة",
    email,
    username,
    password,
    role: "admin",
  });
  return true;
}

/** Is there at least one teacher account? */
export async function hasAdmin(): Promise<boolean> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(user)
    .where(eq(user.role, "admin"));
  return (row?.n ?? 0) > 0;
}

/* ── Demo data ─────────────────────────────────────────────── */

const DEMO_STUDENTS = [
  { name: "مريم أحمد", username: "maryam", optIn: true, strength: 0.9 },
  { name: "سارة محمود", username: "sara", optIn: true, strength: 0.8 },
  { name: "نور الدين حسن", username: "nour", optIn: true, strength: 0.7 },
  { name: "فاطمة علي", username: "fatima", optIn: false, strength: 0.6 },
  { name: "آية خالد", username: "aya", optIn: true, strength: 0.5 },
  { name: "رحمة إبراهيم", username: "rahma", optIn: false, strength: 0.45 },
  { name: "زينب عمر", username: "zainab", optIn: false, strength: 0.3 },
  { name: "هاجر مصطفى", username: "hajar", optIn: true, strength: 0.2 },
];

/**
 * Populate demo students + sample recitations so the UI can be explored.
 * Only runs when the database has no students yet.
 */
async function seedDemoStudents() {
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(student);
  if ((row?.n ?? 0) > 0) return;

  const published = await db
    .select()
    .from(hadith)
    .where(eq(hadith.published, true));
  if (published.length === 0) return;

  const ordered = published.sort((a, b) => a.order - b.order);
  let seed = 42;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  for (const s of DEMO_STUDENTS) {
    const { studentId } = await createUserWithPassword({
      name: s.name,
      email: `${s.username}@refqah.local`,
      username: s.username,
      password: "refqah2025",
      role: "student",
      displayName: s.name,
      competitionOptIn: s.optIn,
    });
    if (!studentId) continue;

    const rows = ordered
      .filter(() => rand() < s.strength)
      .map((h, i) => ({
        id: id("rec"),
        studentId,
        hadithId: h.id,
        recited: true,
        recitedAt: new Date(Date.now() - (ordered.length - i) * 3600_000),
        updatedAt: new Date(),
      }));
    if (rows.length) await db.insert(recitation).values(rows);
  }

  // Make sure hadith #1 has a clear "first" for the سابقة الخيرات badge.
  await syncFirstHadithAchievement();
}

/**
 * «سَابِقَةُ الخَيْرَات» — أول من أتمّت تسميع الحديث الأول حسب وقت الاعتماد.
 * Runs after every change so a corrected mistake re-computes the holder.
 */
export async function syncFirstHadithAchievement() {
  const [first] = await db
    .select({ id: hadith.id, order: hadith.order })
    .from(hadith)
    .where(eq(hadith.order, 1))
    .limit(1);
  if (!first) return;

  const winners = await db
    .select({
      studentId: recitation.studentId,
      recitedAt: recitation.recitedAt,
      displayName: student.displayName,
    })
    .from(recitation)
    .innerJoin(student, eq(student.id, recitation.studentId))
    .where(
      sql`${recitation.hadithId} = ${first.id} and ${recitation.recited} = true and ${recitation.recitedAt} is not null`
    )
    .orderBy(recitation.recitedAt)
    .limit(1);

  const winner = winners[0];

  // Clear any existing first-hadith badge first (handles teacher corrections).
  const existing = await db
    .select()
    .from(achievement)
    .where(eq(achievement.type, "first_hadith"));
  if (existing.length) {
    await db
      .delete(achievement)
      .where(
        inArray(
          achievement.id,
          existing.map((a) => a.id)
        )
      );
  }

  if (!winner) return;

  await db.insert(achievement).values({
    id: id("ach"),
    studentId: winner.studentId,
    type: "first_hadith",
    hadithId: first.id,
    title: "سَابِقَةُ الخَيْرَات",
    description: `أول من أتمّت تسميع الحديث الأول — ${winner.displayName}`,
    awardedAt: winner.recitedAt ?? new Date(),
    createdAt: new Date(),
  });
}

let seedPromise: Promise<void> | null = null;

/**
 * Idempotent content seeding: hadiths, messages, competition settings, and the
 * first teacher account. Demo students only when explicitly enabled, or
 * automatically for the local PGlite database so the app is explorable.
 */
export function ensureSeed(): Promise<void> {
  if (!seedPromise) {
    seedPromise = (async () => {
      await seedHadiths();
      await seedMessages();
      await seedCompetitionSettings();
      // NOTE: the teacher account is NOT created here on purpose — a fresh
      // install must go through the first-run setup screen at /setup.
      const wantDemo = process.env.SEED_DEMO_STUDENTS
        ? process.env.SEED_DEMO_STUDENTS === "true"
        : !isProdDb;
      if (wantDemo) {
        await seedDemoPublished();
        await seedDemoStudents();
      }
      if (process.env.SEED_ADMIN === "true") await seedAdminFromEnv();
    })().catch((err) => {
      seedPromise = null;
      throw err;
    });
  }
  return seedPromise;
}
