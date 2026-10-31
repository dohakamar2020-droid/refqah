import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db, student } from "@/lib/db";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  username?: string | null;
  role: string;
  image?: string | null;
};

/** Current session user (with role + username) or null. Works in pages & route handlers. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  const u = session.user as unknown as SessionUser;
  return u;
}

/** Require any logged-in user, otherwise redirect to /login. */
export async function requireUser(): Promise<SessionUser> {
  const u = await getSessionUser();
  if (!u) redirect("/login");
  return u;
}

/** Require the teacher (admin), otherwise redirect. */
export async function requireAdmin(): Promise<SessionUser> {
  const u = await requireUser();
  if (u.role !== "admin") redirect("/");
  return u;
}

/** Require a student account, otherwise redirect. */
export async function requireStudent(): Promise<{ user: SessionUser; student: typeof student.$inferSelect }> {
  const u = await requireUser();
  if (u.role === "admin") redirect("/admin");
  const [profile] = await db.select().from(student).where(eq(student.userId, u.id)).limit(1);
  if (!profile) redirect("/login");
  return { user: u, student: profile };
}

/** Student profile for a user id (or null). */
export async function getStudentByUserId(userId: string) {
  const [profile] = await db.select().from(student).where(eq(student.userId, userId)).limit(1);
  return profile ?? null;
}
