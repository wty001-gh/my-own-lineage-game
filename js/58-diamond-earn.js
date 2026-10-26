// ===== 💎 v3.8.126 龍之鑽石取得方式（每日領取／掛機微滴／公會／金幣兌換／席琳結晶）=====
// 計數存在潘朵拉共用桶 diamondEarn（全角色共享）；發鑽用 pandoraMutateDiamondEarn / pandoraAdjustSharedDiamonds。
(function () {
'use strict';

var DE_DAILY = 5;
var DE_KILL_CHANCE = 0.0015;   // 0.15%
var DE_KILL_CAP = 20;
var DE_GOLD_COST = 1000000;
var DE_GOLD_CAP = 10;
var DE_CRYSTAL_COST = 3;
var DE_CRYSTAL_CAP = 3;

function deEarn() {
    try {
        if (typeof pandoraGetDiamondEarn === 'function') return pandoraGetDiamondEarn();
    } catch (e) {}
    return { day: '', dailyClaimed: false, killDrip: 0, goldEx: 0, crystalEx: 0 };
}

function deMutate(fn) {
    if (typeof pandoraMutateDiamondEarn !== 'function') return { ok: false, error: '龍之鑽石系統尚未載入。' };
    try { return pandoraMutateDiamondEarn(fn); }
    catch (e) { return { ok: false, error: '龍之鑽石資料忙碌，請稍後再試。' }; }
}

function deLog(msg) {
    try { if (typeof logSys === 'function') logSys(msg); } catch (e) {}
}

function deSaveUi() {
    try { if (typeof saveGame === 'function') saveGame(); } catch (e) {}
    try { if (typeof updateUI === 'function') updateUI(); } catch (e) {}
    try { if (typeof MG !== 'undefined' && MG && typeof MG.refresh === 'function') MG.refresh(); } catch (e) {}
}

/** 每日免費領取 💎5（共用一日一次） */
function deClaimDaily() {
    var r = deMutate(function (st) {
        if (st.diamondEarn.dailyClaimed) return { commit: false, error: '今日已領過每日龍鑽。' };
        st.diamondEarn.dailyClaimed = true;
        st.diamonds = Math.floor(Number(st.diamonds) || 0) + DE_DAILY;
        return { gained: DE_DAILY };
    });
    if (!r || r.ok === false) {
        deLog('<span class="text-red-400">💎 ' + ((r && r.error) || '領取失敗') + '</span>');
        return r;
    }
    deLog('<span class="text-amber-300 font-bold">💎【每日龍鑽】</span>領取 💎×' + DE_DAILY + '（餘 💎' + (r.diamonds || 0).toLocaleString() + '）');
    deSaveUi();
    return r;
}

/**
 * 掛機擊殺微機率：0.15% → 💎1，全日共用上限 20。
 * 先擲骰再鎖共用桶，避免每殺都寫盤。
 */
function deTryKillDrip(mob) {
    if (!mob || mob.siegeEnemy || mob.pledgeEnemy || mob._siegePlayer || mob.race === '血盟' || mob.race === '建築') return false;
    var roll = (typeof lootRng === 'function') ? lootRng('diamondKill') : Math.random();
    if (roll >= DE_KILL_CHANCE) return false;
    // 快讀上限：已滿就唔使鎖
    var snap = deEarn();
    if ((snap.killDrip || 0) >= DE_KILL_CAP) return false;
    var r = deMutate(function (st) {
        if (st.diamondEarn.killDrip >= DE_KILL_CAP) return { commit: false, capped: true };
        st.diamondEarn.killDrip += 1;
        st.diamonds = Math.floor(Number(st.diamonds) || 0) + 1;
        return { gained: 1, killDrip: st.diamondEarn.killDrip };
    });
    if (!r || r.ok === false) return false;
    deLog('<span class="text-cyan-300">💎 掛機拾獲龍之鑽石 ×1</span>（今日 ' + (r.killDrip || 0) + '/' + DE_KILL_CAP + '）');
    return true;
}

/** 公會委託／懸賞發鑽（無日 cap；量本身細） */
function deGrant(n, reason) {
    n = Math.max(0, Math.floor(Number(n) || 0));
    if (!n) return { ok: true, gained: 0 };
    if (typeof pandoraAdjustSharedDiamonds !== 'function') return { ok: false, error: 'unavailable' };
    var adj = null;
    try { adj = pandoraAdjustSharedDiamonds(n); } catch (e) { return { ok: false, error: String(e) }; }
    if (!adj || adj.ok === false) return adj || { ok: false };
    return { ok: true, gained: n, diamonds: adj.diamonds };
}

/** 金幣兌換：100 萬金 = 1 鑽，每日 10 次 */
function deExchangeGold(times) {
    times = Math.max(1, Math.min(10, Math.floor(Number(times) || 1)));
    if (typeof player === 'undefined' || !player) return { ok: false, error: '請先進入遊戲。' };
    var snap = deEarn();
    var left = Math.max(0, DE_GOLD_CAP - (snap.goldEx || 0));
    if (!left) return { ok: false, error: '今日金幣兌換已達上限（' + DE_GOLD_CAP + '）。' };
    times = Math.min(times, left);
    var cost = DE_GOLD_COST * times;
    if ((player.gold || 0) < cost) return { ok: false, error: '金幣不足（要 ' + cost.toLocaleString() + '）。' };

    // 先扣金，共用桶失敗就退回
    player.gold -= cost;
    var r = deMutate(function (st) {
        var room = Math.max(0, DE_GOLD_CAP - st.diamondEarn.goldEx);
        if (!room) return { commit: false, error: '今日金幣兌換已達上限。' };
        var n = Math.min(times, room);
        st.diamondEarn.goldEx += n;
        st.diamonds = Math.floor(Number(st.diamonds) || 0) + n;
        return { gained: n, used: n };
    });
    if (!r || r.ok === false) {
        player.gold += cost;
        deLog('<span class="text-red-400">💎 ' + ((r && r.error) || '兌換失敗') + '</span>');
        return r || { ok: false };
    }
    // 若共用桶只接受較少次數（競態），退多扣嘅金
    var used = r.used || r.gained || 0;
    if (used < times) player.gold += DE_GOLD_COST * (times - used);
    deLog('<span class="text-amber-300 font-bold">💎【兌換所】</span>用 ' + (DE_GOLD_COST * used).toLocaleString() + ' 金幣換 💎×' + used +
        '（今日 ' + ((r.earn && r.earn.goldEx) || 0) + '/' + DE_GOLD_CAP + '）');
    deSaveUi();
    return r;
}

function deCrystalHave() {
    try {
        if (typeof questCountId === 'function') return questCountId('sherine_crystal') || 0;
        if (typeof invCountId === 'function') return invCountId('sherine_crystal') || 0;
    } catch (e) {}
    return 0;
}

/** 席琳結晶 ×3 = 1 鑽，每日 3 次 */
function deExchangeCrystal(times) {
    times = Math.max(1, Math.min(3, Math.floor(Number(times) || 1)));
    if (typeof player === 'undefined' || !player) return { ok: false, error: '請先進入遊戲。' };
    var snap = deEarn();
    var left = Math.max(0, DE_CRYSTAL_CAP - (snap.crystalEx || 0));
    if (!left) return { ok: false, error: '今日結晶兌換已達上限（' + DE_CRYSTAL_CAP + '）。' };
    times = Math.min(times, left);
    var need = DE_CRYSTAL_COST * times;
    if (deCrystalHave() < need) return { ok: false, error: '席琳結晶不足（要 ' + need + '）。' };
    if (typeof questConsumeId !== 'function') return { ok: false, error: '無法扣除席琳結晶。' };

    // 預鎖名額再扣物：失敗時退回名額
    var r = deMutate(function (st) {
        var room = Math.max(0, DE_CRYSTAL_CAP - st.diamondEarn.crystalEx);
        if (!room) return { commit: false, error: '今日結晶兌換已達上限。' };
        var n = Math.min(times, room);
        st.diamondEarn.crystalEx += n;
        // 鑽石稍後物品扣成功再加，避免扣物失敗卻加鑽；先只鎖名額
        return { reserved: n, skipDiamonds: true };
    });
    if (!r || r.ok === false) {
        deLog('<span class="text-red-400">💎 ' + ((r && r.error) || '兌換失敗') + '</span>');
        return r || { ok: false };
    }
    var n = r.reserved || 0;
    if (!n) return { ok: false, error: '兌換失敗。' };
    try { questConsumeId('sherine_crystal', DE_CRYSTAL_COST * n); }
    catch (e) {
        // 退回名額
        deMutate(function (st) {
            st.diamondEarn.crystalEx = Math.max(0, st.diamondEarn.crystalEx - n);
            return {};
        });
        deLog('<span class="text-red-400">💎 扣除席琳結晶失敗。</span>');
        return { ok: false, error: '扣除席琳結晶失敗。' };
    }
    var adj = deMutate(function (st) {
        st.diamonds = Math.floor(Number(st.diamonds) || 0) + n;
        return { gained: n };
    });
    if (!adj || adj.ok === false) {
        // 極罕見：物已扣、加鑽失敗 → 盡力補鑽
        try { if (typeof pandoraAdjustSharedDiamonds === 'function') pandoraAdjustSharedDiamonds(n); } catch (e2) {}
    }
    deLog('<span class="text-amber-300 font-bold">💎【兌換所】</span>用席琳結晶 ×' + (DE_CRYSTAL_COST * n) + ' 換 💎×' + n +
        '（今日 ' + ((adj && adj.earn && adj.earn.crystalEx) || (snap.crystalEx + n)) + '/' + DE_CRYSTAL_CAP + '）');
    deSaveUi();
    return { ok: true, gained: n };
}

/** 世界事件限定頭目：+3（由呼叫端決定一次性） */
function deWorldBossBonus() {
    var adj = deGrant(3, 'worldBoss');
    if (adj && adj.ok !== false) deLog('<span class="text-fuchsia-300">💎 世界事件頭目掉落龍之鑽石 ×3</span>');
    return adj;
}

function deEsc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (ch) {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
    });
}

