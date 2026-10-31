"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function LoginForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    const value = identifier.trim();
    const looksLikeEmail = value.includes("@");

    try {
      const res = looksLikeEmail
        ? await authClient.signIn.email({ email: value, password })
        : await authClient.signIn.username({ username: value, password });

      if (res?.error) {
        setError("اسم المستخدم أو كلمة المرور غير صحيحة");
        setBusy(false);
        return;
      }

      // Ask the server where this account belongs.
      const session = await authClient.getSession();
      const role = (session?.data?.user as { role?: string } | undefined)?.role;

      router.push(role === "admin" ? "/admin" : "/me");
      router.refresh();
    } catch {
      setError("تعذّر تسجيل الدخول، حاولي مرة أخرى");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="label" htmlFor="identifier">
          اسم المستخدم أو البريد الإلكتروني
        </label>
        <input
          id="identifier"
          name="identifier"
          type="text"
          autoComplete="username"
          dir="ltr"
          className="field"
          placeholder="username أو name@example.com"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
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
          autoComplete="current-password"
          className="field"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      {error && (
        <p className="rounded-2xl border border-dusty/50 bg-blush px-4 py-2 text-sm text-deep">
          {error}
        </p>
      )}

      <button type="submit" className="btn-primary w-full" disabled={busy}>
        {busy ? "جارٍ الدخول…" : "دخول"}
      </button>
    </form>
  );
}
