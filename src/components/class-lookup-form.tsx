"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ClassLookupForm() {
  const router = useRouter();
  const [code, setCode] = useState("");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const clean = code.trim().toUpperCase().replace(/\s+/g, "");
    if (!clean) return;
    router.push(`/c/${encodeURIComponent(clean)}`);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row">
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        dir="ltr"
        className="field text-center tracking-[0.15em] sm:flex-1"
        placeholder="TCH-XXXXXX"
        aria-label="كود المعلمة"
      />
      <button type="submit" className="btn-primary shrink-0">
        افتحي الفصل
      </button>
    </form>
  );
}
