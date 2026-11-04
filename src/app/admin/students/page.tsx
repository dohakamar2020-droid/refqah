import {
  getRegistrationSettings,
  getStudents,
  getHadithTitles,
} from "@/lib/queries";
import { requireTeacher } from "@/lib/permissions";
import { RegistrationManager } from "@/components/admin/registration-manager";
import { StudentCreateForm } from "@/components/admin/student-create-form";
import { StudentRow, CorrectionSender } from "@/components/admin/student-row";
import { StudentOrderEditor } from "@/components/admin/student-order-editor";
import { SmallFlower } from "@/components/floral";

export const dynamic = "force-dynamic";

export default async function AdminStudentsPage() {
  const { teacher } = await requireTeacher();
  const [students, registration, hadithTitles] = await Promise.all([
    getStudents(teacher.id),
    getRegistrationSettings(teacher.id),
    getHadithTitles(teacher.id),
  ]);

  const titleCounts: Record<string, number> = {};
  for (const t of hadithTitles) {
    titleCounts[t.studentId] = (titleCounts[t.studentId] ?? 0) + 1;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,26rem)_1fr] lg:items-start">
      <div className="space-y-6">
        <section className="card card-pad">
          <h2 className="font-display text-xl text-deep">ترتيب الفصل</h2>
          <p className="mt-1 text-sm text-muted">
            رتّبي طالباتك بنفسكِ: اسحبي الاسم أو استخدمي الأسهم. الترتيب يُحفظ
            تلقائيًا، وتظهر الأولى في جدول التسميع والتقارير.
          </p>
          {students.length > 0 && (
            <StudentOrderEditor
              students={students.map((s) => ({
                id: s.id,
                displayName: s.displayName,
              }))}
              titleHolders={titleCounts}
            />
          )}
          {students.length === 0 && (
            <p className="mt-4 text-sm text-muted">
              أضيفي الطالبات أولًا، ثم رتّبيهنّ كما تحبّين.
            </p>
          )}
        </section>

        <StudentCreateForm />
        {students.length > 0 && (
          <CorrectionSender
            className={teacher.name}
            students={students.map((s) => ({
              id: s.id,
              displayName: s.displayName,
              phone: s.phone,
            }))}
          />
        )}
        <RegistrationManager
          enabled={registration.enabled}
          teacherCode={teacher.code}
        />
      </div>

      <section className="card card-pad">
        <h2 className="font-display text-xl text-deep">طالبات فصلك</h2>
        <p className="mt-1 text-sm text-muted">
          هذه الأسماء لا تظهر لأي زائر ولا لأي معلمة أخرى، وكل طالبة ترى مساحتها
          الخاصة فقط. الترتيب هنا هو ترتيبكِ أنتِ من «ترتيب الفصل».
        </p>

        {students.length === 0 ? (
          <p className="mt-6 text-sm text-muted">لم تُضف أي طالبة بعد.</p>
        ) : (
          <ul className="mt-5 space-y-3">
            {students.map((s) => (
              <StudentRow
                key={s.id}
                teacherCode={teacher.code}
                student={{
                  id: s.id,
                  displayName: s.displayName,
                  loginCode: s.loginCode,
                  phone: s.phone,
                  competitionOptIn: s.competitionOptIn,
                }}
              />
            ))}
          </ul>
        )}

        <p className="mt-5 flex items-start gap-2 text-xs text-muted">
          <SmallFlower className="mt-0.5 h-4 w-4 shrink-0 text-dusty" />
          <span>
            حذف الطالبة يزيل حسابها وكل سجلات تسميعها، ولا يمكن التراجع عنه.
          </span>
        </p>
      </section>
    </div>
  );
}
