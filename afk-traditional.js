/**
 * afk-traditional.js — 傳統模式(偽)／自動衝裝
 *
 * 玩家視角：某個角色開了這功能後，「打到的 / 製作的 / 潘朵拉來的 / 開箱的 / 任務的 / 商店買的」裝備
 * 會自帶隨機強化值 +4~+9（含）。手動強化照常可用。每個角色各自開關、隨時可改、只影響之後拿到的。
 *
 * 實作：
 *   - 核心 gainItem 呼叫 window.__afkTradRollEn 決定 _tEn（簽章疊加之前）。
 *   - 本外掛：對「該角色有開 + 可強化裝備(武/防/飾·非箭矢·非遺物)」回傳 4~9 均勻隨機（夾 capEn），
 *     含商店購買（forceNormal 不再擋強化）。其餘一律 0。
 *   - 每角色開關存 localStorage afk_trad_<slot>。
 *
 * 開關：afk-toggles 的 'traditional' ＋ 每存檔位 checkbox。
 */
(function () {
    'use strict';
    if (window.AFK_TOGGLES && !AFK_TOGGLES.enabled('traditional')) return;

    // ── 傳統模式強化：一律隨機 +4~+9（含兩端），再夾到該裝備強化上限 ──────────
    function rnd() { return (typeof lootRng === 'function') ? lootRng('afktraden') : Math.random(); }
    function rollEnhance(d) {
        if (!d) return 0;
        var lvl = 4 + Math.floor(rnd() * 6);   // 4,5,6,7,8,9
        return (typeof capEn === 'function') ? capEn(lvl, d) : Math.min(lvl, 15);
    }

    function slotOf() { return (typeof currentSlot !== 'undefined' && currentSlot != null) ? currentSlot : null; }
    function key(slot) { return 'afk_trad_' + slot; }
    var _onCache = {};
    function isOn(slot) {
        if (slot == null) slot = slotOf();
        if (slot == null) return false;
        if (slot in _onCache) return _onCache[slot];
        try { return (_onCache[slot] = localStorage.getItem(key(slot)) === '1'); } catch (e) { return false; }
    }
    function setOn(slot, on) { try { localStorage.setItem(key(slot), on ? '1' : '0'); } catch (e) {} _onCache[slot] = !!on; }

    // ── 核心鉤子：gainItem 的 _tEn 由這裡決定（含商店 forceNormal）────────────
    window.__afkTradRollEn = function (d, forceNormal, noAffix) {
        if (!isOn()) return 0;
        if (!d) return 0;
        var isEquip = (d.type === 'wpn' && !d.isArrow) || d.type === 'arm' || d.type === 'acc';
        if (!isEquip) return 0;
        if (d.noEnhance) return 0;
        if (typeof isRelic === 'function' && isRelic(d)) return 0;
        return rollEnhance(d);
    };

    window.AFK_TRAD = { isOn: isOn, setOn: setOn, roll: rollEnhance };

    function decorateCards() {
        var grid = document.getElementById('load-slot-grid');
        if (!grid) return;
        var cards = grid.querySelectorAll('.load-slot-card.filled');
        for (var i = 0; i < cards.length; i++) {
            (function (card) {
                var old = card.querySelector('.afk-trad-cb'); if (old) old.remove();
                var slot = parseInt(card.getAttribute('data-slot'), 10);
                if (!slot) return;
                try { if (getComputedStyle(card).position === 'static') card.style.position = 'relative'; } catch (e) {}
                var lab = document.createElement('span');
                lab.className = 'afk-trad-cb';
                lab.title = '傳統模式(偽)：開啟後，取得的裝備（掉落／製作／開箱／任務／商店）自帶隨機強化 +4~+9。隨時可改，只影響之後拿到的裝備。';
                lab.style.cssText = 'position:absolute;top:9%;right:10%;z-index:4;display:flex;align-items:center;gap:3px;padding:2px 5px;border-radius:7px;background:rgba(2,6,23,.78);font-size:.62rem;font-weight:700;color:#e2e8f0;cursor:pointer;text-shadow:0 1px 2px #000;';
                var cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.checked = isOn(slot);
                cb.style.cssText = 'width:13px;height:13px;flex:none;accent-color:#a78bfa;cursor:pointer;margin:0;';
                var txt = document.createElement('span');
                txt.textContent = '傳統';
                lab.appendChild(cb); lab.appendChild(txt);
                lab.addEventListener('click', function (e) {
                    e.stopPropagation();
                    if (e.target !== cb) { cb.checked = !cb.checked; }
                    setOn(slot, cb.checked);
                });
                lab.addEventListener('dblclick', function (e) { e.stopPropagation(); });
                card.appendChild(lab);
            })(cards[i]);
        }
    }
    function wrapRenderLoad() {
        if (typeof window.renderLoadSelect !== 'function' || window.renderLoadSelect.__afkTrad) return false;
        var orig = window.renderLoadSelect;
        var wrapped = function () { orig.apply(this, arguments); try { decorateCards(); } catch (e) {} };
        wrapped.__afkTrad = true;
        window.renderLoadSelect = wrapped;
        return true;
    }
    var okUi = wrapRenderLoad();
    try { console.log('[AFK-traditional] hooks OK — 傳統 +4~+9（含商店）；鉤子 __afkTradRollEn；選角卡 ' + (okUi ? '✓' : '✗')); } catch (e) {}
})();