function dePanelHtml() {
    var e = deEarn();
    var diam = 0;
    try { diam = Math.max(0, Math.floor(Number(typeof pandoraGetSharedDiamonds === 'function' ? pandoraGetSharedDiamonds() : 0) || 0)); } catch (err) {}
    var goldHave = (typeof player !== 'undefined' && player) ? (player.gold || 0) : 0;
    var cryHave = deCrystalHave();
    var claimed = !!e.dailyClaimed;
    var kill = e.killDrip || 0;
    var gex = e.goldEx || 0;
    var cex = e.crystalEx || 0;

    var h = '';
    h += '<div style="font-size:12px;color:#94a3b8;margin-bottom:8px">龍之鑽石全角色共用・每日計數跟公會日界（台北 05:00）。免費取得遠低於 SSR 保底成本。</div>';

    // 每日領取
    h += '<div style="padding:10px;margin:8px 0;border-radius:10px;border:1px solid #334155;background:#0f172a">';
    h += '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">';
    h += '<div><b style="color:#fde68a">📅 每日領取</b><div style="font-size:11px;color:#94a3b8;margin-top:2px">免費 💎×' + DE_DAILY + '・一日一次</div></div>';
    if (claimed) {
        h += '<button class="btn" disabled style="opacity:.45">今日已領</button>';
    } else {
        h += '<button class="btn" style="background:#0ea5e9;border-color:#67e8f9;font-weight:bold" onclick="DE.claimDaily()">領取 💎' + DE_DAILY + '</button>';
    }
    h += '</div></div>';

    // 兌換
    h += '<div style="padding:10px;margin:8px 0;border-radius:10px;border:1px solid #334155;background:#0f172a">';
    h += '<b style="color:#fbbf24">💱 兌換所</b>';
    h += '<div style="margin-top:8px;display:flex;flex-direction:column;gap:8px">';
    h += '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">';
    h += '<div style="font-size:12px;color:#e2e8f0">💰 1,000,000 金幣 → 💎1<br><span style="color:#64748b">今日 ' + gex + '/' + DE_GOLD_CAP + '・持有 ' + goldHave.toLocaleString() + '</span></div>';
    h += '<div style="display:flex;gap:6px">';
    h += '<button class="btn" ' + (gex >= DE_GOLD_CAP ? 'disabled style="opacity:.45"' : '') + ' onclick="DE.exGold(1)">換 1</button>';
    h += '<button class="btn" ' + (gex >= DE_GOLD_CAP ? 'disabled style="opacity:.45"' : '') + ' onclick="DE.exGold(5)">換 5</button>';
    h += '</div></div>';
    h += '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">';
    h += '<div style="font-size:12px;color:#e2e8f0">🔮 席琳結晶 ×' + DE_CRYSTAL_COST + ' → 💎1<br><span style="color:#64748b">今日 ' + cex + '/' + DE_CRYSTAL_CAP + '・持有 ' + cryHave + '</span></div>';
    h += '<button class="btn" ' + (cex >= DE_CRYSTAL_CAP ? 'disabled style="opacity:.45"' : '') + ' onclick="DE.exCrystal(1)">換 1</button>';
    h += '</div></div></div>';

    // 取得一覽
    h += '<div style="padding:10px;margin:8px 0;border-radius:10px;border:1px solid #334155;background:#0f172a">';
    h += '<b style="color:#a5b4fc">📋 取得方式一覽</b>';
    h += '<ul style="margin:8px 0 0;padding-left:18px;font-size:12px;color:#cbd5e1;line-height:1.7">';
    h += '<li>每日領取：💎×' + DE_DAILY + '（' + (claimed ? '已領' : '可領') + '）</li>';
    h += '<li>掛機擊殺微機率（0.15%）：💎×1，今日已獲 <b style="color:#67e8f9">' + kill + '/' + DE_KILL_CAP + '</b></li>';
    h += '<li>公會委託成功：B＋1　A＋2　S／頭目懸賞＋5</li>';
    h += '<li>潘朵拉安全區叫賣客任務（現有）</li>';
    h += '<li>金幣兌換：100 萬金＝1 鑽・日限 ' + DE_GOLD_CAP + '</li>';
    h += '<li>席琳結晶兌換：×' + DE_CRYSTAL_COST + '＝1 鑽・日限 ' + DE_CRYSTAL_CAP + '</li>';
    h += '<li>世界事件限定頭目（首次擊破）：💎×3</li>';
    h += '</ul>';
    h += '<div style="font-size:11px;color:#57534e;margin-top:6px">持有 💎 ' + diam.toLocaleString() + '（共用）・日鍵 ' + deEsc(e.day || '—') + '</div>';
    h += '</div>';
    return h;
}

