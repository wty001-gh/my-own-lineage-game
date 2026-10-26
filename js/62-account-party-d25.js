// ===== 🪪 v3.8.129 Account-Party D2–D5：主角天賦／公會英雄／分帳龍鑽／退役跨槽傭兵 =====
(function () {
'use strict';

if (typeof ACCOUNT_PARTY === 'undefined') window.ACCOUNT_PARTY = { enabled: true, mercLegacy: false };
ACCOUNT_PARTY.d25 = true;
ACCOUNT_PARTY.mercLegacy = false;

function apOn() {
    return !!(ACCOUNT_PARTY && ACCOUNT_PARTY.enabled && typeof player !== 'undefined' && player && player.cls);
}
function ptIsProtag(who) {
    return !!(who && typeof player !== 'undefined' && who === player && !who._heroId && !who._allyName);
}

// ───────── D2 主角天賦（DRAFT · account-party-v1 §3.1）─────────
var PT_DB = {
    knight:   { id: 'pt_knight',   n: '守護誓約', tip: '【DRAFT】受傷 −8%；每 20 秒為最低 HP 隊友加護盾＝自身最大 HP×5%。' },
    royal:    { id: 'pt_royal',    n: '王權指揮', tip: '【DRAFT】上場英雄攻速間隔 −4%；公會委託（你當隊長）T_trait +5。' },
    elf:      { id: 'pt_elf',      n: '遠射鷹眼', tip: '【DRAFT】遠程最終傷 +10%；對頭目額外 +5%。' },
    illusion: { id: 'pt_illusion', n: '千面餘韻', tip: '【DRAFT】異常抗性 +15；對受控目標傷 +8%。' },
    warrior:  { id: 'pt_warrior',  n: '戰意碾壓', tip: '【DRAFT】近戰最終傷 +10%；HP＞70% 時再 +5%。' },
    mage:     { id: 'pt_mage',     n: '魔導核心', tip: '【DRAFT】魔法傷 +10%；MP 上限 +8%。' },
    dark:     { id: 'pt_dark',     n: '暗影收割', tip: '【DRAFT】暴擊率 +4%；暴擊傷 +12%。' },
    dragon:   { id: 'pt_dragon',   n: '龍血不滅', tip: '【DRAFT】最大 HP +10%；每圖一次免死留 1 HP。' }
};

function ptDef() {
    if (!apOn() || !player) return null;
    return PT_DB[player.cls] || null;
}
function ptEnsure() {
    if (!apOn()) return;
    var d = ptDef();
    player.protagonistTalentId = d ? d.id : null;
}

function ptIsRanged(who) {
    try {
        var w = who && who.eq && who.eq.wpn && DB.items[who.eq.wpn.id];
        return !!(w && (w.isBow || w.ranged));
    } catch (e) { return false; }
}
function ptTargetControlled(t) {
    if (!t) return false;
    var s = t.st || t.statuses;
    if (!s) return false;
    return !!(s.stun > 0 || s.freeze > 0 || s.sleep > 0 || s.paralyze > 0 || s.stone > 0 || s.silence > 0);
}

/** recompute 後只套主角 */
function ptApplyRecompute() {
    if (!apOn() || !player || !player.d || (typeof _recomputingAlly !== 'undefined' && _recomputingAlly)) return;
    if (player._allyName || player._heroId) return;
    var cls = player.cls, d = player.d;
    d._ptDr = 0; d._ptRanged = 0; d._ptBossRanged = 0; d._ptMelee = 0; d._ptMeleeHigh = 0;
    d._ptMagic = 0; d._ptCtrlBonus = 0; d._ptAbnRes = 0; d._ptHeroAspd = 0; d._ptGuildTrait = 0;
    if (cls === 'knight') d._ptDr = 0.08;
    if (cls === 'royal') { d._ptHeroAspd = 0.04; d._ptGuildTrait = 5; }
    if (cls === 'elf') { d._ptRanged = 0.10; d._ptBossRanged = 0.05; }
    if (cls === 'illusion') { d._ptAbnRes = 15; d._ptCtrlBonus = 0.08; }
    if (cls === 'warrior') { d._ptMelee = 0.10; d._ptMeleeHigh = 0.05; }
    if (cls === 'mage') {
        d._ptMagic = 0.10;
        player.mmp = Math.max(1, Math.floor((player.mmp || 0) * 1.08));
        if (player.mp > player.mmp) player.mp = player.mmp;
    }
    if (cls === 'dark') {
        d.meleeCrit = (d.meleeCrit || 0) + 4;
        d.rangedCrit = (d.rangedCrit || 0) + 4;
        d.magicCrit = (d.magicCrit || 0) + 4;
        d.meleeCritDmg = (d.meleeCritDmg || 50) + 12;
        d.rangedCritDmg = (d.rangedCritDmg || 50) + 12;
        d.magicCritDmg = (d.magicCritDmg || 50) + 12;
    }
    if (cls === 'dragon') {
        player.mhp = Math.max(1, Math.floor((player.mhp || 1) * 1.10));
        if (player.hp > player.mhp) player.hp = player.mhp;
    }
    ptEnsure();
}

function ptApplyOutgoing(dmg, who, target, kind) {
    if (!(dmg > 0) || !ptIsProtag(who) || !who.d) return dmg;
    var d = who.d, m = 1;
    if (kind === 'magic' && d._ptMagic) m *= 1 + d._ptMagic;
    if (kind !== 'magic') {
        var ranged = ptIsRanged(who);
        if (ranged && d._ptRanged) {
            m *= 1 + d._ptRanged;
            if (target && target.boss && d._ptBossRanged) m *= 1 + d._ptBossRanged;
        }
        if (!ranged && d._ptMelee) {
            m *= 1 + d._ptMelee;
            var hp = who.hp != null ? who.hp : who.curHp;
            var mhp = who.mhp || 1;
            if (d._ptMeleeHigh && hp / mhp > 0.70) m *= 1 + d._ptMeleeHigh;
        }
    }
    if (d._ptCtrlBonus && ptTargetControlled(target)) m *= 1 + d._ptCtrlBonus;
    return m === 1 ? dmg : Math.max(1, Math.floor(dmg * m));
}

function ptApplyIncoming(dmg, who) {
    if (!(dmg > 0) || !ptIsProtag(who) || !who.d || !who.d._ptDr) return dmg;
    return Math.max(1, Math.floor(dmg * (1 - who.d._ptDr)));
}

function ptKnightShieldTick() {
    if (!apOn() || player.cls !== 'knight' || player.dead) return;
    if (typeof state === 'undefined' || !state) return;
    if ((player._ptShieldNext || 0) > state.ticks) return;
    player._ptShieldNext = state.ticks + 200; // 20s
    var allies = (player.allies || []).filter(function (a) { return a && !a._downed && (a.curHp || 0) > 0; });
    if (!allies.length) return;
    var best = null, ratio = 2;
    allies.forEach(function (a) {
        var r = (a.curHp || 0) / Math.max(1, a.mhp || 1);
        if (r < ratio) { ratio = r; best = a; }
    });
    if (!best) return;
    var amt = Math.max(1, Math.floor((player.mhp || 1) * 0.05));
    best._seCrystalShield = Math.max(0, Math.floor(Number(best._seCrystalShield) || 0)) + amt;
    try {
        if (typeof logCombat === 'function') {
            logCombat('<span class="text-sky-300 font-bold">【主角天賦·守護誓約】</span>為 <span class="text-amber-200">' +
                (best._allyName || best.name) + '</span> 加上 ' + amt + ' 點護盾。', 'heal');
        }
    } catch (e) {}
}

function ptTryDragonSurvive() {
    if (!apOn() || player.cls !== 'dragon') return false;
    if (player._ptDragonUsed) return false;
    if (player.dead) return false;
    player._ptDragonUsed = true;
    player.hp = 1;
    try {
        if (typeof logCombat === 'function') {
            logCombat('<span class="text-rose-300 font-bold">【主角天賦·龍血不滅】</span>龍血撐住一口氣，你剩下 1 HP。（本圖已用）', 'heal');
        }
    } catch (e) {}
    try { if (typeof updateUI === 'function') updateUI(); } catch (e2) {}
    return true;
}

function ptOnMapChange() {
    if (!player) return;
    player._ptDragonUsed = false;
    player._ptShieldNext = 0;
}

function ptStatusIconHook() {
    if (typeof renderStatusIconBar !== 'function') return;
    var _orig = renderStatusIconBar;
    window.renderStatusIconBar = renderStatusIconBar = function () {
        _orig.apply(this, arguments);
        try {
            if (!apOn()) return;
            var def = ptDef();
            if (!def) return;
            var bar = document.getElementById('status-icon-bar');
            if (!bar) return;
            if (bar.querySelector('[data-pt-talent]')) return;
            var el = document.createElement('span');
            el.className = 'status-icon';
            el.setAttribute('data-pt-talent', def.id);
            el.title = def.n + '　' + def.tip;
            el.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;margin:1px;border:1px solid #fbbf24;border-radius:6px;background:rgba(15,23,42,.85);color:#fde68a;font-size:11px;font-weight:700;cursor:help;';
            el.textContent = '主';
            bar.appendChild(el);
        } catch (e) {}
    };
}

// ───────── D3 公會只掃本帳英雄 ─────────
function apGuildCancelForeignJobs() {
    if (!apOn() || !window.GD || typeof window.GD.data !== 'function') return;
    var g = window.GD.data();
    if (!g || !Array.isArray(g.jobs) || !g.jobs.length) return;
    var cur = '';
    try { cur = String(typeof currentSlot !== 'undefined' ? currentSlot : ''); } catch (e) {}
    var kept = [], cancelled = 0, refund = 0;
    g.jobs.forEach(function (job) {
        if (!job) return;
        var foreign = (job.members || []).some(function (m) {
            var s = String(m && m.slot != null ? m.slot : '');
            if (!s || s === 'self' || s === cur) return false;
            if (s.indexOf('hero:') === 0) return false;
            if (/^\d+$/.test(s)) return true; // 舊跨存檔位
            return false;
        });
        if (!foreign) { kept.push(job); return; }
        cancelled++;
        // 退 50%「時長金」估算：用卡片 gold × 剩餘時間比例 × 0.5；無剩餘則退 25% 標價
        try {
            var gold = Math.max(0, Math.floor(Number((job.card && (job.card.gold || job.card.rewardGold)) || 0) || 0));
            if (!gold && job.card && job.card.rank && window.GD && window.GD.RANK && window.GD.RANK[job.card.rank]) {
                gold = window.GD.RANK[job.card.rank].gold || 0;
            }
            var now = Date.now(), end = Number(job.endAt) || now, start = Number(job.startAt) || (end - 3600000);
            var total = Math.max(1, end - start), left = Math.max(0, end - now);
            var frac = Math.min(1, left / total);
            var back = Math.floor(gold * Math.max(0.25, frac) * 0.5);
            refund += back;
            player.gold = (player.gold || 0) + back;
            (job.members || []).forEach(function (m) {
                try {
                    var key = m && m.slot != null ? String(m.slot) : '';
                    if (!key) return;
                    var o = JSON.parse(localStorage.getItem('lineage_idle_exped_busy') || '{}') || {};
                    if (o[key]) { delete o[key]; localStorage.setItem('lineage_idle_exped_busy', JSON.stringify(o)); }
                } catch (e2) {}
            });
        } catch (e3) {}
    });
    if (cancelled) {
        g.jobs = kept;
        try {
            if (typeof logSys === 'function') {
                logSys('<span class="text-amber-300">【帳號組隊】已取消 ' + cancelled + ' 宗含外存檔成員嘅委託' +
                    (refund ? '，退回約 ' + refund.toLocaleString() + ' 金（50% 時長金估算）' : '') + '。</span>');
            }
        } catch (e4) {}
        try { saveGame(); } catch (e5) {}
    }
    // 清 members 裡嘅純數字外槽 key
    if (g.members && typeof g.members === 'object') {
        Object.keys(g.members).forEach(function (k) {
            if (/^\d+$/.test(k) && k !== cur) delete g.members[k];
            if (k.indexOf('slot:') === 0) delete g.members[k];
        });
    }
}

var AP_BUSY_KEY = 'lineage_idle_exped_busy';
var _apMemCache = { at: 0, list: [] };

function apNormCls(c) {
    c = String(c || '');
    var known = { knight:1, royal:1, elf:1, illusion:1, warrior:1, mage:1, dark:1, dragon:1 };
    if (known[c]) return c;
    if (c.indexOf('royal') >= 0) return 'royal';
    if (c.indexOf('Dknight') >= 0 || c.indexOf('dragon') >= 0) return 'dragon';
    if (c.indexOf('illusion') >= 0) return 'illusion';
    if (c.indexOf('dark') >= 0) return 'dark';
    if (c.indexOf('knight') >= 0) return 'knight';
    if (c.indexOf('mage') >= 0) return 'mage';
    if (c.indexOf('elf') >= 0) return 'elf';
    if (c.indexOf('warrior') >= 0) return 'warrior';
    return 'knight';
}

function apPatchGuild() {
    if (!window.GD || typeof window.GD.members !== 'function') return;
    var _gm = window.GD.members;
    var memberState = window.GD.memberState;
    var traits = window.GD.traits;
    var patchedMembers = function (force) {
        if (!apOn()) return _gm(force);
        var now = Date.now();
        if (!force && now - _apMemCache.at < 15000) return _apMemCache.list;
        var out = [], seen = {};
        var busy = {};
        try { busy = JSON.parse(localStorage.getItem(AP_BUSY_KEY) || '{}') || {}; } catch (e) {}
        var push = function (slot, sum, self) {
            var s = String(slot);
            if (!sum || !sum.name || !sum.rawCls || seen[s]) return;
            seen[s] = true;
            var why = '';
            if (busy[s] && busy[s].endAt > now) why = '外出中';
            var talents = sum.talents || null;
            try {
                if (self && player) { if (window.TL) TL.ensure(); talents = player.talents; }
            } catch (e2) {}
            sum.talents = talents; sum.slot = s;
            var st = memberState ? memberState(s) : { aff: 0, used: 0 };
            var tr = traits ? traits(sum, st, !!self) : { explore: 0, talk: 0, gather: 0, charm: 0, power: 0, stamina: 5 };
            if (!why && st.used >= tr.stamina) why = '體力不足';
            var cls = apNormCls(sum.rawCls);
            out.push({
                slot: s, name: sum.name, cls: cls, rawCls: cls,
                lv: Math.max(1, Number(sum.lv) || 1), avatar: sum.avatar, tr: tr, st: st, why: why,
                self: !!self, talents: talents || null, star: sum.star || 0, _heroId: sum._heroId || null
            });
        };
        if (player && player.cls) {
            if (window.TL) try { TL.ensure(); } catch (e3) {}
            var cur = '';
            try { cur = String(typeof currentSlot !== 'undefined' ? currentSlot : 'self'); } catch (e4) { cur = 'self'; }
            push(cur || 'self', {
                name: player.name || '自己', rawCls: player.cls, lv: player.lv, avatar: player.avatar,
                classic: !!player.classicMode, talents: player.talents, star: player.star || 0
            }, true);
        }
        (player.heroes || []).forEach(function (h) {
            if (!h || !h.cls) return;
            push('hero:' + h.id, {
                name: h.name || '英雄', rawCls: h.cls, lv: h.lv || 1,
                avatar: null, classic: !!player.classicMode, talents: h.talents || null,
                star: h.star || 0, _heroId: h.id, portraitId: h.portraitId
            }, false);
        });
        _apMemCache = { at: now, list: out };
        return out;
    };
    window.GD.members = patchedMembers;
    // 若外層有人直接叫 gdMembers（非嚴格模式全域）一併覆寫
    try { window.gdMembers = patchedMembers; } catch (e) {}

    if (typeof window.GD.scoreDetail === 'function') {
        var _gs = window.GD.scoreDetail;
        var patchedScore = function (card, mems) {
            var detail = _gs(card, mems);
            try {
                if (apOn() && player && player.cls === 'royal' && player.d && player.d._ptGuildTrait && mems && mems[0] && mems[0].self) {
                    detail.parts = detail.parts || {};
                    detail.parts.T_trait = (detail.parts.T_trait || 0) + player.d._ptGuildTrait;
                    detail.S = Math.round((detail.S + player.d._ptGuildTrait) * 10) / 10;
                    var rate = 45 + (detail.S - (card.req || 0)) * 1.2;
                    var hardCap = card.type === 'bounty' ? 60 : (card.type === 'relic' ? 85 : 95);
                    detail.rate = Math.round(Math.max(5, Math.min(hardCap, rate)));
                }
            } catch (e) {}
            return detail;
        };
        window.GD.scoreDetail = patchedScore;
        try { window.gdScoreDetail = patchedScore; } catch (e2) {}
    }

    if (typeof window.GD.gdRefreshMembers === 'function') {
        var _ref = window.GD.gdRefreshMembers;
        window.GD.gdRefreshMembers = function () { _apMemCache.at = 0; try { _ref(); } catch (e) {} };
    }

    if (typeof AP !== 'undefined' && AP && typeof AP.partySet === 'function') {
        var _ps = AP.partySet;
        AP.partySet = function (index, heroId) {
            if (heroId && apOn()) {
                try {
                    var busy = JSON.parse(localStorage.getItem(AP_BUSY_KEY) || '{}') || {};
                    var key = 'hero:' + heroId;
                    if (busy[key] && busy[key].endAt > Date.now()) {
                        if (typeof logSys === 'function') logSys('<span class="text-red-400">呢位英雄外出委託中，唔可以上場。</span>');
                        return false;
                    }
                } catch (e) {}
            }
            return _ps(index, heroId);
        };
    }
}

// ───────── D4 龍鑽 per-account ─────────
var _origGetDiamonds = null, _origAdjDiamonds = null, _origGetEarn = null, _origMutEarn = null, _origRestore = null;

function apDayKey() {
    try {
        if (window.GD && typeof window.GD.dayKey === 'function') return window.GD.dayKey();
        if (typeof gdDayKey === 'function') return gdDayKey();
    } catch (e) {}
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function apNormEarn(raw) {
    var e = raw && typeof raw === 'object' ? raw : {};
    return {
        day: typeof e.day === 'string' ? e.day : '',
        dailyClaimed: !!e.dailyClaimed,
        killDrip: Math.max(0, Math.floor(Number(e.killDrip) || 0)),
        goldEx: Math.max(0, Math.floor(Number(e.goldEx) || 0)),
        crystalEx: Math.max(0, Math.floor(Number(e.crystalEx) || 0))
    };
}
function apRollEarnDay() {
    if (!player) return apNormEarn(null);
    player.diamondEarn = apNormEarn(player.diamondEarn);
    var day = apDayKey();
    if (player.diamondEarn.day !== day) {
        player.diamondEarn.day = day;
        player.diamondEarn.dailyClaimed = false;
        player.diamondEarn.killDrip = 0;
        player.diamondEarn.goldEx = 0;
        player.diamondEarn.crystalEx = 0;
    }
    return player.diamondEarn;
}

function apMigrateDiamonds() {
    if (!apOn() || !player) return;
    if (player._diamondsMigrated) {
        if (player.diamonds == null) player.diamonds = 0;
        if (!player.diamondEarn) player.diamondEarn = apNormEarn(null);
        return;
    }
    var shared = 0;
    try {
        if (_origGetDiamonds) shared = Math.max(0, Math.floor(Number(_origGetDiamonds()) || 0));
        else if (typeof pandoraGetSharedDiamonds === 'function') shared = Math.max(0, Math.floor(Number(pandoraGetSharedDiamonds()) || 0));
    } catch (e) {}
    if (player.diamonds == null || player.diamonds === undefined) {
        player.diamonds = shared;
        // 臨時策略：每個 slot 首次開啟各繼承一份共用餘額（可被多開複製；見 impl 文件）
        try {
            if (typeof logSys === 'function' && shared > 0) {
                logSys('<span class="text-amber-300">💎【帳號龍鑽】本存檔繼承共用餘額 💎' + shared.toLocaleString() +
                    '（每欄首次各得一份；之後互唔影響）。</span>');
            }
        } catch (e2) {}
    } else {
        player.diamonds = Math.max(0, Math.floor(Number(player.diamonds) || 0));
    }
    if (!player.diamondEarn) player.diamondEarn = apNormEarn(null);
    player._diamondsMigrated = true;
    try { saveGame(); } catch (e3) {}
}

function apPatchDiamonds() {
    if (typeof pandoraGetSharedDiamonds === 'function') _origGetDiamonds = pandoraGetSharedDiamonds;
    if (typeof pandoraAdjustSharedDiamonds === 'function') _origAdjDiamonds = pandoraAdjustSharedDiamonds;
    if (typeof pandoraGetDiamondEarn === 'function') _origGetEarn = pandoraGetDiamondEarn;
    if (typeof pandoraMutateDiamondEarn === 'function') _origMutEarn = pandoraMutateDiamondEarn;
    if (typeof pandoraRestoreSharedDiamonds === 'function') _origRestore = pandoraRestoreSharedDiamonds;

    function _apGetDiamonds() {
        if (apOn()) {
            apMigrateDiamonds();
            return Math.max(0, Math.floor(Number(player.diamonds) || 0));
        }
        return _origGetDiamonds ? _origGetDiamonds() : 0;
    }
    function _apAdjDiamonds(delta) {
        if (!apOn()) return _origAdjDiamonds ? _origAdjDiamonds(delta) : { ok: false };
        apMigrateDiamonds();
        delta = Math.trunc(Number(delta) || 0);
        if (!delta) return { ok: true, diamonds: player.diamonds };
        var next = Math.floor(Number(player.diamonds) || 0) + delta;
        if (next < 0) return { ok: false, error: '龍之鑽石不足。' };
        player.diamonds = next;
        try { saveGame(); } catch (e) {}
        try { if (typeof updateUI === 'function') updateUI(); } catch (e2) {}
        return { ok: true, diamonds: next };
    }
    function _apGetEarn() {
        if (!apOn()) return _origGetEarn ? _origGetEarn() : apNormEarn(null);
        apMigrateDiamonds();
        return Object.assign({}, apRollEarnDay());
    }
    function _apMutEarn(mutator) {
        if (!apOn()) return _origMutEarn ? _origMutEarn(mutator) : { ok: false };
        apMigrateDiamonds();
        apRollEarnDay();
        var st = { diamonds: player.diamonds, diamondEarn: player.diamondEarn };
        var r = (typeof mutator === 'function' ? mutator(st) : null) || {};
        if (r.commit === false) return Object.assign({ ok: false }, r);
        player.diamonds = Math.max(0, Math.floor(Number(st.diamonds) || 0));
        player.diamondEarn = apNormEarn(st.diamondEarn);
        try { saveGame(); } catch (e) {}
        return Object.assign({ ok: true, diamonds: player.diamonds, earn: Object.assign({}, player.diamondEarn) }, r);
    }
    function _apRestoreDiamonds(amount) {
        if (!apOn()) return _origRestore ? _origRestore(amount) : { ok: false };
        apMigrateDiamonds();
        player.diamonds = Math.max(0, Math.floor(Number(amount) || 0));
        try { saveGame(); } catch (e) {}
        return { ok: true, diamonds: player.diamonds };
    }
    window.pandoraGetSharedDiamonds = _apGetDiamonds;
    window.pandoraAdjustSharedDiamonds = _apAdjDiamonds;
    window.pandoraGetDiamondEarn = _apGetEarn;
    window.pandoraMutateDiamondEarn = _apMutEarn;
    window.pandoraRestoreSharedDiamonds = _apRestoreDiamonds;
    try { pandoraGetSharedDiamonds = _apGetDiamonds; } catch (e) {}
    try { pandoraAdjustSharedDiamonds = _apAdjDiamonds; } catch (e) {}
    try { pandoraGetDiamondEarn = _apGetEarn; } catch (e) {}
    try { pandoraMutateDiamondEarn = _apMutEarn; } catch (e) {}
    try { pandoraRestoreSharedDiamonds = _apRestoreDiamonds; } catch (e) {}
}

// ───────── D5 退役跨槽傭兵 ─────────
function apPatchMercRetire() {
    if (typeof mercenaryRoleBattleBlocked === 'function') {
        var _blk = mercenaryRoleBattleBlocked;
        window.mercenaryRoleBattleBlocked = mercenaryRoleBattleBlocked = function () {
            if (apOn()) return false;
            return _blk.apply(this, arguments);
        };
    }
    if (typeof enforceMercenarySafeArea === 'function') {
        var _enf = enforceMercenarySafeArea;
        window.enforceMercenarySafeArea = enforceMercenarySafeArea = function () {
            if (apOn()) return false;
            return _enf.apply(this, arguments);
        };
    }
    if (typeof mercEmployerOfSlot === 'function') {
        var _me = mercEmployerOfSlot;
        window.mercEmployerOfSlot = mercEmployerOfSlot = function () {
            if (apOn()) return null;
            return _me.apply(this, arguments);
        };
    }
    if (typeof currentRoleMercenaryEmployer === 'function') {
        var _cre = currentRoleMercenaryEmployer;
        window.currentRoleMercenaryEmployer = currentRoleMercenaryEmployer = function () {
            if (apOn()) return null;
            return _cre.apply(this, arguments);
        };
    }
    if (typeof _slotBadgeHtml === 'function') {
        var _badge = _slotBadgeHtml;
        window._slotBadgeHtml = _slotBadgeHtml = function (party) {
            if (apOn()) return ''; // 隱藏「擔任傭兵」
            return _badge(party);
        };
    }
    if (typeof toggleAlly === 'function') {
        // 60 已拒招；再保險
        var _ta = toggleAlly;
        window.toggleAlly = toggleAlly = function (slotN) {
            if (apOn()) {
                if (typeof logSys === 'function') logSys('<span class="text-amber-300">帳號組隊模式已退役跨存檔傭兵招募。</span>');
                return;
            }
            return _ta(slotN);
        };
    }
}

// ───────── 安裝補丁 ─────────
function apInstallD25() {
    // D2 recompute
    if (typeof recomputeStats === 'function') {
        var _rs = recomputeStats;
        window.recomputeStats = recomputeStats = function () {
            var r = _rs.apply(this, arguments);
            try { ptApplyRecompute(); } catch (e) {}
            return r;
        };
    }
    if (typeof tlApplyOutgoing === 'function') {
        var _to = tlApplyOutgoing;
        window.tlApplyOutgoing = tlApplyOutgoing = function (dmg, who, target, kind) {
            dmg = _to(dmg, who, target, kind);
            try { dmg = ptApplyOutgoing(dmg, who, target, kind); } catch (e) {}
            return dmg;
        };
    }
    if (typeof tlApplyIncoming === 'function') {
        var _ti = tlApplyIncoming;
        window.tlApplyIncoming = tlApplyIncoming = function (dmg, who) {
            dmg = _ti(dmg, who);
            try { dmg = ptApplyIncoming(dmg, who); } catch (e) {}
            return dmg;
        };
    }
    if (typeof seIncomingDmg === 'function') {
        var _se = seIncomingDmg;
        window.seIncomingDmg = seIncomingDmg = function (dmg, kind, who) {
            dmg = _se.apply(this, arguments);
            try {
                var w = who || player;
                if (ptIsProtag(w)) dmg = ptApplyIncoming(dmg, w);
            } catch (e) {}
            return dmg;
        };
    }
    if (typeof playerStatusResisted === 'function') {
        var _psr = playerStatusResisted;
        window.playerStatusResisted = playerStatusResisted = function (kind) {
            // 注入異常抗性 +15（illusion）到抵抗%：暫時加喺 d.abnormalResist 風格
            // 最穩：若未抵抗，再用 _ptAbnRes 額外擲一次
            var hit = _psr(kind);
            if (hit) return true;
            try {
                if (apOn() && player && player.d && player.d._ptAbnRes) {
                    if (Math.random() * 100 < player.d._ptAbnRes) return true;
                }
            } catch (e) {}
            return false;
        };
    }
    if (typeof allyAttackIntervalTicks === 'function') {
        var _ait = allyAttackIntervalTicks;
        window.allyAttackIntervalTicks = allyAttackIntervalTicks = function (ally, st) {
            var itv = _ait(ally, st);
            try {
                if (apOn() && player && player.d && player.d._ptHeroAspd && ally && ally._heroId) {
                    itv = Math.max(1, Math.floor(itv * (1 - player.d._ptHeroAspd)));
                }
            } catch (e) {}
            return itv;
        };
    }
    if (typeof killPlayer === 'function') {
        var _kp = killPlayer;
        window.killPlayer = killPlayer = function () {
            try { if (ptTryDragonSurvive()) return; } catch (e) {}
            return _kp.apply(this, arguments);
        };
    }
    if (typeof changeMap === 'function') {
        var _cm = changeMap;
        window.changeMap = changeMap = function () {
            var r = _cm.apply(this, arguments);
            try { ptOnMapChange(); } catch (e) {}
            return r;
        };
    }
    if (typeof alliesTick === 'function') {
        var _atk = alliesTick;
        window.alliesTick = alliesTick = function () {
            try { ptKnightShieldTick(); } catch (e) {}
            return _atk.apply(this, arguments);
        };
    }
    ptStatusIconHook();

    apPatchGuild();
    apPatchDiamonds();
    apPatchMercRetire();

    // lifecycle：load／start 後遷移
    function afterLoad() {
        try {
            if (!apOn()) return;
            ptEnsure();
            apMigrateDiamonds();
            apGuildCancelForeignJobs();
            // 卸下 BUSY 中已編入嘅英雄
            try {
                var busy = JSON.parse(localStorage.getItem('lineage_idle_exped_busy') || '{}') || {};
                var ids = (player.party && player.party.heroIds) || [];
                var changed = false;
                for (var i = 0; i < ids.length; i++) {
                    if (!ids[i]) continue;
                    var k = 'hero:' + ids[i];
                    if (busy[k] && busy[k].endAt > Date.now()) { ids[i] = null; changed = true; }
                }
                if (changed && typeof AP !== 'undefined' && AP.sync) {
                    player.party.heroIds = ids;
                    AP.sync({ preserveLive: true });
                }
            } catch (e2) {}
        } catch (e) {}
    }
    if (typeof loadGame === 'function') {
        var _lg = loadGame;
        window.loadGame = loadGame = function () {
            var r = _lg.apply(this, arguments);
            afterLoad();
            return r;
        };
    }
    if (typeof startGame === 'function') {
        var _sg = startGame;
        window.startGame = startGame = function () {
            var r = _sg.apply(this, arguments);
            afterLoad();
            return r;
        };
    }
}

window.PT = {
    DB: PT_DB, def: ptDef, ensure: ptEnsure,
    applyOut: ptApplyOutgoing, applyIn: ptApplyIncoming,
    dragon: ptTryDragonSurvive, shieldTick: ptKnightShieldTick
};

apInstallD25();
try { console.info('[account-party] D2–D5 ready · v3.8.129'); } catch (e) {}
})();
