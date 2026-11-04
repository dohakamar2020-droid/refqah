import Link from "next/link";
import { getSessionUser } from "@/lib/permissions";
import { getPublicClasses } from "@/lib/queries";
import { ensureReady } from "@/lib/db/ready";
import { FloralBranch, OrnamentDivider, SmallFlower } from "@/components/floral";
import { ClassLookupForm } from "@/components/class-lookup-form";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await ensureReady();
  const [me, classes] = await Promise.all([getSessionUser(), getPublicClasses()]);

  const journeyHref = me ? (me.role === "admin" ? "/admin" : "/me") : "/login";

  return (
    <div className="relative overflow-hidden">
      {/* ── Hero ───────────────────────────────────────── */}
      <section className="relative mx-auto max-w-6xl px-4 pb-10 pt-14 sm:px-6 sm:pt-20">
        <FloralBranch className="pointer-events-none absolute -left-10 top-0 hidden h-72 w-auto opacity-70 lg:block" />
        <FloralBranch className="pointer-events-none absolute -right-10 top-10 hidden h-64 w-auto -scale-x-100 opacity-50 lg:block" />

        <div className="relative mx-auto max-w-3xl text-center">
          <span className="chip bg-powder text-deep">
            <SmallFlower className="h-3.5 w-3.5 text-dusty" />
            دورة الأربعين النووية
          </span>

          <h1 className="mt-6 font-display text-4xl leading-tight text-deep sm:text-6xl">
            رِفقة الأربعين
          </h1>

          <OrnamentDivider className="mx-auto mt-4 h-6 w-56 text-dusty" />

          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted sm:text-xl">
            رحلة علمٍ وحفظٍ وعمل.. كل معلمة وطالباتها في مساحة مستقلة بكودها،
            ونتعلم فيها من أحاديث رسول الله ﷺ حتى تمام الرحلة.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href={journeyHref} className="btn-primary">
              {me ? "تابعي رحلة الحفظ" : "سجّلي الدخول بالكود"}
            </Link>
            <Link href="/register" className="btn-ghost">
              مساحة معلمة جديدة
            </Link>
          </div>
        </div>
      </section>

      {/* ── Class lookup ───────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <div className="card card-pad">
          <div className="flex items-center gap-2">
            <SmallFlower className="h-5 w-5 text-dusty" />
            <h2 className="font-display text-2xl text-deep">أين مساحتي؟</h2>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            اكتبي كود المعلمة لتفتحي صفحة فصلها: الأحاديث المنشورة، ولوحة
            المنافسة الخاصة بطالباتها فقط. لكل معلمة صفحة مستقلة، ولا تظهر
            طالبات معلمة في مساحة غيرها.
          </p>
          <div className="mt-5">
            <ClassLookupForm />
          </div>
          <p className="mt-3 text-xs text-muted">
            طالبة؟{" "}
            <Link
              href="/login"
              className="underline decoration-dusty underline-offset-4"
            >
              سجّلي الدخول
            </Link>{" "}
            بكود معلمتك واسمك وكلمة المرور.
          </p>
        </div>
      </section>

      {/* ── Classes overview ───────────────────────────── */}
      {classes.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="text-center">
            <span className="chip bg-powder text-deep">فصول الرحلة</span>
            <h2 className="mt-3 font-display text-2xl text-deep sm:text-3xl">
              {classes.length} مساحة معلمة، كل واحدة بفصلها
            </h2>
            <p className="mt-2 text-sm text-muted">
              نعرض أسماء المعلمات وتقدّم الأحاديث المنشورة فقط — دون أي أسماء أو
              إحصائيات عن الطالبات.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {classes.map((c) => (
              <div key={c.teacherId} className="card card-pad">
                <p className="flex items-center gap-2 text-xs text-muted">
                  <SmallFlower className="h-4 w-4 text-dusty" />
                  مساحة معلمة
                </p>
                <p className="mt-2 font-display text-xl text-deep">{c.name}</p>
                <p className="mt-1 text-xs text-muted" dir="ltr">
                  {c.code}
                </p>
                <p className="mt-3 text-sm text-muted nums">
                  {c.publishedCount} من {c.total} حديثًا منشورة
                </p>
                <Link
                  href={`/c/${c.code}`}
                  className="btn-ghost mt-4 !px-4 !py-2 text-xs"
                >
                  فتح الفصل
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Course message ─────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-6">
        <OrnamentDivider className="mx-auto h-6 w-48 text-dusty" />
        <p className="mt-6 font-display text-xl leading-relaxed text-muted">
          اللهم علمنا ما ينفعنا، وانفعنا بما علمتنا، واجعل ما حفظناه حجةً لنا لا
          علينا، واجعلنا من أهل القرآن والسنة الذين يمشون بهدي نبيك ﷺ.
        </p>
        <p className="mt-3 text-sm text-muted">رسالة الدورة</p>
      </section>
    </div>
  );
}
