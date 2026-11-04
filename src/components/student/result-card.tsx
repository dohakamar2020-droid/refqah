"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveRecitationNote } from "@/lib/actions";
import { CheckIcon, DashIcon } from "@/components/grid-legend";
import { SmallFlower } from "@/components/floral";
import { formatDateTime } from "@/lib/format";

export type StudentResultCard = {
  id: string;
  order: number;
  title: string;
  narrator: string | null;
  arabicText: string;
  takhrij: string | null;
  recited: boolean;
  recitedAt: string | null;
  note: { mistakes: string; body: string; updatedAt: string } | null;
};

/**
 * One published hadith: its text, the teacher's result for it, and the student's
 * own record of the correction she received on WhatsApp.
 *
 * The correction is written by the student for herself: nothing here is visible
 * to the teacher, and nothing about the teacher is visible here.
 */
export function ResultCard({ hadith }: { hadith: StudentResultCard }) {
  const [editing, setEditing] = useState(false);
  const [openText, setOpenText] = useState(false);
  const [mistakes, setMistakes] = useState(hadith.note?.mistakes ?? "");
  const [body, setBody] = useState(hadith.note?.body ?? "");
  const [saved, setSaved] = useState<"idle" | "ok" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const hasNote = Boolean(mistakes.trim() || body.trim());
  const mistakeLines = mistakes
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  function onSave() {
    setError(null);
    setSaved("idle");
    const formData = new FormData();
    formData.set("hadithId", hadith.id);
    formData.set("mistakes", mistakes);
    formData.set("body", body);

    startTransition(async () => {
      const res = await saveRecitationNote(formData);
      if (res.ok) {
        setSaved("ok");
        setEditing(false);
        // Refresh so the server-side timestamp and counters follow the save.
        router.refresh();
      } else {
        setSaved("error");
        setError(res.error ?? "تعذّر حفظ النتيجة");
      }
    });
  }

  return (
    <article className="card card-pad">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-powder font-display text-deep nums">
            {hadith.order}
          </span>
          <div>
            <h3 className="font-display text-lg leading-tight text-deep">
              {hadith.title}
            </h3>
            {hadith.narrator && (
              <p className="mt-1 line-clamp-1 text-xs text-muted">
                {hadith.narrator}
              </p>
            )}
          </div>
        </div>

        {/* نتيجة التسميع */}
        <span
          className={`chip inline-flex items-center gap-1.5 ${
            hadith.recited
              ? "bg-dusty/25 text-deep"
              : "bg-blush text-muted"
          }`}
        >
          {hadith.recited ? (
            <CheckIcon className="h-3.5 w-3.5" />
          ) : (
            <DashIcon className="h-3.5 w-3.5" />
          )}
          {hadith.recited ? "سمّعت" : "لم تُعتمد بعد"}
        </span>
      </div>

      {hadith.recited && hadith.recitedAt && (
        <p className="mt-2 text-[11px] text-muted">
          اعتُمدت في {formatDateTime(hadith.recitedAt)}
        </p>
      )}

      {/* نص الحديث */}
      <div className="mt-3">
        <button
          type="button"
          onClick={() => setOpenText((v) => !v)}
          className="text-xs text-deep underline decoration-dusty underline-offset-4"
        >
          {openText ? "إخفاء نص الحديث" : "عرض نص الحديث"}
        </button>
        {openText && (
          <div className="mt-3 rounded-2xl border border-powder bg-white/60 p-4">
            {hadith.narrator && (
              <p className="font-display leading-loose text-deep">
                {hadith.narrator}
              </p>
            )}
            <p className="mt-2 whitespace-pre-line leading-loose text-ink">
              {hadith.arabicText}
            </p>
            {hadith.takhrij && (
              <p className="mt-2 text-xs text-muted">{hadith.takhrij}</p>
            )}
          </div>
        )}
      </div>

      {/* نتيجة التسميع التي كتبتها الطالبة */}
      <div className="mt-4 rounded-2xl border border-dusty/40 bg-blush/40 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-xs font-medium text-deep">
            <SmallFlower className="h-4 w-4 text-dusty" />
            تصحيح معلمتي — نتيجتي في هذا الحديث
          </p>
          {!editing && (
            <button
              type="button"
              onClick={() => {
                setEditing(true);
                setSaved("idle");
              }}
              className="text-xs text-deep underline decoration-dusty underline-offset-4"
            >
              {hasNote ? "تعديل" : "سجّلي التصحيح"}
            </button>
          )}
        </div>

        {!editing && !hasNote && (
          <p className="mt-2 text-xs leading-relaxed text-muted">
            وصلكِ تصحيح التسميع من معلمتكِ على واتساب؟ سجّليه هنا: مواضع الأخطاء
            وملاحظاتها، لتعودي إليها عند المراجعة.
          </p>
        )}

        {!editing && hasNote && (
          <div className="mt-3 space-y-3">
            {mistakeLines.length > 0 && (
              <div>
                <p className="text-[11px] text-muted">مواضع أخطائي</p>
                <ul className="mt-1 space-y-1">
                  {mistakeLines.map((line, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm leading-relaxed text-deep"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-dusty" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {body.trim() && (
              <div>
                <p className="text-[11px] text-muted">ملاحظات معلمتي</p>
                <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink">
                  {body}
                </p>
              </div>
            )}
            {hadith.note?.updatedAt && (
              <p className="text-[10px] text-muted">
                آخر تحديث: {formatDateTime(hadith.note.updatedAt)}
              </p>
            )}
          </div>
        )}

        {editing && (
          <div className="mt-3 space-y-3">
            <div>
              <label className="label" htmlFor={`m-${hadith.id}`}>
                مواضع الأخطاء (سطر لكل خطأ)
              </label>
              <textarea
                id={`m-${hadith.id}`}
                value={mistakes}
                onChange={(e) => setMistakes(e.target.value)}
                rows={3}
                className="field leading-loose"
                placeholder={"مثال:\nنسيت الصيام في «صيام رمضان»\nقلبت «أنزلناه» بـ «أنزلنه»"}
              />
            </div>
            <div>
              <label className="label" htmlFor={`b-${hadith.id}`}>
                ملاحظات المعلمة / ما أركّز عليه
              </label>
              <textarea
                id={`b-${hadith.id}`}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={3}
                className="field leading-loose"
                placeholder="مثال: أرجّع التسميع تاني الأسبوع الجاي وأركّز على الأحاديث ٣ و٤"
              />
            </div>

            {error && (
              <p className="rounded-2xl border border-dusty/50 bg-white px-3 py-2 text-xs text-deep">
                {error}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onSave}
                disabled={pending}
                className="btn-primary !px-4 !py-2 text-xs"
              >
                {pending ? "جارٍ الحفظ…" : "حفظ النتيجة"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setMistakes(hadith.note?.mistakes ?? "");
                  setBody(hadith.note?.body ?? "");
                  setError(null);
                }}
                className="btn-ghost !px-4 !py-2 text-xs"
              >
                تراجع
              </button>
            </div>
          </div>
        )}

        {saved === "ok" && !editing && (
          <p className="mt-2 text-[11px] text-deep">تم حفظ نتيجتك ✓</p>
        )}
      </div>
    </article>
  );
}
