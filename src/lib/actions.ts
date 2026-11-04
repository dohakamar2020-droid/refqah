"use server";

import { revalidatePath } from "next/cache";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { db } from "@/lib/db";
import {
  recitation,
  recitationNote,
  student,
  user,
  account,
  hadith,
  teacher,
  achievement,
  hadithTitle,
  competitionSettings,
  registrationSettings,
  message,
} from "@/lib/db/schema";
import { ensureReady } from "@/lib/db/ready";
import {
  syncFirstHadithAchievement,
  createUserWithPassword,
  hasAnyTeacher,
  maybeSeedDemoForTeacher,
  newStudentCode,
} from "@/lib/db/seed";
import { getSessionUser } from "@/lib/permissions";
import { isValidCode, normalizeCode, normalizeName } from "@/lib/codes";
import {
  createTeacherWithCode,
  joinWithTeacherCode,
  signInStudentWithCode,
  signInTeacherWithCode,
} from "@/lib/code-auth";

type Result = {
  ok: boolean;
  error?: string;
  code?: string;
  /** Student sign-in: not registered yet and self-registration is open. */
  needsJoin?: boolean;
};

/**
 * Every write goes through here.
 *
 * It returns the teacher's own space (`teacherId`), which every query below
 * must filter on: a teacher may only ever touch her own class — checking the
 * role alone would let any teacher edit another teacher's students.
 */
async function requireTeacherOrThrow() {
  await ensureReady();
  const me = await getSessionUser();
  if (!me) return { error: "يجب تسجيل الدخول" } as const;
  if (me.role !== "admin")
    return { error: "ليس لديك صلاحية لتعديل البيانات" } as const;
  if (!me.teacherId) return { error: "لا توجد مساحة معلمة لهذا الحساب" } as const;
  return { me, teacherId: me.teacherId } as const;
}

function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function revalidateAll() {
  revalidatePath("/", "layout");
}

/**
 * Normalize a WhatsApp number to international digits (no +, spaces or dashes).
 * Returns "" when the field is empty, and "invalid" when it cannot be read.
 */
function normalizePhone(raw: FormDataEntryValue | null): string | "invalid" {
  const value = String(raw ?? "").trim();
  if (!value) return "";
  const digits = value.replace(/[^\d]/g, "");
  // International format without the leading +; keep it lenient but sane.
  if (digits.length < 8 || digits.length > 15) return "invalid";
  return digits;
}

/* ────────────────────────────────
 * Recitations (the heart of the app)
 * ──────────────────────────────── */

export async function setRecitation(
  studentId: string,
  hadithId: string,
  recited: boolean
): Promise<Result> {
  const authCheck = await requireTeacherOrThrow();
  if ("error" in authCheck) return { ok: false, error: authCheck.error };
  const { teacherId } = authCheck;

  // The hadith must belong to this teacher's copy …
  const [h] = await db
    .select()
    .from(hadith)
    .where(and(eq(hadith.id, hadithId), eq(hadith.teacherId, teacherId)))
    .limit(1);
  if (!h) return { ok: false, error: "الحديث غير موجود" };
  if (recited && !h.published)
    return { ok: false, error: "لا يمكن تسجيل تسميع حديث لم يُنشر بعد" };

  // … and so must the student.
  const [s] = await db
    .select({ id: student.id })
    .from(student)
    .where(and(eq(student.id, studentId), eq(student.teacherId, teacherId)))
    .limit(1);
  if (!s) return { ok: false, error: "الطالبة غير موجودة في فصلك" };

  const now = new Date();
  const existing = await db
    .select()
    .from(recitation)
    .where(
      and(eq(recitation.studentId, studentId), eq(recitation.hadithId, hadithId))
    )
    .limit(1);

  if (existing.length) {
    await db
      .update(recitation)
      .set({
        recited,
        // keep the original approval time so «سابقة الخيرات» stays correct
        recitedAt: recited ? existing[0].recitedAt ?? now : null,
        updatedAt: now,
      })
      .where(eq(recitation.id, existing[0].id));
  } else {
    await db.insert(recitation).values({
      id: newId("rec"),
      studentId,
      hadithId,
      recited,
      recitedAt: recited ? now : null,
      updatedAt: now,
    });
  }

  await syncFirstHadithAchievement(teacherId);
  revalidateAll();
  return { ok: true };
}

/* ────────────────────────────────
 * Students
 * ──────────────────────────────── */

