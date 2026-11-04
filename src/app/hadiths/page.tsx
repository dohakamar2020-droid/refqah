import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/permissions";

export const dynamic = "force-dynamic";

/**
 * صفحة الأحاديث العامة أُلغيت: نص الأحاديث في مسار الطالبة فقط
 * (الأحاديث المنشورة في فصلها)، ولا تُعرض لأي زائر.
 */
export default async function HadithsPage() {
  const me = await getSessionUser();
  if (!me) redirect("/student/login");
  redirect(me.role === "admin" ? "/admin/hadiths" : "/student");
}
