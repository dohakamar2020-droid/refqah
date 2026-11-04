import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/permissions";
import { LoginTabs } from "@/components/auth/login-tabs";
import { FloralBranch, SmallFlower } from "@/components/floral";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const me = await getSessionUser();
  if (me) redirect(me.role === "admin" ? "/admin" : "/me");

  return (
    <div className="relative mx-auto max-w-md px-4 py-14 sm:px-6">
      <FloralBranch className="pointer-events-none absolute -right-8 top-0 hidden h-56 w-auto -scale-x-100 opacity-50 sm:block" />

      <div className="relative card card-pad">
        <div className="text-center">
          <SmallFlower className="mx-auto h-10 w-10 text-dusty" />
          <h1 className="mt-4 font-display text-3xl text-deep">تسجيل الدخول</h1>
          <p className="mt-2 text-sm text-muted">
            بالكود والاسم وكلمة المرور — كل معلمة وطالباتها في مساحة مستقلة
          </p>
        </div>

        <div className="mt-8">
          <LoginTabs />
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          معلمة جديدة؟{" "}
          <Link
            href="/register"
            className="text-deep underline decoration-dusty underline-offset-4"
          >
            افتحي مساحتك
          </Link>
        </p>

        <p className="mt-4 text-center text-[11px] leading-relaxed text-muted">
          طالبة عند معلمة فعّلت التسجيل؟ سجّلي من{" "}
          <Link href="/join" className="underline decoration-dusty underline-offset-4">
            صفحة الانضمام
          </Link>{" "}
          بكود معلمتك.
        </p>
      </div>
    </div>
  );
}
