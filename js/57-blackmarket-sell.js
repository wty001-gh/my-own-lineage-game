// ===== 📢 v3.8.125 潘朵拉黑市・玩家寄售（blackmarket-sell-v1 · MVP S1+S2）=====
// market.sellOrder 與 buyOrder 並列；成交＝系统回收毁裝換金；判定用 lootRng('pandoraSell')。
(function () {
'use strict';

var SELL_RATIO_MIN = 0.70;
var SELL_RATIO_MAX = 2.50;
var SELL_TAX = 0.05;
var SELL_CANCEL_CD_TICKS = 600 * 5;       // 5 分鐘（600 tick/分）
var SELL_EXPIRE_TICKS = 600 * 60 * 48;    // 48 遊戲小時
var SELL_DELTA_H = 10 / 60;               // 每次判定 Δt＝10 分鐘＝1/6 小時

function sellEsc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (ch) {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
    });
}

function sellNowTick() {
    return (typeof state !== 'undefined' && state) ? (state.ticks || 0) : 0;
}

function sellCurSlot() {
    try { return String(typeof currentSlot !== 'undefined' ? currentSlot : ''); } catch (e) { return ''; }
}

/** 穩定參考價（唔食 lootRng）— 取倍率中位 */
function pandoraRefPrice(id) {
    var d = (typeof DB !== 'undefined' && DB.items) ? DB.items[id] : null;
    if (!d) return 1;
    if (typeof pandoraCardPriceRange === 'function') {
        var cardRange = pandoraCardPriceRange(d);
        if (cardRange && cardRange.min != null && cardRange.max != null) {
            return Math.max(1, Math.floor((Number(cardRange.min) + Number(cardRange.max)) / 2));
        }
    }
    var w = Math.max(1, Math.min(100, d.gachaWeight || 100));
    var base = Math.max(1, d.p || 1);
    var lo, hi;
    if (w === 1) { base = Math.max(base, 100000); lo = 11; hi = 1000; }
    else { lo = Math.max(1, 11 - 0.1 * w); hi = lo * 100; }
    var mult = (lo + hi) / 2;
    return Math.max(1, Math.round(base * mult));
}

function sellTaxRate() {
    // 公會 logistics≥5 → 4%，≥10 → 3%；否則 5%。_cbLv 來自 51-guild.js
    var tax = SELL_TAX;
    try {
        if (typeof _cbLv === 'function') {
            var lv = _cbLv('logistics') || 0;
            if (lv >= 10) tax = 0.03;
            else if (lv >= 5) tax = 0.04;
        }
    } catch (e) {}
    return Math.max(0.03, tax);
}

/** τ（小時）by ratio — 設計稿 §7 */
function sellTauHours(ratio) {
    function lerp(a, b, t) { t = Math.max(0, Math.min(1, t)); return a + (b - a) * t; }
    if (ratio <= 0.90) return lerp(5 / 60, 20 / 60, (ratio - 0.70) / 0.20);
    if (ratio <= 1.05) return lerp(20 / 60, 1, (ratio - 0.90) / 0.15);
    if (ratio <= 1.25) return lerp(1, 4, (ratio - 1.05) / 0.20);
    if (ratio <= 1.60) return lerp(4, 12, (ratio - 1.25) / 0.35);
    return lerp(12, 48, Math.min(1, (ratio - 1.60) / 0.90));
}

function sellEtaBand(ratio) {
    if (ratio < SELL_RATIO_MIN) return '價太低，唔畀上架';
    if (ratio <= 0.90) return '約 5–20 分鐘（搶手）';
    if (ratio <= 1.05) return '約 20–60 分鐘（公道）';
    if (ratio <= 1.25) return '約 1–4 小時（偏貴）';
    if (ratio <= 1.60) return '約 4–12 小時（貴）';
    if (ratio <= SELL_RATIO_MAX) return '約 12–48 小時（天價・可能流標）';
    return '價太高檔，建議 ≤' + SELL_RATIO_MAX.toFixed(2) + '×';
}

function sellAllowed(id) {
    if (typeof pandoraBuyOrderAllowed === 'function') return pandoraBuyOrderAllowed(id);
    return false;
}

function sellCloneInst(it) {
    try { return JSON.parse(JSON.stringify(it)); } catch (e) {
        return { id: it.id, cnt: it.cnt || 1, en: it.en || 0, bless: it.bless, anc: it.anc, attr: it.attr, seteff: it.seteff, uid: it.uid };
    }
}

