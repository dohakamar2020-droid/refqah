import { getAllHadiths } from "@/lib/queries";
import { HadithRow } from "@/components/admin/hadith-row";
import { HadithCreateForm } from "@/components/admin/hadith-create-form";
import { PUBLISH_DAYS } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminHadithsPage() {
  const hadiths = await getAllHadiths();
  const publishedCount = hadiths.filter((h) => h.published).length;

  return (
    <div className="space-y-6">
      <section className="card card-pad">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl text-deep">إدارة الأحاديث</h2>
            <p className="mt-1 text-sm text-muted">
              المنشور منها {publishedCount} من {hadiths.length} — أيام النشر:{" "}
              {PUBLISH_DAYS.join("، ")}
            </p>
          </div>
          <HadithCreateForm />
        </div>
        <p className="mt-4 text-xs text-muted">
          عند نشر حديث جديد تصبح خاناته متاحة للتسميع في الجدول، وما لم يُنشر يظهر
          مغلقًا للطالبات.
        </p>
      </section>

      <ul className="space-y-3">
        {hadiths.map((h) => (
          <HadithRow
            key={h.id}
            hadith={{
              id: h.id,
              order: h.order,
              title: h.title,
              narrator: h.narrator,
              arabicText: h.arabicText,
              takhrij: h.takhrij,
              textEdited: h.textEdited,
              published: h.published,
            }}
          />
        ))}
      </ul>
    </div>
  );
}
