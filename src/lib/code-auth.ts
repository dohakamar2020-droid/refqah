import { headers, cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { student, user, teacher } from "@/lib/db/schema";
import { isValidCode, normalizeCode, normalizeName } from "@/lib/codes";
import { getTeacherByCode, getTeacherById } from "@/lib/tenancy";
import {
  createUserWithPassword,
  createTeacherProfile,
  newStudentCode,
} from "@/lib/db/seed";

type Result = { ok: boolean; error?: string; code?: string };

export const INVALID_LOGIN = "البيانات غير صحيحة — راجعي الكود والاسم وكلمة المرور";

/** Username derived from a code (Better Auth needs one internally). */
export function usernameForCode(code: string) {
  return code.replace(/-/g, "").toLowerCase().slice(0, 28);
}

/**
 * Sign a user in with email + password, and hand the resulting session
 * cookie to the current request.
 *
 * Email (not username) is used on purpose: usernames are derived from codes and
 * the username plugin rejects anything outside [a-z0-9_], while every account
 * here always has an email.
 *
 * `auth.api.*` calls made from a Server Action do not go through Better Auth's
 * own route handler, so the `nextCookies` plugin cannot copy the cookie for us
 * (it needs the Response). We copy it here: the API is asked to return its
 * headers, and they are written to Next's cookie jar — exactly what the plugin
 * does for HTTP requests.
 *
 * Returns null on success, or a user-facing error message.
 */
export async function signInWithPassword(
  email: string,
  password: string
): Promise<string | null> {
  try {
    const res = (await auth.api.signInEmail({
      body: { email, password },
      headers: await headers(),
      returnHeaders: true,
    })) as { headers?: Headers } | undefined;

    const rawSetCookie = res?.headers?.get("set-cookie");
    if (!rawSetCookie) return "تعذّر حفظ الجلسة — حاولي مرة أخرى";

    const { parseSetCookieHeader, toCookieOptions } = await import(
      "better-auth/cookies"
    );
    const jar = await cookies();
    parseSetCookieHeader(rawSetCookie).forEach((value, key) => {
      if (!key) return;
      try {
        jar.set(key, value.value, toCookieOptions(value));
      } catch {
        // Outside a writable cookie context (e.g. a plain Server Component).
      }
    });
    return null;
  } catch {
    return INVALID_LOGIN;
  }
}

/* ────────────────────────────────
 * Teacher space
 * ──────────────────────────────── */

/**
 * Create a brand-new teacher space: «كود المعلمة + الاسم + كلمة المرور».
 *
 * The code names the space, the name is shown on her pages, and the password
 * protects the account. A hidden username (derived from the code) is stored
 * because Better Auth needs one; it is never shown to her.
 */
export async function createTeacherWithCode(formData: FormData): Promise<Result> {
  const code = normalizeCode(String(formData.get("code") ?? ""));
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (!name) return { ok: false, error: "اسم المعلمة مطلوب" };
  if (!code) return { ok: false, error: "كود المعلمة مطلوب" };
  if (!isValidCode(code))
    return {
      ok: false,
      error: "الكود من 4 إلى 24 حرفًا إنجليزيًا أو أرقامًا (يمكن استخدام - أو _)",
    };
  if (await isCodeTaken(code))
    return { ok: false, error: "هذا الكود مستخدم بالفعل — اختاري كودًا آخر" };
  if (password.length < 8)
    return { ok: false, error: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" };
  if (password !== confirm)
    return { ok: false, error: "كلمتا المرور غير متطابقتين" };

  const username = usernameForCode(code);
  try {
    const { userId } = await createUserWithPassword({
      name,
      email: `${username}@refqah.local`,
      username,
      password,
      role: "admin",
    });
    await createTeacherProfile({ userId, name, code });
  } catch {
    return { ok: false, error: "تعذّر إنشاء الحساب — الكود مستخدم بالفعل" };
  }

  return { ok: true };
}

/**
 * Teacher sign-in: «كود المعلمة + كلمة المرور». The name is optional — the code
 * is unique across the whole app, so two teachers may share a first name.
 */
export async function signInTeacherWithCode(formData: FormData): Promise<Result> {
  const code = normalizeCode(String(formData.get("code") ?? ""));
  const password = String(formData.get("password") ?? "").trim();

  if (!code || !password)
    return { ok: false, error: "كود المعلمة وكلمة المرور مطلوبان" };

  const t = await getTeacherByCode(code);
  if (!t) return { ok: false, error: "لا توجد معلمة بهذا الكود" };

  const [row] = await db
    .select({ email: user.email, username: user.username })
    .from(user)
    .where(eq(user.id, t.userId))
    .limit(1);

  // The role is read from the database, not from the (stale) request headers:
  // the cookie we just wrote is only visible on the next request.
  const [accountRow] = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, t.userId))
    .limit(1);
  if (accountRow?.role !== "admin") return { ok: false, error: INVALID_LOGIN };

  const error = await signInWithPassword(
    row?.email ?? `${row?.username ?? ""}@refqah.local`,
    password
  );
  return error ? { ok: false, error } : { ok: true };
}