function sellTakeFromInv(itemUid) {
    if (!player || !Array.isArray(player.inv)) return null;
    var idx = player.inv.findIndex(function (x) { return x && x.uid === itemUid; });
    if (idx < 0) return null;
    var it = player.inv[idx];
    if (it.lock) return null;
    // escrow 成件（MVP：裝備／書／卡 一次一件；stack 材料亦整疊或扣 1）
    var d = DB.items[it.id];
    var taken;
    if (d && (d.type === 'etc' || d.type === 'pot' || d.type === 'mat') && (it.cnt || 1) > 1) {
        // Phase S2 stack：寄售 1 個
        taken = sellCloneInst(it);
        taken.cnt = 1;
        taken.uid = (typeof uid === 'function' ? uid() : ('sell_' + Date.now()));
        it.cnt -= 1;
    } else if ((it.cnt || 1) > 1 && d && (d.type === 'skillbk' || d.eff === 'card' || d.eff === 'panacea')) {
        taken = sellCloneInst(it);
        taken.cnt = 1;
        taken.uid = (typeof uid === 'function' ? uid() : ('sell_' + Date.now()));
        it.cnt -= 1;
    } else {
        taken = sellCloneInst(it);
        player.inv.splice(idx, 1);
    }
    return taken;
}

function sellReturnToInv(inst) {
    if (!inst || !player) return;
    try {
        if (typeof invMergeBack === 'function' && invMergeBack(inst)) return;
    } catch (e) {}
    if (!Array.isArray(player.inv)) player.inv = [];
    player.inv.push(inst);
}

function sellGetOrder() {
    var m = player && player.pandoraMarket2;
    return m && m.sellOrder ? m.sellOrder : null;
}

function sellIsOwn(order) {
    if (!order) return false;
    var slot = sellCurSlot();
    if (!order.bySlot && order.bySlot !== 0) return true;
    return String(order.bySlot) === slot;
}

/** UI HTML 區塊（插入黑市面板） */
function pandoraSellPanelHTML() {
    var m = player && player.pandoraMarket2;
    if (!m) return '';
    var order = m.sellOrder;
    var taxPct = Math.round(sellTaxRate() * 100);
    var html = '<div class="pandora-sell-box shrink-0" style="margin:6px 0;padding:8px;border:1px solid #854d0e;border-radius:8px;background:rgba(69,26,3,.35)">';
    html += '<div style="font-weight:bold;color:#fbbf24;margin-bottom:4px">📢 寄售（玩家上架出售）　稅率 ' + taxPct + '%</div>';

    if (order && !order.sold && !order.expired) {
        var d = DB.items[order.id];
        var own = sellIsOwn(order);
        var ref = pandoraRefPrice(order.id);
        var ratio = ref > 0 ? (order.price / ref) : 1;
        var leftMin = Math.max(0, Math.ceil((SELL_EXPIRE_TICKS - (sellNowTick() - (order.setTick || 0))) / 600));
        var leftH = Math.floor(leftMin / 60), leftM = leftMin % 60;
        var name = d ? d.n : order.id;
        html += '<div style="font-size:12px;color:#e2e8f0">正在寄售：<b class="' + (typeof getItemColor === 'function' ? getItemColor(order.inst || { id: order.id }) : '') + '">' + sellEsc(name) + '</b>';
        html += '　喊價 <b class="text-yellow-300">' + Number(order.price).toLocaleString() + '</b> 金（≈' + ratio.toFixed(2) + '× 參考 ' + ref.toLocaleString() + '）</div>';
        html += '<div style="font-size:11px;color:#a8a29e;margin:2px 0">預估 ' + sellEtaBand(ratio) + '　・剩餘有效約 ' + (leftH ? leftH + ' 時 ' : '') + leftM + ' 分';
        if (!own) html += '　・<span style="color:#fca5a5">其他角色嘅出售單（只讀）</span>';
        html += '</div>';
        if (own) {
            html += '<button class="btn" style="margin-top:4px;background:#7f1d1d;border-color:#ef4444" onclick="pandoraCancelSellOrder()">取消寄售</button>';
        }
    } else if (order && order.sold) {
        html += '<div style="font-size:12px;color:#86efac">上一單已售出。可再上架新物品。</div>';
        html += '<button class="btn" style="margin-top:4px" onclick="pandoraClearSoldSellOrder();pandoraRenderMarket(_pandoraDiv)">清楚標記並再寄售</button>';
    } else {
        html += '<div style="font-size:12px;color:#cbd5e1;margin-bottom:4px">由背包揀一件可寄售物品（裝備／魔法書／卡／萬能藥），設喊價後上架。系統會按價錢遠近決定售出快慢。</div>';
        html += '<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">';
        html += '<select id="pandora-sell-uid" style="flex:1;min-width:160px;max-width:280px;background:#0f172a;color:#e2e8f0;border:1px solid #475569;border-radius:4px;padding:4px" onchange="pandoraSellOnPick()">';
        html += '<option value="">— 選擇背包物品 —</option>';
        html += pandoraSellInvOptions();
        html += '</select>';
        html += '<span style="font-size:11px;color:#94a3b8" id="pandora-sell-ref">參考價 —</span>';
        html += '</div>';
        html += '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:6px">';
        html += '<label style="font-size:11px;color:#a8a29e">倍率 <span id="pandora-sell-ratio-lbl">1.00×</span></label>';
        html += '<input id="pandora-sell-ratio" type="range" min="70" max="250" value="100" style="flex:1;min-width:120px" oninput="pandoraSellOnRatio()">';
        html += '<input id="pandora-sell-price" type="text" inputmode="numeric" placeholder="喊價金幣" style="width:110px;background:#0f172a;color:#fde68a;border:1px solid #a16207;border-radius:4px;padding:4px" oninput="pandoraSellOnPrice()">';
        html += '<button class="btn" style="background:#a16207;border-color:#fbbf24;font-weight:bold" onclick="pandoraSetSellOrder()">上架寄售</button>';
        html += '</div>';
        html += '<div id="pandora-sell-eta" style="font-size:11px;color:#fcd34d;margin-top:4px">預估：約 20–60 分鐘（公道）</div>';
    }
    html += '</div>';
    return html;
}

