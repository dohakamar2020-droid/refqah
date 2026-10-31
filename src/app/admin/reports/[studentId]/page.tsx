import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/permissions";
import { getStudentReport } from "@/lib/queries";
import { ReportCard } from "@/components/report/report-card";
import { ReportShareBar } from "@/components/report/report-share-bar";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

function buildTextMessage(
  data: NonNullable<Awaited<ReturnType<typeof getStudentReport>>>
) {
  return [
    "بسم الله الرحمن الرحيم",
    "",
    "تقرير متابعة الحفظ — رِفقة الأربعين",
    "",
    `حفظكِ يا ${data.displayName}: سمّعتِ ${data.recitedCount} من ${data.total} حديثًا (${data.percent}%)`,
    data.remaining > 0
      ? `تبقّى لكِ ${data.remaining} حديثًا بإذن الله.`
      : "أتممتِ الرحلة كاملة، بارك الله فيكِ.",
    data.isSabiqah ? "لقبكِ: سَابِقَةُ الخَيْرَات 🌸" : "",
    data.message ? `«${data.message}»` : "",
    "",
    "معًا حتى تمام حفظ الأربعين النووية 💗",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

export default async function StudentReportPage({
  params,
}: {
  params: { studentId: string };
}) {
  await requireAdmin();

  const data = await getStudentReport(params.studentId);
  if (!data) notFound();

  const dateLabel = formatDate(new Date());
  const textMessage = buildTextMessage(data);
  const slug = data.displayName.replace(/\s+/g, "-");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl text-deep">
            تقرير {data.displayName}
          </h2>
          <p className="mt-1 text-sm text-muted">
            صورة التقرير جاهزة للمشاركة على واتساب — {dateLabel}
          </p>
        </div>
        <Link href="/admin/reports" className="btn-ghost">
          رجوع إلى التقارير
        </Link>
      </div>

      {/* The card is fixed-width; scroll on small screens instead of shrinking,
          so the captured PNG keeps its intended proportions. */}
      <div className="grid-scroll -mx-4 px-4 sm:mx-0 sm:px-0">
        <div id="report-card" className="w-fit">
          <ReportCard data={data} dateLabel={dateLabel} />
        </div>
      </div>

      <ReportShareBar
        targetId="report-card"
        fileName={`refqah-report-${slug}.png`}
        phone={data.phone}
        textMessage={textMessage}
      />

      {!data.phone && (
        <p className="text-xs text-muted">
          لإظهار زر محادثة مباشرة مع الطالبة، أضيفي رقم واتسابها من{" "}
          <Link
            href="/admin/students"
            className="text-deep underline decoration-dusty underline-offset-4"
          >
            صفحة الطالبات
          </Link>
          .
        </p>
      )}
    </div>
  );
}
