"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { joinClass, loginStudent } from "@/lib/actions";

function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="rounded-2xl border border-dusty/50 bg-blush px-4 py-3 text-sm text-deep">
      <p>{message}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        تأكدي من: الكود كما أعطته لكِ معلمتك (بالحروف الإنجليزية) — الاسم كما
        سجّلته (الاسم الأول يكفي) — وكلمة المرور التي أعطتها لكِ.
      </p>
    </div>
  );
}

/**
 * دخول الطالبات — بكودها الخاص فقط.
 * لا يوجد هنا أي شيء يخص المعلمة أو لوحتها.
 */
type Mode = "login" | "join";

export function StudentLoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    setBusy(true);
    startTransition(async () => {
      const res =
        mode === "join" ? await joinClass(formData) : await loginStudent(formData);
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
    <div>
      {/* حالتان: لديّ حساب بالفعل / أول مرة — لا تُخلطان */}
      <div className="grid grid-cols-2 gap-1 rounded-full border border-powder bg-blush/50 p-1">
        <button
          type="button"
          onClick={() => {
            setMode("login");
            setError(null);
          }}
          className={`rounded-full px-2 py-2 text-xs transition sm:text-sm ${
            mode === "login"
              ? "bg-deep text-white shadow-soft"
              : "text-muted hover:text-deep"
          }`}
        >
          لديّ حساب
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("join");
            setError(null);
          }}
          className={`rounded-full px-2 py-2 text-xs transition sm:text-sm ${
            mode === "join"
              ? "bg-deep text-white shadow-soft"
              : "text-muted hover:text-deep"
          }`}
        >
          أول مرة
        </button>
      </div>

      {mode === "join" && (
        <p className="mt-4 rounded-2xl border border-dusty/40 bg-ivory px-4 py-3 text-xs leading-relaxed text-muted">
          للتسجيل لأول مرة: اكتبي كود معلمتك
          <span dir="ltr"> (TCH-…)</span> واسمك وكلمة مرور تختارينها. لا يعمل هذا
          إلا إذا كانت معلمتك قد فتحت التسجيل الذاتي في فصلها.
        </p>
      )}

      <form action={onSubmit} className="mt-4 space-y-4">
      <div>
        <label className="label" htmlFor="student-code">
          {mode === "join" ? "كود المعلمة" : "كودك الخاص أو كود الفصل"}
        </label>
        <input
          id="student-code"
          name="code"
          dir="ltr"
          className="field text-center tracking-[0.15em]"
          placeholder={mode === "join" ? "TCH-XXXXXX" : "STU-XXXXXX"}
          autoComplete="username"
          required
        />
        <p className="mt-1 text-xs text-muted">
          {mode === "join"
            ? "كود معلمتك — هو نفسه كود الفصل الذي تعطيه لطالباتها"
            : "الكود الذي أعطته لكِ معلمتك — الشخصي (STU-…) أو كود الفصل (TCH-…)"}
        </p>
      </div>

      <div>
        <label className="label" htmlFor="student-name">
          اسمك المسجّل
        </label>
        <input
          id="student-name"
          name="name"
          className="field"
          autoComplete="name"
          required
        />
        <p className="mt-1 text-xs text-muted">
          يكفي اسمك الأول، أو اكتبيه كاملًا كما سجّلته معلمتك
        </p>
      </div>

      <div>
        <label className="label" htmlFor="student-password">
          كلمة المرور
        </label>
        <input
          id="student-password"
          name="password"
          type="password"
          autoComplete={mode === "join" ? "new-password" : "current-password"}
          className="field"
          placeholder="••••••••"
          required
        />
        {mode === "join" && (
          <p className="mt-1 text-xs text-muted">8 أحرف على الأقل</p>
        )}
      </div>

      {mode === "join" && (
        <div>
          <label className="label" htmlFor="student-confirm">
            تأكيد كلمة المرور
          </label>
          <input
            id="student-confirm"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            className="field"
            required
          />
        </div>
      )}

      <ErrorNote message={error} />

      <button type="submit" className="btn-primary w-full" disabled={busy}>
        {busy
          ? mode === "join"
            ? "جارٍ التسجيل…"
            : "جارٍ الدخول…"
          : mode === "join"
            ? "سجّلي وانضمي للفصل"
            : "دخول"}
      </button>
      </form>
    </div>
  );
}
