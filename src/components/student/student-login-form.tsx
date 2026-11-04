"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { loginStudent } from "@/lib/actions";

function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-2xl border border-dusty/50 bg-blush px-4 py-2 text-sm text-deep">
      {message}
    </p>
  );
}

/**
 * دخول الطالبات — بكودها الخاص فقط.
 * لا يوجد هنا أي شيء يخص المعلمة أو لوحتها.
 */
export function StudentLoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    setBusy(true);
    startTransition(async () => {
      const res = await loginStudent(formData);
      if (!res.ok) {
        setError(res.error ?? "تعذّر تسجيل الدخول");
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
        <label className="label" htmlFor="student-code">
          كودك الخاص
        </label>
        <input
          id="student-code"
          name="code"
          dir="ltr"
          className="field text-center tracking-[0.15em]"
          placeholder="STU-XXXXXX"
          autoComplete="username"
          required
        />
        <p className="mt-1 text-xs text-muted">
          الكود الذي أعطته لكِ معلمتكِ عند إضافتك للفصل
        </p>
      </div>

      <div>
        <label className="label" htmlFor="student-name">
          اسمك المسجّل
        </label>
        <input id="student-name" name="name" className="field" required />
      </div>

      <div>
        <label className="label" htmlFor="student-password">
          كلمة المرور
        </label>
        <input
          id="student-password"
          name="password"
          type="password"
          autoComplete="current-password"
          className="field"
          placeholder="••••••••"
          required
        />
      </div>

      <ErrorNote message={error} />

      <button type="submit" className="btn-primary w-full" disabled={busy}>
        {busy ? "جارٍ الدخول…" : "دخول"}
      </button>
    </form>
  );
}
