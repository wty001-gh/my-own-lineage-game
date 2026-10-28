// ===== ab.20261028o 專屬三件套（武器＋防具＋飾品）· 共用碎片 · 套裝質變 · 職業卷取得 · 新號 100 抽 =====
// 依賴 js/72-excl-wpn.js（AB_WPN／AB_EXCL）。武器沿用專武；防具／飾品只數值；三件齊先開套裝質變（固定數字，唔跟平均★）。
(function () {
'use strict';

var SLOTS = ['weapon', 'armor', 'accessory'];
var SLOT_W = { weapon: 40, armor: 30, accessory: 30 };
var SLOT_LB = { weapon: '武器', armor: '防具', accessory: '飾品' };
var ARM_STAR_STAT = 0.08; // 防具／飾品每★ +8% 數值
var WPN_STAR_STAT = 0.06; // 武器沿用 72 的每星略升

// —— 職業模板（Excel「職業數值模板」）——
var CLS_ARM = {
  knight:   { def: 20, hpP: 0.10 },
  royal:    { hpP: 0.12, def: 8 },
  elf:      { hpP: 0.08, def: 6 },
  illusion: { hpP: 0.08, mr: 10 },
  warrior:  { hpP: 0.12, def: 10 },
  mage:     { hpP: 0.06, mr: 12 },
  dark:     { hpP: 0.08, def: 6 },
  dragon:   { hpP: 0.14, def: 10 }
};
var CLS_ACC = {
  knight:   { mr: 8, shield0: 0.05 },
  royal:    { mana0: 15, mr: 6 },
  elf:      { asP: 0.08, mr: 4 },
  illusion: { mana0: 12, spP: 0.08 },
  warrior:  { atkP: 0.08, asP: 0.05 },
  mage:     { mana0: 15, spP: 0.06 },
  dark:     { crit: 0.05, asP: 0.06 },
  dragon:   { mr: 6, hpP: 0.06 }
};
// 套裝質變：固定數字／旗標（三件齊先開；唔乘平均★）
var CLS_SET = {
  knight:   { text: '每秒回復 1% MHP', fx: { regen: 0.01 } },
  royal:    { text: '回復時為目標加 8% HP 護盾', flag: 'healShield' },
  elf:      { text: '元素箭命中 25% 擴散相鄰（0.4×攻）', flag: 'elfSplash' },
  illusion: { text: '暈眩目標受傷 +10%', flag: 'illuVuln' },
  warrior:  { text: '旋風斬每擊中 1 敵回 5 能量', flag: 'warMana' },
  mage:     { text: '火球中心附加燃燒 3 秒', flag: 'mageBurn' },
  dark:     { text: '突襲後下一次攻擊必爆', flag: 'darkNextCrit' },
  dragon:   { text: '龍息燃燒可疊 2 層', flag: 'dragonStackBurn' }
};
var ARM_NAME = { knight: '甲', royal: '袍', elf: '甲', illusion: '袍', warrior: '鎧', mage: '袍', dark: '甲', dragon: '鎧' };
var ACC_NAME = { knight: '戒', royal: '冠', elf: '戒', illusion: '戒', warrior: '戒', mage: '戒', dark: '戒', dragon: '戒' };

// Excel「開放英雄專屬裝」覆寫（舊 16 開；新開 8 用職業模板）
var HERO_PIECE = {
  hero_isolde_knight: {
    armor: { n: '銀誓胸甲', fx: { def: 28, hpP: 0.14 } },
    accessory: { n: '銀誓項鍊', fx: { mr: 12, shield0: 0.08 } },
    set: { text: '使用技能後自身受傷 −20%，3 秒', flag: 'isoldeDr' }
  },
  hero_petra_knight: {
    weapon: { n: '佩特拉之盾', fx: { def: 18, hpP: 0.08 } },
    armor: { n: '佩特拉鎧', fx: { def: 14, hpP: 0.08 } },
    accessory: { n: '佩特拉戒', fx: { mr: 6, hpP: 0.04 } },
    set: { text: '嘲諷持續 +0.5 秒', flag: 'petraTaunt' }
  },
  hero_aurelia_royal: {
    armor: { n: '王權袍', fx: { hpP: 0.16, def: 10 } },
    accessory: { n: '王權冠', fx: { mana0: 20, mr: 10 } },
    set: { text: '回復時淨化目標並加 10% HP 護盾', flag: 'aureliaHeal' }
  },
  hero_celine_royal: {
    weapon: { n: '塞琳權杖', fx: { spP: 0.16, mana0: 12 } },
    armor: { n: '塞琳袍', fx: { hpP: 0.10, def: 6 } },
    accessory: { n: '塞琳冠', fx: { mana0: 10, mr: 6 } },
    set: { text: '全隊攻擊加成持續 +1 秒', flag: 'celineBuff' }
  },
  hero_morgana_illusion: {
    armor: { n: '虛像袍', fx: { hpP: 0.10, mr: 14 } },
    accessory: { n: '虛像戒', fx: { mana0: 18, spP: 0.10 } },
    set: { text: '暈眩 ×1.2 並對攻擊最高者追加 0.5×攻', flag: 'morganaSet' }
  },
  hero_echo_illusion: {
    weapon: { n: '回音之鏡', fx: { spP: 0.18, mana0: 14 } },
    armor: { n: '回音袍', fx: { hpP: 0.08, mr: 8 } },
    accessory: { n: '回音戒', fx: { mana0: 8, spP: 0.06 } },
    set: { text: '命中者 miss +10%，3 秒', flag: 'echoMiss' }
  },
  hero_skaldi_warrior: {
    armor: { n: '北境鎧', fx: { hpP: 0.16, def: 12 } },
    accessory: { n: '北境戒', fx: { atkP: 0.10, asP: 0.08 } },
    set: { text: '旋風斬範圍擴至 2 格', flag: 'skaldiRange' }
  },
  hero_brenna_warrior: {
    weapon: { n: '布蕾娜戰斧', fx: { atkP: 0.20, asP: 0.06 } },
    armor: { n: '布蕾娜鎧', fx: { hpP: 0.10, def: 8 } },
    accessory: { n: '布蕾娜戒', fx: { atkP: 0.06, asP: 0.04 } },
    set: { text: 'HP<50% 時攻速 +10%', flag: 'brennaAs' }
  },
  hero_pyria_elf: {
    weapon: { n: '派莉亞火弓', fx: { atkP: 0.22, asP: 0.10 } },
    armor: { n: '派莉亞甲', fx: { hpP: 0.08, def: 6 } },
    accessory: { n: '派莉亞戒', fx: { asP: 0.08, mr: 4 } },
    set: { text: '燃燒之矢可疊 2 層', flag: 'pyriaBurn' }
  },
  hero_terrae_elf: {
    armor: { n: '岩根甲', fx: { hpP: 0.10, def: 8 } },
    accessory: { n: '岩根戒', fx: { asP: 0.06, def: 4 } },
    set: { text: '箭矢附帶岩牢減速', flag: 'terraeSlow' }
  },
  hero_ignis_mage: {
    armor: { n: '熾核袍', fx: { hpP: 0.06, mr: 14 } },
    accessory: { n: '熾核戒', fx: { mana0: 16, spP: 0.08 } },
    set: { text: '火球中心必燃', flag: 'ignisBurn' }
  },
  hero_sora_mage: {
    weapon: { n: '索拉法杖', fx: { atkP: 0.18, spP: 0.16 } },
    armor: { n: '索拉袍', fx: { hpP: 0.08, mr: 10 } },
    accessory: { n: '索拉戒', fx: { mana0: 12, spP: 0.06 } },
    set: { text: '治療時淨化目標', flag: 'soraCleanse' }
  },
  hero_umbra_dark: {
    armor: { n: '縫影甲', fx: { hpP: 0.08, def: 6 } },
    accessory: { n: '縫影戒', fx: { crit: 0.06, asP: 0.06 } },
    set: { text: '突襲後追加第二擊', flag: 'umbraDouble' }
  },
  hero_nyx_dark: {
    weapon: { n: '倪克斯刃', fx: { atkP: 0.18, crit: 0.06 } },
    armor: { n: '倪克斯甲', fx: { hpP: 0.06, def: 5 } },
    accessory: { n: '倪克斯戒', fx: { crit: 0.04, asP: 0.04 } },
    set: { text: '突襲後短時間攻速 +10%', flag: 'nyxAs' }
  },
  hero_ignara_dragon: {
    armor: { n: '赤鱗鎧', fx: { hpP: 0.14, def: 10 } },
    accessory: { n: '赤鱗戒', fx: { mr: 6, hpP: 0.06 } },
    set: { text: '燃燒改 4 秒並附恐懼', flag: 'ignaraFear' }
  },
  hero_cinder_dragon: {
    weapon: { n: '辛德槍', fx: { atkP: 0.16, hpP: 0.10 } },
    armor: { n: '辛德鎧', fx: { hpP: 0.10, def: 8 } },
    accessory: { n: '辛德戒', fx: { mr: 4, hpP: 0.04 } },
    set: { text: '龍息附帶短暫減速', flag: 'cinderSlow' }
  }
};

var GACHA = {
  pitySsr: 60,
  srW: 80, ssrW: 20,
  slotW: SLOT_W,
  classEquipPitySr: 20,
  ticketGold: 800,
  exchangeHeroTk: 3,
  exchangeClsEquipCost: 5,  // 5 專屬裝備券 → 1 自選職業裝備券
  exchangeClsHeroCost: 3    // 3 英雄招募券 → 1 自選職業英雄券
};

function openHeroIds() {
  var wl = (window.AB_WL && Array.isArray(window.AB_WL.heroes)) ? window.AB_WL.heroes.slice() : [];
  if (!wl.length && window.HERO_DB) wl = Object.keys(HERO_DB);
  return wl;
}
function heroDef(id) {
  var HD = (typeof HERO_DB !== 'undefined' && HERO_DB) || window.HERO_DB || {};
  return HD[id] || null;
}
function scaleFx(fx, mul) {
  var out = Object.assign({}, fx || {});
  Object.keys(out).forEach(function (k) {
    if (typeof out[k] === 'number' && k !== 'ele') out[k] = Math.round(out[k] * mul * 1000) / 1000;
  });
  return out;
}

// —— 零件資料庫：每個開放英雄 × 三部位 ——
var PIECES = {}; // key = defId + ':' + slot
function pieceKey(defId, slot) { return defId + ':' + slot; }
function buildPieces() {
  var out = {}, ids = openHeroIds();
  ids.forEach(function (id) {
    var d = heroDef(id); if (!d) return;
    var r = String(d.rarity || 'N').toUpperCase();
    var cls = d.cls || 'knight';
    var named = HERO_PIECE[id] || {};
    var wEx = (window.AB_EXCL && AB_EXCL[id]) || null;
    // weapon：優先 72 具名／EXCL；N/R 用 HERO_PIECE.weapon 或職業 CLS_FX
    var wFx, wN;
    if (wEx) { wFx = Object.assign({}, wEx.fx || {}); wN = wEx.n; }
    else if (named.weapon) { wFx = Object.assign({}, named.weapon.fx); wN = named.weapon.n; }
    else {
      var CLS_FX = { knight: { def: 28, hpP: 0.12, shield0: 0.08 }, royal: { spP: 0.22, mana0: 18, hpP: 0.08 }, elf: { atkP: 0.18, asP: 0.12 }, illusion: { spP: 0.28, mana0: 22 }, warrior: { atkP: 0.28, asP: 0.08 }, mage: { atkP: 0.22, spP: 0.18 }, dark: { atkP: 0.26, crit: 0.08 }, dragon: { atkP: 0.20, hpP: 0.14 } };
      wFx = Object.assign({}, CLS_FX[cls] || CLS_FX.knight);
      if (r === 'N') wFx = scaleFx(wFx, 0.7);
      else if (r === 'R') wFx = scaleFx(wFx, 0.85);
      wN = (d.name || id) + '的' + ({ knight: '誓盾', royal: '權杖', elf: '靈弓', illusion: '虛鏡', warrior: '戰斧', mage: '魔杖', dark: '影刃', dragon: '龍槍' }[cls] || '專武');
    }
    out[pieceKey(id, 'weapon')] = { defId: id, slot: 'weapon', n: wN, fx: wFx, rarity: r, cls: cls, heroName: d.name || id, awaken: (wEx && wEx.awaken) || null };
    var aFx = (named.armor && named.armor.fx) ? Object.assign({}, named.armor.fx) : Object.assign({}, CLS_ARM[cls] || CLS_ARM.knight);
    var aN = (named.armor && named.armor.n) || ((d.name || id) + (ARM_NAME[cls] || '甲'));
    if (!named.armor) {
      if (r === 'SSR') aFx = scaleFx(aFx, 1.2);
      else if (r === 'SR') aFx = scaleFx(aFx, 1.05);
      else if (r === 'N') aFx = scaleFx(aFx, 0.75);
    }
    out[pieceKey(id, 'armor')] = { defId: id, slot: 'armor', n: aN, fx: aFx, rarity: r, cls: cls, heroName: d.name || id };
    var cFx = (named.accessory && named.accessory.fx) ? Object.assign({}, named.accessory.fx) : Object.assign({}, CLS_ACC[cls] || CLS_ACC.knight);
    var cN = (named.accessory && named.accessory.n) || ((d.name || id) + (ACC_NAME[cls] || '戒'));
    if (!named.accessory) {
      if (r === 'SSR') cFx = scaleFx(cFx, 1.2);
      else if (r === 'SR') cFx = scaleFx(cFx, 1.05);
      else if (r === 'N') cFx = scaleFx(cFx, 0.75);
    }
    out[pieceKey(id, 'accessory')] = { defId: id, slot: 'accessory', n: cN, fx: cFx, rarity: r, cls: cls, heroName: d.name || id };
  });
  PIECES = out;
  return out;
}
buildPieces();

function setAwakenOf(defId) {
  var named = HERO_PIECE[defId];
  if (named && named.set) return named.set;
  var d = heroDef(defId);
  return CLS_SET[(d && d.cls) || 'knight'] || CLS_SET.knight;
}

// —— 存檔：每英雄共用碎片 + 三部位 ——
function ensureGearBag(p) {
  p = p || (typeof player !== 'undefined' ? player : null);
  if (!p) return null;
  if (!p.ab || typeof p.ab !== 'object') p.ab = {};
  if (!p.ab.exclGear || typeof p.ab.exclGear !== 'object') p.ab.exclGear = {};
  migrateFromWpn(p);
  return p.ab.exclGear;
}
function emptySlot() { return { owned: false, star: 0, equipped: true }; }
function gearRec(defId) {
  var bag = ensureGearBag(); if (!bag || !defId) return null;
  if (!bag[defId]) bag[defId] = { fragments: 0, weapon: emptySlot(), armor: emptySlot(), accessory: emptySlot() };
  var r = bag[defId];
  r.fragments = Math.max(0, Math.floor(Number(r.fragments) || 0));
  SLOTS.forEach(function (s) {
    if (!r[s] || typeof r[s] !== 'object') r[s] = emptySlot();
    r[s].star = Math.max(0, Math.min(5, Math.floor(Number(r[s].star) || 0)));
    if (r[s].equipped == null) r[s].equipped = true;
  });
  return r;
}
function migrateFromWpn(p) {
  if (!p || !p.ab || !p.ab.exclWpn || p.ab._exclGearMigrated) return;
  var src = p.ab.exclWpn;
  Object.keys(src).forEach(function (id) {
    var o = src[id]; if (!o) return;
    var r = p.ab.exclGear[id] || (p.ab.exclGear[id] = { fragments: 0, weapon: emptySlot(), armor: emptySlot(), accessory: emptySlot() });
    if (o.owned) {
      r.weapon.owned = true;
      r.weapon.star = Math.max(r.weapon.star || 0, Math.floor(Number(o.star) || 0));
      r.weapon.equipped = o.equipped !== false;
    }
    r.fragments = Math.max(r.fragments || 0, Math.floor(Number(o.fragments) || 0));
  });
  p.ab._exclGearMigrated = true;
}
function syncWpnMirror(defId) {
  // 保持 72 的 exclWpn 鏡子，舊 UI／戰鬥讀 weapon 星唔爆
  try {
    if (!window.AB_WPN || !AB_WPN.rec) return;
    var r = gearRec(defId); if (!r) return;
    var w = AB_WPN.rec(defId);
    if (!w) return;
    w.owned = !!r.weapon.owned;
    w.star = r.weapon.star || 0;
    w.equipped = r.weapon.equipped !== false;
    w.fragments = r.fragments || 0;
  } catch (e) {}
}

function pieceOwned(defId, slot) { var r = gearRec(defId); return !!(r && r[slot] && r[slot].owned); }
function pieceStar(defId, slot) { var r = gearRec(defId); return (r && r[slot] && r[slot].owned) ? (r[slot].star || 0) : 0; }
function pieceEquipped(defId, slot) { var r = gearRec(defId); return !!(r && r[slot] && r[slot].owned && r[slot].equipped !== false); }
function sharedFrags(defId) { var r = gearRec(defId); return r ? (r.fragments || 0) : 0; }
function setComplete(defId) {
  return pieceEquipped(defId, 'weapon') && pieceEquipped(defId, 'armor') && pieceEquipped(defId, 'accessory');
}

function fragGain(rarity) {
  var W = window.AB_WPN && AB_WPN.FRAG_GAIN;
  if (W && W[rarity] != null) return W[rarity];
  return ({ N: 8, R: 12, SR: 15, SSR: 25 })[rarity] || 12;
}
function starCost(defId, slot) {
  var r = gearRec(defId); if (!r || !r[slot] || !r[slot].owned) return null;
  if (r[slot].star >= 5) return null;
  var pc = PIECES[pieceKey(defId, slot)] || {};
  var base = (window.AB_WPN && AB_WPN.STAR_COST_BASE) || [15, 40, 80, 150, 250];
  var mulTab = { N: 0.7, R: 0.85, SR: 1.0, SSR: 1.35 };
  var mul = mulTab[pc.rarity] != null ? mulTab[pc.rarity] : 1;
  return Math.max(1, Math.round((base[r[slot].star] || 15) * mul));
}
function breakthrough(defId, slot) {
  slot = slot || 'weapon';
  if (SLOTS.indexOf(slot) < 0) return { ok: false, msg: '無效部位' };
  var pc = PIECES[pieceKey(defId, slot)];
  if (!pc) return { ok: false, msg: '冇呢件專屬裝' };
  var r = gearRec(defId);
  if (!r || !r[slot].owned) return { ok: false, msg: '未擁有' };
  if (r[slot].star >= 5) return { ok: false, msg: '已達 5★' };
  var cost = starCost(defId, slot);
  if (cost == null || r.fragments < cost) return { ok: false, msg: '專屬碎片不足（要 ' + cost + '，而家 ' + (r.fragments || 0) + '）' };
  r.fragments -= cost;
  r[slot].star += 1;
  syncWpnMirror(defId);
  try { if (typeof logSys === 'function') logSys('<span class="text-violet-300">🛡 「' + pc.n + '」突破 → ' + r[slot].star + '★（−' + cost + ' 專屬碎片，剩 ' + r.fragments + '）</span>'); } catch (e) {}
  try { if (typeof saveGame === 'function') saveGame(); } catch (e2) {}
  return { ok: true, defId: defId, slot: slot, star: r[slot].star, cost: cost, fragments: r.fragments };
}
function setEquipped(defId, slot, on) {
  var r = gearRec(defId);
  if (!r || !r[slot] || !r[slot].owned) return false;
  r[slot].equipped = !!on;
  if (slot === 'weapon') syncWpnMirror(defId);
  try { if (typeof saveGame === 'function') saveGame(); } catch (e) {}
  return true;
}

function grantPiece(defId, slot, opts) {
  opts = opts || {};
  slot = slot || 'weapon';
  var pc = PIECES[pieceKey(defId, slot)];
  if (!pc) return { ok: false, msg: '無效專屬裝' };
  var r = gearRec(defId);
  var gain = fragGain(pc.rarity);
  if (r[slot].owned) {
    r.fragments += gain;
    syncWpnMirror(defId);
    try { if (typeof logSys === 'function') logSys('<span class="text-amber-300">重複「' + pc.n + '」→ 專屬碎片 +' + gain + '（而家 ' + r.fragments + '）</span>'); } catch (e0) {}
    try { if (typeof saveGame === 'function') saveGame(); } catch (e1) {}
    return { ok: true, duplicate: true, defId: defId, slot: slot, fragments: gain, piece: pc, entry: r };
  }
  r[slot].owned = true;
  r[slot].star = Math.max(0, Math.floor(Number(opts.star) || 0));
  r[slot].equipped = true;
  syncWpnMirror(defId);
  try { if (typeof logSys === 'function') logSys('<span class="text-emerald-300">獲得專屬' + SLOT_LB[slot] + '：「' + pc.n + '」（' + pc.rarity + '・' + pc.heroName + '）</span>'); } catch (e2) {}
  try { if (typeof saveGame === 'function') saveGame(); } catch (e3) {}
  return { ok: true, duplicate: false, defId: defId, slot: slot, fragments: 0, piece: pc, entry: r };
}

function fxForPiece(defId, slot) {
  if (!pieceEquipped(defId, slot)) return null;
  var pc = PIECES[pieceKey(defId, slot)]; if (!pc) return null;
  var st = pieceStar(defId, slot);
  var mul = 1 + st * (slot === 'weapon' ? WPN_STAR_STAT : ARM_STAR_STAT);
  return scaleFx(pc.fx, mul);
}
function fxBundle(defId) {
  var list = [];
  SLOTS.forEach(function (s) { var fx = fxForPiece(defId, s); if (fx) list.push({ slot: s, fx: fx }); });
  return list;
}
function setBonus(defId) {
  if (!setComplete(defId)) return null;
  return setAwakenOf(defId);
}

// —— 轉蛋（全池裝備券＝舊專武券擴三件）——
function ensureGacha(p) {
  p = p || (typeof player !== 'undefined' ? player : null);
  if (!p) return null;
  if (!p.gacha || typeof p.gacha !== 'object') p.gacha = {};
  if (p.gacha.wpnTickets == null) p.gacha.wpnTickets = 0;
  if (p.gacha.wpnPitySsr == null) p.gacha.wpnPitySsr = 0;
  if (!Array.isArray(p.gacha.wpnHist)) p.gacha.wpnHist = [];
  if (!p.gacha.clsHeroTk || typeof p.gacha.clsHeroTk !== 'object') p.gacha.clsHeroTk = {};
  if (!p.gacha.clsEquipTk || typeof p.gacha.clsEquipTk !== 'object') p.gacha.clsEquipTk = {};
  if (!p.gacha.clsEquipPity || typeof p.gacha.clsEquipPity !== 'object') p.gacha.clsEquipPity = {};
  return p.gacha;
}
function rollSlot() {
  var roll = Math.random() * 100, acc = 0;
  for (var i = 0; i < SLOTS.length; i++) {
    acc += SLOT_W[SLOTS[i]];
    if (roll < acc) return SLOTS[i];
  }
  return 'weapon';
}
function poolHeroes(rarity, cls) {
  return openHeroIds().filter(function (id) {
    var d = heroDef(id); if (!d) return false;
    if (cls && d.cls !== cls) return false;
    if (rarity && String(d.rarity).toUpperCase() !== rarity) return false;
    return !!PIECES[pieceKey(id, 'weapon')];
  });
}
function rollRarity(g, forceSsr) {
  if (forceSsr) return 'SSR';
  var pity = (g.wpnPitySsr || 0) + 1;
  if (pity >= GACHA.pitySsr) return 'SSR';
  var roll = Math.random() * (GACHA.srW + GACHA.ssrW);
  // 亦可能出 N/R：權重拆細——SSR 20、SR 45、R 25、N 10（pity 仍只保 SSR）
  var t = Math.random() * 100;
  if (t < 10) return 'N';
  if (t < 35) return 'R';
  if (t < 80) return 'SR';
  return 'SSR';
}
function pullEquipOne(opts) {
  opts = opts || {};
  var g = ensureGacha();
  if (!g) return { ok: false, msg: '未登入' };
  if ((g.wpnTickets || 0) < 1) return { ok: false, msg: '專屬裝備券不足（持有 ' + (g.wpnTickets || 0) + '）' };
  g.wpnTickets -= 1;
  var forceSsr = ((g.wpnPitySsr || 0) + 1) >= GACHA.pitySsr;
  var rarity = opts.rarity || rollRarity(g, forceSsr);
  if (rarity === 'SSR') g.wpnPitySsr = 0; else g.wpnPitySsr = (g.wpnPitySsr || 0) + 1;
  var pool = poolHeroes(rarity, opts.cls || null);
  if (!pool.length) {
    // fallback 任何開放
    pool = poolHeroes(null, opts.cls || null);
  }
  if (!pool.length) { g.wpnTickets += 1; return { ok: false, msg: '裝備池係空嘅' }; }
  var defId = opts.defId || pool[Math.floor(Math.random() * pool.length)];
  if (opts.defId && openHeroIds().indexOf(opts.defId) < 0) { g.wpnTickets += 1; return { ok: false, msg: '英雄未開放' }; }
  var slot = opts.slot || rollSlot();
  var got = grantPiece(defId, slot);
  var pc = PIECES[pieceKey(defId, slot)];
  var entry = {
    at: Date.now(), defId: defId, slot: slot, rarity: (pc && pc.rarity) || rarity,
    name: (pc && pc.n) || defId, hero: (pc && pc.heroName) || '',
    duplicate: !!(got && got.duplicate), fragments: got && got.fragments || 0
  };
  g.wpnHist = (g.wpnHist || []).concat([entry]).slice(-80);
  try { if (typeof saveGame === 'function') saveGame(); } catch (e) {}
  return { ok: true, rarity: entry.rarity, defId: defId, slot: slot, result: got, entry: entry, tickets: g.wpnTickets };
}
function pullEquipMany(n, opts) {
  n = Math.max(1, Math.min(100, Math.floor(Number(n) || 1)));
  var out = [];
  for (var i = 0; i < n; i++) {
    var r = pullEquipOne(opts);
    out.push(r);
    if (!r.ok) break;
  }
  return out;
}

// —— 職業指定卷 ——
var CLS_KEYS = ['knight', 'warrior', 'dragon', 'elf', 'dark', 'mage', 'illusion', 'royal'];
var CLS_LB = { knight: '騎士', warrior: '戰士', dragon: '龍騎士', elf: '妖精', dark: '黑暗妖精', mage: '法師', illusion: '幻術士', royal: '王族' };
function addClsTk(kind, cls, n) {
  n = Math.floor(Number(n) || 0);
  if (!cls || n <= 0) return 0;
  var g = ensureGacha(); if (!g) return 0;
  if (CLS_KEYS.indexOf(cls) < 0) return 0;
  var bag = kind === 'hero' ? g.clsHeroTk : g.clsEquipTk;
  bag[cls] = (bag[cls] || 0) + n;
  return n;
}
function payClsTk(kind, cls, n) { return addClsTk(kind, cls, n); }
function clsTk(kind, cls) {
  var g = ensureGacha(); if (!g) return 0;
  var bag = kind === 'hero' ? g.clsHeroTk : g.clsEquipTk;
  return bag[cls] || 0;
}
/** 5 專屬裝備券 → 1 自選職業裝備券 */
function exchangeEquipToClsEquip(cls) {
  var g = ensureGacha();
  if (!g) return { ok: false, msg: '未登入' };
  if (CLS_KEYS.indexOf(cls) < 0) return { ok: false, msg: '職業無效' };
  var cost = GACHA.exchangeClsEquipCost || 5;
  if ((g.wpnTickets || 0) < cost) return { ok: false, msg: '專屬裝備券不足（需要 ' + cost + '）' };
  g.wpnTickets -= cost;
  addClsTk('equip', cls, 1);
  try { if (typeof saveGame === 'function') saveGame(); } catch (e) {}
  return { ok: true, cls: cls, spent: cost, tickets: g.clsEquipTk[cls] || 0, wpnTickets: g.wpnTickets };
}
/** 3 英雄招募券 → 1 自選職業英雄券 */
function exchangeHeroToClsHero(cls) {
  var g = ensureGacha();
  if (!g) return { ok: false, msg: '未登入' };
  if (CLS_KEYS.indexOf(cls) < 0) return { ok: false, msg: '職業無效' };
  var cost = GACHA.exchangeClsHeroCost || 3;
  if ((g.tickets || 0) < cost) return { ok: false, msg: '英雄招募券不足（需要 ' + cost + '）' };
  g.tickets -= cost;
  addClsTk('hero', cls, 1);
  try { if (typeof saveGame === 'function') saveGame(); } catch (e) {}
  return { ok: true, cls: cls, spent: cost, tickets: g.clsHeroTk[cls] || 0, heroTickets: g.tickets };
}
function pullClassHero(cls) {
  var g = ensureGacha();
  if (!g) return { ok: false, msg: '未登入' };
  if ((g.clsHeroTk[cls] || 0) < 1) return { ok: false, msg: '職業英雄券不足' };
  var pool = poolHeroes(null, cls);
  if (!pool.length) return { ok: false, msg: '呢個職業未開放英雄' };
  g.clsHeroTk[cls] -= 1;
  var defId = pool[Math.floor(Math.random() * pool.length)];
  var got = null;
  try {
    if (typeof grantHeroByDef === 'function') got = grantHeroByDef(defId, { source: 'classTicket' });
    else if (typeof createHeroFromDef === 'function') {
      var dup = (player.heroes || []).filter(function (x) { return x && x.defId === defId; })[0];
      if (dup) {
        var frag = ((typeof HERO_RARITY !== 'undefined' && HERO_RARITY[dup.rarity]) || {}).frag || 10;
        dup.fragments = (dup.fragments || 0) + frag;
        got = { ok: true, duplicate: true, hero: dup, fragments: frag };
      } else {
        var h = createHeroFromDef(defId, { lv: 1, star: 0 });
        player.heroes = player.heroes || [];
        player.heroes.push(h);
        got = { ok: true, duplicate: false, hero: h };
      }
    }
  } catch (e) { console.warn('[ab-set] class hero pull', e); }
  try { if (typeof saveGame === 'function') saveGame(); } catch (e2) {}
  return { ok: true, defId: defId, cls: cls, result: got, tickets: g.clsHeroTk[cls] };
}
function pullClassEquip(cls) {
  var g = ensureGacha();
  if (!g) return { ok: false, msg: '未登入' };
  if ((g.clsEquipTk[cls] || 0) < 1) return { ok: false, msg: '職業裝備券不足' };
  var pool = poolHeroes(null, cls);
  if (!pool.length) return { ok: false, msg: '呢個職業未開放英雄裝備' };
  g.clsEquipTk[cls] -= 1;
  // 職業池：20 抽保底 SR+
  g.clsEquipPity[cls] = (g.clsEquipPity[cls] || 0) + 1;
  var forceSr = g.clsEquipPity[cls] >= GACHA.classEquipPitySr;
  var rarity = null;
  if (forceSr) {
    var srPool = poolHeroes('SSR', cls).concat(poolHeroes('SR', cls));
    if (srPool.length) { pool = srPool; g.clsEquipPity[cls] = 0; }
  }
  var defId = pool[Math.floor(Math.random() * pool.length)];
  var slot = rollSlot();
  // 唔扣全池裝備券——職業券已扣
  var got = grantPiece(defId, slot);
  var pc = PIECES[pieceKey(defId, slot)];
  if (pc && (pc.rarity === 'SR' || pc.rarity === 'SSR')) g.clsEquipPity[cls] = 0;
  try { if (typeof saveGame === 'function') saveGame(); } catch (e) {}
  return { ok: true, rarity: (pc && pc.rarity) || 'SR', defId: defId, slot: slot, cls: cls, result: got, piece: pc, entry: { name: (pc && pc.n) || defId, fragments: got && got.fragments || 0 }, tickets: g.clsEquipTk[cls] };
}

// —— 新號 100 抽：70 英雄券 + 30 裝備券 ——
function grantNewAccount100(p) {
  p = p || (typeof player !== 'undefined' ? player : null);
  if (!p) return { ok: false, msg: '無角色' };
  if (p._apExcl100Granted) return { ok: false, msg: '已領過' };
  ensureGacha(p);
  var g = p.gacha;
  var heroAdd = 0, equipAdd = 30;
  // 無舊存檔遷移；重開帳為主。若英雄券 starter 未發，一併補 70
  if (!p._apStarterPullsGranted) {
    heroAdd = 70;
    g.tickets = (g.tickets || 0) + heroAdd;
    p._apStarterPullsGranted = true;
  }
  g.wpnTickets = (g.wpnTickets || 0) + equipAdd;
  p._apExcl100Granted = true;
  try {
    if (typeof logSys === 'function') {
      logSys('<span class="text-amber-300">✦ 新號 100 抽：英雄券 +' + (heroAdd || 0) + '、專屬裝備券 +' + equipAdd + '</span>');
    }
  } catch (e) {}
  try { if (typeof saveGame === 'function') saveGame(); } catch (e2) {}
  return { ok: true, hero: heroAdd, equip: equipAdd };
}

// 補丁：改寫 AB_WPN 轉蛋／碎片／fx，令舊 UI 自動走三件套
function patchAbWpn() {
  if (!window.AB_WPN) return;
  var W = window.AB_WPN;
  W.GACHA = W.GACHA || {};
  W.GACHA.pitySsr = GACHA.pitySsr;
  W.pull = function () { return pullEquipOne(); };
  W.pullMany = function (n) { return pullEquipMany(n); };
  W.frags = function (defId) { return sharedFrags(defId); };
  W.fxFor = function (defId) { return fxForPiece(defId, 'weapon'); };
  W.grant = function (defId, opts) { return grantPiece(defId, 'weapon', opts); };
  W.breakthrough = function (defId) { return breakthrough(defId, 'weapon'); };
  W.starCost = function (defId) { return starCost(defId, 'weapon'); };
  W.owned = function (defId) { return pieceOwned(defId, 'weapon'); };
  W.star = function (defId) { return pieceStar(defId, 'weapon'); };
  W.equipped = function (defId) { return pieceEquipped(defId, 'weapon'); };
  W.setEquipped = function (defId, on) { return setEquipped(defId, 'weapon', on); };
  W.rec = function (defId) {
    var r = gearRec(defId); if (!r) return null;
    return { owned: !!r.weapon.owned, star: r.weapon.star || 0, fragments: r.fragments || 0, equipped: r.weapon.equipped !== false };
  };
  W.listOwned = function () {
    var bag = ensureGearBag() || {};
    var out = [];
    Object.keys(bag).forEach(function (id) {
      SLOTS.forEach(function (s) {
        var r = bag[id];
        if (!r || !r[s] || !r[s].owned) return;
        var pc = PIECES[pieceKey(id, s)]; if (!pc) return;
        out.push({
          defId: id, slot: s, name: pc.n, rarity: pc.rarity, heroName: pc.heroName,
          star: r[s].star || 0, fragments: r.fragments || 0, equipped: r[s].equipped !== false
        });
      });
    });
    var ord = { SSR: 1, SR: 2, R: 3, N: 4 };
    out.sort(function (a, b) { return ((ord[a.rarity] || 9) - (ord[b.rarity] || 9)) || String(a.name).localeCompare(String(b.name)); });
    return out;
  };
  // 戰鬥用：全套 fx
  W.fxBundle = fxBundle;
  W.setBonus = setBonus;
  W.setComplete = setComplete;
}

function applyToUnit(u, defId) {
  if (!u || !defId) return;
  fxBundle(defId).forEach(function (x) {
    try {
      if (typeof applyFx === 'function') applyFx(u, x.fx, 1);
      else {
        var fx = x.fx;
        if (fx.atkP) u.atk = Math.round(u.atk * (1 + fx.atkP));
        if (fx.asP) u.as *= (1 + fx.asP);
        if (fx.spP) u.sp = (u.sp || 1) + fx.spP;
        if (fx.def) u.def += Math.round(fx.def);
        if (fx.mr) u.mr += Math.round(fx.mr);
        if (fx.hpP) u.mhp = Math.round(u.mhp * (1 + fx.hpP));
        if (fx.mana0) u.mana0 = (u.mana0 || 0) + fx.mana0;
        if (fx.crit) u.crit = (u.crit || 0) + fx.crit;
        if (fx.regen) u.regen = (u.regen || 0) + fx.regen;
        if (fx.shield0) u.shield0 = (u.shield0 || 0) + fx.shield0;
      }
    } catch (e) {}
  });
  u.exclStar = pieceStar(defId, 'weapon');
  u.exclOn = pieceEquipped(defId, 'weapon');
  u.exclName = (PIECES[pieceKey(defId, 'weapon')] || {}).n || '專武';
  u.exclArmStar = pieceStar(defId, 'armor');
  u.exclAccStar = pieceStar(defId, 'accessory');
  var sb = setBonus(defId);
  if (sb) {
    u.setOn = true;
    u.setFlag = sb.flag || null;
    u.setText = sb.text || '';
    if (sb.fx) {
      try { if (typeof applyFx === 'function') applyFx(u, sb.fx, 1); } catch (e2) {}
    }
  }
}

window.AB_SET = {
  enabled: true,
  SLOTS: SLOTS,
  SLOT_LB: SLOT_LB,
  CLS_LB: CLS_LB,
  CLS_KEYS: CLS_KEYS,
  GACHA: GACHA,
  PIECES: PIECES,
  rebuild: function () { buildPieces(); this.PIECES = PIECES; return PIECES; },
  ensureBag: ensureGearBag,
  rec: gearRec,
  owned: pieceOwned,
  star: pieceStar,
  frags: sharedFrags,
  equipped: pieceEquipped,
  setEquipped: setEquipped,
  starCost: starCost,
  breakthrough: breakthrough,
  grant: grantPiece,
  fxFor: fxForPiece,
  fxBundle: fxBundle,
  setBonus: setBonus,
  setComplete: setComplete,
  setAwakenOf: setAwakenOf,
  applyToUnit: applyToUnit,
  pull: pullEquipOne,
  pullMany: pullEquipMany,
  tickets: function () { var g = ensureGacha(); return g ? (g.wpnTickets || 0) : 0; },
  payTickets: function (n) {
    var g = ensureGacha(); if (!g) return 0;
    g.wpnTickets = (g.wpnTickets || 0) + n; return n;
  },
  clsTk: clsTk,
  addClsTk: addClsTk,
  payClsTk: payClsTk,
  exchangeEquipToClsEquip: exchangeEquipToClsEquip,
  exchangeHeroToClsHero: exchangeHeroToClsHero,
  pullClassHero: pullClassHero,
  pullClassEquip: pullClassEquip,
  grantNewAccount100: grantNewAccount100,
  pieceKey: pieceKey,
  openHeroIds: openHeroIds
};

patchAbWpn();

// 新號：喺 ensureAccountParty 之後補發 100 抽（idempotent）
try {
  if (typeof ensureAccountParty === 'function' && !ensureAccountParty._excl100) {
    var _eap = ensureAccountParty;
    window.ensureAccountParty = ensureAccountParty = function (p) {
      var r = _eap.apply(this, arguments);
      try {
        p = p || player;
        // grantStarterPullTickets 已一併送 70+30；呢度只補漏（旗未立）
        if (p && p.cls && !p._apExcl100Granted) grantNewAccount100(p);
      } catch (e) {}
      return r;
    };
    ensureAccountParty._excl100 = true;
  }
} catch (eHook) {}

try { console.info('[ab] 73-excl-set ready · pieces ' + Object.keys(PIECES).length + ' · pity ' + GACHA.pitySsr); } catch (e) {}
})();
