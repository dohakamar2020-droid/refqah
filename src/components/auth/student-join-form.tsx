"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { joinClass } from "@/lib/actions";

export function StudentJoinForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    setBusy(true);
    startTransition(async () => {
      const res = await joinClass(formData);
      if (!res.ok) {
        setError(res.error ?? "تعذّر الانضمام");
        setBusy(false);
        return;
      }
      router.push("/student");
      router.refresh();
    });
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <div>
        <label className="label" htmlFor="j-code">
          كود المعلمة
        </label>
        <input
          id="j-code"
          name="code"
          dir="ltr"
          className="field text-center tracking-[0.15em]"
          placeholder="TCH-XXXXXX"
          required
        />
      </div>

      <div>
        <label className="label" htmlFor="j-name">
          اسمك الثلاثي
        </label>
        <input id="j-name" name="name" className="field" required />
        <p className="mt-1 text-xs text-muted">
          بنفس الاسم اللي زوّدتك بيه معلمتك
        </p>
      </div>

      <div>
        <label className="label" htmlFor="j-password">
          كلمة المرور
        </label>
        <input
          id="j-password"
          name="password"
          type="password"
          autoComplete="new-password"
          className="field"
          required
        />
        <p className="mt-1 text-xs text-muted">٨ أحرف على الأقل</p>
      </div>

      <div>
        <label className="label" htmlFor="j-confirm">
          تأكيد كلمة المرور
        </label>
        <input
          id="j-confirm"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          className="field"
          required
        />
      </div>

      {error && (
        <p className="rounded-2xl border border-dusty/50 bg-blush px-4 py-2 text-sm text-deep">
          {error}
        </p>
      )}

      <button type="submit" className="btn-primary w-full" disabled={busy}>
        {busy ? "جارٍ الانضمام…" : "انضمي إلى الفصل"}
      </button>
    </form>
  );
}
