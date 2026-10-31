import Link from "next/link";
import { getAllHadiths } from "@/lib/queries";
import { getSessionUser } from "@/lib/permissions";
import { OrnamentDivider, SmallFlower } from "@/components/floral";
import { PUBLISH_DAYS, formatDate } from "@/lib/format";
import { LockIcon } from "@/components/grid-legend";

export const dynamic = "force-dynamic";

export default async function HadithsPage() {
  const [hadiths, me] = await Promise.all([getAllHadiths(), getSessionUser()]);
  const published = hadiths.filter((h) => h.published);
  const unpublished = hadiths.filter((h) => !h.published);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="text-center">
        <span className="chip bg-powder text-deep">رحلة الحفظ</span>
        <h1 className="mt-4 font-display text-3xl text-deep sm:text-4xl">
          الأحاديث الـ42
        </h1>
        <OrnamentDivider className="mx-auto mt-4 h-6 w-52 text-dusty" />
        <p className="mt-3 text-sm text-muted">
          تُنشر الأحاديث بالتتابع أيام {PUBLISH_DAYS.join("، ")}
        </p>
      </div>

      {published.length === 0 ? (
        <div className="mt-10 rounded-card border border-dashed border-dusty/60 bg-white/60 px-6 py-12 text-center">
          <LockIcon className="mx-auto h-8 w-8 text-dusty/60" />
          <p className="mt-3 text-muted">
            لم تُنشر أي أحاديث بعد.. ترقبّي أول حديث في موعد النشر.
          </p>
        </div>
      ) : (
        <div className="mt-10 space-y-4">
          {published.map((h) => (
            <article key={h.id} className="card card-pad animate-fadeUp">
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-powder font-display text-deep nums">
                  {h.order}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-xl text-deep">{h.title}</h2>
                  {h.narrator && (
                    <p className="mt-2 font-display text-lg leading-loose text-deep">{h.narrator}</p>
                  )}
                  <p className="mt-3 whitespace-pre-line leading-loose text-ink">{h.arabicText}</p>
                  {h.takhrij && (
                    <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted">
                      {h.takhrij}
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted">
                    {h.publishedAt && (
                      <span>نُشر في {formatDate(h.publishedAt)}</span>
                    )}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {unpublished.length > 0 && (
        <section className="mt-12">
          <h2 className="flex items-center gap-2 text-sm font-medium text-muted">
            <SmallFlower className="h-4 w-4 text-dusty" />
            لم تُنشر بعد ({unpublished.length})
          </h2>
          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {unpublished.map((h) => (
              <div
                key={h.id}
                title={h.title}
                className="flex flex-col items-center gap-1 rounded-2xl border border-powder/70 bg-white/50 px-2 py-3 text-center"
              >
                <LockIcon className="h-4 w-4 text-dusty/60" />
                <span className="text-xs text-muted nums">حـ{h.order}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {!me && (
        <div className="mt-12 text-center">
          <Link href="/login" className="btn-soft">
            سجّلي الدخول لمتابعة تقدمكِ
          </Link>
        </div>
      )}
    </div>
  );
}
