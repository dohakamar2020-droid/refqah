import {
  getHonors,
  getSabiqah,
  getCompetitionEnabled,
  getLeaderboard,
  getStudents,
  getMessages,
} from "@/lib/queries";
import {
  CompetitionMasterToggle,
  AddHonorForm,
  DeleteHonorButton,
  AddMessageForm,
  DeleteMessageButton,
} from "@/components/admin/honors-manager";
import { SmallFlower } from "@/components/floral";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminHonorsPage() {
  const [honors, sabiqah, competitionOn, leaderboard, students, messages] =
    await Promise.all([
      getHonors(),
      getSabiqah(),
      getCompetitionEnabled(),
      getLeaderboard(),
      getStudents(),
      getMessages(),
    ]);

  const customHonors = honors.filter((h) => h.title !== "سَابِقَةُ الخَيْرَات");

  return (
    <div className="space-y-8">
      {/* ── Competition ─────────────────────────────── */}
      <section className="card card-pad">
        <h2 className="font-display text-2xl text-deep">المنافسة</h2>
        <p className="mt-1 text-sm text-muted">
          الطالبة توافق بنفسها، والمعلمة تتحكم في تشغيل اللوحة أو إيقافها.
        </p>

        <div className="mt-5">
          <CompetitionMasterToggle initial={competitionOn} />
        </div>

        <div className="mt-5 rounded-2xl border border-powder bg-blush/40 p-4">
          <p className="text-sm font-medium text-deep">الترتيب الحالي (أفضل 3)</p>
          {competitionOn && leaderboard.length > 0 ? (
            <ol className="mt-3 space-y-2 text-sm">
              {leaderboard.map((e, i) => (
                <li key={e.studentId} className="flex justify-between">
                  <span className="text-ink">
                    {i + 1}. {e.displayName}
                  </span>
                  <span className="text-muted nums">{e.count} حديثًا</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-2 text-sm text-muted">
              لا توجد مشاركات ظاهرة، أو اللوحة موقوفة.
            </p>
          )}
        </div>
      </section>

      {/* ── سابقة الخيرات ───────────────────────────── */}
      <section className="card card-pad">
        <div className="flex items-center gap-2">
          <SmallFlower className="h-5 w-5 text-dusty" />
          <h2 className="font-display text-2xl text-deep">سَابِقَةُ الخَيْرَات</h2>
        </div>
        <p className="mt-1 text-sm text-muted">
          يحددها النظام تلقائيًا: أول تسميعة معتمدة للحديث الأول حسب وقت الاعتماد.
        </p>

        {sabiqah ? (
          <div className="mt-5 rounded-2xl border border-dusty/50 bg-gradient-to-bl from-powder/70 to-blush/50 p-5">
            <p className="font-display text-xl text-deep">
              {sabiqah.displayName}
            </p>
            <p className="mt-1 text-xs text-muted">
              {sabiqah.hadithOrder
                ? `الحديث ${sabiqah.hadithOrder} — ${sabiqah.hadithTitle}`
                : "الحديث الأول"}{" "}
              · {formatDateTime(sabiqah.awardedAt)}
            </p>
          </div>
        ) : (
          <p className="mt-5 text-sm text-muted">
            لم تُعتمد أي تسميعة للحديث الأول بعد.
          </p>
        )}
      </section>

      {/* ── Custom honors ───────────────────────────── */}
      <section className="card card-pad">
        <h2 className="font-display text-2xl text-deep">تكريمات إضافية</h2>
        <p className="mt-1 text-sm text-muted">
          أوسمة تضيفينها يدويًا لأي طالبة، وتظهر في صفحة حسابها.
        </p>

        {customHonors.length > 0 && (
          <ul className="mt-4 space-y-2">
            {customHonors.map((h) => (
              <li
                key={h.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-powder bg-white/60 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-deep">
                    {h.title} — {h.displayName}
                  </p>
                  <p className="text-xs text-muted">
                    {h.description ? `${h.description} · ` : ""}
                    {formatDateTime(h.awardedAt)}
                  </p>
                </div>
                <DeleteHonorButton honorId={h.id} />
              </li>
            ))}
          </ul>
        )}

        {students.length > 0 ? (
          <AddHonorForm
            students={students.map((s) => ({
              id: s.id,
              displayName: s.displayName,
            }))}
          />
        ) : (
          <p className="mt-4 text-sm text-muted">
            أضيفي الطالبات أولًا لتتمكني من إضافة تكريم.
          </p>
        )}
      </section>

      {/* ── Messages ────────────────────────────────── */}
      <section className="card card-pad">
        <h2 className="font-display text-2xl text-deep">مكتبة رسائل التشجيع</h2>
        <p className="mt-1 text-sm text-muted">
          {messages.length} رسالة — تظهر عشوائيًا وتتغير مع كل زيارة دون تدخل منكِ.
        </p>

        <ul className="mt-4 max-h-80 space-y-2 overflow-y-auto pl-1">
          {messages.map((m) => (
            <li
              key={m.id}
              className="flex items-start justify-between gap-3 rounded-2xl border border-powder bg-white/60 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm leading-relaxed text-ink">{m.text}</p>
                {m.category && (
                  <span className="chip mt-1 bg-blush text-muted">
                    {m.category}
                  </span>
                )}
              </div>
              <DeleteMessageButton messageId={m.id} />
            </li>
          ))}
        </ul>

        <AddMessageForm />
      </section>
    </div>
  );
}
