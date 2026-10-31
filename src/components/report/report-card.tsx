import { forwardRef } from "react";
import type { StudentReport } from "@/lib/queries";

/**
 * The shareable progress report.
 *
 * Deliberately a plain (non-client) component so it can also be rendered on
 * the server at /admin/reports/[studentId] — that page is what gets captured
 * to a PNG and shared on WhatsApp.
 *
 * Styling notes: only solid colours, plain gradients, border-radius and
 * box-shadow are used (no backdrop-filter / filters), because the capture
 * library rasterizes the node and does not support every modern CSS feature.
 */

export const ReportCard = forwardRef<
  HTMLDivElement,
  { data: StudentReport; dateLabel: string }
>(function ReportCard({ data, dateLabel }, ref) {
  const initial = data.displayName.trim().charAt(0) || "ر";

  return (
    <div
      ref={ref}
      dir="rtl"
      style={{
        width: 640,
        padding: 32,
        borderRadius: 26,
        border: "1px solid #DDB8C5",
        background: "linear-gradient(135deg, #F0DCE3 0%, #F9EFF2 48%, #FFFAF8 100%)",
        boxShadow: "0 10px 30px -12px rgba(153, 92, 116, 0.25)",
        fontFamily: "Tajawal, system-ui, sans-serif",
        color: "#4A3540",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* corner ornament */}
      <svg
        width="150"
        height="150"
        viewBox="0 0 200 200"
        fill="none"
        style={{ position: "absolute", top: -30, left: -30, opacity: 0.5 }}
      >
        <path
          d="M0 60C50 58 96 42 130 8"
          stroke="#DDB8C5"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path d="M40 40C56 26 76 20 96 22C82 40 66 50 46 52C40 52 36 48 40 40Z" fill="#F0DCE3" />
        <circle cx="24" cy="26" r="8" fill="#DDB8C5" opacity="0.75" />
        <circle cx="12" cy="42" r="6" fill="#DDB8C5" opacity="0.6" />
        <circle cx="40" cy="12" r="6" fill="#DDB8C5" opacity="0.6" />
      </svg>

      {/* ── header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, position: "relative" }}>
        <svg width="44" height="44" viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="22" fill="#F0DCE3" />
          <path
            d="M24 10c-6 4-9 8-9 14s3 10 9 14c6-4 9-8 9-14s-3-10-9-14Z"
            fill="#DDB8C5"
          />
          <circle cx="24" cy="30" r="2.5" fill="#995C74" />
        </svg>
        <div>
          <div
            style={{
              fontFamily: "Amiri, serif",
              fontSize: 24,
              color: "#995C74",
              lineHeight: 1.2,
            }}
          >
            رِفقة الأربعين
          </div>
          <div style={{ fontSize: 12, color: "#B77B91" }}>تقرير متابعة الحفظ</div>
        </div>
      </div>

      <div style={{ margin: "18px 0 22px", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ height: 1, flex: 1, background: "#DDB8C5" }} />
        <svg width="46" height="12" viewBox="0 0 60 16" fill="none">
          <circle cx="30" cy="8" r="4.5" fill="#DDB8C5" />
          <circle cx="18" cy="8" r="2.6" fill="#DDB8C5" opacity="0.8" />
          <circle cx="42" cy="8" r="2.6" fill="#DDB8C5" opacity="0.8" />
        </svg>
        <div style={{ height: 1, flex: 1, background: "#DDB8C5" }} />
      </div>

      {/* ── student ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #F0DCE3, #DDB8C5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Amiri, serif",
            fontSize: 28,
            color: "#FFFFFF",
            flexShrink: 0,
          }}
        >
          {initial}
        </div>
        <div>
          <div style={{ fontFamily: "Amiri, serif", fontSize: 26, color: "#4A3540" }}>
            {data.displayName}
          </div>
          <div style={{ fontSize: 13, color: "#B77B91" }}>
            رفيقة رحلة الأربعين · {dateLabel}
            {data.isSabiqah ? " · سَابِقَةُ الخَيْرَات" : ""}
          </div>
        </div>
      </div>

      {/* ── progress ── */}
      <div
        style={{
          marginTop: 22,
          background: "rgba(255, 255, 255, 0.75)",
          border: "1px solid #F0DCE3",
          borderRadius: 18,
          padding: 20,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 13, color: "#B77B91" }}>رحلتي في الحفظ</div>
        <div style={{ fontFamily: "Amiri, serif", fontSize: 46, color: "#995C74", lineHeight: 1.3 }}>
          {data.recitedCount}
          <span style={{ fontSize: 26, color: "#DDB8C5" }}> / {data.total}</span>
        </div>
        <div style={{ fontSize: 12, color: "#B77B91", marginBottom: 12 }}>حديثًا تم تسميعها</div>

        <div
          style={{
            height: 10,
            borderRadius: 999,
            background: "#F0DCE3",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${data.percent}%`,
              borderRadius: 999,
              background: "linear-gradient(90deg, #DDB8C5, #995C74)",
            }}
          />
        </div>
        <div style={{ fontSize: 12, color: "#B77B91", marginTop: 8 }}>
          نسبة التقدم {data.percent}%
        </div>
      </div>

      {/* ── stats ── */}
      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        {[
          { label: "سمّعت", value: data.recitedCount },
          { label: "لم تسمّع بعد", value: data.remaining },
          { label: "المنشور", value: data.publishedCount },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.7)",
              border: "1px solid #F0DCE3",
              borderRadius: 16,
              padding: "12px 6px",
              textAlign: "center",
            }}
          >
            <div style={{ fontFamily: "Amiri, serif", fontSize: 26, color: "#995C74" }}>
              {s.value}
            </div>
            <div style={{ fontSize: 11, color: "#B77B91" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── recent ── */}
      {data.recentHadiths.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, color: "#B77B91", marginBottom: 8 }}>
            آخر الأحاديث التي تم تسميعها
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {data.recentHadiths.map((o) => (
              <span
                key={o}
                style={{
                  background: "#F0DCE3",
                  color: "#995C74",
                  borderRadius: 999,
                  padding: "5px 12px",
                  fontSize: 12,
                }}
              >
                حـ{o}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── honors ── */}
      {data.honors.length > 0 && (
        <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 8 }}>
          {data.honors.map((h, i) => (
            <span
              key={`${h.title}-${i}`}
              style={{
                background: "linear-gradient(135deg, #DDB8C5, #B77B91)",
                color: "#FFFFFF",
                borderRadius: 999,
                padding: "6px 14px",
                fontSize: 12,
                fontFamily: "Amiri, serif",
              }}
            >
              {h.title}
            </span>
          ))}
        </div>
      )}

      {/* ── message ── */}
      {data.message && (
        <div
          style={{
            marginTop: 18,
            borderRight: "4px solid #DDB8C5",
            paddingRight: 14,
            fontFamily: "Amiri, serif",
            fontSize: 16,
            lineHeight: 1.9,
            color: "#4A3540",
          }}
        >
          «{data.message}»
        </div>
      )}

      {/* ── footer ── */}
      <div
        style={{
          marginTop: 22,
          paddingTop: 14,
          borderTop: "1px solid #F0DCE3",
          textAlign: "center",
          fontSize: 11,
          color: "#B77B91",
        }}
      >
        معًا حتى تمام حفظ الأربعين النووية · رحلة علمٍ وحفظٍ وعمل
      </div>
    </div>
  );
});
