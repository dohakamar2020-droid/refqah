import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/permissions";
import { LoginForm } from "@/components/login-form";
import { FloralBranch, SmallFlower } from "@/components/floral";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const me = await getSessionUser();
  if (me) redirect(me.role === "admin" ? "/admin" : "/me");

  return (
    <div className="relative mx-auto max-w-md px-4 py-16 sm:px-6">
      <FloralBranch className="pointer-events-none absolute -right-8 top-0 hidden h-56 w-auto -scale-x-100 opacity-50 sm:block" />

      <div className="relative card card-pad">
        <div className="text-center">
          <SmallFlower className="mx-auto h-10 w-10 text-dusty" />
          <h1 className="mt-4 font-display text-3xl text-deep">تسجيل الدخول</h1>
          <p className="mt-2 text-sm text-muted">
            ادخلي باسم المستخدم أو البريد الإلكتروني الذي أعطته لكِ المعلمة
          </p>
        </div>

        <div className="mt-8">
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          لا تستطيع الطالبات تعديل حالات التسميع؛ صلاحية التعديل للمعلمة فقط.
        </p>
      </div>
    </div>
  );
}
