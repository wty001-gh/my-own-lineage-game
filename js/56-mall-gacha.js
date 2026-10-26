// ===== 💎 v3.8.126 龍鑽膠囊扭蛋商城（mall-gacha-v1 · +取得／兌換）=====
// 扣共用龍鑽 pandoraGetSharedDiamonds / pandoraAdjustSharedDiamonds；獎池由表驅動；pity 每池獨立。
(function () {
'use strict';

var MG_POOLS = {
    cap_mix:    { n: '綜合膠囊', cost1: 10, cost10: 95 },
    cap_weapon: { n: '武器膠囊', cost1: 10, cost10: 95 },
    cap_armor:  { n: '防具膠囊', cost1: 10, cost10: 95 },
    cap_skill:  { n: '技能書膠囊', cost1: 12, cost10: 110 }
};

var MG_TIER_W = { SSR: 3, SR: 30, R: 200, N: 767 };
var MG_TIER_COLOR = { SSR: '#fbbf24', SR: '#c084fc', R: '#60a5fa', N: '#e2e8f0' };
var MG_PITY = { r: 10, sr: 40, ssr: 80 };

var _mgPoolCache = null;
var _mgUiTab = 'gacha'; // gacha | earn | rates | log
var _mgPool = 'cap_mix';
var _mgLastResults = null;

function mgDayKey() {
    try {
        var d = new Date();
        var y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
        return y + '-' + m + '-' + day;
    } catch (e) { return '1970-01-01'; }
}

function mgEnsure() {
    if (typeof player === 'undefined' || !player) return null;
    if (!player.mallGacha || typeof player.mallGacha !== 'object') {
        player.mallGacha = { ver: 1, pity: {}, day: mgDayKey(), daySSRRelic: 0, log: [], firstConfirm: false };
    }
    var g = player.mallGacha;
    if (!g.pity || typeof g.pity !== 'object') g.pity = {};
    Object.keys(MG_POOLS).forEach(function (pid) {
        if (!g.pity[pid]) g.pity[pid] = { r: 0, sr: 0, ssr: 0 };
    });
    if (!Array.isArray(g.log)) g.log = [];
    if (g.day !== mgDayKey()) { g.day = mgDayKey(); g.daySSRRelic = 0; }
    return g;
}

function mgDiamonds() {
    try { return Math.max(0, Math.floor(Number(typeof pandoraGetSharedDiamonds === 'function' ? pandoraGetSharedDiamonds() : 0) || 0)); }
    catch (e) { return 0; }
}

function mgEsc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (ch) {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
    });
}

