"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "refqah.install.dismissed";

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches ||
    // iOS Safari
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

function isIosSafari() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || /Macintosh/.test(ua);
  const safari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|Chrome/.test(ua);
  return ios && safari;
}

/**
 * Small floating install button — bottom-left, shown only while the app is
 * *not* installed. Disappears on its own once installed (or if dismissed).
 */
export function InstallAppButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Already running as an installed app → never show the button.
    if (isStandalone()) return;

    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    const onInstalled = () => {
      setVisible(false);
      setDeferred(null);
      localStorage.setItem(DISMISS_KEY, "1");
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    // iOS Safari has no beforeinstallprompt — offer the manual steps instead.
    if (isIosSafari()) {
      setIosHint(true);
      setVisible(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
    setShowHint(false);
  }

  async function install() {
    if (!deferred) {
      setShowHint((v) => !v);
      return;
    }
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") {
      setVisible(false);
    }
    setDeferred(null);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col items-start gap-2">
      {showHint && iosHint && (
        <div className="max-w-[15rem] animate-fadeUp rounded-2xl border border-powder bg-ivory p-3 text-xs leading-relaxed text-ink shadow-card">
          <p className="font-medium text-deep">لتثبيت التطبيق على آيفون:</p>
          <p className="mt-1 text-muted">
            اضغطي زر المشاركة <span aria-hidden>⬆️</span> ثم اختاري «إضافة إلى
            الشاشة الرئيسية».
          </p>
        </div>
      )}

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={install}
          aria-label="تثبيت التطبيق"
          className="flex items-center gap-2 rounded-full border border-dusty/60 bg-ivory/95 px-3.5 py-2 text-xs font-medium text-deep shadow-card backdrop-blur transition hover:bg-white active:scale-95"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-4 w-4 shrink-0 text-muted"
            aria-hidden="true"
          >
            <path
              d="M12 3v11m0 0 4-4m-4 4-4-4"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M4 17v1.5A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V17"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
          ثبّتي التطبيق
        </button>

        <button
          type="button"
          onClick={dismiss}
          aria-label="إخفاء زر التثبيت"
          className="flex h-6 w-6 items-center justify-center rounded-full text-xs text-muted/70 transition hover:bg-white/70 hover:text-deep"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
