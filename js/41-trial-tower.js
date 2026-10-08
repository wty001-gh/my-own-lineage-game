// ===== 🗼 v3.8.98 無盡試煉塔（cache trial.20261006b）=====
// 每日限次、樓層計時、無離線進度；獎勵僅試煉商店／首通／週間階梯。
(function () {
'use strict';

const TRIAL_DAILY_RUNS = 3;
const TRIAL_FLOOR_SEC = 180;          // 每層 3 分鐘
const TRIAL_MOBS_PER_FLOOR = 8;       // 清完 N 隻後出守護者
const TRIAL_SCALE = 1.08;             // 每層複合 +8%
const TRIAL_WEEKLY_TIERS = [10, 20, 30, 40, 50];
const TRIAL_BOSS_AFFIXES = [
    { id: '狂暴', desc: '攻速 +30%', atkSpdMult: 0.7 },
    { id: '魔抗化', desc: 'MR +80', mrAdd: 80 },
    { id: '反射', desc: '受擊反彈 15%', reflect: 0.15 },
    { id: '再生', desc: '每秒回 2% HP', regen: 0.02 },
    { id: '不死一次', desc: '首次致死改為剩 1 HP', immortalOnce: true }
];

// 後期怪池（大墳墓／傲慢高樓／拉斯塔等）
const TRIAL_MOB_POOL = [
    'naz_t_deathknight','naz_t_baphomet','naz_t_balrog','naz_t_sphinx','naz_t_tomb',
    'pride_chimera','pride_medusa','pride_earth_king','pride_fire_king',
    'balrog','baphomet','death_knight','baron','marquis','behemoth'
];

function _trialTaipeiParts(ms) {
    let d = new Date((ms || Date.now()) + 8 * 3600 * 1000); // force UTC+8 wall
    return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, day: d.getUTCDate(), h: d.getUTCHours(), dow: d.getUTCDay() };
}
function trialDayKey(ms) {
    let p = _trialTaipeiParts(ms);
    return p.y + '-' + String(p.m).padStart(2,'0') + '-' + String(p.day).padStart(2,'0');
}
/** ISO week key with Monday 05:00 Asia/Taipei reset */
function trialWeekKey(ms) {
    ms = ms || Date.now();
    // shift back 5 hours so week boundary is Mon 05:00 Taipei
    let shifted = ms - 5 * 3600 * 1000;
    let p = _trialTaipeiParts(shifted);
    // ISO week from UTC+8 calendar date of shifted
    let dt = new Date(Date.UTC(p.y, p.m - 1, p.day));
    // Thursday-based ISO
    let dayNum = dt.getUTCDay() || 7;
    dt.setUTCDate(dt.getUTCDate() + 4 - dayNum);
    let yearStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
    let weekNo = Math.ceil((((dt - yearStart) / 86400000) + 1) / 7);
    return dt.getUTCFullYear() + '-W' + String(weekNo).padStart(2, '0');
}

function ensureTrialSave(p) {
    p = p || player;
    if (!p) return;
    if (!p.trial) p.trial = {};
    let t = p.trial;
    if (!t.daily || t.daily.key !== trialDayKey()) t.daily = { key: trialDayKey(), runs: 0 };
    if (!t.weekly || t.weekly.key !== trialWeekKey()) t.weekly = { key: trialWeekKey(), best: 0, claimed: {} };
    if (!t.firstClear || typeof t.firstClear !== 'object') t.firstClear = {};
    if (typeof t.bestEver !== 'number') t.bestEver = 0;
    if (typeof t.badges !== 'number') t.badges = 0; // mirrored into inventory cur_trial_badge
}

function trialRunsLeft() {
    ensureTrialSave();
    return Math.max(0, TRIAL_DAILY_RUNS - (player.trial.daily.runs || 0));
}

function _trialPickMobId(floor) {
    // Prefer ids that exist
    let pool = TRIAL_MOB_POOL.filter(id => DB.mobs && DB.mobs[id]);
    if (!pool.length) {
        // fallback: any hard/boss late mob
        pool = Object.keys(DB.mobs || {}).filter(id => {
            let m = DB.mobs[id];
            return m && (m.boss || m.hard) && (m.lv || 0) >= 60 && m.race !== '建築' && m.race !== '血盟';
        });
    }
    if (!pool.length) pool = Object.keys(DB.mobs || {}).slice(0, 20);
    let idx = Math.floor(_seededFloat('trial|' + floor + '|' + (player.enSeed || 'x')) * pool.length);
    return pool[idx] || pool[0];
}

function _trialScaleMult(floor) {
    return Math.pow(TRIAL_SCALE, Math.max(0, floor - 1));
}

function _trialApplyScale(mob, floor, isGuardian) {
    if (!mob) return;
    // v3.8.99：冪等——一律以首次縮放前的原始值為基準（spawnMob 包裝鉤子＋守護者強制重套不會疊乘）
    if (!mob._trialBase) mob._trialBase = { hp: mob.hp, dmg: Array.isArray(mob.dmg) ? mob.dmg.slice() : mob.dmg, db: mob.db, hit: mob.hit, mr: mob.mr, ac: mob.ac, exp: mob.exp, hard: !!mob.hard };
    else { let _b = mob._trialBase; mob.hp = _b.hp; mob.dmg = Array.isArray(_b.dmg) ? _b.dmg.slice() : _b.dmg; mob.db = _b.db; mob.hit = _b.hit; mob.mr = _b.mr; mob.ac = _b.ac; mob.exp = _b.exp; mob.hard = _b.hard; }
    let mul = _trialScaleMult(floor) * (isGuardian ? 1.6 : 1);
    let hp0 = mob.hp || 100;
    mob.hp = Math.max(1, Math.floor(hp0 * mul));
    mob.curHp = mob.hp;
    if (mob.dmg) {
        if (Array.isArray(mob.dmg)) mob.dmg = [Math.max(1, Math.floor(mob.dmg[0] * mul)), Math.max(1, Math.floor(mob.dmg[1] * mul))];
    }
    if (mob.db != null) mob.db = Math.floor((mob.db || 0) * mul);
    if (mob.hit != null) mob.hit = Math.floor((mob.hit || 0) * (1 + (mul - 1) * 0.5));
    if (mob.mr != null) mob.mr = Math.floor((mob.mr || 0) * (1 + (mul - 1) * 0.4));
    if (mob.ac != null) mob.ac = Math.floor((mob.ac || 0) - Math.min(40, floor * 0.3));
    mob._trialFloor = floor;
    mob._trialGuardian = !!isGuardian;
    mob.exp = Math.max(1, Math.floor((mob.exp || 10) * Math.sqrt(mul)));
    // hard skin grows
    if (mob.hard || isGuardian) {
        mob.hard = true;
        if (typeof initHardSkin === 'function') try { initHardSkin(mob); } catch (e) {}
        if (mob._hardSkinPool != null) mob._hardSkinPool = Math.floor((mob._hardSkinPool || 10) * (1 + floor * 0.05));
    }
    if (isGuardian && floor % 10 === 0) {
        let aff = TRIAL_BOSS_AFFIXES[Math.floor(_seededFloat('trialAff|' + floor + '|' + (player.enSeed || '')) * TRIAL_BOSS_AFFIXES.length)];
        mob._trialAffix = aff;
        mob.boss = true;
        mob.n = (mob.n || '守護者') + '【' + aff.id + '】';
        if (aff.mrAdd) mob.mr = (mob.mr || 0) + aff.mrAdd;
        if (aff.atkSpdMult && mob.atkSpd) mob.atkSpd = Math.max(0.3, mob.atkSpd * aff.atkSpdMult);
        mob._trialDebuffRes = 0.75;
        logSys(`<span class="text-orange-300 font-bold">【試煉頭目詞綴】${aff.id}</span>：${aff.desc}；減益抗性 75%。`);
    }
}

function _ensureTrialMap() {
    if (!DB.maps) DB.maps = {};
    if (!DB.maps.trial_tower) {
        let ids = TRIAL_MOB_POOL.filter(id => DB.mobs && DB.mobs[id]);
        if (!ids.length) ids = Object.keys(DB.mobs || {}).slice(0, 8);
        DB.maps.trial_tower = ids.slice();
    }
}

function startTrialTower() {
    ensureTrialSave();
    if (state.trialRun) { logSys('<span class="text-amber-300">試煉進行中。</span>'); return; }
    if (trialRunsLeft() <= 0) { logSys('<span class="text-red-400">今日試煉次數已用完（每日 ' + TRIAL_DAILY_RUNS + ' 次）。</span>'); return; }
    if (player.statuses && (player.statuses.stone > 0 || player.statuses.paralyze > 0 || player.statuses.freeze > 0 || player.statuses.stun > 0)) {
        logSys('無法行動，無法進入試煉塔。'); return;
    }
    // leave other climbs
    if (state.prideClimb) { state.prideClimb = false; state.prideRanked = false; state.prideFloor = 0; }
    if (state.nazarickDescend) { state.nazarickDescend = false; state.nazarickFloor = 0; }
    player.trial.daily.runs = (player.trial.daily.runs || 0) + 1;
    _ensureTrialMap();
    state.trialRun = {
        floor: 1, kills: 0, need: TRIAL_MOBS_PER_FLOOR, phase: 'mobs',
        startMs: Date.now(), deadlineMs: Date.now() + TRIAL_FLOOR_SEC * 1000,
        bestThisRun: 0
    };
    logSys('<span class="text-orange-300 font-bold">🗼 無盡試煉塔開始！</span>每層 ' + TRIAL_FLOOR_SEC + ' 秒；今日剩餘 ' + trialRunsLeft() + ' 次。');
    enterTrialFloor(1);
    if (typeof saveGame === 'function') saveGame();
    if (typeof renderTrialPanel === 'function') renderTrialPanel();
}

function enterTrialFloor(n) {
    _ensureTrialMap();
    mapState.current = 'trial_tower';
    player.lastBattleMap = 'trial_tower';
    mapState.mobs = [null, null, null, null, null];
    mapState.forceBoss = false;
    mapState.targetIdx = -1;
    mapState.suppressSiegeBoss = true;
    state._kbRespawnAt = null;
    let t0 = state.ticks || 0;
    mapState.spawnAt = [t0 + 40, t0 + 55, t0 + 70];
    if (state.trialRun) {
        state.trialRun.floor = n;
        state.trialRun.kills = 0;
        state.trialRun.need = TRIAL_MOBS_PER_FLOOR;
        state.trialRun.phase = 'mobs';
        state.trialRun.deadlineMs = Date.now() + TRIAL_FLOOR_SEC * 1000;
    }
    if (!state.ff) {
        try {
            let mapPanel = document.getElementById('town-view') && document.getElementById('town-view').parentElement;
            document.getElementById('battle-view').classList.remove('hidden');
            document.getElementById('combat-log-panel').classList.remove('hidden');
            document.getElementById('town-view').classList.add('hidden');
            document.getElementById('town-view').classList.remove('flex');
            if (mapPanel) mapPanel.classList.remove('flex-1', 'overflow-hidden');
            if (typeof applyAreaBackground === 'function') applyAreaBackground();
            logSys(`<span class="text-orange-200 font-bold">--- 試煉塔 ${n}F ---</span>（限時 ${TRIAL_FLOOR_SEC} 秒）`);
            renderMobs(); syncMapSelectors(); updateUI();
        } catch (e) {}
    }
    if (typeof updateTrialHud === 'function') updateTrialHud();
}

function trialOnMobSpawn(mob) {
    if (!state.trialRun || !mob || mapState.current !== 'trial_tower') return;
    let isG = state.trialRun.phase === 'guardian';
    _trialApplyScale(mob, state.trialRun.floor, isG);
}

function trialOnMobKill(mob) {
    if (!state.trialRun || mapState.current !== 'trial_tower' || !mob) return;
    if (player.dead) return;
    let tr = state.trialRun;
    if (tr.phase === 'mobs') {
        if (!mob._trialGuardian) {
            tr.kills++;
            if (tr.kills >= tr.need) {
                tr.phase = 'guardian';
                logSys('<span class="text-orange-300 font-bold">樓層守護者出現！</span>');
                // force spawn a boss-like in center
                try {
                    mapState.forceBoss = true;
                    if (typeof spawnMob === 'function') spawnMob(1);
                    mapState.forceBoss = false;
                    let g = mapState.mobs[1];
                    if (g) _trialApplyScale(g, tr.floor, true);
                } catch (e) {}
            }
        }
    } else if (tr.phase === 'guardian' && mob._trialGuardian) {
        trialClearFloor();
    }
    if (typeof updateTrialHud === 'function') updateTrialHud();
}

function trialClearFloor() {
    let tr = state.trialRun; if (!tr) return;
    let floor = tr.floor;
    tr.bestThisRun = Math.max(tr.bestThisRun || 0, floor);
    ensureTrialSave();
    // first clear
    if (!player.trial.firstClear[floor]) {
        player.trial.firstClear[floor] = true;
        let badge = Math.max(1, Math.floor(floor / 5) + 1);
        if (typeof gainItem === 'function') gainItem('cur_trial_badge', badge, true);
        trialRefreshPanelIfVisible();   // 🏅 v3.8.102 首通徽章入帳→商店持有數即時更新
        // materials
        if (floor % 5 === 0 && typeof gainItem === 'function') {
            gainItem(Math.random() < 0.5 ? 'scroll_guard_wpn' : 'scroll_guard_arm', 1, true);
        }
        if (floor === 30 || floor === 40 || floor === 50) {
            gainItem(Math.random() < 0.5 ? 'scroll_guardx_wpn' : 'scroll_guardx_arm', 1, true);
            gainItem('scroll_blessify', 1, true);
        }
        logSys(`<span class="text-amber-300 font-bold">🎁 試煉首通 ${floor}F</span>：試煉徽章×${badge}` + (floor % 5 === 0 ? '＋守護卷' : '') + ((floor===30||floor===40||floor===50)?'＋極卷／祝福化':''));
    }
    player.trial.bestEver = Math.max(player.trial.bestEver || 0, floor);
    if (player.trial.weekly.key === trialWeekKey()) {
        player.trial.weekly.best = Math.max(player.trial.weekly.best || 0, floor);
    }
    logSys(`<span class="text-orange-200 font-bold">試煉塔 ${floor}F 通關！</span>進入 ${floor + 1}F…`);
    enterTrialFloor(floor + 1);
    if (typeof saveGame === 'function') saveGame();
}

function trialFail(reason) {
    let tr = state.trialRun;
    let best = tr ? (tr.bestThisRun || Math.max(0, (tr.floor || 1) - 1)) : 0;
    state.trialRun = null;
    if (typeof trialClearHud === 'function') trialClearHud();
    ensureTrialSave();
    if (best > 0) {
        player.trial.bestEver = Math.max(player.trial.bestEver || 0, best);
        if (player.trial.weekly.key === trialWeekKey()) player.trial.weekly.best = Math.max(player.trial.weekly.best || 0, best);
    }
    logSys(`<span class="text-red-400 font-bold">試煉結束</span>：${reason || '失敗'}。本局最高 ${best}F（歷史最佳 ${player.trial.bestEver || 0}F）。`);
    try {
        if (typeof setMapSelectors === 'function') setMapSelectors(typeof getLastTown === 'function' ? getLastTown() : 'silver_knight');
        if (typeof changeMap === 'function') changeMap(true);
    } catch (e) {}
    if (typeof saveGame === 'function') saveGame();
    if (typeof updateTrialHud === 'function') updateTrialHud();
    if (typeof renderTrialPanel === 'function') renderTrialPanel();
}

function trialTick() {
    if (!state.trialRun) return;
    // no offline: if tab hidden long, fail? Use deadline only while in tower
    if (mapState.current !== 'trial_tower') return;
    if (Date.now() > state.trialRun.deadlineMs) {
        trialFail('逾時');
        return;
    }
    // boss regen affix
    mapState.mobs.forEach(m => {
        if (!m || !m._trialAffix || !m._trialAffix.regen || m.curHp <= 0) return;
        if ((state.ticks || 0) % 10 === 0) {
            m.curHp = Math.min(m.hp, m.curHp + Math.max(1, Math.floor(m.hp * m._trialAffix.regen)));
        }
    });
    if (typeof updateTrialHud === 'function') updateTrialHud();
}

// 🏅 v3.8.102 背包內持有的試煉徽章總數（商店標頭顯示用）
function trialBadgeOwned() {
    let n = 0;
    try { (player && player.inv || []).forEach(it => { if (it && it.id === 'cur_trial_badge') n += (it.cnt || 1); }); } catch (e) {}
    return n;
}
function trialRefreshPanelIfVisible() {
    try { let h = document.getElementById('tab-trial'); if (h && h.offsetParent !== null) renderTrialPanel(); } catch (e) {}
}

function trialClaimWeekly(tier) {
    ensureTrialSave();
    let w = player.trial.weekly;
    if ((w.best || 0) < tier) { logSys('<span class="text-slate-400">本週最佳未達 ' + tier + 'F。</span>'); return; }
    if (w.claimed[tier]) { logSys('<span class="text-slate-400">已領取。</span>'); return; }
    w.claimed[tier] = true;
    let badge = Math.floor(tier / 5);
    if (typeof gainItem === 'function') {
        gainItem('cur_trial_badge', badge, true);
        if (tier >= 20) gainItem('scroll_seal_stable', 1, true);
        if (tier >= 30) gainItem(Math.random() < 0.5 ? 'scroll_guardx_wpn' : 'scroll_guardx_arm', 1, true);
        if (tier >= 40) gainItem('scroll_blessify', 1, true);
        if (tier >= 50) { gainItem('scroll_sure_plus', 2, true); gainItem('mat_rift_lock', 1, true); }
    }
    logSys(`<span class="text-amber-300 font-bold">試煉週間獎勵 ${tier}F</span> 已領取。`);
    if (typeof saveGame === 'function') saveGame();
    renderTrialPanel();
}

const TRIAL_SHOP = [
    { id: 'scroll_guard_wpn', cost: 8, weekly: 2 },
    { id: 'scroll_guard_arm', cost: 8, weekly: 2 },
    { id: 'scroll_seal_stable', cost: 12, weekly: 2 },
    { id: 'scroll_sure_plus', cost: 15, weekly: 1 },
    { id: 'mat_soul_transfer', cost: 20, weekly: 1 },
    { id: 'mat_relic_reson', cost: 18, weekly: 1 },
    { id: 'mat_rift_lock', cost: 25, weekly: 1 }
];

function trialShopWeeklyLimit(row) {
    if (!row) return 1;
    let n = row.weekly != null ? row.weekly : row.limit;
    n = Number(n);
    return (Number.isFinite(n) && n > 0) ? n : 1;
}
function trialShopBought(id) {
    ensureTrialSave();
    let wk = trialWeekKey();
    if (!player.trial.shop || player.trial.shop.key !== wk) return 0;
    return Number(player.trial.shop.bought[id]) || 0;
}
function trialShopBuy(id) {
    ensureTrialSave();
    let row = TRIAL_SHOP.find(x => x.id === id); if (!row) return false;
    let wk = trialWeekKey();
    if (!player.trial.shop || player.trial.shop.key !== wk) player.trial.shop = { key: wk, bought: {} };
    let lim = trialShopWeeklyLimit(row);
    let bought = trialShopBought(id);
    if (bought >= lim) { logSys('<span class="text-slate-400">本週購買上限已滿。</span>'); return false; }
    let have = 0;
    player.inv.forEach(it => { if (it.id === 'cur_trial_badge') have += (it.cnt || 1); });
    if (have < row.cost) { logSys('<span class="text-red-400">試煉徽章不足。</span>'); renderTrialPanel(); return; }
    // consume badges
    let need = row.cost, rm = [];
    for (let it of player.inv) {
        if (need <= 0) break;
        if (it.id !== 'cur_trial_badge' || it.lock) continue;
        let c = it.cnt || 1;
        if (c <= need) { need -= c; rm.push(it.uid); } else { it.cnt = c - need; need = 0; }
    }
    if (rm.length) player.inv = player.inv.filter(i => rm.indexOf(i.uid) === -1);
    player.trial.shop.bought[id] = bought + 1;
    gainItem(id, 1, false);
    logSys('<span class="text-orange-300">試煉商店購入：' + DB.items[id].n + '</span>');
    saveGame(); renderTrialPanel();
    return true;
}

function trialEnsureStyles() {
    if (document.getElementById('trial-style')) return;
    let s = document.createElement('style');
    s.id = 'trial-style';
    s.textContent = `
.tr-panel{padding:10px;color:#e2e8f0;font-size:13px;line-height:1.45}
.tr-card{background:#0f172a;border:1px solid #9a3412;border-radius:8px;padding:10px;margin:8px 0}
.tr-card h3{margin:0 0 6px;color:#fdba74;font-size:15px}
.tr-row{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:4px 0}
.tr-btn{font-size:12px;padding:6px 10px;border-radius:6px;border:1px solid #c2410c;background:#9a3412;color:#fff7ed;cursor:pointer}
.tr-btn:disabled{opacity:.4;cursor:not-allowed}
.tr-hud{position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:60;background:rgba(15,23,42,.92);border:1px solid #ea580c;border-radius:8px;padding:6px 12px;color:#fdba74;font-size:12px;pointer-events:none}
.tr-own{display:inline-block;margin:0 0 6px;padding:2px 8px;border:1px solid #c2410c;border-radius:6px;background:rgba(154,52,18,.25);color:#fed7aa;font-weight:600;font-size:13px}
.tr-shop{display:grid;grid-template-columns:1fr;gap:6px}
@media(min-width:700px){.tr-shop{grid-template-columns:1fr 1fr}}
`;
    document.head.appendChild(s);
}

function updateTrialHud() {
    let el = document.getElementById('trial-hud');
    let active = !!(state && state.trialRun && mapState && mapState.current === 'trial_tower');
    if (!active) {
        if (el) el.remove();
        return;
    }
    trialEnsureStyles();
    if (!el) { el = document.createElement('div'); el.id = 'trial-hud'; el.className = 'tr-hud'; document.body.appendChild(el); }
    let left = Math.max(0, Math.ceil((state.trialRun.deadlineMs - Date.now()) / 1000));
    let tr = state.trialRun;
    el.textContent = `試煉 ${tr.floor}F｜${tr.phase === 'mobs' ? ('擊殺 ' + tr.kills + '/' + tr.need) : '守護者'}｜剩餘 ${left}s`;
}
function trialClearHud() {
    let el = document.getElementById('trial-hud');
    if (el) el.remove();
}

function renderTrialPanel() {
    let host = document.getElementById('tab-trial'); if (!host) return;
    trialEnsureStyles(); ensureTrialSave();
    let w = player.trial.weekly;
    let tiers = TRIAL_WEEKLY_TIERS.map(t => {
        let ok = (w.best || 0) >= t;
        let claimed = !!(w.claimed && w.claimed[t]);
        return `<button class="tr-btn" ${(!ok || claimed) ? 'disabled' : ''} onclick="trialClaimWeekly(${t})">${t}F ${claimed ? '已領' : (ok ? '領取' : '未達')}</button>`;
    }).join('');
    let shop = TRIAL_SHOP.map(row => {
        let bought = trialShopBought(row.id);
        let lim = trialShopWeeklyLimit(row);
        let nm = DB.items[row.id] ? DB.items[row.id].n : row.id;
        return `<div class="tr-row"><span>${nm}</span><span style="color:#fdba74">${row.cost} 徽章</span><span>${bought}/${lim}</span>
          <button class="tr-btn" ${bought >= lim ? 'disabled' : ''} onclick="trialShopBuy('${row.id}')">購買</button></div>`;
    }).join('');
    host.innerHTML = `<div class="tr-panel">
      <div class="tr-card"><h3>🗼 無盡試煉塔</h3>
        <div>每日次數：${trialRunsLeft()}/${TRIAL_DAILY_RUNS}　歷史最佳：${player.trial.bestEver || 0}F　本週最佳：${w.best || 0}F</div>
        <div>每層 ${TRIAL_FLOOR_SEC} 秒・清 ${TRIAL_MOBS_PER_FLOOR} 怪後出守護者・每 10 層頭目詞綴・複合 +${Math.round((TRIAL_SCALE-1)*100)}%/層・無離線進度</div>
        <div class="tr-row"><button class="tr-btn" ${trialRunsLeft()<=0||state.trialRun?'disabled':''} onclick="startTrialTower()">開始試煉</button>
          ${state.trialRun?`<button class="tr-btn" onclick="trialFail('手動撤退')">撤退</button>`:''}</div>
      </div>
      <div class="tr-card"><h3>週間階梯獎勵（週一 05:00 台北重置）</h3>
        <div class="tr-row">${tiers}</div>
      </div>
      <div class="tr-card"><h3>試煉商店（試煉徽章）</h3>
        <div class="tr-own" id="trial-badge-owned">持有：🏅 試煉徽章 ×${trialBadgeOwned()}</div>
        <div class="tr-shop">${shop}</div>
      </div>
    </div>`;
    updateTrialHud();
}

// hooks: leave tower on map change
function trialOnMapLeave(newMap) {
    if (state.trialRun && newMap !== 'trial_tower') trialFail('離開試煉塔');
}

window.TRIAL_DAILY_RUNS = TRIAL_DAILY_RUNS;
window.TRIAL_FLOOR_SEC = TRIAL_FLOOR_SEC;
window.TRIAL_SCALE = TRIAL_SCALE;
window.TRIAL_WEEKLY_TIERS = TRIAL_WEEKLY_TIERS;
window.ensureTrialSave = ensureTrialSave;
window.trialBadgeOwned = trialBadgeOwned;
window.trialDayKey = trialDayKey;
window.trialWeekKey = trialWeekKey;
window.trialRunsLeft = trialRunsLeft;
window.startTrialTower = startTrialTower;
window.enterTrialFloor = enterTrialFloor;
window.trialOnMobSpawn = trialOnMobSpawn;
window.trialOnMobKill = trialOnMobKill;
window.trialClearFloor = trialClearFloor;
window.trialFail = trialFail;
window.trialTick = trialTick;
window.trialClaimWeekly = trialClaimWeekly;
window.trialShopBuy = trialShopBuy;
window.renderTrialPanel = renderTrialPanel;
window.updateTrialHud = updateTrialHud;
window.trialOnMapLeave = trialOnMapLeave;
window.TRIAL_SHOP = TRIAL_SHOP;
window.trialShopWeeklyLimit = trialShopWeeklyLimit;
window.trialShopBought = trialShopBought;
window.trialClearHud = trialClearHud;

})();