/** 從 DB.items 建獎池（只揀真實存在嘅 id） */
function mgBuildPoolTables() {
    if (_mgPoolCache) return _mgPoolCache;
    var wpnSSR = [], wpnSR = [], wpnR = [], wpnN = [];
    var armSSR = [], armSR = [], armR = [], armN = [];
    var skSSR = [], skSR = [], skR = [];
    var mats = [];
    if (typeof DB === 'undefined' || !DB.items) { _mgPoolCache = {}; return _mgPoolCache; }
    Object.keys(DB.items).forEach(function (id) {
        var d = DB.items[id];
        if (!d || !d.n || d.relic || d.remains || d.doll || d.isArrow || d.clanBase || d.noSell || d.trialExclusive) return;
        var gw = d.gachaWeight == null ? 100 : Number(d.gachaWeight);
        if (d.type === 'wpn') {
            if (d.legend && gw > 0) wpnSSR.push(id);
            else if (gw > 0 && gw <= 10) wpnSR.push(id);
            else if (gw > 0 && gw <= 50) wpnR.push(id);
            else if (gw > 0) wpnN.push(id);
        } else if (d.type === 'arm' || d.type === 'acc') {
            if (d.legend && gw > 0) armSSR.push(id);
            else if (gw > 0 && gw <= 10) armSR.push(id);
            else if (gw > 0 && gw <= 50) armR.push(id);
            else if (gw > 0) armN.push(id);
        } else if (d.type === 'skillbk') {
            var p = Number(d.p) || 0;
            if (p >= 50000) skSSR.push(id);
            else if (p >= 10000) skSR.push(id);
            else skR.push(id);
        } else if (id === 'scroll_weapon' || id === 'scroll_armor' || id === 'scroll_acc' ||
                   id === 'scroll_weapon_b' || id === 'scroll_armor_b' ||
                   (d.type === 'etc' && gw > 0 && !d.noUse && pOk(d))) {
            mats.push(id);
        }
    });
    function pOk(d) { var p = Number(d.p) || 0; return p > 0 && p < 50000; }
    // 補底：保證每階最少有貨
    if (!mats.length) mats = ['scroll_weapon', 'scroll_armor'].filter(function (id) { return DB.items[id]; });
    if (!skR.length && skSR.length) skR = skSR.slice();
    if (!skSR.length && skR.length) skSR = skR.slice(0, 8);
    if (!skSSR.length) skSSR = (skSR.length ? skSR : skR).slice(0, 5);

    function pick(arr, n) {
        if (!arr || !arr.length) return [];
        if (arr.length <= n) return arr.slice();
        var out = [], step = Math.max(1, Math.floor(arr.length / n));
        for (var i = 0; i < arr.length && out.length < n; i += step) out.push(arr[i]);
        return out;
    }

    var mix = {
        SSR: pick(wpnSSR, 8).concat(pick(armSSR, 6)).concat(pick(skSSR, 4)),
        SR:  pick(wpnSR, 10).concat(pick(armSR, 10)).concat(pick(skSR, 8)),
        R:   pick(wpnR, 12).concat(pick(armR, 12)).concat(pick(skR, 10)).concat(pick(mats, 4)),
        N:   pick(wpnN, 10).concat(pick(armN, 10)).concat(pick(mats, 12))
    };
    var weapon = {
        SSR: pick(wpnSSR, 12),
        SR:  pick(wpnSR, 16),
        R:   pick(wpnR, 20).concat(pick(mats, 4)),
        N:   pick(wpnN, 16).concat(pick(mats, 10))
    };
    var armor = {
        SSR: pick(armSSR, 12),
        SR:  pick(armSR, 16),
        R:   pick(armR, 20).concat(pick(mats, 4)),
        N:   pick(armN, 16).concat(pick(mats, 10))
    };
    var skill = {
        SSR: pick(skSSR, 10),
        SR:  pick(skSR, 16),
        R:   pick(skR, 24),
        N:   pick(skR, 12).concat(pick(mats, 12))
    };
    // 🧭 v3.8.127 扭蛋專屬（mallExclusive）技能書必定入池：p≥50000→SSR，其餘→SR
    Object.keys(DB.items).forEach(function (id) {
        var d = DB.items[id]; if (!d || !d.mallExclusive) return;
        var t = (Number(d.p) || 0) >= 50000 ? 'SSR' : 'SR';
        var tbls = d.type === 'skillbk' ? [mix, skill] : (d.type === 'wpn' ? [mix, weapon] : [mix, armor]);
        tbls.forEach(function (tb) { if (tb[t].indexOf(id) < 0) tb[t].unshift(id); });
    });
    // 保底：空階用 mats / mix 回填
    [mix, weapon, armor, skill].forEach(function (tbl) {
        ['SSR', 'SR', 'R', 'N'].forEach(function (t) {
            if (!tbl[t] || !tbl[t].length) tbl[t] = mats.length ? mats.slice(0, 6) : ['scroll_weapon'];
            tbl[t] = tbl[t].filter(function (id) { return DB.items[id]; });
            if (!tbl[t].length && DB.items.scroll_weapon) tbl[t] = ['scroll_weapon'];
        });
    });
    _mgPoolCache = { cap_mix: mix, cap_weapon: weapon, cap_armor: armor, cap_skill: skill };
    return _mgPoolCache;
}

