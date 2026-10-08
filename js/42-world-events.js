// ===== 🌐 v3.8.98 每週世界事件（cache trial.20261006b）=====
// 🩹 v3.8.102 故事／限定頭目真正會出現（指定地圖擊殺 10／20 隻→下一隻出怪換成頭目·js/45 spawnMob 包裝呼叫 weOnMobSpawn）；任務指示補上地點；商店顯示持有徽章。
// 以 ISO 週（週一 05:00 台北）種子決定論抽 2 件事件；可選 world-event.json 覆寫。
(function () {
'use strict';

function weWeekKey(ms) {
    return (typeof trialWeekKey === 'function') ? trialWeekKey(ms) : '1970-W01';
}
function _weSeeded(tag) {
    let s = weWeekKey() + '|' + tag;
    if (typeof _seededFloat === 'function') return _seededFloat(s);
    let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return (h % 10000) / 10000;
}
function _wePick(arr, tag) {
    if (!arr || !arr.length) return null;
    return arr[Math.floor(_weSeeded(tag) * arr.length) % arr.length];
}

// ---- Templates (4+ each category) ----
const WE_MAP_BOOST = [
    { id: 'mb_dragon', map: 'dragon_valley', label: '龍之谷雙倍', exp: 2, drop: 2 },
    { id: 'mb_pride', map: 'pride_f2', label: '傲慢之塔入口雙倍', exp: 2, drop: 2 },
    { id: 'mb_rastabad', map: 'rastabad_cave3', label: '拉斯塔巴德深處雙倍', exp: 2, drop: 2 },
    { id: 'mb_nazarick', map: 'nazarick_f10', label: '大墳墓入口雙倍', exp: 2, drop: 1.5 },
    { id: 'mb_aden', map: 'twilight_mt', label: '黃昏山脈雙倍', exp: 2, drop: 2 }
];
// 🩹 v3.8.102 限定頭目：map＝召喚地圖（大墳墓下降第 1～4 層·皆為一般出怪的狩獵層）；在該圖擊殺 need 隻怪後，下一隻出怪由頭目取代。
//   雅兒貝德原模板 pride_earth_king（Lv60·HP2500）過弱 → 改用 naz_t_bknight（納薩·黑騎士，大墳墓第 2 層常駐怪）。
const WE_LIMITED_BOSS = [
    { id: 'lb_demiurge', name: '試煉·迪米烏吉斯影', base: 'naz_t_baphomet', hpMul: 4, dmgMul: 2.2, label: '限定頭目：迪米烏吉斯影', map: 'nazarick_f7', need: 20 },
    { id: 'lb_shalltear', name: '試煉·夏提雅狂血', base: 'naz_t_tomb', hpMul: 3.5, dmgMul: 2.0, label: '限定頭目：夏提雅狂血', map: 'nazarick_f8', need: 20 },
    { id: 'lb_albed', name: '試煉·雅兒貝德守護', base: 'naz_t_bknight', hpMul: 3.8, dmgMul: 2.1, label: '限定頭目：雅兒貝德守護', map: 'nazarick_f9', need: 20 },
    { id: 'lb_sebas', name: '試煉·賽巴斯鐵腕', base: 'naz_t_deathknight', hpMul: 3.6, dmgMul: 2.3, label: '限定頭目：賽巴斯鐵腕', map: 'nazarick_f10', need: 20 }
];
const WE_MUTATION = [
    { id: 'mu_undead', raceMajor: 'undead', hp: 1.4, resist: 20, drop: 1.5, label: '不死族異變' },
    { id: 'mu_demon', raceMajor: 'demon', hp: 1.35, resist: 15, drop: 1.6, label: '惡魔族異變' },
    { id: 'mu_dragon', raceMajor: 'dragon', hp: 1.5, resist: 25, drop: 1.4, label: '龍族異變' },
    { id: 'mu_construct', raceMajor: 'construct', hp: 1.45, resist: 30, drop: 1.5, label: '構造體異變' }
];
const WE_NPC_ORDER = [
    { id: 'ord_wood', need: { wood: 500 }, badge: 6, mat: 'scroll_guard_wpn', label: '物資訂單：木材' },
    { id: 'ord_ore', need: { ore: 200 }, badge: 6, mat: 'scroll_guard_arm', label: '物資訂單：礦石' },
    { id: 'ord_card', need: { cards: 15 }, badge: 8, mat: 'scroll_seal_stable', label: '卡片訂單：任意普卡×15' },
    { id: 'ord_soul', need: { soul: 5 }, badge: 10, mat: 'scroll_sure_plus', label: '魂晶訂單：納薩魂晶×5' }
];
const WE_RULE = [
    { id: 'ru_magic', magicPct: 15, physPct: -10, label: '規則：魔法傷害 +15%／物理 −10%' },
    { id: 'ru_phys', magicPct: -10, physPct: 15, label: '規則：物理傷害 +15%／魔法 −10%' },
    { id: 'ru_enhance', enhanceBonus: 3, label: '規則：強化成功率 +3%' },
    { id: 'ru_exp', expPct: 10, label: '規則：全域經驗 +10%' }
];
// 🩹 v3.8.102 步驟補齊地點：kill 步驟 hint＝推薦地圖（依地圖出怪池×種族統計·任何地圖的該種族都計數）；
//   collect＝任務期間任何地圖擊殺怪物 8% 掉落；killboss＝map 上擊殺 need 隻怪後，下一隻出怪由故事頭目取代。
const WE_STORY = [
    { id: 'st_pleiades', label: '故事：昴宿星團的試煉',
      steps: [
        { type: 'goto', map: 'town_nazarick', text: '前往納薩力克大墳墓入口會面女僕長' },
        { type: 'kill', raceMajor: 'undead', count: 30, text: '擊殺不死族 30', hint: ['giant_tomb', 'nazarick_f3', 'nazarick_f8'] },
        { type: 'collect', item: 'we_clue_a', count: 3, text: '收集線索「女僕的緞帶」×3' },
        { type: 'killboss', bossId: 'we_story_boss_a', map: 'nazarick_f10', need: 10, text: '擊敗故事頭目「影之女僕」' }
      ],
      reward: { badge: 20, items: [['scroll_guardx_wpn',1],['scroll_blessify',1]] }
    },
    { id: 'st_tomb', label: '故事：大墳墓深處的低語',
      steps: [
        { type: 'goto', map: 'giant_tomb', text: '調查古代巨人之墓' },
        { type: 'kill', raceMajor: 'construct', count: 40, text: '擊殺構造體 40', hint: ['zone_37', 'nazarick_f4', 'nazarick_f5'] },
        { type: 'collect', item: 'we_clue_b', count: 3, text: '收集「石板碎片」×3' },
        { type: 'killboss', bossId: 'we_story_boss_b', map: 'zone_37', need: 10, text: '擊敗「低語石像」' }
      ],
      reward: { badge: 20, items: [['scroll_guardx_arm',1],['mat_rift_lock',1]] }
    },
    { id: 'st_aden', label: '故事：亞丁的古老契約',
      steps: [
        { type: 'goto', map: 'aden_castle', text: '前往亞丁城堡' },
        { type: 'kill', raceMajor: 'humanoid', count: 35, text: '擊殺人型 35', hint: ['aden_castle', 'thebes_pyramid'] },
        { type: 'collect', item: 'we_clue_c', count: 2, text: '收集「契約殘頁」×2' },
        { type: 'killboss', bossId: 'we_story_boss_c', map: 'aden_castle', need: 10, text: '擊敗「契約守護者」' }
      ],
      reward: { badge: 18, items: [['scroll_blessify',1],['mat_soul_transfer',1]] }
    },
    { id: 'st_lineage', label: '故事：殷海薩的殘光',
      steps: [
        { type: 'goto', map: 'talking_island', text: '回到說話之島（殷海薩聖地）' },
        { type: 'kill', raceMajor: 'animal', count: 25, text: '擊殺動物 25', hint: ['pirate_wild', 'eva_kingdom', 'mirror_forest'] },
        { type: 'collect', item: 'we_clue_d', count: 3, text: '收集「殘光結晶」×3' },
        { type: 'killboss', bossId: 'we_story_boss_d', map: 'talking_island', need: 10, text: '擊敗「殘光守護靈」' }
      ],
      reward: { badge: 16, items: [['scroll_sure_plus',2],['mat_relic_reson',1]] }
    }
];
const WE_STORY_BOSS_NEED = 10;     // 故事頭目：在指定地圖擊殺 10 隻後出現
const WE_LIMITED_BOSS_NEED = 20;   // 限定頭目：在指定地圖擊殺 20 隻後出現（擊敗後歸零可再召喚）
const WE_CLUE_RATE = 0.08;         // 線索：任務期間任何地圖擊殺 8% 掉落
// 故事頭目數值（Lv93 隊伍的正式頭目戰·約等同大墳墓昴宿星團階層王；一律弱於限定頭目）
const WE_STORY_BOSS_DEF = {
    we_story_boss_a: { n: '影之女僕', bases: ['naz_t_icemaid', 'naz_t_deathknight'] },
    we_story_boss_b: { n: '低語石像', bases: ['naz_t_stonegolem', 'naz_t_deathknight'] },
    we_story_boss_c: { n: '契約守護者', bases: ['aden_c_knight', 'naz_t_bknight', 'naz_t_deathknight'] },
    we_story_boss_d: { n: '殘光守護靈', bases: ['naz_t_wisp', 'naz_t_deathknight'] }
};
const WE_STORY_BOSS_STATS = { lv: 94, hp: 105000, dmgMax: 175, db: 130, ac: -140, mr: 120, hit: 130 };

const WE_CATS = [
    { key: 'map', pool: WE_MAP_BOOST },
    { key: 'boss', pool: WE_LIMITED_BOSS },
    { key: 'mut', pool: WE_MUTATION },
    { key: 'order', pool: WE_NPC_ORDER },
    { key: 'rule', pool: WE_RULE },
    { key: 'story', pool: WE_STORY }
];

let _weOverride = null;
let _weActive = null;

function ensureWorldEventSave() {
    if (!player.worldEvent) player.worldEvent = {};
    let we = player.worldEvent;
    let wk = weWeekKey();
    if (we.key !== wk) {
        player.worldEvent = { key: wk, progress: {}, claimed: {}, badgeEarned: 0, orderDone: {}, shop: { key: wk, bought: {} } };
    }
    if (!player.worldEvent.shop || player.worldEvent.shop.key !== wk) player.worldEvent.shop = { key: wk, bought: {} };
    let w = player.worldEvent;
    if (!w.progress || typeof w.progress !== 'object') w.progress = {};
    if (!w.claimed || typeof w.claimed !== 'object') w.claimed = {};
    if (!w.orderDone || typeof w.orderDone !== 'object') w.orderDone = {};
    if (!w.bossKills || typeof w.bossKills !== 'object') w.bossKills = {};   // 🩹 v3.8.102 頭目召喚進度：{ 事件id: 在召喚地圖的擊殺數 }
}

function weBadgeCap() { return 60; } // weekly badge income cap from tasks

function weRegisterClueItems() {
    if (!DB.items) return;
    const clues = {
        we_clue_a: '女僕的緞帶', we_clue_b: '石板碎片', we_clue_c: '契約殘頁', we_clue_d: '殘光結晶'
    };
    for (let id in clues) {
        if (!DB.items[id]) DB.items[id] = { n: clues[id], type: 'etc', p: 0, c: 'text-cyan-200', gachaWeight: 0, noSell: true, noUse: true, trialExclusive: true, d: '世界事件任務線索（僅任務期間掉落）。' };
    }
}

// 🩹 v3.8.102 新名字沿用模板的戰鬥動畫（MOB_ANIM_* 以怪名為鍵）
function _weCopyAnim(newName, baseName) {
    try {
        if (!newName || !baseName) return;
        let dir = (typeof _animDir === 'function') ? _animDir(baseName) : baseName;
        if (typeof MOB_ANIM_ALIAS !== 'undefined' && !MOB_ANIM_ALIAS[newName]) MOB_ANIM_ALIAS[newName] = dir;
        if (typeof MOB_ANIM_NAMES !== 'undefined' && MOB_ANIM_NAMES.has && MOB_ANIM_NAMES.has(baseName)) MOB_ANIM_NAMES.add(newName);
        if (typeof MOB_ANIM_SPRITE_SHADOW !== 'undefined' && MOB_ANIM_SPRITE_SHADOW.has && MOB_ANIM_SPRITE_SHADOW.has(baseName)) MOB_ANIM_SPRITE_SHADOW.add(newName);
        if (typeof MOB_ANIM_BIG !== 'undefined' && MOB_ANIM_BIG.has && MOB_ANIM_BIG.has(baseName)) MOB_ANIM_BIG.add(newName);
    } catch (e) {}
}
function _weCleanBossTpl(o) {
    ['transformTo', 'siegeEnemy', 'pledgeEnemy', 'trollPlayer', 'siegeV2', 'noAutoTeleport', 'noGold'].forEach(k => { delete o[k]; });
    return o;
}
function weRegisterBossMobs() {
    if (typeof DB === 'undefined' || !DB.mobs) return;
    WE_LIMITED_BOSS.forEach(b => {
        let base = DB.mobs[b.base] || DB.mobs['naz_t_deathknight'];
        if (!base) return;
        let id = 'we_boss_' + b.id;
        if (DB.mobs[id]) return;
        let dm = b.dmgMul || 1;
        let dmg = Array.isArray(base.dmg) ? [Math.max(1, Math.round(base.dmg[0] * dm)), Math.max(2, Math.round(base.dmg[1] * dm))] : base.dmg;
        DB.mobs[id] = _weCleanBossTpl(Object.assign({}, base, {
            n: b.name, boss: true, hard: true, beh: '主動',
            lv: Math.min(100, Math.max(95, (base.lv || 80) + 5)),
            hp: Math.floor((base.hp || 50000) * (b.hpMul || 1)),
            dmg: dmg,                                                      // 🩹 v3.8.102 dmgMul 實際套用（原本未使用）
            db: Math.round((base.db || 80) * dm),
            ac: Math.min(base.ac || 0, -150), mr: Math.max(base.mr || 0, 130), hit: Math.max(base.hit || 0, 135),
            exp: Math.floor((base.exp || 10000) * 6), goldMin: (base.goldMin || 800) * 3, goldMax: (base.goldMax || 2000) * 3,
            _weLimited: true, _weEvent: true
        }));
        _weCopyAnim(b.name, base.n);
    });
    // story bosses
    Object.keys(WE_STORY_BOSS_DEF).forEach(id => {
        if (DB.mobs[id]) return;
        let def = WE_STORY_BOSS_DEF[id], S = WE_STORY_BOSS_STATS;
        let base = null;
        for (let k of def.bases) { if (DB.mobs[k]) { base = DB.mobs[k]; break; } }
        if (!base) base = Object.values(DB.mobs).find(m => m && m.lv >= 80 && !m.boss) || null;
        if (!base) return;
        let d0 = Array.isArray(base.dmg) ? base.dmg : [3, 130];
        let mul = S.dmgMax / Math.max(1, d0[1]);
        DB.mobs[id] = _weCleanBossTpl(Object.assign({}, base, {
            n: def.n, boss: true, hard: true, beh: '主動', lv: S.lv,
            hp: S.hp, dmg: [Math.max(2, Math.round(d0[0] * mul)), S.dmgMax], db: S.db,
            ac: Math.min(base.ac || 0, S.ac), mr: Math.max(base.mr || 0, S.mr), hit: Math.max(base.hit || 0, S.hit),
            exp: Math.floor(Math.max(base.exp || 0, 10000) * 4), goldMin: (base.goldMin || 800) * 2, goldMax: (base.goldMax || 2000) * 2,
            _weStory: true, _weEvent: true
        }));
        _weCopyAnim(def.n, base.n);
    });
}

function weComputeActive() {
    weRegisterClueItems();
    weRegisterBossMobs();
    if (_weOverride && Array.isArray(_weOverride.events) && _weOverride.events.length) {
        let ow = _weOverride.week;
        if (ow == null || ow === '' || ow === weWeekKey()) {
            _weActive = { week: weWeekKey(), events: _weOverride.events.slice(0, 2), fromOverride: true };
            return _weActive;
        }
    }
    // pick 2 different categories
    let cats = WE_CATS.slice();
    let c1 = _wePick(cats, 'c1');
    cats = cats.filter(c => c.key !== c1.key);
    let c2 = _wePick(cats, 'c2');
    let e1 = Object.assign({ cat: c1.key }, _wePick(c1.pool, 'e1'));
    let e2 = Object.assign({ cat: c2.key }, _wePick(c2.pool, 'e2'));
    _weActive = { week: weWeekKey(), events: [e1, e2], fromOverride: false };
    return _weActive;
}

function weGetActive() {
    ensureWorldEventSave();
    if (!_weActive || _weActive.week !== weWeekKey()) weComputeActive();
    return _weActive;
}

async function weLoadOverride() {
    try {
        let r = await fetch('world-event.json?_=' + Date.now(), { cache: 'no-store' });
        if (!r.ok) { _weOverride = null; return; }
        _weOverride = await r.json();
    } catch (e) { _weOverride = null; }
}

function weGrantBadge(n, why) {
    ensureWorldEventSave();
    let left = weBadgeCap() - (player.worldEvent.badgeEarned || 0);
    if (left <= 0) { logSys('<span class="text-slate-400">本週世界事件徽章已達上限。</span>'); return 0; }
    let give = Math.min(n, left);
    player.worldEvent.badgeEarned = (player.worldEvent.badgeEarned || 0) + give;
    if (typeof gainItem === 'function') gainItem('cur_event_badge', give, true);
    if (why) logSys(`<span class="text-cyan-300">世界事件徽章×${give}</span>（${why}）`);
    weScheduleRefresh();   // 🏅 v3.8.102 持有數即時更新
    return give;
}

// 🩹 v3.8.100 種族判定：怪物實例可能沒帶 raceMajor，或細分種族（如「納薩力克」）推成別族但其實 un:true → 一併查模板與 isUndeadMob
function weMobIsRace(mob, maj) {
    if (!mob || !maj) return false;
    let tpl = null;
    try { if (typeof DB !== 'undefined' && DB.mobs) { tpl = (mob.id && DB.mobs[mob.id]) || null; if (!tpl && mob.n) { for (let k in DB.mobs) { if (DB.mobs[k] && DB.mobs[k].n === mob.n) { tpl = DB.mobs[k]; break; } } } } } catch (e) {}
    if (maj === 'undead') {
        try { if (typeof isUndeadMob === 'function' && (isUndeadMob(mob) || (tpl && isUndeadMob(tpl)))) return true; } catch (e) {}
    }
    if (mob.raceMajor === maj) return true;
    if (tpl && tpl.raceMajor === maj) return true;
    if (!mob.raceMajor && !(tpl && tpl.raceMajor) && typeof _inferMobRaceMajor === 'function') { try { return _inferMobRaceMajor(tpl || mob) === maj; } catch (e) {} }
    return false;
}

// 🩹 v3.8.100 殺怪後面板自動更新（節流 1 秒·只在面板可見時重繪）
let _weRefreshT = null;
function weScheduleRefresh() {
    if (_weRefreshT) return;
    _weRefreshT = setTimeout(() => {
        _weRefreshT = null;
        try { let h = document.getElementById('tab-worldevent'); if (h && h.offsetParent !== null) renderWorldEventPanel(); } catch (e) {}
    }, 1000);
}

// ===== 🩹 v3.8.102 事件頭目：模板欄位補齊（world-event.json 覆寫的事件可能沒帶 map/need/hint → 回退內建模板）=====
function weStoryTpl(id) { return WE_STORY.find(x => x.id === id) || null; }
function weLimitedTpl(id) { return WE_LIMITED_BOSS.find(x => x.id === id) || null; }
function weStepField(ev, i, f) {
    let s = ev && ev.steps && ev.steps[i];
    if (s && s[f] != null) return s[f];
    let t = ev && weStoryTpl(ev.id), ts = t && t.steps[i];
    return (ts && (!s || ts.type === s.type)) ? ts[f] : undefined;
}
function weLimitedField(ev, f) {
    if (ev && ev[f] != null) return ev[f];
    let t = ev && weLimitedTpl(ev.id);
    return t ? t[f] : undefined;
}
function weBossName(id) { return (typeof DB !== 'undefined' && DB.mobs && DB.mobs[id] && DB.mobs[id].n) || id; }
/** 目前需要召喚的事件頭目清單：[{kind,key,bossId,map,need,ev}] */
function weBossTargets() {
    let out = [];
    let act; try { act = weGetActive(); } catch (e) { return out; }
    if (!act || !Array.isArray(act.events) || !player || !player.worldEvent) return out;
    act.events.forEach(ev => {
        if (!ev || !ev.id) return;
        if (ev.cat === 'story' && Array.isArray(ev.steps)) {
            let st = player.worldEvent.progress[ev.id] || { step: 0 };
            let i = st.step || 0, step = ev.steps[i];
            if (!step || step.type !== 'killboss' || !step.bossId) return;
            let map = weStepField(ev, i, 'map');
            if (!map) return;
            out.push({ kind: 'story', key: ev.id, bossId: step.bossId, map: map, need: Number(weStepField(ev, i, 'need')) || WE_STORY_BOSS_NEED, ev: ev });
        } else if (ev.cat === 'boss') {
            let map = weLimitedField(ev, 'map');
            if (!map) return;
            out.push({ kind: 'boss', key: ev.id, bossId: 'we_boss_' + ev.id, map: map, need: Number(weLimitedField(ev, 'need')) || WE_LIMITED_BOSS_NEED, ev: ev });
        }
    });
    return out;
}
function weBossKillCount(key) { try { return Number(player.worldEvent.bossKills[key]) || 0; } catch (e) { return 0; } }
function weBossAlive(bossId) {
    try { return !!(mapState && Array.isArray(mapState.mobs) && mapState.mobs.some(m => m && m._weId && (!bossId || m._weId === bossId) && !m._dead && m.curHp > 0)); } catch (e) { return false; }
}
/** spawnMob 包裝（js/45）呼叫：條件達成時把剛生成的一般怪換成事件頭目。回傳新頭目或 null。 */
function weOnMobSpawn(m, idx) {
    try {
        if (!m || m._weId || typeof mapState === 'undefined' || !mapState || !Array.isArray(mapState.mobs)) return null;
        if (mapState.mobs[idx] !== m) return null;
        if (m.boss || m.trollPlayer || m.race === '建築' || m.siegeEnemy || m.pledgeEnemy || m._siegePlayer || m._npcClanBattle || m._wcMassTauntBattle) return null;
        let cur = mapState.current;
        if (!cur || String(cur).indexOf('town_') === 0 || cur === 'trial_tower') return null;
        if (!player || !player.worldEvent) return null;
        ensureWorldEventSave();
        if (weBossAlive()) return null;   // 同時最多一隻事件頭目
        let t = weBossTargets().find(t => t.map === cur && weBossKillCount(t.key) >= t.need);   // 故事優先（events 順序）
        if (!t) return null;
        let tpl = DB.mobs[t.bossId];
        if (!tpl) { weRegisterBossMobs(); tpl = DB.mobs[t.bossId]; }
        if (!tpl) return null;
        let born;
        try { born = ++_mobBornSeq; } catch (e) { born = Date.now(); }   // _mobBornSeq＝js/01 全域 let（出生序）
        let b = { ...tpl, curHp: tpl.hp, uid: uid(), _born: born, _magCd: {}, justHit: false, st: newMobStatus(), _bornMs: Date.now(), _weId: t.bossId, _weKey: t.key };
        mapState.mobs[idx] = b;
        try { if (typeof applySherineBuff === 'function') applySherineBuff(idx); } catch (e) {}
        b = mapState.mobs[idx] || b;
        try { if (b.hard && typeof initHardSkin === 'function') initHardSkin(b); } catch (e) {}
        try { logSys(`<span class="text-fuchsia-300 font-bold">⚠ ${t.kind === 'story' ? '故事頭目' : '限定頭目'}「${b.n}」出現了！</span>`); } catch (e) {}
        try { if (typeof vfxBossEntrance === 'function') vfxBossEntrance(b); } catch (e) {}
        try { if (typeof renderMobs === 'function' && !(typeof state !== 'undefined' && state.ff)) renderMobs(); } catch (e) {}
        weScheduleRefresh();
        return b;
    } catch (e) { return null; }
}

// 🪦 納薩力克下降中：事件頭目也是 boss → 原本會被當成階層守護者而下降一層／累計大墳墓十層任務。事件頭目改為「額外遭遇」，不推進樓層。
let _weSkipNazAdv = -1;
try {
    if (typeof nazarickOnGuardianKill === 'function' && !nazarickOnGuardianKill.__we) {
        const _origNazGK = nazarickOnGuardianKill;
        const _wNazGK = function () {
            if (_weSkipNazAdv >= 0) {
                let fresh = (typeof state === 'undefined') || ((state.ticks || 0) - _weSkipNazAdv <= 3);
                _weSkipNazAdv = -1;
                if (fresh) return;
            }
            return _origNazGK.apply(this, arguments);
        };
        _wNazGK.__we = true;
        window.nazarickOnGuardianKill = _wNazGK;
    }
} catch (e) {}

function weOnKill(mob) {
    if (!mob) return;
    let act = weGetActive();
    ensureWorldEventSave();
    let mid = mob._weId || mob.id || null;   // 生成的實例沒有 id 欄位 → 以 _weId 辨識事件頭目
    // 召喚進度：在召喚地圖擊殺一般怪（事件頭目本身不計）
    if (!mob._weId) {
        let cur = (typeof mapState !== 'undefined' && mapState) ? mapState.current : '';
        let bumped = false;
        weBossTargets().forEach(t => {
            if (t.map !== cur) return;
            let k = player.worldEvent.bossKills;
            let before = Number(k[t.key]) || 0;
            if (before >= t.need) return;
            k[t.key] = before + 1;
            bumped = true;
            if (k[t.key] >= t.need) logSys(`<span class="text-fuchsia-300">「${weBossName(t.bossId)}」的氣息逼近……下一隻出現的怪物將是頭目！</span>`);
        });
        if (bumped) weScheduleRefresh();
    } else {
        try {
            if (typeof state !== 'undefined' && state.nazarickDescend && !player.dead
                && !mapState.mobs.some(x => x && x.boss && !x._dead && x.uid !== mob.uid)) _weSkipNazAdv = state.ticks || 0;
        } catch (e) {}
    }
    act.events.forEach(ev => {
        if (ev.cat === 'mut' && weMobIsRace(mob, ev.raceMajor)) {
            // drop handled via weDropMult
        }
        if (ev.cat === 'story') {
            let st = player.worldEvent.progress[ev.id] || { step: 0, kills: 0, collected: 0 };
            let step = ev.steps[st.step];
            if (!step) return;
            if (step.type === 'kill' && !mob._weId && weMobIsRace(mob, step.raceMajor)) {
                st.kills = (st.kills || 0) + 1;
                if (st.kills >= step.count) { st.step++; st.kills = 0; logSys('<span class="text-cyan-300">故事進度推進。</span>'); }
            }
            if (step.type === 'killboss' && mid && mid === step.bossId) {
                st.step++;
                player.worldEvent.bossKills[ev.id] = 0;
                logSys(`<span class="text-cyan-300 font-bold">故事頭目「${mob.n}」擊破！${st.step >= ev.steps.length ? '可到世界事件頁領取故事獎勵。' : ''}</span>`);
            }
            // clue drops
            if (step.type === 'collect' && Math.random() < WE_CLUE_RATE) {
                gainItem(step.item, 1, true);
                st.collected = (st.collected || 0) + 1;
                if (st.collected >= step.count) { st.step++; st.collected = 0; logSys('<span class="text-cyan-300">線索收集完成。</span>'); }
            }
            player.worldEvent.progress[ev.id] = st;
            weScheduleRefresh();
        }
        if (ev.cat === 'boss' && mid && mid === ('we_boss_' + ev.id)) {
            player.worldEvent.bossKills[ev.id] = 0;   // 歸零：再擊殺 20 隻可再次召喚
            weGrantBadge(15, '限定頭目');
            if (!player.worldEvent.claimed['boss_' + ev.id]) {
                player.worldEvent.claimed['boss_' + ev.id] = true;
                gainItem(Math.random() < 0.5 ? 'scroll_guardx_wpn' : 'scroll_guardx_arm', 1, true);
                gainItem('scroll_blessify', 1, true);
            }
            weScheduleRefresh();
        }
    });
}

function weOnEnterMap(mapId) {
    _weSkipNazAdv = -1;
    let act = weGetActive();
    ensureWorldEventSave();
    act.events.forEach(ev => {
        if (ev.cat !== 'story') return;
        let st = player.worldEvent.progress[ev.id] || { step: 0 };
        let step = ev.steps[st.step];
        if (step && step.type === 'goto' && step.map === mapId) {
            st.step++;
            player.worldEvent.progress[ev.id] = st;
            logSys('<span class="text-cyan-300">抵達任務地點。</span>');
            weScheduleRefresh();
        }
    });
}

function weDropMult(mob) {
    let act = weGetActive();
    let m = 1;
    act.events.forEach(ev => {
        if (ev.cat === 'map' && mapState.current === ev.map) m *= (ev.drop || 1);
        if (ev.cat === 'mut' && mob && weMobIsRace(mob, ev.raceMajor)) m *= (ev.drop || 1);
    });
    return m;
}
function weExpMult() {
    let act = weGetActive();
    let m = 1;
    act.events.forEach(ev => {
        if (ev.cat === 'map' && mapState.current === ev.map) m *= (ev.exp || 1);
        if (ev.cat === 'rule' && ev.expPct) m *= (1 + ev.expPct / 100);
    });
    return m;
}
function weDmgMult(isMagic) {
    let act = weGetActive();
    let m = 1;
    act.events.forEach(ev => {
        if (ev.cat !== 'rule') return;
        if (isMagic && ev.magicPct) m *= (1 + ev.magicPct / 100);
        if (!isMagic && ev.physPct) m *= (1 + ev.physPct / 100);
    });
    return m;
}
function weEnhanceBonusPct() {
    let act = weGetActive();
    let b = 0;
    act.events.forEach(ev => { if (ev.cat === 'rule' && ev.enhanceBonus) b += ev.enhanceBonus; });
    return b;
}
function weMutateMob(mob) {
    if (!mob) return;
    let act = weGetActive();
    act.events.forEach(ev => {
        if (ev.cat !== 'mut') return;
        if (!weMobIsRace(mob, ev.raceMajor)) return;
        mob.hp = Math.floor((mob.hp || 100) * (ev.hp || 1));
        mob.curHp = mob.hp;
        mob.mr = (mob.mr || 0) + (ev.resist || 0);
    });
}

function weDeliverOrder(evId) {
    ensureWorldEventSave();
    let act = weGetActive();
    let ev = act.events.find(e => e.id === evId);
    if (!ev || ev.cat !== 'order') return;
    if (player.worldEvent.orderDone[evId]) { logSys('已交付。'); return; }
    // check needs — simplified: cards / soul from inv; wood/ore from clanBase
    let need = ev.need || {};
    if (need.wood) {
        let w = (player.clanBase && player.clanBase.res && player.clanBase.res.wood) || 0;
        if (w < need.wood) { logSys('木材不足'); return; }
        player.clanBase.res.wood -= need.wood;
    }
    if (need.ore) {
        let o = (player.clanBase && player.clanBase.res && player.clanBase.res.ore) || 0;
        if (o < need.ore) { logSys('礦石不足'); return; }
        player.clanBase.res.ore -= need.ore;
    }
    if (need.soul) {
        let have = 0; player.inv.forEach(it => { if (it.id === 'mat_nazarick_soulcrystal') have += it.cnt || 1; });
        if (have < need.soul) { logSys('魂晶不足'); return; }
        let left = need.soul, rm = [];
        for (let it of player.inv) {
            if (left <= 0) break;
            if (it.id !== 'mat_nazarick_soulcrystal' || it.lock) continue;
            let c = it.cnt || 1; if (c <= left) { left -= c; rm.push(it.uid); } else { it.cnt = c - left; left = 0; }
        }
        player.inv = player.inv.filter(i => rm.indexOf(i.uid) === -1);
    }
    if (need.cards) {
        let left = need.cards, rm = [];
        for (let it of player.inv) {
            if (left <= 0) break;
            let d = DB.items[it.id];
            if (!d || d.eff !== 'card' || it.lock || d.cardTier !== 1) continue;
            let c = it.cnt || 1; if (c <= left) { left -= c; rm.push(it.uid); } else { it.cnt = c - left; left = 0; }
        }
        if (left > 0) { logSys('普卡不足'); return; }
        player.inv = player.inv.filter(i => rm.indexOf(i.uid) === -1);
    }
    player.worldEvent.orderDone[evId] = true;
    weGrantBadge(ev.badge || 5, ev.label);
    if (ev.mat) gainItem(ev.mat, 1, false);
    saveGame(); renderWorldEventPanel();
}

function weClaimStory(evId) {
    ensureWorldEventSave();
    let act = weGetActive();
    let ev = act.events.find(e => e.id === evId);
    if (!ev || ev.cat !== 'story') return;
    let st = player.worldEvent.progress[evId] || { step: 0 };
    if (st.step < ev.steps.length) { logSys('故事尚未完成。'); return; }
    if (player.worldEvent.claimed['story_' + evId]) { logSys('已領取。'); return; }
    player.worldEvent.claimed['story_' + evId] = true;
    weGrantBadge(ev.reward.badge || 15, ev.label);
    (ev.reward.items || []).forEach(pair => gainItem(pair[0], pair[1], false));
    saveGame(); renderWorldEventPanel();
}

const WE_SHOP = [
    { id: 'scroll_guard_wpn', cost: 10, weekly: 2 },
    { id: 'scroll_guard_arm', cost: 10, weekly: 2 },
    { id: 'scroll_seal_stable', cost: 14, weekly: 2 },
    { id: 'scroll_sure_plus', cost: 16, weekly: 1 },
    { id: 'mat_soul_transfer', cost: 22, weekly: 1 },
    { id: 'mat_relic_reson', cost: 20, weekly: 1 },
    { id: 'scroll_blessify', cost: 35, weekly: 1 }
];

function weShopBuy(id) {
    ensureWorldEventSave();
    let row = WE_SHOP.find(x => x.id === id); if (!row) return;
    let bought = player.worldEvent.shop.bought[id] || 0;
    if (bought >= row.weekly) { logSys('本週上限'); return; }
    let have = 0; player.inv.forEach(it => { if (it.id === 'cur_event_badge') have += it.cnt || 1; });
    if (have < row.cost) { logSys('世界事件徽章不足'); renderWorldEventPanel(); return; }
    let need = row.cost, rm = [];
    for (let it of player.inv) {
        if (need <= 0) break;
        if (it.id !== 'cur_event_badge' || it.lock) continue;
        let c = it.cnt || 1; if (c <= need) { need -= c; rm.push(it.uid); } else { it.cnt = c - need; need = 0; }
    }
    player.inv = player.inv.filter(i => rm.indexOf(i.uid) === -1);
    player.worldEvent.shop.bought[id] = bought + 1;
    gainItem(id, 1, false);
    saveGame(); renderWorldEventPanel();
}

function weEnsureStyles() {
    if (document.getElementById('we-style')) return;
    let s = document.createElement('style');
    s.id = 'we-style';
    s.textContent = `.we-panel{padding:10px;color:#e2e8f0;font-size:13px;line-height:1.45}
.we-card{background:#0f172a;border:1px solid #0e7490;border-radius:8px;padding:10px;margin:8px 0}
.we-card h3{margin:0 0 6px;color:#67e8f9;font-size:15px}
.we-cat{color:#67e8f9;font-weight:600;font-size:12px}
.we-desc{color:#cbd5e1;margin:4px 0 6px}
.we-task,.we-rew,.we-step{color:#94a3b8;margin:2px 0;font-size:12px}
.we-rew{color:#a5f3fc}
.we-step{padding-left:4px}
.we-actions{margin-top:6px}
.we-shop-row{margin:4px 0}
.we-btn{font-size:12px;padding:6px 10px;border-radius:6px;border:1px solid #155e75;background:#0e7490;color:#ecfeff;cursor:pointer;margin:2px}
.we-btn:disabled{opacity:.4;cursor:not-allowed}
.we-panel{overflow-wrap:anywhere}
.we-guide{color:#cbd5e1;font-size:12px;margin:0 0 3px 18px}
.we-step.we-done,.we-guide.we-done{opacity:.55}
.we-step.we-cur{color:#e0f2fe;font-weight:600}
.we-focus{background:rgba(14,116,144,.18);border-left:3px solid #22d3ee;border-radius:4px;padding:5px 8px;margin:6px 0;color:#ecfeff;font-size:12.5px}
.we-focus b{color:#67e8f9}
.we-prog{color:#f0abfc;font-weight:600}
.we-own{display:inline-block;margin:0 0 6px;padding:2px 8px;border:1px solid #0e7490;border-radius:6px;background:rgba(14,116,144,.22);color:#a5f3fc;font-weight:600;font-size:13px}`;
    document.head.appendChild(s);
}

const WE_CAT_LABEL = {
    map: '地圖增益',
    boss: '限時頭目',
    mut: '怪物異變',
    order: 'NPC訂單',
    rule: '規則變化',
    story: '劇情任務'
};
const WE_RACE_LABEL = {
    undead: '不死族', demon: '惡魔族', dragon: '龍族', construct: '構造體',
    humanoid: '人型', animal: '動物'
};

function weMapName(mapId) {
    try {
        if (typeof mapDisplayName === 'function') {
            let n = mapDisplayName(mapId);
            if (n) return n;
        }
        if (DB.towns && DB.towns[mapId] && DB.towns[mapId].n) return DB.towns[mapId].n;
        if (DB.maps && DB.maps[mapId] && DB.maps[mapId].n) return DB.maps[mapId].n;
    } catch (e) {}
    return mapId || '？';
}
/** 地圖補充說明：大墳墓樓層需由入口下降 */
function weMapHow(mapId) {
    let m = /^nazarick_f(\d+)$/.exec(String(mapId || ''));
    if (m) { let layer = 11 - Number(m[1]); return layer <= 1 ? '（由「納薩力克．大墳墓入口」進入後的第一層）' : `（由大墳墓入口下降第 ${layer} 層）`; }
    return '';
}
function weMapLabel(mapId) { return `「${weMapName(mapId)}」${weMapHow(mapId)}`; }
function _weCurMap() { try { return (typeof mapState !== 'undefined' && mapState) ? mapState.current : ''; } catch (e) { return ''; } }
/** 頭目召喚狀態一行（故事／限定共用） */
function weBossStatusHtml(bossId, map, need, key) {
    let n = weBossKillCount(key);
    let bn = weBossName(bossId);
    let here = _weCurMap() === map;
    if (here && weBossAlive(bossId)) return `<span class="we-prog">頭目「${bn}」已出現，快擊敗它！</span>`;
    if (n >= need) return `<span class="we-prog">頭目出現進度 ${need}/${need}：${here ? '下一隻出現的怪物就是頭目' : '回到' + weMapLabel(map) + '，下一隻出現的怪物就是頭目'}</span>`;
    return `<span class="we-prog">頭目出現進度 ${n}/${need}</span>${here ? '（你正在此地圖）' : ''}`;
}
function weBossCapText() { return weBadgeCap(); }
function weItemName(id) {
    return (DB.items && DB.items[id] && DB.items[id].n) || id;
}
function weRewardText(items, badge) {
    let parts = [];
    if (badge) parts.push('世界事件徽章×' + badge);
    (items || []).forEach(pair => {
        let id = Array.isArray(pair) ? pair[0] : pair;
        let n = Array.isArray(pair) ? pair[1] : 1;
        parts.push(weItemName(id) + '×' + n);
    });
    return parts.length ? parts.join('、') : '（無）';
}

/** Build full card HTML for one event template (also used by tests). */
function weEventCardHtml(ev, opts) {
    opts = opts || {};
    let fromOverride = !!opts.fromOverride;
    let progress = opts.progress || (player && player.worldEvent && player.worldEvent.progress) || {};
    let claimed = opts.claimed || (player && player.worldEvent && player.worldEvent.claimed) || {};
    let orderDone = opts.orderDone || (player && player.worldEvent && player.worldEvent.orderDone) || {};
    let catLabel = WE_CAT_LABEL[ev.cat] || ev.cat || '事件';
    let title = (ev.label || ev.id || '未知事件');
    let desc = '';
    let tasks = '';
    let rewards = '';
    let actions = '';

    if (ev.cat === 'map') {
        let mapN = weMapName(ev.map);
        desc = `指定地圖「${mapN}」經驗 ×${ev.exp || 1}、掉落 ×${ev.drop || 1}（僅該地圖生效）。`;
        tasks = `<div class="we-task">任務：前往 ${mapN} 狩獵即可享受加成（自動生效）。</div>`;
        rewards = `<div class="we-rew">獎勵：地圖加成期間額外掉落機會提升；無單獨領獎。</div>`;
    } else if (ev.cat === 'boss') {
        let baseKey = weLimitedField(ev, 'base');
        let baseN = (DB.mobs && DB.mobs[baseKey] && DB.mobs[baseKey].n) || baseKey || '強化模板';
        let bmap = weLimitedField(ev, 'map');
        let need = Number(weLimitedField(ev, 'need')) || WE_LIMITED_BOSS_NEED;
        let bid = 'we_boss_' + ev.id;
        let bn = weBossName(bid) || ev.name || title;
        desc = `本週限定頭目「${bn}」（以${baseN}強化：生命 ×${weLimitedField(ev, 'hpMul') || 1}、傷害 ×${weLimitedField(ev, 'dmgMul') || 1}），強度高於瘋狂賽蓮大墳墓。`;
        if (bmap) {
            tasks = `<div class="we-task">地點：${weMapLabel(bmap)}</div>`
                + `<div class="we-task">做法：在該地圖擊殺任意怪物 ${need} 隻 → 下一隻出現的怪物會變成「${bn}」→ 擊敗它。擊敗後進度歸零，可再召喚。</div>`
                + `<div class="we-focus">${weBossStatusHtml(bid, bmap, need, ev.id)}</div>`;
        } else {
            tasks = `<div class="we-task">此限定頭目未設定出現地圖。</div>`;
        }
        rewards = `<div class="we-rew">每次擊殺：世界事件徽章×15（每週上限 ${weBossCapText()}）；本週首殺另得 守護強化卷·極（武器或防具）×1＋祝福化卷軸×1。</div>`;
        let done = !!claimed['boss_' + ev.id];
        actions = `<button class="we-btn" disabled>${done ? '本週首殺獎勵已領（仍可再打拿徽章）' : '擊殺後自動發放'}</button>`;
    } else if (ev.cat === 'mut') {
        let race = WE_RACE_LABEL[ev.raceMajor] || ev.raceMajor || '？';
        let hpPct = Math.round(((ev.hp || 1) - 1) * 100);
        desc = `${race}異變：該大宗族怪物 HP +${hpPct}%、抗性 +${ev.resist || 0}、掉落 ×${ev.drop || 1}（全地圖該種族生效）。`;
        tasks = `<div class="we-task">任務：狩獵${race}怪物以享受強化掉落（自動生效）。</div>`;
        rewards = `<div class="we-rew">獎勵：異變期間掉落提升；無單獨領獎。</div>`;
    } else if (ev.cat === 'order') {
        let need = ev.need || {};
        let needParts = [];
        if (need.wood) needParts.push('木材×' + need.wood);
        if (need.ore) needParts.push('礦石×' + need.ore);
        if (need.cards) needParts.push('普卡×' + need.cards);
        if (need.soul) needParts.push('納薩魂晶×' + need.soul);
        desc = `NPC 物資訂單：交付 ${needParts.join('、') || '指定物資'}。`;
        // progress of what player has
        let haveBits = [];
        if (need.wood) {
            let w = (player && player.clanBase && player.clanBase.res && player.clanBase.res.wood) || 0;
            haveBits.push(`木材 ${w}/${need.wood}`);
        }
        if (need.ore) {
            let o = (player && player.clanBase && player.clanBase.res && player.clanBase.res.ore) || 0;
            haveBits.push(`礦石 ${o}/${need.ore}`);
        }
        if (need.cards) {
            let c = 0;
            if (player && player.inv) player.inv.forEach(it => {
                let d = DB.items[it.id];
                if (d && d.eff === 'card' && d.cardTier === 1) c += it.cnt || 1;
            });
            haveBits.push(`普卡 ${c}/${need.cards}`);
        }
        if (need.soul) {
            let s = 0;
            if (player && player.inv) player.inv.forEach(it => { if (it.id === 'mat_nazarick_soulcrystal') s += it.cnt || 1; });
            haveBits.push(`魂晶 ${s}/${need.soul}`);
        }
        let done = !!orderDone[ev.id];
        tasks = `<div class="we-task">進度：${done ? '已交付' : (haveBits.join('　') || '—')}</div>`;
        rewards = `<div class="we-rew">獎勵：${weRewardText(ev.mat ? [[ev.mat, 1]] : [], ev.badge || 5)}</div>`;
        actions = `<button class="we-btn" ${done ? 'disabled' : ''} onclick="weDeliverOrder('${ev.id}')">${done ? '已交付' : '交付訂單'}</button>`;
    } else if (ev.cat === 'rule') {
        let bits = [];
        if (ev.magicPct) bits.push('魔法傷害 ' + (ev.magicPct > 0 ? '+' : '') + ev.magicPct + '%');
        if (ev.physPct) bits.push('物理傷害 ' + (ev.physPct > 0 ? '+' : '') + ev.physPct + '%');
        if (ev.enhanceBonus) bits.push('強化成功率 +' + ev.enhanceBonus + '%');
        if (ev.expPct) bits.push('全域經驗 +' + ev.expPct + '%');
        desc = `本週規則變更：${bits.join('／') || title}（自動生效）。`;
        tasks = `<div class="we-task">任務：無；規則對全角色／傭兵戰鬥與強化立即生效。</div>`;
        rewards = `<div class="we-rew">獎勵：規則增益本身；無單獨領獎。</div>`;
    } else if (ev.cat === 'story') {
        let steps = ev.steps || [];
        let st = progress[ev.id] || { step: 0, kills: 0, collected: 0 };
        let cur = steps[st.step];
        const raceN = r => WE_RACE_LABEL[r] || r || '？';
        const hintTxt = (i) => { let h = weStepField(ev, i, 'hint'); return (Array.isArray(h) && h.length) ? h.map(m => weMapName(m)).join('、') : ''; };
        // 每步一行清楚指示（地點＋做法）
        const guide = (s, i) => {
            if (s.type === 'goto') return `地點：${weMapLabel(s.map)}；進入該地圖即完成。`;
            if (s.type === 'kill') { let h = hintTxt(i); return `任何地圖的${raceN(s.raceMajor)}都計數${h ? '；推薦：' + h : ''}。`; }
            if (s.type === 'collect') return `任務期間在任何地圖擊殺任何怪物，每隻 ${Math.round(WE_CLUE_RATE * 100)}% 掉落「${weItemName(s.item)}」。`;
            if (s.type === 'killboss') {
                let bm = weStepField(ev, i, 'map'), need = Number(weStepField(ev, i, 'need')) || WE_STORY_BOSS_NEED;
                return bm ? `地點：${weMapLabel(bm)}；在該地圖擊殺任意怪物 ${need} 隻後，下一隻出現的怪物會變成「${weBossName(s.bossId)}」。` : '頭目出現地點未設定。';
            }
            return '';
        };
        let stepLines = steps.map((s, i) => {
            let done = i < st.step, isCur = i === st.step;
            let mark = done ? '✓' : (isCur ? '▶' : '·');
            let prog = '';
            if (isCur && s.type === 'kill') prog = ` [${st.kills || 0}/${s.count}]`;
            if (isCur && s.type === 'collect') prog = ` [${st.collected || 0}/${s.count}]`;
            if (isCur && s.type === 'killboss') { let need = Number(weStepField(ev, i, 'need')) || WE_STORY_BOSS_NEED; prog = ` [${Math.min(need, weBossKillCount(ev.id))}/${need}]`; }
            let cls = done ? ' we-done' : (isCur ? ' we-cur' : '');
            return `<div class="we-step${cls}">${mark} ${i + 1}. ${s.text || ''}${prog}</div><div class="we-guide${done ? ' we-done' : ''}">${guide(s, i)}</div>`;
        }).join('');
        let curFocus = '';
        if (cur) {
            let i = st.step;
            if (cur.type === 'goto') curFocus = `<b>目前目標：</b>前往${weMapLabel(cur.map)}（進入即完成）`;
            else if (cur.type === 'kill') { let h = hintTxt(i); curFocus = `<b>目前目標：</b>擊殺${raceN(cur.raceMajor)} ${st.kills || 0}/${cur.count}（任何地圖皆可${h ? '，推薦 ' + h : ''}）`; }
            else if (cur.type === 'collect') curFocus = `<b>目前目標：</b>收集「${weItemName(cur.item)}」 ${st.collected || 0}/${cur.count}（任何地圖擊殺怪物 ${Math.round(WE_CLUE_RATE * 100)}% 掉落）`;
            else if (cur.type === 'killboss') {
                let bm = weStepField(ev, i, 'map'), need = Number(weStepField(ev, i, 'need')) || WE_STORY_BOSS_NEED;
                curFocus = bm ? `<b>目前目標：</b>到${weMapLabel(bm)}擊殺任意怪物 ${need} 隻，召喚並擊敗「${weBossName(cur.bossId)}」<br>${weBossStatusHtml(cur.bossId, bm, need, ev.id)}`
                              : `<b>目前目標：</b>擊敗頭目「${weBossName(cur.bossId)}」`;
            }
        } else {
            curFocus = claimed['story_' + ev.id] ? '<b>已完成</b>，獎勵已領取。' : '<b>全部步驟完成</b>，按下方按鈕領取最終獎勵。';
        }
        desc = `劇情鏈共 ${steps.length} 步，依序完成後領取最終獎勵。`;
        tasks = `<div class="we-focus">${curFocus}</div><div class="we-task">步驟進度 ${Math.min(st.step, steps.length)}/${steps.length}：</div>${stepLines}`;
        let rew = ev.reward || {};
        rewards = `<div class="we-rew">最終獎勵：${weRewardText(rew.items, rew.badge)}</div>`;
        let canClaim = st.step >= steps.length && !claimed['story_' + ev.id];
        let already = !!claimed['story_' + ev.id];
        actions = `<button class="we-btn" ${canClaim ? '' : 'disabled'} onclick="weClaimStory('${ev.id}')">${already ? '已領取' : (canClaim ? '領取故事獎勵' : '完成後可領')}</button>`;
    } else {
        desc = title;
        rewards = `<div class="we-rew">獎勵：見活動說明。</div>`;
    }

    return `<div class="we-card" data-we-id="${ev.id || ''}" data-we-cat="${ev.cat || ''}">
      <h3>${title} <span class="we-cat">（${catLabel}${fromOverride ? '・覆寫' : ''}）</span></h3>
      <div class="we-desc">${desc}</div>
      ${tasks}
      ${rewards}
      ${actions ? `<div class="we-actions">${actions}</div>` : ''}
    </div>`;
}

/** 🏅 v3.8.102 背包持有的世界事件徽章（與「本週已獲／上限」不同） */
function weBadgeOwned() {
    let n = 0;
    try { (player && player.inv || []).forEach(it => { if (it && it.id === 'cur_event_badge') n += (it.cnt || 1); }); } catch (e) {}
    return n;
}
/** 已站在 goto 目標地圖時直接完成該步（不必離開再進） */
function weCheckGotoHere() {
    try {
        let cur = _weCurMap(); if (!cur) return;
        let act = weGetActive();
        act.events.forEach(ev => {
            if (ev.cat !== 'story' || !Array.isArray(ev.steps)) return;
            let st = player.worldEvent.progress[ev.id] || { step: 0 };
            let step = ev.steps[st.step];
            if (step && step.type === 'goto' && step.map === cur) {
                st.step++; player.worldEvent.progress[ev.id] = st;
                logSys('<span class="text-cyan-300">抵達任務地點。</span>');
            }
        });
    } catch (e) {}
}
function renderWorldEventPanel() {
    let host = document.getElementById('tab-worldevent'); if (!host) return;
    weEnsureStyles(); ensureWorldEventSave();
    weCheckGotoHere();
    if (typeof updateTrialHud === 'function') updateTrialHud();
    else if (typeof trialClearHud === 'function') trialClearHud();
    let act = weGetActive();
    let evHtml = act.events.map(ev => weEventCardHtml(ev, { fromOverride: act.fromOverride })).join('');
    let shop = WE_SHOP.map(row => {
        let bought = Number(player.worldEvent.shop.bought[row.id]) || 0;
        let lim = Number(row.weekly != null ? row.weekly : row.limit) || 1;
        let nm = DB.items[row.id] ? DB.items[row.id].n : row.id;
        return `<div class="we-shop-row">${nm} · ${row.cost}徽章 · ${bought}/${lim}
          <button class="we-btn" ${bought >= lim ? 'disabled' : ''} onclick="weShopBuy('${row.id}')">購買</button></div>`;
    }).join('');
    host.innerHTML = `<div class="we-panel">
      <div class="we-card"><h3>🌐 本週世界事件（${act.week}）</h3>
        <div>徽章已獲 ${player.worldEvent.badgeEarned || 0}/${weBadgeCap()}（週一 05:00 台北重置）</div>
      </div>
      ${evHtml}
      <div class="we-card"><h3>事件商店</h3><div class="we-own" id="we-badge-owned">持有：🏅 世界事件徽章 ×${weBadgeOwned()}</div>${shop}</div>
    </div>`;
}


// boot override fetch
if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { weLoadOverride().then(() => weComputeActive()); });
    else weLoadOverride().then(() => weComputeActive());
}

