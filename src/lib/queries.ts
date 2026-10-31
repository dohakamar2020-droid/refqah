import "server-only";
import { cache } from "react";
import { eq, sql, desc, asc, and, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  hadith,
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

export type HadithRow = {
  id: string;
  order: number;
  title: string;
  arabicText: string;
  narrator: string | null;
  takhrij: string | null;
  published: boolean;
  publishedAt: Date | null;
};

export async function getAllHadiths(): Promise<HadithRow[]> {
  await ensureReady();
  return db
    .select({
      id: hadith.id,
      order: hadith.order,
      title: hadith.title,
      arabicText: hadith.arabicText,
      narrator: hadith.narrator,
      takhrij: hadith.takhrij,
      published: hadith.published,
      publishedAt: hadith.publishedAt,
    })
    .from(hadith)
    .orderBy(asc(hadith.order));
}

export async function getPublishedHadiths(): Promise<HadithRow[]> {
  const all = await getAllHadiths();
  return all.filter((h) => h.published);
}

/** «الحديث المنشور حالياً: X من 42» */
export async function getJourneyProgress() {
  const all = await getAllHadiths();
  const published = all.filter((h) => h.published);
  const current = published.length ? published[published.length - 1] : null;
  return {
    publishedCount: published.length,
    total: all.length || TOTAL_HADITHS,
    currentOrder: current?.order ?? null,
    currentTitle: current?.title ?? null,
  };
}

export type StudentRow = {
  id: string;
  userId: string;
  displayName: string;
  phone: string | null;
  competitionOptIn: boolean;
  email: string;
  username: string | null;
};

export async function getStudents(): Promise<StudentRow[]> {
  await ensureReady();
  return db
    .select({
      id: student.id,
      userId: student.userId,
      displayName: student.displayName,
      phone: student.phone,
      competitionOptIn: student.competitionOptIn,
      email: user.email,
      username: user.username,
    })
    .from(student)
    .innerJoin(user, eq(user.id, student.userId))
    .orderBy(asc(student.displayName));
}

/** studentId -> Set<hadithId> of approved recitations (published hadiths only). */
export async function getRecitationIndex() {
  await ensureReady();
  const rows = await db
    .select({
      studentId: recitation.studentId,
      hadithId: recitation.hadithId,
      recited: recitation.recited,
    })
    .from(recitation)
    .where(eq(recitation.recited, true));
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

/** Full progress for one student (teacher may request any student). */
export async function getStudentProgress(
  studentId: string
): Promise<StudentProgress | null> {
  await ensureReady();
  const [row] = await db
    .select({
      id: student.id,
      userId: student.userId,
      displayName: student.displayName,
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

  const allHadiths = await getAllHadiths();
  const total = allHadiths.length || TOTAL_HADITHS;
  const recitedHadithIds = new Set(recs.map((r) => r.hadithId));
  const lastUpdate =
    recs.length === 0
      ? null
      : recs.reduce<Date | null>(
          (acc, r) => (r.recitedAt && (!acc || r.recitedAt > acc) ? r.recitedAt : acc),
          null
        );

  return {
    student: row,
    recitedCount: recitedHadithIds.size,
    total,
    percent: Math.round((recitedHadithIds.size / total) * 100),
    recitedHadithIds,
    lastUpdate,
  };
}

export type LeaderboardEntry = {
  studentId: string;
  displayName: string;
  count: number;
  reachedAt: Date | null;
};

/**
 * «سابقوا إلى الخيرات» — أفضل 3 من الطالبات الموافقات على الظهور فقط.
 * Tie-break: whoever reached that count first (earliest last approval).
 * Returns [] when the competition switch is off.
 */
export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  await ensureReady();
  const [settings] = await db
    .select()
    .from(competitionSettings)
    .where(eq(competitionSettings.id, "main"))
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
    .where(eq(student.competitionOptIn, true))
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
  /** كود الانضمام — null يعني أن التسجيل مفتوح لمن يعرف الرابط */
  code: string | null;
  updatedAt: Date | null;
};

/** Self-registration settings (cached per request). */
export const getRegistrationSettings = cache(
  async function getRegistrationSettings(): Promise<RegistrationState> {
    await ensureReady();
    const [row] = await db
      .select()
      .from(registrationSettings)
      .where(eq(registrationSettings.id, "main"))
      .limit(1);
    return {
      enabled: row?.enabled ?? false,
      code: row?.code ?? null,
      updatedAt: row?.updatedAt ?? null,
    };
  }
);

export async function getCompetitionEnabled(): Promise<boolean> {
  await ensureReady();
  const [settings] = await db
    .select()
    .from(competitionSettings)
    .where(eq(competitionSettings.id, "main"))
    .limit(1);
  return settings?.enabled ?? false;
}

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

export async function getHonors(): Promise<HonorRow[]> {
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
    .orderBy(desc(achievement.awardedAt));
  return rows;
}

/** «سَابِقَةُ الخَيْرَات» badge for the current first-hadith winner. */
export async function getSabiqah(): Promise<HonorRow | null> {
  const honors = await getHonors();
  return honors.find((h) => h.title === "سَابِقَةُ الخَيْرَات") ?? null;
}

export type MessageRow = { id: string; text: string; category: string | null };

export async function getMessages(): Promise<MessageRow[]> {
  await ensureReady();
  return db
    .select({ id: message.id, text: message.text, category: message.category })
    .from(message)
    .where(eq(message.active, true));
}

/** Pick a random message, avoiding the ones already shown in this session. */
export async function getRandomMessage(
  excludeIds: string[] = []
): Promise<MessageRow | null> {
  const all = await getMessages();
  if (all.length === 0) return null;
  const pool = all.filter((m) => !excludeIds.includes(m.id));
  const from = pool.length > 0 ? pool : all; // once seen all, start over
  return from[Math.floor(Math.random() * from.length)];
}

/** Last change to any recitation — shown in the teacher dashboard. */
export async function getLastRecitationUpdate(): Promise<Date | null> {
  await ensureReady();
  const [row] = await db
    .select({ updatedAt: sql<Date | null>`max(${recitation.updatedAt})` })
    .from(recitation)
    .where(eq(recitation.recited, true));
  return row?.updatedAt ?? null;
}

/** Per-hadith counts for the teacher dashboard (no student totals exposed). */
export async function getHadithStats() {
  await ensureReady();
  return db
    .select({
      hadithId: recitation.hadithId,
      count: sql<number>`count(*)::int`,
    })
    .from(recitation)
    .where(eq(recitation.recited, true))
    .groupBy(recitation.hadithId);
}

/**
 * Has the first-run setup been completed?
 * Cached per request — it is read by the header, the home page and /login.
 */
export const hasAdmin = cache(async function hasAdmin(): Promise<boolean> {
  await ensureReady();
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(user)
    .where(eq(user.role, "admin"));
  return (row?.n ?? 0) > 0;
});

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
    .where(eq(student.id, studentId))
    .limit(1);
  if (!row) return null;

  const allHadiths = await getAllHadiths();
  const total = allHadiths.length || TOTAL_HADITHS;
  const publishedCount = allHadiths.filter((h) => h.published).length;

  const recs = await db
    .select({
      hadithId: recitation.hadithId,
      recitedAt: recitation.recitedAt,
    })
    .from(recitation)
    .where(and(eq(recitation.studentId, studentId), eq(recitation.recited, true)));

  const recitedSet = new Set(recs.map((r) => r.hadithId));
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

  const honors = (await getHonors()).filter((h) => h.studentId === studentId);

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
    message: (await getRandomMessage())?.text ?? null,
  };
}

export async function getStudentsByIds(ids: string[]) {
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
    .where(inArray(student.id, ids));
}