function mgTierSum() {
    return MG_TIER_W.SSR + MG_TIER_W.SR + MG_TIER_W.R + MG_TIER_W.N;
}

function mgTierPct(tier) {
    return (100 * MG_TIER_W[tier] / mgTierSum());
}

function mgRollTier(pity, forceMin) {
    // forceMin: 'R' | 'SR' | 'SSR' | null
    if (forceMin === 'SSR' || (pity.ssr + 1) >= MG_PITY.ssr) return 'SSR';
    if (forceMin === 'SR' || (pity.sr + 1) >= MG_PITY.sr) {
        // 強制 SR+：只喺 SSR/SR 權重抽
        var wSR = MG_TIER_W.SSR + MG_TIER_W.SR;
        var r1 = (typeof lootRng === 'function' ? lootRng('mallGacha') : Math.random()) * wSR;
        return r1 < MG_TIER_W.SSR ? 'SSR' : 'SR';
    }
    if (forceMin === 'R' || (pity.r + 1) >= MG_PITY.r) {
        var wR = MG_TIER_W.SSR + MG_TIER_W.SR + MG_TIER_W.R;
        var r2 = (typeof lootRng === 'function' ? lootRng('mallGacha') : Math.random()) * wR;
        if (r2 < MG_TIER_W.SSR) return 'SSR';
        if (r2 < MG_TIER_W.SSR + MG_TIER_W.SR) return 'SR';
        return 'R';
    }
    var total = mgTierSum();
    var r = (typeof lootRng === 'function' ? lootRng('mallGacha') : Math.random()) * total;
    if (r < MG_TIER_W.SSR) return 'SSR';
    if (r < MG_TIER_W.SSR + MG_TIER_W.SR) return 'SR';
    if (r < MG_TIER_W.SSR + MG_TIER_W.SR + MG_TIER_W.R) return 'R';
    return 'N';
}

function mgPickItem(poolId, tier) {
    var tables = mgBuildPoolTables();
    var tbl = tables[poolId] || tables.cap_mix;
    var list = (tbl && tbl[tier]) || [];
    if (!list.length) list = ['scroll_weapon'];
    var idx = Math.floor((typeof lootRng === 'function' ? lootRng('mallGachaItem') : Math.random()) * list.length);
    return list[Math.max(0, Math.min(list.length - 1, idx))];
}

function mgBumpPity(pity, tier) {
    if (tier === 'SSR') { pity.r = 0; pity.sr = 0; pity.ssr = 0; }
    else if (tier === 'SR') { pity.r = 0; pity.sr = 0; pity.ssr++; }
    else if (tier === 'R') { pity.r = 0; pity.sr++; pity.ssr++; }
    else { pity.r++; pity.sr++; pity.ssr++; }
}

function mgGrant(itemId, tier) {
    var d = DB.items[itemId];
    if (!d) return { id: itemId, ok: false };
    var gi = null;
    // 🧭 v3.8.127 已學技能書→殘頁（SSR 5／SR 3／其他 1）
    if (d.type === 'skillbk' && d.sk && player && Array.isArray(player.skills) && player.skills.indexOf(d.sk) >= 0 && DB.items.mg_book_frag) {
        var fn = tier === 'SSR' ? 5 : (tier === 'SR' ? 3 : 1);
        try { gainItem('mg_book_frag', fn, true); } catch (e) {}
        try { if (typeof logSys === 'function') logSys('<span class="text-amber-200">📜 已學「' + (DB.skills[d.sk] ? DB.skills[d.sk].n : d.n) + '」→ 技能書殘頁 ×' + fn + '</span>'); } catch (e) {}
        return { id: itemId, frag: fn };
    }
    try {
        if (d.eff === 'card' && d.cardMob && d.cardTier && typeof acquireCard === 'function') {
            acquireCard(d.cardMob, d.cardTier, 1);
            gi = { id: itemId };
        } else if (typeof gainItem === 'function') {
            var blessOpt = null;
            if ((d.type === 'wpn' || d.type === 'arm' || d.type === 'acc') && typeof pandoraStockBless === 'function') {
                blessOpt = { bless: pandoraStockBless(itemId) === true };
            }
            gi = gainItem(itemId, 1, true, false, false, false, blessOpt);
        } else {
            player.inv.push({ id: itemId, uid: (typeof uid === 'function' ? uid() : ('mg_' + Date.now())), cnt: 1 });
            gi = { id: itemId };
        }
    } catch (e) {
        try { player.inv.push({ id: itemId, uid: 'mg_' + Date.now(), cnt: 1 }); } catch (e2) {}
        gi = { id: itemId };
    }
    return gi || { id: itemId };
}