/* ────────────────────────────────
 * Student accounts
 * ──────────────────────────────── */

/**
 * Resolve a login code to a class:
 *   - a student's personal code (`STU-…`) → that student;
 *   - her teacher's code (`TCH-…`)     → the student with that name in her class.
 */
async function resolveStudentByCodeAndName(
  rawCode: string,
  name: string,
  teacherCodeHint?: string
) {
  const code = normalizeCode(rawCode);

  const [byOwnCode] = await db
    .select({ id: student.id, userId: student.userId, displayName: student.displayName })
    .from(student)
    .where(eq(student.loginCode, code))
    .limit(1);

  if (byOwnCode) {
    return normalizeName(byOwnCode.displayName) === normalizeName(name)
      ? byOwnCode
      : null;
  }

  const t =
    (await getTeacherByCode(code)) ??
    (teacherCodeHint
      ? await getTeacherByCode(normalizeCode(teacherCodeHint))
      : null);
  if (!t) return null;

  const rows = await db
    .select({ id: student.id, userId: student.userId, displayName: student.displayName })
    .from(student)
    .where(eq(student.teacherId, t.id));

  const matches = rows.filter(
    (r) => normalizeName(r.displayName) === normalizeName(name)
  );
  return matches.length === 1 ? matches[0] : null;
}

/**
 * Student sign-in: «كود المعلمة + اسم الطالبة + كلمة المرور».
 *
 * The name must match the record the teacher registered for that class, so a
 * shared class code alone never opens someone else's journal. Every failure
 * returns the same message — it never reveals which of the three was wrong.
 */
export async function signInStudentWithCode(formData: FormData): Promise<Result> {
  const rawCode = String(formData.get("code") ?? "");
  const teacherCode = String(formData.get("teacherCode") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!normalizeCode(rawCode) || !name || !password)
    return { ok: false, error: "الكود والاسم وكلمة المرور مطلوبون" };

  const match = await resolveStudentByCodeAndName(
    rawCode,
    name,
    teacherCode || undefined
  );
  if (!match) return { ok: false, error: INVALID_LOGIN };

  const [row] = await db
    .select({ email: user.email, username: user.username })
    .from(user)
    .where(eq(user.id, match.userId))
    .limit(1);

  const error = await signInWithPassword(
    row?.email ?? `${row?.username ?? ""}@refqah.local`,
    password
  );
  return error ? { ok: false, error: INVALID_LOGIN } : { ok: true };
}

/**
 * A student joins her teacher's class herself (self-registration on):
 * «كود المعلمة + اسمها + كلمة مرور تختارها».
 */
export async function joinWithTeacherCode(formData: FormData): Promise<Result> {
  const rawCode = String(formData.get("code") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");
  const code = normalizeCode(rawCode);

  if (!code) return { ok: false, error: "كود المعلمة مطلوب" };
  if (!name) return { ok: false, error: "الاسم مطلوب" };
  if (password.length < 8)
    return { ok: false, error: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" };
  if (password !== confirm)
    return { ok: false, error: "كلمتا المرور غير متطابقتين" };

  const t = await getTeacherByCode(code);
  if (!t) return { ok: false, error: "لا توجد معلمة بهذا الكود" };

  const { getRegistrationSettings } = await import("@/lib/queries");
  const settings = await getRegistrationSettings(t.id);
  if (!settings.enabled)
    return {
      ok: false,
      error: "التسجيل الذاتي مغلق في هذا الفصل — تواصلي مع معلمتك",
    };

  const classmates = await db
    .select({ displayName: student.displayName })
    .from(student)
    .where(eq(student.teacherId, t.id));
  if (classmates.some((s) => normalizeName(s.displayName) === normalizeName(name)))
    return {
      ok: false,
      error: "هذا الاسم مسجّل بالفعل في الفصل — راجعي معلمتك",
    };

  // She gets her own code too, so she can sign in directly next time.
  const loginCode = await newStudentCode();
  const username = loginCode.replace(/-/g, "").toLowerCase();
  try {
    await createUserWithPassword({
      name,
      email: `${username}@refqah.local`,
      username,
      password,
      role: "student",
      displayName: name,
      teacherId: t.id,
      loginCode,
      competitionOptIn: false, // she opts in herself later
    });
  } catch {
    return { ok: false, error: "تعذّر إنشاء الحساب — حاولي مرة أخرى" };
  }

  await signInWithPassword(`${username}@refqah.local`, password);
  return { ok: true, code: loginCode };
}

/* ────────────────────────────────
 * helpers
 * ──────────────────────────────── */

/** True when the code is already a teacher code or a student code. */
export async function isCodeTaken(code: string) {
  const [s] = await db
    .select({ id: student.id })
    .from(student)
    .where(eq(student.loginCode, code))
    .limit(1);
  if (s) return true;
  const [t] = await db
    .select({ id: teacher.id })
    .from(teacher)
    .where(eq(teacher.code, code))
    .limit(1);
  return Boolean(t);
}
