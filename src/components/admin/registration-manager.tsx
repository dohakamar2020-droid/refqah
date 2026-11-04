"use client";

import { useState, useTransition } from "react";
import { setRegistrationSettings } from "@/lib/actions";

type Props = {
  enabled: boolean;
  /** كود المعلمة — هو نفسه كود الانضمام لفصلها */
  teacherCode: string;
};

export function RegistrationManager({ enabled, teacherCode }: Props) {
  const [open, setOpen] = useState(enabled);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function save() {
    setMessage(null);
    const formData = new FormData();
    if (open) formData.set("enabled", "on");
    startTransition(async () => {
      const res = await setRegistrationSettings(formData);
      setMessage(res.ok ? "تم حفظ الإعدادات" : (res.error ?? "تعذّر الحفظ"));
    });
  }

  return (
    <div className="card card-pad">
      <h2 className="font-display text-2xl text-deep">التسجيل الذاتي للطالبات</h2>
      <p className="mt-1 text-sm text-muted">
        حين يكون مفتوحًا تستطيع الطالبة إنشاء حسابها بنفسها بكودك واسمها، دون أن
        تضيفيها أنتِ واحدة واحدة.
      </p>

      <label className="mt-4 flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={open}
          onChange={(e) => setOpen(e.target.checked)}
          className="mt-1 h-4 w-4 accent-[#995C74]"
        />
        <span className="text-sm text-deep">
          مفتوح الآن
          <span className="mt-0.5 block text-xs text-muted">
            إغلاقه يخفي رابط التسجيل ولا يعطّل الحسابات الموجودة
          </span>
        </span>
      </label>

      <div className="mt-4 rounded-2xl border border-dusty/40 bg-ivory px-4 py-3">
        <p className="text-xs text-muted">كود الانضمام = كود معلمتك</p>
        <p
          dir="ltr"
          className="mt-1 text-center font-display text-2xl tracking-[0.25em] text-deep"
        >
          {teacherCode}
        </p>
        <p className="mt-1 text-center text-[11px] text-muted">
          تُعطيه لطالباتك مع أسمائهنّ، ويدخلن به
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-primary"
          disabled={pending}
          onClick={() => save()}
        >
          {pending ? "جارٍ الحفظ…" : "حفظ"}
        </button>
      </div>

      {message && <p className="mt-3 text-sm text-deep">{message}</p>}
    </div>
  );
}