function mgOnePull(poolId, forceMin) {
    var g = mgEnsure();
    var pity = g.pity[poolId];
    var tier = mgRollTier(pity, forceMin || null);
    var itemId = mgPickItem(poolId, tier);
    mgBumpPity(pity, tier);
    var inst = mgGrant(itemId, tier);
    var cost = 0;
    g.log.unshift({ t: Date.now(), pool: poolId, itemId: itemId, tier: tier, cost: cost });
    if (g.log.length > 100) g.log.length = 100;
    return { itemId: itemId, tier: tier, inst: inst };
}

function mgPull(poolId, count) {
    count = count === 10 ? 10 : 1;
    var meta = MG_POOLS[poolId];
    if (!meta) return { ok: false, msg: '唔知嘅獎池。' };
    if (typeof player === 'undefined' || !player) return { ok: false, msg: '請先進入遊戲。' };
    var g = mgEnsure();
    var cost = count === 10 ? meta.cost10 : meta.cost1;
    if (mgDiamonds() < cost) return { ok: false, msg: '龍之鑽石不足（要 💎' + cost + '）。' };

    if (!g.firstConfirm) {
        var ok = true;
        try { ok = confirm('龍之鑽石全角色共用，確定扭蛋？'); } catch (e) { ok = true; }
        if (!ok) return { ok: false, msg: '已取消。' };
        g.firstConfirm = true;
    }

    var adj = null;
    try { adj = pandoraAdjustSharedDiamonds(-cost); } catch (e) { return { ok: false, msg: '扣鑽失敗。' }; }
    if (!adj || adj.ok === false) return { ok: false, msg: (adj && adj.error) || '龍之鑽石不足。' };

    var results = [];
    var allN = true;
    for (var i = 0; i < count; i++) {
        var force = null;
        // 十連第 10 抽：若前 9 全 N，強制 ≥R
        if (count === 10 && i === 9 && allN) force = 'R';
        var r = mgOnePull(poolId, force);
        if (r.tier !== 'N') allN = false;
        // 寫入實際 cost 到最後一筆 log（均攤顯示）
        if (g.log[0]) g.log[0].cost = Math.round(cost / count);
        results.push(r);
    }
    _mgLastResults = results;
    try { if (typeof saveGame === 'function') saveGame(); } catch (e) {}
    try { if (typeof updateUI === 'function') updateUI(); } catch (e) {}
    try {
        var names = results.map(function (r) {
            var d = DB.items[r.itemId];
            return (d ? d.n : r.itemId) + '(' + r.tier + ')';
        }).join('、');
        if (typeof logSys === 'function') logSys('<span class="text-amber-300 font-bold">💎【龍鑽商城】</span>扭咗 ' + count + ' 次（−💎' + cost + '）：' + names);
    } catch (e) {}
    return { ok: true, results: results, cost: cost };
}

