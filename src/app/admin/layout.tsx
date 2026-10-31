import { requireAdmin } from "@/lib/permissions";
import { AdminNav } from "@/components/admin/admin-nav";
import { OrnamentDivider } from "@/components/floral";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side guard: only the teacher can reach anything under /admin.
  await requireAdmin();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="chip bg-powder text-deep">لوحة المعلمة</span>
            <h1 className="mt-3 font-display text-3xl text-deep">
              إدارة رحلة الحفظ
            </h1>
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
