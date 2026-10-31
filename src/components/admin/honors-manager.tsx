"use client";

import { useState, useTransition } from "react";
import {
  setCompetitionEnabled,
  addHonor,
  deleteHonor,
  addMessage,
  deleteMessage,
} from "@/lib/actions";

/* ── Competition master switch ─────────────────────────── */

export function CompetitionMasterToggle({ initial }: { initial: boolean }) {
  const [enabled, setEnabled] = useState(initial);
  const [pending, startTransition] = useTransition();

  function change(next: boolean) {
    const previous = enabled;
    setEnabled(next);
    startTransition(async () => {
      const res = await setCompetitionEnabled(next);
      if (!res.ok) setEnabled(previous);
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-powder bg-white/70 px-5 py-4">
      <div>
        <p className="font-medium text-deep">تشغيل لوحة المنافسة</p>
        <p className="mt-1 text-xs text-muted">
          عند الإيقاف تختفي لوحة أفضل 3 من الموقع بالكامل.
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        disabled={pending}
        onClick={() => change(!enabled)}
        className={`relative h-7 w-14 shrink-0 rounded-full transition disabled:opacity-50 ${
          enabled ? "bg-deep" : "bg-dusty/50"
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${
            enabled ? "left-1" : "left-8"
          }`}
        />
      </button>
    </div>
  );
}

/* ── Add a custom honor ────────────────────────────────── */

export function AddHonorForm({
  students,
}: {
  students: { id: string; displayName: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function onSubmit(formData: FormData) {
    setError(null);
    setDone(false);
    startTransition(async () => {
      const res = await addHonor(formData);
      if (res.ok) setDone(true);
      else setError(res.error ?? "تعذّر إضافة التكريم");
    });
  }

  return (
    <form action={onSubmit} className="mt-5 grid gap-4 sm:grid-cols-2">
      <div>
        <label className="label">الطالبة</label>
        <select name="studentId" className="field" required>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.displayName}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">لقب التكريم</label>
        <input name="title" className="field" placeholder="مثال: رفيقة الهمة" required />
      </div>
      <div className="sm:col-span-2">
        <label className="label">وصف مختصر (اختياري)</label>
        <input name="description" className="field" />
      </div>
      <div className="sm:col-span-2">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "جارٍ الحفظ…" : "إضافة تكريم"}
        </button>
      </div>
      {error && <p className="text-sm text-deep sm:col-span-2">{error}</p>}
      {done && (
        <p className="text-sm text-deep sm:col-span-2">تمت إضافة التكريم بنجاح</p>
      )}
    </form>
  );
}

export function DeleteHonorButton({ honorId }: { honorId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await deleteHonor(honorId);
        })
      }
      className="text-xs text-muted underline decoration-dusty underline-offset-4 hover:text-deep disabled:opacity-50"
    >
      {pending ? "جارٍ الحذف…" : "حذف"}
    </button>
  );
}

/* ── Messages library ──────────────────────────────────── */

export function AddMessageForm() {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  function onSubmit(formData: FormData) {
    setDone(false);
    startTransition(async () => {
      const res = await addMessage(formData);
      if (res.ok) setDone(true);
    });
  }

  return (
    <form action={onSubmit} className="mt-5 space-y-3">
      <div>
        <label className="label">نص الرسالة</label>
        <textarea name="text" rows={3} className="field" required />
      </div>
      <div>
        <label className="label">التصنيف (اختياري)</label>
        <input name="category" className="field" placeholder="تحفيز" />
      </div>
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "جارٍ الحفظ…" : "إضافة رسالة"}
      </button>
      {done && <p className="text-sm text-deep">تمت الإضافة</p>}
    </form>
  );
}

export function DeleteMessageButton({ messageId }: { messageId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await deleteMessage(messageId);
        })
      }
      className="text-xs text-muted underline decoration-dusty underline-offset-4 hover:text-deep disabled:opacity-50"
    >
      {pending ? "…" : "حذف"}
    </button>
  );
}
