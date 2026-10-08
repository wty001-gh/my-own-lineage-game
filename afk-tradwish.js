/**
 * afk-tradwish.js — 巨靈願望顯示／強化倍率（STR／INT／DEX · 1 條）
 *
 * 2026-09-13：掉落／獲得不再自動掛願望；改由席琳神殿「克洛托」用席琳結晶抽取。
 * 本檔只保留：已有 gw 的裝備名前綴、說明倍率、超安倍率補差、清娃娃誤掛。
 *
 * 願望池仍為 ['str1','dex1','int1']（抽取邏輯在 js/35-sherine-enchant.js）。
 * 強化倍率：超安 ≥3×2／≥6×3／≥9×4；六維由原版 +1，本檔補 (mult-1)。
 * 名前綴：力量的(紅)／智慧的(藍)／敏捷的(綠)。
 *
 * 開關：afk-toggles 的 'tradwish'（預設開＝顯示／倍率；關掉則前綴與倍率補差停用）。
 */
(function () {
    'use strict';
    if (window.AFK_TOGGLES && !AFK_TOGGLES.enabled('tradwish')) return;

    var WISH_POOL = ['str1', 'dex1', 'int1'];
    var WISH_COUNT = 1;

    var WISH_BASE = {
        str1: { k: 'str', v: 1 },
        dex1: { k: 'dex', v: 1 },
        int1: { k: 'int', v: 1 }
    };

    window.__TRAD_WISH = {
        pool: WISH_POOL.slice(),
        count: WISH_COUNT,
        base: WISH_BASE,
        applied: 0,
        last: null,
        force: true
    };

    // 補標籤（原版已有 str1/dex1/int1；這裡保險再寫一次）
    var _wishLabels = {
        str1: '力量 +1',
        dex1: '敏捷 +1',
        int1: '智力 +1'
    };
    if (typeof GENIE_WISH_LABEL === 'object' && GENIE_WISH_LABEL) {
        for (var _lk in _wishLabels) GENIE_WISH_LABEL[_lk] = _wishLabels[_lk];
    } else {
        try { window.GENIE_WISH_LABEL = _wishLabels; } catch (e) {}
    }

    function _rng() {
        if (typeof lootRng === 'function') {
            try { return lootRng('tradwish'); } catch (e) {}
        }
        return Math.random();
    }

    function rollWishes() {
        var out = [];
        var pool = WISH_POOL.slice();
        var n = Math.min(WISH_COUNT, pool.length);
        for (var i = 0; i < n; i++) {
            var ri = Math.floor(_rng() * pool.length);
            out.push(pool.splice(ri, 1)[0]);
        }
        // 若池不夠（理論上不會），允許重複補滿
        while (out.length < WISH_COUNT) {
            out.push(WISH_POOL[Math.floor(_rng() * WISH_POOL.length)]);
        }
        return out;
    }

    function isDollDef(d, item) {
        if (item && item.id && String(item.id).indexOf('doll_') === 0) return true;
        if (!d) return false;
        if (d.doll) return true;
        if (d.slot === 'doll') return true;
        if (d.type === 'misc' && (d.eff === 'doll_bag' || d.eff === 'doll_box_high')) return true;
        return false;
    }

    function isEquipDef(d, item) {
        if (!d) return false;
        if (d.isArrow) return false;
        if (d.wishRing) return false;
        if (isDollDef(d, item)) return false;   // 魔法娃娃唔掛巨靈願望（本身有效果）
        return d.type === 'wpn' || d.type === 'arm' || d.type === 'acc';
    }

    /** 清走已誤掛喺娃娃上嘅願望／強化顯示 */
    function stripDollWishes() {
        function scrub(it) {
            if (!it) return false;
            var d = (typeof DB !== 'undefined' && DB.items) ? DB.items[it.id] : null;
            if (!isDollDef(d, it)) return false;
            var changed = false;
            if (it.gw) { delete it.gw; changed = true; }
            if (it.en) { it.en = 0; changed = true; }
            return changed;
        }
        var n = 0;
        if (typeof player === 'undefined' || !player) return 0;
        if (player.inv) {
            for (var i = 0; i < player.inv.length; i++) if (scrub(player.inv[i])) n++;
        }
        if (player.eq) {
            for (var s in player.eq) if (scrub(player.eq[s])) n++;
        }
        return n;
    }

    function rollEn0to6() {
        return Math.floor(_rng() * 7);
    }

    function wishMult(item, d) {
        var en = Math.max(0, Number(item && item.en) || 0);
        var safe = Math.max(0, Number(d && d.safe) || 0);
        var over = en - safe;
        if (over >= 9) return 4;
        if (over >= 6) return 3;
        if (over >= 3) return 2;
        return 1;
    }

    function attachWish(item) {
        if (!item) return item;
        if (item.id === 'relic_genie_wishes') return item;
        var d = (typeof DB !== 'undefined' && DB.items) ? DB.items[item.id] : null;
        if (!isEquipDef(d, item)) return item;
        if (!item.gw || !item.gw.length) {
            item.gw = rollWishes();
        }
        if (!item.en) item.en = rollEn0to6();
        window.__TRAD_WISH.applied++;
        window.__TRAD_WISH.last = { id: item.id, gw: item.gw.slice(), en: item.en };
        if (window.__TRAD_WISH.applied <= 10 && typeof logSys === 'function') {
            try {
                var nm = d.n || item.id;
                logSys('<span class="text-amber-300">✦ 巨靈願望：' + nm + ' +' + item.en + ' → ' + item.gw.join(', ') + '</span>');
            } catch (e) {}
        }
        return item;
    }

    function snapshotUids() {
        var set = {};
        if (typeof player !== 'undefined' && player && player.inv) {
            for (var i = 0; i < player.inv.length; i++) {
                if (player.inv[i] && player.inv[i].uid) set[player.inv[i].uid] = true;
            }
        }
        if (typeof player !== 'undefined' && player && player.eq) {
            for (var s in player.eq) {
                var e = player.eq[s];
                if (e && e.uid) set[e.uid] = true;
            }
        }
        return set;
    }

    function attachWishToNewItems(beforeUidSet) {
        if (typeof player === 'undefined' || !player || !player.inv) return;
        for (var i = 0; i < player.inv.length; i++) {
            var it = player.inv[i];
            if (!it || !it.uid) continue;
            if (beforeUidSet && beforeUidSet[it.uid]) continue;
            attachWish(it);
        }
        if (player.eq) {
            for (var slot in player.eq) {
                var e = player.eq[slot];
                if (e && e.uid && !(beforeUidSet && beforeUidSet[e.uid])) attachWish(e);
            }
        }
    }

    function pluginOn() {
        return !window.AFK_TOGGLES || AFK_TOGGLES.enabled('tradwish');
    }

    // ===== 掉落掛願望已停用（改由克洛托抽取）=====

    // ===== 倍率補差（原版已套 ×1，這裡補 mult-1）=====
    function applyWishScaleBonus(p) {
        if (!p || !p.eq || !p.d) return;
        var d = p.d;
        for (var slot in p.eq) {
            var e = p.eq[slot];
            if (!e || !e.gw || !e.gw.length) continue;
            var def = DB.items[e.id];
            var mult = wishMult(e, def);
            if (mult <= 1) continue;
            for (var i = 0; i < e.gw.length; i++) {
                var w = e.gw[i];
                var base = WISH_BASE[w];
                if (!base) continue;
                d[base.k] = (d[base.k] || 0) + base.v * (mult - 1);
            }
        }
    }

    if (typeof recomputeStats === 'function') {
        var _reCore = recomputeStats;
        recomputeStats = function () {
            _reCore.apply(this, arguments);
            if (!pluginOn()) return;
            try { if (typeof player !== 'undefined') applyWishScaleBonus(player); } catch (e) {}
            try {
                if (typeof allies !== 'undefined' && Array.isArray(allies)) {
                    for (var ai = 0; ai < allies.length; ai++) applyWishScaleBonus(allies[ai]);
                }
            } catch (e2) {}
        };
        try { window.recomputeStats = recomputeStats; } catch (e) {}
    }

    // ===== 說明文字：依倍率重寫願望數值 =====
    if (typeof buildItemDescHTML === 'function') {
        var _descCore = buildItemDescHTML._tradWishOrig || buildItemDescHTML;
        buildItemDescHTML._tradWishOrig = _descCore;
        buildItemDescHTML = function (item) {
            var html = _descCore.call(this, item);
            if (!pluginOn()) return html;
            try {
                if (!item || !item.gw || !item.gw.length) return html;
                // 巨靈戒指維持原版描述
                if (item.id === 'relic_genie_wishes') return html;
                var def = DB.items[item.id];
                var mult = wishMult(item, def);

                function labelFor(w) {
                    var base = WISH_BASE[w];
                    var labels = (typeof GENIE_WISH_LABEL !== 'undefined' && GENIE_WISH_LABEL) ? GENIE_WISH_LABEL : {};
                    if (!base) return labels[w] || w;
                    var final = base.v * mult;
                    if (w === 'str1') return '力量 +' + final;
                    if (w === 'dex1') return '敏捷 +' + final;
                    if (w === 'int1') return '智力 +' + final;
                    return labels[w] || w;
                }

                var title = '✦ 許下的願望';
                if (mult > 1) title += '（強化倍率×' + mult + '）';
                title += '：';
                var lines = item.gw.map(function (w) {
                    return '<span class="text-amber-200">・' + labelFor(w) + '</span>';
                }).join('<br>');
                var block = '<br><span class="text-amber-300 font-bold">' + title + '</span><br>' + lines;

                var cut = html.search(/<br><span class="text-amber-300[^"]*"[^>]*>✦\s*許下的三個願望/);
                if (cut < 0) cut = html.search(/✦\s*許下的三個願望/);
                if (cut < 0) cut = html.search(/✦\s*許下的願望/);
                if (cut < 0) cut = html.search(/巨靈願望/);
                if (cut >= 0) {
                    var rest = html.slice(cut);
                    var stop = rest.search(/<br><span class="(?!text-amber)/);
                    if (stop < 0) stop = rest.search(/<br>防禦/);
                    if (stop < 0) stop = rest.length;
                    html = html.slice(0, cut) + block + rest.slice(stop);
                } else {
                    html += block;
                }
            } catch (e) {
                console.error('[AFK-tradwish] desc', e);
            }
            return html;
        };
        try { window.buildItemDescHTML = buildItemDescHTML; } catch (e) {}
    }

    // ===== 裝備名詞綴：力量的(紅)／智慧的(藍)／敏捷的(綠) —— 顯示喺裝備名前方 =====
    var WISH_NAME_PREFIX = {
        str1: { n: '力量的', color: '#ff4444' },   // STR 紅
        int1: { n: '智慧的', color: '#4488ff' },   // INT 藍（天堂智慧／智力傳統藍）
        dex1: { n: '敏捷的', color: '#44cc44' }    // DEX 綠
    };
    function wishNamePrefixesHTML(item) {
        if (!item || !item.gw || !item.gw.length) return '';
        if (item.id === 'relic_genie_wishes') return '';   // 巨靈三願望戒指本身唔加詞綴
        var _pd = (typeof DB !== 'undefined' && DB.items) ? DB.items[item.id] : null;
        if (isDollDef(_pd, item)) return '';
        try {
            var d = (typeof DB !== 'undefined' && DB.items) ? DB.items[item.id] : null;
            if (d && d.wishRing) return '';
        } catch (e) {}
        var out = '';
        for (var i = 0; i < item.gw.length; i++) {
            var meta = WISH_NAME_PREFIX[item.gw[i]];
            if (meta) out += '<span style="color:' + meta.color + ';font-weight:bold;">' + meta.n + ' </span>';
        }
        return out;
    }
    if (typeof getItemFullName === 'function') {
        var _nameCore = getItemFullName._tradWishOrig || getItemFullName;
        getItemFullName._tradWishOrig = _nameCore;
        getItemFullName = function (item) {
            var html = _nameCore.call(this, item);
            if (!pluginOn()) return html;
            try {
                var pref = wishNamePrefixesHTML(item);
                if (!pref) return html;
                // 插喺最後一個名稱 <span class="..."> 之前（屬性／遠古／祝福詞綴之後、+N 名之前）
                var idx = html.lastIndexOf('<span class="');
                if (idx >= 0) return html.slice(0, idx) + pref + html.slice(idx);
                return pref + html;
            } catch (e) {
                console.error('[AFK-tradwish] name', e);
                return html;
            }
        };
        try { window.getItemFullName = getItemFullName; } catch (e) {}
    }

        window.__TRAD_WISH.fixAll = function () {
        var stripped = stripDollWishes();
        console.log('[AFK-tradwish] 掉落掛願望已停用；只清娃娃誤掛', stripped, '件');
        return stripped;
    };

    // 載入時清走已誤掛喺魔法娃娃嘅願望
    try {
        var _sd = stripDollWishes();
        if (_sd > 0) {
            console.log('[AFK-tradwish] 已清娃娃誤掛願望', _sd, '件');
            try { if (typeof calcStats === 'function') calcStats(); } catch (e0) {}
            try { if (typeof saveGame === 'function') saveGame(); } catch (e1) {}
        }
    } catch (eStrip) { console.error('[AFK-tradwish] strip dolls', eStrip); }

    console.log('[AFK-tradwish] 已載入：巨靈願望顯示／倍率（掉落已停，抽取改克洛托）＋名前綴（力量的／智慧的／敏捷的）');
})();
