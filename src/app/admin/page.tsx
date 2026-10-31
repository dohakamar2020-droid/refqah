import Link from "next/link";
import {
  getJourneyProgress,
  getStudents,
  getRecitationIndex,
  getSabiqah,
  getCompetitionEnabled,
  getLeaderboard,
  getLastRecitationUpdate,
} from "@/lib/queries";
import { SmallFlower } from "@/components/floral";
import { formatDateTime, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="card card-pad">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-2 font-display text-3xl text-deep nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export default async function AdminOverviewPage() {
  const [
    progress,
    students,
    recitedIndex,
    sabiqah,
    competitionOn,
    leaderboard,
    lastUpdate,
  ] = await Promise.all([
    getJourneyProgress(),
    getStudents(),
    getRecitationIndex(),
    getSabiqah(),
    getCompetitionEnabled(),
    getLeaderboard(),
    getLastRecitationUpdate(),
  ]);

  const totalApproved = Array.from(recitedIndex.values()).reduce(
    (sum, set) => sum + set.size,
    0
  );

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="الأحاديث المنشورة"
          value={`${progress.publishedCount} / ${progress.total}`}
          hint={progress.currentTitle ? `آخرها: ${progress.currentTitle}` : undefined}
        />
        <Stat label="عدد الطالبات" value={students.length} hint="المسجلات في الدورة" />
        <Stat
          label="عمليات التسميع المعتمدة"
          value={totalApproved}
          hint="إجمالي الخانات المعتمدة"
        />
        <Stat
          label="آخر تعديل على السجل"
          value={lastUpdate ? formatDate(lastUpdate) : "—"}
          hint={lastUpdate ? formatDateTime(lastUpdate) : "لا توجد تحديثات بعد"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick actions */}
        <section className="card card-pad">
          <h2 className="font-display text-xl text-deep">ابدأي من هنا</h2>
          <p className="mt-1 text-sm text-muted">
            خطواتكِ اليومية خلال أيام النشر
          </p>

          <ol className="mt-5 space-y-4 text-sm">
            {[
              { n: 1, text: "انشري الحديث الجديد من صفحة الأحاديث." },
              { n: 2, text: "استمعي لتسميع الطالبات." },
              { n: 3, text: "حدّثي الحالات من جدول التسميع." },
              { n: 4, text: "راجعي التكريم والمنافسة عند الحاجة." },
            ].map((step) => (
              <li key={step.n} className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-powder font-display text-deep">
                  {step.n}
                </span>
                <span className="text-ink">{step.text}</span>
              </li>
            ))}
          </ol>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/admin/recitations" className="btn-primary">
              فتح جدول التسميع
            </Link>
            <Link href="/admin/hadiths" className="btn-ghost">
              إدارة الأحاديث
            </Link>
          </div>
        </section>

        {/* Honor + competition snapshot */}
        <section className="card card-pad">
          <h2 className="font-display text-xl text-deep">التكريم والمنافسة</h2>

          <div className="mt-5 rounded-2xl border border-powder bg-blush/50 p-4">
            <div className="flex items-center gap-2">
              <SmallFlower className="h-5 w-5 text-dusty" />
              <p className="text-sm font-medium text-deep">سَابِقَةُ الخَيْرَات</p>
            </div>
            {sabiqah ? (
              <>
                <p className="mt-2 text-lg text-deep">{sabiqah.displayName}</p>
                <p className="text-xs text-muted">
                  أول من أتمّت تسميع الحديث الأول — {formatDateTime(sabiqah.awardedAt)}
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted">
                لم تُعتمد أي تسميعة للحديث الأول بعد.
              </p>
            )}
          </div>

          <div className="mt-4 rounded-2xl border border-powder bg-white/60 p-4">
            <p className="text-sm font-medium text-deep">لوحة المنافسة</p>
            <p className="mt-1 text-sm text-muted">
              الحالة: {competitionOn ? "مفعّلة" : "موقوفة"}
              {competitionOn && ` — عدد الظاهرات: ${leaderboard.length}`}
            </p>
            <Link
              href="/admin/honors"
              className="mt-3 inline-block text-sm text-deep underline decoration-dusty underline-offset-4"
            >
              إدارة التكريم والمنافسة
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
