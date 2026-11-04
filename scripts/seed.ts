/**
 * Manual seed entry point: `npm run seed`
 *
 * Creates the schema, the 42 hadiths and the message library. With the local
 * PGlite database it also adds demo students and publishes the first 12
 * hadiths so the UI can be explored.
 *
 * The teacher account is NOT created by default any more — a fresh install
 * shows the first-run setup screen at /setup. To provision the first teacher
 * headlessly (CI / scripted deploys) set:
 *   SEED_ADMIN=true ADMIN_CODE=... ADMIN_PASSWORD=...
 *
 * Every teacher owns a fully separate space (her hadiths, her students, her
 * recitations, reports and honors). Additional teachers open their own space
 * from /register with a code of their choosing.
 *
 * Against Neon (DATABASE_URL set) no demo students are created unless you
 * pass SEED_DEMO_STUDENTS=true.
 */
import { ensureReady } from "../src/lib/db/ready";
import { db } from "../src/lib/db";
import { hadith, student, user } from "../src/lib/db/schema";
import { sql, eq } from "drizzle-orm";

async function main() {
  await ensureReady();

  const [h] = await db.select({ n: sql<number>`count(*)::int` }).from(hadith);
  const [s] = await db.select({ n: sql<number>`count(*)::int` }).from(student);
  const [a] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(user)
    .where(eq(user.role, "admin"));
  const [p] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(hadith)
    .where(sql`${hadith.published} = true`);

  console.log("✅ تم تجهيز قاعدة البيانات");
  console.log(`   الأحاديث: ${h?.n ?? 0} (المنشور منها: ${p?.n ?? 0})`);
  console.log(`   الطالبات: ${s?.n ?? 0}`);
  console.log(`   حسابات المعلمة: ${a?.n ?? 0}`);
  console.log("");

  if ((a?.n ?? 0) === 0) {
    console.log("   ⚠️  لا يوجد حساب معلمة بعد.");
    console.log("   افتحي الموقع — ستظهر شاشة الإعداد الأولى (/setup) لإنشاء الحساب.");
    console.log("");
    console.log("   أو أنشئيه من سطر الأوامر:");
    console.log("   SEED_ADMIN=true ADMIN_CODE=TCH-XXXXXX \\");
    console.log("   ADMIN_PASSWORD=<كلمة-مرور-قوية> npm run seed");
  } else {
    console.log("   ✅ يوجد حساب معلمة — يمكن الدخول من /login");
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ فشل تجهيز قاعدة البيانات:", err);
    process.exit(1);
  });
