"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  /** id of the DOM node holding the report card */
  targetId: string;
  fileName: string;
  phone: string | null;
  textMessage: string;
};

/**
 * Turns the on-screen report card into a PNG and lets the teacher
 * share it on WhatsApp (native share sheet) or download it.
 *
 * The image is generated up-front (once webfonts are ready) so that the
 * click handler stays close to a user gesture — required by the Web Share
 * API on mobile browsers.
 */
export function ReportShareBar({ targetId, fileName, phone, textMessage }: Props) {
  const blobRef = useRef<Blob | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    try {
      const el = document.getElementById(targetId);
      if (!el) throw new Error("لم يتم العثور على بطاقة التقرير");

      // Make sure Amiri / Tajawal are loaded before rasterizing.
      if (document.fonts?.ready) await document.fonts.ready;

      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(el, {
        scale: 2, // crisp on phone screens
        backgroundColor: null,
        useCORS: true,
        logging: false,
      });

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/png")
      );
      if (!blob) throw new Error("تعذّر إنشاء الصورة");

      blobRef.current = blob;
      setReady(true);
      setError(null);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "تعذّر إنشاء صورة التقرير على هذا المتصفح"
      );
    }
  }, [targetId]);

  useEffect(() => {
    // Small delay so the card has painted before we rasterize it.
    const t = setTimeout(generate, 300);
    return () => clearTimeout(t);
  }, [generate]);

  function download() {
    const blob = blobRef.current;
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function share() {
    const blob = blobRef.current;
    if (!blob) return;
    setBusy(true);
    setError(null);
    try {
      const file = new File([blob], fileName, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "تقرير متابعة الحفظ",
          text: textMessage,
        });
      } else {
        // Desktop / unsupported: download the image and open WhatsApp with
        // the ready-made text so it is one extra tap to attach the file.
        download();
        const url = phone
          ? `https://wa.me/${phone}?text=${encodeURIComponent(textMessage)}`
          : `https://wa.me/?text=${encodeURIComponent(textMessage)}`;
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch (e) {
      // The user cancelling the share sheet is not an error.
      if (!(e instanceof DOMException && e.name === "AbortError")) {
        setError("تعذّر فتح المشاركة — يمكنك تنزيل الصورة وإرسالها يدويًا");
      }
    } finally {
      setBusy(false);
    }
  }

  function openWhatsAppText() {
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(textMessage)}`
      : `https://wa.me/?text=${encodeURIComponent(textMessage)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function copyText() {
    try {
      await navigator.clipboard.writeText(textMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("تعذّر نسخ النص");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={share}
          disabled={!ready || busy}
          className="btn-primary disabled:opacity-50"
        >
          {busy ? "جارٍ الإرسال…" : "مشاركة عبر واتساب"}
        </button>

        <button
          type="button"
          onClick={download}
          disabled={!ready}
          className="btn-soft disabled:opacity-50"
        >
          تنزيل صورة التقرير
        </button>

        <button type="button" onClick={openWhatsAppText} className="btn-ghost">
          إرسال نص فقط
        </button>

        <button type="button" onClick={copyText} className="btn-ghost">
          {copied ? "تم النسخ ✓" : "نسخ النص"}
        </button>

        {!ready && !error && (
          <span className="self-center text-xs text-muted">
            جارٍ تحضير الصورة…
          </span>
        )}
      </div>

      {error && (
        <p className="rounded-2xl border border-dusty/50 bg-blush px-4 py-2 text-sm text-deep">
          {error}
        </p>
      )}

      <p className="text-xs text-muted">
        على الجوال تُفتح نافذة المشاركة مباشرة ويمكنكِ اختيار واتساب. على
        الكمبيوتر يتم تنزيل الصورة وفتح واتساب، وتضيفين الصورة بخطوة واحدة.
        {!phone && " لم تُسجَّل رقم واتساب لهذه الطالبة — أضيفيه من صفحة الطالبات."}
      </p>
    </div>
  );
}