function weSetOverride(obj) {
    _weOverride = obj || null;
    _weActive = null;
    return weComputeActive();
}
/** Deterministic pick for a given week key (testing / preview). */
function wePreviewForWeek(weekKey) {
    let bak = weWeekKey;
    // temporarily monkey: use a local seed with forced key
    let _key = weekKey;
    function _seeded(tag) {
        let s = _key + '|' + tag;
        if (typeof _seededFloat === 'function') return _seededFloat(s);
        let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
        return (h % 10000) / 10000;
    }
    function _pick(arr, tag) {
        return arr[Math.floor(_seeded(tag) * arr.length) % arr.length];
    }
    let cats = WE_CATS.slice();
    let c1 = _pick(cats, 'c1');
    cats = cats.filter(c => c.key !== c1.key);
    let c2 = _pick(cats, 'c2');
    let e1 = Object.assign({ cat: c1.key }, _pick(c1.pool, 'e1'));
    let e2 = Object.assign({ cat: c2.key }, _pick(c2.pool, 'e2'));
    return { week: weekKey, events: [e1, e2] };
}
window.weSetOverride = weSetOverride;
window.weComputeActive = weComputeActive;
window.weRegisterClueItems = weRegisterClueItems;
window.weRegisterBossMobs = weRegisterBossMobs;
window.wePreviewForWeek = wePreviewForWeek;
window.weWeekKey = weWeekKey;
window.weGetActive = weGetActive;
window.weLoadOverride = weLoadOverride;
window.weOnKill = weOnKill;
window.weOnMobSpawn = weOnMobSpawn;
window.weBossTargets = weBossTargets;
window.weBossKillCount = weBossKillCount;
window.weBadgeOwned = weBadgeOwned;
window.weMapName = weMapName;
window.WE_STORY_BOSS_NEED = WE_STORY_BOSS_NEED;
window.WE_LIMITED_BOSS_NEED = WE_LIMITED_BOSS_NEED;
window.weMobIsRace = weMobIsRace;
window.weOnEnterMap = weOnEnterMap;
window.weDropMult = weDropMult;
window.weExpMult = weExpMult;
window.weDmgMult = weDmgMult;
window.weEnhanceBonusPct = weEnhanceBonusPct;
window.weMutateMob = weMutateMob;
window.weDeliverOrder = weDeliverOrder;
window.weClaimStory = weClaimStory;
window.weShopBuy = weShopBuy;
window.renderWorldEventPanel = renderWorldEventPanel;
window.weEventCardHtml = weEventCardHtml;
window.WE_CAT_LABEL = WE_CAT_LABEL;
window.WE_RACE_LABEL = WE_RACE_LABEL;
window.ensureWorldEventSave = ensureWorldEventSave;
window.WE_MAP_BOOST = WE_MAP_BOOST;
window.WE_LIMITED_BOSS = WE_LIMITED_BOSS;
window.WE_MUTATION = WE_MUTATION;
window.WE_NPC_ORDER = WE_NPC_ORDER;
window.WE_RULE = WE_RULE;
window.WE_STORY = WE_STORY;
window.WE_SHOP = WE_SHOP;

})();
