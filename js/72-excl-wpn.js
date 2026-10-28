// ===== ab.20261026f／ab.20261027c 專武（SR/SSR）· 轉蛋 · 專武碎片升星 · 技能質變 · 專武庫 =====
// 英雄碎片（hero.fragments）同專武碎片（ab.exclWpn[defId].fragments）完全分開，唔互通。
(function () {
'use strict';

var CLS_WPN_NAME = {
  knight: '誓盾', royal: '權杖', elf: '靈弓', illusion: '虛鏡',
  warrior: '戰斧', mage: '魔杖', dark: '影刃', dragon: '龍槍'
};
var CLS_FX = {
  knight:   { def: 28, hpP: 0.12, shield0: 0.08 },
  royal:    { spP: 0.22, mana0: 18, hpP: 0.08 },
  elf:      { atkP: 0.18, asP: 0.12 },
  illusion: { spP: 0.28, mana0: 22 },
  warrior:  { atkP: 0.28, asP: 0.08 },
  mage:     { atkP: 0.22, spP: 0.18 },
  dark:     { atkP: 0.26, crit: 0.08 },
  dragon:   { atkP: 0.20, hpP: 0.14 }
};
// 職業向英雄永久星質變說明（≥3★）；戰鬥邏輯喺 70 applySkillQual
var CLS_PERM_AWAKEN = {
  knight:   { 3: '嘲諷時為相鄰隊友加 8% HP 護盾', 4: '嘲諷範圍敵人短暫減速 2 秒', 5: '自身護盾量 ×1.35' },
  royal:    { 3: '回復時淨化目標', 4: '全隊攻擊加成改 +22%', 5: '再為最低 HP 隊友加 10% HP 護盾' },
  elf:      { 3: '箭數 +1（水元素：治療量 ×1.25）', 4: '箭矢附帶短暫減速', 5: '主目標額外 0.4×攻' },
  illusion: { 3: '暈眩時間 +0.6 秒', 4: '多鎖定 1 個目標', 5: '命中後令目標能量 −20' },
  warrior:  { 3: '旋風斬附帶 2 秒減速', 4: '對主目標追加 0.5×攻', 5: '擊中回 8% 傷害為治療' },
  mage:     { 3: '火球中心附加燃燒 3 秒', 4: '爆炸半徑視為 +0（外圈傷害不衰減）', 5: '施放後回 15 能量' },
  dark:     { 3: '吸血比例 +10%（絕對）', 4: '突襲後對同目標追加 0.6×攻', 5: '無敵時間 +0.4 秒' },
  dragon:   { 3: '燃燒每秒傷害 ×1.4', 4: '龍息範圍敵人短暫暈 0.6 秒', 5: '自身獲得 12% HP 護盾' }
};
// 專武 3★+ 技能質變（key=defId）；冇定義就用職業預設
var WPN_AWAKEN = {
  hero_isolde_knight:    { 3: '銀誓壁壘：全隊護盾 ×1.25，並為最低 HP 隊友額外 +6% HP 護盾', 4: '嘲諷持續 +1 秒', 5: '施放後自身物防 +20，5 秒' },
  hero_aurelia_royal:    { 3: '王權聖光：治療量 ×1.3，並淨化全隊', 4: '攻擊加成改 +40%', 5: '全隊開場能量 +10（本技能後）' },
  hero_morgana_illusion: { 3: '虛像都城：暈眩 ×1.4，並對攻擊最高 2 敵追加 0.5×攻', 4: '全場敵人減速 2 秒', 5: '命中後自身回 25 能量' },
  hero_skaldi_warrior:   { 3: '北境斧王：傷害 ×1.2，吸血改 40%', 4: '範圍擴至 2 格', 5: '擊殺回復 12% 最大 HP' },
  hero_umbra_dark:       { 3: '暗影突襲：必爆傷害 ×1.15，並降低目標物防 12，4 秒', 4: '追加第二擊 0.7×攻', 5: '吸血滿溢轉護盾 ×1.5' },
  hero_ignara_dragon:    { 3: '龍息：燃燒改為 4 秒，並附加恐懼（攻 −15%，3 秒）', 4: '主目標額外 0.8×攻', 5: '龍息後自身攻速 +20%，3 秒' },
  hero_ignis_mage:       { 3: '爆炎：中心必燃，外圈傷害不衰減', 4: '火球再彈射最近另一群 0.7×', 5: '施放後技能加成 +25%，5 秒' },
  hero_terrae_elf:       { 3: '三重矢：+1 箭，並對命中者施加岩牢（減速 2.5 秒）', 4: '主目標追加 0.5×攻岩擊', 5: '自身獲得 10% HP 護盾' }
};
var CLS_WPN_AWAKEN = {
  knight:   { 3: '嘲諷附帶反傷屏障（反彈 15% 近戰，3 秒）', 4: '護盾量 ×1.2', 5: '相鄰隊友物防 +12，4 秒' },
  royal:    { 3: '回復時為目標加 8% HP 護盾', 4: '全隊回復量 ×1.15', 5: '攻擊加成持續 +1 秒' },
  elf:      { 3: '箭矢附帶撕裂（每秒 0.1×攻，3 秒）', 4: '箭數再 +1', 5: '對殘血（<40%）目標傷害 ×1.25' },
  illusion: { 3: '命中者普攻命中 −20%，3 秒', 4: '暈眩目標受到傷害 +10%，3 秒', 5: '額外暈 1 個隨機敵 0.8 秒' },
  warrior:  { 3: '旋風斬擊退感：主目標暈 0.5 秒', 4: '範圍傷害 ×1.15', 5: '每擊中 1 敵回 5 能量' },
  mage:     { 3: '火球爆炸後留餘燼（範圍每秒 0.12×攻，2 秒）', 4: '魔傷穿透：無視 15% 魔防（近似多傷）', 5: '雙重詠唱：50% 再放一發 0.6×' },
  dark:     { 3: '突襲後隱匿：下 2 秒暴擊 +20%', 4: '目標流血 3 秒', 5: '擊殺刷新無敵' },
  dragon:   { 3: '龍息附帶破甲（物防 −10，4 秒）', 4: '燃燒可疊 2 層', 5: '龍息治療自身 20% 造成傷害' }
};

// 具名覆寫（開放池＋主要 SSR）
var EXCL_NAMED = {
  hero_isolde_knight:    { n: '銀誓聖盾', fx: { def: 40, shield0: 0.16, hpP: 0.10 } },
  hero_aurelia_royal:    { n: '王權權杖', fx: { spP: 0.40, mana0: 30, hpP: 0.08 } },
  hero_morgana_illusion: { n: '虛像之瞳', fx: { spP: 0.35, mana0: 35 } },
  hero_skaldi_warrior:   { n: '北境斧王之斧', fx: { atkP: 0.35, asP: 0.15 } },
  hero_umbra_dark:       { n: '縫影雙刃', fx: { atkP: 0.30, crit: 0.10 } },
  hero_ignara_dragon:    { n: '赤鱗焰槍', fx: { atkP: 0.26, hpP: 0.12 } },
  hero_ignis_mage:       { n: '熾核法杖', fx: { atkP: 0.24, spP: 0.22 } },
  hero_terrae_elf:       { n: '岩根長弓', fx: { atkP: 0.20, asP: 0.10, def: 8 } },
  hero_cassia_knight:    { n: '十二門盾', fx: { def: 32, hpP: 0.14, shield0: 0.10 } },
  hero_viviane_knight:   { n: '聖光守護盾', fx: { def: 30, hpP: 0.12, shield0: 0.10 } },
  hero_ophelia_royal:    { n: '宮廷指揮杖', fx: { spP: 0.24, mana0: 20, hpP: 0.08 } },
  hero_iris_illusion:    { n: '虹彩虛鏡', fx: { spP: 0.30, mana0: 24 } },
  hero_thyra_warrior:    { n: '戰嚎雙斧', fx: { atkP: 0.30, asP: 0.10 } },
  hero_sylwen_elf:       { n: '世界樹葉弓', fx: { atkP: 0.28, asP: 0.14 } },
  hero_circe_mage:       { n: '獄炎座冠杖', fx: { atkP: 0.30, spP: 0.25 } },
  hero_nocturne_dark:    { n: '無月女帝刃', fx: { atkP: 0.32, crit: 0.12 } },
  hero_wyrmia_dragon:    { n: '古龍血槍', fx: { atkP: 0.28, hpP: 0.16 } }
};

function buildExclDb() {
  var out = {}, HD = (typeof HERO_DB !== 'undefined' && HERO_DB) || {};
  Object.keys(HD).forEach(function (id) {
    var d = HD[id]; if (!d) return;
    var r = String(d.rarity || '').toUpperCase();
    if (r !== 'SR' && r !== 'SSR') return;
    var named = EXCL_NAMED[id];
    var fx = named && named.fx ? named.fx : Object.assign({}, CLS_FX[d.cls] || CLS_FX.knight);
    if (r === 'SSR' && !(named && named.fx)) {
      // SSR 略強
      Object.keys(fx).forEach(function (k) {
        if (typeof fx[k] === 'number') fx[k] = Math.round(fx[k] * (k === 'mana0' || k === 'def' ? 1.25 : 1.18) * 1000) / 1000;
      });
    }
    var n = (named && named.n) || ((d.name || id) + '的' + (CLS_WPN_NAME[d.cls] || '專武'));
    out[id] = {
      n: n,
      forDef: id,
      rarity: r,
      cls: d.cls,
      fx: fx,
      awaken: WPN_AWAKEN[id] || CLS_WPN_AWAKEN[d.cls] || CLS_WPN_AWAKEN.knight,
      heroName: d.name || id
    };
  });
  return out;
}

var EXCL;
(function syncExcl() {
  var built = buildExclDb();
  var prev = window.AB_EXCL;
  if (prev && typeof prev === 'object') {
    Object.keys(prev).forEach(function (k) { delete prev[k]; });
    Object.keys(built).forEach(function (k) { prev[k] = built[k]; });
    EXCL = prev;
  } else {
    EXCL = window.AB_EXCL = built;
  }
})();
var EXCL_DEFAULT = window.AB_EXCL_DEFAULT = window.AB_EXCL_DEFAULT || { fx: { atkP: 0.20, hpP: 0.20 } };

// —— 存檔：專武獨立庫（同英雄碎片分開）——
function ensureExclBag(p) {
  p = p || (typeof player !== 'undefined' ? player : null);
  if (!p) return null;
  if (!p.ab || typeof p.ab !== 'object') p.ab = {};
  if (!p.ab.exclWpn || typeof p.ab.exclWpn !== 'object') p.ab.exclWpn = {};
  return p.ab.exclWpn;
}
function exclRec(defId) {
  var bag = ensureExclBag(); if (!bag || !defId) return null;
  if (!bag[defId]) bag[defId] = { owned: false, star: 0, fragments: 0, equipped: true };
  var r = bag[defId];
  r.star = Math.max(0, Math.min(5, Math.floor(Number(r.star) || 0)));
  r.fragments = Math.max(0, Math.floor(Number(r.fragments) || 0));
  if (r.equipped == null) r.equipped = true;
  return r;
}
function exclOwned(defId) { var r = exclRec(defId); return !!(r && r.owned); }
function exclStar(defId) { var r = exclRec(defId); return r && r.owned ? (r.star || 0) : 0; }
function exclFrags(defId) { var r = exclRec(defId); return r ? (r.fragments || 0) : 0; }
function exclEquipped(defId) { var r = exclRec(defId); return !!(r && r.owned && r.equipped !== false); }

var WPN_STAR_COST_BASE = [15, 40, 80, 150, 250];
var WPN_STAR_COST_MUL = { SR: 1.0, SSR: 1.35 };
var WPN_FRAG_GAIN = { SR: 15, SSR: 25 };
var WPN_GACHA = { srW: 80, ssrW: 20, pitySsr: 60, ticketGold: 800, exchangeHeroTk: 3 };

function wpnStarCost(defIdOrRarity, fromStar) {
  var rarity, star;
  if (defIdOrRarity && EXCL[defIdOrRarity]) {
    rarity = EXCL[defIdOrRarity].rarity;
    var r = exclRec(defIdOrRarity);
    star = r ? r.star : 0;
  } else {
    rarity = String(defIdOrRarity || 'SR').toUpperCase();
    star = Math.max(0, Math.min(5, Math.floor(Number(fromStar) || 0)));
  }
  if (star >= 5) return null;
  var base = WPN_STAR_COST_BASE[star];
  if (base == null) return null;
  var mul = WPN_STAR_COST_MUL[rarity] != null ? WPN_STAR_COST_MUL[rarity] : 1;
  return Math.max(1, Math.round(base * mul));
}

function wpnBreakthrough(defId) {
  if (!EXCL[defId]) return { ok: false, msg: '冇呢把專武' };
  var r = exclRec(defId);
  if (!r || !r.owned) return { ok: false, msg: '未擁有呢把專武' };
  if (r.star >= 5) return { ok: false, msg: '專武已達最高 5★' };
  var cost = wpnStarCost(defId);
  if (cost == null || r.fragments < cost) return { ok: false, msg: '專武碎片不足（要 ' + cost + '，而家 ' + (r.fragments || 0) + '）' };
  r.fragments -= cost;
  r.star += 1;
  try {
    if (typeof logSys === 'function') {
      logSys('<span class="text-violet-300">⚔️ 「' + EXCL[defId].n + '」專武碎片突破 → ' + r.star + '★（消耗專武碎片 ' + cost + '，剩 ' + r.fragments + '）' + (r.star >= 3 ? ' · 技能質變已解鎖' : '') + '</span>');
    }
  } catch (e) {}
  try { if (typeof saveGame === 'function') saveGame(); } catch (e2) {}
  return { ok: true, defId: defId, star: r.star, cost: cost, fragments: r.fragments };
}

function grantExclWpn(defId, opts) {
  opts = opts || {};
  if (!EXCL[defId]) return { ok: false, msg: '無效專武' };
  var r = exclRec(defId);
  var e = EXCL[defId];
  var fragGain = WPN_FRAG_GAIN[e.rarity] || 15;
  if (r.owned) {
    r.fragments += fragGain;
    try {
      if (typeof logSys === 'function') {
        logSys('<span class="text-amber-300">重複專武「' + e.n + '」→ 專武碎片 +' + fragGain + '（而家 ' + r.fragments + '）。唔會變成英雄碎片。</span>');
      }
    } catch (e0) {}
    try { if (typeof saveGame === 'function') saveGame(); } catch (e1) {}
    return { ok: true, duplicate: true, defId: defId, fragments: fragGain, entry: r, excl: e };
  }
  r.owned = true;
  r.star = Math.max(0, Math.floor(Number(opts.star) || 0));
  r.equipped = true;
  try {
    if (typeof logSys === 'function') {
      logSys('<span class="text-emerald-300">獲得專武：「' + e.n + '」（' + e.rarity + '・' + (e.heroName || '') + '）· 已自動裝備</span>');
    }
  } catch (e2) {}
  try { if (typeof saveGame === 'function') saveGame(); } catch (e3) {}
  return { ok: true, duplicate: false, defId: defId, fragments: 0, entry: r, excl: e };
}

function setExclEquipped(defId, on) {
  var r = exclRec(defId);
  if (!r || !r.owned) return false;
  r.equipped = !!on;
  try { if (typeof saveGame === 'function') saveGame(); } catch (e) {}
  return true;
}

// —— 專武券（同英雄招募券分開）——
function ensureWpnGacha(p) {
  p = p || (typeof player !== 'undefined' ? player : null);
  if (!p) return null;
  if (!p.gacha || typeof p.gacha !== 'object') p.gacha = {};
  if (p.gacha.wpnTickets == null) p.gacha.wpnTickets = 0;
  if (p.gacha.wpnPitySsr == null) p.gacha.wpnPitySsr = 0;
  if (!Array.isArray(p.gacha.wpnHist)) p.gacha.wpnHist = [];
  return p.gacha;
}
function wpnTickets() { var g = ensureWpnGacha(); return g ? (g.wpnTickets || 0) : 0; }
function payWpnTickets(n) {
  if (!n || n < 0) return 0;
  var g = ensureWpnGacha(); if (!g) return 0;
  g.wpnTickets = (g.wpnTickets || 0) + n;
  return n;
}
function openWpnPool(rarity) {
  var wl = (window.AB_WL && Array.isArray(window.AB_WL.heroes)) ? window.AB_WL.heroes : null;
  return Object.keys(EXCL).filter(function (id) {
    if (rarity && EXCL[id].rarity !== rarity) return false;
    if (wl && wl.indexOf(id) < 0) return false;
    return true;
  });
}
function wpnRollRarity(g) {
  g = g || ensureWpnGacha();
  var pity = (g.wpnPitySsr || 0) + 1;
  if (pity >= WPN_GACHA.pitySsr) return 'SSR';
  var roll = Math.random() * (WPN_GACHA.srW + WPN_GACHA.ssrW);
  return roll < WPN_GACHA.ssrW ? 'SSR' : 'SR';
}
function wpnGachaPullOne() {
  var g = ensureWpnGacha();
  if (!g) return { ok: false, msg: '未登入' };
  if ((g.wpnTickets || 0) < 1) return { ok: false, msg: '專武券不足（持有 ' + (g.wpnTickets || 0) + '）' };
  g.wpnTickets -= 1;
  var rarity = wpnRollRarity(g);
  if (rarity === 'SSR') g.wpnPitySsr = 0; else g.wpnPitySsr = (g.wpnPitySsr || 0) + 1;
  var pool = openWpnPool(rarity);
  if (!pool.length) { pool = openWpnPool(rarity === 'SSR' ? 'SR' : 'SSR'); if (pool.length) rarity = EXCL[pool[0]].rarity; }
  if (!pool.length) { g.wpnTickets += 1; return { ok: false, msg: '專武池係空嘅（白名單未有 SR/SSR）' }; }
  var defId = pool[Math.floor(Math.random() * pool.length)];
  var got = grantExclWpn(defId);
  var entry = {
    at: Date.now(), defId: defId, rarity: rarity,
    name: EXCL[defId].n, hero: EXCL[defId].heroName,
    duplicate: !!(got && got.duplicate), fragments: got && got.fragments || 0
  };
  g.wpnHist = (g.wpnHist || []).concat([entry]).slice(-80);
  try { if (typeof saveGame === 'function') saveGame(); } catch (e) {}
  return { ok: true, rarity: rarity, defId: defId, result: got, entry: entry, tickets: g.wpnTickets };
}
function wpnGachaPullMany(n) {
  n = Math.max(1, Math.min(100, Math.floor(Number(n) || 1)));
  var out = [];
  for (var i = 0; i < n; i++) {
    var r = wpnGachaPullOne();
    out.push(r);
    if (!r.ok) break;
  }
  return out;
}
function buyWpnTicketGold(n) {
  n = Math.max(1, Math.min(50, Math.floor(Number(n) || 1)));
  if (typeof player === 'undefined' || !player) return { ok: false, msg: '未登入' };
  var cost = WPN_GACHA.ticketGold * n;
  if ((player.gold || 0) < cost) return { ok: false, msg: '金幣不足（要 ' + cost + '）' };
  player.gold -= cost;
  payWpnTickets(n);
  try { if (typeof saveGame === 'function') saveGame(); } catch (e) {}
  return { ok: true, n: n, gold: cost, tickets: wpnTickets() };
}
function exchangeHeroToWpnTickets(n) {
  n = Math.max(1, Math.min(20, Math.floor(Number(n) || 1)));
  var need = WPN_GACHA.exchangeHeroTk * n;
  if (typeof player === 'undefined' || !player) return { ok: false, msg: '未登入' };
  player.gacha = player.gacha || {};
  if ((player.gacha.tickets || 0) < need) return { ok: false, msg: '英雄招募券不足（要 ' + need + '）' };
  player.gacha.tickets -= need;
  payWpnTickets(n);
  try { if (typeof saveGame === 'function') saveGame(); } catch (e) {}
  return { ok: true, n: n, spentHeroTk: need, tickets: wpnTickets() };
}

function exclFxFor(defId) {
  if (!exclEquipped(defId)) return null;
  var e = EXCL[defId] || EXCL_DEFAULT;
  var st = exclStar(defId);
  var fx = Object.assign({}, e.fx || {});
  var mul = 1 + st * 0.06; // 每星屬性略升
  Object.keys(fx).forEach(function (k) {
    if (typeof fx[k] === 'number' && k !== 'ele') fx[k] = Math.round(fx[k] * mul * 1000) / 1000;
  });
  return fx;
}

function awakenText(defId, star) {
  star = star || exclStar(defId);
  var e = EXCL[defId]; if (!e) return '';
  var a = e.awaken || {};
  var best = '';
  [3, 4, 5].forEach(function (s) { if (star >= s && a[s]) best = a[s]; });
  return best;
}
function permAwakenText(cls, permStar) {
  var a = CLS_PERM_AWAKEN[cls] || {};
  var best = '';
  [3, 4, 5].forEach(function (s) { if (permStar >= s && a[s]) best = a[s]; });
  return best;
}

// 公開

function listOwnedExcl() {
  var bag = ensureExclBag();
  var out = [];
  if (!bag) return out;
  Object.keys(bag).forEach(function (id) {
    var r = bag[id];
    if (!r || !r.owned) return;
    var e = EXCL[id];
    if (!e) return;
    out.push({
      defId: id,
      name: e.n,
      rarity: e.rarity || 'SR',
      heroName: e.heroName || '',
      star: r.star || 0,
      fragments: r.fragments || 0,
      equipped: r.equipped !== false
    });
  });
  var ord = { SSR: 1, SR: 2 };
  out.sort(function (a, b) {
    return ((ord[a.rarity] || 9) - (ord[b.rarity] || 9)) || String(a.name || '').localeCompare(String(b.name || ''));
  });
  return out;
}

window.AB_WPN = {
  EXCL: EXCL,
  CLS_PERM_AWAKEN: CLS_PERM_AWAKEN,
  rebuild: function () { var built = buildExclDb(); var prev = window.AB_EXCL; if (prev && typeof prev === 'object') { Object.keys(prev).forEach(function (k) { delete prev[k]; }); Object.keys(built).forEach(function (k) { prev[k] = built[k]; }); EXCL = prev; } else { EXCL = window.AB_EXCL = built; } window.AB_WPN.EXCL = EXCL; return EXCL; },
  ensureBag: ensureExclBag,
  rec: exclRec,
  owned: exclOwned,
  star: exclStar,
  frags: exclFrags,
  equipped: exclEquipped,
  setEquipped: setExclEquipped,
  fxFor: exclFxFor,
  starCost: wpnStarCost,
  breakthrough: wpnBreakthrough,
  grant: grantExclWpn,
  awakenText: awakenText,
  permAwakenText: permAwakenText,
  tickets: wpnTickets,
  payTickets: payWpnTickets,
  ensureGacha: ensureWpnGacha,
  pull: wpnGachaPullOne,
  pullMany: wpnGachaPullMany,
  buyGold: buyWpnTicketGold,
  exchange: exchangeHeroToWpnTickets,
  FRAG_GAIN: WPN_FRAG_GAIN,
  STAR_COST_BASE: WPN_STAR_COST_BASE,
  GACHA: WPN_GACHA,
  openPool: openWpnPool,
  listOwned: listOwnedExcl
};

try { console.info('[ab] 72-excl-wpn ready · 專武 ' + Object.keys(EXCL).length + ' 把'); } catch (e) {}
})();
