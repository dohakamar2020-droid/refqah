"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { registerTeacher } from "@/lib/actions";

export function TeacherRegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    setBusy(true);
    startTransition(async () => {
      const res = await registerTeacher(formData);
      if (!res.ok) {
        setError(res.error ?? "تعذّر إنشاء الحساب");
        setBusy(false);
        return;
      }
      router.push("/admin");
      router.refresh();
    });
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <div>
        <label className="label" htmlFor="t-name">
          اسمك
        </label>
        <input id="t-name" name="name" className="field" required />
        <p className="mt-1 text-xs text-muted">
          يظهر لطالباتك فقط، ولا يظهر للزوار
        </p>
      </div>

      <div>
        <label className="label" htmlFor="t-code">
          كود المعلمة
        </label>
        <input
          id="t-code"
          name="code"
          dir="ltr"
          className="field text-center tracking-[0.15em]"
          placeholder="TCH-XXXXXX"
          autoComplete="off"
          required
        />
        <p className="mt-1 text-xs text-muted">
          هو مفتاح مساحتك: تُعطيه لطالباتك ليدخلن، وتدخلين به أنتِ. اختاري كودًا
          سهل التلقين ولا تشاركيه مع أحد خارج الفصل.
        </p>
      </div>

      <div>
        <label className="label" htmlFor="t-password">
          كلمة المرور
        </label>
        <input
          id="t-password"
          name="password"
          type="password"
          autoComplete="new-password"
          className="field"
          required
        />
        <p className="mt-1 text-xs text-muted">٨ أحرف على الأقل</p>
      </div>

      <div>
        <label className="label" htmlFor="t-confirm">
          تأكيد كلمة المرور
        </label>
        <input
          id="t-confirm"
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
        {busy ? "جارٍ إنشاء المساحة…" : "إنشاء مساحتي"}
      </button>
    </form>
  );
}
