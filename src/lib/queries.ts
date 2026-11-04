import "server-only";
import { cache } from "react";
import { eq, sql, desc, asc, and, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  hadith,
  teacher,
  student,
  user,
  recitation,
  achievement,
  competitionSettings,
  registrationSettings,
  message,
} from "@/lib/db/schema";
import { ensureReady } from "@/lib/db/ready";

const TOTAL_HADITHS = 42;

/* ────────────────────────────────
 * Hadiths — one copy per teacher
 * ──────────────────────────────── */

export type HadithRow = {
  id: string;
  order: number;
  title: string;
  arabicText: string;
  narrator: string | null;
  takhrij: string | null;
  textEdited: boolean;
  published: boolean;
  publishedAt: Date | null;
};

export async function getAllHadiths(teacherId: string): Promise<HadithRow[]> {
  await ensureReady();
  return db
    .select({
      id: hadith.id,
      order: hadith.order,
      title: hadith.title,
      arabicText: hadith.arabicText,
      narrator: hadith.narrator,
      takhrij: hadith.takhrij,
      textEdited: hadith.textEdited,
      published: hadith.published,
      publishedAt: hadith.publishedAt,
    })
    .from(hadith)
    .where(eq(hadith.teacherId, teacherId))
    .orderBy(asc(hadith.order));
}

export async function getPublishedHadiths(teacherId: string): Promise<HadithRow[]> {
  const all = await getAllHadiths(teacherId);
  return all.filter((h) => h.published);
}

/** «الحديث المنشور حالياً: X من 42» — for one teacher's journey. */
export async function getJourneyProgress(teacherId: string) {
  const all = await getAllHadiths(teacherId);
  const published = all.filter((h) => h.published);
  const current = published.length ? published[published.length - 1] : null;
  return {
    publishedCount: published.length,
    total: all.length || TOTAL_HADITHS,
    currentOrder: current?.order ?? null,
    currentTitle: current?.title ?? null,
  };
}

/* ────────────────────────────────
 * Students — within one teacher's space
 * ──────────────────────────────── */

export type StudentRow = {
  id: string;
  userId: string;
  displayName: string;
  /** كود دخول الطالبة — تعرضه المعلمة لها */
  loginCode: string | null;
  phone: string | null;
  competitionOptIn: boolean;
  email: string;
  username: string | null;
};

export async function getStudents(teacherId: string): Promise<StudentRow[]> {
  await ensureReady();
  return db
    .select({
      id: student.id,
      userId: student.userId,
      displayName: student.displayName,
      loginCode: student.loginCode,
      phone: student.phone,
      competitionOptIn: student.competitionOptIn,
      email: user.email,
      username: user.username,
    })
    .from(student)
    .innerJoin(user, eq(user.id, student.userId))
    .where(eq(student.teacherId, teacherId))
    .orderBy(asc(student.displayName));
}

/** One student of this teacher (null when she belongs to another class). */
export async function getStudentOfTeacher(teacherId: string, studentId: string) {
  await ensureReady();
  const [row] = await db
    .select()
    .from(student)
    .where(and(eq(student.id, studentId), eq(student.teacherId, teacherId)))
    .limit(1);
  return row ?? null;
}

/** studentId -> Set<hadithId> of approved recitations, for one class only. */
export async function getRecitationIndex(teacherId: string) {
  await ensureReady();
  const rows = await db
    .select({
      studentId: recitation.studentId,
      hadithId: recitation.hadithId,
    })
    .from(recitation)
    .innerJoin(student, eq(student.id, recitation.studentId))
    .where(and(eq(recitation.recited, true), eq(student.teacherId, teacherId)));
  const index = new Map<string, Set<string>>();
  for (const r of rows) {
    let set = index.get(r.studentId);
    if (!set) {
      set = new Set();
      index.set(r.studentId, set);
    }
    set.add(r.hadithId);
  }
  return index;
}

export type StudentProgress = {
  student: StudentRow;
  recitedCount: number;
  total: number;
  percent: number;
  recitedHadithIds: Set<string>;
  lastUpdate: Date | null;
};