function pandoraSellInvOptions() {
    if (!player || !Array.isArray(player.inv)) return '';
    var opts = [];
    player.inv.forEach(function (it) {
        if (!it || !it.uid || it.lock) return;
        if (!sellAllowed(it.id)) return;
        var d = DB.items[it.id];
        if (!d) return;
        var label = d.n;
        if (it.en) label += ' +' + it.en;
        if (it.bless === true) label += '（祝福）';
        if ((it.cnt || 1) > 1) label += ' ×' + it.cnt;
        var ref = pandoraRefPrice(it.id);
        opts.push('<option value="' + sellEsc(it.uid) + '" data-id="' + sellEsc(it.id) + '" data-ref="' + ref + '">' + sellEsc(label) + '　參考 ' + ref.toLocaleString() + '</option>');
    });
    if (!opts.length) return '<option value="" disabled>（背包無可寄售物品）</option>';
    return opts.join('');
}

function pandoraSellPickedRef() {
    var sel = document.getElementById('pandora-sell-uid');
    if (!sel || !sel.value) return 0;
    var opt = sel.options[sel.selectedIndex];
    return Math.max(0, Number(opt && opt.getAttribute('data-ref')) || 0);
}

function pandoraSellOnPick() {
    var ref = pandoraSellPickedRef();
    var refEl = document.getElementById('pandora-sell-ref');
    if (refEl) refEl.textContent = ref ? ('參考價 ' + ref.toLocaleString() + ' 金') : '參考價 —';
    var ratioEl = document.getElementById('pandora-sell-ratio');
    if (ratioEl) ratioEl.value = '100';
    pandoraSellOnRatio();
}

function pandoraSellOnRatio() {
    var ref = pandoraSellPickedRef();
    var ratioEl = document.getElementById('pandora-sell-ratio');
    var ratio = (Number(ratioEl && ratioEl.value) || 100) / 100;
    var lbl = document.getElementById('pandora-sell-ratio-lbl');
    if (lbl) lbl.textContent = ratio.toFixed(2) + '×';
    var price = ref ? Math.max(1, Math.round(ref * ratio)) : 0;
    var priceEl = document.getElementById('pandora-sell-price');
    if (priceEl && ref) priceEl.value = String(price);
    var eta = document.getElementById('pandora-sell-eta');
    if (eta) eta.textContent = '預估：' + sellEtaBand(ratio) + (ref ? '　到手約 ' + Math.floor(price * (1 - sellTaxRate())).toLocaleString() + ' 金（扣稅）' : '');
}

