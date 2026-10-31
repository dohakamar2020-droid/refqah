import Link from "next/link";
import { getSessionUser } from "@/lib/permissions";
import { hasAdmin } from "@/lib/queries";
import { LogoMark } from "@/components/floral";
import { Nav } from "@/components/nav";
import { LogoutButton } from "@/components/logout-button";

export async function SiteHeader() {
  const [me, configured] = await Promise.all([getSessionUser(), hasAdmin()]);
  // Fresh installation → the entry point is the first-run setup screen.
  const authHref = configured ? "/login" : "/setup";

  return (
    <header className="sticky top-0 z-40 border-b border-powder/60 bg-ivory/85 backdrop-blur-md">
      <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <LogoMark className="h-9 w-9 shrink-0" />
          <span className="flex flex-col leading-tight">
            <span className="font-display text-lg text-deep sm:text-xl">
              رِفقة الأربعين
            </span>
            <span className="hidden text-[11px] text-muted sm:block">
              رحلة علمٍ وحفظٍ وعمل
            </span>
          </span>
        </Link>

        <Nav
          user={{
            isLoggedIn: Boolean(me),
            isAdmin: me?.role === "admin",
            isStudent: Boolean(me) && me?.role !== "admin",
            name: me?.name ?? "",
          }}
        />

        <div className="hidden items-center gap-3 md:flex">
          {me ? (
            <>
              <span className="text-sm text-muted">{me.name}</span>
              <LogoutButton />
            </>
          ) : (
            <Link href={authHref} className="btn-soft !px-5 !py-2 text-sm">
              {configured ? "تسجيل الدخول" : "إعداد الموقع"}
            </Link>
          )}
        </div>

        {!me && (
          <Link href={authHref} className="btn-soft !px-4 !py-2 text-xs md:hidden">
            {configured ? "دخول" : "إعداد"}
          </Link>
        )}
      </div>
    </header>
  );
}
