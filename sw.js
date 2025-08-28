const CACHE_NAME = 'oc-pet-cache-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/app.js',
  '/manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((key) => {
      if (key !== CACHE_NAME) return caches.delete(key);
    })))
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  // 跳过非 http(s) 协议（如 chrome-extension://）和浏览器扩展注入的请求
  try {
    const url = new URL(request.url);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  } catch (_) {
    return;
  }
  event.respondWith(
    caches.match(request).then((cached) =>
      cached || fetch(request).then((response) => {
        // 仅缓存有效的 http(s) 响应，忽略 opaue/no-cors、错误状态以及跨域不可缓存的情况
        try {
          const url = new URL(request.url);
          const okToCache = (url.protocol === 'http:' || url.protocol === 'https:') && response && response.ok && response.type !== 'opaque';
          if (okToCache) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
          }
        } catch (_) {}
        return response;
      }).catch(() => cached)
    )
  );
});
