import Link from "next/link";
import { getSessionUser } from "@/lib/permissions";
import {
  getJourneyProgress,
  getLeaderboard,
  getSabiqah,
  getMessages,
  getRandomMessage,
  hasAdmin,
} from "@/lib/queries";
import { FloralBranch, OrnamentDivider, SmallFlower } from "@/components/floral";
import { EncouragementCard } from "@/components/encouragement-card";
import { ProgressBar } from "@/components/progress-bar";
import { formatDate, PUBLISH_DAYS } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [me, progress, leaderboard, sabiqah, messages, configured] =
    await Promise.all([
      getSessionUser(),
      getJourneyProgress(),
      getLeaderboard(),
      getSabiqah(),
      getMessages(),
      hasAdmin(),
    ]);

  const initialMessage = await getRandomMessage();

  const journeyHref = me
    ? me.role === "admin"
      ? "/admin"
      : "/me"
    : configured
      ? "/login"
      : "/setup";

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
            رحلة علمٍ وحفظٍ وعمل.. نتعلم فيها من أحاديث رسول الله ﷺ، ونمضي معًا
            حتى تمام الرحلة.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href={journeyHref} className="btn-primary">
              {configured ? "تابعي رحلة الحفظ" : "ابدئي إعداد الموقع"}
            </Link>
            <Link href="/hadiths" className="btn-ghost">
              الأحاديث المنشورة
            </Link>
          </div>
        </div>
      </section>

      {/* ── Journey info ───────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="card card-pad">
          <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <h2 className="font-display text-2xl text-deep">معلومات الرحلة</h2>
              <p className="mt-2 leading-relaxed text-muted">
                تشمل الدورة{" "}
                <span className="font-medium text-deep nums">42</span> حديثًا،
                ويُنشر الحديث بالتتابع في أيام:{" "}
                <span className="font-medium text-deep">
                  {PUBLISH_DAYS.join("، ")}
                </span>
                .
              </p>

              <div className="mt-6 max-w-md">
                <div className="mb-2 flex items-baseline justify-between text-sm">
                  <span className="text-muted">الحديث المنشور حاليًا</span>
                  <span className="font-medium text-deep nums">
                    {progress.currentOrder
                      ? `الحديث ${progress.currentOrder} من ${progress.total}`
                      : "لم يُنشر بعد"}
                  </span>
                </div>
                <ProgressBar
                  value={progress.publishedCount}
                  total={progress.total}
                />
                <p className="mt-2 text-xs text-muted nums">
                  تم نشر {progress.publishedCount} من {progress.total} حديثًا
                  {progress.currentTitle ? ` — آخرها: ${progress.currentTitle}` : ""}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 md:w-64">
              {PUBLISH_DAYS.map((day) => (
                <div
                  key={day}
                  className="rounded-2xl border border-powder bg-blush/60 px-2 py-4 text-center"
                >
                  <p className="text-xs text-muted">{day}</p>
                  <SmallFlower className="mx-auto mt-2 h-6 w-6 text-dusty" />
                  <p className="mt-1 text-[10px] text-muted">يوم النشر</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Encouragement ──────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
        <EncouragementCard
          messages={messages}
          initial={initialMessage}
          toName={sabiqah?.displayName ?? null}
        />
      </section>

      {/* ── Honor: سابقة الخيرات ───────────────────────── */}
      {sabiqah && (
        <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="relative overflow-hidden rounded-card border border-dusty/50 bg-gradient-to-bl from-powder via-blush to-ivory p-7 shadow-soft sm:p-9">
            <SmallFlower className="pointer-events-none absolute -bottom-8 -left-8 h-40 w-40 text-dusty opacity-25" />
            <div className="relative">
              <span className="chip bg-white/80 text-deep">لحظات التكريم</span>

              <h2 className="mt-4 font-display text-3xl text-deep">
                سَابِقَةُ الخَيْرَات
              </h2>

              <p className="mt-3 text-xl text-muted">
                <span className="font-medium text-deep">{sabiqah.displayName}</span>{" "}
                — أول من أتمّت تسميع الحديث الأول
              </p>

              <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-3">
                <div className="rounded-2xl bg-white/70 px-4 py-3">
                  <dt className="text-xs text-muted">الحديث</dt>
                  <dd className="mt-1 font-medium text-deep">
                    {sabiqah.hadithOrder
                      ? `الحديث ${sabiqah.hadithOrder} — ${sabiqah.hadithTitle}`
                      : "الحديث الأول"}
                  </dd>
                </div>
                <div className="rounded-2xl bg-white/70 px-4 py-3">
                  <dt className="text-xs text-muted">تاريخ إتمام التسميع</dt>
                  <dd className="mt-1 font-medium text-deep">
                    {formatDate(sabiqah.awardedAt)}
                  </dd>
                </div>
                <div className="rounded-2xl bg-white/70 px-4 py-3">
                  <dt className="text-xs text-muted">لقب التكريم</dt>
                  <dd className="mt-1 font-medium text-deep">{sabiqah.title}</dd>
                </div>
              </dl>

              <p className="mt-6 border-r-4 border-dusty pr-4 font-display text-lg leading-relaxed text-deep">
                هنيئًا لقلبٍ اختار طريق العلم، وجعل من الهمة خُطوةً نحو الخير. لا
                تجعلي سبقكِ نهاية الطريق، بل اجعليه بدايةً لأثر أجمل.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ── Competition (Top 3) ────────────────────────── */}
      {leaderboard.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="text-center">
            <span className="chip bg-powder text-deep">سابقوا إلى الخيرات</span>
            <h2 className="mt-3 font-display text-2xl text-deep sm:text-3xl">
              خطوات صغيرة تصنع إنجازات عظيمة
            </h2>
          </div>

          <div className="mt-8 grid items-end gap-4 sm:grid-cols-3">
            {[1, 0, 2].map((slot) => {
              const entry = leaderboard[slot];
              if (!entry) return <div key={slot} className="hidden sm:block" />;
              const rank = slot + 1;
              return (
                <div
                  key={entry.studentId}
                  className={`card card-pad text-center ${
                    rank === 1 ? "sm:-translate-y-4 border-dusty shadow-soft" : ""
                  }`}
                >
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-powder font-display text-xl text-deep">
                    {rank === 1 ? "١" : rank === 2 ? "٢" : "٣"}
                  </div>
                  <p className="mt-4 font-medium text-deep">{entry.displayName}</p>
                  <p className="mt-1 font-display text-3xl text-deep nums">
                    {entry.count}
                  </p>
                  <p className="text-xs text-muted">حديثًا تم تسميعها</p>
                  <p className="mt-3 text-xs text-muted">
                    {rank === 1
                      ? "المركز الأول"
                      : rank === 2
                        ? "المركز الثاني"
                        : "المركز الثالث"}
                  </p>
                </div>
              );
            })}
          </div>

          <p className="mt-6 text-center text-xs text-muted">
            تظهر هنا أفضل ثلاث طالبات من الموافقات على الظهور فقط، دون أي تفاصيل
            شخصية.
          </p>
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
