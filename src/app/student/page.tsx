import { redirect } from "next/navigation";
import { requireStudent } from "@/lib/permissions";
import {
  getStudentProgress,
  getStudentClassBoard,
  getMyClass,
  getHonors,
  getMessages,
  getRandomMessage,
  getCompetitionEnabled,
} from "@/lib/queries";
import { ResultCard } from "@/components/student/result-card";
import { EncouragementCard } from "@/components/encouragement-card";
import { CompetitionToggle } from "@/components/competition-toggle";
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

/**
 * مساحة الطالبة — منفصلة تمامًا عن لوحة المعلمة.
 *
 * تعرض الأحاديث **المنشورة فقط** في فصلها: نص الحديث، ونتيجة تسميعها، وتصحيح
 * معلمتها الذي وصلها على واتساب وسجّلته هنا لتراجع عليه.
 * لا تظهر لها خانات الأحاديث غير المنشورة، ولا أي بيانات عن المعلمة سوى اسمها.
 */
export default async function StudentSpacePage() {
  const { user, student } = await requireStudent();
  if (user.role === "admin") redirect("/admin");

  const teacherId = student.teacherId ?? "";
  if (!teacherId) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-muted">
          لم يتم ربط حسابك بفصل بعد — تواصلي مع معلمتك.
        </p>
      </div>
    );
  }

  const [progress, klass, board, honors, messages, initialMessage, competitionOn] =
    await Promise.all([
      getStudentProgress(student.id),
      getMyClass(teacherId),
      getStudentClassBoard(teacherId, student.id),
      getHonors(teacherId),
      getMessages(teacherId),
      getRandomMessage(teacherId),
      getCompetitionEnabled(teacherId),
    ]);

  if (!progress) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-muted">لم يتم العثور على ملفكِ الشخصي.</p>
      </div>
    );
  }

  const myHonors = honors.filter((h) => h.studentId === student.id);
  const publishedCount = board.length;
  const recitedCount = board.filter((h) => h.recited).length;
  const remaining = board.length - recitedCount;
  const withMistakes = board.filter(
    (h) => h.note && h.note.mistakes.trim().length > 0
  ).length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      {/* ── Header ─────────────────────────────────────── */}
      <section className="card card-pad relative overflow-hidden">
        <SmallFlower className="pointer-events-none absolute -left-8 -top-8 h-32 w-32 text-dusty opacity-25" />
        <div className="relative flex flex-col items-center gap-5 sm:flex-row">
          <Avatar name={progress.student.displayName} />
          <div className="text-center sm:text-right">
            <h1 className="font-display text-3xl text-deep">
              {progress.student.displayName}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {klass ? `في فصل ${klass.name}` : "رفيقة رحلة الأربعين"}
            </p>
            <OrnamentDivider className="mx-auto mt-3 h-5 w-40 text-dusty sm:mx-0" />
            <p className="mt-2 text-sm text-muted">
              مساحتكِ الخاصة: الأحاديث المنشورة، ونتيجة تسميعكِ، وتصحيح معلمتكِ
              الذي سجّلتيه لتراجعي عليه.
            </p>
          </div>
        </div>
      </section>

      {/* ── Numbers ────────────────────────────────────── */}
      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="card card-pad text-center">
          <p className="text-xs text-muted">رحلتي في الحفظ</p>
          <p className="mt-2 font-display text-4xl text-deep nums">
            {recitedCount}
            <span className="text-2xl text-dusty"> / {publishedCount}</span>
          </p>
          <p className="mt-1 text-xs text-muted">من الأحاديث المنشورة</p>
          <div className="mt-4">
            <ProgressBar value={recitedCount} total={Math.max(publishedCount, 1)} />
            <p className="mt-2 text-xs text-muted nums">
              نسبة التقدم{" "}
              {publishedCount
                ? Math.round((recitedCount / publishedCount) * 100)
                : 0}
              %
            </p>
          </div>
        </div>

        <div className="card card-pad text-center">
          <p className="text-xs text-muted">لم تُعتمد بعد</p>
          <p className="mt-2 font-display text-4xl text-muted nums">{remaining}</p>
          <p className="mt-1 text-xs text-muted">
            من الأحاديث المنشورة حتى الآن
          </p>
        </div>

        <div className="card card-pad text-center">
          <p className="text-xs text-muted">أحاديث سجّلتِ تصحيحها</p>
          <p className="mt-2 font-display text-4xl text-deep nums">
            {withMistakes}
          </p>
          <p className="mt-1 text-xs text-muted">لتكون معكِ عند المراجعة</p>
        </div>
      </section>

      <p className="mt-3 text-center text-xs text-muted">
        آخر تحديث لحالة تسميعك: {formatDateTime(progress.lastUpdate)}
        {" · "}
        الأحاديث المنشورة في فصلك: {publishedCount}
      </p>

      {/* ── Published hadiths + results ────────────────── */}
      <section className="mt-10">
        <div className="mb-4">
          <h2 className="font-display text-2xl text-deep">
            الأحاديث المنشورة ونتيجتي
          </h2>
          <p className="mt-1 text-sm text-muted">
            قصاد كل حديث: هل اعتُمد تسميعك، وتصحيح معلمتكِ الذي وصلكِ على واتساب.
          </p>
        </div>

        {board.length === 0 ? (
          <div className="rounded-card border border-dashed border-dusty/60 bg-white/60 px-6 py-12 text-center">
            <SmallFlower className="mx-auto h-10 w-10 text-dusty" />
            <p className="mt-3 text-sm text-muted">
              لم تُنشر أي أحاديث في فصلك بعد.. سيصلكِ إشعار معلمتك عند أول حديث.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {board.map((h) => (
              <ResultCard
                key={h.id}
                hadith={{
                  id: h.id,
                  order: h.order,
                  title: h.title,
                  narrator: h.narrator,
                  arabicText: h.arabicText,
                  takhrij: h.takhrij,
                  recited: h.recited,
                  recitedAt: h.recitedAt ? h.recitedAt.toISOString() : null,
                  note: h.note
                    ? {
                        mistakes: h.note.mistakes,
                        body: h.note.body,
                        updatedAt: h.note.updatedAt.toISOString(),
                      }
                    : null,
                }}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Achievements ───────────────────────────────── */}
      {myHonors.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-2xl text-deep">إنجازاتي</h2>
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
        </section>
      )}

      {/* ── Competition ────────────────────────────────── */}
      <section className="mt-8">
        <CompetitionToggle initial={progress.student.competitionOptIn} />
        {!competitionOn && (
          <p className="mt-3 text-xs text-muted">
            لوحة المنافسة موقوفة حاليًا، ولن يظهر اسمكِ حتى لو فعّلتِ المشاركة.
          </p>
        )}
      </section>

      {/* ── Encouragement ──────────────────────────────── */}
      <section className="mt-8">
        <EncouragementCard messages={messages} initial={initialMessage} />
      </section>

      <p className="mt-8 text-center text-xs text-muted">
        هذه المساحة لكِ وحدك — تصحيحاتكِ ونتائجكِ لا يطّلع عليها غيركِ.
      </p>
    </div>
  );
}
