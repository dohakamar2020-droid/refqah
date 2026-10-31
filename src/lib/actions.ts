"use server";

import { revalidatePath } from "next/cache";
import { eq, and, desc } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { db } from "@/lib/db";
import {
  recitation,
  student,
  user,
  account,
  hadith,
  achievement,
  competitionSettings,
  message,
} from "@/lib/db/schema";
import { ensureReady } from "@/lib/db/ready";
import { syncFirstHadithAchievement, createUserWithPassword } from "@/lib/db/seed";
import { getSessionUser } from "@/lib/permissions";

type Result = { ok: boolean; error?: string };

/** Every write goes through here: the teacher is the only writer. */
async function requireAdminOrThrow() {
  const me = await getSessionUser();
  if (!me) return { error: "يجب تسجيل الدخول" } as const;
  if (me.role !== "admin")
    return { error: "ليس لديك صلاحية لتعديل البيانات" } as const;
  return { me } as const;
}

function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function revalidateAll() {
  revalidatePath("/", "layout");
}

/* ────────────────────────────────
 * Recitations (the heart of the app)
 * ──────────────────────────────── */

export async function setRecitation(
  studentId: string,
  hadithId: string,
  recited: boolean
): Promise<Result> {
  await ensureReady();
  const authCheck = await requireAdminOrThrow();
  if ("error" in authCheck) return { ok: false, error: authCheck.error };

  // Only published hadiths can be marked as recited.
  const [h] = await db.select().from(hadith).where(eq(hadith.id, hadithId)).limit(1);
  if (!h) return { ok: false, error: "الحديث غير موجود" };
  if (recited && !h.published)
    return { ok: false, error: "لا يمكن تسجيل تسميع حديث لم يُنشر بعد" };

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

  await syncFirstHadithAchievement();
  revalidateAll();
  return { ok: true };
}

/* ────────────────────────────────
 * Students
 * ──────────────────────────────── */