/** Full progress for one student (teacher may request any student of hers). */
export async function getStudentProgress(
  studentId: string
): Promise<StudentProgress | null> {
  await ensureReady();
  const [row] = await db
    .select({
      id: student.id,
      userId: student.userId,
      teacherId: student.teacherId,
      displayName: student.displayName,
      loginCode: student.loginCode,
      phone: student.phone,
      competitionOptIn: student.competitionOptIn,
      email: user.email,
      username: user.username,
    })
    .from(student)
    .innerJoin(user, eq(user.id, student.userId))
    .where(eq(student.id, studentId))
    .limit(1);
  if (!row) return null;

  const recs = await db
    .select({
      hadithId: recitation.hadithId,
      recitedAt: recitation.recitedAt,
      updatedAt: recitation.updatedAt,
    })
    .from(recitation)
    .where(and(eq(recitation.studentId, studentId), eq(recitation.recited, true)));

  const allHadiths = await getAllHadiths(row.teacherId ?? "");
  const total = allHadiths.length || TOTAL_HADITHS;
  const recitedHadithIds = new Set(
    recs.filter((r) => allHadiths.some((h) => h.id === r.hadithId)).map((r) => r.hadithId)
  );
  const lastUpdate =
    recs.length === 0
      ? null
      : recs.reduce<Date | null>(
          (acc, r) => (r.recitedAt && (!acc || r.recitedAt > acc) ? r.recitedAt : acc),
          null
        );

  return {
    student: {
      id: row.id,
      userId: row.userId,
      displayName: row.displayName,
      loginCode: row.loginCode,
      phone: row.phone,
      competitionOptIn: row.competitionOptIn,
      email: row.email,
      username: row.username,
    },
    recitedCount: recitedHadithIds.size,
    total,
    percent: Math.round((recitedHadithIds.size / total) * 100),
    recitedHadithIds,
    lastUpdate,
  };
}

/* ────────────────────────────────
 * Competition (per teacher)
 * ──────────────────────────────── */

export type LeaderboardEntry = {
  studentId: string;
  displayName: string;
  count: number;
  reachedAt: Date | null;
};

/**
 * «سابقوا إلى الخيرات» — أفضل 3 من طالبات معلمة واحدة فقط.
 * Tie-break: whoever reached that count first (earliest last approval).
 * Returns [] when that teacher's competition switch is off.
 */
export async function getLeaderboard(teacherId: string): Promise<LeaderboardEntry[]> {
  await ensureReady();
  const [settings] = await db
    .select()
    .from(competitionSettings)
    .where(eq(competitionSettings.id, teacherId))
    .limit(1);
  if (!settings?.enabled) return [];

  const rows = await db
    .select({
      studentId: student.id,
      displayName: student.displayName,
      count: sql<number>`count(*)::int`,
      reachedAt: sql<Date | null>`max(${recitation.recitedAt})`,
    })
    .from(student)
    .innerJoin(
      recitation,
      and(eq(recitation.studentId, student.id), eq(recitation.recited, true))
    )
    .where(and(eq(student.competitionOptIn, true), eq(student.teacherId, teacherId)))
    .groupBy(student.id, student.displayName)
    .orderBy(desc(sql`count(*)`), asc(sql`max(${recitation.recitedAt})`))
    .limit(3);

  return rows.map((r) => ({
    studentId: r.studentId,
    displayName: r.displayName,
    count: r.count,
    reachedAt: r.reachedAt ?? null,
  }));
}

export type RegistrationState = {
  enabled: boolean;
  /** @deprecated the teacher code is the join code now */
  code: string | null;
  updatedAt: Date | null;
};

/** Self-registration settings for one teacher (cached per request). */
export const getRegistrationSettings = cache(
  async function getRegistrationSettings(
    teacherId: string
  ): Promise<RegistrationState> {
    await ensureReady();
    const [row] = await db
      .select()
      .from(registrationSettings)
      .where(eq(registrationSettings.id, teacherId))
      .limit(1);
    return {
      enabled: row?.enabled ?? false,
      code: row?.code ?? null,
      updatedAt: row?.updatedAt ?? null,
    };
  }
);

