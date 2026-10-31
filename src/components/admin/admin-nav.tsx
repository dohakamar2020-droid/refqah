"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "نظرة عامة", exact: true },
  { href: "/admin/recitations", label: "جدول التسميع" },
  { href: "/admin/students", label: "الطالبات" },
  { href: "/admin/reports", label: "التقارير" },
  { href: "/admin/hadiths", label: "الأحاديث" },
  { href: "/admin/honors", label: "التكريم والمنافسة" },
  { href: "/admin/account", label: "حسابي" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="grid-scroll -mx-4 px-4 pb-1 sm:mx-0 sm:px-0">
      <div className="flex w-max min-w-full gap-2">
        {TABS.map((t) => {
          const active = t.exact
            ? pathname === t.href
            : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm transition ${
                active
                  ? "bg-deep text-white shadow-soft"
                  : "bg-white/70 text-muted hover:bg-powder hover:text-deep"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
