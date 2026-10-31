"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { authClient } from "@/lib/auth-client";

export function LogoutButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    await authClient.signOut();
    setBusy(false);
    startTransition(() => {
      router.push("/");
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={busy || pending}
      className={
        className ||
        "text-sm text-muted hover:text-deep transition disabled:opacity-50"
      }
    >
      {busy || pending ? "جارٍ الخروج…" : "تسجيل الخروج"}
    </button>
  );
}
