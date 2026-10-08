/* ============================================================================
 * afk-sw.js — 註冊 Service Worker（實際快取邏輯見 sw.js）
 *
 *   - 只在「能跑 SW 的環境」(HTTPS / localhost)註冊。判斷用 isSecureContext + protocol 為 http(s):
 *     SW 本來就只在 http(s) 跑；file:// 略過、零錯誤、遊戲照舊。
 *   - 不掛任何遊戲 DOM，純註冊 SW。
 *
 * 掛接: index.html / index-pc.html </body> 前 <script src="afk-sw.js">
 * ========================================================================== */
(function () {
  'use strict';
  if (!('serviceWorker' in navigator) || !window.isSecureContext || !/^https?:$/.test(location.protocol)) {
    console.log('[AFK-sw] 非 PWA 環境(file:// 或瀏覽器不支援),略過 Service Worker 註冊,遊戲不受影響。');
    return;
  }
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).then(function (reg) {
      console.log('[AFK-sw] hooks OK — Service Worker 已註冊 (scope=' + (reg && reg.scope) + ')');
    }).catch(function (err) {
      console.warn('[AFK-sw] Service Worker 註冊失敗(不影響遊戲):', err && err.message);
    });
  });
})();
