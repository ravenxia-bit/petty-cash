// sw.js — petty cash list cache (Worker 版)
// 策略：cache-first + 背景更新，只快取 GET ?action=list
// 如有修改，建議調整 CACHE_NAME 強制刷新快取

const CACHE_NAME = 'petty-cash-v3';
const API_PREFIX = 'https://pcash.ravenxia1205-801.workers.dev'; // ← 你的 Cloudflare Worker

self.addEventListener('install', (event) => {
  // 立即接管
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // 清理舊版快取並立刻生效
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== CACHE_NAME) ? caches.delete(k) : Promise.resolve()));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 只攔截打到你的 Worker，且 action=list（或未帶 action 預設為 list）
  const isOurAPI = url.origin + url.pathname === API_PREFIX;
  const action = url.searchParams.get('action') || 'list';
  const isList = isOurAPI && action === 'list';

  if (!isList) return;

  event.respondWith(cacheFirstThenUpdate(event));
});

async function cacheFirstThenUpdate(event) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(event.request);

  // 背景更新：網路成功才覆蓋快取
  const networkPromise = fetch(event.request)
    .then(res => {
      if (res && res.ok) cache.put(event.request, res.clone());
      return res;
    })
    .catch(() => null);

  // 先回快取（若有），沒有再等網路；兩者都沒有回一個空資料結構避免白屏
  return cached || networkPromise || new Response(JSON.stringify({ ok:true, rows: [] }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
