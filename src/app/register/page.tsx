import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/permissions";
import { getRegistrationSettings, hasAdmin } from "@/lib/queries";
import { RegisterForm } from "@/components/register-form";
import { FloralBranch, SmallFlower } from "@/components/floral";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const me = await getSessionUser();
  if (me) redirect(me.role === "admin" ? "/admin" : "/me");

  // Fresh installation → the teacher must set up her account first.
  if (!(await hasAdmin())) redirect("/setup");

  const settings = await getRegistrationSettings();

  return (
    <div className="relative mx-auto max-w-md px-4 py-14 sm:px-6">
      <FloralBranch className="pointer-events-none absolute -right-8 top-0 hidden h-56 w-auto -scale-x-100 opacity-50 sm:block" />

      <div className="relative card card-pad">
        <div className="text-center">
          <SmallFlower className="mx-auto h-10 w-10 text-dusty" />
          <h1 className="mt-4 font-display text-3xl text-deep">
            انضمي إلى الرحلة
          </h1>
          <p className="mt-2 text-sm text-muted">
            أنشئي حسابكِ بنفسكِ وابدئي متابعة حفظكِ
          </p>
        </div>

        <div className="mt-8">
          {settings.enabled ? (
            <RegisterForm requireCode={Boolean(settings.code)} />
          ) : (
            <div className="text-center">
              <p className="font-display text-lg text-deep">
                التسجيل الذاتي مغلق حاليًا
              </p>
              <p className="mt-2 text-sm text-muted">
                المعلمة هي من تفتح باب التسجيل أو تضيف الطالبات مباشرة. تواصلي
                معها لتفعيله.
              </p>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          لديكِ حساب بالفعل؟{" "}
          <Link
            href="/login"
            className="text-deep underline decoration-dusty underline-offset-4"
          >
            سجّلي الدخول
          </Link>
        </p>
      </div>
    </div>
  );
}