function pandoraSellOnPrice() {
    var ref = pandoraSellPickedRef();
    var priceEl = document.getElementById('pandora-sell-price');
    var raw = priceEl ? String(priceEl.value).replace(/[,\s，]/g, '') : '';
    var price = Number(raw);
    if (!ref || !Number.isFinite(price) || price <= 0) return;
    var ratio = price / ref;
    var ratioEl = document.getElementById('pandora-sell-ratio');
    if (ratioEl) ratioEl.value = String(Math.max(70, Math.min(250, Math.round(ratio * 100))));
    var lbl = document.getElementById('pandora-sell-ratio-lbl');
    if (lbl) lbl.textContent = ratio.toFixed(2) + '×';
    var eta = document.getElementById('pandora-sell-eta');
    if (eta) eta.textContent = '預估：' + sellEtaBand(ratio) + '　到手約 ' + Math.floor(price * (1 - sellTaxRate())).toLocaleString() + ' 金（扣稅）';
}

function pandoraSetSellOrder() {
    var m = player && player.pandoraMarket2;
    if (!m) { try { if (typeof refreshPandoraMarket === 'function') refreshPandoraMarket(true); m = player.pandoraMarket2; } catch (e) {} }
    if (!m) return;
    if (m.sellOrder && !m.sellOrder.sold && !m.sellOrder.expired) {
        _pandoraSetNotice(m, 'error', '已有寄售單，請先取消或等售出。');
        if (_pandoraDiv) pandoraRenderMarket(_pandoraDiv);
        return;
    }
    var sel = document.getElementById('pandora-sell-uid');
    var uidVal = sel && sel.value;
    if (!uidVal) {
        _pandoraSetNotice(m, 'error', '請先揀背包物品。');
        if (_pandoraDiv) pandoraRenderMarket(_pandoraDiv);
        return;
    }
    var it = player.inv.find(function (x) { return x && x.uid === uidVal; });
    if (!it) {
        _pandoraSetNotice(m, 'error', '物品唔喺背包。');
        if (_pandoraDiv) pandoraRenderMarket(_pandoraDiv);
        return;
    }
    if (!sellAllowed(it.id)) {
        _pandoraSetNotice(m, 'error', '此物品不可寄售。');
        if (_pandoraDiv) pandoraRenderMarket(_pandoraDiv);
        return;
    }
    var priceEl = document.getElementById('pandora-sell-price');
    var raw = priceEl ? String(priceEl.value).replace(/[,\s，]/g, '') : '';
    var price = Number(raw);
    if (!Number.isSafeInteger(price) || price <= 0) {
        _pandoraSetNotice(m, 'error', '請輸入正確正整數喊價。');
        if (_pandoraDiv) pandoraRenderMarket(_pandoraDiv);
        return;
    }
    var ref = pandoraRefPrice(it.id);
    var ratio = ref > 0 ? price / ref : 1;
    if (ratio < SELL_RATIO_MIN) {
        _pandoraSetNotice(m, 'error', '喊價低於參考價 70%，拒絕上架（防誤價）。');
        if (_pandoraDiv) pandoraRenderMarket(_pandoraDiv);
        return;
    }
    if (ratio > SELL_RATIO_MAX) {
        _pandoraSetNotice(m, 'error', '喊價高於參考價 2.50×，請調低。');
        if (_pandoraDiv) pandoraRenderMarket(_pandoraDiv);
        return;
    }
    // 同 buyOrder 套利拒絕
    if (m.buyOrder && m.buyOrder.id === it.id && price <= m.buyOrder.price) {
        _pandoraSetNotice(m, 'error', '同收購單交叉套利：寄售價不可 ≤ 收購喊價（同物品）。');
        if (_pandoraDiv) pandoraRenderMarket(_pandoraDiv);
        return;
    }
    var taken = sellTakeFromInv(uidVal);
    if (!taken) {
        _pandoraSetNotice(m, 'error', '扣除物品失敗（可能已鎖定）。');
        if (_pandoraDiv) pandoraRenderMarket(_pandoraDiv);
        return;
    }
    var nowT = sellNowTick();
    m.sellOrder = {
        id: it.id,
        inst: taken,
        price: price,
        setTick: nowT,
        seed: 'sell|' + nowT + '|' + sellCurSlot(),
        sold: false,
        expired: false,
        bySlot: sellCurSlot(),
        refPrice: ref
    };
    m.sellEscrow = true;
    m.sellCheckTick = nowT;
    m.sellCancelAt = 0;
    _pandoraSetNotice(m, 'info', '已寄售：' + (DB.items[it.id] ? DB.items[it.id].n : it.id) + '，喊價 ' + price.toLocaleString() + ' 金。預估 ' + sellEtaBand(ratio));
    try {
        if (typeof logSys === 'function') logSys('<span class="pandora-sell-log"><span class="text-amber-300 font-bold">📢【潘朵拉寄售】</span>上架了 <span class="' + (typeof getItemColor === 'function' ? getItemColor(taken) : '') + '">' + (typeof getItemFullName === 'function' ? getItemFullName(taken) : (DB.items[it.id] || {}).n) + '</span>（' + price.toLocaleString() + ' 金幣）。</span>');
    } catch (e) {}
    try { saveGame(); } catch (e) {}
    try { if (typeof updateUI === 'function') updateUI(); } catch (e) {}
    if (_pandoraDiv) pandoraRenderMarket(_pandoraDiv);
}