// 🎟️ v3.8.127 公會抽卡券（guild.tickets）：1 張＝綜合膠囊扭一次（計保底、入紀錄）
function mgTickets() { try { return (window.GD && GD.data) ? (GD.data().tickets || 0) : 0; } catch (e) { return 0; } }
function mgTicketPull() {
    if (typeof player === 'undefined' || !player) return { ok: false, msg: '請先進入遊戲。' };
    var g0 = null; try { g0 = GD.data(); } catch (e) {}
    if (!g0 || (g0.tickets || 0) < 1) return { ok: false, msg: '公會抽卡券不足。' };
    g0.tickets -= 1;
    var r = mgOnePull('cap_mix', null);
    _mgLastResults = [r];
    try { if (typeof saveGame === 'function') saveGame(); } catch (e) {}
    try { if (typeof updateUI === 'function') updateUI(); } catch (e) {}
    try { var d = DB.items[r.itemId]; if (typeof logSys === 'function') logSys('<span class="text-amber-300 font-bold">🎟️【龍鑽商城】</span>用抽卡券扭咗綜合膠囊：' + (d ? d.n : r.itemId) + '(' + r.tier + ')'); } catch (e) {}
    return { ok: true };
}

// 📜 v3.8.127 殘頁兌換：10 張 → 任一扭蛋專屬技能書
var MG_FRAG_COST = 10;
function mgFragCount() { var n = 0; (player && player.inv || []).forEach(function (i) { if (i && i.id === 'mg_book_frag') n += (i.cnt || 1); }); return n; }
function mgFragExchange(bookId) {
    var d = DB.items[bookId];
    if (!d || !d.mallExclusive || d.type !== 'skillbk') return { ok: false, msg: '唔可以兌換呢本書。' };
    if (mgFragCount() < MG_FRAG_COST) return { ok: false, msg: '技能書殘頁不足（要 ' + MG_FRAG_COST + ' 張）。' };
    var left = MG_FRAG_COST;
    for (var i = player.inv.length - 1; i >= 0 && left > 0; i--) {
        var it = player.inv[i]; if (!it || it.id !== 'mg_book_frag') continue;
        var c = it.cnt || 1, take = Math.min(c, left);
        if (c - take <= 0) player.inv.splice(i, 1); else it.cnt = c - take;
        left -= take;
    }
    try { gainItem(bookId, 1, true); } catch (e) { player.inv.push({ id: bookId, uid: (typeof uid === 'function' ? uid() : 'mgf_' + Date.now()), cnt: 1 }); }
    try { if (typeof saveGame === 'function') saveGame(); } catch (e) {}
    try { if (typeof updateUI === 'function') updateUI(); } catch (e) {}
    try { if (typeof logSys === 'function') logSys('<span class="text-amber-300 font-bold">📜【龍鑽商城】</span>用殘頁 ×' + MG_FRAG_COST + ' 換咗「' + d.n + '」。'); } catch (e) {}
    return { ok: true };
}
function mgFragHtml() {
    var have = mgFragCount();
    var books = Object.keys(DB.items).filter(function (id) { var d = DB.items[id]; return d && d.mallExclusive && d.type === 'skillbk'; });
    return '<div style="margin-top:12px;padding:10px;border:1px solid #b45309;border-radius:10px;background:#1c1917">' +
        '<div style="font-weight:bold;color:#fcd34d">📜 技能書殘頁兌換　持有 ' + have + '（' + MG_FRAG_COST + ' 張換 1 本）</div>' +
        '<div style="font-size:11px;color:#a8a29e;margin:4px 0 8px">扭蛋抽到已學嘅技能書會自動變殘頁（SSR 5／SR 3／其他 1）。</div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:6px">' + books.map(function (id) {
            return '<button class="btn" style="opacity:' + (have >= MG_FRAG_COST ? 1 : 0.5) + '" onclick="MG.frag(\'' + id + '\')">' + mgEsc(DB.items[id].n) + '</button>';
        }).join('') + '</div></div>';
}

