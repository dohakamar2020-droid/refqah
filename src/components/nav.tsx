"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export type NavUser = {
  isLoggedIn: boolean;
  isAdmin: boolean;
  isStudent: boolean;
  name: string;
};

type LinkDef = { href: string; label: string };

export function Nav({ user }: { user: NavUser }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const links: LinkDef[] = [
    { href: "/", label: "الرئيسية" },
    { href: "/hadiths", label: "رحلة الحفظ" },
    { href: "/leaderboard", label: "المنافسة" },
  ];

  if (user.isStudent) links.push({ href: "/me", label: "حسابي" });
  if (user.isAdmin) links.push({ href: "/admin", label: "لوحة المعلمة" });

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      {/* Desktop */}
      <nav className="hidden items-center gap-1 md:flex">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-full px-4 py-2 text-sm transition ${
              isActive(l.href)
                ? "bg-powder text-deep font-medium"
                : "text-muted hover:bg-blush hover:text-deep"
            }`}
          >
            {l.label}
          </Link>
        ))}
      </nav>

      {/* Mobile toggle */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="القائمة"
        className="rounded-full border border-powder bg-white p-2 text-deep md:hidden"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          {open ? (
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          ) : (
            <path
              d="M4 7h16M4 12h16M4 17h16"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          )}
        </svg>
      </button>

      {open && (
        <div className="absolute inset-x-4 top-full z-50 mt-3 rounded-card border border-powder bg-white/95 p-2 shadow-soft md:hidden">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={`block rounded-2xl px-4 py-3 text-sm transition ${
                isActive(l.href)
                  ? "bg-powder text-deep font-medium"
                  : "text-muted hover:bg-blush"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