function pandoraCancelSellOrder() {
    var m = player && player.pandoraMarket2;
    if (!m || !m.sellOrder) return;
    var order = m.sellOrder;
    if (order.sold || order.expired) {
        m.sellOrder = null; m.sellEscrow = false;
        if (_pandoraDiv) pandoraRenderMarket(_pandoraDiv);
        return;
    }
    if (!sellIsOwn(order)) {
        _pandoraSetNotice(m, 'error', '呢張係其他角色嘅寄售單，請切返原角色取消。');
        if (_pandoraDiv) pandoraRenderMarket(_pandoraDiv);
        return;
    }
    var nowT = sellNowTick();
    if (m.sellCancelAt && (nowT - m.sellCancelAt) < SELL_CANCEL_CD_TICKS) {
        var left = Math.ceil((SELL_CANCEL_CD_TICKS - (nowT - m.sellCancelAt)) / 600);
        _pandoraSetNotice(m, 'error', '取消冷卻中，約 ' + left + ' 分鐘後先再取消。');
        if (_pandoraDiv) pandoraRenderMarket(_pandoraDiv);
        return;
    }
    // 首次取消：設 CD 起點；真正取消立即退物（CD 防連續刷取消再上架）
    sellReturnToInv(order.inst);
    var nm = DB.items[order.id] ? DB.items[order.id].n : order.id;
    m.sellOrder = null;
    m.sellEscrow = false;
    m.sellCancelAt = nowT;
    _pandoraSetNotice(m, 'info', '已取消寄售並退回：' + nm + '。（5 分鐘內唔好連續洗取消）');
    try { if (typeof logSys === 'function') logSys('<span class="text-amber-300">📢【潘朵拉寄售】</span>取消寄售，退回 ' + nm + '。'); } catch (e) {}
    try { saveGame(); } catch (e) {}
    try { if (typeof updateUI === 'function') updateUI(); } catch (e) {}
    if (_pandoraDiv) pandoraRenderMarket(_pandoraDiv);
}

function pandoraClearSoldSellOrder() {
    var m = player && player.pandoraMarket2;
    if (!m) return;
    if (m.sellOrder && (m.sellOrder.sold || m.sellOrder.expired)) {
        m.sellOrder = null; m.sellEscrow = false;
        try { saveGame(); } catch (e) {}
    }
}

