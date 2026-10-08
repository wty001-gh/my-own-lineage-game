/**
 * afk-gearboost.js — 裝備／屬性／遺物強化擴充（預設開）
 *
 * 對應玩家 Console 片段的永久外掛版：
 *   1. 遺物：relic===true 或 id 以 relic_ 開頭 → 刪 noEnhance、設 legend=true
 *   2. ENHANCE_CAP：武 20／防 15／飾 15；順便補 WPN_EN_HIT_OVER10 的 +16~+20
 *   3. doBianAttr：呼叫期間 isRelic 暫時回 false（遺物可變屬性）；doEnhance 同理可強化
 *   4. ATTR_EN_BONUS 1..9 = [1,3,5,7,9,11,13,15,20]，寫入 ATTR_AFFIX（含新 6~9 階）
 *   5. 屬性相剋：克制 1.5／被克 0.5／中立 1.0（包 elementCounterMult）
 *   6. 飾品強化 +6~+15 額外加成＋腰帶全階爆擊（包 recomputeStats／calcStats 之後補）
 *   7. 讀檔時還原被核心硬夾 >+15 的武器強化值
 *
 * 開關：afk-toggles 的 'gearboost'（預設開）。
 */
(function () {
  'use strict';

  var ID = 'gearboost';
  var ATTR_EN_BONUS = { 1: 1, 2: 3, 3: 5, 4: 7, 5: 9, 6: 11, 7: 13, 8: 15, 9: 20 };
  var ATTR_TIER9_NAMES = {
    fire:  { 6: '烈焰', 7: '業火', 8: '劫火', 9: '真帕格里奧' },
    water: { 6: '怒濤', 7: '冰河', 8: '深淵', 9: '真伊娃' },
    wind:  { 6: '旋風', 7: '雷霆', 8: '天嵐', 9: '真沙哈' },
    earth: { 6: '地裂', 7: '岩獄', 8: '山崩', 9: '真馬普勒' }
  };
  var ATTR_ELE_PREFIX_LOCAL = { fire: 'fr', water: 'wa', wind: 'wi', earth: 'ea' };

  function on() {
    return !window.AFK_TOGGLES || AFK_TOGGLES.enabled(ID);
  }

  if (window.AFK_TOGGLES && typeof AFK_TOGGLES.register === 'function') {
    try {
      AFK_TOGGLES.register({
        id: ID,
        name: '裝備強化擴充',
        desc: '遺物可強化／變屬性、強化上限武+20防飾+15、屬性階 1~9、相剋 1.5/0.5、飾品+6~+15 加成',
        group: '遊戲玩法',
        def: true
      });
    } catch (e) {}
  }

  // ── 1) 遺物：可強化＋傳說色 ───────────────────────────────────────────
  function patchRelics() {
    var n = 0;
    try {
      if (typeof DB === 'undefined' || !DB.items) return 0;
      Object.keys(DB.items).forEach(function (id) {
        var item = DB.items[id];
        if (!item) return;
        if (!(item.relic === true || String(id).indexOf('relic_') === 0)) return;
        if (item.noEnhance) delete item.noEnhance;
        item.legend = true;
        n++;
      });
    } catch (e) {}
    return n;
  }

  // ── 2) 強化上限 ───────────────────────────────────────────────────────
  function patchEnhanceCaps() {
    try {
      if (typeof ENHANCE_CAP === 'object' && ENHANCE_CAP) {
        ENHANCE_CAP.wpn = 20;
        ENHANCE_CAP.arm = 15;
        ENHANCE_CAP.acc = 15;
      }
    } catch (e) {}
    try {
      if (typeof WPN_EN_HIT_OVER10 === 'object' && WPN_EN_HIT_OVER10) {
        // 延續 +13~+15 每階 +2 的累加量
        if (WPN_EN_HIT_OVER10[16] == null) WPN_EN_HIT_OVER10[16] = 10;
        if (WPN_EN_HIT_OVER10[17] == null) WPN_EN_HIT_OVER10[17] = 12;
        if (WPN_EN_HIT_OVER10[18] == null) WPN_EN_HIT_OVER10[18] = 14;
        if (WPN_EN_HIT_OVER10[19] == null) WPN_EN_HIT_OVER10[19] = 16;
        if (WPN_EN_HIT_OVER10[20] == null) WPN_EN_HIT_OVER10[20] = 18;
      }
    } catch (e2) {}
  }

  // ── 4) 屬性強化表 1~9 ─────────────────────────────────────────────────
  function patchAttrEnBonus() {
    try {
      window.ATTR_EN_BONUS = ATTR_EN_BONUS;
      if (typeof ATTR_AFFIX !== 'object' || !ATTR_AFFIX) return false;
      Object.keys(ATTR_AFFIX).forEach(function (k) {
        var a = ATTR_AFFIX[k];
        if (!a || !a.tier) return;
        var b = ATTR_EN_BONUS[a.tier];
        if (b == null) return;
        a.dmg = b;
        a.mp = b;
      });
      // 補 6~9 階（原版只有 1~5）
      Object.keys(ATTR_ELE_PREFIX_LOCAL).forEach(function (ele) {
        var pref = ATTR_ELE_PREFIX_LOCAL[ele];
        var names = ATTR_TIER9_NAMES[ele] || {};
        for (var t = 6; t <= 9; t++) {
          var key = pref + t;
          var bonus = ATTR_EN_BONUS[t];
          if (ATTR_AFFIX[key]) {
            ATTR_AFFIX[key].dmg = bonus;
            ATTR_AFFIX[key].mp = bonus;
            ATTR_AFFIX[key].tier = t;
            ATTR_AFFIX[key].ele = ele;
          } else {
            ATTR_AFFIX[key] = {
              n: names[t] || (ele + t),
              ele: ele,
              tier: t,
              dmg: bonus,
              mp: bonus
            };
          }
        }
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  // ── 3) doBianAttr / doEnhance：遺物放行＋屬性可衝到 9 階 ──────────────
  function wrapIsRelicFalse(fn) {
    return function () {
      if (!on()) return fn.apply(this, arguments);
      var prev = window.isRelic;
      var had = typeof prev === 'function';
      if (had) window.isRelic = function () { return false; };
      try {
        return fn.apply(this, arguments);
      } finally {
        if (had) window.isRelic = prev;
      }
    };
  }

  function tryUpgradeAttrTier(slotKey, ele, cur) {
    // 自管 5→6 … 8→9（原版在 tier>=5 會改走附加魔法）
    var item = player.eq[slotKey];
    if (!item) return false;
    var d = DB.items[item.id];
    if (!d || d.type !== 'wpn') return false;
    var cfg = (typeof ATTR_SCROLLS !== 'undefined') ? ATTR_SCROLLS[ele] : null;
    if (!cfg) return false;
    var sc = player.inv.find(function (i) { return i.id === cfg.id; });
    if (!sc || sc.cnt < 1) {
      if (typeof logSys === 'function') logSys('<span class="text-red-400">缺少 ' + cfg.n + '。</span>');
      return true; // handled
    }
    var nextTier = cur.tier + 1;
    if (nextTier > 9) return false;
    var pref = (typeof ATTR_ELE_PREFIX !== 'undefined' && ATTR_ELE_PREFIX[ele])
      ? ATTR_ELE_PREFIX[ele]
      : ATTR_ELE_PREFIX_LOCAL[ele];
    if (!pref || !ATTR_AFFIX[pref + nextTier]) return false;

    sc.cnt--;
    if (sc.cnt <= 0) player.inv = player.inv.filter(function (i) { return i.uid !== sc.uid; });
    if (Math.random() < 0.07) {
      item.attr = pref + nextTier;
      var aff = typeof getAttrAffix === 'function' ? getAttrAffix(item.attr) : ATTR_AFFIX[item.attr];
      if (typeof logSys === 'function') {
        logSys('<span class="text-yellow-300 font-bold">賦予屬性成功！</span>碧恩將 <span class="c-attr-' +
          ((typeof attrCanon === 'function') ? attrCanon(item.attr) : item.attr) + '">' +
          (aff ? aff.n : item.attr) + '</span> 之力銘刻於武器 → ' +
          ((typeof getItemFullName === 'function') ? getItemFullName(item) : item.id) +
          '（屬性第' + nextTier + '階：額外傷害+' + (aff ? aff.dmg : ATTR_EN_BONUS[nextTier]) +
          '、額外魔法點數+' + (aff ? aff.mp : ATTR_EN_BONUS[nextTier]) + '）。');
      }
    } else if (typeof logSys === 'function') {
      logSys('<span class="text-slate-400">碧恩：元素之力潰散了……賦予屬性失敗（僅消耗 1 張 ' + cfg.n + '，武器安然無恙）。</span>');
    }
    try { if (typeof calcStats === 'function') calcStats(); } catch (e) {}
    try { if (typeof updateUI === 'function') updateUI(); } catch (e2) {}
    try { if (typeof renderTabs === 'function') renderTabs(true); } catch (e3) {}
    try { if (typeof saveGame === 'function') saveGame(); } catch (e4) {}
    try {
      var el = document.getElementById('interaction-content');
      if (el && typeof renderBianAttr === 'function') renderBianAttr(el);
    } catch (e5) {}
    return true;
  }

  function wrapDoBianAttr() {
    if (typeof window.doBianAttr !== 'function' || window.doBianAttr.__afkGearboost) return false;
    var orig = window.doBianAttr;
    var origNoRelic = wrapIsRelicFalse(orig);
    var wrapped = function (slotKey, ele) {
      if (!on()) return orig.apply(this, arguments);
      try {
        var item = player && player.eq ? player.eq[slotKey] : null;
        var cur = (item && typeof getAttrAffix === 'function') ? getAttrAffix(item.attr) : null;
        var same = !!(cur && cur.ele === ele);
        // 5~8 階同屬性：自己升階到 9，避開原版「≥5 改附加魔法」
        if (same && cur.tier >= 5 && cur.tier < 9) {
          if (tryUpgradeAttrTier(slotKey, ele, cur)) return;
        }
      } catch (e) {}
      return origNoRelic.apply(this, arguments);
    };
    wrapped.__afkGearboost = true;
    window.doBianAttr = wrapped;
    try { doBianAttr = wrapped; } catch (e) {}
    return true;
  }

  function wrapDoEnhance() {
    if (typeof window.doEnhance !== 'function' || window.doEnhance.__afkGearboost) return false;
    var orig = window.doEnhance;
    var wrapped = wrapIsRelicFalse(orig);
    wrapped.__afkGearboost = true;
    window.doEnhance = wrapped;
    try { doEnhance = wrapped; } catch (e) {}
    return true;
  }

  // ── 5) 屬性相剋倍率 ───────────────────────────────────────────────────
  function wrapElementCounter() {
    if (typeof window.elementCounterMult !== 'function' || window.elementCounterMult.__afkGearboost) return false;
    var orig = window.elementCounterMult;
    var wrapped = function (atkEle, defEle) {
      if (!on()) return orig.apply(this, arguments);
      try {
        if (!atkEle || atkEle === 'none' || !defEle || defEle === 'none') return 1.0;
        if (typeof isElementCounter === 'function') {
          if (isElementCounter(atkEle, defEle)) return 1.5;
          if (isElementCounter(defEle, atkEle)) return 0.5;
        }
        return 1.0;
      } catch (e) {
        return orig.apply(this, arguments);
      }
    };
    wrapped.__afkGearboost = true;
    window.elementCounterMult = wrapped;
    try { elementCounterMult = wrapped; } catch (e) {}
    return true;
  }

  // ── 6) 飾品強化額外加成（在核心 +1~+5 之上補 +6~+15；腰帶爆擊吃 full）──
  function applyAccEnhanceExtras(d, p) {
    if (!d || !p || !p.eq) return;
    Object.keys(p.eq).forEach(function (k) {
      var e = p.eq[k];
      if (!e) return;
      var ed = DB.items[e.id];
      if (!ed || ed.type !== 'acc') return;
      var full = Math.min(Number(e.en) || 0, 15);
      if (full <= 0) return;
      var orig = Math.min(full, 5);
      var extra = full - orig;
      if (ed.slot === 'ring') {
        if (extra > 0) d.ac -= extra;
      } else if (ed.slot === 'amulet') {
        if (extra > 0) d.mr += extra * 3;
      } else if (ed.slot === 'ear') {
        if (extra > 0) d.mr += extra * 2;
      } else if (ed.slot === 'belt') {
        d.meleeCrit = (d.meleeCrit || 0) + full;
        d.rangedCrit = (d.rangedCrit || 0) + full;
        d.magicCrit = (d.magicCrit || 0) + full;
      }
    });
  }

  function wrapRecompute() {
    var hooked = false;
    if (typeof window.recomputeStats === 'function' && !window.recomputeStats.__afkGearboost) {
      var origR = window.recomputeStats;
      var wrapR = function () {
        origR.apply(this, arguments);
        if (!on()) return;
        try {
          if (typeof player !== 'undefined' && player && player.d) applyAccEnhanceExtras(player.d, player);
        } catch (e) {}
      };
      wrapR.__afkGearboost = true;
      window.recomputeStats = wrapR;
      try { recomputeStats = wrapR; } catch (e) {}
      hooked = true;
    }
    if (typeof window.calcStats === 'function' && !window.calcStats.__afkGearboost) {
      var origC = window.calcStats;
      var wrapC = function () {
        // calcStats = recomputeStats + UI；若 recompute 已包過會自動套用。
        // 若只有 calcStats 可包，這裡補一次。
        origC.apply(this, arguments);
        if (!on()) return;
        if (window.recomputeStats && window.recomputeStats.__afkGearboost) return;
        try {
          if (typeof player !== 'undefined' && player && player.d) applyAccEnhanceExtras(player.d, player);
        } catch (e) {}
      };
      wrapC.__afkGearboost = true;
      window.calcStats = wrapC;
      try { calcStats = wrapC; } catch (e2) {}
      hooked = true;
    }
    return hooked;
  }

  // ── 7) loadGame：還原被硬夾 >+15 的武器 ───────────────────────────────
  function snapshotHighWpnEn(p) {
    var snap = { inv: [], eq: {}, allies: [] };
    if (!p) return snap;
    (p.inv || []).forEach(function (it) {
      var en = null;
      try {
        if (it && DB.items[it.id] && DB.items[it.id].type === 'wpn') {
          var v = Number(it.en) || 0;
          if (v > 15) en = v;
        }
      } catch (e) {}
      snap.inv.push(en);
    });
    if (p.eq) {
      Object.keys(p.eq).forEach(function (k) {
        var it = p.eq[k];
        try {
          if (it && DB.items[it.id] && DB.items[it.id].type === 'wpn') {
            var v = Number(it.en) || 0;
            if (v > 15) snap.eq[k] = v;
          }
        } catch (e2) {}
      });
    }
    (p.allies || []).forEach(function (a, ai) {
      var ae = {};
      if (a && a.eq) {
        Object.keys(a.eq).forEach(function (k) {
          var it = a.eq[k];
          try {
            if (it && DB.items[it.id] && DB.items[it.id].type === 'wpn') {
              var v = Number(it.en) || 0;
              if (v > 15) ae[k] = v;
            }
          } catch (e3) {}
        });
      }
      snap.allies[ai] = ae;
    });
    return snap;
  }

  function restoreHighWpnEn(p, snap) {
    if (!p || !snap) return;
    (p.inv || []).forEach(function (it, i) {
      if (it && snap.inv[i] != null) it.en = snap.inv[i];
    });
    if (p.eq && snap.eq) {
      Object.keys(snap.eq).forEach(function (k) {
        if (p.eq[k]) p.eq[k].en = snap.eq[k];
      });
    }
    (p.allies || []).forEach(function (a, ai) {
      var ae = snap.allies[ai];
      if (!a || !a.eq || !ae) return;
      Object.keys(ae).forEach(function (k) {
        if (a.eq[k]) a.eq[k].en = ae[k];
      });
    });
  }

  function wrapLoadGame() {
    if (typeof window.loadGame !== 'function' || window.loadGame.__afkGearboost) return false;
    var orig = window.loadGame;
    var wrapped = function () {
      var snap = null;
      if (on()) {
        try {
          if (typeof _lzGet === 'function' && typeof _saveUnwrap === 'function' && typeof currentSlot !== 'undefined') {
            var _u = _saveUnwrap(_lzGet('lineage_idle_save_' + currentSlot));
            if (_u && _u.payload) {
              var data = JSON.parse(_u.payload);
              if (data && data.p) snap = snapshotHighWpnEn(data.p);
            }
          }
        } catch (e) { snap = null; }
      }
      var ret = orig.apply(this, arguments);
      if (on() && snap && typeof player !== 'undefined' && player) {
        try {
          restoreHighWpnEn(player, snap);
          if (typeof calcStats === 'function') calcStats();
        } catch (e2) {}
      }
      return ret;
    };
    wrapped.__afkGearboost = true;
    window.loadGame = wrapped;
    try { loadGame = wrapped; } catch (e) {}
    return true;
  }

  function init() {
    if (!on()) {
      try { console.log('[AFK-gearboost] disabled at load — skip patches'); } catch (e) {}
      // 仍掛 runtime hooks，之後面板打開也能生效（DB 遺物／cap 需再開一次頁）
    }
    var relics = 0;
    if (on()) {
      relics = patchRelics();
      patchEnhanceCaps();
      patchAttrEnBonus();
    }
    var h1 = wrapDoBianAttr();
    var h2 = wrapDoEnhance();
    var h3 = wrapElementCounter();
    var h4 = wrapRecompute();
    var h5 = wrapLoadGame();
    try {
      console.log('[AFK-gearboost] hooks OK — relics=' + relics +
        ' bian=' + h1 + ' enh=' + h2 + ' elem=' + h3 + ' stats=' + h4 + ' load=' + h5 +
        ' | CAP wpn/arm/acc=20/15/15 | 相剋 1.5/0.5 | ATTR 1~9');
    } catch (e2) {}
  }

  // 核心腳本在本外掛之前已載完；延一拍確保 const 函式已掛上 window
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 0); });
  } else {
    setTimeout(init, 0);
  }
})();
