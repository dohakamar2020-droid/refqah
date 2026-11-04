import { eq, sql } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { db } from "./index";
import {
  user,
  account,
  student,
  teacher,
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
import {
  generateUniqueCode,
  STUDENT_CODE_PREFIX,
  TEACHER_CODE_PREFIX,
} from "../codes";

const isProdDb = Boolean(process.env.DATABASE_URL);

function id(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

const META_CONTENT_VERSION_PREFIX = "hadith_content_version";

function contentVersionKey(teacherId: string) {
  return `${META_CONTENT_VERSION_PREFIX}:${teacherId}`;
}

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

/* ────────────────────────────────
 * Codes
 * ──────────────────────────────── */

/** A code is unique across teachers and students alike. */
export async function isCodeTaken(code: string): Promise<boolean> {
  const [t] = await db
    .select({ id: teacher.id })
    .from(teacher)
    .where(eq(teacher.code, code))
    .limit(1);
  if (t) return true;
  const [s] = await db
    .select({ id: student.id })
    .from(student)
    .where(eq(student.loginCode, code))
    .limit(1);
  return Boolean(s);
}

export function newTeacherCode(): Promise<string> {
  return generateUniqueCode(TEACHER_CODE_PREFIX, isCodeTaken);
}

export function newStudentCode(): Promise<string> {
  return generateUniqueCode(STUDENT_CODE_PREFIX, isCodeTaken);
}

/** A username derived from a code, safe for the username plugin validator. */
export function usernameFromCode(code: string): string {
  return code.replace(/-/g, "").toLowerCase().slice(0, 28);
}

/* ────────────────────────────────
 * Per-teacher content
 * ──────────────────────────────── */

/**
 * Sync the 42 hadiths with the bundled content — for one teacher.
 *
 * Two jobs, in order:
 *  1. Insert any hadith that isn't in this teacher's copy yet.
 *  2. When HADITH_CONTENT_VERSION is higher than the version recorded for her,
 *     push the new narrator/matn/takhrij over the stored text.
 *     Hadiths the teacher edited herself (textEdited) are left alone so her
 *     own wording is never overwritten.
 *
 * Two side effects matter for privacy and correctness:
 *   - A brand-new teacher starts with nothing published, so she opens her own
 *     journey and her students see only what she published.
 *   - Each teacher's copy is independent: editing a hadith in one space never
 *     touches another teacher's class.
 */
export async function seedHadithsForTeacher(
  teacherId: string
): Promise<{ inserted: number; updated: number }> {
  const rows = await db
    .select({
      order: hadith.order,
      textEdited: hadith.textEdited,
      narrator: hadith.narrator,
      arabicText: hadith.arabicText,
      takhrij: hadith.takhrij,
    })
    .from(hadith)
    .where(eq(hadith.teacherId, teacherId));

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
        teacherId,
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
  const versionKey = contentVersionKey(teacherId);
  const applied = await getMetaValue(versionKey);
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
        .where(sql`${hadith.teacherId} = ${teacherId} and ${hadith.order} = ${h.order}`);
      updated++;
    }
    await setMetaValue(versionKey, HADITH_CONTENT_VERSION);
  }

  return { inserted: missing.length, updated };
}

/** Insert the encouragement message library for one teacher (once). */
export async function seedMessagesForTeacher(teacherId: string) {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(message)
    .where(eq(message.teacherId, teacherId));
  if ((row?.n ?? 0) > 0) return;
  await db.insert(message).values(
    MESSAGES.map((m) => ({
      id: id("msg"),
      teacherId,
      text: m.text,
      category: m.category,
      active: true,
    }))
  );
}

/** Create the per-teacher switches (competition + self-registration). */
export async function seedSettingsForTeacher(teacherId: string) {
  await db
    .insert(competitionSettings)
    .values({ id: teacherId, enabled: false })
    .onConflictDoNothing();
  // Self-registration starts switched OFF — the teacher turns it on.
  await db
    .insert(registrationSettings)
    .values({ id: teacherId, enabled: false, code: null })
    .onConflictDoNothing();
}

