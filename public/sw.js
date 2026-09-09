/* Кошелёк — Service Worker (offline-first) */
/* __BUILD_TIME__ заменяется на timestamp в GitHub Actions при каждом деплое */
const VERSION = "koshelek-v3-__BUILD_TIME__";
const CACHE = VERSION;

const APP_SHELL = "./index.html";
const CORE_ASSETS = ["./", "./index.html", "./manifest.json", "./icon-512.png"];

/** Кладёт ресурсы по одному: сбой одного не отменяет кэширование остальных. */
async function precache() {
  const cache = await caches.open(CACHE);
  await Promise.allSettled(
    CORE_ASSETS.map(async (asset) => {
      // cache: "reload" — гарантированно свежая копия, минуя HTTP-кэш
      const response = await fetch(asset, { cache: "reload" });
      if (response.ok) await cache.put(asset, response);
    })
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

/** Фоновое обновление кэша — не блокирует ответ пользователю. */
function revalidate(request, key) {
  return fetch(request)
    .then((response) => {
      if (response && response.ok) {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(key || request, copy));
      }
      return response;
    })
    .catch(() => undefined);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  // Навигация: cache-first — приложение стартует офлайн и мгновенно.
  // Свежая версия подтягивается в фоне и применится при следующем запуске.
  if (request.mode === "navigate") {
    event.respondWith(
      caches.match(APP_SHELL).then((cached) => {
        if (cached) {
          event.waitUntil(revalidate(request, APP_SHELL));
          return cached;
        }
        return fetch(request)
          .then((response) => {
            if (response && response.ok) {
              const copy = response.clone();
              caches.open(CACHE).then((cache) => cache.put(APP_SHELL, copy));
            }
            return response;
          })
          .catch(() => caches.match("./"));
      })
    );
    return;
  }

  // Шрифты и прочая статика со сторонних доменов: кэшируем,
  // включая непрозрачные ответы, иначе офлайн они не отрисуются.
  if (!sameOrigin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request)
          .then((response) => {
            if (response && (response.ok || response.type === "opaque")) {
              const copy = response.clone();
              caches.open(CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          })
          .catch(() => cached);
      })
    );
    return;
  }

  // Свои ресурсы: отдаём из кэша, параллельно обновляя.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        event.waitUntil(revalidate(request));
        return cached;
      }
      return fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(APP_SHELL));
    })
  );
});
