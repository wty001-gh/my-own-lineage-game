// ===== 🏛️ v3.8.117 冒險者公會 G1：委託板 MVP（design/guild-v1.md）=====
// ===== 🏛️ v3.8.123 公會擴充 … =====
// ===== 🧭 v3.8.124 天賦改為每名角色獨立（成員各自 talents；派遣讀該人）=====
// 玩家＝公會長；成員＝自己、隊伍中的傭兵，以及其他存檔角色（slotSummary）。每日 05:00（台北）刷新委託；D–S 等級；討伐／護送／採集／調查自動派遣；
// 頭目懸賞（A 簡易／S）＝接受後於野外掛機地圖生成懸賞頭目（js/53，v3.8.118）。收益重用 js/39 cbExpedRewards；忙碌鎖共用 lineage_idle_exped_busy。
// 存檔：player.guild（缺欄位自動補）；舊探險公會派遣（clanBase.exped）合併顯示於「進行中」並可直接領取（cbExpedClaim）。
(function () {
'use strict';

const GD_RANKS = ['D', 'C', 'B', 'A', 'S'];
const GD_RANK = {
    D: { req: 20, gold: 28000, fame: 6, hours: [0.5, 1], w: 40, glv: 1, lv: [1, 20] },
    C: { req: 40, gold: 110000, fame: 14, hours: [1, 4], w: 30, glv: 1, lv: [20, 40] },
    B: { req: 60, gold: 420000, fame: 36, hours: [4, 8], w: 18, glv: 3, lv: [40, 60] },
    A: { req: 80, gold: 1400000, fame: 85, hours: [8], w: 9, glv: 5, lv: [60, 80] },
    S: { req: 100, gold: 4200000, fame: 240, hours: [0], w: 3, glv: 7, lv: [80, 100] }
};
const GD_TYPES = {
    hunt:   { n: '討伐', emoji: '⚔️', trait: 'power', sub: 'stamina' },
    escort: { n: '護送', emoji: '🛡️', trait: 'talk', sub: 'power', goldMul: 1.3, fameMul: 1.5 },
    gather: { n: '採集', emoji: '🌿', trait: 'gather', sub: 'explore' },
    survey: { n: '調查', emoji: '🗺️', trait: 'explore', sub: 'talk', fameMul: 1.2 },
    bounty: { n: '頭目懸賞', emoji: '👑', trait: 'power', sub: 'power', goldMul: 1, fameMul: 1 },
    cook:   { n: '料理宴會', emoji: '🍳', trait: 'charm', sub: 'talk', goldMul: 1.1, fameMul: 1.2 },
    craft:  { n: '訂單生產', emoji: '🏭', trait: 'gather', sub: 'talk', goldMul: 1.2 },
    rescue: { n: '救援', emoji: '🚑', trait: 'power', sub: 'explore', fameMul: 2.0, goldMul: 1.15 },
    relic:  { n: '遺跡盜掘', emoji: '🏺', trait: 'explore', sub: 'power', fameMul: 1.4 },
    trade:  { n: '商路談判', emoji: '🤝', trait: 'talk', sub: 'charm', goldMul: 1.6, fameMul: 1.3 }
};
const GD_HOUR_MUL = { 0: 1, 0.5: 0.6, 1: 1, 4: 3.2, 8: 5.8 };
const GD_FAME_LV = [0, 300, 1000, 2500, 5000, 9000, 15000, 24000, 36000, 52000];
const GD_TRAIT_N = { explore: '探索', talk: '交涉', gather: '採集', power: '戰力', charm: '魅力', stamina: '體力' };
const GD_CLS_BASE = {   // 探索/交涉/採集/魅力/體力(每日次數)
    knight:   { explore: 25, talk: 35, gather: 25, charm: 35, stamina: 6 },
    royal:    { explore: 25, talk: 70, gather: 20, charm: 75, stamina: 5 },
    elf:      { explore: 60, talk: 35, gather: 65, charm: 45, stamina: 5 },
    illusion: { explore: 40, talk: 50, gather: 30, charm: 45, stamina: 4 },
    warrior:  { explore: 30, talk: 20, gather: 45, charm: 30, stamina: 6 },
    mage:     { explore: 35, talk: 40, gather: 25, charm: 40, stamina: 4 },
    dark:     { explore: 55, talk: 30, gather: 35, charm: 50, stamina: 5 },
    dragon:   { explore: 35, talk: 25, gather: 30, charm: 40, stamina: 5 }
};
const GD_CLS_LABEL = { knight: '騎士', royal: '王族', elf: '妖精', illusion: '幻術士', warrior: '戰士', mage: '法師', dark: '黑暗妖精', dragon: '龍騎士' };
function gdNormCls(c) {
    c = String(c || '');
    if (GD_CLS_BASE[c]) return c;
    if (c.includes('royal')) return 'royal';
    if (c.includes('Dknight') || c.includes('dragon')) return 'dragon';
    if (c.includes('illusion')) return 'illusion';
    if (c.includes('dark')) return 'dark';
    if (c.includes('knight')) return 'knight';
    if (c.includes('mage')) return 'mage';
    if (c.includes('elf')) return 'elf';
    if (c.includes('warrior')) return 'warrior';
    return 'knight';
}
const GD_REFRESH_COST = 50000, GD_REFRESH_MAX = 5;
const BUSY_KEY = 'lineage_idle_exped_busy';

function _hash(s) { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h || 7; }
function _rng(seed) { let s = seed >>> 0 || 7; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return (s >>> 0) / 4294967296; }; }
function gdDayKey(ms) { let d = new Date((ms || Date.now()) + 8 * 3600000 - 5 * 3600000); return d.toISOString().slice(0, 10); }
function _cur() { try { return String(typeof currentSlot !== 'undefined' ? currentSlot : ''); } catch (e) { return ''; } }

function gdData(p) {
    p = p || (typeof player !== 'undefined' ? player : null);
    if (!p) return null;
    let g = p.guild;
    if (!g || typeof g !== 'object') g = p.guild = {};
    if (!g.ver) g.ver = 1;
    g.fame = Math.max(0, Number(g.fame) || 0);
    if (!Array.isArray(g.board)) g.board = [];
    if (!Array.isArray(g.jobs)) g.jobs = [];
    if (!g.members || typeof g.members !== 'object') g.members = {};
    if (!g.bounty || typeof g.bounty !== 'object') g.bounty = { done: {} };
    if (!g.bounty.done) g.bounty.done = {};
    if (typeof g.boardDay !== 'string') g.boardDay = '';
    g.refreshUsed = Math.max(0, Number(g.refreshUsed) || 0);
    return g;
}
function gdLevel(g) { g = g || gdData(); let lv = 1; for (let i = 0; i < GD_FAME_LV.length; i++) if (g.fame >= GD_FAME_LV[i]) lv = i + 1; return Math.min(10, lv); }
function gdNextFame(g) { let lv = gdLevel(g); return lv >= 10 ? null : GD_FAME_LV[lv]; }
// 🏛️ v3.8.119 公會等級解鎖（原設計「關卡章節」改為野外掛機加成／內容）
const GD_LV_UNLOCK = [
    null,
    '委託板 D／C 級、酒館、宿舍',
    '野外掛機金幣 +3%',
    'B 級委託・鍛造屋委託裝備加成',
    '野外掛機經驗 +3%',
    'A 級委託（含簡易頭目懸賞）・情報室',
    '野外掛機金幣 +6%（取代 +3%）',
    'S 級頭目懸賞・每日保底 1 張',
    '野外掛機經驗 +6%（取代 +3%）',
    '每日好感事件 +1',
    '傳說懸賞：頭目懸賞獎勵 +50%'
];
function gdFieldGoldMult(lv) { lv = lv || gdLevel(); return lv >= 6 ? 1.06 : (lv >= 2 ? 1.03 : 1); }
function gdFieldExpMult(lv) { lv = lv || gdLevel(); return lv >= 8 ? 1.06 : (lv >= 4 ? 1.03 : 1); }
function _cbLv(k) { try { return Math.max(0, ensureClanBase().lv[k] || 0); } catch (e) { return 0; } }
function gdAffCap() { return _cbLv('dorm') >= 10 ? 12 : 10; }
function gdBoardLv() { try { return Math.max(0, (ensureClanBase().lv.explore || 0)); } catch (e) { return 0; } }
function gdBoardSize() { return Math.min(16, 6 + Math.floor(gdBoardLv() * 0.6) + Math.floor(_cbLv('logistics') * 0.3)); }
function gdDispatchSlots() { return Math.min(10, 2 + Math.floor(gdBoardLv() / 2) + Math.floor(_cbLv('logistics') / 2)); }
function gdDurationMul() { return 1 - Math.min(0.20, _cbLv('logistics') * 0.02); }
function gdBountyReady() { return !!window.GD_BOUNTY_FIELD; }   // v3.8.118 野外頭目懸賞模組（js/53）載入後為 true

// ---------- 成員 ----------
let _memCache = { at: 0, list: [] };
function gdMemberState(slot) {
    let g = gdData(), m = g.members[slot];
    if (!m || typeof m !== 'object') m = g.members[slot] = {};
    m.aff = Math.max(0, Number(m.aff) || 0);
    let day = gdDayKey();
    if (m.stDay !== day) { m.stDay = day; m.used = 0; }
    m.used = Math.max(0, Number(m.used) || 0);
    return m;
}
function gdAffLv(aff) { let cap = gdAffCap(), lv = 1, need = 100; while (lv < cap && aff >= need) { aff -= need; lv++; need = 100 * lv; } return lv; }
function gdAffNext(aff) { let cap = gdAffCap(), lv = 1, need = 100; while (lv < cap && aff >= need) { aff -= need; lv++; need = 100 * lv; } return lv >= cap ? null : { have: aff, need }; }
function gdTraits(sum, st, self) {
    let cls = gdNormCls(sum.rawCls), b = GD_CLS_BASE[cls] || GD_CLS_BASE.knight, lv = Math.max(1, Number(sum.lv) || 1);
    let al = gdAffLv(st ? st.aff : 0), ab = (al - 1) * 2 + (_cbLv('keep') >= 10 ? 5 : 0), lb = Math.floor(lv * 0.3);
    let flat = { explore: 0, talk: 0, gather: 0, charm: 0, stamina: 0 };
    if (window.TL) {
        try {
            let bag = sum.talents;
            if (!bag && self && player) bag = TL.ensure();
            if (!bag && sum.slot != null && TL.readSlot) bag = TL.readSlot(sum.slot);
            if (bag) flat = TL.traitFlat(bag) || flat;
        } catch (e) {}
    }
    let c = v => Math.max(0, Math.min(100, Math.round(v)));
    return { explore: c(b.explore + lb + ab + (flat.explore || 0)), talk: c(b.talk + lb + ab + (flat.talk || 0)),
             gather: c(b.gather + lb + ab + (flat.gather || 0)), charm: c(b.charm + lb + ab + (flat.charm || 0)),
             power: c(lv * 0.8 + 15 + ab), stamina: Math.round(b.stamina * (1 + _cbLv('dorm') * 0.1)) + (flat.stamina || 0), affLv: al };
}
function gdMembers(force) {
    let now = Date.now();
    if (!force && now - _memCache.at < 15000) return _memCache.list;
    let out = [], seen = new Set(), lim = (typeof SAVE_SLOT_MAX === 'number' && SAVE_SLOT_MAX > 0) ? SAVE_SLOT_MAX : 16, cur = _cur();
    // 隊伍中不再擋派遣：委託是計時工作，人不離場、不解散傭兵。只擋模式不同、被其他存檔雇用、外出中、體力不足。
    let hired = null; try { if (typeof mercEmploymentMap === 'function') hired = mercEmploymentMap(); } catch (e) {}
    let busy = {}; try { busy = JSON.parse(localStorage.getItem(BUSY_KEY) || '{}') || {}; } catch (e) {}
    let push = (slot, sum, self) => {
        let s = String(slot);
        if (!sum || !sum.name || !sum.rawCls || seen.has(s)) return;
        seen.add(s);
        let why = '';
        if (!self && !!sum.classic !== !!(player && player.classicMode)) why = '模式不同';
        else if (!self && hired && hired[s] && typeof mercSlotHiredByOther === 'function' && mercSlotHiredByOther(s, hired)) why = '受僱中';
        else if (busy[s] && busy[s].endAt > now) why = '外出中';
        let talents = null;
        try {
            if (self && player) { if (window.TL) TL.ensure(); talents = player.talents; }
            else if (sum.talents) talents = sum.talents;
            else if (window.TL && String(s).match(/^\d+$/)) talents = TL.readSlot(s);
        } catch (e) {}
        sum.talents = talents; sum.slot = s;
        let st = gdMemberState(s), tr = gdTraits(sum, st, !!self);
        if (!why && st.used >= tr.stamina) why = '體力不足';
        out.push({ slot: s, name: sum.name, cls: gdNormCls(sum.rawCls), rawCls: gdNormCls(sum.rawCls), lv: Math.max(1, Number(sum.lv) || 1), avatar: sum.avatar, tr, st, why, self: !!self, talents: talents || null, star: sum.star || 0 });
    };
    if (player && player.cls) {
        if (window.TL) try { TL.ensure(); } catch (e) {}
        push(cur || 'self', { name: player.name || '自己', rawCls: player.cls, lv: player.lv, avatar: player.avatar, classic: !!player.classicMode, talents: player.talents, star: player.star || 0 }, true);
    }
    for (let n = 1; n <= lim; n++) {
        if (String(n) === cur) continue;
        let sum = null; try { sum = (typeof slotSummary === 'function') ? slotSummary(n) : null; } catch (e) {}
        push(n, sum, false);
    }
    // 同一存檔裡的傭兵（含沒有獨立存檔位的）：已在上方清單的不重複
    ((player && player.allies) || []).forEach((a, i) => {
        if (!a || !a.cls) return;
        let s = a._slot != null ? String(a._slot) : ('ally' + i);
        push(s, { name: a.name || a._allyName || ('傭兵' + (i + 1)), rawCls: a.cls, lv: a.lv, avatar: a.avatar, classic: !!(player && player.classicMode), talents: a.talents || null, star: a.star || 0 }, false);
    });
    _memCache = { at: now, list: out };
    return out;
}
// 🩹 ab.20261022u：帳號制（js/62）會覆寫 window.GD.members（成員改為 player.heroes 的 hero:<id>）；
// 本檔在 IIFE 內，派遣／自動編成要讀「目前生效」的成員清單，否則 UI 選的英雄在這裡找不到 →「成員資料已變更」。
function gdMembersLive(force) {
    try { if (window.GD && typeof window.GD.members === 'function' && window.GD.members !== gdMembers) return window.GD.members(force); } catch (e) {}
    return gdMembers(force);
}
function gdScoreLive(card, mems) {
    try { if (window.GD && typeof window.GD.scoreDetail === 'function' && window.GD.scoreDetail !== gdScoreDetail) return window.GD.scoreDetail(card, mems); } catch (e) {}
    return gdScoreDetail(card, mems);
}
function gdRefreshLive() { _memCache.at = 0; try { if (window.GD && window.GD.gdRefreshMembers) window.GD.gdRefreshMembers(); } catch (e) {} }
function gdMemberPortrait(m) {
    try {
        if (m && m._heroId && typeof heroPortraitUrl === 'function') {   // ab.20261023a 統一頭像
            let h0 = ((typeof player !== 'undefined' && player && player.heroes) || []).find(x => x && x.id === m._heroId);
            let u0 = h0 && heroPortraitUrl(h0); if (u0) return u0;
        }
        if (m && m._heroId && typeof portraitEntryOf === 'function') {
            let h = ((typeof player !== 'undefined' && player && player.heroes) || []).find(x => x && x.id === m._heroId);
            let e = h && portraitEntryOf({ portraitId: h.portraitId, cls: h.cls });
            if (e) return e.thumb || e.file;
        }
    } catch (e) {}
    try { if (typeof charPortraitUrl === 'function') return charPortraitUrl({ cls: m.cls, avatar: m.avatar }); } catch (e) {}
    return m.avatar ? 'assets/character/' + m.avatar + '.png' : '';
}

// ---------- 委託板 ----------
let _mapCache = null;
function gdMaps() { if (!_mapCache) { try { _mapCache = (typeof cbExpedMaps === 'function') ? cbExpedMaps() : []; } catch (e) { _mapCache = []; } } return _mapCache; }
function gdPickMap(rank, r) {
    let ms = gdMaps(); if (!ms.length) return null;
    let [lo, hi] = GD_RANK[rank].lv;
    let pool = ms.filter(m => m.avg >= lo - 5 && m.avg <= hi + 5);
    if (!pool.length) pool = ms.slice().sort((a, b) => Math.abs(a.avg - (lo + hi) / 2) - Math.abs(b.avg - (lo + hi) / 2)).slice(0, 5);
    return pool[Math.floor(r() * pool.length)];
}
function gdPickBoss(map, rank, r) {
    let ids = (DB.maps && DB.maps[map]) || [];
    let bosses = ids.filter(id => DB.mobs[id] && DB.mobs[id].boss);
    let mobs = ids.filter(id => DB.mobs[id] && !DB.mobs[id].boss && !DB.mobs[id].pledgeEnemy && DB.mobs[id].race !== '建築');
    let boss = bosses.length ? bosses[Math.floor(r() * bosses.length)] : (mobs.slice().sort((a, b) => (DB.mobs[b].lv || 0) - (DB.mobs[a].lv || 0))[0]);
    return { boss, pool: mobs.slice(0, 4) };
}

function gdDefaultGates(rank, type) {
    let R = GD_RANK[rank] || GD_RANK.C;
    let partyMin = (rank === 'D' || rank === 'C') ? 2 : 3;
    let partyMax = (rank === 'D' || rank === 'C') ? 4 : 5;
    if (type === 'gather' || type === 'cook') { partyMin = 2; partyMax = 4; }
    if (type === 'rescue') { partyMin = 4; partyMax = 5; }
    if (type === 'relic') { partyMin = 4; partyMax = 5; }
    if (type === 'trade') { partyMin = 3; partyMax = 4; }
    if (type === 'bounty') { partyMin = 1; partyMax = 3; }
    let g = { partyMin, partyMax, traitMin: {}, traitMode: 'avg', clsNeed: [], clsForbid: [], talentNeed: [], facNeed: {}, attrNeed: {} };
    let T = GD_TYPES[type] || GD_TYPES.hunt;
    g.traitMin[T.trait] = Math.max(0, R.req - 10);
    if (type === 'escort') g.clsNeed = ['knight', 'dragon', 'warrior'];
    if (type === 'cook') { g.facNeed.kitchen = 1; g.clsNeed = ['royal', 'illusion']; }
    if (type === 'craft') g.facNeed.workshop = 1;
    if (type === 'rescue') g.talentNeed = [{ id: 'a_first_aid', min: 1, orCls: ['knight'] }];
    if (type === 'relic') { g.talentNeed = [{ id: 'a_ruin', min: 1 }]; g.guildMin = 5; }
    if (type === 'trade') g.talentNeed = [{ id: 'a_orator', min: 1, orCha: 60 }];
    return g;
}
function gdGatesOk(card, mems) {
    let g = card.gates || gdDefaultGates(card.rank, card.type);
    let why = [];
    let n = mems.length;
    if (n < (g.partyMin || 1)) why.push('人數不足（需 ' + g.partyMin + '–' + g.partyMax + '）');
    if (n > (g.partyMax || 5)) why.push('人數過多（最多 ' + g.partyMax + '）');
    if (g.guildMin && gdLevel() < g.guildMin) why.push('公會等級需 Lv' + g.guildMin);
    Object.keys(g.facNeed || {}).forEach(k => { if (_cbLv(k) < (g.facNeed[k] || 0)) why.push('需要設施 ' + k + ' Lv' + g.facNeed[k]); });
    if ((g.clsNeed || []).length) {
        let ok = mems.some(m => g.clsNeed.indexOf(gdNormCls(m.rawCls || m.cls)) >= 0);
        if (!ok) why.push('需要職業：' + g.clsNeed.map(x => GD_CLS_LABEL[x] || x).join('/'));
    }
    (g.talentNeed || []).forEach(tn => {
        let ok = false;
        if (window.TL && TL.partyHas(tn.id, tn.min || 1, mems)) ok = true;
        if (!ok && tn.orCls) {
            ok = mems.some(m => tn.orCls.indexOf(gdNormCls(m.rawCls || m.cls)) >= 0);
        }
        if (!ok && tn.orCha && mems.some(m => (m.tr && m.tr.charm || 0) >= tn.orCha)) ok = true;
        if (!ok) why.push('需要隊員天賦 ' + tn.id + (tn.orCls ? '（或指定職業）' : ''));
    });
    return { ok: !why.length, why, gates: g };
}

function gdMakeCard(rank, type, r, idx) {
    let R = GD_RANK[rank], m = gdPickMap(rank, r);
    let hours = R.hours[Math.floor(r() * R.hours.length)];
    if (type === 'rescue') hours = r() < 0.5 ? 0.5 : 1;
    let T = GD_TYPES[type] || GD_TYPES.hunt;
    let c = { id: 'q' + idx + '_' + Math.floor(r() * 1e9).toString(36), rank, type, map: m ? m.v : '', mapName: m ? m.name : '—', mapAvg: m ? m.avg : 1,
              hours, req: R.req, trait: T.trait, sub: T.sub, gold: Math.round(R.gold * (T.goldMul || 1) * (GD_HOUR_MUL[hours] || 1) * (0.9 + r() * 0.2)),
              fame: Math.round(R.fame * (T.fameMul || 1)), seed: Math.floor(r() * 4294967295) >>> 0,
              gates: gdDefaultGates(rank, type) };
    if (type === 'bounty' && m) { let b = gdPickBoss(m.v, rank, r); c.boss = b.boss; c.pool = b.pool.length ? b.pool : [b.boss]; c.bossName = (DB.mobs[b.boss] || {}).n || b.boss; }
    return c;
}
function gdGenBoard(g, extraSeed) {
    let lv = gdLevel(g), r = _rng(_hash(gdDayKey() + '|' + _cur() + '|' + (extraSeed || 0)));
    let allowed = GD_RANKS.filter(k => lv >= GD_RANK[k].glv && (k !== 'S' || gdBountyReady()));
    let tot = allowed.reduce((a, k) => a + GD_RANK[k].w, 0);
    let n = gdBoardSize(), cards = [];
    let types = ['hunt', 'escort', 'gather', 'survey'];
    if (_cbLv('kitchen') >= 1) types.push('cook');
    if (_cbLv('workshop') >= 1) types.push('craft');
    if (lv >= 2) types.push('rescue');
    if (lv >= 3) types.push('trade');
    if (lv >= 5) types.push('relic');
    for (let i = 0; i < n; i++) {
        let x = r() * tot, rank = allowed[0];
        for (let k of allowed) { x -= GD_RANK[k].w; if (x <= 0) { rank = k; break; } }
        let type = rank === 'S' ? 'bounty' : (rank === 'A' && gdBountyReady() && r() < 0.35 ? 'bounty' : types[Math.floor(r() * types.length)]);
        if (rank === 'S' && !gdBountyReady()) { rank = 'A'; type = 'hunt'; }
        cards.push(gdMakeCard(rank, type, r, i));
    }
    if (lv >= 7 && gdBountyReady() && !cards.some(c => c.rank === 'S')) cards[cards.length - 1] = gdMakeCard('S', 'bounty', r, n);   // 每日保底 1 張 S
    if (gdBoardLv() >= 10 && lv >= 5 && !cards.some(c => c.rank === 'A')) cards[0] = gdMakeCard('A', 'hunt', r, n + 1);   // 委託板 Lv10 每日保底 1 張 A
    let kept = (g.board || []).filter(c => c.kept && c.keptDay === g.boardDay).slice(0, gdBoardLv() >= 5 ? 2 : 1);
    kept.forEach(c => { c.kept = false; });
    return kept.concat(cards);
}
function gdEnsureBoard() {
    let g = gdData(); if (!g) return null;
    let day = gdDayKey();
    if (g.boardDay !== day) {
        g.board = gdGenBoard(g, 0); g.boardDay = day; g.refreshUsed = 0; g.refreshDay = day;
    }
    (g.board || []).forEach(c => { if (c && !c.gates) c.gates = gdDefaultGates(c.rank, c.type); });
    if (!g.ver || g.ver < 2) g.ver = 2;
    return g.board;
}
function gdRefresh() {
    let g = gdData(); gdEnsureBoard();
    if (g.refreshUsed >= GD_REFRESH_MAX + 1) { logSys('今日刷新次數已用完。'); return false; }
    let cost = g.refreshUsed >= 1 ? GD_REFRESH_COST : 0;
    if (cost && (player.gold || 0) < cost) { logSys(`<span class="text-red-400">金幣不足（需要 ${cost.toLocaleString()}）。</span>`); return false; }
    player.gold -= cost; g.refreshUsed++;
    g.board = gdGenBoard(g, g.refreshUsed);
    logSys(`<span class="text-amber-300">【冒險者公會】</span>委託板已刷新${cost ? '（−' + cost.toLocaleString() + ' 金）' : '（免費）'}。`);
    try { saveGame(); } catch (e) {}
    return true;
}
function gdKeep(id) {
    let g = gdData(), c = g.board.find(x => x.id === id); if (!c) return false;
    let max = gdBoardLv() >= 5 ? 2 : 1;
    if (!c.kept && g.board.filter(x => x.kept).length >= max) { logSys(`最多只可收藏 ${max} 張委託。`); return false; }
    c.kept = !c.kept; c.keptDay = g.boardDay; return true;
}

// ---------- 成功率／派遣 ----------
function gdTeamValue(card, mems) {
    if (!mems.length) return 0;
    let main = mems.reduce((a, m) => a + (m.tr[card.trait] || 0), 0) / mems.length;
    let sub = mems.reduce((a, m) => a + (m.tr[card.sub] || 0), 0) / mems.length;
    let charm = mems.reduce((a, m) => a + (m.tr.charm || 0), 0) / mems.length;
    let combo = Math.min(20, (mems.length - 1) * 4 + (new Set(mems.map(m => m.cls)).size >= 3 ? 5 : 0));
    return main * 0.7 + sub * 0.2 + charm * 0.1 + combo;
}
function gdScoreDetail(card, mems) {
    if (!mems.length) return { S: 0, rate: 0, parts: {} };
    let T_trait = gdTeamValue(card, mems);
    let leader = mems[0];
    let T_leader = (leader.tr[card.trait] || 0) * 0.15;
    let uniq = new Set(mems.map(m => m.cls)).size;
    let T_synergy = Math.min(20, (uniq - 1) * 4 + Math.max(0, mems.length - 2) * 2 + (mems.length >= 4 && uniq >= 3 ? 5 : 0));
    let T_talent = 0;
    mems.forEach((m, i) => { if (window.TL) { try { T_talent += TL.guildScore(m, card, i === 0); } catch (e) {} } });
    T_talent = Math.min(40, T_talent);
    let T_star = mems.reduce((a, m) => a + Math.floor((m.lv || 1) / 20), 0) / mems.length * 1.2;
    let T_fac = 0;
    if (card.type === 'survey') T_fac += _cbLv('mage');
    if (card.type === 'gather' || card.type === 'craft') T_fac += _cbLv('workshop') * 0.5;
    if (card.type === 'cook') T_fac += _cbLv('kitchen') * 0.5;
    T_fac += Math.min(5, _cbLv('logistics') * 0.3);
    let lvGap = (card.mapAvg || 1) - Math.max.apply(null, mems.map(m => m.lv));
    let T_gap = lvGap > 5 ? -(lvGap - 5) * 3 : 0;
    let T_gate = 0;
    let gates = card.gates || gdDefaultGates(card.rank, card.type);
    if (gates.traitMin) {
        Object.keys(gates.traitMin).forEach(k => {
            let need = gates.traitMin[k] || 0; if (!need) return;
            let avg = mems.reduce((a, m) => a + (m.tr[k] || 0), 0) / mems.length;
            if (avg < need) T_gate -= 8;
        });
    }
    let S = T_trait + T_leader + T_synergy + T_talent + T_star + T_fac + T_gap + T_gate;
    if (window.TL) { try { S += TL.weightBoost(S, card.req, mems); } catch (e) {} }
    let rate = 45 + (S - card.req) * 1.2;
    let hardCap = card.type === 'bounty' ? 60 : (card.type === 'relic' ? 85 : 95);
    rate = Math.round(Math.max(5, Math.min(hardCap, rate)));
    return { S: Math.round(S * 10) / 10, rate, parts: { T_trait, T_leader, T_synergy, T_talent, T_star, T_fac, T_gap, T_gate } };
}
function gdRate(card, mems) {
    return gdScoreDetail(card, mems).rate;
}
function gdBusySet(slot, endAt) { try { let o = JSON.parse(localStorage.getItem(BUSY_KEY) || '{}') || {}; o[slot] = { by: _cur(), endAt }; localStorage.setItem(BUSY_KEY, JSON.stringify(o)); } catch (e) {} }
function gdBusyClear(slot) { try { let o = JSON.parse(localStorage.getItem(BUSY_KEY) || '{}') || {}; if (o[slot] && String(o[slot].by) === _cur()) { delete o[slot]; localStorage.setItem(BUSY_KEY, JSON.stringify(o)); } } catch (e) {} }
function gdActiveCount() {
    let g = gdData(), legacy = 0; try { legacy = (ensureClanBase().exped || []).length; } catch (e) {}
    return g.jobs.length + legacy;
}
function gdDispatch(cardId, slots) {
    let g = gdData(), card = g.board.find(c => c.id === cardId);
    if (!card) return { ok: false, msg: '找不到委託。' };
    if (!card.gates) card.gates = gdDefaultGates(card.rank, card.type);
    if (card.type === 'bounty' && card.rank === 'S') return { ok: false, msg: 'S 級頭目懸賞必須親自帶隊。' };
    if (card.taken) return { ok: false, msg: '此委託已派遣。' };
    if (card.accepted) return { ok: false, msg: '此懸賞已親自接下（可先放棄再派遣）。' };
    let pmax = (card.gates && card.gates.partyMax) || 5;
    slots = (slots || []).map(String).slice(0, pmax);
    if (!slots.length) return { ok: false, msg: '請選擇成員。' };
    if (g.jobs.length >= gdDispatchSlots()) return { ok: false, msg: `派遣欄已滿（${gdDispatchSlots()}）。` };
    let all = gdMembersLive(true), mems = slots.map(s => all.find(m => m.slot === s)).filter(Boolean);
    let bad = mems.find(m => m.why); if (bad) return { ok: false, msg: `${bad.name} 無法派遣：${bad.why}` };
    if (mems.length !== slots.length) return { ok: false, msg: '成員資料已變更，請重試。' };
    let gate = gdGatesOk(card, mems);
    if (!gate.ok) return { ok: false, msg: gate.why[0] || '未達門檻' };
    let detail = gdScoreLive(card, mems), rate = detail.rate, now = Date.now();
    let hrs = card.type === 'bounty' ? 8 : card.hours;
    let dur = hrs * 3600000 * gdDurationMul();
    let job = { id: 'j' + now.toString(36) + Math.floor(Math.random() * 1e5).toString(36), card: JSON.parse(JSON.stringify(card)), members: mems.map(m => ({ slot: m.slot, name: m.name, cls: m.cls, lv: m.lv, talents: m.talents ? JSON.parse(JSON.stringify(m.talents)) : null })),
                rate, score: detail.S, startAt: now, endAt: now + dur, seed: card.seed };
    g.jobs.push(job); card.taken = true;
    mems.forEach(m => { m.st.used++; gdBusySet(m.slot, job.endAt); });
    gdRefreshLive();
    let hrsShow = Math.round(dur / 360000) / 10;
    logSys(`<span class="text-amber-300">【冒險者公會】</span>${mems.map(m => m.name).join('、')} 接下 ${card.rank} 級${(GD_TYPES[card.type] || {}).n || card.type}委託（${card.mapName}），評分 ${detail.S}・成功率 ${rate}%，約 ${hrsShow} 小時後歸來。`);
    try { saveGame(); } catch (e) {}
    return { ok: true, job, detail };
}
function gdRewardFor(job, success, great) {
    let failMul = 0.25 + Math.min(0.10, _cbLv('logistics') * 0.01);
    let c = job.card, mul = success ? (great ? 2 : 1) : failMul;
    let talk = 0, charm = 0;
    let all = gdMembersLive();
    job.members.forEach(jm => { let m = all.find(x => x.slot === jm.slot); let tr = m ? m.tr : gdTraits({ rawCls: jm.cls, lv: jm.lv }, null); talk += tr.talk; charm += tr.charm; });
    talk /= job.members.length; charm /= job.members.length;
    let mods = { gold: 1, fame: 1, res: 1, gear: 1, relic: 1, great: 1 };
    if (window.TL) { try { mods = (TL.rewardModsParty ? TL.rewardModsParty(job.members.map(jm => { let m = all.find(x => x.slot === jm.slot); return m || jm; })) : TL.rewardMods()) || mods; } catch (e) {} }
    let gm = (1 + talk * 0.003) * (mods.gold || 1); try { if (typeof cbGoldMult === 'function') gm *= cbGoldMult(); } catch (e) {}
    let r = { gold: Math.round(c.gold * gm * mul), fame: Math.round(c.fame * (1 + charm * 0.005) * (mods.fame || 1) * (success ? (great ? 2 : 1) : 0)), wood: 0, ore: 0, magic: 0, cards: {}, items: [], tickets: 0, food: 0, diamonds: 0 };
    if (success) {
        if (c.rank === 'S' || c.type === 'bounty') r.diamonds = 5;
        else if (c.rank === 'A') r.diamonds = 2;
        else if (c.rank === 'B') r.diamonds = 1;
    }
    if (success && (c.rank === 'B') && Math.random() < 0.08) r.tickets = 1;
    if (success && c.rank === 'A') r.tickets = (r.tickets || 0) + 1;
    if (success && great && (c.rank === 'B' || c.rank === 'A')) r.tickets = (r.tickets || 0) + 1;
    let ws = 1 + _cbLv('workshop') * 0.02;
    if (c.map && typeof cbExpedRewards === 'function' && success) {
        let lv = Math.max.apply(null, job.members.map(m => m.lv));
        let base = cbExpedRewards({ map: c.map, hours: Math.max(1, Math.round(c.hours || 1)), lv, seed: job.seed }, gdBoardLv()) || {};
        let rm = c.type === 'gather' || c.type === 'craft' ? 1.5 : (c.type === 'survey' || c.type === 'relic' ? 0.8 : 0.5);
        rm *= ws * (mods.res || 1);
        r.wood = Math.round((base.wood || 0) * rm * mul); r.ore = Math.round((base.ore || 0) * rm * mul); r.magic = Math.round((base.magic || 0) * (c.type === 'survey' ? 2 : rm) * mul);
        if (c.type === 'hunt' || c.type === 'bounty' || c.type === 'rescue') r.cards = base.cards || {};
        if (c.type === 'survey' || c.type === 'hunt' || c.type === 'relic' || c.type === 'craft') r.items = base.items || [];
        let bs = _cbLv('blacksmith');
        let gearChance = Math.min(0.40, bs * 0.03 + _cbLv('workshop') * 0.01) * (mods.gear || 1);
        if (gearChance > 0 && gdLevel() >= 3 && Math.random() < gearChance) {
            try { let ex = cbExpedRewards({ map: c.map, hours: 8, lv, seed: (job.seed ^ 0x9e3779b9) >>> 0 }, gdBoardLv()) || {}; if (ex.items && ex.items.length) r.items = r.items.concat(ex.items.slice(0, 1)); } catch (e) {}
        }
        // 低率稀有：A/S／大成功額外一次
        let rareP = ({ D: 0.004, C: 0.008, B: 0.015, A: 0.03, S: 0.06 })[c.rank] || 0;
        if (great) rareP *= 1.5;
        rareP *= (mods.gear || 1);
        if (Math.random() < rareP) {
            try { let ex = cbExpedRewards({ map: c.map, hours: 8, lv, seed: (job.seed ^ 0x85ebca6b) >>> 0 }, gdBoardLv()) || {}; if (ex.items && ex.items.length) r.items = r.items.concat(ex.items.slice(0, 1)); } catch (e) {}
        }
    }
    if (success && (c.type === 'cook' || _cbLv('kitchen') >= 1) && Math.random() < 0.35 + _cbLv('kitchen') * 0.05) r.food = 1;
    return r;
}
function gdGrant(r, src) {
    let parts = [];
    if (r.gold) { player.gold = (player.gold || 0) + r.gold; parts.push(`💰 ${r.gold.toLocaleString()}`); }
    let g = gdData(), lv0 = gdLevel(g);
    if (r.fame) { g.fame += r.fame; parts.push(`🎖️ 名聲 +${r.fame}`); }
    try { let cb = ensureClanBase(); ['wood', 'ore', 'magic'].forEach(k => { if (r[k] > 0) { cb.res[k] = (cb.res[k] || 0) + r[k]; parts.push({ wood: '🪵 木材', ore: '⛏️ 礦石', magic: '💎 魔法石' }[k] + ' ×' + r[k]); } }); } catch (e) {}
    Object.keys(r.cards || {}).forEach(nm => { try { if (typeof acquireCard === 'function') acquireCard(nm, 1, r.cards[nm]); } catch (e) {} parts.push(`🎴 ${nm} ×${r.cards[nm]}`); });
    (r.items || []).forEach(id => { try { gainItem(id, 1, true); } catch (e) {} parts.push(`✦ ${DB.items[id] ? DB.items[id].n : id}`); });
    if (r.tickets) { g.tickets = (g.tickets || 0) + r.tickets; parts.push(`🎟️ 抽卡券 ×${r.tickets}`); }
    if (r.diamonds) {
        try {
            let adj = (typeof DE !== 'undefined' && DE && typeof DE.grant === 'function')
                ? DE.grant(r.diamonds, 'guild')
                : (typeof pandoraAdjustSharedDiamonds === 'function' ? pandoraAdjustSharedDiamonds(r.diamonds) : null);
            if (adj && adj.ok !== false) parts.push(`💎 ×${r.diamonds}`);
        } catch (e) {}
    }
    let lv1 = gdLevel(g);
    if (lv1 > lv0) logSys(`<span class="text-amber-200 font-bold">🏛️ 冒險者公會升至 Lv${lv1}！解鎖：${GD_LV_UNLOCK[lv1] || ''}</span>`);
    return parts;
}
function gdClaim(jobId, silent) {
    let g = gdData(), job = g.jobs.find(j => j.id === jobId);
    if (!job || Date.now() < job.endAt) return null;
    let roll = _rng(job.seed ^ 0x5bd1e995)() * 100;
    let greatMul = 0.18;
    if (window.TL) {
        try {
            let mm = (GD.members ? GD.members() : []).filter(m => job.members.some(j => j.slot === m.slot));
            let mods = TL.rewardModsParty ? TL.rewardModsParty(mm.length ? mm : job.members) : TL.rewardMods();
            greatMul *= (mods.great || 1);
        } catch (e) {}
    }
    let success = roll < job.rate, great = success && roll < job.rate * greatMul;
    let r = gdRewardFor(job, success, great);
    g.jobs = g.jobs.filter(j => j !== job);
    let stamRefund = Math.floor(_cbLv('kitchen') * 0.05 * 10) / 10; // 每級 5% 機率退 1 體力：簡化為每 20% 廚房等級退 1（等級/5 向下）
    let refundN = Math.floor(_cbLv('kitchen') / 5);
    job.members.forEach(m => {
        gdBusyClear(m.slot);
        let st = gdMemberState(m.slot);
        if (success) st.aff += great ? 2 : 1;
        if (success && refundN > 0) st.used = Math.max(0, (st.used || 0) - refundN);
    });
    if (r.food) {
        try {
            let cb = ensureClanBase();
            if (!Array.isArray(cb.buffFood)) cb.buffFood = [];
            cb.buffFood.push({ id: 'bento', atk: 0.03, def: 0.03, expAt: Date.now() + 30 * 60 * 1000 });
            // trim expired
            cb.buffFood = cb.buffFood.filter(f => f && f.expAt > Date.now()).slice(-5);
        } catch (e) {}
    }
    let parts = gdGrant(r);
    if (r.food) parts.push('🍱 便當');
    let tn = (GD_TYPES[job.card.type] || {}).n || job.card.type;
    logSys(`<span class="text-amber-300">【冒險者公會】</span>${job.card.rank} 級${tn}「${job.card.mapName}」${success ? (great ? '<b class="text-yellow-300">大成功！</b>' : '成功') : '<span class="text-red-400">失敗</span>'}：${parts.join('、') || '—'}`);
    _memCache.at = 0;
    if (!silent) { try { saveGame(); } catch (e) {} try { if (typeof updateUI === 'function') updateUI(); } catch (e) {} }
    return { success, great, r };
}
function gdClaimAll() {
    let g = gdData(), n = 0, now = Date.now();
    g.jobs.filter(j => now >= j.endAt).map(j => j.id).forEach(id => { if (gdClaim(id, true)) n++; });
    try { let cb = ensureClanBase(); (cb.exped || []).filter(e => now >= e.endAt).map(e => e.id).forEach(id => { if (cbExpedClaim(id, true)) n++; }); } catch (e) {}
    if (n) { try { saveGame(); } catch (e) {} try { updateUI(); } catch (e) {} }
    return n;
}
function gdLegacyJobs() { try { return (ensureClanBase().exped || []).map(e => ({ legacy: true, id: e.id, name: e.name, mapName: e.mapName || e.map, hours: e.hours, endAt: e.endAt, startAt: e.startAt })); } catch (e) { return []; } }
function gdClaimLegacy(id) { try { let r = cbExpedClaim(id); _memCache.at = 0; return r; } catch (e) { return null; } }

// 頭目懸賞（js/53 野外擊殺後呼叫此處結算）
function gdBountyResult(cid, win, stars) {
    let g = gdData(), card = g.board.find(c => c.id === cid);
    if (!card) return null;
    if (!win) return null;
    let mul = (0.6 + 0.2 * (stars || 1)) * (gdLevel(g) >= 10 ? 1.5 : 1);   // 公會 Lv10 傳說懸賞 +50%
    let first = !g.bounty.done[card.boss];
    let r = { gold: Math.round(card.gold * mul), fame: Math.round(card.fame * mul), wood: 0, ore: 0, magic: 0, cards: {}, items: [],
              tickets: card.rank === 'S' ? (first ? 3 : 1) : (stars >= 3 ? 1 : 0),
              diamonds: card.rank === 'S' ? 5 : (card.rank === 'A' ? 2 : 0) };
    try { if (card.bossName && typeof cardId === 'function' && DB.items[cardId(card.bossName, 1)]) r.cards[card.bossName] = 1; } catch (e) {}
    g.bounty.done[card.boss] = Math.max(g.bounty.done[card.boss] || 0, stars || 1);
    card.taken = true; card.cleared = stars;
    let parts = gdGrant(r);
    logSys(`<span class="text-amber-200 font-bold">👑 頭目懸賞「${card.bossName}」完成 ${'★'.repeat(stars || 1)}：</span>${parts.join('、')}`);
    try { saveGame(); } catch (e) {}
    return r;
}

// ---------- 自動派遣（自己、隊伍傭兵、其他存檔角色）----------
function gdAutoPick(card, exclude) {
    exclude = exclude || new Set();
    if (!card.gates) card.gates = gdDefaultGates(card.rank, card.type);
    let free = gdMembersLive(true).filter(m => !m.why && !exclude.has(m.slot));
    if (!free.length) return null;
    free.sort((a, b) => ((b.tr[card.trait] || 0) * 0.8 + (b.tr[card.sub] || 0) * 0.2 + b.lv * 0.1) - ((a.tr[card.trait] || 0) * 0.8 + (a.tr[card.sub] || 0) * 0.2 + a.lv * 0.1));
    let top = free.slice(0, 8), best = null;
    let pmin = card.gates.partyMin || 2, pmax = Math.min(5, card.gates.partyMax || 5);
    let consider = team => {
        if (team.length < pmin || team.length > pmax) return;
        if (!gdGatesOk(card, team).ok) return;
        let d = gdScoreLive(card, team);
        if (!best || d.rate > best.rate || (d.rate === best.rate && team.length < best.team.length)) best = { team, rate: d.rate, S: d.S };
    };
    // 貪婪：從 pmin 到 pmax 組合（限制前 8 人）
    function comb(start, acc) {
        if (acc.length >= pmin) consider(acc.slice());
        if (acc.length >= pmax) return;
        for (let i = start; i < top.length; i++) { acc.push(top[i]); comb(i + 1, acc); acc.pop(); }
    }
    comb(0, []);
    if (!best) return null;
    return { slots: best.team.map(m => m.slot), rate: best.rate, names: best.team.map(m => m.name), S: best.S };
}
function gdAutoDispatchAll(minRate) {
    minRate = Number(minRate) || 50;
    let g = gdData(); gdEnsureBoard();
    let val = c => c.gold * (1 + c.fame / 50);
    let cards = g.board.filter(c => !c.taken && !(c.type === 'bounty')).sort((a, b) => val(b) - val(a));
    let used = new Set(), n = 0;
    for (let c of cards) {
        if (g.jobs.length >= gdDispatchSlots()) break;
        let p = gdAutoPick(c, used);
        if (!p || p.rate < minRate) continue;
        let r = gdDispatch(c.id, p.slots);
        if (r.ok) { n++; p.slots.forEach(s => used.add(s)); }
    }
    if (!n) logSys('<span class="text-amber-300">【冒險者公會】</span>沒有可自動派遣的委託（派遣欄已滿、成員體力不足或成功率低於 ' + minRate + '%）。');
    return n;
}
function gdBasePanelHtml(cb, now) {
    let g = gdData(); if (!g) return '';
    gdEnsureBoard();
    let lv = gdBoardLv(), open = g.board.filter(c => !c.taken).length, ready = g.jobs.filter(j => now >= j.endAt).length + (cb.exped || []).filter(e => now >= e.endAt).length;
    let h = '<div class="cb-sec cb-exp-sec" id="cb-exped-panel"><div class="cb-sec-h">📋 委託板 Lv.' + lv + '・冒險者公會 Lv.' + gdLevel(g) + '</div>';
    h += '<div class="cb-sec-note">每日 05:00 刷新 D–S 級委託；派遣自己與隊伍中的傭兵（以及其他存檔角色）執行；人留在場上，不影響掛機。今日可接 ' + open + ' 張・派遣欄 ' + g.jobs.length + '/' + gdDispatchSlots() + '・名聲 ' + g.fame.toLocaleString() + '</div>';
    if ((cb.exped || []).length) h += '<div class="cb-sec-note">舊探險派遣 ' + cb.exped.length + ' 件已轉入委託板「進行中」，到時照原規則領取。</div>';
    h += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px"><button type="button" class="btn cb-btn cb-btn-go" onclick="gdUiOpen()">📋 開啟委託板</button>'
       + '<button type="button" class="btn cb-btn cb-btn-go" onclick="gdAutoDispatchAll();try{renderClanBaseTab()}catch(e){}">⚡ 一鍵自動派遣</button>'
       + (ready ? '<button type="button" class="btn cb-btn cb-btn-go" onclick="GD.claimAll();try{renderClanBaseTab()}catch(e){}">全部領取（' + ready + '）</button>' : '') + '</div>';
    return h + '</div>';
}
// 野外掛機加成：包裝 js/39 cbExpMult／cbGoldMult（js/05 killMob 以全域識別字呼叫）
try {
    const _oG = window.cbGoldMult, _oE = window.cbExpMult;
    if (typeof _oG === 'function' && !_oG.__gd) { const w = function () { let v = _oG.apply(this, arguments); try { if (player && player.guild) v *= gdFieldGoldMult(); } catch (e) {} return v; }; w.__gd = true; window.cbGoldMult = w; }
    if (typeof _oE === 'function' && !_oE.__gd) { const w = function () { let v = _oE.apply(this, arguments); try { if (player && player.guild) v *= gdFieldExpMult(); } catch (e) {} return v; }; w.__gd = true; window.cbExpMult = w; }
} catch (e) {}
window.gdAutoDispatchAll = gdAutoDispatchAll;
window.gdBasePanelHtml = gdBasePanelHtml;

window.GD = {
    RANKS: GD_RANKS, RANK: GD_RANK, TYPES: GD_TYPES, TRAIT_N: GD_TRAIT_N, CLS_LABEL: GD_CLS_LABEL, FAME_LV: GD_FAME_LV,
    data: gdData, level: gdLevel, nextFame: gdNextFame, boardLv: gdBoardLv, boardSize: gdBoardSize, dispatchSlots: gdDispatchSlots, members: gdMembers, memberPortrait: gdMemberPortrait,
    ensureBoard: gdEnsureBoard, refresh: gdRefresh, keep: gdKeep, rate: gdRate, scoreDetail: gdScoreDetail, gatesOk: gdGatesOk, defaultGates: gdDefaultGates, dispatch: gdDispatch, claim: gdClaim, claimAll: gdClaimAll, durationMul: gdDurationMul,
    legacyJobs: gdLegacyJobs, claimLegacy: gdClaimLegacy, activeCount: gdActiveCount, bountyReady: gdBountyReady, bountyResult: gdBountyResult,
    dayKey: gdDayKey, affLv: gdAffLv, affNext: gdAffNext, affCap: gdAffCap, LV_UNLOCK: GD_LV_UNLOCK, fieldGoldMult: gdFieldGoldMult, fieldExpMult: gdFieldExpMult, cbLv: _cbLv, gdRefreshMembers: () => { _memCache.at = 0; }, autoPick: gdAutoPick, autoDispatchAll: gdAutoDispatchAll, traits: gdTraits, memberState: gdMemberState, grant: gdGrant, REFRESH_COST: GD_REFRESH_COST, REFRESH_MAX: GD_REFRESH_MAX
};
})();
