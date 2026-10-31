"use client";

import { useRef, useState, useTransition } from "react";
import { createHadith } from "@/lib/actions";

export function HadithCreateForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-ghost">
        + إضافة حديث جديد
      </button>
    );
  }

  function onSubmit(formData: FormData) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const res = await createHadith(formData);
      if (res.ok) {
        setSuccess("تمت إضافة الحديث (لم يُنشر بعد)");
        formRef.current?.reset();
        setOpen(false);
      } else {
        setError(res.error ?? "تعذّر إضافة الحديث");
      }
    });
  }

  return (
    <form ref={formRef} action={onSubmit} className="card card-pad space-y-4">
      <h3 className="font-display text-lg text-deep">حديث جديد</h3>
      <div>
        <label className="label">العنوان</label>
        <input name="title" className="field" required />
      </div>
      <div>
        <label className="label">النص</label>
        <textarea name="arabicText" rows={5} className="field leading-loose" required />
      </div>
      <div>
        <label className="label">التخريج / المصدر</label>
        <input name="source" className="field" />
      </div>

      {error && <p className="text-sm text-deep">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "جارٍ الحفظ…" : "حفظ"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="btn-ghost"
        >
          إلغاء
        </button>
      </div>
      {success && <p className="text-sm text-deep">{success}</p>}
    </form>
  );
}
