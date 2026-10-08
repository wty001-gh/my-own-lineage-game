/* ============================================================================
 * sw.js — Idle Lineage 個人自用 PWA Service Worker
 *
 * 目標：合理快取核心殼層（HTML／CSS／manifest／圖示），執行期快取常見靜態資源，
 *       方便同 WiFi／本機伺服器離線回訪；唔會乱搞 ?v= cache bust。
 *
 * Cache bust 策略：
 *   - JS／CSS／HTML：用「完整 URL（含 ?v=）」做 cache key → 你 bump ?v= 就係新檔，舊 key 自然唔命中。
 *   - 圖片／字型等：同樣用完整 URL；大多數資產無 query 亦 OK。
 *   - 唔用 ignoreSearch，避免舊版 JS 被錯當新版。
 *
 * 範圍：只處理同 origin、scope 內請求。version.json 唔攔截（永遠走網路）。
 * ========================================================================== */
const CODE_VERSION = 'code-clanbase-v396';
const BUILD_ID     = '1006-0105';
const CACHE_TAG    = 'guild.20261008c';
const CORE_CACHE   = 'il-core-' + CACHE_TAG;
const RUNTIME_CACHE = 'il-rt-' + CACHE_TAG;

/** 預快取殼層（相對 SW 所在目錄）。缺檔唔致命——install 會略過失敗項。 */
const CORE_ASSETS = [
  './',
  './index.html',
  './index-pc.html',
  './manifest.webmanifest',
  './assets/favicon.png',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/pwa/icon-180.png',
  './assets/icons/pwa/icon-192.png',
  './assets/icons/pwa/icon-512.png',
  './css/style.css',
  './afk-pwa.js',
  './afk-sw.js',
];

self.addEventListener('install', function (event) {
  event.waitUntil((async function () {
    const cache = await caches.open(CORE_CACHE);
    await Promise.all(CORE_ASSETS.map(async function (url) {
      try {
        const req = new Request(url, { cache: 'reload' });
        const res = await fetch(req);
        if (res && res.ok) await cache.put(url, res);
      } catch (e) { /* 缺檔／離線安裝：略過 */ }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', function (event) {
  event.waitUntil((async function () {
    const keep = new Set([CORE_CACHE, RUNTIME_CACHE]);
    const keys = await caches.keys();
    await Promise.all(keys.map(function (k) {
      if (!keep.has(k) && (k.indexOf('il-core-') === 0 || k.indexOf('il-rt-') === 0 || k.indexOf('idle-lineage') === 0)) {
        return caches.delete(k);
      }
    }));
    await self.clients.claim();
  })());
});

function isVersionJson(url) {
  try { return /\/version\.json(\?|$)/.test(new URL(url).pathname); } catch (e) { return false; }
}

function isNavigational(request) {
  return request.mode === 'navigate' || (request.destination === 'document');
}

function isCodeAsset(url) {
  try {
    const p = new URL(url).pathname;
    return /\.(js|mjs|css)(\?|$)/i.test(p) || /\.webmanifest$/i.test(p);
  } catch (e) { return false; }
}

function isStaticAsset(url) {
  try {
    const p = new URL(url).pathname;
    return /\.(png|jpe?g|gif|webp|svg|ico|woff2?|ttf|mp3|ogg|wav)(\?|$)/i.test(p);
  } catch (e) { return false; }
}

self.addEventListener('fetch', function (event) {
  const request = event.request;
  if (request.method !== 'GET') return;
  let url;
  try { url = new URL(request.url); } catch (e) { return; }
  if (url.origin !== self.location.origin) return;
  if (isVersionJson(request.url)) return; // 永遠網路

  // HTML 導航：網路優先，失敗先退 cache（離線可開殼）
  if (isNavigational(request)) {
    event.respondWith((async function () {
      try {
        const fresh = await fetch(request);
        if (fresh && fresh.ok) {
          const cache = await caches.open(CORE_CACHE);
          cache.put(request, fresh.clone());
        }
        return fresh;
      } catch (e) {
        const cached = await caches.match(request) ||
          await caches.match('./index.html') ||
          await caches.match('./index-pc.html');
        if (cached) return cached;
        throw e;
      }
    })());
    return;
  }

  // JS／CSS／manifest：網路優先（尊重 ?v=），失敗退同 URL cache
  if (isCodeAsset(request.url)) {
    event.respondWith((async function () {
      const cache = await caches.open(RUNTIME_CACHE);
      try {
        const fresh = await fetch(request);
        if (fresh && fresh.ok) cache.put(request, fresh.clone());
        return fresh;
      } catch (e) {
        const cached = await cache.match(request);
        if (cached) return cached;
        const coreHit = await caches.match(request);
        if (coreHit) return coreHit;
        throw e;
      }
    })());
    return;
  }

  // 圖片等靜態：cache-first（完整 URL key，唔 ignoreSearch）
  if (isStaticAsset(request.url)) {
    event.respondWith((async function () {
      const cache = await caches.open(RUNTIME_CACHE);
      const cached = await cache.match(request);
      if (cached) return cached;
      try {
        const fresh = await fetch(request);
        if (fresh && fresh.ok) cache.put(request, fresh.clone());
        return fresh;
      } catch (e) {
        throw e;
      }
    })());
  }
});

// 供除錯：頁面可 postMessage({type:'GET_VERSION'})
self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'GET_VERSION') {
    event.source && event.source.postMessage({
      type: 'SW_VERSION',
      CODE_VERSION: CODE_VERSION,
      BUILD_ID: BUILD_ID,
      CACHE_TAG: CACHE_TAG
    });
  }
});
