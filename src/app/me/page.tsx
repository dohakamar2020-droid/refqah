import { requireStudent } from "@/lib/permissions";
import {
  getAllHadiths,
  getStudentProgress,
  getHonors,
  getMessages,
  getRandomMessage,
  getCompetitionEnabled,
} from "@/lib/queries";
import { EncouragementCard } from "@/components/encouragement-card";
import { CompetitionToggle } from "@/components/competition-toggle";
import { PersonalGrid } from "@/components/admin/recitation-grid";
import { GridHint, GridLegend } from "@/components/grid-legend";
import { ProgressBar } from "@/components/progress-bar";
import { OrnamentDivider, SmallFlower } from "@/components/floral";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

function Avatar({ name }: { name: string }) {
  const letter = name.trim().charAt(0) || "ر";
  return (
    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-bl from-powder to-dusty font-display text-3xl text-white shadow-soft">
      {letter}
    </div>
  );
}

export default async function MePage() {
  // Server-side guard: a student can only ever load her own profile.
  const { student } = await requireStudent();

  const [progress, allHadiths, honors, messages, initialMessage, competitionOn] =
    await Promise.all([
      getStudentProgress(student.id),
      getAllHadiths(),
      getHonors(),
      getMessages(),
      getRandomMessage(),
      getCompetitionEnabled(),
    ]);

  if (!progress) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-muted">لم يتم العثور على ملفكِ الشخصي.</p>
      </div>
    );
  }

  const myHonors = honors.filter((h) => h.studentId === student.id);
  const remaining = progress.total - progress.recitedCount;
  const publishedCount = allHadiths.filter((h) => h.published).length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      {/* ── Profile header ─────────────────────────────── */}
      <section className="card card-pad relative overflow-hidden">
        <SmallFlower className="pointer-events-none absolute -left-8 -top-8 h-32 w-32 text-dusty opacity-25" />
        <div className="relative flex flex-col items-center gap-5 sm:flex-row sm:items-center">
          <Avatar name={progress.student.displayName} />
          <div className="text-center sm:text-right">
            <h1 className="font-display text-3xl text-deep">
              {progress.student.displayName}
            </h1>
            <p className="mt-1 text-sm text-muted">رفيقة رحلة الأربعين</p>
            <OrnamentDivider className="mx-auto mt-3 h-5 w-40 text-dusty sm:mx-0" />
            <p className="mt-2 text-sm text-muted">
              أهلًا بكِ في مساحتكِ الخاصة، هذه بياناتكِ لا يطّلع عليها غيركِ
              والمعلمة.
            </p>
          </div>
        </div>
      </section>

      {/* ── Progress ─────────────────────────────────── */}
      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="card card-pad text-center sm:col-span-1">
          <p className="text-xs text-muted">رحلتي في الحفظ</p>
          <p className="mt-2 font-display text-4xl text-deep nums">
            {progress.recitedCount}
            <span className="text-2xl text-dusty"> / {progress.total}</span>
          </p>
          <p className="mt-1 text-xs text-muted">حديثًا تم تسميعها</p>
          <div className="mt-4">
            <ProgressBar value={progress.recitedCount} total={progress.total} />
            <p className="mt-2 text-xs text-muted nums">
              نسبة التقدم {progress.percent}%
            </p>
          </div>
        </div>

        <div className="card card-pad text-center">
          <p className="text-xs text-muted">سمّعت</p>
          <p className="mt-2 font-display text-4xl text-deep nums">
            {progress.recitedCount}
          </p>
          <p className="mt-1 text-xs text-muted">أحاديث معتمدة</p>
        </div>

        <div className="card card-pad text-center">
          <p className="text-xs text-muted">لم تسمّع بعد</p>
          <p className="mt-2 font-display text-4xl text-muted nums">{remaining}</p>
          <p className="mt-1 text-xs text-muted">من أصل {progress.total} حديثًا</p>
        </div>
      </section>

      <p className="mt-3 text-center text-xs text-muted">
        آخر تحديث لحالة التسميع: {formatDateTime(progress.lastUpdate)}
        {" · "}
        الأحاديث المنشورة حتى الآن: {publishedCount}
      </p>

      {/* ── Personal grid ─────────────────────────────── */}
      <section className="mt-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl text-deep">سجل التسميع</h2>
            <p className="mt-1 text-sm text-muted">
              الأحاديث الـ42 في رحلتكِ الخاصة
            </p>
          </div>
          <GridLegend />
        </div>

        <PersonalGrid
          hadiths={allHadiths}
          recitedIds={Array.from(progress.recitedHadithIds)}
        />
        <GridHint isAdmin={false} />
      </section>

      {/* ── Achievements ──────────────────────────────── */}
      <section className="mt-10">
        <h2 className="font-display text-2xl text-deep">إنجازاتي</h2>
        {myHonors.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            لا توجد أوسمة بعد.. استمري، وكل حديث يحفظه قلبكِ إنجاز بحد ذاته.
          </p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {myHonors.map((h) => (
              <div
                key={h.id}
                className="rounded-card border border-dusty/50 bg-gradient-to-bl from-powder/70 to-blush/60 p-5"
              >
                <div className="flex items-center gap-2">
                  <SmallFlower className="h-5 w-5 text-dusty" />
                  <p className="font-display text-lg text-deep">{h.title}</p>
                </div>
                {h.description && (
                  <p className="mt-2 text-sm text-muted">{h.description}</p>
                )}
                <p className="mt-2 text-xs text-muted">
                  {formatDateTime(h.awardedAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Competition settings ──────────────────────── */}
      <section className="mt-10">
        <CompetitionToggle initial={progress.student.competitionOptIn} />
        {!competitionOn && (
          <p className="mt-3 text-xs text-muted">
            لوحة المنافسة موقوفة من قِبَل المعلمة حاليًا، ولن يظهر اسمكِ حتى لو
            فعّلتِ المشاركة.
          </p>
        )}
      </section>

      {/* ── Encouragement ─────────────────────────────── */}
      <section className="mt-10">
        <EncouragementCard messages={messages} initial={initialMessage} />
      </section>
    </div>
  );
}