/** Everything a teacher's new, empty space needs. */
export async function seedTeacherSpace(teacherId: string) {
  await seedHadithsForTeacher(teacherId);
  await seedMessagesForTeacher(teacherId);
  await seedSettingsForTeacher(teacherId);
}

/* ────────────────────────────────
 * Accounts
 * ──────────────────────────────── */

/** Create a login (user + credential account + optional student profile). */
export async function createUserWithPassword(input: {
  name: string;
  email: string;
  username: string;
  password: string;
  role: "admin" | "student";
  displayName?: string;
  competitionOptIn?: boolean;
  /** المعلمة صاحبة الحساب (للطالبات) */
  teacherId?: string | null;
  /** كود دخول الطالبة */
  loginCode?: string | null;
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
      teacherId: input.teacherId ?? null,
      displayName: input.displayName || input.name,
      loginCode: input.loginCode ?? null,
      competitionOptIn: input.competitionOptIn ?? false,
      createdAt: now,
      updatedAt: now,
    });
    return { userId, studentId };
  }
  return { userId, studentId: null };
}

/** Create a teacher row for an existing admin user (and seed her space). */
export async function createTeacherProfile(input: {
  userId: string;
  name: string;
  code?: string;
}) {
  const code = input.code ?? (await newTeacherCode());
  const now = new Date();
  const teacherId = id("tch");

  await db.insert(teacher).values({
    id: teacherId,
    userId: input.userId,
    name: input.name,
    code,
    displayCode: code,
    createdAt: now,
    updatedAt: now,
  });

  await seedTeacherSpace(teacherId);
  return { teacherId, code };
}

/**
 * «سَابِقَةُ الخَيْرَات» — أول من أتمّت تسميع الحديث الأول حسب وقت الاعتماد.
 * Scoped to one teacher: her students and her copy of hadith #1.
 * Runs after every change so a corrected mistake re-computes the holder.
 */
