import { SmallFlower } from "@/components/floral";

export function GridLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
      <span className="inline-flex items-center gap-1.5">
        <CheckIcon className="h-4 w-4 text-deep" />
        <span className="font-medium text-deep">سمّعت</span>
      </span>
      <span className="inline-flex items-center gap-1.5">
        <DashIcon className="h-4 w-4 text-dusty" />
        مسمّعتش
      </span>
      <span className="inline-flex items-center gap-1.5">
        <LockIcon className="h-4 w-4 text-dusty/70" />
        لم يُنشر بعد
      </span>
    </div>
  );
}

export function CheckIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M4.5 12.5l5 5 10-10"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DashIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M6 12h12"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function LockIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect
        x="5"
        y="10"
        width="14"
        height="10"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function GridHint({ isAdmin }: { isAdmin: boolean }) {
  return (
    <p className="mt-4 flex items-start gap-2 text-xs text-muted">
      <SmallFlower className="mt-0.5 h-4 w-4 shrink-0 text-dusty" />
      <span>
        {isAdmin
          ? "اضغطي على أي خانة لتغيير حالة التسميع، ويُحفظ التعديل مباشرة. الخانات المغلقة لم تُنشر بعد."
          : "هذا جدولكِ الخاص: الخانات المغلقة أحاديث لم تُنشر بعد، ولا يمكنكِ تعديل الحالات."}
      </span>
    </p>
  );
}
