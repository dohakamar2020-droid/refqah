/*
 * Service worker for رِفقة الأربعين.
 *
 * Strategy:
 *   • Static assets (_next/static, icons, fonts) → stale-while-revalidate
 *   • Navigations → network only; on failure show /offline.html
 *   • /api/* (incl. Better Auth) → network only, never cached
 *
 * ⚠️ HTML pages are deliberately NOT cached. Every page in this app is
 * server-rendered per student and carries private recitation data; caching
 * them could serve one student's page to the next person using the same
 * device. The privacy model is enforced on the server, so the offline
 * experience is limited to the app shell + an offline notice.
 */

const VERSION = "v1";
const STATIC_CACHE = `refqah-static-${VERSION}`;
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL, "/manifest.webmanifest"]))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isStaticAsset(pathname) {
  return (
    pathname.startsWith("/_next/static/") ||
    pathname.startsWith("/icons/") ||
    pathname === "/manifest.webmanifest" ||
    /\.(?:css|js|woff2?|ttf|png|jpe?g|svg|ico|webp)$/i.test(pathname)
  );
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);

  const network = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);

  return cached || network;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache API calls — sessions, auth and recitation data stay live.
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const offline = await caches.match(OFFLINE_URL);
        return (
          offline ||
          new Response("لا يوجد اتصال", {
            status: 503,
            headers: { "Content-Type": "text/html; charset=utf-8" },
          })
        );
      })
    );
    return;
  }

  if (isStaticAsset(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
