import { redirect } from "next/navigation";
import { hasAnyTeacher } from "@/lib/db/seed";
import { ensureReady } from "@/lib/db/ready";
import { SetupForm } from "@/components/setup-form";
import { FloralBranch, SmallFlower } from "@/components/floral";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  await ensureReady();
  // Already configured → the setup screen must disappear.
  if (await hasAnyTeacher()) redirect("/login");

  return (
    <div className="relative mx-auto max-w-md px-4 py-14 sm:px-6">
      <FloralBranch className="pointer-events-none absolute -right-8 top-0 hidden h-56 w-auto -scale-x-100 opacity-50 sm:block" />

      <div className="relative card card-pad">
        <div className="text-center">
          <SmallFlower className="mx-auto h-10 w-10 text-dusty" />
          <h1 className="mt-4 font-display text-3xl text-deep">إعداد الموقع</h1>
          <p className="mt-2 text-sm text-muted">
            أهلًا بكِ في رِفقة الأربعين.. أنشئي مساحة المعلمة الأولى لتبدأ الرحلة
          </p>
        </div>

        <div className="mt-8">
          <SetupForm />
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          هذه الشاشة تظهر مرة واحدة فقط؛ بعد إنشاء الحساب لن تظهر مرة أخرى،
          وتصبح صلاحية الإدارة محصورة بصاحب الكود.
        </p>
      </div>
    </div>
  );
}
