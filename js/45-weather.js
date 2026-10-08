// 🌦️ v3.8.99 天氣與晝夜（weather.20261006c）
// 晝夜：依台北時間（UTC+8）19:00–05:59 為夜晚——不死族／惡魔族怪物 HP 與傷害 +15%、掉落率 +20%（試煉之塔除外）。
// 天氣：每 2 小時（台北時間）以「日期＋時段」為種子決定：晴／雨／雷雨／霧／風／雪；室內地圖（地監／塔／大墳墓／洞穴／王之室…）不受天氣影響。
// 效果（溫和）：雨 水+10% 火−10%；雷雨 風+15%＋偶發落雷；霧 全員命中−3（遠距−5）；風 風+10%、遠距命中−3；雪 水+10%、玩家與怪物攻速−5%；晴 無。
// 世界事件掛鉤：weGetActive().events 中帶 weather 欄位（'晴'|'雨'|'雷雨'|'霧'|'風'|'雪'）的事件會覆寫天氣；亦可 wxSetOverride(type, untilMs)。
// 另：spawnMob 包裝鉤子統一套用 trialOnMobSpawn／weMutateMob／wxOnMobSpawn（v3.8.98 原掛點只在安塔瑞斯分支）；v3.8.102 起先呼叫 weOnMobSpawn（世界事件頭目替換）。
(function () {
'use strict';

const WX_TZ_OFFSET = 8 * 3600 * 1000;
const WX_SLOT_MS = 2 * 3600 * 1000;
const WX_NIGHT_MULT = 1.15;
const WX_NIGHT_DROP = 1.20;
const WX_TYPES = {
    '晴':   { key: 'clear', emoji: '☀️', d: '無特殊效果。' },
    '雨':   { key: 'rain',  emoji: '🌧️', d: '水屬性傷害 +10%、火屬性傷害 −10%。', ele: { water: 1.10, fire: 0.90 } },
    '雷雨': { key: 'storm', emoji: '⛈️', d: '風屬性傷害 +15%；偶發落雷劈中敵人（不會致死）。', ele: { wind: 1.15 } },
    '霧':   { key: 'fog',   emoji: '🌫️', d: '所有人命中 −3（遠距命中共 −5）。' },
    '風':   { key: 'wind',  emoji: '🌬️', d: '風屬性傷害 +10%；遠距（弓箭）命中 −3。', ele: { wind: 1.10 } },
    '雪':   { key: 'snow',  emoji: '❄️', d: '水屬性傷害 +10%；玩家、傭兵與怪物攻擊速度 −5%。', ele: { water: 1.10 } }
};
const WX_ORDER = ['晴', '雨', '雷雨', '霧', '風', '雪'];
const WX_INDOOR_EXTRA = ['trial_tower', 'pirate_dungeon', 'fire_dragon', 'elf_grave', 'elf_grave_corrupt', 'hidden_cave', 'giant_tomb',
    'collapsed_elder_council_hall', 'thebes_pyramid', 'thebes_temple', 'thebes_nm_pyramid', 'thebes_nm_temple',
    'tikal_deep', 'tikal_altar', 'tikal_nm_deep', 'tikal_nm_altar', 'pride_climb'];
let _wxOverride = null;   // { type, until }
let _wxLastSpellEle = null;
let _wxLastKey = '';
let _wxLastBolt = 0;

function wxNow() { try { if (typeof window.__wxNowOverride === 'function') return Number(window.__wxNowOverride()) || Date.now(); } catch (e) {} return Date.now(); }
function _wxTpe(now) { return new Date((now || wxNow()) + WX_TZ_OFFSET); }   // 用 getUTC* 讀取＝台北時間
function wxIsNight(now) { let h = _wxTpe(now).getUTCHours(); return h >= 19 || h < 6; }
function wxSlotKey(now) { let t = _wxTpe(now); return t.getUTCFullYear() * 10000 + (t.getUTCMonth() + 1) * 100 + t.getUTCDate() + ':' + Math.floor(t.getUTCHours() / 2); }
function _wxHash(str) { let h = 2166136261 >>> 0; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995) >>> 0; h ^= h >>> 15; return h >>> 0; }
// 決定性天氣：同一日期＋2 小時時段在任何裝置都相同
function wxWeatherForSlot(now) {
    let t = _wxTpe(now), mon = t.getUTCMonth() + 1;
    let w = { '晴': 34, '雨': 18, '雷雨': 10, '霧': 12, '風': 16, '雪': (mon === 12 || mon <= 2) ? 18 : 10 };
    let tot = WX_ORDER.reduce((s, k) => s + w[k], 0);
    let x = (_wxHash('lineage-wx|' + wxSlotKey(now)) % 100000) / 100000 * tot;
    for (let k of WX_ORDER) { x -= w[k]; if (x < 0) return k; }
    return '晴';
}
function wxSetOverride(type, untilMs) { _wxOverride = (type && WX_TYPES[type]) ? { type, until: Number(untilMs) || 0 } : null; wxRefresh(true); }
function _wxEventWeather() {
    try { if (typeof weGetActive === 'function') { let ev = (weGetActive().events || []).find(e => e && e.weather && WX_TYPES[e.weather]); if (ev) return ev.weather; } } catch (e) {}
    return null;
}
function wxRawWeather(now) {
    now = now || wxNow();
    if (_wxOverride && (!_wxOverride.until || now < _wxOverride.until)) return _wxOverride.type;
    return _wxEventWeather() || wxWeatherForSlot(now);
}
function wxIsIndoor(v) {
    if (!v) v = (typeof mapState !== 'undefined' && mapState) ? mapState.current : '';
    v = String(v || '');
    if (!v) return false;
    if (v.startsWith('pride_') || v.startsWith('nazarick_') || /_lair$/.test(v) || /_king_room$/.test(v) || v === 'king_baranka_room') return true;
    if (WX_INDOOR_EXTRA.includes(v)) return true;
    try { if (typeof ANTHARAS_AREA_BOSS !== 'undefined' && ANTHARAS_AREA_BOSS[v]) return true; } catch (e) {}
    try { if (typeof mapCategoryOf === 'function') { let c = mapCategoryOf(v); if (c === 'dungeon' || c === 'tower' || c === 'nazarick') return true; } } catch (e) {}
    return false;
}
function wxState(now) {
    now = now || wxNow();
    let raw = wxRawWeather(now), indoor = wxIsIndoor();
    return { night: wxIsNight(now), raw, weather: indoor ? '晴' : raw, indoor, slot: wxSlotKey(now) };
}
function wxCurrent() { return wxState().weather; }
function wxEleMult(ele) { let t = WX_TYPES[wxCurrent()]; return (t && t.ele && ele && t.ele[ele]) || 1; }
// 物理：武器屬性（附魔／屬性武器）
function wxPhysDmgMult(who) {
    who = who || player;
    if (!who || !who.eq || !who.eq.wpn) return 1;
    let ele = '';
    try { ele = (typeof getWpnEle === 'function') ? getWpnEle(who.eq.wpn, DB.items[who.eq.wpn.id], who) : ''; } catch (e) {}
    return wxEleMult(ele);
}
// 魔法：魔法塔 +1%/級（全隊）×世界事件魔法倍率×天氣屬性（最近一次 magicAttrDefense 的法術屬性）
function extraMagicCoefMult(dStats) {
    let m = 1 + Math.max(0, Number(dStats && dStats.cbMagePct) || 0) / 100;
    try { if (typeof weDmgMult === 'function') m *= weDmgMult(true); } catch (e) {}
    if (_wxLastSpellEle) { m *= wxEleMult(_wxLastSpellEle); _wxLastSpellEle = null; }
    return m;
}
try {
    if (typeof magicAttrDefense === 'function' && !magicAttrDefense.__wx) {
        const _origMAD = magicAttrDefense;
        const _w = function (target, ele) { _wxLastSpellEle = ele || null; return _origMAD.apply(this, arguments); };
        _w.__wx = true;
        window.magicAttrDefense = _w;
    }
} catch (e) {}
// 屬性重算掛鉤（玩家與傭兵共用；傭兵重算時 p＝傭兵）
function wxApplyStats(p, d) {
    if (!p || !d) return;
    let w = wxCurrent();
    d.wxWeather = w;
    if (w === '霧') { d.extraHit = (d.extraHit || 0) - 3; d.rangedHit = (d.rangedHit || 0) - 2; }
    else if (w === '風') { d.rangedHit = (d.rangedHit || 0) - 3; }
    else if (w === '雪') { d.atkSpdPct = (d.atkSpdPct || 0) - 5; }
}
function _wxNightTarget(m) {
    if (!m) return false;
    if (m.raceMajor === 'undead' || m.raceMajor === 'demon') return true;
    try { return typeof isUndeadMob === 'function' && isUndeadMob(m); } catch (e) { return false; }
}
function wxOnMobSpawn(mob) {
    if (!mob || mob._wxApplied) return;
    mob._wxApplied = true;
    let cur = (typeof mapState !== 'undefined' && mapState) ? mapState.current : '';
    if (cur === 'trial_tower' || mob.race === '建築' || mob.trollPlayer) return;
    let st = wxState();
    if (st.night && _wxNightTarget(mob)) {
        mob.hp = Math.max(1, Math.floor((mob.hp || 1) * WX_NIGHT_MULT));
        mob.curHp = mob.hp;
        if (Array.isArray(mob.dmg)) mob.dmg = [Math.max(1, Math.floor(mob.dmg[0] * WX_NIGHT_MULT)), Math.max(1, Math.floor(mob.dmg[1] * WX_NIGHT_MULT))];
        if (mob.db) mob.db = Math.floor(mob.db * WX_NIGHT_MULT);
        mob._wxNight = true;
    }
    if (st.weather === '霧' && mob.hit != null) mob.hit = (mob.hit || 0) - 3;
    if (st.weather === '雪' && mob.atkSpd) mob.atkSpd = mob.atkSpd * 1.05;   // atkSpd＝攻擊間隔（秒）→ ×1.05＝攻速 −5%
}
function wxDropRateMult() {
    try {
        let li = (typeof _lootMobInfo !== 'undefined') ? _lootMobInfo : null;
        if (!li || li.map === 'trial_tower') return 1;
        if (!(li.rm === 'undead' || li.rm === 'demon' || li.und)) return 1;
        return wxIsNight() ? WX_NIGHT_DROP : 1;
    } catch (e) { return 1; }
}
// 雷雨落雷：約每 8 秒判定 25%，劈中隨機一名敵人（一般 3%／頭目 1% 最大 HP，上限 50+等級×5；不會致死）
function wxLightningTick() {
    if (typeof state === 'undefined' || !state.running || !player || player.dead) return;
    if (typeof mapState === 'undefined' || !mapState || !Array.isArray(mapState.mobs)) return;
    if (String(mapState.current || '').startsWith('town_') || wxCurrent() !== '雷雨') return;
    let now = Date.now();
    if (now - _wxLastBolt < 8000) return;
    _wxLastBolt = now;
    if (Math.random() >= 0.25) return;
    let live = mapState.mobs.filter(m => m && !m._dead && m.curHp > 1 && m.race !== '建築');
    if (!live.length) return;
    let m = live[Math.floor(Math.random() * live.length)];
    let dmg = Math.floor((m.hp || 1) * (m.boss ? 0.01 : 0.03));
    dmg = Math.max(1, Math.min(dmg, 50 + (player.lv || 1) * 5, m.curHp - 1));
    if (dmg <= 0) return;
    m.curHp -= dmg;
    try { if (typeof logCombat === 'function') logCombat(`<span class="text-yellow-300 font-bold">⚡ 落雷</span>劈中 ${m.n}，造成 ${dmg} 點傷害！`, 'player'); } catch (e) {}
    try { _wxFlash(); } catch (e) {}
    try { if (typeof renderMobs === 'function') renderMobs(); } catch (e) {}
}
// ===== spawnMob 包裝：統一套用試煉縮放／世界事件突變／晝夜天氣 =====
try {
    if (typeof spawnMob === 'function' && !spawnMob.__wxHook) {
        const _origSpawn = spawnMob;
        const _wrap = function (idx) {
            let before = (typeof mapState !== 'undefined' && mapState && mapState.mobs) ? mapState.mobs[idx] : null;
            let r = _origSpawn.apply(this, arguments);
            try {
                let m = mapState.mobs[idx];
                if (m && m !== before && !m._spawnHooked) {
                    // 🩹 v3.8.102 世界事件頭目：條件達成時把這隻一般怪換成故事／限定頭目（js/42 weOnMobSpawn），再套下方縮放／突變／晝夜
                    try { if (typeof weOnMobSpawn === 'function') { let _wb = weOnMobSpawn(m, idx); if (_wb) m = _wb; } } catch (e) {}
                    m._spawnHooked = true;
                    try { if (typeof trialOnMobSpawn === 'function') trialOnMobSpawn(m); } catch (e) {}
                    try { if (typeof weMutateMob === 'function') weMutateMob(m); } catch (e) {}
                    try { wxOnMobSpawn(m); } catch (e) {}
                }
            } catch (e) {}
            return r;
        };
        _wrap.__wxHook = true;
        window.spawnMob = _wrap;
    }
} catch (e) {}

// ===== UI =====
function wxEnsureStyles() {
    if (document.getElementById('wx-style')) return;
    let s = document.createElement('style');
    s.id = 'wx-style';
    s.textContent = `
#wx-indicator { display:inline-flex; align-items:center; gap:2px; padding:2px 6px; border:1px solid #475569; border-radius:6px; background:rgba(15,23,42,.85); color:#e2e8f0; font-size:14px; line-height:1.2; cursor:pointer; white-space:nowrap; user-select:none; position:relative; }
#wx-indicator .wx-ic { font-size:15px; }
#wx-indicator .wx-tx { font-size:11px; color:#cbd5e1; margin-left:2px; }
#wx-indicator.wx-night { border-color:#6366f1; }
#wx-indicator.wx-indoor .wx-w { opacity:.45; }
#wx-pop { position:fixed; z-index:9999; width:260px; max-width:calc(100vw - 16px); background:#0f172a; border:1px solid #64748b; border-radius:8px; padding:10px; color:#e2e8f0; font-size:12px; line-height:1.5; box-shadow:0 8px 24px rgba(0,0,0,.6); }
#wx-pop .wx-h { font-weight:700; color:#fde68a; margin-bottom:4px; }
#wx-pop .wx-dim { color:#94a3b8; font-size:11px; }
#wx-pop label { display:flex; align-items:center; gap:6px; margin-top:6px; cursor:pointer; color:#a7f3d0; }
#wx-vfx { position:absolute; inset:0; pointer-events:none; z-index:1; overflow:hidden; border-radius:inherit; }
#wx-vfx.wx-rain, #wx-vfx.wx-storm { background-image:repeating-linear-gradient(105deg, rgba(186,230,253,.0) 0 14px, rgba(186,230,253,.22) 14px 15px, rgba(186,230,253,0) 15px 34px); background-size:68px 68px; animation:wxRain .5s linear infinite; }
#wx-vfx.wx-snow { background-image:radial-gradient(circle, rgba(255,255,255,.75) 0 1.6px, transparent 2.2px), radial-gradient(circle, rgba(255,255,255,.5) 0 1.1px, transparent 1.7px); background-size:46px 46px, 31px 31px; background-position:0 0, 13px 17px; animation:wxSnow 6s linear infinite; }
#wx-vfx.wx-fog { background:linear-gradient(180deg, rgba(203,213,225,.10), rgba(203,213,225,.22)); }
#wx-vfx.wx-wind { background-image:repeating-linear-gradient(0deg, transparent 0 22px, rgba(226,232,240,.10) 22px 23px, transparent 23px 47px); background-size:200px 47px; animation:wxWind 1.4s linear infinite; }
#wx-vfx.wx-night::after { content:''; position:absolute; inset:0; background:rgba(30,27,75,.16); }
#wx-vfx .wx-flash { position:absolute; inset:0; background:rgba(254,249,195,.35); animation:wxFlash .35s ease-out forwards; }
@keyframes wxRain { from { background-position:0 0; } to { background-position:-18px 68px; } }
@keyframes wxSnow { from { background-position:0 0, 13px 17px; } to { background-position:20px 46px, 0 48px; } }
@keyframes wxWind { from { background-position:0 0; } to { background-position:-200px 0; } }
@keyframes wxFlash { from { opacity:1; } to { opacity:0; } }
@media (prefers-reduced-motion: reduce) { #wx-vfx { animation:none !important; } }
`;
    document.head.appendChild(s);
}
function wxVfxOn() { return !(typeof player !== 'undefined' && player && player.wxVfxOff); }
function wxToggleVfx() {
    if (typeof player === 'undefined' || !player) return;
    player.wxVfxOff = !player.wxVfxOff;
    if (!player.wxVfxOff) delete player.wxVfxOff;
    wxRenderVfx(); wxRenderPop();
    try { if (typeof saveGame === 'function') saveGame(); } catch (e) {}
}
function _wxTipText(st) {
    let t = WX_TYPES[st.raw] || WX_TYPES['晴'];
    let lines = [];
    lines.push((st.night ? '🌙 夜晚（19:00–05:59）：不死族／惡魔族 HP 與傷害 +15%、掉落 +20%' : '☀️ 白天（06:00–18:59）：一般'));
    lines.push(`${t.emoji} 天氣：${st.raw}${st.indoor ? '（室內地圖・不受影響）' : ''}`);
    if (!st.indoor) lines.push(t.d);
    let now = wxNow(), next = WX_SLOT_MS - ((now + WX_TZ_OFFSET) % WX_SLOT_MS);
    lines.push(`下次天氣變化：約 ${Math.ceil(next / 60000)} 分鐘後（台北時間每 2 小時）`);
    return lines;
}
function wxRenderIndicator() {
    wxEnsureStyles();
    let el = document.getElementById('wx-indicator');
    if (!el) {
        let anchor = document.getElementById('btn-return-town');
        if (!anchor || !anchor.parentElement) return;
        el = document.createElement('span');
        el.id = 'wx-indicator';
        el.setAttribute('role', 'button');
        el.setAttribute('tabindex', '0');
        el.addEventListener('click', ev => { ev.stopPropagation(); wxTogglePop(); });
        let first = document.getElementById('btn-pandora-shortcut') || anchor;
        anchor.parentElement.insertBefore(el, first);
    }
    let st = wxState(), t = WX_TYPES[st.raw] || WX_TYPES['晴'];
    el.className = (st.night ? 'wx-night' : 'wx-day') + (st.indoor ? ' wx-indoor' : '');
    el.innerHTML = `<span class="wx-ic wx-dn">${st.night ? '🌙' : '☀️'}</span><span class="wx-ic wx-w">${t.emoji}</span><span class="wx-tx">${st.raw}</span>`;
    el.title = _wxTipText(st).join('\n');
    el.setAttribute('data-weather', t.key);
    el.setAttribute('data-night', st.night ? '1' : '0');
}
function wxRenderPop() {
    let pop = document.getElementById('wx-pop');
    if (!pop) return;
    let st = wxState();
    pop.innerHTML = `<div class="wx-h">${st.night ? '🌙 夜晚' : '☀️ 白天'}・${(WX_TYPES[st.raw] || {}).emoji || ''} ${st.raw}</div>`
        + _wxTipText(st).map((l, i) => `<div class="${i >= 2 ? 'wx-dim' : ''}">${l}</div>`).join('')
        + `<label><input type="checkbox" ${wxVfxOn() ? 'checked' : ''} onchange="wxToggleVfx()"> 天氣特效（雨／雪等輕量動畫）</label>`;
}
function wxTogglePop() {
    let pop = document.getElementById('wx-pop');
    if (pop) { pop.remove(); return; }
    pop = document.createElement('div');
    pop.id = 'wx-pop';
    document.body.appendChild(pop);
    wxRenderPop();
    let el = document.getElementById('wx-indicator');
    if (el) { let r = el.getBoundingClientRect(); let left = Math.min(window.innerWidth - pop.offsetWidth - 8, Math.max(8, r.left)); pop.style.left = left + 'px'; pop.style.top = (r.bottom + 6) + 'px'; }
    pop.addEventListener('click', ev => ev.stopPropagation());
    setTimeout(() => document.addEventListener('click', function _c() { let p = document.getElementById('wx-pop'); if (p) p.remove(); document.removeEventListener('click', _c); }), 0);
}
function wxRenderVfx() {
    let bv = document.getElementById('battle-view');
    if (!bv) return;
    let v = document.getElementById('wx-vfx');
    let st = wxState();
    let inTown = typeof mapState !== 'undefined' && mapState && String(mapState.current || '').startsWith('town_');
    let cls = (!wxVfxOn() || st.indoor) ? '' : ({ '雨': 'wx-rain', '雷雨': 'wx-storm', '霧': 'wx-fog', '風': 'wx-wind', '雪': 'wx-snow' }[st.weather] || '');
    if (wxVfxOn() && st.night && !st.indoor && !inTown) cls += ' wx-night';
    cls = cls.trim();
    if (!cls) { if (v) v.remove(); return; }
    if (!v) { v = document.createElement('div'); v.id = 'wx-vfx'; v.setAttribute('aria-hidden', 'true'); bv.insertBefore(v, bv.firstChild); }
    if (v.className !== cls) v.className = cls;
}
function _wxFlash() {
    if (!wxVfxOn()) return;
    let v = document.getElementById('wx-vfx'); if (!v) return;
    let f = document.createElement('div'); f.className = 'wx-flash'; v.appendChild(f); setTimeout(() => f.remove(), 400);
}
function _wxRecomputeParty() {
    try { if (typeof cbRecomputeParty === 'function') { cbRecomputeParty(); return; } } catch (e) {}
    try { if (typeof calcStats === 'function') calcStats(); } catch (e) {}
}
// 狀態改變（晝夜／天氣／室內外）→ 重算玩家與傭兵屬性、更新指示器
function wxRefresh(force) {
    if (typeof player === 'undefined' || !player || !player.cls) return;
    let st = wxState();
    let key = (st.night ? 'N' : 'D') + '|' + st.weather + '|' + st.raw + '|' + (st.indoor ? 'I' : 'O');
    if (force || key !== _wxLastKey) {
        let statChange = _wxLastKey && (_wxLastKey.split('|')[1] !== st.weather);
        _wxLastKey = key;
        if (statChange || force) _wxRecomputeParty();
    }
    try { wxRenderIndicator(); } catch (e) {}
    try { wxRenderVfx(); } catch (e) {}
}
let _wxTimer = null;
function wxStart() {
    if (_wxTimer) return;
    _wxTimer = setInterval(() => { try { wxRefresh(false); } catch (e) {} try { wxLightningTick(); } catch (e) {} }, 2000);
    try { wxRefresh(false); } catch (e) {}
}
// 換圖立即刷新（室內／室外切換）
try {
    if (typeof changeMap === 'function' && !changeMap.__wx) {
        const _origCM = changeMap;
        const _cm = function () { let r = _origCM.apply(this, arguments); try { setTimeout(() => wxRefresh(false), 0); } catch (e) {} return r; };
        _cm.__wx = true;
        window.changeMap = _cm;
    }
} catch (e) {}
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(wxStart, 500));
    else setTimeout(wxStart, 500);
}

window.WX_TYPES = WX_TYPES;
window.wxNow = wxNow;
window.wxIsNight = wxIsNight;
window.wxSlotKey = wxSlotKey;
window.wxWeatherForSlot = wxWeatherForSlot;
window.wxRawWeather = wxRawWeather;
window.wxSetOverride = wxSetOverride;
window.wxIsIndoor = wxIsIndoor;
window.wxState = wxState;
window.wxCurrent = wxCurrent;
window.wxEleMult = wxEleMult;
window.wxPhysDmgMult = wxPhysDmgMult;
window.extraMagicCoefMult = extraMagicCoefMult;
window.wxApplyStats = wxApplyStats;
window.wxOnMobSpawn = wxOnMobSpawn;
window.wxDropRateMult = wxDropRateMult;
window.wxLightningTick = wxLightningTick;
window.wxRefresh = wxRefresh;
window.wxRenderIndicator = wxRenderIndicator;
window.wxToggleVfx = wxToggleVfx;
window.wxTogglePop = wxTogglePop;
})();
