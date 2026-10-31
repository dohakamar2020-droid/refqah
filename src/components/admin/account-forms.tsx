"use client";

import { useState, useTransition } from "react";
import { changeMyPassword, updateMyProfile } from "@/lib/actions";

export function ChangePasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    setDone(false);
    startTransition(async () => {
      const res = await changeMyPassword(formData);
      if (res.ok) {
        setDone(true);
        (document.getElementById("password-form") as HTMLFormElement | null)?.reset();
      } else {
        setError(res.error ?? "تعذّر تغيير كلمة المرور");
      }
    });
  }

  return (
    <form id="password-form" action={onSubmit} className="space-y-4">
      <div>
        <label className="label" htmlFor="currentPassword">
          كلمة المرور الحالية
        </label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          className="field"
          required
        />
      </div>

      <div>
        <label className="label" htmlFor="newPassword">
          كلمة المرور الجديدة
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          className="field"
          required
        />
        <p className="mt-1 text-xs text-muted">٨ أحرف على الأقل</p>
      </div>

      <div>
        <label className="label" htmlFor="confirmPassword">
          تأكيد كلمة المرور الجديدة
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
          تم تغيير كلمة المرور بنجاح
        </p>
      )}

      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "جارٍ الحفظ…" : "تغيير كلمة المرور"}
      </button>
    </form>
  );
}

export function UpdateProfileForm({ name }: { name: string }) {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    setDone(false);
    startTransition(async () => {
      const res = await updateMyProfile(formData);
      if (res.ok) setDone(true);
      else setError(res.error ?? "تعذّر حفظ الاسم");
    });
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <div>
        <label className="label" htmlFor="profileName">
          الاسم الظاهر
        </label>
        <input
          id="profileName"
          name="name"
          defaultValue={name}
          className="field"
          required
        />
      </div>

      {error && <p className="text-sm text-deep">{error}</p>}
      {done && (
        <p className="rounded-2xl border border-dusty/40 bg-powder/60 px-4 py-2 text-sm text-deep">
          تم حفظ الاسم
        </p>
      )}

      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "جارٍ الحفظ…" : "حفظ"}
      </button>
    </form>
  );
}
