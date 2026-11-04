import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { student, teacher } from "@/lib/db/schema";
import { getTeacherByUserId } from "@/lib/tenancy";
import { ensureReady } from "@/lib/db/ready";
import { isBuildPhase } from "@/lib/build-phase";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  username?: string | null;
  role: string;
  image?: string | null;
  /** للمعلمة: معرّف مساحتها. للطالبة: معرّف معلمتها. */
  teacherId: string | null;
  /** كود المعلمة — يُعرض لها فقط */
  teacherCode: string | null;
};

/**
 * Current session user (with role, username and her tenant) or null.
 * Cached per request: the header, the page and the actions all ask for it.
 */
export const getSessionUser = cache(
  async function getSessionUser(): Promise<SessionUser | null> {
    // Static generation has no request context and no data — skip the database.
    if (isBuildPhase()) return null;
    await ensureReady();
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return null;
    const u = session.user as unknown as Omit<SessionUser, "teacherId" | "teacherCode">;

    if (u.role === "admin") {
      const t = await getTeacherByUserId(u.id);
      return { ...u, teacherId: t?.id ?? null, teacherCode: t?.code ?? null };
    }

    const [profile] = await db
      .select({ teacherId: student.teacherId })
      .from(student)
      .where(eq(student.userId, u.id))
      .limit(1);
    return { ...u, teacherId: profile?.teacherId ?? null, teacherCode: null };
  }
);

/** Require any logged-in user, otherwise redirect to /login. */
export async function requireUser(): Promise<SessionUser> {
  const u = await getSessionUser();
  if (!u) redirect("/login");
  return u;
}

/**
 * Require the teacher — the only account type allowed to write.
 * Returns both the session user and her teacher row (her space).
 */
export async function requireTeacher(): Promise<{
  user: SessionUser;
  teacher: typeof teacher.$inferSelect;
}> {
  const u = await requireUser();
  if (u.role !== "admin") redirect("/");
  const t = await getTeacherByUserId(u.id);
  // The teacher row is created on boot for every admin account; if it is
  // missing something is wrong with the installation, not with her access.
  if (!t) redirect("/login");
  return { user: u, teacher: t };
}

/** Require the teacher (admin), otherwise redirect. Kept for page guards. */
export async function requireAdmin(): Promise<SessionUser> {
  const u = await requireTeacher();
  return u.user;
}

/** Require a student account, otherwise redirect. */
export async function requireStudent(): Promise<{
  user: SessionUser;
  student: typeof student.$inferSelect;
}> {
  const u = await requireUser();
  if (u.role === "admin") redirect("/admin");
  const [profile] = await db
    .select()
    .from(student)
    .where(eq(student.userId, u.id))
    .limit(1);
  if (!profile) redirect("/login");
  return { user: u, student: profile };
}

/** Student profile for a user id (or null). */
export async function getStudentByUserId(userId: string) {
  const [profile] = await db
    .select()
    .from(student)
    .where(eq(student.userId, userId))
    .limit(1);
  return profile ?? null;
}
