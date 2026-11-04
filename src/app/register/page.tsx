import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/permissions";
import { TeacherRegisterForm } from "@/components/auth/teacher-register-form";
import { FloralBranch, SmallFlower } from "@/components/floral";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const me = await getSessionUser();
  if (me) redirect(me.role === "admin" ? "/admin" : "/student");

  return (
    <div className="relative mx-auto max-w-md px-4 py-14 sm:px-6">
      <FloralBranch className="pointer-events-none absolute -right-8 top-0 hidden h-56 w-auto -scale-x-100 opacity-50 sm:block" />

      <div className="relative card card-pad">
        <div className="text-center">
          <SmallFlower className="mx-auto h-10 w-10 text-dusty" />
          <h1 className="mt-4 font-display text-3xl text-deep">مساحة معلمة جديدة</h1>
          <p className="mt-2 text-sm text-muted">
            كل معلمة لها كودها وطالباتها وأحاديثها وسجل تسميعها — منفصلة تمامًا عن
            أي معلمة أخرى
          </p>
        </div>

        <div className="mt-8">
          <TeacherRegisterForm />
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          عندكِ حساب بالفعل؟{" "}
          <Link
            href="/teacher/login"
            className="text-deep underline decoration-dusty underline-offset-4"
          >
            سجّلي الدخول
          </Link>
        </p>
      </div>
    </div>
  );
}
