"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { deleteStudent, updateStudent } from "@/lib/actions";
import { SmallFlower } from "@/components/floral";

type StudentItem = {
  id: string;
  displayName: string;
  username: string | null;
  phone: string | null;
  competitionOptIn: boolean;
};

export function StudentRow({ student }: { student: StudentItem }) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onUpdate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await updateStudent(formData);
      if (res.ok) setEditing(false);
      else setError(res.error ?? "تعذّر حفظ التعديل");
    });
  }

  function onDelete() {
    setError(null);
    startTransition(async () => {
      const res = await deleteStudent(student.id);
      if (!res.ok) setError(res.error ?? "تعذّر حذف الطالبة");
      setConfirming(false);
    });
  }

  return (
    <li className="rounded-card border border-powder bg-white/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-powder font-display text-deep">
            {student.displayName.trim().charAt(0)}
          </span>
          <div>
            <p className="font-medium text-deep">{student.displayName}</p>
            <p className="text-xs text-muted" dir="ltr">
              {student.username ?? "—"}
              {student.phone ? ` · ${student.phone}` : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {student.competitionOptIn && (
            <span className="chip bg-powder text-deep">
              <SmallFlower className="h-3 w-3 text-dusty" />
              موافقة على المنافسة
            </span>
          )}
          <Link
            href={`/admin/reports/${student.id}`}
            className="btn-ghost !px-4 !py-2 text-xs"
          >
            تقرير
          </Link>
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="btn-ghost !px-4 !py-2 text-xs"
          >
            {editing ? "إلغاء" : "تعديل"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming((v) => !v)}
            className="btn-danger"
          >
            حذف
          </button>
        </div>
      </div>

      {confirming && (
        <div className="mt-4 rounded-2xl border border-dusty/50 bg-blush p-4 text-sm">
          <p className="text-deep">
            سيتم حذف حساب «{student.displayName}» وكل سجل تسميعها نهائيًا. هل
            أنتِ متأكدة؟
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={onDelete}
              disabled={pending}
              className="btn-primary !bg-deep !px-4 !py-2 text-xs"
            >
              {pending ? "جارٍ الحذف…" : "نعم، احذفي"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="btn-ghost !px-4 !py-2 text-xs"
            >
              تراجع
            </button>
          </div>
        </div>
      )}

      {editing && (
        <form action={onUpdate} className="mt-4 grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="studentId" value={student.id} />
          <div>
            <label className="label">الاسم</label>
            <input
              name="name"
              defaultValue={student.displayName}
              className="field"
              required
            />
          </div>
          <div>
            <label className="label">كلمة مرور جديدة (اختياري)</label>
            <input name="password" type="text" className="field" />
          </div>
          <div>
            <label className="label">رقم الواتساب (اختياري)</label>
            <input
              name="phone"
              dir="ltr"
              defaultValue={student.phone ?? ""}
              className="field"
              placeholder="201012345678"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-ink sm:col-span-2">
            <input
              type="checkbox"
              name="competitionOptIn"
              defaultChecked={student.competitionOptIn}
              className="h-4 w-4 accent-deep"
            />
            موافقة على الظهور في المنافسة
          </label>
          <div className="sm:col-span-2">
            <button type="submit" className="btn-primary" disabled={pending}>
              {pending ? "جارٍ الحفظ…" : "حفظ التعديلات"}
            </button>
          </div>
        </form>
      )}

      {error && <p className="mt-3 text-sm text-deep">{error}</p>}
    </li>
  );
}
