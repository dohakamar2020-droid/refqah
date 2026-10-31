import { getStudents } from "@/lib/queries";
import { StudentCreateForm } from "@/components/admin/student-create-form";
import { StudentRow } from "@/components/admin/student-row";
import { SmallFlower } from "@/components/floral";

export const dynamic = "force-dynamic";

export default async function AdminStudentsPage() {
  const students = await getStudents();

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,26rem)_1fr] lg:items-start">
      <StudentCreateForm />

      <section className="card card-pad">
        <h2 className="font-display text-xl text-deep">الطالبات المسجلات</h2>
        <p className="mt-1 text-sm text-muted">
          هذه الأسماء لا تظهر للزوار، وكل طالبة ترى ملفها الخاص فقط.
        </p>

        {students.length === 0 ? (
          <p className="mt-6 text-sm text-muted">لم تُضف أي طالبة بعد.</p>
        ) : (
          <ul className="mt-5 space-y-3">
            {students.map((s) => (
              <StudentRow
                key={s.id}
                student={{
                  id: s.id,
                  displayName: s.displayName,
                  username: s.username,
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
