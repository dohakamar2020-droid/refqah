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
  recitationNote,
  achievement,
  hadithTitle,
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
  /** ترتيب الطالبة كما رتّبته المعلمة (الأصغر أولًا) */
  sortOrder: number;
  /** المركز في المنافسة الذي حددته المعلمة (1/2/3) أو null */
  competitionRank: number | null;
  email: string;
  username: string | null;
};

/**
 * ترتيب الطالبات كما اختارته المعلمة.
 *
 * الطالبات اللواتي لم تُرتِّبهنّ بعد قيمتهنّ 0، فيظهرنّ في الآخر بترتيب الاسم،
 * وتتقدّمهنّ مَن رتّبتهنّ المعلمة بالترتيب الذي وضَعته. هذا الترتيب هو نفسه في قائمة
 * الطالبات وجدول التسميع والتقارير، وعليه يُحسب «المركز الأول».
 */
function sortStudents<T extends { displayName: string; sortOrder: number }>(
  rows: T[]
): T[] {
  return [...rows].sort((a, b) => {
    const ao = a.sortOrder > 0 ? a.sortOrder : Number.MAX_SAFE_INTEGER;
    const bo = b.sortOrder > 0 ? b.sortOrder : Number.MAX_SAFE_INTEGER;
    if (ao !== bo) return ao - bo;
    return a.displayName.localeCompare(b.displayName, "ar");
  });
}

