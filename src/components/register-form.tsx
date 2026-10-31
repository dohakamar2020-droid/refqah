"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { registerStudent } from "@/lib/actions";
import { authClient } from "@/lib/auth-client";

export function RegisterForm({ requireCode }: { requireCode: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    const formData = new FormData(e.currentTarget);
    const username = String(formData.get("username") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    const res = await registerStudent(formData);
    if (!res.ok) {
      setError(res.error ?? "تعذّر إنشاء الحساب");
      setBusy(false);
      return;
    }

    // Sign her straight in with the credentials she just chose.
    const signIn = await authClient.signIn.username({ username, password });
    if (signIn?.error) {
      // Account exists — she can simply log in.
      startTransition(() => {
        router.push("/login");
        router.refresh();
      });
      return;
    }

    startTransition(() => {
      router.push("/me");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="label" htmlFor="name">
          اسمكِ الثلاثي
        </label>
        <input id="name" name="name" className="field" required />
        <p className="mt-1 text-xs text-muted">
          سيظهر بهذا الاسم أمام المعلمة فقط
        </p>
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
          placeholder="maryam"
          required
        />
        <p className="mt-1 text-xs text-muted">
          ٣ أحرف على الأقل بالإنجليزية أو الأرقام — تستخدمينه مع كلمة المرور عند
          الدخول
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

      <div>
        <label className="label" htmlFor="phone">
          رقم الواتساب (اختياري)
        </label>
        <input
          id="phone"
          name="phone"
          dir="ltr"
          className="field"
          placeholder="201012345678"
        />
      </div>

      {requireCode && (
        <div>
          <label className="label" htmlFor="code">
            كود الانضمام
          </label>
          <input
            id="code"
            name="code"
            dir="ltr"
            className="field"
            placeholder="RQ-XXXXXX"
            required
          />
          <p className="mt-1 text-xs text-muted">
            الكود عند المعلمة — يمنع دخول أي شخص من خارج الدورة
          </p>
        </div>
      )}

      {error && (
        <p className="rounded-2xl border border-dusty/50 bg-blush px-4 py-2 text-sm text-deep">
          {error}
        </p>
      )}

      <button type="submit" className="btn-primary w-full" disabled={busy}>
        {busy ? "جارٍ إنشاء الحساب…" : "إنشاء حسابي"}
      </button>
    </form>
  );
}
