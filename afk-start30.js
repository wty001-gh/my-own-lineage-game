/**
 * afk-start30.js — 創角加速（52 級／100 萬金幣／學齊可學技能／變形控制戒指）
 *
 * 開啟後：新建角色一進遊戲即 Lv52、金幣 1,000,000，
 *   自動學會「該職業可學且需求 ≤52」的全部技能，
 *   並獲得 1 個變形控制戒指（背包即可生效）。
 * 關閉後：創角流程完全原版（Lv1／1000 金／空手技能）。
 *
 * 實作：包住 startGame，原流程跑完後再套用加速。
 * 開關：afk-toggles 的 'start30'（預設開；id 沿用舊存檔相容）。
 *
 * v3.8.103：核心改為「新角色＝其他現有角色平均等級出生」（js/13 getNewCharStartInfo）。
 *   - 已有其他角色 → 等級一律以核心平均等級為準（本外掛不再改等級），學技能門檻改為該等級。
 *   - 沒有其他角色（帳號第一隻）→ 照舊 Lv52，但改走核心 grantStartLevels（Lv50 起每級 +1 可配點，與自然升級一致；
 *     舊版直接改 lv 會少給 3 點、且會把核心給的等級／點數蓋成不一致）。
 *   - 金幣 100 萬與變形控制戒指不變；創角提示行（newCharStartHintInfo）同步顯示 Lv52。
 */
(function () {
    'use strict';

    var START_LV = 52;
    var START_GOLD = 1000000;
    var POLY_RING_ID = 'acc_117';   // 變形控制戒指

    function on() {
        return !window.AFK_TOGGLES || AFK_TOGGLES.enabled('start30');
    }

    function otherCharCount() {
        try {
            if (typeof getNewCharStartInfo === 'function') return getNewCharStartInfo(typeof currentSlot !== 'undefined' ? currentSlot : 0).count || 0;
        } catch (e) {}
        return 0;
    }

    function learnSkillsToStartLv(capLv) {
        if (typeof DB === 'undefined' || !DB.skills || typeof skillReqLv !== 'function') return 0;
        if (!player || !player.cls) return 0;
        if (!Array.isArray(player.skills)) player.skills = [];
        var n = 0;
        for (var sid in DB.skills) {
            if (!Object.prototype.hasOwnProperty.call(DB.skills, sid)) continue;
            var sk = DB.skills[sid];
            if (!sk || sk.procOnly) continue;
            var need = skillReqLv(sk, sid);
            if (need === undefined || need === null) continue;
            if (need > capLv) continue;
            if (player.skills.indexOf(sid) >= 0) continue;
            player.skills.push(sid);
            n++;
        }
        return n;
    }

    function givePolyRing() {
        if (typeof DB === 'undefined' || !DB.items || !DB.items[POLY_RING_ID]) return false;
        // 已有就唔再加
        if (player.inv && player.inv.some(function (it) { return it && it.id === POLY_RING_ID; })) return false;
        if (player.eq) {
            for (var s in player.eq) {
                if (player.eq[s] && player.eq[s].id === POLY_RING_ID) return false;
            }
        }
        try {
            if (typeof gainItem === 'function') {
                gainItem(POLY_RING_ID, 1, true);
                return true;
            }
        } catch (e) {}
        return false;
    }

    function applyBoost() {
        if (!on() || !player || !player.cls) return;
        if (otherCharCount() === 0) {
            // 帳號第一隻角色：Lv1 → Lv52（走核心升級曲線，bonus 一致）
            if (typeof grantStartLevels === 'function') grantStartLevels(START_LV);
            else { player.lv = START_LV; player.exp = 0; player.bonus = Math.max(0, START_LV - 49); }
        }
        // 已有其他角色：保留核心的平均等級（不覆寫）
        var lvNow = Math.max(1, Math.floor(Number(player.lv) || 1));
        player.gold = START_GOLD;
        var learned = learnSkillsToStartLv(lvNow);
        var gotRing = givePolyRing();
        try { if (typeof calcStats === 'function') calcStats(); } catch (e) {}
        try { player.hp = player.mhp; player.mp = player.mmp; } catch (e2) {}
        try { if (typeof renderSkillSelects === 'function') renderSkillSelects(); } catch (e3) {}
        try { if (typeof updateUI === 'function') updateUI(); } catch (e4) {}
        try { if (typeof saveGame === 'function') saveGame(); } catch (e5) {}
        try {
            if (typeof logSys === 'function') {
                logSys('<span class="text-amber-300">✦ 創角加速：Lv' + lvNow + '・金幣 1,000,000・已學技能 ' + learned + ' 個' +
                    (gotRing ? '・變形控制戒指' : '') + '</span>');
            }
        } catch (e6) {}
        console.log('[AFK-start30] Lv' + lvNow + ' / 1M gold / skills +' + learned + ' / ring=' + gotRing);
    }

    function wrap() {
        if (typeof window.startGame !== 'function') return false;
        if (window.startGame._afkStart30) return true;
        var orig = window.startGame;
        var wrapped = function () {
            orig.apply(this, arguments);
            try { applyBoost(); } catch (err) { console.error('[AFK-start30]', err); }
        };
        wrapped._afkStart30 = true;
        window.startGame = wrapped;
        try { startGame = wrapped; } catch (e) {}
        return true;
    }

    if (window.AFK_TOGGLES && typeof AFK_TOGGLES.register === 'function') {
        try {
            AFK_TOGGLES.register({
                id: 'start30',
                name: '創角加速(Lv52)',
                desc: '新建角色金幣 100 萬，學齊該職業可學技能並獲得變形控制戒指；帳號第一隻角色直接 Lv52（已有角色時依平均等級出生）',
                group: '遊戲玩法',
                def: true
            });
        } catch (e) {}
    }

    // 創角提示行：帳號第一隻角色時顯示 Lv52（已有其他角色時沿用核心平均等級提示）
    function wrapHint() {
        if (typeof window.newCharStartHintInfo !== 'function') return false;
        if (window.newCharStartHintInfo._afkStart30) return true;
        var origHint = window.newCharStartHintInfo;
        var w = function () {
            var info = origHint.apply(this, arguments);
            try {
                if (on() && info && !info.count) return { lv: START_LV, count: 0, levels: [], note: '創角加速：新角色將以 <b>Lv.' + START_LV + '</b> 出生' };
            } catch (e) {}
            return info;
        };
        w._afkStart30 = true;
        window.newCharStartHintInfo = w;
        try { newCharStartHintInfo = w; } catch (e) {}
        return true;
    }

    if (!wrapHint()) {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wrapHint);
        else setTimeout(wrapHint, 0);
    }

    if (!wrap()) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', wrap);
        } else {
            setTimeout(wrap, 0);
        }
    }
})();
