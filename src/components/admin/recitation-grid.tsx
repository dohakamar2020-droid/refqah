"use client";

import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import { setRecitation } from "@/lib/actions";
import type { GridData } from "@/components/grid-types";
import { cellKey } from "@/components/grid-types";
import { CheckIcon, DashIcon, LockIcon } from "@/components/grid-legend";

/**
 * The teacher's editable grid: one row per student, one column per hadith.
 * Cells are only interactive for published hadiths.
 */
export function RecitationGrid({ data }: { data: GridData }) {
  const [state, setState] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const [studentId, hadithIds] of Object.entries(data.recited)) {
      for (const hid of hadithIds) map[cellKey(studentId, hid)] = true;
    }
    return map;
  });
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isRecited = useCallback(
    (studentId: string, hadithId: string) =>
      Boolean(state[cellKey(studentId, hadithId)]),
    [state]
  );

  async function toggle(studentId: string, hadithId: string) {
    const key = cellKey(studentId, hadithId);
    const next = !state[key];
    setError(null);
    setPendingKey(key);

    // Optimistic update
    setState((prev) => ({ ...prev, [key]: next }));

    const res = await setRecitation(studentId, hadithId, next);
    setPendingKey(null);
    if (!res.ok) {
      // Roll back and surface the reason
      setState((prev) => ({ ...prev, [key]: !next }));
      setError(res.error ?? "تعذّر حفظ التعديل");
    }
  }

  return (
    <div>
      {error && (
        <div className="mb-3 rounded-2xl border border-dusty/50 bg-blush px-4 py-2 text-sm text-deep">
          {error}
        </div>
      )}

      <GridTable
        data={data}
        isRecited={isRecited}
        pendingKey={pendingKey}
        onToggle={(studentId, hadithId) =>
          startTransition(() => toggle(studentId, hadithId))
        }
      />
    </div>
  );
}

export function GridTable({
  data,
  isRecited,
  pendingKey,
  onToggle,
  interactive = true,
}: {
  data: GridData;
  isRecited: (studentId: string, hadithId: string) => boolean;
  pendingKey?: string | null;
  onToggle?: (studentId: string, hadithId: string) => void;
  interactive?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const publishedCount = useMemo(
    () => data.hadiths.filter((h) => h.published).length,
    [data.hadiths]
  );

  if (data.students.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-dusty/60 bg-white/60 px-6 py-10 text-center text-sm text-muted">
        لم تُضف المعلمة أسماء الطالبات بعد.
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="grid-scroll rounded-card border border-powder">
      <table className="w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th className="sticky-col-header border-b border-powder px-4 py-3 text-right font-medium text-deep min-w-[10rem]">
              اسم الطالبة
            </th>
            {data.hadiths.map((h) => (
              <th
                key={h.id}
                title={
                  h.awardTitle
                    ? `${h.title} — لقب الحديث: ${h.awardTitle}${
                        h.awardStudentName ? ` (${h.awardStudentName})` : ""
                      }`
                    : h.title
                }
                className="border-b border-powder px-1 py-3 text-center align-middle"
                style={{ minWidth: 46 }}
              >
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-xs nums ${
                    h.published
                      ? "bg-powder text-deep font-medium"
                      : "bg-blush text-dusty/70"
                  }`}
                >
                  حـ{h.order}
                </span>
                {h.awardTitle && (
                  <span
                    title={
                      h.awardStudentName
                        ? `${h.awardTitle} — ${h.awardStudentName}`
                        : h.awardTitle
                    }
                    className="mt-1 block max-w-[5.5rem] truncate text-[9px] leading-tight text-dusty"
                  >
                    {h.awardTitle}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.students.map((s, rowIdx) => (
            <tr key={s.id} className="group">
              <th
                scope="row"
                className={`sticky-col border-b border-powder px-4 py-2 text-right font-normal ${
                  rowIdx % 2 === 1 ? "!bg-blush/40" : ""
                }`}
              >
                <span className="flex items-center gap-2">
                  {s.rank ? (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blush text-[10px] text-deep nums">
                      {s.rank}
                    </span>
                  ) : null}
                  <span className="truncate text-deep">{s.displayName}</span>
                </span>
              </th>

              {data.hadiths.map((h) => {
                const key = cellKey(s.id, h.id);
                const recited = isRecited(s.id, h.id);
                const isPending = pendingKey === key;

                if (!h.published) {
                  return (
                    <td
                      key={h.id}
                      className={`border-b border-powder bg-ivory/70 px-1 py-2 text-center ${
                        rowIdx % 2 === 1 ? "!bg-ivory" : ""
                      }`}
                    >
                      <span className="inline-flex h-8 w-8 items-center justify-center text-dusty/50">
                        <LockIcon className="h-4 w-4" />
                      </span>
                    </td>
                  );
                }

                if (!interactive) {
                  return (
                    <td
                      key={h.id}
                      className={`border-b border-powder px-1 py-2 text-center ${
                        rowIdx % 2 === 1 ? "bg-blush/25" : ""
                      }`}
                    >
                      <span
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-xl ${
                          recited ? "bg-dusty/35 text-deep" : "text-dusty/60"
                        }`}
                      >
                        {recited ? (
                          <CheckIcon className="h-5 w-5" />
                        ) : (
                          <DashIcon className="h-5 w-5" />
                        )}
                      </span>
                    </td>
                  );
                }

                return (
                  <td
                    key={h.id}
                    className={`border-b border-powder px-1 py-2 text-center ${
                      rowIdx % 2 === 1 ? "bg-blush/25" : ""
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onToggle?.(s.id, h.id)}
                      disabled={isPending}
                      aria-pressed={recited}
                      aria-label={`${s.displayName} — الحديث ${h.order} — ${
                        recited ? "سمّعت" : "مسمّعتش"
                      }`}
                      title={`${h.title} — ${
                        recited ? "سمّعت" : "مسمّعتش"
                      }`}
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-200 disabled:opacity-40 ${
                        recited
                          ? "bg-dusty/45 text-deep hover:bg-dusty/70 ring-1 ring-deep/15"
                          : "text-dusty/70 hover:bg-powder hover:text-deep"
                      } ${isPending ? "animate-pulse" : ""}`}
                    >
                      {recited ? (
                        <CheckIcon className="h-5 w-5" />
                      ) : (
                        <DashIcon className="h-5 w-5" />
                      )}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
