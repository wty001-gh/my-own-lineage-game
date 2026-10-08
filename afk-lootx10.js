/**
 * afk-lootx10.js — 掉落 ×10（預設開；經驗已取消倍率）
 *
 * 掛點（疊在既有倍率之上，不破壞組隊／經典管線）：
 *   1. classicDropMult：回傳值 ×10 → _dropMult 系與「rate × classicDropMult()」路徑
 *   2. partyDropRate：輸入機率 ×10 → MOB_DROPS／卡片／任務書等主路徑
 *
 * 經驗：不再改 killMob／mob.exp（維持原版）。
 *
 * 開關：afk-toggles 的 'lootx10'（預設開；熱路徑每次呼叫都問 enabled）。
 */
(function () {
  'use strict';

  var ID = 'lootx10';
  var MULT = 10;

  function on() {
    return !window.AFK_TOGGLES || AFK_TOGGLES.enabled(ID);
  }

  if (window.AFK_TOGGLES && typeof AFK_TOGGLES.register === 'function') {
    try {
      AFK_TOGGLES.register({
        id: ID,
        name: '掉落×10',
        desc: '一般掉落機率 ×10（經驗維持原版；疊在組隊／席琳／經典倍率之上；可關）',
        group: '遊戲玩法',
        def: true
      });
    } catch (e) {}
  }

  function wrapClassicDropMult() {
    if (typeof window.classicDropMult !== 'function' || window.classicDropMult.__afkLootX10) return false;
    var orig = window.classicDropMult;
    var wrapped = function () {
      var v = orig.apply(this, arguments);
      return on() ? (Number(v) || 0) * MULT : v;
    };
    wrapped.__afkLootX10 = true;
    window.classicDropMult = wrapped;
    try { classicDropMult = wrapped; } catch (e) {}
    return true;
  }

  function wrapPartyDropRate() {
    if (typeof window.partyDropRate !== 'function' || window.partyDropRate.__afkLootX10) return false;
    var orig = window.partyDropRate;
    var wrapped = function (rate) {
      if (!on()) return orig.apply(this, arguments);
      return orig.call(this, (Number(rate) || 0) * MULT);
    };
    wrapped.__afkLootX10 = true;
    window.partyDropRate = wrapped;
    try { partyDropRate = wrapped; } catch (e) {}
    return true;
  }

  function init() {
    var b = wrapClassicDropMult();
    var c = wrapPartyDropRate();
    try {
      console.log('[AFK-lootx10] hooks ' + (b && c ? 'OK' : 'partial') +
        ' — drop×' + MULT + ' only (no exp mult); classic=' + b + ' party=' + c);
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 0); });
  } else {
    setTimeout(init, 0);
  }
})();
