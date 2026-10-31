const dateFormatter = new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Africa/Cairo",
});

const dateTimeFormatter = new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Africa/Cairo",
});

export function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return dateFormatter.format(new Date(d));
}

export function formatDateTime(d: Date | string | null | undefined) {
  if (!d) return "—";
  return dateTimeFormatter.format(new Date(d));
}

/** أيام النشر المعتمدة في الدورة */
export const PUBLISH_DAYS = ["السبت", "الاثنين", "الأربعاء"];
