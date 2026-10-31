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
  achievement,
} from "./schema";
import { HADITHS } from "../data/hadiths";
import { MESSAGES } from "../data/messages";

const isProdDb = Boolean(process.env.DATABASE_URL);

function id(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

/** Insert the 42 hadiths (keeps whatever the teacher already changed). */
async function seedHadiths() {
  const existing = await db
    .select({ order: hadith.order })
    .from(hadith);
  const have = new Set(existing.map((h) => h.order));
  const missing = HADITHS.filter((h) => !have.has(h.order));
  if (missing.length === 0) return;
  await db.insert(hadith).values(
    missing.map((h) => ({
      id: id("had"),
      order: h.order,
      title: h.title,
      arabicText: h.arabicText,
      source: h.source,
      published: false,
    }))
  );
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

/** Create the teacher account if the app has no users yet. */
async function seedAdmin() {
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(user);
  if ((row?.n ?? 0) > 0) return;

  const username = process.env.ADMIN_USERNAME || "admin";
  const email = process.env.ADMIN_EMAIL || "admin@refqah.local";
  const password = process.env.ADMIN_PASSWORD || "admin12345";

  await createUserWithPassword({
    name: "المعلمة",
    email,
    username,
    password,
    role: "admin",
  });
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
      await seedAdmin();
      const wantDemo = process.env.SEED_DEMO_STUDENTS
        ? process.env.SEED_DEMO_STUDENTS === "true"
        : !isProdDb;
      if (wantDemo) {
        await seedDemoPublished();
        await seedDemoStudents();
      }
    })().catch((err) => {
      seedPromise = null;
      throw err;
    });
  }
  return seedPromise;
}