export async function getStudents(teacherId: string): Promise<StudentRow[]> {
  await ensureReady();
  const rows = await db
    .select({
      id: student.id,
      userId: student.userId,
      displayName: student.displayName,
      loginCode: student.loginCode,
      phone: student.phone,
      competitionOptIn: student.competitionOptIn,
      sortOrder: student.sortOrder,
      competitionRank: student.competitionRank,
      email: user.email,
      username: user.username,
    })
    .from(student)
    .innerJoin(user, eq(user.id, student.userId))
    .where(eq(student.teacherId, teacherId));
  return sortStudents(rows);
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
      sortOrder: student.sortOrder,
      competitionRank: student.competitionRank,
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
      sortOrder: row.sortOrder,
      competitionRank: row.competitionRank,
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
 * ألقاب الأحاديث (لقب لكل حديث — للمركز الأول)
 * ──────────────────────────────── */

export type HadithTitleRow = {
  id: string;
  hadithId: string;
  /** رقم الحديث في الأربعين — اللقب يتغيّر معه */
  hadithOrder: number | null;
  /** اسم الحديث نفسه، مثل «الأعمال بالنيات» */
  hadithName: string | null;
  studentId: string;
  studentName: string;
  title: string;
  description: string | null;
  awardedAt: Date;
};

/** ألقاب الحديث في فصل واحد فقط — لقب واحد لكل حديث. */
export async function getHadithTitles(teacherId: string): Promise<HadithTitleRow[]> {
  await ensureReady();
  const rows = await db
    .select({
      id: hadithTitle.id,
      hadithId: hadithTitle.hadithId,
      hadithOrder: hadith.order,
      hadithName: hadith.title,
      studentId: hadithTitle.studentId,
      studentName: student.displayName,
      title: hadithTitle.title,
      description: hadithTitle.description,
      awardedAt: hadithTitle.awardedAt,
    })
    .from(hadithTitle)
    .innerJoin(student, eq(student.id, hadithTitle.studentId))
    .leftJoin(hadith, eq(hadith.id, hadithTitle.hadithId))
    .where(eq(hadithTitle.teacherId, teacherId))
    .orderBy(asc(hadith.order));
  return rows;
}

/** الألقاب التي حصلت عليها طالبة واحدة (لعرضها في مساحتها وتقريرها). */
export async function getStudentHadithTitles(
  teacherId: string,
  studentId: string
): Promise<HadithTitleRow[]> {
  const all = await getHadithTitles(teacherId);
  return all.filter((t) => t.studentId === studentId);
}

/**
 * مراكز الطالبات حسب الترتيب الذي وضعته المعلمة بنفسها.
 * studentId → المركز (1 = الأولى). ومن ليست في الفصل لا مركز لها.
 */
export async function getClassRanks(teacherId: string): Promise<Map<string, number>> {
  const students = await getStudents(teacherId);
  const ranks = new Map<string, number>();
  students.forEach((s, i) => ranks.set(s.id, i + 1));
  return ranks;
}

/** أول طالبة في ترتيب المعلمة — صاحبة المركز الأول في الفصل. */
export async function getFirstInClass(teacherId: string) {
  const [first] = await getStudents(teacherId);
  return first ?? null;
}

/* ────────────────────────────────
 * Competition (per teacher)
 * ──────────────────────────────── */

export type LeaderboardEntry = {
  studentId: string;
  displayName: string;
  count: number;
  reachedAt: Date | null;
  /** المركز الذي حددته المعلمة بنفسها (1/2/3)، أو null إن كان الترتيب تلقائيًا */
  manualRank?: number | null;
};

/**
 * «سابقوا إلى الخيرات» — أفضل 3 من طالبات معلمة واحدة فقط.
 *
 * للمعلمة الكلمة الأولى: المراكز التي حدّدتها بنفسها (المركز الأول/الثاني/الثالث)
 * تُعرض أولًا كما اختارتها، ثم تُكمل اللوحة تلقائيًا بمن لم تحدّد لهنّ مركزًا حسب
 * عدد الأحاديث المعتمدة (والتعادل يُحسم لمن وصلت أولًا).
 * تُرجع [] عندما تكون لوحة المنافسة موقوفة لهذه المعلمة.
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
      manualRank: student.competitionRank,
      count: sql<number>`count(${recitation.id})::int`,
      reachedAt: sql<Date | null>`max(${recitation.recitedAt})`,
    })
    .from(student)
    .leftJoin(
      recitation,
      and(eq(recitation.studentId, student.id), eq(recitation.recited, true))
    )
    .where(and(eq(student.competitionOptIn, true), eq(student.teacherId, teacherId)))
    .groupBy(student.id, student.displayName, student.competitionRank);

  const automatic = rows
    .filter((r) => !r.manualRank)
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      const ta = a.reachedAt ? new Date(a.reachedAt).getTime() : Infinity;
      const tb = b.reachedAt ? new Date(b.reachedAt).getTime() : Infinity;
      return ta - tb;
    });
  const manual = rows
    .filter((r) => r.manualRank)
    .sort((a, b) => (a.manualRank ?? 0) - (b.manualRank ?? 0));

  return [...manual, ...automatic].slice(0, 3).map((r) => ({
    studentId: r.studentId,
    displayName: r.displayName,
    count: r.count,
    reachedAt: r.reachedAt ?? null,
    manualRank: r.manualRank ?? null,
  }));
}

/** المراكز التي حددتها المعلمة بنفسها (1 → studentId …). */
export async function getManualRanks(teacherId: string): Promise<Map<number, string>> {
  await ensureReady();
  const rows = await db
    .select({ id: student.id, rank: student.competitionRank })
    .from(student)
    .where(eq(student.teacherId, teacherId));
  const map = new Map<number, string>();
  for (const r of rows) if (r.rank) map.set(r.rank, r.id);
  return map;
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
  /** ألقاب الأحاديث التي حصلت عليها — لقب لكل حديث كانت الأولى فيه */
  hadithTitles: { title: string; order: number | null }[];
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
  const hadithTitles = (await getStudentHadithTitles(teacherId, studentId)).map(
    (t) => ({ title: t.title, order: t.hadithOrder })
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
    hadithTitles,
    isSabiqah: honors.some((h) => h.title === "سَابِقَةُ الخَيْرَات"),
    message: (await getRandomMessage(teacherId))?.text ?? null,
  };
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



/* ────────────────────────────────
 * Student's own class view
 * ──────────────────────────────── */

export type StudentHadithResult = {
  id: string;
  order: number;
  title: string;
  narrator: string | null;
  arabicText: string;
  takhrij: string | null;
  publishedAt: Date | null;
  /** معتمدة من المعلمة */
  recited: boolean;
  recitedAt: Date | null;
  /** نتيجة التسميع التي كتبتها الطالبة بنفسها */
  note: { mistakes: string; body: string; updatedAt: Date } | null;
};

/**
 * ONLY what a student may see of her class: the published hadiths, her own
 * result for each, and her own notes. Unpublished hadiths do not exist for
 * her at all — the teacher's unpublished plan stays private.
 */
export async function getStudentClassBoard(
  teacherId: string,
  studentId: string
): Promise<StudentHadithResult[]> {
  await ensureReady();
  const [published, recs, notes] = await Promise.all([
    db
      .select({
        id: hadith.id,
        order: hadith.order,
        title: hadith.title,
        narrator: hadith.narrator,
        arabicText: hadith.arabicText,
        takhrij: hadith.takhrij,
        publishedAt: hadith.publishedAt,
      })
      .from(hadith)
      .where(and(eq(hadith.teacherId, teacherId), eq(hadith.published, true)))
      .orderBy(asc(hadith.order)),
    db
      .select({
        hadithId: recitation.hadithId,
        recited: recitation.recited,
        recitedAt: recitation.recitedAt,
      })
      .from(recitation)
      .where(and(eq(recitation.studentId, studentId), eq(recitation.recited, true))),
    db
      .select({
        hadithId: recitationNote.hadithId,
        mistakes: recitationNote.mistakes,
        body: recitationNote.body,
        updatedAt: recitationNote.updatedAt,
      })
      .from(recitationNote)
      .where(eq(recitationNote.studentId, studentId)),
  ]);

  const recitedMap = new Map(recs.map((r) => [r.hadithId, r.recitedAt]));
  const noteMap = new Map(notes.map((n) => [n.hadithId, n]));

  return published.map((h) => {
    const n = noteMap.get(h.id);
    return {
      ...h,
      recited: recitedMap.has(h.id),
      recitedAt: recitedMap.get(h.id) ?? null,
      note: n
        ? {
            mistakes: n.mistakes ?? "",
            body: n.body ?? "",
            updatedAt: n.updatedAt,
          }
        : null,
    };
  });
}

/**
 * The class a student belongs to — nothing else about the teacher is exposed
 * to her: no code, no e-mail, no list of other teachers.
 */
export async function getMyClass(teacherId: string) {
  await ensureReady();
  const [row] = await db
    .select({ name: teacher.name })
    .from(teacher)
    .where(eq(teacher.id, teacherId))
    .limit(1);
  return row ?? null;
}
