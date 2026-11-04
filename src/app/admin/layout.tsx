import { requireTeacher } from "@/lib/permissions";
import { AdminNav } from "@/components/admin/admin-nav";
import { OrnamentDivider, SmallFlower } from "@/components/floral";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side guard: only a teacher reaches anything under /admin, and every
  // page below filters on HER space — never on "some admin".
  const { teacher } = await requireTeacher();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className="chip bg-powder text-deep">
              لوحة المعلمة — {teacher.name}
            </span>
            <h1 className="mt-3 font-display text-3xl text-deep">
              إدارة رحلة الحفظ
            </h1>
          </div>

          <div className="rounded-2xl border border-dusty/40 bg-white/70 px-4 py-3 text-center">
            <p className="flex items-center justify-center gap-1 text-[11px] text-muted">
              <SmallFlower className="h-3 w-3 text-dusty" />
              كود مساحتك
            </p>
            <p
              dir="ltr"
              className="mt-1 font-display text-lg tracking-[0.2em] text-deep"
            >
              {teacher.code}
            </p>
            <p className="mt-1 text-[10px] text-muted">
              به ينضم طالباتك لفصلك
            </p>
          </div>
        </div>
        <OrnamentDivider className="mt-4 h-5 w-52 text-dusty" />
      </header>

      <div className="mb-8 border-b border-powder/60 pb-3">
        <AdminNav />
      </div>

      {children}
    </div>
  );
}
