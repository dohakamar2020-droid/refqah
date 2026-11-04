"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { deleteStudent, rotateStudentCode, updateStudent } from "@/lib/actions";
import { SmallFlower } from "@/components/floral";

type StudentItem = {
  id: string;
  displayName: string;
  loginCode: string | null;
  phone: string | null;
  competitionOptIn: boolean;
};

/**
 * رسالة التصحيح الجاهزة على واتساب.
 *
 * المعلمة تكتب تصحيح التسميع هنا فيصل للطالبة كنص جاهز، ثم تسجّله الطالبة في
 * مساحتها لتكون معها عند المراجعة. لا تُحفظ الرسالة في قاعدة البيانات — مجرد
 * مساعد لصياغتها وإرسالها.
 */
function buildCorrectionMessage(
  name: string,
  className: string,
  hadithOrder: string,
  mistakes: string,
  notes: string
) {
  const lines = [
    `بسم الله الرحمن الرحيم`,
    "",
    `تصحيح تسميع — ${name}`,
    `فصل ${className}`,
    hadithOrder ? `الحديث رقم ${hadithOrder}` : "",
    "",
    mistakes ? "مواضع الأخطاء:" : "",
    mistakes,
    notes ? "" : "",
    notes ? "ملاحظات:" : "",
    notes,
    "",
    "افتحي مساحتكِ في البرنامج وسجّلي هذه النتيجة لتكون معكِ عند المراجعة.",
  ];
  return lines.filter((l) => l !== null).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function StudentRow({
  student,
  teacherCode,
}: {
  student: StudentItem;
  teacherCode: string;
}) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState(student.loginCode);
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

  function onRotate() {
    setError(null);
    startTransition(async () => {
      const res = await rotateStudentCode(student.id);
      if (res.ok && res.code) setCode(res.code);
      else if (!res.ok) setError(res.error ?? "تعذّر توليد كود جديد");
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
              {code ?? "—"}
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

      <div className="mt-3 rounded-2xl bg-blush/40 px-4 py-3 text-xs text-muted">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>
            دخولها باسم <span className="text-deep">«{student.displayName}»</span>
          </span>
          <span>
            وكود المعلمة{" "}
            <span dir="ltr" className="text-deep">
              {teacherCode}
            </span>
          </span>
          <span>
            — أو بكودها الخاص{" "}
            <span dir="ltr" className="text-deep">
              {code ?? "—"}
            </span>
          </span>
          <button
            type="button"
            onClick={onRotate}
            disabled={pending}
            className="text-deep underline decoration-dusty underline-offset-4"
          >
            توليد كود جديد
          </button>
        </p>
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


/** بطاقة إرسال التصحيح على واتساب — خاصة بلوحة المعلمة. */
export function CorrectionSender({
  students,
  className,
}: {
  students: { id: string; displayName: string; phone: string | null }[];
  className: string;
}) {
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [order, setOrder] = useState("");
  const [mistakes, setMistakes] = useState("");
  const [notes, setNotes] = useState("");
  const [open, setOpen] = useState(false);

  const student = students.find((s) => s.id === studentId);
  const text = student
    ? buildCorrectionMessage(student.displayName, className, order.trim(), mistakes.trim(), notes.trim())
    : "";

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard may be unavailable — she can still select and copy manually.
    }
  }

  return (
    <div className="card card-pad">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-display text-xl text-deep">إرسال تصحيح تسميع</h2>
          <p className="mt-1 text-sm text-muted">
            اكتبي التصحيح مرة واحدة، وارسليه للطالبة على واتساب، ثم تسجّله هي في
            مساحتها لتراجع عليه.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="btn-ghost shrink-0 !px-3 !py-1.5 text-xs"
        >
          {open ? "إغلاق" : "فتح"}
        </button>
      </div>

      {open && (
        <div className="mt-4 space-y-3">
          <div>
            <label className="label" htmlFor="correction-student">
              الطالبة
            </label>
            <select
              id="correction-student"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="field"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.displayName}
                  {s.phone ? " — واتساب مسجّل" : " — بدون رقم"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="correction-order">
              رقم الحديث (اختياري)
            </label>
            <input
              id="correction-order"
              value={order}
              onChange={(e) => setOrder(e.target.value)}
              className="field"
              placeholder="مثال: 5"
            />
          </div>

          <div>
            <label className="label" htmlFor="correction-mistakes">
              مواضع الأخطاء
            </label>
            <textarea
              id="correction-mistakes"
              value={mistakes}
              onChange={(e) => setMistakes(e.target.value)}
              rows={3}
              className="field leading-loose"
              placeholder={"سطر لكل موضع، مثال:\n«صيام رمضان» — نسيتها\n«أنزلناه» — قالت «أنزلنه»"}
            />
          </div>

          <div>
            <label className="label" htmlFor="correction-notes">
              ملاحظات
            </label>
            <textarea
              id="correction-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="field leading-loose"
              placeholder="مثال: أرجّع التسميع الأسبوع الجاي وأركّز على آخر ثلاثة أحاديث"
            />
          </div>

          <div className="rounded-2xl border border-powder bg-white/60 p-3">
            <p className="text-[11px] text-muted">سيصل النص بهذا الشكل:</p>
            <pre className="mt-2 whitespace-pre-wrap break-words font-sans text-xs leading-relaxed text-ink">
              {text}
            </pre>
          </div>

          <div className="flex flex-wrap gap-2">
            {student?.phone ? (
              <a
                href={`https://wa.me/${student.phone}?text=${encodeURIComponent(text)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary !px-4 !py-2 text-xs"
              >
                إرسال على واتساب
              </a>
            ) : (
              <span className="chip bg-blush text-muted">
                أضيفي رقم واتسابها من التعديل لفتح المحادثة مباشرة
              </span>
            )}
            <button
              type="button"
              onClick={copy}
              className="btn-ghost !px-4 !py-2 text-xs"
            >
              نسخ النص
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