function mgRatesHtml(poolId) {
    var tables = mgBuildPoolTables();
    var tbl = tables[poolId] || tables.cap_mix;
    var h = '<div style="font-size:12px;color:#cbd5e1">權重來源單一真相・合計 ' + mgTierSum() + '</div>';
    ['SSR', 'SR', 'R', 'N'].forEach(function (t) {
        var pct = mgTierPct(t).toFixed(2);
        var list = (tbl[t] || []).slice(0, 12).map(function (id) {
            var d = DB.items[id]; return d ? d.n : id;
        }).join('、');
        var more = (tbl[t] || []).length > 12 ? '…共 ' + tbl[t].length + ' 種' : '';
        h += '<div style="margin:8px 0;padding:8px;background:#0f172a;border:1px solid #334155;border-radius:8px">';
        h += '<div style="font-weight:bold;color:' + MG_TIER_COLOR[t] + '">' + t + '　權重 ' + MG_TIER_W[t] + '　≈ ' + pct + '%</div>';
        h += '<div style="font-size:11px;color:#94a3b8;margin-top:4px">' + mgEsc(list) + more + '</div></div>';
    });
    h += '<div style="font-size:11px;color:#64748b;margin-top:6px">保底：每池 ' + MG_PITY.r + ' 抽無 R+→強制 R+；' + MG_PITY.sr + ' 抽無 SR+→SR+；' + MG_PITY.ssr + ' 抽無 SSR→SSR。十連若全 N，第 10 抽重抽至 ≥R。</div>';
    return h;
}

function mgLogHtml() {
    var g = mgEnsure();
    if (!g || !g.log.length) return '<div style="color:#64748b;padding:12px">暫時未有扭蛋紀錄。</div>';
    return '<div style="max-height:420px;overflow:auto">' + g.log.map(function (e) {
        var d = DB.items[e.itemId];
        var nm = d ? d.n : e.itemId;
        var pn = (MG_POOLS[e.pool] && MG_POOLS[e.pool].n) || e.pool;
        var when = '';
        try { when = new Date(e.t).toLocaleString('zh-HK'); } catch (err) {}
        return '<div style="display:flex;justify-content:space-between;gap:8px;padding:6px 4px;border-bottom:1px solid #1e293b;font-size:12px">' +
            '<span><b style="color:' + (MG_TIER_COLOR[e.tier] || '#fff') + '">[' + e.tier + ']</b> ' + mgEsc(nm) +
            ' <span style="color:#64748b">' + mgEsc(pn) + '</span></span>' +
            '<span style="color:#64748b;white-space:nowrap">' + mgEsc(when) + '</span></div>';
    }).join('') + '</div>';
}

function mgPityBar(poolId) {
    var g = mgEnsure();
    var p = (g && g.pity[poolId]) || { r: 0, sr: 0, ssr: 0 };
    function bar(label, cur, max, col) {
        var pct = Math.min(100, Math.round(100 * cur / max));
        return '<div style="margin:4px 0"><div style="display:flex;justify-content:space-between;font-size:11px;color:#94a3b8"><span>' + label + '</span><span>' + cur + '/' + max + '</span></div>' +
            '<div style="height:6px;background:#1e293b;border-radius:3px;overflow:hidden"><i style="display:block;height:100%;width:' + pct + '%;background:' + col + '"></i></div></div>';
    }
    return bar('R+ 保底', p.r, MG_PITY.r, '#60a5fa') + bar('SR+ 保底', p.sr, MG_PITY.sr, '#c084fc') + bar('SSR 保底', p.ssr, MG_PITY.ssr, '#fbbf24');
}

function mgResultsHtml(results) {
    if (!results || !results.length) return '';
    return '<div style="display:flex;flex-wrap:wrap;gap:6px;margin:8px 0">' + results.map(function (r) {
        var d = DB.items[r.itemId];
        var nm = d ? d.n : r.itemId;
        var col = MG_TIER_COLOR[r.tier] || '#fff';
        var glow = r.tier === 'SSR' ? 'box-shadow:0 0 12px rgba(251,191,36,.55)' : (r.tier === 'SR' ? 'box-shadow:0 0 8px rgba(192,132,252,.4)' : '');
        return '<div style="flex:1 1 140px;min-width:120px;padding:8px;border-radius:8px;border:1px solid ' + col + ';background:#0f172a;' + glow + '">' +
            '<div style="font-size:10px;color:' + col + ';font-weight:bold">' + r.tier + '</div>' +
            '<div style="font-size:12px;color:#e2e8f0">' + mgEsc(nm) + '</div></div>';
    }).join('') + '</div>';
}

