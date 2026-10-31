import Link from "next/link";
import { getLeaderboard, getCompetitionEnabled } from "@/lib/queries";
import { OrnamentDivider, SmallFlower } from "@/components/floral";

export const dynamic = "force-dynamic";

const RANKS = ["الأول", "الثاني", "الثالث"];

export default async function LeaderboardPage() {
  const [enabled, entries] = await Promise.all([
    getCompetitionEnabled(),
    getLeaderboard(),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="text-center">
        <span className="chip bg-powder text-deep">سابقوا إلى الخيرات</span>
        <h1 className="mt-4 font-display text-3xl text-deep sm:text-4xl">
          أفضل ثلاث مشاركات
        </h1>
        <OrnamentDivider className="mx-auto mt-4 h-6 w-52 text-dusty" />
        <p className="mt-3 text-sm text-muted">
          خطوات صغيرة تصنع إنجازات عظيمة
        </p>
      </div>

      {!enabled ? (
        <div className="mt-10 rounded-card border border-dashed border-dusty/60 bg-white/60 px-6 py-14 text-center">
          <SmallFlower className="mx-auto h-10 w-10 text-dusty" />
          <p className="mt-4 font-display text-xl text-deep">
            لوحة المنافسة موقوفة حاليًا
          </p>
          <p className="mt-2 text-sm text-muted">
            يمكنكِ متابعة رحلتكِ الخاصة من صفحة حسابكِ، فقيمة الرحلة في
            الاستمرار لا في المقارنة.
          </p>
        </div>
      ) : entries.length === 0 ? (
        <div className="mt-10 rounded-card border border-dashed border-dusty/60 bg-white/60 px-6 py-14 text-center">
          <SmallFlower className="mx-auto h-10 w-10 text-dusty" />
          <p className="mt-4 font-display text-xl text-deep">
            لا توجد مشاركات ظاهرة بعد
          </p>
          <p className="mt-2 text-sm text-muted">
            تظهر اللوحة الطالبات اللاتي وافقن على المشاركة من داخل حساباتهنّ.
          </p>
        </div>
      ) : (
        <div className="mt-12 grid items-end gap-4 sm:grid-cols-3">
          {[1, 0, 2].map((slot) => {
            const entry = entries[slot];
            if (!entry) return <div key={slot} className="hidden sm:block" />;
            const rank = slot + 1;
            return (
              <div
                key={entry.studentId}
                className={`card card-pad text-center ${
                  rank === 1 ? "border-dusty shadow-soft sm:-translate-y-4" : ""
                }`}
              >
                <div
                  className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full font-display text-2xl ${
                    rank === 1 ? "bg-dusty text-white" : "bg-powder text-deep"
                  }`}
                >
                  {rank === 1 ? "١" : rank === 2 ? "٢" : "٣"}
                </div>
                <p className="mt-4 font-medium text-deep">{entry.displayName}</p>
                <p className="mt-1 font-display text-4xl text-deep nums">
                  {entry.count}
                </p>
                <p className="text-xs text-muted">حديثًا</p>
                <p className="mt-3 text-xs text-muted">
                  المركز {RANKS[slot]}
                </p>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-8 text-center text-xs text-muted">
        تُعرض أسماء العرض وعدد الأحاديث المعتمدة فقط، ولا تظهر أي تفاصيل شخصية
        أو سجلات تسميع.
      </p>

      <div className="mt-10 text-center">
        <Link href="/hadiths" className="btn-ghost">
          عودي إلى رحلة الحفظ
        </Link>
      </div>
    </div>
  );
}
