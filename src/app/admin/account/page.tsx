import { requireTeacher } from "@/lib/permissions";
import {
  ChangePasswordForm,
  ChangeCodeForm,
  UpdateProfileForm,
} from "@/components/admin/account-forms";
import { SmallFlower } from "@/components/floral";

export const dynamic = "force-dynamic";

export default async function AdminAccountPage() {
  const { user: me, teacher } = await requireTeacher();

  return (
    <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
      <section className="card card-pad">
        <div className="flex items-center gap-2">
          <SmallFlower className="h-5 w-5 text-dusty" />
          <h2 className="font-display text-2xl text-deep">حساب المعلمة</h2>
        </div>
        <p className="mt-1 text-sm text-muted">
          بيانات مساحتك — صلاحية الإدارة والتعديل مرتبطة بكودك هذا، وكل طالباتك
          وأحاديثك وتقاريرك منفصلة تمامًا عن أي معلمة أخرى.
        </p>

        <dl className="mt-5 space-y-2 text-sm">
          <div className="flex justify-between rounded-2xl bg-blush/50 px-4 py-3">
            <dt className="text-muted">كود المعلمة</dt>
            <dd className="text-deep" dir="ltr">
              {teacher.code}
            </dd>
          </div>
          <div className="flex justify-between rounded-2xl bg-blush/50 px-4 py-3">
            <dt className="text-muted">الاسم</dt>
            <dd className="text-deep">{teacher.name}</dd>
          </div>
          <div className="flex justify-between rounded-2xl bg-blush/50 px-4 py-3">
            <dt className="text-muted">الصلاحية</dt>
            <dd className="text-deep">معلمة (مالكة هذه المساحة)</dd>
          </div>
        </dl>

        <div className="mt-6">
          <UpdateProfileForm name={me.name} />
        </div>

        <div className="mt-6">
          <ChangeCodeForm currentCode={teacher.code} />
        </div>
      </section>

      <section className="card card-pad">
        <h2 className="font-display text-2xl text-deep">تغيير كلمة المرور</h2>
        <p className="mt-1 text-sm text-muted">
          يُفضّل تغييرها قبل بدء الدورة، واستخدام كلمة مرور قوية لا تشاركيها مع
          أحد.
        </p>

        <div className="mt-5">
          <ChangePasswordForm />
        </div>
      </section>
    </div>
  );
}