export async function syncFirstHadithAchievement(teacherId: string) {
  const [first] = await db
    .select({ id: hadith.id, order: hadith.order })
    .from(hadith)
    .where(sql`${hadith.teacherId} = ${teacherId} and ${hadith.order} = 1`)
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
      sql`${student.teacherId} = ${teacherId} and ${recitation.hadithId} = ${first.id} and ${recitation.recited} = true and ${recitation.recitedAt} is not null`
    )
    .orderBy(recitation.recitedAt)
    .limit(1);

  const winner = winners[0];

  // Clear this teacher's existing first-hadith badge (handles corrections).
  const existing = await db
    .select({ id: achievement.id })
    .from(achievement)
    .innerJoin(student, eq(student.id, achievement.studentId))
    .where(
      sql`${student.teacherId} = ${teacherId} and ${achievement.type} = 'first_hadith'`
    );
  for (const a of existing) {
    await db.delete(achievement).where(eq(achievement.id, a.id));
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

/* ────────────────────────────────
 * First teacher (headless provisioning)
 * ──────────────────────────────── */

/**
 * Create the teacher account — but ONLY when explicitly asked for.
 *
 * The app never ships with a default password any more: a fresh installation
 * shows the first-run setup screen (/setup) where the teacher chooses her own
 * code, name and password. This function exists for headless/CI provisioning,
 * and is reachable from `npm run seed` via SEED_ADMIN=true.
 */
export async function seedAdminFromEnv() {
  if (await hasAnyTeacher()) return false;

  const password = process.env.ADMIN_PASSWORD;
  if (!password) return false;

  const code = process.env.ADMIN_CODE || (await newTeacherCode());
  const username = usernameFromCode(code);
  const email = process.env.ADMIN_EMAIL || `${username}@refqah.local`;
  const name = process.env.ADMIN_NAME || "المعلمة";

  const { userId } = await createUserWithPassword({
    name,
    email,
    username,
    password,
    role: "admin",
  });
  await createTeacherProfile({ userId, name, code });
  return true;
}

/** Is there at least one teacher account? */
export async function hasAnyTeacher(): Promise<boolean> {
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(teacher);
  return (row?.n ?? 0) > 0;
}

/* ── Demo data ─────────────────────────────────────────────── */

const DEMO_STUDENTS = [
  { name: "مريم أحمد", optIn: true, strength: 0.9 },
  { name: "سارة محمود", optIn: true, strength: 0.8 },
  { name: "نور الدين حسن", optIn: true, strength: 0.7 },
  { name: "فاطمة علي", optIn: false, strength: 0.6 },
  { name: "آية خالد", optIn: true, strength: 0.5 },
  { name: "رحمة إبراهيم", optIn: false, strength: 0.45 },
  { name: "زينب عمر", optIn: false, strength: 0.3 },
  { name: "هاجر مصطفى", optIn: true, strength: 0.2 },
];

/** Publish the first 12 hadiths for one teacher's demo space. */
async function seedDemoPublished(teacherId: string) {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(hadith)
    .where(sql`${hadith.teacherId} = ${teacherId} and ${hadith.published} = true`);
  if ((row?.n ?? 0) > 0) return;
  const now = new Date();
  await db
    .update(hadith)
    .set({ published: true, publishedAt: now })
    .where(
      sql`${hadith.teacherId} = ${teacherId} and ${hadith.order} between 1 and 12`
    );
}

/**
 * Populate demo students + sample recitations for a teacher's space so the UI
 * can be explored. Only runs when she has no students yet.
 */
export async function seedDemoStudentsForTeacher(teacherId: string) {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(student)
    .where(eq(student.teacherId, teacherId));
  if ((row?.n ?? 0) > 0) return;

  const published = await db
    .select()
    .from(hadith)
    .where(sql`${hadith.teacherId} = ${teacherId} and ${hadith.published} = true`);
  if (published.length === 0) return;

  const ordered = published.sort((a, b) => a.order - b.order);
  let seed = 42;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  for (const s of DEMO_STUDENTS) {
    const code = await newStudentCode();
    const username = usernameFromCode(code);
    const { studentId } = await createUserWithPassword({
      name: s.name,
      email: `${username}@refqah.local`,
      username,
      password: "refqah2025",
      role: "student",
      displayName: s.name,
      competitionOptIn: s.optIn,
      teacherId,
      loginCode: code,
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
  await syncFirstHadithAchievement(teacherId);
}

/* ────────────────────────────────
 * Boot seeding
 * ──────────────────────────────── */

/**
 * Whether new teachers on THIS installation get demo students. Only local
 * (PGlite) development does, unless SEED_DEMO_STUDENTS says otherwise.
 */
export function demoSeedingEnabled(): boolean {
  return process.env.SEED_DEMO_STUDENTS
    ? process.env.SEED_DEMO_STUDENTS === "true"
    : !isProdDb;
}

let seedPromise: Promise<void> | null = null;

/**
 * Idempotent content seeding for every teacher space: hadiths, messages and
 * the per-teacher switches, plus the first teacher account from the env.
 */
export function ensureSeed(): Promise<void> {
  if (!seedPromise) {
    seedPromise = (async () => {
      if (process.env.SEED_ADMIN === "true") await seedAdminFromEnv();

      const teachers = await db
        .select({ id: teacher.id })
        .from(teacher)
        .orderBy(teacher.createdAt);
      for (const t of teachers) {
        await seedTeacherSpace(t.id);
      }

      // Local development only: give the very first space demo students so the
      // screens can be explored. No-op once she has students of her own, and
      // never applied to a second teacher's space.
      if (teachers.length === 1 && demoSeedingEnabled()) {
        const first = teachers[0].id;
        await seedDemoPublished(first);
        await seedDemoStudentsForTeacher(first);
      }
    })().catch((err) => {
      seedPromise = null;
      throw err;
    });
  }
  return seedPromise;
}
/**
 * Local development nicety: give the very FIRST teacher space a few demo
 * students and publish the first 12 hadiths so the screens can be explored.
 *
 * Only the first teacher is filled: any teacher who opens her own space after
 * that starts with a real, empty class — her students are hers alone, and the
 * demo names never appear in a second space.
 */
export async function maybeSeedDemoForTeacher(teacherId: string) {
  if (!demoSeedingEnabled()) return;
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(teacher);
  if ((row?.n ?? 0) > 1) return;
  await seedDemoPublished(teacherId);
  await seedDemoStudentsForTeacher(teacherId);
}
