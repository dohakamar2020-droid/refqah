"use client";

import { useEffect, useState } from "react";
import { SmallFlower } from "@/components/floral";

export type MessageLite = { id: string; text: string; category: string | null };

const STORAGE_KEY = "refqah:seen-messages";

function readSeen(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function writeSeen(ids: string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids.slice(-40)));
  } catch {
    /* storage may be unavailable — rotation still works, just forgets history */
  }
}

function pick(messages: MessageLite[], exclude: string[]): MessageLite {
  const pool = messages.filter((m) => !exclude.includes(m.id));
  const from = pool.length > 0 ? pool : messages; // seen them all → start over
  return from[Math.floor(Math.random() * from.length)];
}

/**
 * «رسالة اليوم» — تتغير مع كل زيارة، ولا تتكرر نفسها في زيارتين متتاليتين.
 */
export function EncouragementCard({
  messages,
  initial,
  toName,
  showRefresh = true,
}: {
  messages: MessageLite[];
  initial: MessageLite | null;
  toName?: string | null;
  showRefresh?: boolean;
}) {
  const [current, setCurrent] = useState<MessageLite | null>(initial);

  useEffect(() => {
    if (messages.length === 0) return;
    const seen = readSeen();
    if (current && seen[seen.length - 1] === current.id && messages.length > 1) {
      // The server happened to serve the same message as last visit — swap it.
      const next = pick(messages, [current.id]);
      setCurrent(next);
      writeSeen([...seen, next.id]);
    } else if (current) {
      writeSeen([...seen, current.id]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function refresh() {
    if (messages.length === 0) return;
    const seen = readSeen();
    const next = pick(messages, [...seen, ...(current ? [current.id] : [])]);
    setCurrent(next);
    writeSeen([...seen, next.id]);
  }

  if (!current) return null;

  return (
    <div className="card card-pad relative overflow-hidden">
      <SmallFlower className="pointer-events-none absolute -left-6 -top-6 h-28 w-28 text-dusty opacity-25" />

      <div className="relative">
        <div className="flex items-center gap-2 text-xs font-medium text-muted">
          <span className="chip bg-powder text-deep">رسالة اليوم</span>
          {current.category && (
            <span className="chip bg-blush text-muted">{current.category}</span>
          )}
        </div>

        <p className="mt-4 font-display text-xl leading-relaxed text-deep sm:text-2xl">
          «{current.text}»
        </p>

        {toName && (
          <p className="mt-3 text-sm text-muted">
            إلى <span className="font-medium text-deep">{toName}</span> — نسأل الله
            لكِ العلم النافع والعمل الصالح.
          </p>
        )}

        {showRefresh && messages.length > 1 && (
          <button
            type="button"
            onClick={refresh}
            className="mt-5 inline-flex items-center gap-2 rounded-full border border-dusty/60 px-4 py-2 text-sm text-deep transition hover:bg-blush"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M20 12a8 8 0 1 1-2.34-5.66M20 4v4h-4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            رسالة جديدة
          </button>
        )}
      </div>
    </div>
  );
}
