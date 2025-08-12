// sw.js
const CACHE_NAME = 'petty-cash-v1';
const API_PREFIX = 'https://script.google.com/macros/s/AKfycbwKrXfh6ms7EG3c-GNf71DRMzNhcCAhRrhsazWk0RWenVlxG_IGzNyxJOLztALSXvVG/exec';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

// 只攔 GET 並且是我們的 list 請求
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isList = event.request.method === 'GET'
    && url.href.startsWith(API_PREFIX)
    && (url.searchParams.get('action') || 'list') === 'list';

  if (!isList) return; // 非 list 請求照常走網路

  event.respondWith(cacheFirstThenUpdate(event));
});

async function cacheFirstThenUpdate(event){
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(event.request);
  const networkPromise = fetch(event.request)
    .then(res => {
      if (res && res.ok) cache.put(event.request, res.clone());
      return res;
    })
    .catch(() => null);

  // 先回快取（若有），同時背景更新；沒有快取就等網路
  return cached || networkPromise || new Response(JSON.stringify({ ok:true, rows: [] }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
