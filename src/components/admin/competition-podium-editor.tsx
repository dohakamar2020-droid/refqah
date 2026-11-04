"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  setCompetitionRanks,
  clearCompetitionRanks,
} from "@/lib/actions";
import { SmallFlower } from "@/components/floral";

export type RankStudent = {
  id: string;
  displayName: string;
  /** عدد الأحاديث المعتمدة — يظهر بجانب الاسم لمساعدة المعلمة في الاختيار */
  count: number;
  competitionOptIn: boolean;
};

const RANKS: { rank: number; label: string; hint: string }[] = [
  { rank: 1, label: "المركز الأول", hint: "🥇" },
  { rank: 2, label: "المركز الثاني", hint: "🥈" },
  { rank: 3, label: "المركز الثالث", hint: "🥉" },
];

/**
 * ترتيب المنافسة بيد المعلمة.
 *
 * هي التي تحدّد مَن الأولى ومَن الثانية ومَن الثالثة، وتظهر اللوحة (§«أفضل ثلاث
 * مشاركات») بترتيبها هي. مَن تُترك خانتها فارغة يحدّد النظام مركزها تلقائيًا
 * حسب عدد الأحاديث المعتمدة.
 */
export function CompetitionPodiumEditor({
  students,
  initialRanks,
}: {
  students: RankStudent[];
  /** rank → studentId */
  initialRanks: Record<string, string>;
}) {
  const router = useRouter();
  const [picks, setPicks] = useState<Record<string, string>>(() => ({
    "1": initialRanks["1"] ?? "",
    "2": initialRanks["2"] ?? "",
    "3": initialRanks["3"] ?? "",
  }));
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const optedIn = students.filter((s) => s.competitionOptIn);

  function choose(rank: number, studentId: string) {
    setError(null);
    setMessage(null);
    // A girl can hold only one rank: picking her here frees her other rank.
    setPicks((prev) => {
      const next: Record<string, string> = { ...prev };
      for (const key of Object.keys(next)) {
        if (key !== String(rank) && next[key] === studentId) next[key] = "";
      }
      next[String(rank)] = studentId;
      return next;
    });
  }

  function onSave() {
    setError(null);
    setMessage(null);
    const formData = new FormData();
    for (const r of RANKS) formData.set(`rank${r.rank}`, picks[String(r.rank)] ?? "");
    startTransition(async () => {
      const res = await setCompetitionRanks(formData);
      if (res.ok) {
        setMessage("تم حفظ المراكز — تظهر اللوحة بهذا الترتيب");
        router.refresh();
      } else {
        setError(res.error ?? "تعذّر حفظ المراكز");
      }
    });
  }

  function onClear() {
    setError(null);
    setMessage(null);
    setPicks({ "1": "", "2": "", "3": "" });
    startTransition(async () => {
      const res = await clearCompetitionRanks();
      if (res.ok) {
        setMessage("أُلغي الترتيب اليدوي — يعود الترتيب تلقائيًا حسب عدد الأحاديث");
        router.refresh();
      } else {
        setError(res.error ?? "تعذّر إلغاء الترتيب");
      }
    });
  }

  if (optedIn.length === 0) {
    return (
      <div className="mt-4 rounded-2xl border border-dashed border-dusty/60 bg-white/60 px-4 py-5 text-sm text-muted">
        لا توجد طالبة موافقة على المنافسة بعد. تظهر هنا الطالبات الموافقات على
        المشاركة من حساباتهنّ (أو الموافقات المسجّلة من صفحة الطالبات).
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-powder bg-white/70 p-4">
      <div className="flex items-center gap-2">
        <SmallFlower className="h-4 w-4 text-dusty" />
        <p className="text-sm font-medium text-deep">
          تحديد المراكز بنفسكِ (الأول والثاني والثالث)
        </p>
      </div>
      <p className="mt-1 text-xs text-muted">
        المراكز التي تختارينها هنا تظهر في لوحة «أفضل ثلاث مشاركات» بترتيبكِ أنتِ.
        اتركي أي مركز فارغًا ليحدّده النظام تلقائيًا حسب عدد الأحاديث.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {RANKS.map((r) => {
          const current = picks[String(r.rank)] ?? "";
          return (
            <div key={r.rank}>
              <label className="label" htmlFor={`rank-${r.rank}`}>
                {r.hint} {r.label}
              </label>
              <select
                id={`rank-${r.rank}`}
                value={current}
                onChange={(e) => choose(r.rank, e.target.value)}
                className="field"
              >
                <option value="">— يحدّده النظام تلقائيًا —</option>
                {optedIn.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.displayName} — {s.count} حديثًا
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" onClick={onSave} disabled={pending} className="btn-primary !px-4 !py-2 text-xs">
          {pending ? "جارٍ الحفظ…" : "حفظ المراكز"}
        </button>
        <button type="button" onClick={onClear} disabled={pending} className="btn-ghost !px-4 !py-2 text-xs">
          إلغاء الترتيب اليدوي
        </button>
        {message && <span className="text-xs text-deep">{message}</span>}
        {error && <span className="text-xs text-deep">{error}</span>}
      </div>
    </div>
  );
}
