import { sql, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  teacher,
  student,
  hadith,
  message,
  competitionSettings,
  registrationSettings,
  user,
  siteMeta,
} from "@/lib/db/schema";
import { normalizeCode } from "@/lib/codes";
import { newStudentCode, newTeacherCode, seedTeacherSpace } from "@/lib/db/seed";

/**
 * Multi-teacher tenancy helpers.
 *
 * The database is shared (one Postgres/Neon database), but every row that
 * belongs to a class carries its owner:
 *   teacher.id  →  student.teacher_id, hadith.teacher_id, message.teacher_id,
 *                  competition_settings.id, registration_settings.id
 * Recitations and achievements belong to a student, and a student belongs to
 * exactly one teacher — so the whole class graph is isolated.
 *
 * Nothing in this app may read class data without going through
 * `getTeacherByUserId` / `requireTeacher` first.
 */

export async function getTeacherByUserId(userId: string) {
  const [row] = await db
    .select()
    .from(teacher)
    .where(eq(teacher.userId, userId))
    .limit(1);
  return row ?? null;
}

/** Look a teacher up by her code («TCH-4K7T2M», or her own custom code). */
export async function getTeacherByCode(rawCode: string) {
  const code = normalizeCode(rawCode);
  if (!code) return null;
  const [row] = await db
    .select()
    .from(teacher)
    .where(eq(teacher.code, code))
    .limit(1);
  return row ?? null;
}

export async function getTeacherById(teacherId: string) {
  const [row] = await db
    .select()
    .from(teacher)
    .where(eq(teacher.id, teacherId))
    .limit(1);
  return row ?? null;
}

/** Students of one teacher only. */
export function ownedStudentFilter(teacherId: string) {
  return eq(student.teacherId, teacherId);
}

/* ────────────────────────────────
 * Legacy data adoption
 * ──────────────────────────────── */

const LEGACY_KEY = "legacy_data_adopted";

/**
 * Runs once per installation, after the schema exists.
 *
 * Before multi-teacher support the app had a single teacher: `hadith`,
 * `student` and `message` rows had no owner, and the settings tables used the
 * fixed id "main". This function creates a `teacher` row for the first admin
 * account and hands her all the orphaned rows, so an existing installation
 * keeps its class exactly as it was.
 *
 * It is guarded by a marker in `site_meta`, so later teachers are never
 * affected and the work is not repeated on every boot.
 */
export async function adoptLegacyData(): Promise<void> {
  const [done] = await db
    .select({ value: siteMeta.value })
    .from(siteMeta)
    .where(eq(siteMeta.key, LEGACY_KEY))
    .limit(1);
  if (done) return;

  const [orphanHadith] = await db
    .select({ id: hadith.id })
    .from(hadith)
    .where(isNull(hadith.teacherId))
    .limit(1);
  const [orphanStudent] = await db
    .select({ id: student.id })
    .from(student)
    .where(isNull(student.teacherId))
    .limit(1);
  const [orphanMessage] = await db
    .select({ id: message.id })
    .from(message)
    .where(isNull(message.teacherId))
    .limit(1);

  // Nothing to adopt and no teacher yet → a truly fresh install; nothing to do.
  if ((!orphanHadith && !orphanStudent && !orphanMessage) || (await hasTeachers())) {
    await markAdopted();
    return;
  }

  const [admin] = await db
    .select({ id: user.id, name: user.name })
    .from(user)
    .where(eq(user.role, "admin"))
    .orderBy(user.createdAt)
    .limit(1);

  if (!admin) return; // setup screen has not run yet — check again later

  const code = normalizeCode(process.env.ADMIN_CODE || "") || (await newTeacherCode());
  const teacherId = `tch_${crypto.randomUUID()}`;
  const now = new Date();

  await db.insert(teacher).values({
    id: teacherId,
    userId: admin.id,
    name: admin.name,
    code,
    displayCode: code,
    createdAt: now,
    updatedAt: now,
  });

  // Hand over everything that predates the teacher_id columns.
  await db.update(student).set({ teacherId }).where(isNull(student.teacherId));
  await db.update(hadith).set({ teacherId }).where(isNull(hadith.teacherId));
  await db.update(message).set({ teacherId }).where(isNull(message.teacherId));

  // Carry the old "main" switches over to her own rows.
  const [oldCompetition] = await db
    .select()
    .from(competitionSettings)
    .where(eq(competitionSettings.id, "main"))
    .limit(1);
  await db
    .insert(competitionSettings)
    .values({ id: teacherId, enabled: oldCompetition?.enabled ?? false })
    .onConflictDoNothing();

  const [oldRegistration] = await db
    .select()
    .from(registrationSettings)
    .where(eq(registrationSettings.id, "main"))
    .limit(1);
  await db
    .insert(registrationSettings)
    .values({
      id: teacherId,
      enabled: oldRegistration?.enabled ?? false,
      code: oldRegistration?.code ?? null,
    })
    .onConflictDoNothing();

  // Students from before codes existed get one now, so they can sign in with
  // «كود المعلمة + اسمها + كلمة المرور» straight away.
  const codeless = await db
    .select({ id: student.id })
    .from(student)
    .where(isNull(student.loginCode));
  for (const s of codeless) {
    await db
      .update(student)
      .set({ loginCode: await newStudentCode(), updatedAt: new Date() })
      .where(eq(student.id, s.id));
  }

  // Fill any gap (missing hadiths / messages / switches) for her space.
  await seedTeacherSpace(teacherId);
  await markAdopted();
}

async function hasTeachers() {
  const [row] = await db.select({ id: teacher.id }).from(teacher).limit(1);
  return Boolean(row);
}

async function markAdopted() {
  await db
    .insert(siteMeta)
    .values({ key: LEGACY_KEY, value: "1", updatedAt: new Date() })
    .onConflictDoNothing();
}

/* ────────────────────────────────
 * Public info
 * ──────────────────────────────── */

/** Teacher + her students count, for the public landing page. */
export async function getTeacherPublicInfo(teacherId: string) {
  const [row] = await db
    .select({
      id: teacher.id,
      name: teacher.name,
      code: teacher.displayCode,
      students: sql<number>`count(${student.id})::int`,
    })
    .from(teacher)
    .leftJoin(student, eq(student.teacherId, teacher.id))
    .where(eq(teacher.id, teacherId))
    .groupBy(teacher.id, teacher.name, teacher.displayCode)
    .limit(1);
  return row ?? null;
}

/**
 * Resolve the class shown to visitors: «كود المعلمة» in the URL.
 * A wrong or empty code simply yields null (the page shows the lookup form).
 */
export async function resolveClass(rawCode: string | undefined) {
  if (!rawCode) return null;
  return getTeacherByCode(rawCode);
}
