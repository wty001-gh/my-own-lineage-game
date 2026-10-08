// ===== 👑 v3.8.118 冒險者公會：頭目懸賞（野外掛機實戰）＋蓄力大招／打斷機制 =====
// 接受懸賞 → 前往指定地圖；下一隻生成的怪換成懸賞頭目（沿用 js/42 weOnMobSpawn 包裝鏈）。
// 蓄力：HP 75%／50%／25% 各一次，或每 25 秒一次（先到者）；預告 4.0 秒（情報室每級 +0.2 秒）。
// 打斷：蓄力期間對頭目施放暈眩／冰凍／石化／睡眠／麻痺／束縛／混亂（無視頭目免疫），或累積傷害 ≥ 頭目 MHP 12%。
// 格擋：絕對屏障＝完全無傷；騎士（玩家或傭兵）裝備盾牌＝傷害 −65%。失敗：玩家受 MHP 85%（S 級 95%）傷害，傭兵受 70%（保留 1 HP）。
// 打斷獎勵：頭目暈 3 秒、脆弱＋裂甲（受傷約 +21%）5 秒。評分 ★1 擊殺／★2 無陣亡／★3 全部蓄力都打斷或格擋。
(function () {
'use strict';
window.GD_BOUNTY_FIELD = true;
const CTRL = ['stun', 'freeze', 'stone', 'sleep', 'paralyze', 'bind', 'confuse'];
const CH_BASE_TICKS = 40, CH_EVERY_TICKS = 250, CH_THRESH = [0.75, 0.5, 0.25], CH_BREAK_PCT = 0.12;

function g() { return (window.GD && GD.data) ? GD.data() : null; }
function active() { let d = g(); return d && d.bounty && d.bounty.active ? d.bounty.active : null; }
function T() { return (typeof state !== 'undefined' && state && state.ticks) || 0; }
function ff() { return !!(typeof state !== 'undefined' && state && state.ff); }
function intelLv() { try { return Math.max(0, ensureClanBase().lv.intel || 0); } catch (e) { return 0; } }
function chargeTicks() { return CH_BASE_TICKS + intelLv() * 2; }
function bossAlive() { try { return (mapState.mobs || []).find(m => m && m._gdBounty && !m._dead && m.curHp > 0) || null; } catch (e) { return null; } }
function mapName(v) { try { return (typeof mapDisplayName === 'function' ? mapDisplayName(v) : v) || v; } catch (e) { return v; } }

// ---------- 接受／放棄 ----------
function gdBountyAccept(cid) {
    let d = g(); if (!d) return { ok: false, msg: '資料未載入。' };
    let c = d.board.find(x => x.id === cid);
    if (!c || c.type !== 'bounty') return { ok: false, msg: '找不到懸賞。' };
    if (c.taken) return { ok: false, msg: c.cleared ? '此懸賞已完成。' : '此懸賞已派遣成員。' };
    let a = active();
    if (a && a.id !== cid) return { ok: false, msg: `已有進行中的懸賞「${a.bossName}」（可於委託板放棄）。` };
    if (!c.boss || !DB.mobs[c.boss] || !c.map) return { ok: false, msg: '懸賞資料不完整。' };
    d.bounty.active = { id: cid, rank: c.rank, boss: c.boss, bossName: c.bossName, map: c.map, mapName: c.mapName, day: GD.dayKey(), acceptedAt: Date.now(),
                        charges: 0, interrupts: 0, blocks: 0, fails: 0, deaths: 0 };
    c.accepted = true;
    logSys(`<span class="text-red-300 font-bold">👑 已接受${c.rank} 級頭目懸賞：「${c.bossName}」出沒於 ${c.mapName}。</span>前往該地圖掛機即會遭遇。蓄力大招請以控制技能或爆發傷害打斷！`);
    try { saveGame(); } catch (e) {}
    gdBountyGo();
    return { ok: true };
}
function gdBountyGo() {
    let a = active(); if (!a) return false;
    try {
        if (mapState.current === a.map) return true;
        if (typeof setMapSelectors === 'function' && typeof changeMap === 'function') {
            setMapSelectors(a.map); changeMap();
            if (mapState.current === a.map) return true;
        }
    } catch (e) {}
    logSys(`<span class="text-amber-300">請手動前往「${a.mapName}」討伐懸賞頭目。</span>`);
    return false;
}
function gdBountyAbandon() {
    let d = g(), a = active(); if (!a) return false;
    let c = d.board.find(x => x.id === a.id); if (c) c.accepted = false;
    d.bounty.active = null;
    try { (mapState.mobs || []).forEach(m => { if (m && m._gdBounty) { m._gdBounty = null; m._gdCh = null; } }); } catch (e) {}
    hideUi();
    logSys('<span class="text-slate-400">已放棄頭目懸賞。</span>');
    try { saveGame(); } catch (e) {}
    return true;
}

// ---------- 生成（掛在 weOnMobSpawn 之後）----------
function makeBoss(a) {
    let tpl = DB.mobs[a.boss]; if (!tpl) return null;
    let S = a.rank === 'S', isB = !!tpl.boss;
    let hpM = isB ? (S ? 3 : 2) : (S ? 12 : 8), dmgM = isB ? 1.2 : 1.6;
    let born; try { born = ++_mobBornSeq; } catch (e) { born = Date.now(); }
    let dmg = Array.isArray(tpl.dmg) ? tpl.dmg.map(v => Math.round(v * dmgM)) : tpl.dmg;
    let b = { ...tpl, boss: true, hp: Math.round(tpl.hp * hpM), dmg, exp: Math.round((tpl.exp || 0) * 5), curHp: Math.round(tpl.hp * hpM),
              uid: uid(), _born: born, _magCd: {}, justHit: false, st: newMobStatus(), _bornMs: Date.now(), _gdBounty: a.id, _gdNextCh: T() + 60, _gdThr: 0 };
    return b;
}
function spawnHook(m, idx) {
    let a = active();
    if (!a || !m || m._weId || m._gdBounty) return null;
    if (typeof mapState === 'undefined' || !mapState || mapState.current !== a.map || mapState.mobs[idx] !== m) return null;
    if (m.boss || m.trollPlayer || m.race === '建築' || m.siegeEnemy || m.pledgeEnemy || m._siegePlayer) return null;
    if (a.day !== GD.dayKey()) return null;
    if (bossAlive()) return null;
    let b = makeBoss(a); if (!b) return null;
    mapState.mobs[idx] = b;
    try { if (b.hard && typeof initHardSkin === 'function') initHardSkin(b); } catch (e) {}
    if (!ff()) {
        try { logSys(`<span class="text-red-400 font-bold">👑 懸賞頭目「${b.n}」出現了！小心它的蓄力大招！</span>`); } catch (e) {}
        try { if (typeof vfxBossEntrance === 'function') vfxBossEntrance(b); } catch (e) {}
    }
    return b;
}
try {
    const _origWe = window.weOnMobSpawn;
    window.weOnMobSpawn = function (m, idx) {
        let r = null;
        try { if (typeof _origWe === 'function') r = _origWe(m, idx); } catch (e) {}
        if (r) return r;
        try { return spawnHook(m, idx); } catch (e) { return null; }
    };
} catch (e) {}

// ---------- 打斷：控制技能（無視頭目免疫）----------
try {
    if (typeof applyMobStatus === 'function' && !applyMobStatus.__gd) {
        const _origAMS = applyMobStatus;
        const _w = function (m, st, skillName) {
            if (m && m._gdCh && st && CTRL.indexOf(st.kind) >= 0) { interrupt(m, '控制：' + (skillName || st.kind)); return; }
            return _origAMS.apply(this, arguments);
        };
        _w.__gd = true;
        window.applyMobStatus = _w;
    }
} catch (e) {}
try {
    if (typeof getMobDisplayName === 'function' && !getMobDisplayName.__gd) {
        const _origN = getMobDisplayName;
        const _wn = function (m) { let s = _origN.apply(this, arguments); return (m && m._gdBounty && s) ? '👑' + s : s; };
        _wn.__gd = true;
        window.getMobDisplayName = _wn;
    }
} catch (e) {}

function ctrlSnap(m) { let o = {}; CTRL.forEach(k => { o[k] = (m.st && m.st[k]) || 0; }); return o; }
function startCharge(b, why) {
    let a = active(); if (!a) return;
    let dur = chargeTicks();
    b._gdCh = { left: dur, dur, hp0: b.curHp, ctl: ctrlSnap(b), why };
    a.charges++;
    if (!ff()) {
        try { logSys(`<span class="text-red-400 font-bold">⚠ ${b.n} 正在蓄力「毀滅衝擊」！${(dur / 10).toFixed(1)} 秒內以控制技能或造成 ${Math.ceil(b.hp * CH_BREAK_PCT).toLocaleString()} 傷害打斷！</span>`); } catch (e) {}
        try { if (typeof vfxCastShake === 'function') vfxCastShake(); } catch (e) {}
    }
}
function interrupt(b, how) {
    let a = active(); if (!b || !b._gdCh) return;
    b._gdCh = null;
    if (a) a.interrupts++;
    b.st = b.st || newMobStatus();
    b.st.stun = Math.max(b.st.stun || 0, 30);
    b.st.fragile = Math.max(b.st.fragile || 0, 50); b.st.sunder = Math.max(b.st.sunder || 0, 50);
    b._gdNextCh = T() + CH_EVERY_TICKS;
    if (!ff()) {
        try { logSys(`<span class="text-emerald-300 font-bold">✦ 打斷！</span>${how}——${b.n} 失衡 3 秒，5 秒內受到傷害提高。`); } catch (e) {}
        bigText('打斷！', '#4ade80');
    }
}
function knightShield() {
    let has = u => { try { return u && u.cls === 'knight' && u.eq && u.eq.shield; } catch (e) { return false; } };
    if (has(player)) return true;
    try { return (player.allies || []).some(a => a && !a.dead && (a.curHp || 0) > 0 && has(a)); } catch (e) { return false; }
}
function unleash(b) {
    let a = active();
    b._gdCh = null; b._gdNextCh = T() + CH_EVERY_TICKS;
    let barrier = false; try { barrier = typeof inAbsBarrier === 'function' && inAbsBarrier(); } catch (e) {}
    let shield = !barrier && knightShield();
    let mul = barrier ? 0 : (shield ? 0.35 : 1);
    if (a) { if (barrier || shield) a.blocks++; else a.fails++; }
    let pPct = (a && a.rank === 'S' ? 0.95 : 0.85) * mul, aPct = 0.7 * mul;
    let pd = Math.floor((player.mhp || 0) * pPct);
    if (pd > 0) {
        player.hp -= pd;
    }
    try { (player.allies || []).forEach(x => { if (x && (x.curHp || 0) > 0) x.curHp = Math.max(1, x.curHp - Math.floor((x.mhp || 0) * aPct)); }); } catch (e) {}
    if (!ff()) {
        let msg = barrier ? '絕對屏障完全抵擋了毀滅衝擊！' : shield ? `騎士盾牌格擋！只受到 ${pd.toLocaleString()} 傷害。` : `全隊受到重創！（−${pd.toLocaleString()} HP）`;
        try { logSys(`<span class="${barrier || shield ? 'text-sky-300' : 'text-red-500'} font-bold">💥 ${b.n} 釋放「毀滅衝擊」：${msg}</span>`); } catch (e) {}
        bigText(barrier || shield ? '格擋！' : '💥 毀滅衝擊', barrier || shield ? '#7dd3fc' : '#f87171');
        try { if (typeof vfxCastShake === 'function') vfxCastShake(); } catch (e) {}
    }
    if (player.hp <= 0) { try { killPlayer(); } catch (e) { player.hp = 0; } }
    try { if (typeof updateUI === 'function') updateUI(); } catch (e) {}
}

// ---------- 每 tick（掛在 trialTick 之後；js/03 tick 每 100ms 呼叫）----------
let _deadFlag = false;
function tickBounty() {
    let a = active();
    if (!a) { hideUi(); return; }
    if (a.day !== GD.dayKey()) {
        let d = g(); d.bounty.active = null; hideUi();
        logSys('<span class="text-slate-400">頭目懸賞已過期（每日 05:00 刷新）。</span>');
        return;
    }
    if (player && player.dead) { if (!_deadFlag && bossAlive()) { a.deaths++; _deadFlag = true; } } else _deadFlag = false;
    let b = bossAlive();
    if (!b) { hideUi(); return; }
    if (b._gdCh) {
        let c = b._gdCh;
        if (c.hp0 - b.curHp >= b.hp * CH_BREAK_PCT) { interrupt(b, `累積 ${Math.floor(c.hp0 - b.curHp).toLocaleString()} 傷害`); showUi(b); return; }
        let snap = c.ctl; if (CTRL.some(k => ((b.st && b.st[k]) || 0) > snap[k])) { interrupt(b, '控制'); showUi(b); return; }
        c.left--;
        if (c.left <= 0) unleash(b);
        showUi(b);
        return;
    }
    if (ff() || (typeof document !== 'undefined' && document.hidden)) { hideUi(); return; }   // 補跑／背景分頁不觸發蓄力
    if ((b.st && b.st.stun > 0)) { showUi(b); return; }
    let pct = b.curHp / Math.max(1, b.hp);
    if (b._gdThr < CH_THRESH.length && pct <= CH_THRESH[b._gdThr]) { b._gdThr++; startCharge(b, 'hp'); }
    else if (T() >= (b._gdNextCh || 0)) startCharge(b, 'time');
    showUi(b);
}
try {
    const _origTT = window.trialTick;
    window.trialTick = function () {
        let r; try { if (typeof _origTT === 'function') r = _origTT.apply(this, arguments); } catch (e) {}
        try { tickBounty(); } catch (e) {}
        return r;
    };
} catch (e) {}

// ---------- 擊殺結算（掛在 weOnKill 之後）----------
try {
    const _origK = window.weOnKill;
    window.weOnKill = function (mob) {
        let r; try { if (typeof _origK === 'function') r = _origK.apply(this, arguments); } catch (e) {}
        try {
            let a = active();
            if (mob && mob._gdBounty && a && mob._gdBounty === a.id) {
                let stars = 1 + (a.deaths === 0 ? 1 : 0) + (a.fails === 0 ? 1 : 0);
                let d = g(); d.bounty.active = null; hideUi();
                let res = GD.bountyResult(a.id, true, stars);
                d.bounty.last = { id: a.id, boss: a.bossName, stars, charges: a.charges, interrupts: a.interrupts, blocks: a.blocks, fails: a.fails, at: Date.now(), gold: res ? res.gold : 0 };
                if (!ff()) bigText('懸賞達成 ' + '★'.repeat(stars), '#fde68a');
            }
        } catch (e) {}
        return r;
    };
} catch (e) {}

// ---------- 預告 UI ----------
function css() {
    if (document.getElementById('gdb-style')) return;
    let s = document.createElement('style'); s.id = 'gdb-style';
    s.textContent = `
#gdb-banner{position:fixed;left:50%;top:70px;transform:translateX(-50%);z-index:9970;pointer-events:none;min-width:360px;padding:8px 16px;border-radius:10px;background:rgba(69,10,10,.88);border:2px solid #ef4444;color:#fee2e2;text-align:center;box-shadow:0 0 24px rgba(239,68,68,.6);font-size:13px}
#gdb-banner .h{font-size:20px;font-weight:900;color:#fca5a5;letter-spacing:2px;animation:gdbPulse .5s infinite alternate}
#gdb-banner .bars{display:flex;gap:8px;margin-top:5px;font-size:11px;align-items:center}#gdb-banner .bars span{flex:1;height:8px;background:#450a0a;border-radius:4px;overflow:hidden;border:1px solid #7f1d1d}
#gdb-banner .bars i{display:block;height:100%}#gdb-banner .t i{background:linear-gradient(90deg,#f97316,#ef4444)}#gdb-banner .d i{background:linear-gradient(90deg,#22c55e,#86efac)}
#gdb-banner.idle{background:rgba(28,25,23,.8);border-color:#b45309;box-shadow:none;min-width:300px}#gdb-banner.idle .h{font-size:14px;color:#fcd34d;animation:none;letter-spacing:0}
#gdb-ring{position:fixed;z-index:9969;pointer-events:none;border-radius:50%;border:4px solid #ef4444;box-shadow:0 0 18px #ef4444,inset 0 0 18px rgba(239,68,68,.6);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:22px;text-shadow:0 0 6px #000,0 0 3px #ef4444}
#gdb-edge{position:fixed;inset:0;z-index:9960;pointer-events:none;box-shadow:inset 0 0 90px rgba(239,68,68,.55);animation:gdbPulse .5s infinite alternate}
.gdb-big{position:fixed;left:50%;top:38%;transform:translate(-50%,-50%);z-index:9975;pointer-events:none;font-size:46px;font-weight:900;text-shadow:0 0 12px #000,0 0 4px #000;animation:gdbBig 1.2s ease-out forwards}
@keyframes gdbPulse{from{opacity:.65}to{opacity:1}}@keyframes gdbBig{0%{opacity:0;transform:translate(-50%,-50%) scale(.5)}15%{opacity:1;transform:translate(-50%,-50%) scale(1.15)}70%{opacity:1}100%{opacity:0;transform:translate(-50%,-80%) scale(1)}}`;
    document.head.appendChild(s);
}
function el(id) { let e = document.getElementById(id); if (!e) { css(); e = document.createElement('div'); e.id = id; document.body.appendChild(e); } return e; }
function hideUi() { ['gdb-banner', 'gdb-ring', 'gdb-edge'].forEach(id => { let e = document.getElementById(id); if (e) e.remove(); }); }
function bigText(t, color) { try { css(); let d = document.createElement('div'); d.className = 'gdb-big'; d.style.color = color; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 1300); } catch (e) {} }
function showUi(b) {
    if (ff() || typeof document === 'undefined') return;
    let a = active(); if (!a) return;
    let ban = el('gdb-banner'), c = b._gdCh;
    if (c) {
        let need = Math.ceil(b.hp * CH_BREAK_PCT), done = Math.max(0, Math.floor(c.hp0 - b.curHp));
        ban.className = '';
        let weak = '';
        if (intelLv() >= 10 && typeof isElementCounter === 'function') { let w = ['fire', 'water', 'wind', 'earth'].find(x => isElementCounter(x, b.e)); if (w) weak = `・弱點：${{ fire: '火', water: '水', wind: '風', earth: '地' }[w]}屬性`; }
        ban.innerHTML = `<div class="h">⚠ 蓄力中！ ${(c.left / 10).toFixed(1)}s</div><div>👑 ${b.n}「毀滅衝擊」——控制技能或爆發傷害打斷${knightShield() ? '・🛡️ 騎士盾牌可格擋' : ''}${weak}</div>
          <div class="bars t"><b>時間</b><span><i style="width:${Math.round(c.left / c.dur * 100)}%"></i></span></div>
          <div class="bars d"><b>削韌</b><span><i style="width:${Math.min(100, Math.round(done / need * 100))}%"></i></span>${done.toLocaleString()}/${need.toLocaleString()}</div>`;
        el('gdb-edge');
        let ring = el('gdb-ring'), slot = document.querySelector('.mob-target[data-uid="' + b.uid + '"]');
        if (slot) { let r = slot.getBoundingClientRect(), sz = Math.max(70, Math.min(r.width, r.height) * 0.9); ring.style.cssText = `left:${r.left + r.width / 2 - sz / 2}px;top:${r.top + r.height / 2 - sz / 2}px;width:${sz}px;height:${sz}px`; ring.textContent = Math.ceil(c.left / 10); }
        else ring.style.display = 'none';
    } else {
        ['gdb-ring', 'gdb-edge'].forEach(id => { let e = document.getElementById(id); if (e) e.remove(); });
        ban.className = 'idle';
        let nx = Math.max(0, (b._gdNextCh || 0) - T());
        ban.innerHTML = `<div class="h">👑 懸賞頭目 ${b.n}　HP ${Math.round(b.curHp / b.hp * 100)}%</div><div style="font-size:11px;color:#d6d3d1">蓄力 ${a.charges}・打斷 ${a.interrupts}・格擋 ${a.blocks}・失敗 ${a.fails}　下次蓄力 ≤ ${(nx / 10).toFixed(0)}s</div>`;
    }
}

window.gdBountyAccept = gdBountyAccept;
window.gdBountyAbandon = gdBountyAbandon;
window.gdBountyGo = gdBountyGo;
window.GDB = { active, bossAlive, startCharge, interrupt, unleash, tick: tickBounty, makeBoss, chargeTicks, CTRL };
})();