window.DE = {
    claimDaily: function () { var r = deClaimDaily(); try { if (typeof MG !== 'undefined' && MG.refresh) MG.refresh(); } catch (e) {} return r; },
    exGold: function (n) {
        var r = deExchangeGold(n);
        if (!r || r.ok === false) deLog('<span class="text-red-400">💎 ' + ((r && r.error) || '兌換失敗') + '</span>');
        try { if (typeof MG !== 'undefined' && MG.refresh) MG.refresh(); } catch (e) {}
        return r;
    },
    exCrystal: function (n) {
        var r = deExchangeCrystal(n);
        if (!r || r.ok === false) deLog('<span class="text-red-400">💎 ' + ((r && r.error) || '兌換失敗') + '</span>');
        try { if (typeof MG !== 'undefined' && MG.refresh) MG.refresh(); } catch (e) {}
        return r;
    },
    tryKillDrip: deTryKillDrip,
    grant: deGrant,
    worldBoss: deWorldBossBonus,
    panelHtml: dePanelHtml,
    earn: deEarn,
    DAILY: DE_DAILY, KILL_CAP: DE_KILL_CAP, GOLD_COST: DE_GOLD_COST, GOLD_CAP: DE_GOLD_CAP,
    CRYSTAL_COST: DE_CRYSTAL_COST, CRYSTAL_CAP: DE_CRYSTAL_CAP
};
})();
