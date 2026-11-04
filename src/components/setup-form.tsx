"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setupAdmin } from "@/lib/actions";

export function SetupForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await setupAdmin(formData);
      if (res.ok) {
        setDone(true);
        setTimeout(() => {
          router.push("/admin");
          router.refresh();
        }, 1200);
      } else {
        setError(res.error ?? "تعذّر إنشاء الحساب");
      }
    });
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <div>
        <label className="label" htmlFor="name">
          اسم المعلمة
        </label>
        <input id="name" name="name" className="field" required />
      </div>

      <div>
        <label className="label" htmlFor="code">
          كود المعلمة
        </label>
        <input
          id="code"
          name="code"
          dir="ltr"
          className="field text-center tracking-[0.15em]"
          placeholder="TCH-XXXXXX"
          autoComplete="off"
          required
        />
        <p className="mt-1 text-xs text-muted">
          بهذا الكود تدخلين، وبه ينضم طالباتك إلى فصلك — احفظيه جيدًا
        </p>
      </div>

      <div>
        <label className="label" htmlFor="password">
          كلمة المرور
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          className="field"
          required
        />
        <p className="mt-1 text-xs text-muted">٨ أحرف على الأقل</p>
      </div>

      <div>
        <label className="label" htmlFor="confirmPassword">
          تأكيد كلمة المرور
        </label>
        <input
          id="confirmPassword"
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
      {done && (
        <p className="rounded-2xl border border-dusty/40 bg-powder/60 px-4 py-2 text-sm text-deep">
          تم إنشاء المساحة.. جارٍ تحويلكِ إلى لوحة المعلمة
        </p>
      )}

      <button type="submit" className="btn-primary w-full" disabled={pending || done}>
        {pending ? "جارٍ الإنشاء…" : done ? "تم ✓" : "إنشاء مساحة المعلمة"}
      </button>
    </form>
  );
}
