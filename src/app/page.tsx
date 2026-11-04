import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/permissions";
import { ensureReady } from "@/lib/db/ready";
import { FloralBranch, OrnamentDivider, SmallFlower } from "@/components/floral";
import { PUBLISH_DAYS } from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * الصفحة العامة.
 *
 * لا تُعرض هنا أي قائمة معلمات ولا أي بحث بالكود: كل معلمة تعمل مع طالباتها
 * في مسار منفصل. الزائرة فقط تختار: طالبة أو معلمة.
 */
export default async function HomePage() {
  await ensureReady();

  // Logged-in users never land here — each side has its own space.
  const me = await getSessionUser();
  if (me) redirect(me.role === "admin" ? "/admin" : "/student");

  return (
    <div className="relative overflow-hidden">
      {/* ── Hero ───────────────────────────────────────── */}
      <section className="relative mx-auto max-w-6xl px-4 pb-8 pt-12 sm:px-6 sm:pt-16">
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
            رحلة علمٍ وحفظٍ وعمل.. تتابع فيها كل طالبةٍ حفظها في فصل معلمتها، من
            غير أن يرى أحدٌ غير فصلِه.
          </p>
        </div>
      </section>

      {/* ── Two separate doors ────────────────────────── */}
      <section className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Student */}
          <div className="card card-pad flex flex-col">
            <span className="chip w-fit bg-powder text-deep">للطالبات</span>
            <h2 className="mt-3 font-display text-2xl text-deep">مساحة الطالبة</h2>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
              بالكود الذي أعطتكِ إياه معلمتك: الأحاديث المنشورة في فصلك، ونتيجة
              تسميعك لكل حديث، وتصحيح معلمتكِ الذي تسجّلينه لتراجعي عليه.
            </p>
            <Link href="/student/login" className="btn-primary mt-5">
              دخول الطالبات
            </Link>
          </div>

          {/* Teacher */}
          <div className="card card-pad flex flex-col">
            <span className="chip w-fit bg-powder text-deep">للمعلمات</span>
            <h2 className="mt-3 font-display text-2xl text-deep">مساحة المعلمة</h2>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
              كود مساحتك وكلمة المرور: طالباتك، وجدول التسميع، والأحاديث،
              والتقارير — كل معلمة في مساحتها الخاصة دون أن ترى مساحة غيرها.
            </p>
            <Link href="/teacher/login" className="btn-ghost mt-5">
              دخول المعلمات
            </Link>
            <Link
              href="/register"
              className="mt-3 text-center text-xs text-muted underline decoration-dusty underline-offset-4"
            >
              معلمة جديدة؟ افتحي مساحتك
            </Link>
          </div>
        </div>
      </section>

      {/* ── Course info (public) ──────────────────────── */}
      <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="card card-pad text-center">
          <p className="text-xs text-muted">معلومات الدورة</p>
          <p className="mt-2 leading-relaxed text-ink">
            تشمل الدورة <span className="font-medium text-deep nums">42</span>{" "}
            حديثًا من الأربعين النووية، ويُنشر الحديث بالتتابع في أيام{" "}
            <span className="font-medium text-deep">{PUBLISH_DAYS.join("، ")}</span>
            .
          </p>
          <p className="mt-3 text-xs leading-relaxed text-muted">
            كل معلمة تُدير نشر الأحاديث وتسميع طالباتها في مساحتها المستقلة، ولا
            تُعرض أسماء الطالبات ولا بياناتهنّ في أي صفحة عامة.
          </p>
        </div>
      </section>

      {/* ── Course message ─────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6">
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