function mgPanelHtml() {
    mgEnsure();
    var diam = mgDiamonds();
    var meta = MG_POOLS[_mgPool] || MG_POOLS.cap_mix;
    var tabs = [['gacha', '膠囊扭蛋'], ['earn', '取得／兌換'], ['rates', '睇晒機率'], ['log', '紀錄']];
    var tabBtns = tabs.map(function (t) {
        return '<button class="btn" style="opacity:' + (_mgUiTab === t[0] ? 1 : 0.55) + '" onclick="MG.tab(\'' + t[0] + '\')">' + t[1] + '</button>';
    }).join('');
    var poolBtns = Object.keys(MG_POOLS).map(function (pid) {
        return '<button class="btn" style="opacity:' + (_mgPool === pid ? 1 : 0.5) + ';border-color:' + (_mgPool === pid ? '#fbbf24' : '#475569') + '" onclick="MG.setPool(\'' + pid + '\')">' + MG_POOLS[pid].n + '</button>';
    }).join('');

    var body = '';
    if (_mgUiTab === 'earn') {
        try { body = (typeof DE !== 'undefined' && DE && typeof DE.panelHtml === 'function') ? DE.panelHtml() : '<div style="color:#f87171">取得模組未載入。</div>'; }
        catch (e) { body = '<div style="color:#f87171">取得面板錯誤。</div>'; }
        try { body += mgFragHtml(); } catch (e) {}
    } else if (_mgUiTab === 'rates') body = mgRatesHtml(_mgPool);
    else if (_mgUiTab === 'log') body = mgLogHtml();
    else {
        body = '<div style="display:flex;gap:12px;flex-wrap:wrap">' +
            '<div style="flex:1;min-width:220px">' +
            '<div style="font-size:13px;color:#a8a29e;margin-bottom:6px">揀池</div>' +
            '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">' + poolBtns + '</div>' +
            '<div style="padding:16px;border-radius:12px;border:1px solid #7c3aed;background:linear-gradient(160deg,#1e1b4b,#0f172a);text-align:center;min-height:120px">' +
            '<div style="font-size:42px;line-height:1">🎱</div>' +
            '<div style="color:#c4b5fd;font-weight:bold;margin-top:6px">' + mgEsc(meta.n) + '</div>' +
            '<div style="font-size:11px;color:#64748b;margin-top:4px">投幣 → 轉膠囊 → 爆開</div></div>' +
            '<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">' +
            '<button class="btn" style="flex:1;background:#7c3aed;border-color:#a78bfa;font-weight:bold" onclick="MG.pull(1)">扭一次 💎' + meta.cost1 + '</button>' +
            '<button class="btn" style="flex:1;background:#b45309;border-color:#fbbf24;font-weight:bold" onclick="MG.pull(10)">扭十次 💎' + meta.cost10 + '</button>' +
            '</div>' +
            '<button class="btn" style="width:100%;margin-top:6px;opacity:' + (mgTickets() > 0 ? 1 : 0.5) + '" onclick="MG.ticket()">🎟️ 用公會抽卡券扭綜合膠囊（持有 ' + mgTickets() + '）</button>' +
            '</div>' +
            '<div style="flex:1;min-width:220px">' +
            '<div style="font-weight:bold;color:#fde68a;margin-bottom:4px">保底進度・' + mgEsc(meta.n) + '</div>' +
            mgPityBar(_mgPool) +
            '<div style="font-weight:bold;color:#93c5fd;margin:10px 0 4px">今次結果</div>' +
            (_mgLastResults ? mgResultsHtml(_mgLastResults) : '<div style="color:#64748b;font-size:12px">扭完會喺度顯示。</div>') +
            '</div></div>';
    }

    return '<div style="padding:8px 4px">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px">' +
        '<div><b style="color:#fbbf24">💎 龍鑽商城</b>　持有 <b style="color:#67e8f9">💎 ' + diam.toLocaleString() + '</b>' +
        ' <span style="font-size:11px;color:#64748b">（全角色共用）</span></div>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap">' + tabBtns +
        '<button class="btn" onclick="MG.close()">✕ 關閉</button></div></div>' +
        body +
        '<div style="font-size:11px;color:#57534e;margin-top:10px">限時池／特價：後續版本。本版＝扭蛋＋取得／兌換（每日／掛機／公會／金幣／結晶）。</div>' +
        '</div>';
}

