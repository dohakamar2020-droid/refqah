import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/permissions";
import { StudentLoginForm } from "@/components/student/student-login-form";
import { FloralBranch, SmallFlower } from "@/components/floral";

export const dynamic = "force-dynamic";

/** مسار دخول الطالبات — منفصل تمامًا عن دخول المعلمات. */
export default async function StudentLoginPage() {
  const me = await getSessionUser();
  if (me) redirect(me.role === "admin" ? "/admin" : "/student");

  return (
    <div className="relative mx-auto max-w-md px-4 py-14 sm:px-6">
      <FloralBranch className="pointer-events-none absolute -right-8 top-0 hidden h-56 w-auto -scale-x-100 opacity-50 sm:block" />

      <div className="relative card card-pad">
        <div className="text-center">
          <SmallFlower className="mx-auto h-10 w-10 text-dusty" />
          <h1 className="mt-4 font-display text-3xl text-deep">دخول الطالبات</h1>
          <p className="mt-2 text-sm text-muted">
            بكودكِ واسمكِ وكلمة المرور، لتتابعي رحلتكِ في فصل معلمتكِ
          </p>
        </div>

        <div className="mt-8">
          <StudentLoginForm />
        </div>

        <p className="mt-6 text-center text-xs leading-relaxed text-muted">
          لم تستلمي كودكِ بعد؟ معلمتكِ هي من تعطيه لكِ عند إضافتك للفصل.
        </p>
      </div>
    </div>
  );
}
