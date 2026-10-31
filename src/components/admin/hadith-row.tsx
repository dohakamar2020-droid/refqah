"use client";

import { useState, useTransition } from "react";
import { setHadithPublished, updateHadith, deleteHadith } from "@/lib/actions";

export type HadithItem = {
  id: string;
  order: number;
  title: string;
  narrator: string | null;
  arabicText: string;
  takhrij: string | null;
  published: boolean;
};

export function HadithRow({ hadith }: { hadith: HadithItem }) {
  const [published, setPublished] = useState(hadith.published);
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function togglePublish(next: boolean) {
    setError(null);
    const previous = published;
    setPublished(next);
    startTransition(async () => {
      const res = await setHadithPublished(hadith.id, next);
      if (!res.ok) {
        setPublished(previous);
        setError(res.error ?? "تعذّر تحديث حالة النشر");
      }
    });
  }

  function onSave(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await updateHadith(formData);
      if (res.ok) setEditing(false);
      else setError(res.error ?? "تعذّر حفظ التعديل");
    });
  }

  function onDelete() {
    setError(null);
    startTransition(async () => {
      const res = await deleteHadith(hadith.id);
      if (!res.ok) setError(res.error ?? "تعذّر حذف الحديث");
      setConfirming(false);
    });
  }

  return (
    <li className="rounded-card border border-powder bg-white/70 p-4">
      <div className="flex items-start gap-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-powder font-display text-deep nums">
          {hadith.order}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium text-deep">{hadith.title}</h3>
            <span
              className={`chip ${
                published ? "bg-dusty/40 text-deep" : "bg-blush text-muted"
              }`}
            >
              {published ? "منشور" : "لم يُنشر"}
            </span>
          </div>
          {hadith.narrator && (
            <p className="mt-2 text-sm leading-relaxed text-deep">{hadith.narrator}</p>
          )}
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted">
            {hadith.arabicText}
          </p>
          {hadith.takhrij && (
            <p className="mt-1 whitespace-pre-line text-xs text-muted">
              {hadith.takhrij}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <Toggle checked={published} onChange={togglePublish} disabled={pending} />
          <span className="text-[11px] text-muted">نشر</span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="btn-ghost !px-4 !py-2 text-xs"
        >
          {editing ? "إغلاق" : "تعديل النص"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming((v) => !v)}
          className="btn-danger"
        >
          حذف
        </button>
      </div>

      {confirming && (
        <div className="mt-3 rounded-2xl border border-dusty/50 bg-blush p-4 text-sm">
          <p className="text-deep">
            حذف «{hadith.title}» يزيله من الجدول مع كل حالات تسميعه.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={onDelete}
              disabled={pending}
              className="btn-primary !px-4 !py-2 text-xs"
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
        <form action={onSave} className="mt-4 space-y-4">
          <input type="hidden" name="hadithId" value={hadith.id} />
          <div>
            <label className="label">عنوان الحديث</label>
            <input name="title" defaultValue={hadith.title} className="field" required />
          </div>
          <div>
            <label className="label">الراوي</label>
            <input
              name="narrator"
              defaultValue={hadith.narrator ?? ""}
              className="field leading-loose"
            />
          </div>
          <div>
            <label className="label">النص</label>
            <textarea
              name="arabicText"
              defaultValue={hadith.arabicText}
              rows={6}
              className="field leading-loose"
              required
            />
          </div>
          <div>
            <label className="label">التخريج</label>
            <input
              name="takhrij"
              defaultValue={hadith.takhrij ?? ""}
              className="field leading-loose"
            />
          </div>
          <button type="submit" className="btn-primary" disabled={pending}>
            {pending ? "جارٍ الحفظ…" : "حفظ"}
          </button>
        </form>
      )}

      {error && <p className="mt-3 text-sm text-deep">{error}</p>}
    </li>
  );
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={checked ? "إيقاف النشر" : "نشر الحديث"}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-50 ${
        checked ? "bg-deep" : "bg-dusty/50"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
          checked ? "right-0.5" : "right-[1.375rem]"
        }`}
      />
    </button>
  );
}
