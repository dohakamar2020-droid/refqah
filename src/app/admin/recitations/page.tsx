import Link from "next/link";
import { requireTeacher } from "@/lib/permissions";
import {
  getStudents,
  getAllHadiths,
  getRecitationIndex,
  getHadithTitles,
} from "@/lib/queries";
import { RecitationGrid } from "@/components/admin/recitation-grid";
import { GridHint, GridLegend } from "@/components/grid-legend";
import type { GridData } from "@/components/grid-types";

export const dynamic = "force-dynamic";

export default async function AdminRecitationsPage() {
  const { teacher } = await requireTeacher();
  const [students, hadiths, recitedIndex, titles] = await Promise.all([
    getStudents(teacher.id),
    getAllHadiths(teacher.id),
    getRecitationIndex(teacher.id),
    getHadithTitles(teacher.id),
  ]);

  const titleByHadith = new Map(titles.map((t) => [t.hadithId, t]));

  const data: GridData = {
    students: students.map((s, i) => ({
      id: s.id,
      displayName: s.displayName,
      rank: i + 1,
    })),
    hadiths: hadiths.map((h) => ({
      id: h.id,
      order: h.order,
      title: h.title,
      published: h.published,
      awardTitle: titleByHadith.get(h.id)?.title ?? null,
      awardStudentName: titleByHadith.get(h.id)?.studentName ?? null,
    })),
    recited: Object.fromEntries(
      Array.from(recitedIndex.entries()).map(([k, v]) => [k, Array.from(v)])
    ),
  };

  const publishedCount = hadiths.filter((h) => h.published).length;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl text-deep">سجل متابعة التسميع</h2>
          <p className="mt-1 text-sm text-muted">
            اضغطي على أي خانة لتغيير الحالة، ويُحفظ التعديل مباشرة.
          </p>
        </div>
        <GridLegend />
      </div>

      {publishedCount === 0 && (
        <div className="mb-4 rounded-2xl border border-dusty/50 bg-blush px-4 py-3 text-sm text-deep">
          لم تنشري أي حديث بعد..{" "}
          <Link
            href="/admin/hadiths"
            className="underline decoration-dusty underline-offset-4"
          >
            انشري الحديث الأول
          </Link>{" "}
          لتصبح خاناته متاحة للتسميع.
        </div>
      )}

      {students.length === 0 ? (
        <div className="rounded-card border border-dashed border-dusty/60 bg-white/60 px-6 py-12 text-center text-sm text-muted">
          أضيفي أسماء الطالبات أولًا من{" "}
          <Link
            href="/admin/students"
            className="text-deep underline decoration-dusty underline-offset-4"
          >
            صفحة الطالبات
          </Link>
          .
        </div>
      ) : (
        <>
          <RecitationGrid data={data} />
          <GridHint isAdmin />
        </>
      )}
    </div>
  );
}
