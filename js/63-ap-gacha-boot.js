// ===== 🪪 v3.8.130 Account-Party boot：取消創角等級加速（喺 afk-start30 之後載入）=====
(function () {
'use strict';
function apOn() {
    return !!(window.ACCOUNT_PARTY && ACCOUNT_PARTY.enabled);
}
function forceGachaStartLevel() {
    if (!apOn() || typeof player === 'undefined' || !player || !player.cls) return;
    // 只處理「剛被創角加速抬上去、仍係 0 經驗」嘅新角；已練級角色唔郁
    if ((player.exp || 0) !== 0) return;
    if (player._apPlayerLeveled) return;
    if ((player.lv || 1) <= 1) return;
    player.lv = 1;
    player.exp = 0;
    player.bonus = 0;
    try { if (typeof calcStats === 'function') calcStats(); } catch (e) {}
    try { player.hp = player.mhp; player.mp = player.mmp; } catch (e2) {}
    try {
        if (typeof logSys === 'function') {
            logSys('<span class="text-amber-300">抽卡版：創角等級加速已取消，主角由 Lv1 起步（起手 ' + (typeof HERO_STARTER_TICKETS !== 'undefined' ? HERO_STARTER_TICKETS : 50) + ' 張英雄招募券）。</span>');
        }
    } catch (e3) {}
}
function wrapStart() {
    if (typeof window.startGame !== 'function') return false;
    if (window.startGame._apGachaBoot) return true;
    var orig = window.startGame;
    var wrapped = function () {
        var r = orig.apply(this, arguments);
        try { forceGachaStartLevel(); } catch (e) {}
        try {
            if (apOn() && player && typeof AP !== 'undefined' && AP.ensure) {
                AP.ensure(player);
                if (AP.grantStarterTickets) AP.grantStarterTickets(player);
            }
        } catch (e2) {}
        try { if (typeof saveGame === 'function') saveGame(); } catch (e3) {}
        return r;
    };
    wrapped._apGachaBoot = true;
    if (orig._afkStart30) wrapped._afkStart30 = true;
    window.startGame = wrapped;
    try { startGame = wrapped; } catch (e) {}
    return true;
}
if (!wrapStart()) {
    var n = 0, t = setInterval(function () {
        n++;
        if (wrapStart() || n > 80) clearInterval(t);
    }, 50);
}
try { console.info('[account-party] gacha-boot: creation level cancelled · starter tickets'); } catch (e2) {}
})();