export async function createStudent(formData: FormData): Promise<Result> {
  await ensureReady();
  const authCheck = await requireAdminOrThrow();
  if ("error" in authCheck) return { ok: false, error: authCheck.error };

  const name = String(formData.get("name") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const emailRaw = String(formData.get("email") ?? "").trim();
  const optIn = formData.get("competitionOptIn") === "on";

  if (!name) return { ok: false, error: "اسم الطالبة مطلوب" };
  if (username.length < 3)
    return { ok: false, error: "اسم المستخدم يجب أن يكون 3 أحرف على الأقل" };
  if (password.length < 6)
    return { ok: false, error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" };

  const email = emailRaw || `${username.toLowerCase()}@refqah.local`;

  try {
    await createUserWithPassword({
      name,
      email,
      username,
      password,
      role: "student",
      displayName: name,
      competitionOptIn: optIn,
    });
  } catch {
    return { ok: false, error: "اسم المستخدم أو البريد مستخدم بالفعل" };
  }

  revalidateAll();
  return { ok: true };
}

export async function updateStudent(formData: FormData): Promise<Result> {
  await ensureReady();
  const authCheck = await requireAdminOrThrow();
  if ("error" in authCheck) return { ok: false, error: authCheck.error };

  const studentId = String(formData.get("studentId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const optIn = formData.get("competitionOptIn") === "on";
  const password = String(formData.get("password") ?? "").trim();

  if (!studentId || !name) return { ok: false, error: "بيانات غير مكتملة" };
  if (password && password.length < 6)
    return { ok: false, error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" };

  const [s] = await db
    .select({ userId: student.userId })
    .from(student)
    .where(eq(student.id, studentId))
    .limit(1);
  if (!s) return { ok: false, error: "الطالبة غير موجودة" };

  await db
    .update(student)
    .set({ displayName: name, competitionOptIn: optIn, updatedAt: new Date() })
    .where(eq(student.id, studentId));

  await db
    .update(user)
    .set({ name, updatedAt: new Date() })
    .where(eq(user.id, s.userId));

  if (password) {
    const hashed = await hashPassword(password);
    await db
      .update(account)
      .set({ password: hashed })
      .where(
        and(eq(account.userId, s.userId), eq(account.providerId, "credential"))
      );
  }

  revalidateAll();
  return { ok: true };
}

export async function deleteStudent(studentId: string): Promise<Result> {
  await ensureReady();
  const authCheck = await requireAdminOrThrow();
  if ("error" in authCheck) return { ok: false, error: authCheck.error };

  const [s] = await db
    .select({ userId: student.userId })
    .from(student)
    .where(eq(student.id, studentId))
    .limit(1);
  if (!s) return { ok: false, error: "الطالبة غير موجودة" };

  // Cascades remove the profile, recitations and achievements.
  await db.delete(user).where(eq(user.id, s.userId));
  await syncFirstHadithAchievement();
  revalidateAll();
  return { ok: true };
}

/* ────────────────────────────────
 * Hadiths
 * ──────────────────────────────── */

export async function setHadithPublished(
  hadithId: string,
  published: boolean
): Promise<Result> {
  await ensureReady();
  const authCheck = await requireAdminOrThrow();
  if ("error" in authCheck) return { ok: false, error: authCheck.error };

  const [h] = await db.select().from(hadith).where(eq(hadith.id, hadithId)).limit(1);
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
  await ensureReady();
  const authCheck = await requireAdminOrThrow();
  if ("error" in authCheck) return { ok: false, error: authCheck.error };

  const hadithId = String(formData.get("hadithId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const arabicText = String(formData.get("arabicText") ?? "").trim();
  const source = String(formData.get("source") ?? "").trim();

  if (!hadithId || !title || !arabicText)
    return { ok: false, error: "العنوان والنص مطلوبان" };

  await db
    .update(hadith)
    .set({ title, arabicText, source: source || null, updatedAt: new Date() })
    .where(eq(hadith.id, hadithId));

  revalidateAll();
  return { ok: true };
}

export async function createHadith(formData: FormData): Promise<Result> {
  await ensureReady();
  const authCheck = await requireAdminOrThrow();
  if ("error" in authCheck) return { ok: false, error: authCheck.error };

  const title = String(formData.get("title") ?? "").trim();
  const arabicText = String(formData.get("arabicText") ?? "").trim();
  const source = String(formData.get("source") ?? "").trim();

  if (!title || !arabicText) return { ok: false, error: "العنوان والنص مطلوبان" };

  const [top] = await db
    .select({ order: hadith.order })
    .from(hadith)
    .orderBy(desc(hadith.order))
    .limit(1);

  await db.insert(hadith).values({
    id: newId("had"),
    order: (top?.order ?? 0) + 1,
    title,
    arabicText,
    source: source || null,
    published: false,
  });

  revalidateAll();
  return { ok: true };
}

export async function deleteHadith(hadithId: string): Promise<Result> {
  await ensureReady();
  const authCheck = await requireAdminOrThrow();
  if ("error" in authCheck) return { ok: false, error: authCheck.error };
  await db.delete(hadith).where(eq(hadith.id, hadithId));
  await syncFirstHadithAchievement();
  revalidateAll();
  return { ok: true };
}

/* ────────────────────────────────
 * Competition
 * ──────────────────────────────── */

export async function setCompetitionEnabled(enabled: boolean): Promise<Result> {
  await ensureReady();
  const authCheck = await requireAdminOrThrow();
  if ("error" in authCheck) return { ok: false, error: authCheck.error };

  await db
    .insert(competitionSettings)
    .values({ id: "main", enabled, updatedAt: new Date() })
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

  // Nothing to show on the board if the teacher switched the competition off.
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
  await ensureReady();
  const authCheck = await requireAdminOrThrow();
  if ("error" in authCheck) return { ok: false, error: authCheck.error };

  const studentId = String(formData.get("studentId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!studentId || !title) return { ok: false, error: "البيانات غير مكتملة" };

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
  await ensureReady();
  const authCheck = await requireAdminOrThrow();
  if ("error" in authCheck) return { ok: false, error: authCheck.error };
  await db.delete(achievement).where(eq(achievement.id, honorId));
  revalidateAll();
  return { ok: true };
}

export async function addMessage(formData: FormData): Promise<Result> {
  await ensureReady();
  const authCheck = await requireAdminOrThrow();
  if ("error" in authCheck) return { ok: false, error: authCheck.error };

  const text = String(formData.get("text") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  if (!text) return { ok: false, error: "نص الرسالة مطلوب" };

  await db.insert(message).values({
    id: newId("msg"),
    text,
    category: category || null,
    active: true,
  });

  revalidateAll();
  return { ok: true };
}

export async function deleteMessage(messageId: string): Promise<Result> {
  await ensureReady();
  const authCheck = await requireAdminOrThrow();
  if ("error" in authCheck) return { ok: false, error: authCheck.error };
  await db.delete(message).where(eq(message.id, messageId));
  revalidateAll();
  return { ok: true };
}
