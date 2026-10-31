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
        // Give the server a moment, then send the teacher to the login page.
        setTimeout(() => {
          router.push("/login");
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
        <label className="label" htmlFor="username">
          اسم المستخدم
        </label>
        <input
          id="username"
          name="username"
          dir="ltr"
          className="field"
          placeholder="admin"
          required
        />
        <p className="mt-1 text-xs text-muted">٣ أحرف على الأقل</p>
      </div>

      <div>
        <label className="label" htmlFor="email">
          البريد الإلكتروني (اختياري)
        </label>
        <input
          id="email"
          name="email"
          type="email"
          dir="ltr"
          className="field"
          placeholder="name@example.com"
        />
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
        <p className="mt-1 text-xs text-muted">
          ٨ أحرف على الأقل — سيُطلب منكِ استخدامها عند كل دخول
        </p>
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
          تم إنشاء الحساب.. جارٍ تحويلكِ إلى صفحة الدخول
        </p>
      )}

      <button type="submit" className="btn-primary w-full" disabled={pending || done}>
        {pending ? "جارٍ الإنشاء…" : done ? "تم ✓" : "إنشاء حساب المعلمة"}
      </button>
    </form>
  );
}