function mgRefresh() {
    var box = document.querySelector('#mg-overlay > div');
    if (box) box.innerHTML = mgPanelHtml();
}

function mgOpen() {
    if (typeof player === 'undefined' || !player) {
        try { alert('請先進入遊戲。'); } catch (e) {}
        return;
    }
    mgEnsure();
    mgBuildPoolTables();
    var d = document.getElementById('mg-overlay');
    if (!d) {
        d = document.createElement('div');
        d.id = 'mg-overlay';
        d.style.cssText = 'position:fixed;inset:0;z-index:9990;background:rgba(0,0,0,.78);overflow:auto;padding:20px';
        document.body.appendChild(d);
    }
    d.innerHTML = '<div style="max-width:920px;margin:0 auto;background:#0f172a;border:1px solid #7c3aed;border-radius:12px;padding:12px;box-shadow:0 0 24px rgba(124,58,237,.35)">' + mgPanelHtml() + '</div>';
}

function mgClose() {
    var x = document.getElementById('mg-overlay');
    if (x) x.remove();
}

function mgSetTab(t) { _mgUiTab = t; mgRefresh(); }
function mgSetPool(p) { _mgPool = p; _mgUiTab = 'gacha'; mgRefresh(); }
function mgDoPull(n) {
    var r = mgPull(_mgPool, n);
    if (!r.ok) {
        try { if (typeof logSys === 'function') logSys('<span class="text-red-400">💎 ' + r.msg + '</span>'); else alert(r.msg); } catch (e) { try { alert(r.msg); } catch (e2) {} }
    }
    mgRefresh();
}

function mgAddBtn() {
    var cn = document.getElementById('st-classname');
    if (!cn || document.getElementById('btn-mall-open')) return;
    var b = document.createElement('span');
    b.id = 'btn-mall-open';
    b.title = '龍鑽商城（膠囊扭蛋）';
    b.textContent = '💎';
    b.style.cssText = 'margin-left:4px;cursor:pointer;font-size:13px;line-height:1;padding:1px 4px;border:1px solid #7c3aed;border-radius:4px;background:rgba(76,29,149,.55)';
    b.onclick = function (e) { e.stopPropagation(); mgOpen(); };
    var after = document.getElementById('btn-talent-open') || document.getElementById('btn-guild-open') || cn;
    after.parentNode.insertBefore(b, after.nextSibling);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(mgAddBtn, 80); });
else setTimeout(mgAddBtn, 80);
setTimeout(mgAddBtn, 1800);

window.MG = {
    open: mgOpen, close: mgClose, tab: mgSetTab, setPool: mgSetPool, pull: mgDoPull,
    ticket: function () { var r = mgTicketPull(); if (!r.ok) { try { logSys('<span class="text-red-400">🎟️ ' + r.msg + '</span>'); } catch (e) {} } mgRefresh(); },
    frag: function (id) { var r = mgFragExchange(id); if (!r.ok) { try { logSys('<span class="text-red-400">📜 ' + r.msg + '</span>'); } catch (e) {} } mgRefresh(); },
    ensure: mgEnsure, rates: mgRatesHtml, build: mgBuildPoolTables, diamonds: mgDiamonds, refresh: mgRefresh
};
})();
