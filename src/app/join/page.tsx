import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/permissions";
import { StudentJoinForm } from "@/components/auth/student-join-form";
import { FloralBranch, SmallFlower } from "@/components/floral";

export const dynamic = "force-dynamic";

export default async function JoinPage() {
  const me = await getSessionUser();
  if (me) redirect(me.role === "admin" ? "/admin" : "/student");

  return (
    <div className="relative mx-auto max-w-md px-4 py-14 sm:px-6">
      <FloralBranch className="pointer-events-none absolute -right-8 top-0 hidden h-56 w-auto -scale-x-100 opacity-50 sm:block" />

      <div className="relative card card-pad">
        <div className="text-center">
          <SmallFlower className="mx-auto h-10 w-10 text-dusty" />
          <h1 className="mt-4 font-display text-3xl text-deep">انضمي إلى فصلِك</h1>
          <p className="mt-2 text-sm text-muted">
            بكود معلمتك واسمك، وتبدئين رحلتكِ في الحفظ
          </p>
        </div>

        <div className="mt-8">
          <StudentJoinForm />
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          معلمتك لم تفتح التسجيل؟ أضيفك بنفسها وتعطيك كودك الخاص.{" "}
          <Link
            href="/student/login"
            className="text-deep underline decoration-dusty underline-offset-4"
          >
            عندي كود بالفعل
          </Link>
        </p>
      </div>
    </div>
  );
}
