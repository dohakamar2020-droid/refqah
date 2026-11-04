"use client";

import { useRef, useState, useTransition } from "react";
import { createStudent } from "@/lib/actions";
import { SmallFlower } from "@/components/floral";

export function StudentCreateForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    setCreated(null);
    startTransition(async () => {
      const res = await createStudent(formData);
      if (res.ok) {
        setCreated(res.code ?? "");
        formRef.current?.reset();
      } else {
        setError(res.error ?? "تعذّر إضافة الطالبة");
      }
    });
  }

  return (
    <form ref={formRef} action={onSubmit} className="card card-pad">
      <div className="flex items-center gap-2">
        <SmallFlower className="h-5 w-5 text-dusty" />
        <h2 className="font-display text-xl text-deep">إضافة طالبة</h2>
      </div>
      <p className="mt-1 text-sm text-muted">
        اكتبي اسمها وكلمة المرور، والنظام يعطيها كودًا خاصًا بها — سلّميها الكود
        والباسورد، وبها تدخل من صفحة الدخول.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="name">
            اسم الطالبة
          </label>
          <input id="name" name="name" className="field" required />
        </div>
        <div>
          <label className="label" htmlFor="password">
            كلمة المرور
          </label>
          <input
            id="password"
            name="password"
            type="text"
            className="field"
            placeholder="6 أحرف على الأقل"
            required
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="phone">
            رقم الواتساب (اختياري)
          </label>
          <input
            id="phone"
            name="phone"
            dir="ltr"
            className="field"
            placeholder="201012345678"
          />
          <p className="mt-1 text-xs text-muted">
            بالصيغة الدولية — لفتح محادثة واتساب عند إرسال التقرير
          </p>
        </div>
      </div>

      <label className="mt-4 flex cursor-pointer items-center gap-3 text-sm text-ink">
        <input
          type="checkbox"
          name="competitionOptIn"
          className="h-4 w-4 accent-deep"
        />
        موافقة مبدئية على الظهور في لوحة المنافسة
      </label>

      {error && (
        <p className="mt-4 rounded-2xl border border-dusty/50 bg-blush px-4 py-2 text-sm text-deep">
          {error}
        </p>
      )}

      {created !== null && (
        <div className="mt-4 rounded-2xl border border-dusty/40 bg-powder/60 px-4 py-3 text-sm text-deep">
          <p>تمت إضافة الطالبة ✓</p>
          <p className="mt-1 text-xs text-muted">كودها للدخول:</p>
          <p
            dir="ltr"
            className="mt-1 text-center font-display text-2xl tracking-[0.25em] text-deep"
          >
            {created || "—"}
          </p>
        </div>
      )}

      <button type="submit" className="btn-primary mt-6" disabled={pending}>
        {pending ? "جارٍ الإضافة…" : "إضافة الطالبة"}
      </button>
    </form>
  );
}