export async function getCompetitionEnabled(teacherId: string): Promise<boolean> {
  await ensureReady();
  const [settings] = await db
    .select()
    .from(competitionSettings)
    .where(eq(competitionSettings.id, teacherId))
    .limit(1);
  return settings?.enabled ?? false;
}

/* ────────────────────────────────
 * Honors & messages (per teacher)
 * ──────────────────────────────── */

export type HonorRow = {
  id: string;
  studentId: string;
  displayName: string;
  title: string;
  description: string | null;
  awardedAt: Date;
  hadithOrder: number | null;
  hadithTitle: string | null;
};

export async function getHonors(teacherId: string): Promise<HonorRow[]> {
  await ensureReady();
  const rows = await db
    .select({
      id: achievement.id,
      studentId: achievement.studentId,
      displayName: student.displayName,
      title: achievement.title,
      description: achievement.description,
      awardedAt: achievement.awardedAt,
      hadithOrder: hadith.order,
      hadithTitle: hadith.title,
    })
    .from(achievement)
    .innerJoin(student, eq(student.id, achievement.studentId))
    .leftJoin(hadith, eq(hadith.id, achievement.hadithId))
    .where(eq(student.teacherId, teacherId))
    .orderBy(desc(achievement.awardedAt));
  return rows;
}

/** «سَابِقَةُ الخَيْرَات» badge for the current first-hadith winner of a class. */
export async function getSabiqah(teacherId: string): Promise<HonorRow | null> {
  const honors = await getHonors(teacherId);
  return honors.find((h) => h.title === "سَابِقَةُ الخَيْرَات") ?? null;
}

export type MessageRow = { id: string; text: string; category: string | null };

export async function getMessages(teacherId: string): Promise<MessageRow[]> {
  await ensureReady();
  return db
    .select({ id: message.id, text: message.text, category: message.category })
    .from(message)
    .where(and(eq(message.active, true), eq(message.teacherId, teacherId)));
}

/** Pick a random message, avoiding the ones already shown in this session. */
export async function getRandomMessage(
  teacherId: string,
  excludeIds: string[] = []
): Promise<MessageRow | null> {
  const all = await getMessages(teacherId);
  if (all.length === 0) return null;
  const pool = all.filter((m) => !excludeIds.includes(m.id));
  const from = pool.length > 0 ? pool : all; // once seen all, start over
  return from[Math.floor(Math.random() * from.length)];
}

/** Last change to any recitation in this class — teacher dashboard. */
export async function getLastRecitationUpdate(
  teacherId: string
): Promise<Date | null> {
  await ensureReady();
  const [row] = await db
    .select({ updatedAt: sql<Date | null>`max(${recitation.updatedAt})` })
    .from(recitation)
    .innerJoin(student, eq(student.id, recitation.studentId))
    .where(and(eq(recitation.recited, true), eq(student.teacherId, teacherId)));
  return row?.updatedAt ?? null;
}

/** Per-hadith counts for one teacher's dashboard (no student totals exposed). */
export async function getHadithStats(teacherId: string) {
  await ensureReady();
  return db
    .select({
      hadithId: recitation.hadithId,
      count: sql<number>`count(*)::int`,
    })
    .from(recitation)
    .innerJoin(student, eq(student.id, recitation.studentId))
    .innerJoin(hadith, eq(hadith.id, recitation.hadithId))
    .where(and(eq(recitation.recited, true), eq(hadith.teacherId, teacherId)))
    .groupBy(recitation.hadithId);
}

/* ────────────────────────────────
 * Reports
 * ──────────────────────────────── */

export type StudentReport = {
  studentId: string;
  displayName: string;
  phone: string | null;
  recitedCount: number;
  remaining: number;
  total: number;
  percent: number;
  publishedCount: number;
  lastUpdate: string | null;
  recentHadiths: number[];
  honors: { title: string; description: string | null }[];
  isSabiqah: boolean;
  message: string | null;
};

