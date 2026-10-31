import type { Metadata, Viewport } from "next";
import "@fontsource/amiri/400.css";
import "@fontsource/amiri/700.css";
import "@fontsource/tajawal/300.css";
import "@fontsource/tajawal/400.css";
import "@fontsource/tajawal/500.css";
import "@fontsource/tajawal/700.css";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { OrnamentDivider } from "@/components/floral";
import { PwaRegister } from "@/components/pwa-register";
import { InstallAppButton } from "@/components/install-app-button";

export const metadata: Metadata = {
  title: "رِفقة الأربعين — رحلة علمٍ وحفظٍ وعمل",
  description:
    "مساحة تعليمية لمتابعة حفظ الأربعين النووية: 42 حديثًا، رحلة مشتركة، ومتابعة وتشجيع مستمر.",
  manifest: "/manifest.webmanifest",
  applicationName: "رِفقة الأربعين",
  appleWebApp: {
    capable: true,
    title: "رِفقة الأربعين",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#F9EFF2",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className="flex min-h-screen flex-col">
        <PwaRegister />
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <footer className="mt-auto border-t border-powder/60 bg-blush/40 py-8">
          <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
            <OrnamentDivider className="mx-auto h-6 w-40 text-dusty" />
            <p className="mt-4 font-display text-lg text-deep">رِفقة الأربعين</p>
            <p className="mt-1 text-sm text-muted">
              رحلة علمٍ وحفظٍ وعمل — معًا حتى تمام حفظ الأربعين النووية
            </p>
          </div>
        </footer>
        <InstallAppButton />
      </body>
    </html>
  );
}