/**
 * Create a student in the teacher's own class.
 *
 * Her login code is generated here and returned once, so the teacher can hand
 * it to her with the password she typed. The student then signs in with
 * «الكود + الاسم + كلمة المرور».
 */
export async function createStudent(formData: FormData): Promise<Result> {
  const authCheck = await requireTeacherOrThrow();
  if ("error" in authCheck) return { ok: false, error: authCheck.error };
  const { teacherId } = authCheck;

  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const phone = normalizePhone(formData.get("phone"));
  const optIn = formData.get("competitionOptIn") === "on";

  if (phone === "invalid")
    return {
      ok: false,
      error: "رقم الواتساب غير صحيح (استخدمي الصيغة الدولية مثل 201012345678)",
    };

  if (!name) return { ok: false, error: "اسم الطالبة مطلوب" };
  // Same rule as every other account: 8+ characters. A shorter password would
  // be accepted here but refused at sign-in, locking the student out.
  if (password.length < 8)
    return { ok: false, error: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" };

  // Two girls with the identical stored name and no personal code of their own
  // could not be told apart at sign-in with the class code.
  const classmates = await db
    .select({ displayName: student.displayName })
    .from(student)
    .where(eq(student.teacherId, teacherId));
  if (classmates.some((c) => normalizeName(c.displayName) === normalizeName(name)))
    return {
      ok: false,
      error: "توجد طالبة بنفس الاسم في فصلك — أضيفي ما يميّزها (اسم الأب مثلًا)",
    };

  const code = await newStudentCode();
  const username = code.replace(/-/g, "").toLowerCase();

  // New students join at the end of the teacher's own order, so her arrangement
  // of the existing class is never disturbed.
  const [top] = await db
    .select({ max: sql<number>`coalesce(max(${student.sortOrder}), 0)::int` })
    .from(student)
    .where(eq(student.teacherId, teacherId));

  try {
    const created = await createUserWithPassword({
      name,
      email: `${username}@refqah.local`,
      username,
      password,
      role: "student",
      displayName: name,
      competitionOptIn: optIn,
      teacherId,
      loginCode: code,
    });
    if (created.studentId && (top?.max ?? 0) > 0) {
      await db
        .update(student)
        .set({ sortOrder: (top?.max ?? 0) + 1, updatedAt: new Date() })
        .where(
          and(eq(student.id, created.studentId), eq(student.teacherId, teacherId))
        );
    }
    if (created.studentId && phone) {
      await db
        .update(student)
        .set({ phone, updatedAt: new Date() })
        .where(
          and(eq(student.id, created.studentId), eq(student.teacherId, teacherId))
        );
    }
  } catch {
    return { ok: false, error: "تعذّر إنشاء الحساب — حاولي مرة أخرى" };
  }

  revalidateAll();
  return { ok: true, code };
}

export async function updateStudent(formData: FormData): Promise<Result> {
  const authCheck = await requireTeacherOrThrow();
  if ("error" in authCheck) return { ok: false, error: authCheck.error };
  const { teacherId } = authCheck;

  const studentId = String(formData.get("studentId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const optIn = formData.get("competitionOptIn") === "on";
  const password = String(formData.get("password") ?? "").trim();
  const phone = normalizePhone(formData.get("phone"));

  if (phone === "invalid")
    return {
      ok: false,
      error: "رقم الواتساب غير صحيح (استخدمي الصيغة الدولية مثل 201012345678)",
    };

  if (!studentId || !name) return { ok: false, error: "بيانات غير مكتملة" };
  // 8+ here too: a shorter reset password would be refused at sign-in.
  if (password && password.length < 8)
    return { ok: false, error: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" };

  const [s] = await db
    .select({ userId: student.userId })
    .from(student)
    .where(and(eq(student.id, studentId), eq(student.teacherId, teacherId)))
    .limit(1);
  if (!s) return { ok: false, error: "الطالبة غير موجودة في فصلك" };

  await db
    .update(student)
    .set({
      displayName: name,
      competitionOptIn: optIn,
      phone: phone || null,
      updatedAt: new Date(),
    })
    .where(eq(student.id, studentId));

  await db
    .update(user)
    .set({ name, updatedAt: new Date() })
    .where(eq(user.id, s.userId));

  if (password) {
    const hashed = await hashPassword(password);
    await db
      .update(account)
      .set({ password: hashed, updatedAt: new Date() })
      .where(
        and(eq(account.userId, s.userId), eq(account.providerId, "credential"))
      );
  }

  revalidateAll();
  return { ok: true };
}

/** Issue a new login code for one of her students (e.g. the old one leaked). */
export async function rotateStudentCode(studentId: string): Promise<Result> {
  const authCheck = await requireTeacherOrThrow();
  if ("error" in authCheck) return { ok: false, error: authCheck.error };
  const { teacherId } = authCheck;

  const [s] = await db
    .select({ id: student.id })
    .from(student)
    .where(and(eq(student.id, studentId), eq(student.teacherId, teacherId)))
    .limit(1);
  if (!s) return { ok: false, error: "الطالبة غير موجودة في فصلك" };

  const code = await newStudentCode();
  await db
    .update(student)
    .set({ loginCode: code, updatedAt: new Date() })
    .where(eq(student.id, studentId));

  revalidateAll();
  return { ok: true, code };
}

export async function deleteStudent(studentId: string): Promise<Result> {
  const authCheck = await requireTeacherOrThrow();
  if ("error" in authCheck) return { ok: false, error: authCheck.error };
  const { teacherId } = authCheck;

  const [s] = await db
    .select({ userId: student.userId })
    .from(student)
    .where(and(eq(student.id, studentId), eq(student.teacherId, teacherId)))
    .limit(1);
  if (!s) return { ok: false, error: "الطالبة غير موجودة في فصلك" };

  // Cascades remove the profile, recitations and achievements.
  await db.delete(user).where(eq(user.id, s.userId));
  await syncFirstHadithAchievement(teacherId);
  revalidateAll();
  return { ok: true };
}

/**
 * ترتيب الطالبات — بالطريقة التي تختارها المعلمة من حسابها.
 *
 * تُرسَل القائمة كاملة بترتيبها الجديد، فتُحفظ أرقام الترتيب 1، 2، 3… لكل
 * طالبة من طالباتها هي فقط. أي طالبة ليست في فصلك تُتجاهل.
 */
export async function reorderStudents(orderedIds: string[]): Promise<Result> {
  const authCheck = await requireTeacherOrThrow();
  if ("error" in authCheck) return { ok: false, error: authCheck.error };
  const { teacherId } = authCheck;

  const mine = await db
    .select({ id: student.id })
    .from(student)
    .where(eq(student.teacherId, teacherId));
  const allowed = new Set(mine.map((s) => s.id));
  const ids = orderedIds.filter((id) => allowed.has(id));
  if (ids.length === 0) return { ok: false, error: "لا توجد طالبات لترتيبهنّ" };

  const now = new Date();
  for (let i = 0; i < ids.length; i++) {
    await db
      .update(student)
      .set({ sortOrder: i + 1, updatedAt: now })
      .where(and(eq(student.id, ids[i]), eq(student.teacherId, teacherId)));
  }

  revalidateAll();
  return { ok: true };
}

/** تحريك طالبة خطوة واحدة لأعلى أو لأسفل في ترتيب المعلمة. */
export async function moveStudent(
  studentId: string,
  direction: "up" | "down"
): Promise<Result> {
  const authCheck = await requireTeacherOrThrow();
  if ("error" in authCheck) return { ok: false, error: authCheck.error };
  const { teacherId } = authCheck;

  const rows = await db
    .select({ id: student.id, sortOrder: student.sortOrder, name: student.displayName })
    .from(student)
    .where(eq(student.teacherId, teacherId));
  if (rows.length === 0) return { ok: false, error: "لا توجد طالبات" };

  const ordered = [...rows].sort((a, b) => {
    const ao = a.sortOrder > 0 ? a.sortOrder : Number.MAX_SAFE_INTEGER;
    const bo = b.sortOrder > 0 ? b.sortOrder : Number.MAX_SAFE_INTEGER;
    if (ao !== bo) return ao - bo;
    return a.name.localeCompare(b.name, "ar");
  });

  const index = ordered.findIndex((s) => s.id === studentId);
  if (index === -1) return { ok: false, error: "الطالبة غير موجودة في فصلك" };

  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= ordered.length) return { ok: true };

  const temp = ordered[index];
  ordered[index] = ordered[swapWith];
  ordered[swapWith] = temp;

  return reorderStudents(ordered.map((s) => s.id));
}

/**
 * ترتيب المراكز في المنافسة — تحدّده المعلمة بنفسها: المركز الأول والثاني
 * والثالث. أي طالبة تُترك فارغة يحدّد النظام مركزها تلقائيًا حسب عدد الأحاديث.
 *
 * المركز الواحد لا يكون لأكثر من طالبة: منح المركز لطالبة ينزعه من غيرها.
 */
export async function setCompetitionRanks(
  formData: FormData
): Promise<Result> {
  const authCheck = await requireTeacherOrThrow();
  if ("error" in authCheck) return { ok: false, error: authCheck.error };
  const { teacherId } = authCheck;

  const mine = await db
    .select({ id: student.id })
    .from(student)
    .where(eq(student.teacherId, teacherId));
  const allowed = new Set(mine.map((s) => s.id));

  const picks: { studentId: string; rank: number }[] = [];
  for (const rank of [1, 2, 3]) {
    const id = String(formData.get(`rank${rank}`) ?? "").trim();
    if (!id) continue;
    if (!allowed.has(id))
      return { ok: false, error: "اختاري طالبات فصلك فقط" };
    if (picks.some((p) => p.studentId === id))
      return { ok: false, error: "لا يمكن أن تأخذ طالبة أكثر من مركز واحد" };
    picks.push({ studentId: id, rank });
  }

  const now = new Date();
  // Clear every manual rank first, then write the new podium — so a girl moved
  // from first to third never keeps both.
  await db
    .update(student)
    .set({ competitionRank: null, updatedAt: now })
    .where(and(eq(student.teacherId, teacherId), sql`${student.competitionRank} is not null`));

  for (const p of picks) {
    await db
      .update(student)
      .set({ competitionRank: p.rank, updatedAt: now })
      .where(and(eq(student.id, p.studentId), eq(student.teacherId, teacherId)));
  }

  revalidateAll();
  return { ok: true };
}

/** إلغاء المراكز اليدوية — يعود الترتيب تلقائيًا حسب عدد الأحاديث. */
export async function clearCompetitionRanks(): Promise<Result> {
  const authCheck = await requireTeacherOrThrow();
  if ("error" in authCheck) return { ok: false, error: authCheck.error };
  const { teacherId } = authCheck;

  await db
    .update(student)
    .set({ competitionRank: null, updatedAt: new Date() })
    .where(and(eq(student.teacherId, teacherId), sql`${student.competitionRank} is not null`));

  revalidateAll();
  return { ok: true };
}

/* ────────────────────────────────
 * ألقاب الأحاديث — لقب لكل حديث لصاحبة المركز الأول
 * ──────────────────────────────── */


/**
 * منح لقب حديث لطالبة (أو تعديل اللقب/صاحبته).
 *
 * اللقب يتغيّر مع كل حديث: لكل حديث لقبه الخاص، ولقب واحد فقط لكل حديث في
 * الفصل. إرسال نفس الطالبة واللقب مرة أخرى يحدّثه بدل أن يكرّره.
 */
export async function awardHadithTitle(formData: FormData): Promise<Result> {
  const authCheck = await requireTeacherOrThrow();
  if ("error" in authCheck) return { ok: false, error: authCheck.error };
  const { teacherId } = authCheck;

  const hadithId = String(formData.get("hadithId") ?? "").trim();
  const studentId = String(formData.get("studentId") ?? "").trim();
  const rawTitle = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!hadithId || !studentId) return { ok: false, error: "اختاري الحديث والطالبة" };
  if (!rawTitle) return { ok: false, error: "اكتبي اللقب أو اختاري من المقترحات" };
  if (rawTitle.length > 80) return { ok: false, error: "اللقب أطول من اللازم" };

  const [h] = await db
    .select({ id: hadith.id, order: hadith.order, title: hadith.title })
    .from(hadith)
    .where(and(eq(hadith.id, hadithId), eq(hadith.teacherId, teacherId)))
    .limit(1);
  if (!h) return { ok: false, error: "الحديث غير موجود في مساحتك" };

  const [s] = await db
    .select({ id: student.id, name: student.displayName })
    .from(student)
    .where(and(eq(student.id, studentId), eq(student.teacherId, teacherId)))
    .limit(1);
  if (!s) return { ok: false, error: "الطالبة غير موجودة في فصلك" };

  const now = new Date();
  const descriptionText =
    description || `المركز الأول في الحديث ${h.order} — ${h.title}`;

  await db
    .insert(hadithTitle)
    .values({
      id: newId("htl"),
      teacherId,
      hadithId,
      studentId,
      title: rawTitle,
      description: descriptionText,
      awardedAt: now,
      createdAt: now,
    })
    .onConflictDoUpdate({
      target: [hadithTitle.teacherId, hadithTitle.hadithId],
      set: {
        studentId,
        title: rawTitle,
        description: descriptionText,
        awardedAt: now,
      },
    });

  revalidateAll();
  return { ok: true };
}

/** سحب لقب حديث (يصبح الحديث بلا صاحب لقب). */
export async function removeHadithTitle(hadithId: string): Promise<Result> {
  const authCheck = await requireTeacherOrThrow();
  if ("error" in authCheck) return { ok: false, error: authCheck.error };
  const { teacherId } = authCheck;

  await db
    .delete(hadithTitle)
    .where(
      and(eq(hadithTitle.teacherId, teacherId), eq(hadithTitle.hadithId, hadithId))
    );

  revalidateAll();
  return { ok: true };
}

/* ────────────────────────────────
 * Hadiths (each teacher owns her copy)
 * ──────────────────────────────── */

export async function setHadithPublished(
  hadithId: string,
  published: boolean
): Promise<Result> {
  const authCheck = await requireTeacherOrThrow();
  if ("error" in authCheck) return { ok: false, error: authCheck.error };
  const { teacherId } = authCheck;

  const [h] = await db
    .select()
    .from(hadith)
    .where(and(eq(hadith.id, hadithId), eq(hadith.teacherId, teacherId)))
    .limit(1);
  if (!h) return { ok: false, error: "الحديث غير موجود" };

  await db
    .update(hadith)
    .set({
      published,
      publishedAt: published ? h.publishedAt ?? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(hadith.id, hadithId));

  revalidateAll();
  return { ok: true };
}

export async function updateHadith(formData: FormData): Promise<Result> {
  const authCheck = await requireTeacherOrThrow();
  if ("error" in authCheck) return { ok: false, error: authCheck.error };
  const { teacherId } = authCheck;

  const hadithId = String(formData.get("hadithId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const narrator = String(formData.get("narrator") ?? "").trim();
  const arabicText = String(formData.get("arabicText") ?? "").trim();
  const takhrij = String(formData.get("takhrij") ?? "").trim();

  if (!hadithId || !title || !arabicText)
    return { ok: false, error: "العنوان والنص مطلوبان" };

  const [h] = await db
    .select({ id: hadith.id })
    .from(hadith)
    .where(and(eq(hadith.id, hadithId), eq(hadith.teacherId, teacherId)))
    .limit(1);
  if (!h) return { ok: false, error: "الحديث غير موجود" };

  await db
    .update(hadith)
    .set({
      title,
      narrator: narrator || null,
      arabicText,
      takhrij: takhrij || null,
      // Mark it as hand-edited so a future content-version sync never
      // overwrites the teacher's own wording.
      textEdited: true,
      updatedAt: new Date(),
    })
    .where(eq(hadith.id, hadithId));

  revalidateAll();
  return { ok: true };
}

export async function createHadith(formData: FormData): Promise<Result> {
  const authCheck = await requireTeacherOrThrow();
  if ("error" in authCheck) return { ok: false, error: authCheck.error };
  const { teacherId } = authCheck;

  const title = String(formData.get("title") ?? "").trim();
  const narrator = String(formData.get("narrator") ?? "").trim();
  const arabicText = String(formData.get("arabicText") ?? "").trim();
  const takhrij = String(formData.get("takhrij") ?? "").trim();

  if (!title || !arabicText)
    return { ok: false, error: "العنوان والنص مطلوبان" };

  const [top] = await db
    .select({ order: hadith.order })
    .from(hadith)
    .where(eq(hadith.teacherId, teacherId))
    .orderBy(desc(hadith.order))
    .limit(1);

  await db.insert(hadith).values({
    id: newId("had"),
    teacherId,
    order: (top?.order ?? 0) + 1,
    title,
    narrator: narrator || null,
    arabicText,
    takhrij: takhrij || null,
    published: false,
  });

  revalidateAll();
  return { ok: true };
}

export async function deleteHadith(hadithId: string): Promise<Result> {
  const authCheck = await requireTeacherOrThrow();
  if ("error" in authCheck) return { ok: false, error: authCheck.error };
  const { teacherId } = authCheck;

  const [h] = await db
    .select({ id: hadith.id })
    .from(hadith)
    .where(and(eq(hadith.id, hadithId), eq(hadith.teacherId, teacherId)))
    .limit(1);
  if (!h) return { ok: false, error: "الحديث غير موجود" };

  await db.delete(hadith).where(eq(hadith.id, hadithId));
  await syncFirstHadithAchievement(teacherId);
  revalidateAll();
  return { ok: true };
}

/* ────────────────────────────────
 * Competition
 * ──────────────────────────────── */

export async function setCompetitionEnabled(enabled: boolean): Promise<Result> {
  const authCheck = await requireTeacherOrThrow();
  if ("error" in authCheck) return { ok: false, error: authCheck.error };
  const { teacherId } = authCheck;

  await db
    .insert(competitionSettings)
    .values({ id: teacherId, enabled, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: competitionSettings.id,
      set: { enabled, updatedAt: new Date() },
    });

  revalidateAll();
  return { ok: true };
}

/** A student may only change her own opt-in. */
export async function setMyCompetitionOptIn(optIn: boolean): Promise<Result> {
  await ensureReady();
  const me = await getSessionUser();
  if (!me) return { ok: false, error: "يجب تسجيل الدخول" };
  if (me.role === "admin")
    return { ok: false, error: "هذا الخيار مخصص للطالبات" };

  const [profile] = await db
    .select({ id: student.id })
    .from(student)
    .where(eq(student.userId, me.id))
    .limit(1);
  if (!profile) return { ok: false, error: "الملف غير موجود" };

  await db
    .update(student)
    .set({ competitionOptIn: optIn, updatedAt: new Date() })
    .where(eq(student.id, profile.id));

  revalidateAll();
  return { ok: true };
}

/* ────────────────────────────────
 * Honors & messages
 * ──────────────────────────────── */

export async function addHonor(formData: FormData): Promise<Result> {
  const authCheck = await requireTeacherOrThrow();
  if ("error" in authCheck) return { ok: false, error: authCheck.error };
  const { teacherId } = authCheck;

  const studentId = String(formData.get("studentId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!studentId || !title) return { ok: false, error: "البيانات غير مكتملة" };

  const [s] = await db
    .select({ id: student.id })
    .from(student)
    .where(and(eq(student.id, studentId), eq(student.teacherId, teacherId)))
    .limit(1);
  if (!s) return { ok: false, error: "الطالبة غير موجودة في فصلك" };

  await db.insert(achievement).values({
    id: newId("ach"),
    studentId,
    type: "custom",
    title,
    description: description || null,
    awardedAt: new Date(),
    createdAt: new Date(),
  });

  revalidateAll();
  return { ok: true };
}

export async function deleteHonor(honorId: string): Promise<Result> {
  const authCheck = await requireTeacherOrThrow();
  if ("error" in authCheck) return { ok: false, error: authCheck.error };
  const { teacherId } = authCheck;

  const [row] = await db
    .select({ id: achievement.id })
    .from(achievement)
    .innerJoin(student, eq(student.id, achievement.studentId))
    .where(and(eq(achievement.id, honorId), eq(student.teacherId, teacherId)))
    .limit(1);
  if (!row) return { ok: false, error: "التكريم غير موجود" };

  await db.delete(achievement).where(eq(achievement.id, honorId));
  revalidateAll();
  return { ok: true };
}

export async function addMessage(formData: FormData): Promise<Result> {
  const authCheck = await requireTeacherOrThrow();
  if ("error" in authCheck) return { ok: false, error: authCheck.error };
  const { teacherId } = authCheck;

  const text = String(formData.get("text") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  if (!text) return { ok: false, error: "نص الرسالة مطلوب" };

  await db.insert(message).values({
    id: newId("msg"),
    teacherId,
    text,
    category: category || null,
    active: true,
  });

  revalidateAll();
  return { ok: true };
}

export async function deleteMessage(messageId: string): Promise<Result> {
  const authCheck = await requireTeacherOrThrow();
  if ("error" in authCheck) return { ok: false, error: authCheck.error };
  const { teacherId } = authCheck;

  const [row] = await db
    .select({ id: message.id })
    .from(message)
    .where(and(eq(message.id, messageId), eq(message.teacherId, teacherId)))
    .limit(1);
  if (!row) return { ok: false, error: "الرسالة غير موجودة" };

  await db.delete(message).where(eq(message.id, messageId));
  revalidateAll();
  return { ok: true };
}

/* ────────────────────────────────
 * Registration switch (per teacher)
 * ──────────────────────────────── */

/**
 * The teacher turns self-registration on/off for HER class. Students who join
 * type her code + their name; her code is the join code, so there is nothing
 * else to rotate.
 */
export async function setRegistrationSettings(
  formData: FormData
): Promise<Result> {
  const authCheck = await requireTeacherOrThrow();
  if ("error" in authCheck) return { ok: false, error: authCheck.error };
  const { teacherId } = authCheck;

  const enabled = formData.get("enabled") === "on";

  await db
    .insert(registrationSettings)
    .values({ id: teacherId, enabled, code: null, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: registrationSettings.id,
      set: { enabled, updatedAt: new Date() },
    });

  revalidateAll();
  return { ok: true };
}

/* ────────────────────────────────
 * Sign-in / sign-up with codes
 * ──────────────────────────────── */

/** Teacher sign-in: كود المعلمة + كلمة المرور. */
export async function loginTeacher(formData: FormData): Promise<Result> {
  await ensureReady();
  const res = await signInTeacherWithCode(formData);
  if (res.ok) revalidateAll();
  return res;
}

/** Student sign-in: كود المعلمة (أو كودها الخاص) + الاسم + كلمة المرور. */
export async function loginStudent(formData: FormData): Promise<Result> {
  await ensureReady();
  const res = await signInStudentWithCode(formData);
  if (res.ok) revalidateAll();
  return res;
}

/** A student joins her teacher's class herself (teacher enabled it). */
export async function joinClass(formData: FormData): Promise<Result> {
  await ensureReady();
  const res = await joinWithTeacherCode(formData);
  if (res.ok) revalidateAll();
  return res;
}

/** New teacher space: كود المعلمة + الاسم + كلمة المرور. */
export async function registerTeacher(formData: FormData): Promise<Result> {
  await ensureReady();
  const res = await createTeacherWithCode(formData);
  if (!res.ok) return res;

  // Not signed in yet, so find the space that was just created.
  const { getTeacherByCode } = await import("@/lib/tenancy");
  const created = await getTeacherByCode(
    normalizeCode(String(formData.get("code") ?? ""))
  );
  if (created) await maybeSeedDemoForTeacher(created.id);

  await signInTeacherWithCode(formData);
  revalidateAll();
  return { ok: true };
}

/**
 * First-run setup: the very first teacher of the installation.
 * Runs only while the installation has no teacher at all, so it can never be
 * used to overwrite an existing account.
 */
export async function setupAdmin(formData: FormData): Promise<Result> {
  await ensureReady();
  if (await hasAnyTeacher())
    return { ok: false, error: "تم إعداد الموقع بالفعل — سجّلي الدخول" };

  const res = await createTeacherWithCode(formData);
  if (!res.ok) return res;

  // Not signed in yet, so find the space that was just created.
  const { getTeacherByCode } = await import("@/lib/tenancy");
  const created = await getTeacherByCode(
    normalizeCode(String(formData.get("code") ?? ""))
  );
  if (created) await maybeSeedDemoForTeacher(created.id);

  await signInTeacherWithCode(formData);
  revalidateAll();
  return { ok: true };
}

/* ────────────────────────────────
 * The teacher's own account
 * ──────────────────────────────── */

/** The teacher changes her own password (current password required). */
export async function changeMyPassword(formData: FormData): Promise<Result> {
  await ensureReady();
  const me = await getSessionUser();
  if (!me) return { ok: false, error: "يجب تسجيل الدخول" };

  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (!current || !next) return { ok: false, error: "بيانات غير مكتملة" };
  if (next !== confirm)
    return { ok: false, error: "كلمتا المرور الجديدتان غير متطابقتين" };
  if (next.length < 8)
    return { ok: false, error: "كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل" };
  if (next === current)
    return { ok: false, error: "كلمة المرور الجديدة مطابقة للحالية" };

  const [acc] = await db
    .select()
    .from(account)
    .where(and(eq(account.userId, me.id), eq(account.providerId, "credential")))
    .limit(1);

  if (!acc?.password)
    return { ok: false, error: "لا يمكن تغيير كلمة المرور لهذا الحساب" };

  const valid = await verifyPassword({ hash: acc.password, password: current });
  if (!valid) return { ok: false, error: "كلمة المرور الحالية غير صحيحة" };

  await db
    .update(account)
    .set({ password: await hashPassword(next), updatedAt: new Date() })
    .where(eq(account.id, acc.id));

  revalidateAll();
  return { ok: true };
}

/** The teacher updates her own display name (kept in user + teacher rows). */
export async function updateMyProfile(formData: FormData): Promise<Result> {
  await ensureReady();
  const me = await getSessionUser();
  if (!me) return { ok: false, error: "يجب تسجيل الدخول" };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "الاسم مطلوب" };

  await db
    .update(user)
    .set({ name, updatedAt: new Date() })
    .where(eq(user.id, me.id));

  if (me.teacherId) {
    await db
      .update(teacher)
      .set({ name, updatedAt: new Date() })
      .where(eq(teacher.id, me.teacherId));
  }

  revalidateAll();
  return { ok: true };
}

/**
 * The teacher changes her own login code.
 * The code is unique across the whole app: teachers and student codes share
 * one namespace, so nobody can be reached through two different accounts.
 */
export async function changeTeacherCode(formData: FormData): Promise<Result> {
  const authCheck = await requireTeacherOrThrow();
  if ("error" in authCheck) return { ok: false, error: authCheck.error };
  const { teacherId } = authCheck;

  const code = normalizeCode(String(formData.get("code") ?? ""));
  if (!code) return { ok: false, error: "الكود مطلوب" };
  if (!isValidCode(code))
    return {
      ok: false,
      error: "الكود من 4 إلى 24 حرفًا إنجليزيًا أو أرقامًا (يمكن استخدام - أو _)",
    };

  const [takenByTeacher] = await db
    .select({ id: teacher.id })
    .from(teacher)
    .where(eq(teacher.code, code))
    .limit(1);
  if (takenByTeacher && takenByTeacher.id !== teacherId)
    return { ok: false, error: "هذا الكود مستخدم بالفعل — اختاري كودًا آخر" };

  const [takenByStudent] = await db
    .select({ id: student.id })
    .from(student)
    .where(eq(student.loginCode, code))
    .limit(1);
  if (takenByStudent)
    return { ok: false, error: "هذا الكود مستخدم بالفعل — اختاري كودًا آخر" };

  await db
    .update(teacher)
    .set({ code, displayCode: code, updatedAt: new Date() })
    .where(eq(teacher.id, teacherId));

  revalidateAll();
  return { ok: true, code };
}

/* ────────────────────────────────
 * The student's own result per hadith
 * ──────────────────────────────── */

/**
 * The student records the result her teacher sent her on WhatsApp.
 *
 * Guard rails, all checked on the server:
 *   - she writes only for herself (her own student row);
 *   - only for a hadith that is published *in her own class*;
 *   - the note stays private to her — the teacher never reads it.
 */
export async function saveRecitationNote(formData: FormData): Promise<Result> {
  await ensureReady();
  const me = await getSessionUser();
  if (!me) return { ok: false, error: "يجب تسجيل الدخول" };
  if (me.role === "admin")
    return { ok: false, error: "هذا الجزء مخصّص للطالبات" };

  const [profile] = await db
    .select({ id: student.id, teacherId: student.teacherId })
    .from(student)
    .where(eq(student.userId, me.id))
    .limit(1);
  if (!profile?.teacherId) return { ok: false, error: "الملف غير موجود" };

  const hadithId = String(formData.get("hadithId") ?? "");
  const mistakes = String(formData.get("mistakes") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!hadithId) return { ok: false, error: "الحديث غير محدد" };
  if (mistakes.length > 4000 || body.length > 4000)
    return { ok: false, error: "النص طويل جدًا — اختصريه" };

  // Published in HER class only.
  const [h] = await db
    .select({ id: hadith.id })
    .from(hadith)
    .where(
      and(
        eq(hadith.id, hadithId),
        eq(hadith.teacherId, profile.teacherId),
        eq(hadith.published, true)
      )
    )
    .limit(1);
  if (!h) return { ok: false, error: "الحديث غير متاح" };

  const now = new Date();

  // An empty result clears the note (she may want to start over).
  if (!mistakes && !body) {
    await db
      .delete(recitationNote)
      .where(
        and(
          eq(recitationNote.studentId, profile.id),
          eq(recitationNote.hadithId, hadithId)
        )
      );
    revalidateAll();
    return { ok: true };
  }

  await db
    .insert(recitationNote)
    .values({
      id: newId("note"),
      studentId: profile.id,
      hadithId,
      mistakes: mistakes || null,
      body: body || null,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [recitationNote.studentId, recitationNote.hadithId],
      set: {
        mistakes: mistakes || null,
        body: body || null,
        updatedAt: now,
      },
    });

  revalidateAll();
  return { ok: true };
}