/** 每黑市 10 分 tick 判定一次 */
function pandoraSellTick() {
    if (typeof player === 'undefined' || !player) return false;
    var m = player.pandoraMarket2;
    if (!m || !m.sellOrder) return false;
    var order = m.sellOrder;
    if (order.sold || order.expired) return false;
    var nowT = sellNowTick();
    var changed = false;

    // 過期 48h
    if ((nowT - (order.setTick || 0)) >= SELL_EXPIRE_TICKS) {
        if (sellIsOwn(order) || String(order.bySlot) === sellCurSlot()) {
            sellReturnToInv(order.inst);
        }
        // 即使而家唔係原角色，亦標記 expired；原角色再開黑市時可清
        // 若非原角色：物品暫留 escrow 直到原角色上線再退——MVP 簡化：任何角色 tick 到都退入**當前**角色會係 bug。
        // 正確：只喺 bySlot === currentSlot 時退物；否則只標 expired，等原角色載入時退。
        if (String(order.bySlot) === sellCurSlot()) {
            order.expired = true;
            m.sellEscrow = false;
            var nm = DB.items[order.id] ? DB.items[order.id].n : order.id;
            try { if (typeof logSys === 'function') logSys('<span class="text-slate-400">📢【潘朵拉寄售】</span>流標過期，退回 ' + nm + '。'); } catch (e) {}
            _pandoraSetNotice(m, 'info', '寄售流標（超過 48 小時），已退回物品。');
            m.sellOrder = null;
            changed = true;
        } else {
            order.expired = true;
            changed = true;
        }
        try { saveGame(); } catch (e) {}
        return changed;
    }

    if (m.sellCheckTick == null) m.sellCheckTick = order.setTick || nowT;
    var slotTicks = (typeof PANDORA_SLOT_TICKS === 'number') ? PANDORA_SLOT_TICKS : 6000;
    var n = 0;
    var ref = order.refPrice || pandoraRefPrice(order.id);
    var ratio = ref > 0 ? order.price / ref : 1;
    var tau = Math.max(0.05, sellTauHours(ratio));
    var p = 1 - Math.exp(-SELL_DELTA_H / tau);

    while ((nowT - m.sellCheckTick) >= slotTicks && n < 48 && !order.sold && !order.expired) {
        m.sellCheckTick += slotTicks;
        n++;
        var roll = (typeof lootRng === 'function') ? lootRng('pandoraSell') : Math.random();
        if (roll < p) {
            // 成交：打款畀 bySlot 對應角色；MVP 若係當前角色直接加金，否則寫 pending
            var tax = sellTaxRate();
            var gain = Math.floor(order.price * (1 - tax));
            if (String(order.bySlot) === sellCurSlot()) {
                player.gold = (player.gold || 0) + gain;
            } else {
                // 非當前角色：暫存待領
                order.pendingGold = gain;
            }
            order.sold = true;
            m.sellEscrow = false;
            // MVP：毁裝（inst 丟棄）
            order.inst = null;
            var nm2 = DB.items[order.id] ? DB.items[order.id].n : order.id;
            try {
                if (typeof logSys === 'function') {
                    logSys('<span class="pandora-sell-log"><span class="text-green-300 font-bold">📢【潘朵拉寄售】</span>售出 ' + nm2 + '！獲得 <span class="text-yellow-300">' + gain.toLocaleString() + '</span> 金幣（稅 ' + Math.round(tax * 100) + '%）。</span>');
                }
            } catch (e) {}
            _pandoraSetNotice(m, 'success', '寄售售出！+' + gain.toLocaleString() + ' 金。');
            changed = true;
            break;
        }
    }
    if (changed) {
        try { saveGame(); } catch (e) {}
        try { if (typeof updateUI === 'function') updateUI(); } catch (e) {}
        if (_pandoraDiv && document.body.contains(_pandoraDiv) && _pandoraDiv.querySelector('#pandora-msg')) {
            try { pandoraRenderMarket(_pandoraDiv); } catch (e) {}
        }
    }
    return changed;
}

/** 載入角色時：若有expired／pendingGold 處理 */
function pandoraSellOnLoad() {
    var m = player && player.pandoraMarket2;
    if (!m || !m.sellOrder) return;
    var order = m.sellOrder;
    if (order.pendingGold && String(order.bySlot) === sellCurSlot()) {
        var pg = Math.floor(order.pendingGold);
        player.gold = (player.gold || 0) + pg;
        order.pendingGold = 0;
        try { if (typeof logSys === 'function') logSys('<span class="text-green-300">📢【潘朵拉寄售】</span>領取跨角色售出金 ' + pg.toLocaleString() + '（已入帳）。'); } catch (e) {}
        if (order.sold) { m.sellOrder = null; m.sellEscrow = false; }
    }
    if (order.expired && String(order.bySlot) === sellCurSlot() && order.inst) {
        sellReturnToInv(order.inst);
        order.inst = null;
        m.sellOrder = null;
        m.sellEscrow = false;
        try { if (typeof logSys === 'function') logSys('<span class="text-slate-400">📢【潘朵拉寄售】</span>流標物品已退回背包。</span>'); } catch (e) {}
    }
}

window.pandoraRefPrice = pandoraRefPrice;
window.pandoraSellPanelHTML = pandoraSellPanelHTML;
window.pandoraSellTick = pandoraSellTick;
window.pandoraSellOnPick = pandoraSellOnPick;
window.pandoraSellOnRatio = pandoraSellOnRatio;
window.pandoraSellOnPrice = pandoraSellOnPrice;
window.pandoraSetSellOrder = pandoraSetSellOrder;
window.pandoraCancelSellOrder = pandoraCancelSellOrder;
window.pandoraClearSoldSellOrder = pandoraClearSoldSellOrder;
window.pandoraSellOnLoad = pandoraSellOnLoad;
window.pandoraSellEtaBand = sellEtaBand;

// 延遲綁：等 player 載入
setTimeout(function () { try { pandoraSellOnLoad(); } catch (e) {} }, 2000);
})();
