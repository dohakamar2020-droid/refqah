/**
 * Manual seed entry point: `npm run seed`
 *
 * Creates the schema, the 42 hadiths, the message library and the first
 * teacher account. With the local PGlite database it also adds demo students
 * and publishes the first 12 hadiths so the UI can be explored.
 *
 * Against Neon (DATABASE_URL set) no demo students are created unless you
 * pass SEED_DEMO_STUDENTS=true.
 */
import { ensureReady } from "../src/lib/db/ready";
import { db } from "../src/lib/db";
import { hadith, student, user } from "../src/lib/db/schema";
import { sql } from "drizzle-orm";

async function main() {
  await ensureReady();

  const [h] = await db.select({ n: sql<number>`count(*)::int` }).from(hadith);
  const [s] = await db.select({ n: sql<number>`count(*)::int` }).from(student);
  const [u] = await db.select({ n: sql<number>`count(*)::int` }).from(user);
  const [p] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(hadith)
    .where(sql`${hadith.published} = true`);

  console.log("✅ تم تجهيز قاعدة البيانات");
  console.log(`   الأحاديث: ${h?.n ?? 0} (المنشور منها: ${p?.n ?? 0})`);
  console.log(`   الطالبات: ${s?.n ?? 0}`);
  console.log(`   الحسابات: ${u?.n ?? 0}`);
  console.log(
    `\n   بيانات دخول المعلمة: ${
      process.env.ADMIN_USERNAME || "admin"
    } / ${process.env.ADMIN_PASSWORD || "admin12345"}`
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ فشل تجهيز قاعدة البيانات:", err);
    process.exit(1);
  });
