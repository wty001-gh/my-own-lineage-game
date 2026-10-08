/* ============================================================================
 * afk-pwa.js — 個人自用 iOS/Safari PWA 輔助（無 App Store）
 *
 *   - 確保 <link rel="manifest"> 存在
 *   - 偵測 standalone（已加到主畫面）→ html.pwa-standalone，方便 CSS 微調
 *   - iOS Safari 沒有 beforeinstallprompt；加到主畫面靠分享選單，見 HOWTO
 * ========================================================================== */
(function () {
  'use strict';
  try {
    if (!document.querySelector('link[rel="manifest"]')) {
      var link = document.createElement('link');
      link.rel = 'manifest';
      link.href = 'manifest.webmanifest';
      document.head.appendChild(link);
    }
  } catch (e) { /* ignore */ }

  function markStandalone() {
    try {
      var ios = !!(window.navigator && window.navigator.standalone);
      var dm = false;
      try { dm = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches; } catch (e2) {}
      if (ios || dm) document.documentElement.classList.add('pwa-standalone');
    } catch (e3) { /* ignore */ }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', markStandalone);
  else markStandalone();
})();