/** Everything the shareable progress report needs. Teacher-only. */
export async function getStudentReport(
  teacherId: string,
  studentId: string
): Promise<StudentReport | null> {
  await ensureReady();

  const [row] = await db
    .select({
      id: student.id,
      displayName: student.displayName,
      phone: student.phone,
    })
    .from(student)
    .where(and(eq(student.id, studentId), eq(student.teacherId, teacherId)))
    .limit(1);
  if (!row) return null;

  const allHadiths = await getAllHadiths(teacherId);
  const total = allHadiths.length || TOTAL_HADITHS;
  const publishedCount = allHadiths.filter((h) => h.published).length;
  const classHadithIds = new Set(allHadiths.map((h) => h.id));

  const recs = await db
    .select({
      hadithId: recitation.hadithId,
      recitedAt: recitation.recitedAt,
    })
    .from(recitation)
    .where(and(eq(recitation.studentId, studentId), eq(recitation.recited, true)));

  const recitedSet = new Set(
    recs.filter((r) => classHadithIds.has(r.hadithId)).map((r) => r.hadithId)
  );
  const byId = new Map(allHadiths.map((h) => [h.id, h.order]));

  const recentHadiths = recs
    .map((r) => ({ order: byId.get(r.hadithId) ?? 0, at: r.recitedAt }))
    .filter((r) => r.order > 0)
    .sort((a, b) => {
      const ta = a.at?.getTime() ?? 0;
      const tb = b.at?.getTime() ?? 0;
      return tb - ta;
    })
    .slice(0, 6)
    .map((r) => r.order)
    .sort((a, b) => a - b);

  const lastUpdate =
    recs.length === 0
      ? null
      : recs.reduce<Date | null>(
          (acc, r) => (r.recitedAt && (!acc || r.recitedAt > acc) ? r.recitedAt : acc),
          null
        );

  const honors = (await getHonors(teacherId)).filter(
    (h) => h.studentId === studentId
  );

  return {
    studentId: row.id,
    displayName: row.displayName,
    phone: row.phone,
    recitedCount: recitedSet.size,
    remaining: total - recitedSet.size,
    total,
    percent: Math.round((recitedSet.size / total) * 100),
    publishedCount,
    lastUpdate: lastUpdate ? lastUpdate.toISOString() : null,
    recentHadiths,
    honors: honors.map((h) => ({ title: h.title, description: h.description })),
    isSabiqah: honors.some((h) => h.title === "سَابِقَةُ الخَيْرَات"),
    message: (await getRandomMessage(teacherId))?.text ?? null,
  };
}

export async function getTeacherName(teacherId: string) {
  await ensureReady();
  const [row] = await db
    .select({ name: teacher.name, code: teacher.code })
    .from(teacher)
    .where(eq(teacher.id, teacherId))
    .limit(1);
  return row ?? null;
}

export async function getStudentsByIds(teacherId: string, ids: string[]) {
  if (ids.length === 0) return [];
  await ensureReady();
  return db
    .select({
      id: student.id,
      userId: student.userId,
      displayName: student.displayName,
      competitionOptIn: student.competitionOptIn,
      email: user.email,
      username: user.username,
    })
    .from(student)
    .innerJoin(user, eq(user.id, student.userId))
    .where(and(inArray(student.id, ids), eq(student.teacherId, teacherId)));
}

/* ────────────────────────────────
 * Installation flags
 * ──────────────────────────────── */

/**
 * Public "classes" overview for the landing page: one card per teacher space,
 * with her display name + code + published progress. No student names, ever.
 */
export async function getPublicClasses() {
  await ensureReady();
  return db
    .select({
      teacherId: teacher.id,
      name: teacher.name,
      code: teacher.code,
      publishedCount: sql<number>`count(*) filter (where ${hadith.published} = true)::int`,
      total: sql<number>`count(*)::int`,
      updatedAt: teacher.createdAt,
    })
    .from(teacher)
    .leftJoin(hadith, eq(hadith.teacherId, teacher.id))
    .groupBy(teacher.id, teacher.name, teacher.code, teacher.createdAt)
    .orderBy(asc(teacher.createdAt));
}
