"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reorderStudents } from "@/lib/actions";
import { SmallFlower } from "@/components/floral";

export type OrderableStudent = { id: string; displayName: string };

/**
 * ترتيب الطالبات — بيد المعلمة وحدها، من حسابها.
 *
 * الترتيب هنا هو ترتيب الفصل: نفس الترتيب يظهر في قائمة الطالبات وجدول
 * التسميع والتقارير، ومن تضعينها الأولى تكون صاحبة المركز الأول.
 *
 * طريقتان: السحب باللمس/الفأرة، أو أزرار الأعلى/الأسفل (تعمل على كل الأجهزة).
 */
export function StudentOrderEditor({
  students,
  titleHolders,
}: {
  students: OrderableStudent[];
  /** studentId → عدد ألقاب الأحاديث التي حصلت عليها الطالبة */
  titleHolders: Record<string, number>;
}) {
  const router = useRouter();
  const [order, setOrder] = useState(students);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const dragIndex = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  // Server refreshes (adding/removing a student) reset the local list.
  useEffect(() => {
    setOrder(students);
  }, [students]);

  function persist(next: OrderableStudent[]) {
    setError(null);
    setMessage(null);
    setOrder(next);
    startTransition(async () => {
      const res = await reorderStudents(next.map((s) => s.id));
      if (!res.ok) {
        setError(res.error ?? "تعذّر حفظ الترتيب");
      } else {
        setMessage("تم حفظ الترتيب");
        router.refresh();
      }
    });
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    persist(next);
  }

  function onDrop(index: number) {
    const from = dragIndex.current;
    dragIndex.current = null;
    setDragOver(null);
    if (from === null || from === index) return;
    const next = [...order];
    const [moved] = next.splice(from, 1);
    next.splice(index, 0, moved);
    persist(next);
  }

  if (order.length === 0) {
    return (
      <p className="mt-4 text-sm text-muted">
        أضيفي الطالبات أولًا، ثم رتّبيهنّ كما تحبّين.
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className={editing ? "btn-ghost !px-4 !py-2 text-xs" : "btn-primary !px-4 !py-2 text-xs"}
        >
          {editing ? "إنهاء الترتيب" : "ترتيب الطالبات"}
        </button>
        <span className="text-xs text-muted">
          الترتيب يُحفظ لحظيًا، وتظهر الأولى في جدول التسميع والتقارير.
        </span>
        {message && <span className="text-xs text-deep">{message}</span>}
        {error && <span className="text-xs text-deep">{error}</span>}
      </div>

      <ol className="space-y-2">
        {order.map((s, i) => {
          const titles = titleHolders[s.id] ?? 0;
          return (
            <li
              key={s.id}
              draggable={editing}
              onDragStart={() => {
                dragIndex.current = i;
              }}
              onDragOver={(e) => {
                if (!editing) return;
                e.preventDefault();
                setDragOver(i);
              }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => {
                e.preventDefault();
                onDrop(i);
              }}
              className={`flex items-center gap-3 rounded-2xl border bg-white/70 px-3 py-2 transition ${
                dragOver === i ? "border-deep" : "border-powder"
              } ${pending ? "opacity-70" : ""}`}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-powder font-display text-sm text-deep nums">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-deep">
                {s.displayName}
                {i === 0 && (
                  <span className="mr-2 inline-flex items-center gap-1 rounded-full bg-blush px-2 py-0.5 text-[10px] text-deep">
                    <SmallFlower className="h-3 w-3 text-dusty" />
                    الأولى
                  </span>
                )}
                {titles > 0 && (
                  <span className="mr-2 text-[10px] text-muted">
                    {titles} لقب
                  </span>
                )}
              </span>

              {editing && (
                <>
                  <span className="cursor-grab text-xs text-dusty" aria-hidden>
                    ⠿
                  </span>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      disabled={pending || i === 0}
                      onClick={() => move(i, -1)}
                      aria-label={`تحريك ${s.displayName} لأعلى`}
                      className="rounded-lg border border-powder px-2 py-1 text-xs text-deep hover:bg-powder disabled:opacity-40"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={pending || i === order.length - 1}
                      onClick={() => move(i, 1)}
                      aria-label={`تحريك ${s.displayName} لأسفل`}
                      className="rounded-lg border border-powder px-2 py-1 text-xs text-deep hover:bg-powder disabled:opacity-40"
                    >
                      ↓
                    </button>
                  </div>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
