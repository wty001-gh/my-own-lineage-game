// ===== 🏛️ v3.8.117 冒險者公會 G1：委託板 MVP（design/guild-v1.md）=====
// 玩家＝公會長；成員＝其他存檔角色（slotSummary）。每日 05:00（台北）刷新委託；D–S 等級；討伐／護送／採集／調查自動派遣；
// 頭目懸賞（A 簡易／S）＝接受後於野外掛機地圖生成懸賞頭目（js/53，v3.8.118）。收益重用 js/39 cbExpedRewards；忙碌鎖共用 lineage_idle_exped_busy。
// 存檔：player.guild（缺欄位自動補）；舊探險公會派遣（clanBase.exped）合併顯示於「進行中」並可直接領取（cbExpedClaim）。
(function () {
'use strict';

const GD_RANKS = ['D', 'C', 'B', 'A', 'S'];
const GD_RANK = {
    D: { req: 20, gold: 20000, fame: 5, hours: [0.5, 1], w: 40, glv: 1, lv: [1, 20] },
    C: { req: 40, gold: 80000, fame: 12, hours: [1, 4], w: 30, glv: 1, lv: [20, 40] },
    B: { req: 60, gold: 300000, fame: 30, hours: [4, 8], w: 18, glv: 3, lv: [40, 60] },
    A: { req: 80, gold: 1000000, fame: 70, hours: [8], w: 9, glv: 5, lv: [60, 80] },
    S: { req: 100, gold: 3000000, fame: 200, hours: [0], w: 3, glv: 7, lv: [80, 100] }
};
const GD_TYPES = {
    hunt:   { n: '討伐', emoji: '⚔️', trait: 'power', sub: 'stamina' },
    escort: { n: '護送', emoji: '🛡️', trait: 'talk', sub: 'power', goldMul: 1.3, fameMul: 1.5 },
    gather: { n: '採集', emoji: '🌿', trait: 'gather', sub: 'explore' },
    survey: { n: '調查', emoji: '🗺️', trait: 'explore', sub: 'talk', fameMul: 1.2 },
    bounty: { n: '頭目懸賞', emoji: '👑', trait: 'power', sub: 'power', goldMul: 1, fameMul: 1 }
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
function gdBoardSize() { return Math.min(12, 6 + Math.floor(gdBoardLv() * 0.6)); }
function gdDispatchSlots() { return Math.min(6, 2 + Math.floor(gdBoardLv() / 2)); }
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
function gdTraits(sum, st) {
    let cls = GD_CLS_BASE[sum.rawCls] ? sum.rawCls : 'knight', b = GD_CLS_BASE[cls], lv = Math.max(1, Number(sum.lv) || 1);
    let al = gdAffLv(st ? st.aff : 0), ab = (al - 1) * 2 + (_cbLv('keep') >= 10 ? 5 : 0), lb = Math.floor(lv * 0.3);   // 公會本部 Lv10 公會徽章 +5
    let c = v => Math.max(0, Math.min(100, Math.round(v)));
    return { explore: c(b.explore + lb + ab), talk: c(b.talk + lb + ab), gather: c(b.gather + lb + ab), charm: c(b.charm + lb + ab),
             power: c(lv * 0.8 + 15 + ab), stamina: Math.round(b.stamina * (1 + _cbLv('dorm') * 0.1)), affLv: al };   // 宿舍 +10%／級
}
function gdMembers(force) {
    let now = Date.now();
    if (!force && now - _memCache.at < 15000) return _memCache.list;
    let out = [], lim = (typeof SAVE_SLOT_MAX === 'number' && SAVE_SLOT_MAX > 0) ? SAVE_SLOT_MAX : 16, cur = _cur();
    let inParty = new Set(((player && player.allies) || []).filter(Boolean).map(a => String(a._slot)));
    let hired = null; try { if (typeof mercEmploymentMap === 'function') hired = mercEmploymentMap(); } catch (e) {}
    let busy = {}; try { busy = JSON.parse(localStorage.getItem(BUSY_KEY) || '{}') || {}; } catch (e) {}
    for (let n = 1; n <= lim; n++) {
        let s = String(n); if (s === cur) continue;
        let sum = null; try { sum = (typeof slotSummary === 'function') ? slotSummary(n) : null; } catch (e) {}
        if (!sum || !sum.name || !sum.rawCls) continue;
        let why = '';
        if (!!sum.classic !== !!(player && player.classicMode)) why = '模式不同';
        else if (inParty.has(s)) why = '隊伍中';
        else if (hired && hired[s] && typeof mercSlotHiredByOther === 'function' && mercSlotHiredByOther(s, hired)) why = '受僱中';
        else if (busy[s] && busy[s].endAt > now) why = '外出中';
        let st = gdMemberState(s), tr = gdTraits(sum, st);
        if (!why && st.used >= tr.stamina) why = '體力不足';
        out.push({ slot: s, name: sum.name, cls: sum.rawCls, lv: Math.max(1, Number(sum.lv) || 1), avatar: sum.avatar, tr, st, why });
    }
    _memCache = { at: now, list: out };
    return out;
}
function gdMemberPortrait(m) {
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
function gdMakeCard(rank, type, r, idx) {
    let R = GD_RANK[rank], m = gdPickMap(rank, r);
    let hours = R.hours[Math.floor(r() * R.hours.length)];
    let T = GD_TYPES[type];
    let c = { id: 'q' + idx + '_' + Math.floor(r() * 1e9).toString(36), rank, type, map: m ? m.v : '', mapName: m ? m.name : '—', mapAvg: m ? m.avg : 1,
              hours, req: R.req, trait: T.trait, sub: T.sub, gold: Math.round(R.gold * (T.goldMul || 1) * (GD_HOUR_MUL[hours] || 1) * (0.9 + r() * 0.2)),
              fame: Math.round(R.fame * (T.fameMul || 1)), seed: Math.floor(r() * 4294967295) >>> 0 };
    if (type === 'bounty' && m) { let b = gdPickBoss(m.v, rank, r); c.boss = b.boss; c.pool = b.pool.length ? b.pool : [b.boss]; c.bossName = (DB.mobs[b.boss] || {}).n || b.boss; }
    return c;
}
function gdGenBoard(g, extraSeed) {
    let lv = gdLevel(g), r = _rng(_hash(gdDayKey() + '|' + _cur() + '|' + (extraSeed || 0)));
    let allowed = GD_RANKS.filter(k => lv >= GD_RANK[k].glv && (k !== 'S' || gdBountyReady()));
    let tot = allowed.reduce((a, k) => a + GD_RANK[k].w, 0);
    let n = gdBoardSize(), cards = [];
    let types = ['hunt', 'escort', 'gather', 'survey'];
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
    let combo = Math.min(15, (mems.length - 1) * 5 + (new Set(mems.map(m => m.cls)).size >= 3 ? 5 : 0));
    return main * 0.8 + sub * 0.2 + combo;
}
function gdRate(card, mems) {
    if (!mems.length) return 0;
    let t = gdTeamValue(card, mems);
    let rate = 50 + (t - card.req) * 1.5;
    let lvGap = card.mapAvg - Math.max.apply(null, mems.map(m => m.lv));
    if (lvGap > 5) rate -= (lvGap - 5) * 3;
    if (card.type === 'survey') rate += _cbLv('mage');   // 魔法塔：調查委託 +1%／級
    let cap = card.type === 'bounty' ? 60 : 95;
    return Math.round(Math.max(5, Math.min(cap, rate)));
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
    if (card.type === 'bounty' && card.rank === 'S') return { ok: false, msg: 'S 級頭目懸賞必須親自帶隊。' };
    if (card.taken) return { ok: false, msg: '此委託已派遣。' };
    if (card.accepted) return { ok: false, msg: '此懸賞已親自接下（可先放棄再派遣）。' };
    slots = (slots || []).map(String).slice(0, 3);
    if (!slots.length) return { ok: false, msg: '請選擇成員（1–3 名）。' };
    if (g.jobs.length >= gdDispatchSlots()) return { ok: false, msg: `派遣欄已滿（${gdDispatchSlots()}）。` };
    let all = gdMembers(true), mems = slots.map(s => all.find(m => m.slot === s)).filter(Boolean);
    let bad = mems.find(m => m.why); if (bad) return { ok: false, msg: `${bad.name} 無法派遣：${bad.why}` };
    if (mems.length !== slots.length) return { ok: false, msg: '成員資料已變更，請重試。' };
    let rate = gdRate(card, mems), now = Date.now();
    let hrs = card.type === 'bounty' ? 8 : card.hours;
    let job = { id: 'j' + now.toString(36) + Math.floor(Math.random() * 1e5).toString(36), card: JSON.parse(JSON.stringify(card)), members: mems.map(m => ({ slot: m.slot, name: m.name, cls: m.cls, lv: m.lv })),
                rate, startAt: now, endAt: now + hrs * 3600000, seed: card.seed };
    g.jobs.push(job); card.taken = true;
    mems.forEach(m => { m.st.used++; gdBusySet(m.slot, job.endAt); });
    _memCache.at = 0;
    logSys(`<span class="text-amber-300">【冒險者公會】</span>${mems.map(m => m.name).join('、')} 接下 ${card.rank} 級${GD_TYPES[card.type].n}委託（${card.mapName}），成功率 ${rate}%，${hrs} 小時後歸來。`);
    try { saveGame(); } catch (e) {}
    return { ok: true, job };
}
function gdRewardFor(job, success, great) {
    let c = job.card, mul = success ? (great ? 2 : 1) : 0.25;
    let talk = 0, charm = 0;
    let all = gdMembers();
    job.members.forEach(jm => { let m = all.find(x => x.slot === jm.slot); let tr = m ? m.tr : gdTraits({ rawCls: jm.cls, lv: jm.lv }, null); talk += tr.talk; charm += tr.charm; });
    talk /= job.members.length; charm /= job.members.length;
    let gm = 1 + talk * 0.003; try { if (typeof cbGoldMult === 'function') gm *= cbGoldMult(); } catch (e) {}
    let r = { gold: Math.round(c.gold * gm * mul), fame: Math.round(c.fame * (1 + charm * 0.005) * (success ? (great ? 2 : 1) : 0)), wood: 0, ore: 0, magic: 0, cards: {}, items: [] };
    if (c.map && typeof cbExpedRewards === 'function' && success) {
        let lv = Math.max.apply(null, job.members.map(m => m.lv));
        let base = cbExpedRewards({ map: c.map, hours: Math.max(1, Math.round(c.hours || 1)), lv, seed: job.seed }, gdBoardLv()) || {};
        let rm = c.type === 'gather' ? 1.5 : (c.type === 'survey' ? 0.8 : 0.5);
        r.wood = Math.round((base.wood || 0) * rm * mul); r.ore = Math.round((base.ore || 0) * rm * mul); r.magic = Math.round((base.magic || 0) * (c.type === 'survey' ? 2 : rm) * mul);
        if (c.type === 'hunt' || c.type === 'bounty') r.cards = base.cards || {};
        if (c.type === 'survey' || c.type === 'hunt') r.items = base.items || [];
        let bs = _cbLv('blacksmith');   // 鍛造屋：委託帶回裝備 +3%／級（額外一次掉落判定）
        if (bs > 0 && gdLevel() >= 3 && Math.random() < bs * 0.03) {
            try { let ex = cbExpedRewards({ map: c.map, hours: 8, lv, seed: (job.seed ^ 0x9e3779b9) >>> 0 }, gdBoardLv()) || {}; if (ex.items && ex.items.length) r.items = r.items.concat(ex.items.slice(0, 1)); } catch (e) {}
        }
    }
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
    let lv1 = gdLevel(g);
    if (lv1 > lv0) logSys(`<span class="text-amber-200 font-bold">🏛️ 冒險者公會升至 Lv${lv1}！解鎖：${GD_LV_UNLOCK[lv1] || ''}</span>`);
    return parts;
}
function gdClaim(jobId, silent) {
    let g = gdData(), job = g.jobs.find(j => j.id === jobId);
    if (!job || Date.now() < job.endAt) return null;
    let roll = _rng(job.seed ^ 0x5bd1e995)() * 100;
    let success = roll < job.rate, great = success && roll < job.rate * 0.2;
    let r = gdRewardFor(job, success, great);
    g.jobs = g.jobs.filter(j => j !== job);
    job.members.forEach(m => { gdBusyClear(m.slot); let st = gdMemberState(m.slot); if (success) st.aff += great ? 2 : 1; });
    let parts = gdGrant(r);
    logSys(`<span class="text-amber-300">【冒險者公會】</span>${job.card.rank} 級${GD_TYPES[job.card.type].n}「${job.card.mapName}」${success ? (great ? '<b class="text-yellow-300">大成功！</b>' : '成功') : '<span class="text-red-400">失敗</span>'}：${parts.join('、') || '—'}`);
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
              tickets: card.rank === 'S' ? (first ? 3 : 1) : (stars >= 3 ? 1 : 0) };
    try { if (card.bossName && typeof cardId === 'function' && DB.items[cardId(card.bossName, 1)]) r.cards[card.bossName] = 1; } catch (e) {}
    g.bounty.done[card.boss] = Math.max(g.bounty.done[card.boss] || 0, stars || 1);
    card.taken = true; card.cleared = stars;
    let parts = gdGrant(r);
    logSys(`<span class="text-amber-200 font-bold">👑 頭目懸賞「${card.bossName}」完成 ${'★'.repeat(stars || 1)}：</span>${parts.join('、')}`);
    try { saveGame(); } catch (e) {}
    return r;
}

// ---------- 自動派遣（成員＝其他存檔角色＝傭兵）----------
function gdAutoPick(card, exclude) {
    exclude = exclude || new Set();
    let free = gdMembers(true).filter(m => !m.why && !exclude.has(m.slot));
    if (!free.length) return null;
    free.sort((a, b) => ((b.tr[card.trait] || 0) * 0.8 + (b.tr[card.sub] || 0) * 0.2 + b.lv * 0.1) - ((a.tr[card.trait] || 0) * 0.8 + (a.tr[card.sub] || 0) * 0.2 + a.lv * 0.1));
    let top = free.slice(0, 7), best = null;
    let consider = team => { let r = gdRate(card, team); if (!best || r > best.rate || (r === best.rate && team.length < best.team.length)) best = { team, rate: r }; };
    for (let i = 0; i < top.length; i++) {
        consider([top[i]]);
        for (let j = i + 1; j < top.length; j++) {
            consider([top[i], top[j]]);
            for (let k = j + 1; k < top.length; k++) consider([top[i], top[j], top[k]]);
        }
    }
    if (!best) return null;
    // 達 90% 以上時改用最少人數（保留體力給其他委託）
    for (let n = 1; n <= 3; n++) {
        let alt = null;
        let tryT = team => { let r = gdRate(card, team); if (r >= Math.min(90, best.rate) && (!alt || r > alt.rate)) alt = { team, rate: r }; };
        if (n === 1) top.forEach(a => tryT([a]));
        else if (n === 2) top.forEach((a, i) => top.slice(i + 1).forEach(b => tryT([a, b])));
        else break;
        if (alt) { best = alt; break; }
    }
    return { slots: best.team.map(m => m.slot), rate: best.rate, names: best.team.map(m => m.name) };
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
    h += '<div class="cb-sec-note">每日 05:00 刷新 D–S 級委託；派遣其他存檔角色（傭兵）執行。今日可接 ' + open + ' 張・派遣欄 ' + g.jobs.length + '/' + gdDispatchSlots() + '・名聲 ' + g.fame.toLocaleString() + '</div>';
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
    data: gdData, level: gdLevel, nextFame: gdNextFame, boardLv: gdBoardLv, dispatchSlots: gdDispatchSlots, members: gdMembers, memberPortrait: gdMemberPortrait,
    ensureBoard: gdEnsureBoard, refresh: gdRefresh, keep: gdKeep, rate: gdRate, dispatch: gdDispatch, claim: gdClaim, claimAll: gdClaimAll,
    legacyJobs: gdLegacyJobs, claimLegacy: gdClaimLegacy, activeCount: gdActiveCount, bountyReady: gdBountyReady, bountyResult: gdBountyResult,
    dayKey: gdDayKey, affLv: gdAffLv, affNext: gdAffNext, affCap: gdAffCap, LV_UNLOCK: GD_LV_UNLOCK, fieldGoldMult: gdFieldGoldMult, fieldExpMult: gdFieldExpMult, cbLv: _cbLv, gdRefreshMembers: () => { _memCache.at = 0; }, autoPick: gdAutoPick, autoDispatchAll: gdAutoDispatchAll, traits: gdTraits, memberState: gdMemberState, grant: gdGrant, REFRESH_COST: GD_REFRESH_COST, REFRESH_MAX: GD_REFRESH_MAX
};
})();
