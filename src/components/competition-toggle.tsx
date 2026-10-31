"use client";

import { useState, useTransition } from "react";
import { setMyCompetitionOptIn } from "@/lib/actions";

export function CompetitionToggle({ initial }: { initial: boolean }) {
  const [optIn, setOptIn] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function change(next: boolean) {
    setError(null);
    const previous = optIn;
    setOptIn(next); // optimistic
    startTransition(async () => {
      const res = await setMyCompetitionOptIn(next);
      if (!res.ok) {
        setOptIn(previous);
        setError(res.error ?? "تعذّر حفظ الإعداد");
      }
    });
  }

  return (
    <div className="card card-pad">
      <h2 className="font-display text-xl text-deep">إعداد المشاركة</h2>
      <p className="mt-1 text-sm text-muted">
        المشاركة في المنافسة — أرغب في الظهور ضمن أفضل 3
      </p>

      <label className="mt-5 flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-powder bg-white/70 px-4 py-3">
        <span className="text-sm text-ink">
          {optIn ? "المشاركة مفعّلة" : "المشاركة غير مفعّلة"}
        </span>
        <input
          type="checkbox"
          className="peer sr-only"
          checked={optIn}
          disabled={pending}
          onChange={(e) => change(e.target.checked)}
        />
        <span
          className={`relative h-6 w-11 shrink-0 rounded-full transition ${
            optIn ? "bg-deep" : "bg-dusty/50"
          } ${pending ? "opacity-50" : ""}`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
              optIn ? "right-0.5" : "right-[1.375rem]"
            }`}
          />
        </span>
      </label>

      <p className="mt-3 text-xs text-muted">
        يمكنكِ تغيير اختياركِ في أي وقت، ولن يظهر اسمكِ إلا بعد تفعيل المعلمة
        للمنافسة.
      </p>

      {error && <p className="mt-3 text-sm text-deep">{error}</p>}
    </div>
  );
}
