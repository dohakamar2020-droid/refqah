import Link from "next/link";
import { notFound } from "next/navigation";
import { resolveClass } from "@/lib/tenancy";
import {
  getAllHadiths,
  getJourneyProgress,
  getLeaderboard,
  getSabiqah,
  getCompetitionEnabled,
} from "@/lib/queries";
import { getSessionUser } from "@/lib/permissions";
import { OrnamentDivider, SmallFlower } from "@/components/floral";
import { ProgressBar } from "@/components/progress-bar";
import { LockIcon } from "@/components/grid-legend";
import { PUBLISH_DAYS, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ClassPage({
  params,
}: {
  params: { code: string };
}) {
  const teacher = await resolveClass(decodeURIComponent(params.code));
  // A wrong code must not reveal whether a similar one exists.
  if (!teacher) notFound();

  const [me, hadiths, progress, leaderboard, sabiqah, competitionOn] =
    await Promise.all([
      getSessionUser(),
      getAllHadiths(teacher.id),
      getJourneyProgress(teacher.id),
      getLeaderboard(teacher.id),
      getSabiqah(teacher.id),
      getCompetitionEnabled(teacher.id),
    ]);

  const published = hadiths.filter((h) => h.published);
  const unpublished = hadiths.filter((h) => !h.published);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      {/* ── Class header ─────────────────────────────── */}
      <section className="relative overflow-hidden rounded-card border border-dusty/40 bg-gradient-to-bl from-powder/70 via-blush/50 to-ivory p-6 shadow-soft sm:p-8">
        <SmallFlower className="pointer-events-none absolute -bottom-8 -left-8 h-36 w-36 text-dusty opacity-25" />
        <div className="relative text-center">
          <span className="chip bg-white/80 text-deep">فصل الأربعين</span>
          <h1 className="mt-3 font-display text-3xl text-deep sm:text-4xl">
            {teacher.name}
          </h1>
          <p className="mt-1 text-xs text-muted" dir="ltr">
            {teacher.code}
          </p>
          <OrnamentDivider className="mx-auto mt-4 h-5 w-44 text-dusty" />

          <div className="mx-auto mt-6 max-w-md">
            <div className="mb-2 flex items-baseline justify-between text-sm">
              <span className="text-muted">الحديث المنشور حاليًا</span>
              <span className="font-medium text-deep nums">
                {progress.currentOrder
                  ? `الحديث ${progress.currentOrder} من ${progress.total}`
                  : "لم يُنشر بعد"}
              </span>
            </div>
            <ProgressBar value={progress.publishedCount} total={progress.total} />
            <p className="mt-2 text-xs text-muted">
              تُنشر الأحاديث بالتتابع أيام {PUBLISH_DAYS.join("، ")}
            </p>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {me ? (
              <Link
                href={me.role === "admin" ? "/admin" : "/me"}
                className="btn-primary"
              >
                {me.role === "admin" ? "لوحة المعلمة" : "حسابي"}
              </Link>
            ) : (
              <>
                <Link href="/login" className="btn-primary">
                  دخول الطالبات
                </Link>
                <Link href="/join" className="btn-ghost">
                  انضمام جديد للفصل
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── سابقة الخيرات ─────────────────────────────── */}
      {sabiqah && (
        <section className="mt-8">
          <div className="rounded-card border border-dusty/50 bg-white/70 p-6">
            <span className="chip bg-powder text-deep">لحظات التكريم</span>
            <h2 className="mt-3 font-display text-2xl text-deep">
              سَابِقَةُ الخَيْرَات
            </h2>
            <p className="mt-2 text-lg text-muted">
              <span className="font-medium text-deep">{sabiqah.displayName}</span>{" "}
              — أول من أتمّت تسميع الحديث الأول
            </p>
            <p className="mt-1 text-xs text-muted">
              {formatDate(sabiqah.awardedAt)}
            </p>
          </div>
        </section>
      )}

      {/* ── Published hadiths ─────────────────────────── */}
      <section className="mt-10">
        <div className="text-center">
          <span className="chip bg-powder text-deep">رحلة الحفظ</span>
          <h2 className="mt-3 font-display text-2xl text-deep sm:text-3xl">
            الأحاديث المنشورة
          </h2>
        </div>

        {published.length === 0 ? (
          <div className="mt-8 rounded-card border border-dashed border-dusty/60 bg-white/60 px-6 py-12 text-center">
            <LockIcon className="mx-auto h-8 w-8 text-dusty/60" />
            <p className="mt-3 text-muted">
              لم تُنشر أي أحاديث بعد.. ترقبّي أول حديث في موعد النشر.
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {published.map((h) => (
              <article key={h.id} className="card card-pad animate-fadeUp">
                <div className="flex items-start gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-powder font-display text-deep nums">
                    {h.order}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-xl text-deep">{h.title}</h3>
                    {h.narrator && (
                      <p className="mt-2 font-display text-lg leading-loose text-deep">
                        {h.narrator}
                      </p>
                    )}
                    <p className="mt-3 whitespace-pre-line leading-loose text-ink">
                      {h.arabicText}
                    </p>
                    {h.takhrij && (
                      <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted">
                        {h.takhrij}
                      </p>
                    )}
                    {h.publishedAt && (
                      <p className="mt-3 text-xs text-muted">
                        نُشر في {formatDate(h.publishedAt)}
                      </p>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {unpublished.length > 0 && (
          <div className="mt-8">
            <h3 className="flex items-center gap-2 text-sm font-medium text-muted">
              <SmallFlower className="h-4 w-4 text-dusty" />
              لم تُنشر بعد ({unpublished.length})
            </h3>
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
              {unpublished.map((h) => (
                <div
                  key={h.id}
                  title={h.title}
                  className="flex flex-col items-center gap-1 rounded-2xl border border-powder/70 bg-white/50 px-2 py-3 text-center"
                >
                  <LockIcon className="h-4 w-4 text-dusty/60" />
                  <span className="text-xs text-muted nums">حـ{h.order}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── Top 3 of this class only ───────────────────── */}
      {competitionOn && leaderboard.length > 0 && (
        <section className="mt-12">
          <div className="text-center">
            <span className="chip bg-powder text-deep">سابقوا إلى الخيرات</span>
            <h2 className="mt-3 font-display text-2xl text-deep sm:text-3xl">
              أفضل ثلاث في هذا الفصل
            </h2>
            <p className="mt-2 text-sm text-muted">
              من الموافقات على الظهور داخل هذا الفصل فقط — لا تُقارن طالبات فصل
              بفصل آخر.
            </p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {leaderboard.map((e, i) => (
              <div key={e.studentId} className="card card-pad text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-powder font-display text-lg text-deep">
                  {i === 0 ? "١" : i === 1 ? "٢" : "٣"}
                </div>
                <p className="mt-3 font-medium text-deep">{e.displayName}</p>
                <p className="mt-1 font-display text-2xl text-deep nums">
                  {e.count}
                </p>
                <p className="text-xs text-muted">حديثًا تم تسميعها</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <p className="mt-10 text-center text-xs text-muted">
        كل معلمة لها مساحة مستقلة: أحاديثها وطالباتها وسجل تسميعها وتقاريرها —
        ولا يظهر شيء منها في مساحة معلمة أخرى.
      </p>
    </div>
  );
}
