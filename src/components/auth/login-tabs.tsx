"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { loginTeacher } from "@/lib/actions";
import { LoginForm } from "@/components/login-form";

type Tab = "teacher" | "legacy";

const TABS: { id: Tab; label: string }[] = [
  { id: "teacher", label: "بكود المعلمة" },
  { id: "legacy", label: "اسم مستخدم قديم" },
];

/**
 * دخول المعلمات فقط.
 *
 * لا يوجد هنا أي تبويب للطالبات: مسار الطالبة مستقل تمامًا (/student/login)،
 * فلا تختلط الحسابتان ولا يرى أيٌّ منهما مدخل الآخر.
 */
export function LoginTabs() {
  const [tab, setTab] = useState<Tab>("teacher");

  return (
    <div>
      <div className="grid grid-cols-2 gap-1 rounded-full border border-powder bg-blush/50 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-2 py-2 text-xs transition sm:text-sm ${
              tab === t.id
                ? "bg-deep text-white shadow-soft"
                : "text-muted hover:text-deep"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "teacher" && <TeacherLoginForm />}
        {tab === "legacy" && <LoginForm />}
      </div>
    </div>
  );
}

function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-2xl border border-dusty/50 bg-blush px-4 py-2 text-sm text-deep">
      {message}
    </p>
  );
}

function TeacherLoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    setBusy(true);
    startTransition(async () => {
      const res = await loginTeacher(formData);
      if (!res.ok) {
        setError(res.error ?? "تعذّر تسجيل الدخول");
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
        <label className="label" htmlFor="teacher-code">
          كود المعلمة
        </label>
        <input
          id="teacher-code"
          name="code"
          dir="ltr"
          className="field text-center tracking-[0.15em]"
          placeholder="TCH-XXXXXX"
          autoComplete="username"
          required
        />
      </div>

      <div>
        <label className="label" htmlFor="teacher-password">
          كلمة المرور
        </label>
        <input
          id="teacher-password"
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
        {busy ? "جارٍ الدخول…" : "دخول المعلمة"}
      </button>
    </form>
  );
}
