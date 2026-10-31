import Link from "next/link";
import { requireAdmin } from "@/lib/permissions";
import { getStudents, getRecitationIndex, getAllHadiths } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  await requireAdmin();

  const [students, recitationIndex, hadiths] = await Promise.all([
    getStudents(),
    getRecitationIndex(),
    getAllHadiths(),
  ]);
  const total = hadiths.length || 42;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-deep">تقارير الطالبات</h2>
        <p className="mt-1 text-sm text-muted">
          افتحي تقرير أي طالبة لتجهيز صورة بمستواها ومشاركتها معها على واتساب.
        </p>
      </div>

      {students.length === 0 ? (
        <p className="rounded-card border border-dashed border-dusty/60 bg-white/60 px-6 py-12 text-center text-sm text-muted">
          لا توجد طالبات بعد.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {students.map((s) => {
            const count = recitationIndex.get(s.id)?.size ?? 0;
            const percent = Math.round((count / total) * 100);
            return (
              <li
                key={s.id}
                className="flex items-center justify-between gap-4 rounded-card border border-powder bg-white/70 p-4"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-powder font-display text-deep">
                    {s.displayName.trim().charAt(0)}
                  </span>
                  <div>
                    <p className="font-medium text-deep">{s.displayName}</p>
                    <p className="text-xs text-muted nums">
                      {count} / {total} حديثًا · {percent}%
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {s.phone && (
                    <span className="chip bg-blush text-muted" title={s.phone}>
                      واتساب
                    </span>
                  )}
                  <Link
                    href={`/admin/reports/${s.id}`}
                    className="btn-ghost !px-4 !py-2 text-xs"
                  >
                    فتح التقرير
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
