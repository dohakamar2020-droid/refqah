"use client";

import { useState, useTransition } from "react";
import { setRegistrationSettings } from "@/lib/actions";

type Props = {
  enabled: boolean;
  code: string | null;
};

export function RegistrationManager({ enabled, code }: Props) {
  const [open, setOpen] = useState(enabled);
  const [requireCode, setRequireCode] = useState(Boolean(code));
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function save(rotate = false) {
    setMessage(null);
    const formData = new FormData();
    if (open) formData.set("enabled", "on");
    if (requireCode) formData.set("requireCode", "on");
    if (rotate) formData.set("rotate", "on");
    startTransition(async () => {
      const res = await setRegistrationSettings(formData);
      setMessage(res.ok ? "تم حفظ الإعدادات" : (res.error ?? "تعذّر الحفظ"));
    });
  }

  return (
    <div className="card card-pad">
      <h2 className="font-display text-2xl text-deep">التسجيل الذاتي للطالبات</h2>
      <p className="mt-1 text-sm text-muted">
        حين يكون مفتوحًا تستطيع كل طالبة إنشاء حسابها بنفسها من صفحة التسجيل،
        دون أن تضيفيها أنتِ واحدة واحدة.
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

      <label className="mt-3 flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={requireCode}
          onChange={(e) => setRequireCode(e.target.checked)}
          className="mt-1 h-4 w-4 accent-[#995C74]"
        />
        <span className="text-sm text-deep">
          اطلب كود انضمام
          <span className="mt-0.5 block text-xs text-muted">
            يمنع أي شخص من خارج الدورة من التسجيل — أعطي الكود للطالبات فقط
          </span>
        </span>
      </label>

      {code && (
        <div className="mt-4 rounded-2xl border border-dusty/40 bg-ivory px-4 py-3">
          <p className="text-xs text-muted">كود الانضمام الحالي</p>
          <p
            dir="ltr"
            className="mt-1 text-center font-display text-2xl tracking-[0.25em] text-deep"
          >
            {code}
          </p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-primary"
          disabled={pending}
          onClick={() => save(false)}
        >
          {pending ? "جارٍ الحفظ…" : "حفظ"}
        </button>
        {requireCode && (
          <button
            type="button"
            className="btn-ghost"
            disabled={pending}
            onClick={() => save(true)}
          >
            توليد كود جديد
          </button>
        )}
      </div>

      {message && <p className="mt-3 text-sm text-deep">{message}</p>}
    </div>
  );
}
