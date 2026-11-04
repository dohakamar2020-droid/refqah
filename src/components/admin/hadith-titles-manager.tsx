"use client";

import { useMemo, useState, useTransition } from "react";
import { awardHadithTitle, removeHadithTitle } from "@/lib/actions";
import { titleSuggestionsFor } from "@/lib/data/titles";
import { SmallFlower } from "@/components/floral";

export type TitleStudent = { id: string; displayName: string };
export type TitleHadith = {
  id: string;
  order: number;
  title: string;
  published: boolean;
};
export type TitleAward = {
  id: string;
  hadithId: string;
  hadithOrder: number | null;
  hadithName: string | null;
  studentId: string;
  studentName: string;
  title: string;
  description: string | null;
  /** التاريخ جاهزًا من الخادم (تنسيق عربي واحد، بلا فروق توقيت) */
  awardedAtLabel: string;
};

/**
 * ألقاب الأحاديث.
 *
 * لكل حديث لقبٌ مختلف، واللقب يُمنح لطالبة واحدة (المركز الأول). المعلمة تختار
 * الحديث، فيقترح عليها النظام مجموعة ألقاب مناسبة لموضوعه — ولكل حديث
 * اقتراحاته الخاصة — أو تكتب لقبًا من عندها.
 */
export function HadithTitlesManager({
  students,
  hadiths,
  awards,
}: {
  students: TitleStudent[];
  hadiths: TitleHadith[];
  awards: TitleAward[];
}) {
  const awardByHadith = useMemo(() => {
    const map = new Map<string, TitleAward>();
    for (const a of awards) map.set(a.hadithId, a);
    return map;
  }, [awards]);

  const [hadithId, setHadithId] = useState(hadiths[0]?.id ?? "");
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [title, setTitle] = useState(() =>
    hadiths[0] ? titleSuggestionsFor(hadiths[0].order)[0] ?? "" : ""
  );
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selected = hadiths.find((h) => h.id === hadithId);
  const existing = hadithId ? awardByHadith.get(hadithId) : undefined;
  const suggestions = selected ? titleSuggestionsFor(selected.order) : [];

  function pickHadith(nextId: string) {
    setHadithId(nextId);
    setError(null);
    setDone(null);
    setDescription("");
    const award = awardByHadith.get(nextId);
    if (award) {
      setTitle(award.title);
      setStudentId(award.studentId);
    } else {
      const h = hadiths.find((x) => x.id === nextId);
      setTitle(h ? titleSuggestionsFor(h.order)[0] ?? "" : "");
    }
  }

  function onSubmit(formData: FormData) {
    setError(null);
    setDone(null);
    startTransition(async () => {
      const res = await awardHadithTitle(formData);
      if (res.ok) {
        setDone("تم حفظ اللقب — سيظهر في مساحة الطالبة وتقريرها.");
      } else {
        setError(res.error ?? "تعذّر حفظ اللقب");
      }
    });
  }

  if (students.length === 0) {
    return (
      <p className="mt-4 text-sm text-muted">
        أضيفي الطالبات أولًا لتتمكني من منح ألقاب الأحاديث.
      </p>
    );
  }

  return (
    <div className="mt-5 space-y-6">
      <form action={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <input type="hidden" name="hadithId" value={hadithId} />

        <div>
          <label className="label" htmlFor="title-hadith">
            الحديث — لكل حديث لقبه الخاص
          </label>
          <select
            id="title-hadith"
            value={hadithId}
            onChange={(e) => pickHadith(e.target.value)}
            className="field"
          >
            {hadiths.map((h) => (
              <option key={h.id} value={h.id}>
                الحديث {h.order} — {h.title}
                {awardByHadith.has(h.id) ? " (له لقب)" : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="title-student">
            صاحبة اللقب (المركز الأول)
          </label>
          <select
            id="title-student"
            name="studentId"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className="field"
            required
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.displayName}
              </option>
            ))}
          </select>
        </div>

        {suggestions.length > 0 && (
          <div className="sm:col-span-2">
            <p className="label">ألقاب مقترحة لهذا الحديث</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {suggestions.map((s, i) => {
                const active = title.trim() === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setTitle(s)}
                    className={`rounded-full border px-3 py-1.5 text-xs transition ${
                      active
                        ? "border-deep bg-deep text-white"
                        : "border-powder bg-white/70 text-muted hover:border-dusty hover:text-deep"
                    }`}
                  >
                    {s}
                    {i === 0 && !existing && (
                      <span className="mr-1 text-[10px] opacity-80">· مقترح</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="sm:col-span-2">
          <label className="label" htmlFor="title-text">
            اللقب (يمكنك الكتابة بحرّية)
          </label>
          <input
            id="title-text"
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="field"
            placeholder="مثال: صاحبةُ النيّة الصادقة"
            maxLength={80}
            required
          />
        </div>

        <div className="sm:col-span-2">
          <label className="label" htmlFor="title-description">
            وصف مختصر (اختياري — يُكتب تلقائيًا إن تركته فارغًا)
          </label>
          <input
            id="title-description"
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="field"
          />
        </div>

        <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
          <button type="submit" className="btn-primary" disabled={pending}>
            {pending
              ? "جارٍ الحفظ…"
              : existing
                ? "تحديث اللقب"
                : "منح اللقب"}
          </button>
          {existing && (
            <span className="text-xs text-muted">
              اللقب الحالي: «{existing.title}» لـ {existing.studentName}
            </span>
          )}
          {done && <span className="text-sm text-deep">{done}</span>}
          {error && <span className="text-sm text-deep">{error}</span>}
        </div>
      </form>

      <div>
        <h3 className="font-display text-lg text-deep">الألقاب الممنوحة</h3>
        {awards.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            لم تُمنح ألقاب بعد — ابدئي من الحديث الأول.
          </p>
        ) : (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {awards.map((a) => (
              <li
                key={a.id}
                className="flex items-start justify-between gap-3 rounded-2xl border border-dusty/40 bg-gradient-to-bl from-powder/60 to-blush/40 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 font-display text-base text-deep">
                    <SmallFlower className="h-4 w-4 shrink-0 text-dusty" />
                    {a.title}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {a.studentName} · الحديث {a.hadithOrder ?? "—"}
                    {a.hadithName ? ` — ${a.hadithName}` : ""}
                  </p>
                  <p className="text-[11px] text-muted">
                    {a.awardedAtLabel}
                  </p>
                </div>
                <RemoveTitleButton hadithId={a.hadithId} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function RemoveTitleButton({ hadithId }: { hadithId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await removeHadithTitle(hadithId);
        })
      }
      className="shrink-0 text-xs text-muted underline decoration-dusty underline-offset-4 hover:text-deep disabled:opacity-50"
    >
      {pending ? "…" : "سحب"}
    </button>
  );
}
