"use client";

import { useEffect } from "react";

/** Registers the service worker (production only — not worth it in dev). */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () =>
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Offline support is a nice-to-have; never break the page over it.
      });

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });

    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
