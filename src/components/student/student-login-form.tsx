"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
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

function Notice({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="status"
      className="rounded-2xl border border-dusty/40 bg-ivory px-4 py-3 text-sm leading-relaxed text-deep"
    >
      {message}
    </p>
  );
}

/**
 * دخول الطالبات — بكودها الخاص أو بكود معلمتها.
 * لا يوجد هنا أي شيء يخص المعلمة أو لوحتها.
 *
 * الحقول (الكود، الاسم، كلمة المرور) محفوظة في الحالة، فإذا تبيّن أن الطالبة
 * غير مسجّلة بعد في فصل مفتوح للتسجيل الذاتي ننتقل إلى «أول مرة» دون أن
 * تعيد كتابة شيء — ويبقى عليها تأكيد كلمة المرور فقط.
 */
type Mode = "login" | "join";

export function StudentLoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();
  const confirmRef = useRef<HTMLInputElement>(null);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setNotice(null);
    setConfirm("");
  }

  function onSubmit() {
    setError(null);
    setNotice(null);
    setBusy(true);

    const formData = new FormData();
    formData.set("code", code);
    formData.set("name", name);
    formData.set("password", password);
    if (mode === "join") formData.set("confirmPassword", confirm);

    startTransition(async () => {
      const res =
        mode === "join" ? await joinClass(formData) : await loginStudent(formData);

      if (!res.ok) {
        setBusy(false);
        if (res.needsJoin) {
          // Right class code, not registered yet, registration is open.
          setMode("join");
          setConfirm("");
          setNotice(res.error ?? null);
          setTimeout(() => confirmRef.current?.focus(), 0);
          return;
        }
        setError(res.error ?? "تعذّر تسجيل الدخول");
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
          onClick={() => switchMode("login")}
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
          onClick={() => switchMode("join")}
          className={`rounded-full px-2 py-2 text-xs transition sm:text-sm ${
            mode === "join"
              ? "bg-deep text-white shadow-soft"
              : "text-muted hover:text-deep"
          }`}
        >
          أول مرة
        </button>
      </div>

      {mode === "join" && !notice && (
        <p className="mt-4 rounded-2xl border border-dusty/40 bg-ivory px-4 py-3 text-xs leading-relaxed text-muted">
          للتسجيل لأول مرة: اكتبي كود معلمتك واسمك وكلمة مرور تختارينها. لا يعمل
          هذا إلا إذا كانت معلمتك قد فتحت التسجيل الذاتي في فصلها.
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="mt-4 space-y-4"
      >
        <Notice message={notice} />

        <div>
          <label className="label" htmlFor="student-code">
            {mode === "join" ? "كود المعلمة" : "كودك الخاص أو كود الفصل"}
          </label>
          <input
            id="student-code"
            name="code"
            dir="ltr"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="field text-center tracking-[0.15em]"
            placeholder={mode === "join" ? "كود معلمتك" : "STU-XXXXXX"}
            autoComplete="username"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            required
          />
          <p className="mt-1 text-xs text-muted">
            {mode === "join"
              ? "كود معلمتك — هو نفسه كود الفصل الذي تعطيه لطالباتها"
              : "الكود الذي أعطته لكِ معلمتك — الشخصي (STU-…) أو كود الفصل"}
          </p>
        </div>

        <div>
          <label className="label" htmlFor="student-name">
            {mode === "join" ? "اسمك" : "اسمك المسجّل"}
          </label>
          <input
            id="student-name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="field"
            autoComplete="name"
            required
          />
          <p className="mt-1 text-xs text-muted">
            {mode === "join"
              ? "اكتبي اسمك كما تحبّين أن يظهر لمعلمتك"
              : "يكفي اسمك الأول، أو اكتبيه كاملًا كما سجّلته معلمتك"}
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
              ref={confirmRef}
              name="confirmPassword"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              className="field"
              required
            />
          </div>
        )}

        {mode === "join" ? <JoinError message={error} /> : <ErrorNote message={error} />}

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

/** Join errors already say what is wrong; no login checklist under them. */
function JoinError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-2xl border border-dusty/50 bg-blush px-4 py-3 text-sm text-deep">
      {message}
    </p>
  );
}
