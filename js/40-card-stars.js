// ===== 🎴 v3.8.97 卡片圖鑑升星 + 🪆 六星娃娃覺醒（cache cards.20261006a）=====
// 設計紀要見 NOTES.md。UI 用 scoped .cs- / .daw- 樣式，不依賴 tailwind-built 新 class。

(function () {
'use strict';

// ---- 升星費用：達 ★1..★10 各需消耗「該怪實體卡」張數；合計 42 張 ----
// 普卡掉落約 1%／銀 0.5%／金 0.1%；一地區 ~10–30 怪 → 全 ★10 需數百～千張，可達成但需長期狩獵。
const CARD_STAR_COST = [1, 1, 2, 2, 3, 4, 5, 6, 8, 10]; // index 0 = 0→1
const CARD_STAR_MAX = 10;
const CARD_STAR_RACE_DMG_CAP = 15;   // 大宗族傷害加成上限 %
const CARD_STAR_DMG_PER = 1;         // 每星 +1% 對該大宗族傷害
const CARD_STAR_DROP_PER = 2;        // 每星 +2% 該怪掉落（含卡片）
const CARD_STAR_RESERVE_DEFAULT = 10; // 餵卡預設保留張數（合成／兌換用）

// 地區全 ★10 完成加成（對應 CARD_REGIONS.key；永久、隊長共用桶 → 傭兵借隊長）
const CARD_STAR_MAP_BONUS = {
    // 皆為 calcStats 後期可安全套用的欄位（避免主屬性 Phase1 時序問題）；經驗% 另掛 kill 結算
    silverknight: { mhp: 8, label: 'HP +8' },
    fairyforest:  { mmp: 8, label: 'MP +8' },
    talkingisland:{ mpR: 1, label: 'MP恢復 +1' },
    burningwillow:{ hpR: 1, label: 'HP恢復 +1' },
    gludin:       { extraHit: 1, label: '額外命中 +1' },
    kent:         { extraDmg: 1, label: '額外傷害 +1' },
    windwood:     { weight: 20, label: '負重 +20' },
    heine:        { expPct: 1, label: '經驗 +1%' },
    giran:        { weight: 15, label: '負重 +15' },
    dragonvalley: { extraDmg: 1, label: '額外傷害 +1' },
    witon:        { resFire: 1, label: '火抗 +1' },
    oren:         { resWater: 1, label: '水抗 +1' },
    aden:         { resWind: 1, label: '風抗 +1' },
    adencastle:   { mhp: 12, label: 'HP +12' },
    tower:        { extraHit: 1, label: '額外命中 +1' },
    rastabad:     { mr: 1, label: 'MR +1' },
    rift:         { resEarth: 1, label: '地抗 +1' },
    oblivion:     { mpR: 1, label: 'MP恢復 +1' },
    sanctuary:    { mr: 2, label: 'MR +2' },
    antharas:     { dr: 1, label: '傷害減免 +1' }
};

// ---- 六星娃娃覺醒 ----
const DOLL_AWAKEN_MAX = 5;
const DOLL_AWAKEN_EXP_NEED = [15, 25, 40, 60, 90]; // 達 tier 1..5 所需 EXP（該階）
const DOLL_AWAKEN_STAT_PCT = 10; // 每階 +10% 娃娃既有數值加成

// dollId → 對應怪物名（匹配卡 3×EXP）；raceMajor 同族卡 2×；其餘 1×
const DOLL_AWAKEN_MOBS = {
    'doll_安塔瑞斯': { mobs: ['被侵蝕的安塔瑞斯', '安塔瑞斯'], raceMajor: 'dragon',
        t5: { id: 'earth_guard', name: '大地守護', desc: 'HP＜40% 時傷害減免 +8（裝備中）' } },
    'doll_法利昂':   { mobs: ['法利昂'], raceMajor: 'dragon',
        t5: { id: 'tidal_mana', name: '潮汐回能', desc: '造成魔法傷害時 8% 機率恢復最大 MP 的 3%' } },
    'doll_林德拜爾': { mobs: ['林德拜爾'], raceMajor: 'dragon',
        t5: { id: 'gale_echo', name: '疾風餘波', desc: '遠距離命中時 8% 機率追加 25% 風屬性傷害' } },
    'doll_巴拉卡斯': { mobs: ['巴拉卡斯'], raceMajor: 'dragon',
        t5: { id: 'dragonfire', name: '龍焰餘燼', desc: '近戰命中時 8% 機率附加灼燒（3 秒）' } }
};

let _cardBookMode = 'collect'; // 'collect' | 'stars'
let _csStyles = false;

function csEnsureStyles() {
    if (_csStyles || typeof document === 'undefined') return;
    if (document.getElementById('cardstars-style')) { _csStyles = true; return; }
    let s = document.createElement('style');
    s.id = 'cardstars-style';
    s.textContent = `
#card-book .cs-mode{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 8px}
#card-book .cs-mode button{font-size:12px;padding:4px 10px;border-radius:6px;border:1px solid #475569;background:#1e293b;color:#cbd5e1;cursor:pointer}
#card-book .cs-mode button.on{background:#92400e;border-color:#f59e0b;color:#fef3c7;font-weight:700}
.cs-sum{background:#0f172a;border:1px solid #334155;border-radius:8px;padding:8px 10px;margin-bottom:10px;font-size:12px;color:#94a3b8;line-height:1.5}
.cs-sum b{color:#fde68a}
.cs-grid{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}
.cs-card{width:150px;background:rgba(30,41,59,.85);border:1px solid #475569;border-radius:8px;padding:8px;display:flex;flex-direction:column;align-items:center;gap:4px;position:relative}
.cs-card.max{border-color:#f59e0b}
.cs-card .cs-name{font-size:12px;font-weight:700;color:#f1f5f9;text-align:center;width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cs-card .cs-meta{font-size:11px;color:#94a3b8;text-align:center}
.cs-stars{color:#fbbf24;font-size:11px;letter-spacing:1px}
.cs-btns{display:flex;gap:4px;width:100%;margin-top:4px}
.cs-btns button{flex:1;font-size:11px;padding:4px 0;border-radius:5px;border:1px solid #78350f;background:#78350f;color:#fef3c7;cursor:pointer}
.cs-btns button:disabled{opacity:.4;cursor:not-allowed;background:#334155;border-color:#475569;color:#94a3b8}
.cs-warn{color:#f87171;font-size:10px}
.cs-ok{color:#4ade80;font-size:10px}
.cs-reserve{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:12px;color:#cbd5e1;margin:6px 0}
.cs-reserve input{width:52px;background:#0f172a;border:1px solid #475569;color:#fde68a;border-radius:4px;padding:2px 4px;text-align:center}
.daw-box{margin-top:10px;padding:10px;border:1px solid #7c2d12;border-radius:8px;background:rgba(69,26,3,.35);font-size:12px;color:#fed7aa;line-height:1.45}
.daw-box h4{margin:0 0 6px;color:#fdba74;font-size:14px}
.daw-bar{height:8px;background:#1e293b;border-radius:4px;overflow:hidden;margin:4px 0 8px}
.daw-bar>i{display:block;height:100%;background:linear-gradient(90deg,#ea580c,#fbbf24);width:0%}
.daw-btns{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}
.daw-btns button{font-size:12px;padding:5px 10px;border-radius:6px;border:1px solid #9a3412;background:#9a3412;color:#fff7ed;cursor:pointer}
.daw-btns button:disabled{opacity:.4;cursor:not-allowed}
.daw-t5{color:#fde68a;font-weight:700}
`;
    document.head.appendChild(s);
    _csStyles = true;
}

// ---------- 資料確保／共用桶 ----------
function ensureCardStars(p) {
    p = p || (typeof player !== 'undefined' ? player : null);
    if (!p) return;
    if (!p.cardStars || typeof p.cardStars !== 'object') p.cardStars = {};
    if (p.cardStarReserve == null || p.cardStarReserve < 0) p.cardStarReserve = CARD_STAR_RESERVE_DEFAULT;
}

function cardStarOf(name, p) {
    p = p || player;
    if (!p || !p.cardStars) return 0;
    return Math.min(CARD_STAR_MAX, Math.max(0, p.cardStars[name] || 0));
}

function cardStarCostNext(name, p) {
    let s = cardStarOf(name, p);
    if (s >= CARD_STAR_MAX) return 0;
    return CARD_STAR_COST[s] || 0;
}

function cardStarOwnedCount(name) {
    if (!player || !player.inv) return 0;
    let n = 0;
    player.inv.forEach(it => {
        let d = DB.items[it.id];
        if (d && d.eff === 'card' && !it.lock && d.cardMob === name) n += (it.cnt || 1);
    });
    return n;
}

/** 從背包消耗某怪的實體卡（優先普→銀→金）；回傳實際消耗張數 */
function cardStarConsumeCards(name, need) {
    if (need <= 0) return 0;
    let left = need;
    let rm = [];
    for (let tier = 1; tier <= 3 && left > 0; tier++) {
        let entries = player.inv.filter(it => {
            let d = DB.items[it.id];
            return d && d.eff === 'card' && !it.lock && d.cardTier === tier && d.cardMob === name;
        });
        for (let it of entries) {
            if (left <= 0) break;
            let cc = it.cnt || 1;
            if (cc <= left) { left -= cc; rm.push(it.uid); }
            else { it.cnt = cc - left; left = 0; }
        }
    }
    if (rm.length) { let _rs = new Set(rm); player.inv = player.inv.filter(i => !_rs.has(i.uid)); }
    return need - left;
}

function cardStarFeed(name, maxMode) {
    ensureCardStars();
    if (!CARD_MOB_INFO[name]) { logSys('<span class="text-red-400">未知怪物卡片。</span>'); return; }
    if (typeof cardDexScore === 'function' && cardDexScore(name) < 100) {
        logSys('<span class="text-slate-400">需先開通該怪金階圖鑑，才能餵卡升星。</span>'); return;
    }
    let cur = cardStarOf(name);
    if (cur >= CARD_STAR_MAX) { logSys('<span class="text-amber-300">已達 ★10。</span>'); return; }

    let reserve = player.cardStarReserve|0;
    let owned = cardStarOwnedCount(name);
    let avail = Math.max(0, owned - reserve);
    if (avail <= 0) {
        logSys(`<span class="text-slate-400">「${name}」可餵張數不足（持有 ${owned}、保留 ${reserve}）。</span>`);
        return;
    }

    let fed = 0, starsGained = 0;
    while (cur < CARD_STAR_MAX) {
        let cost = CARD_STAR_COST[cur];
        if (avail < cost) break;
        if (!maxMode && fed > 0) break; // feed 1 star only when !maxMode
        // confirm if would dip into last copies beyond reserve already handled by avail
        let took = cardStarConsumeCards(name, cost);
        if (took < cost) break;
        avail -= cost; fed += cost;
        cur += 1; starsGained += 1;
        player.cardStars[name] = cur;
        if (!maxMode) break;
    }
    if (!starsGained) {
        logSys(`<span class="text-slate-400">需要 ${cardStarCostNext(name)} 張「${name}」卡才能升下一星（可餵 ${avail}）。</span>`);
        return;
    }
    if (typeof saveCardStars === 'function') saveCardStars();
    if (typeof calcStats === 'function') calcStats();
    logSys(`<span class="text-amber-200">「${name}」圖鑑升至 ★${cur}（消耗 ${fed} 張卡）。</span>`);
    // map complete check
    _cardStarCheckMapComplete();
    if (typeof renderCardBook === 'function') renderCardBook();
    if (typeof renderTabs === 'function') renderTabs(true);
    if (typeof saveGame === 'function') saveGame();
}

function setCardStarReserve(n) {
    ensureCardStars();
    n = Math.max(0, Math.min(999, parseInt(n, 10) || 0));
    player.cardStarReserve = n;
    if (typeof saveCardStars === 'function') saveCardStars();
    if (typeof renderCardBook === 'function') renderCardBook();
    logSys(`<span class="text-slate-300">餵卡保留張數設為 ${n}。</span>`);
}

function cardBookSetMode(m) {
    _cardBookMode = (m === 'stars') ? 'stars' : 'collect';
    if (typeof renderCardBook === 'function') renderCardBook();
}

// ---------- 加成查詢 ----------
function _mobRaceMajorOf(mob) {
    if (!mob) return 'other';
    if (mob.raceMajor && typeof MOB_RACE_MAJOR_LABELS !== 'undefined' && MOB_RACE_MAJOR_LABELS[mob.raceMajor]) return mob.raceMajor;
    if (typeof _inferMobRaceMajor === 'function') try { return _inferMobRaceMajor(mob) || 'other'; } catch (e) {}
    return 'other';
}

function cardStarRaceTotals(p) {
    p = p || player;
    ensureCardStars(p);
    let tot = {};
    for (let nm in p.cardStars) {
        let st = p.cardStars[nm] || 0;
        if (st <= 0) continue;
        let info = (typeof CARD_MOB_INFO !== 'undefined') ? CARD_MOB_INFO[nm] : null;
        let maj = info && info.mob ? _mobRaceMajorOf(info.mob) : 'other';
        tot[maj] = (tot[maj] || 0) + st * CARD_STAR_DMG_PER;
    }
    for (let k in tot) tot[k] = Math.min(CARD_STAR_RACE_DMG_CAP, tot[k]);
    return tot;
}

/** 對目標怪的傷害倍率（隊長 cardStars；傭兵亦吃隊長） */
function cardStarDmgMult(mob, who) {
    let p = (typeof player !== 'undefined') ? player : null;
    if (!p || !mob) return 1;
    ensureCardStars(p);
    let maj = _mobRaceMajorOf(mob);
    let totals = cardStarRaceTotals(p);
    let pct = totals[maj] || 0;
    // 若大宗族為 other 且該怪有獨立圖鑑星，改用「對該怪」星數（仍吃 cap）
    if (pct <= 0 || maj === 'other') {
        let nm = (typeof CARD_DROP_ALIAS !== 'undefined' && CARD_DROP_ALIAS[mob.n]) ? CARD_DROP_ALIAS[mob.n] : mob.n;
        let st = cardStarOf(nm, p);
        if (st > 0) pct = Math.min(CARD_STAR_RACE_DMG_CAP, st * CARD_STAR_DMG_PER);
    }
    if (pct <= 0) return 1;
    return 1 + pct / 100;
}

function cardStarDropMult(mob) {
    let p = (typeof player !== 'undefined') ? player : null;
    if (!p || !mob) return 1;
    ensureCardStars(p);
    let nm = (typeof CARD_DROP_ALIAS !== 'undefined' && CARD_DROP_ALIAS[mob.n]) ? CARD_DROP_ALIAS[mob.n] : mob.n;
    let st = cardStarOf(nm, p);
    return 1 + (st * CARD_STAR_DROP_PER) / 100;
}

function cardStarRegionComplete(key, p) {
    p = p || player;
    ensureCardStars(p);
    let names = (typeof CARD_REGION_MOBS !== 'undefined') ? CARD_REGION_MOBS[key] : null;
    if (!names || !names.length) return false;
    for (let i = 0; i < names.length; i++) if (cardStarOf(names[i], p) < CARD_STAR_MAX) return false;
    return true;
}

function cardStarMapBonusExpPct(p) {
    p = p || player;
    ensureCardStars(p);
    let pct = 0;
    if (typeof CARD_REGIONS === 'undefined') return 0;
    CARD_REGIONS.forEach(reg => {
        if (!cardStarRegionComplete(reg.key, p)) return;
        let b = CARD_STAR_MAP_BONUS[reg.key];
        if (b && b.expPct) pct += b.expPct;
    });
    return pct;
}

function cardStarApplyStatBonus(p, d) {
    if (!p || !d) return;
    ensureCardStars(p);
    if (typeof CARD_REGIONS === 'undefined') return;
    d._cardStarWeight = 0;
    CARD_REGIONS.forEach(reg => {
        if (!cardStarRegionComplete(reg.key, p)) return;
        let b = CARD_STAR_MAP_BONUS[reg.key];
        if (!b) return;
        if (b.str) d.str = (d.str || 0) + b.str;
        if (b.dex) d.dex = (d.dex || 0) + b.dex;
        if (b.con) d.con = (d.con || 0) + b.con;
        if (b.int) d.int = (d.int || 0) + b.int;
        if (b.wis) d.wis = (d.wis || 0) + b.wis;
        if (b.cha) d.cha = (d.cha || 0) + b.cha;
        if (b.mhp) p.mhp = (p.mhp || 0) + b.mhp;
        if (b.mr) d.mr = (d.mr || 0) + b.mr;
        if (b.dr) d.dr = (d.dr || 0) + b.dr;
        if (b.mpR) d.mpR = (d.mpR || 0) + b.mpR;
        if (b.hpR) d.hpR = (d.hpR || 0) + b.hpR;
        if (b.mmp) p.mmp = (p.mmp || 0) + b.mmp;
        if (b.extraDmg) d.extraDmg = (d.extraDmg || 0) + b.extraDmg;
        if (b.extraHit) d.extraHit = (d.extraHit || 0) + b.extraHit;
        if (b.resFire) d.resFire = (d.resFire || 0) + b.resFire;
        if (b.resWater) d.resWater = (d.resWater || 0) + b.resWater;
        if (b.resWind) d.resWind = (d.resWind || 0) + b.resWind;
        if (b.resEarth) d.resEarth = (d.resEarth || 0) + b.resEarth;
        if (b.weight) d._cardStarWeight = (d._cardStarWeight || 0) + b.weight;
    });
}

function _cardStarCheckMapComplete() {
    if (typeof CARD_REGIONS === 'undefined') return;
    ensureCardStars();
    if (!player._cardStarMapDone) player._cardStarMapDone = {};
    CARD_REGIONS.forEach(reg => {
        if (player._cardStarMapDone[reg.key]) return;
        if (!cardStarRegionComplete(reg.key)) return;
        player._cardStarMapDone[reg.key] = true;
        let b = CARD_STAR_MAP_BONUS[reg.key];
        logSys(`<span class="text-amber-300 font-bold">【圖鑑升星】${reg.name} 全怪物達 ★10！獲得永久加成：${b ? b.label : '—'}（全隊／傭兵共享）</span>`);
    });
}

// ---------- 娃娃覺醒 ----------
function dollAwakenInfo(item) {
    if (!item) return null;
    let d = DB.items[item.id];
    if (!d || !d.doll || d.dollTier !== 6) return null;
    let cfg = DOLL_AWAKEN_MOBS[item.id];
    if (!cfg) return null;
    let tier = Math.min(DOLL_AWAKEN_MAX, Math.max(0, item.awakenTier || 0));
    let exp = Math.max(0, item.awakenExp || 0);
    let need = (tier < DOLL_AWAKEN_MAX) ? DOLL_AWAKEN_EXP_NEED[tier] : 0;
    return { def: d, cfg: cfg, tier: tier, exp: exp, need: need };
}

function dollAwakenCardExp(cardMob, dollId) {
    let cfg = DOLL_AWAKEN_MOBS[dollId];
    if (!cfg) return 1;
    if (cfg.mobs.indexOf(cardMob) >= 0) return 3;
    let info = CARD_MOB_INFO[cardMob];
    if (info && info.mob && _mobRaceMajorOf(info.mob) === cfg.raceMajor) return 2;
    return 1;
}

// ⚡ v3.8.115 餵卡即時回應：先只更新覺醒 modal，背包重繪(renderTabs)＋存檔延後到下一幀後合併執行；按鈕防連點
let _dawBusy = false, _dawDeferTimer = null;
function _dollAwakenDeferredRefresh() {
    if (_dawDeferTimer) return;
    let run = () => { _dawDeferTimer = null; try { if (typeof renderTabs === 'function') renderTabs(true); } catch (e) {} try { if (typeof saveGame === 'function') saveGame(); } catch (e) {} };
    _dawDeferTimer = setTimeout(() => (typeof requestAnimationFrame === 'function') ? requestAnimationFrame(() => setTimeout(run, 0)) : run(), 30);
}
function dollAwakenFeed(uid, preferMatch, btn) {
    if (_dawBusy) return;
    _dawBusy = true;
    try {
        var _bs = btn ? Array.from(document.querySelectorAll('.daw-btns button')).map(b => [b, b.disabled]) : [], _bt = btn ? btn.textContent : '';
        if (btn) { _bs.forEach(x => { x[0].disabled = true; }); btn.textContent = '餵卡中…'; }
        _dollAwakenFeedCore(uid, preferMatch);
    } finally {
        _dawBusy = false;
        if (btn && btn.isConnected) { _bs.forEach(x => { x[0].disabled = x[1]; }); btn.textContent = _bt; }   // 未重開 modal（無卡等）→ 還原按鈕
    }
}
function _dollAwakenFeedCore(uid, preferMatch) {
    let item = null, fromEq = false, slot = null;
    if (player.eq && player.eq.doll && player.eq.doll.uid === uid) { item = player.eq.doll; fromEq = true; slot = 'doll'; }
    if (!item) item = player.inv.find(i => i.uid === uid);
    let info = dollAwakenInfo(item);
    if (!info) { logSys('<span class="text-red-400">僅六階魔法娃娃可覺醒。</span>'); return; }
    if (info.tier >= DOLL_AWAKEN_MAX) { logSys('<span class="text-amber-300">已達覺醒 5 階。</span>'); return; }

    // 收集可餵卡片：preferMatch 時優先匹配卡
    let cards = player.inv.filter(it => {
        let dd = DB.items[it.id];
        return dd && dd.eff === 'card' && !it.lock;
    });
    if (preferMatch) {
        let _ex = new Map(); cards.forEach(c => _ex.set(c, dollAwakenCardExp(DB.items[c.id].cardMob, item.id)));   // 預算 EXP（排序結果與原比較式相同）
        cards.sort((a, b) => _ex.get(b) - _ex.get(a));
    }
    if (!cards.length) { logSys('<span class="text-slate-400">背包沒有可餵的怪物卡片。</span>'); return; }

    let need = info.need - info.exp;
    let gained = 0;
    let used = 0;
    let rm = [];
    for (let it of cards) {
        if (gained >= need) break;
        let dd = DB.items[it.id];
        let per = dollAwakenCardExp(dd.cardMob, item.id);
        // 一張一張餵直到滿足
        let cc = it.cnt || 1;
        while (cc > 0 && gained < need) {
            cc--; used++;
            gained += per;
        }
        if (cc <= 0) rm.push(it.uid); else it.cnt = cc;
    }
    if (rm.length) { let _rs = new Set(rm); player.inv = player.inv.filter(i => !_rs.has(i.uid)); }
    if (!used) { logSys('<span class="text-slate-400">沒有消耗任何卡片。</span>'); return; }

    item.awakenExp = (item.awakenExp || 0) + gained;
    let ups = 0;
    while ((item.awakenTier || 0) < DOLL_AWAKEN_MAX) {
        let t = item.awakenTier || 0;
        let needT = DOLL_AWAKEN_EXP_NEED[t];
        if ((item.awakenExp || 0) < needT) break;
        item.awakenExp -= needT;
        item.awakenTier = t + 1;
        ups++;
    }
    if ((item.awakenTier || 0) >= DOLL_AWAKEN_MAX) item.awakenExp = 0;

    if (typeof calcStats === 'function') calcStats();
    logSys(`<span class="text-orange-300">「${info.def.n}」覺醒餵卡 ×${used}（+${gained} EXP）${ups ? ' → 升至覺醒 ' + item.awakenTier + ' 階' : ''}。</span>`);
    if (item.awakenTier >= DOLL_AWAKEN_MAX) {
        logSys(`<span class="text-amber-200 font-bold">解鎖特殊效果【${info.cfg.t5.name}】：${info.cfg.t5.desc}</span>`);
    }
    // 重新開 modal（即時）；背包重繪＋存檔延後
    if (typeof openModal === 'function') openModal(item, fromEq, slot);
    _dollAwakenDeferredRefresh();
}

/** 計算娃娃覺醒對數值欄位的額外加值（在基礎 ed 已計入後再加 floor(base*0.1*tier)） */
function dollAwakenApplyStats(e, ed, p, d) {
    if (!e || !ed || !ed.doll || ed.dollTier !== 6) return;
    let t = Math.min(DOLL_AWAKEN_MAX, e.awakenTier || 0);
    if (t <= 0) return;
    let mul = (DOLL_AWAKEN_STAT_PCT * t) / 100;
    const numKeys = ['hpR','mpR','resFire','resWater','resWind','resEarth','ac','mr','mhp','mmp','dr','mdmg','meleeDmg','rangedDmg','meleeHit','rangedHit','er','extraMp','int','wis','str','dex','con','cha','extraHit','extraDmg'];
    // ac 在迴圈是 d.ac -= ed.ac，這裡額外減（更負＝更好）
    numKeys.forEach(k => {
        if (ed[k] == null || typeof ed[k] !== 'number') return;
        let add = Math.floor(ed[k] * mul);
        if (!add) return;
        if (k === 'ac') d.ac -= add; // 與基礎 ed.ac 同向（正數再減 AC）
        else if (k === 'mhp') p.mhp += add;
        else if (k === 'mmp') p.mmp += add;
        else d[k] = (d[k] || 0) + add;
    });
}

function dollAwakenT5Id(entity) {
    if (!entity || !entity.eq || !entity.eq.doll) return null;
    let it = entity.eq.doll;
    if ((it.awakenTier || 0) < DOLL_AWAKEN_MAX) return null;
    let cfg = DOLL_AWAKEN_MOBS[it.id];
    return cfg ? cfg.t5.id : null;
}

function dollAwakenDrBonus(entity) {
    // 安塔瑞斯 T5：HP<40% → DR+8
    if (dollAwakenT5Id(entity) !== 'earth_guard') return 0;
    let mhp = entity.mhp || 1;
    if ((entity.hp || 0) < mhp * 0.4) return 8;
    return 0;
}

function dollAwakenOnMagicHit(entity, dmg) {
    if (dollAwakenT5Id(entity) !== 'tidal_mana' || dmg <= 0) return;
    if (Math.random() >= 0.08) return;
    let heal = Math.max(1, Math.floor((entity.mmp || 0) * 0.03));
    entity.mp = Math.min(entity.mmp || 0, (entity.mp || 0) + heal);
    if (typeof logCombat === 'function') logCombat(`<span class="text-sky-300">【潮汐回能】恢復 ${heal} MP。</span>`, 'heal');
}

function dollAwakenOnRangedHit(entity, target, dmg) {
    if (dollAwakenT5Id(entity) !== 'gale_echo' || !target || target.curHp <= 0 || dmg <= 0) return;
    if (Math.random() >= 0.08) return;
    let extra = Math.max(1, Math.floor(dmg * 0.25));
    target.curHp -= extra;
    target.justHit = 'wind';
    if (typeof mobWake === 'function') mobWake(target);
    if (typeof logCombat === 'function') logCombat(`<span class="text-lime-300">【疾風餘波】追加 ${extra} 點風屬性傷害。</span>`, 'player-special');
}

function dollAwakenOnMeleeHit(entity, target, dmg) {
    if (dollAwakenT5Id(entity) !== 'dragonfire' || !target || target.curHp <= 0 || dmg <= 0) return;
    if (Math.random() >= 0.08) return;
    // 沿用既有 _burnDot 管線（js/03 tick）
    target._burnDot = {
        left: 30,
        tick: 10,
        dmg: Math.max(5, Math.floor(dmg * 0.1)),
        src: (entity === player) ? 'player' : 'ally'
    };
    if (typeof logCombat === 'function') logCombat(`<span class="text-orange-400">【龍焰餘燼】附加灼燒！</span>`, 'player-special');
}

// ---------- UI：卡片升星模式 ----------
function _csModeBarHtml() {
    return `<div class="cs-mode">
      <button type="button" class="${_cardBookMode === 'collect' ? 'on' : ''}" onclick="cardBookSetMode('collect')">收集圖鑑</button>
      <button type="button" class="${_cardBookMode === 'stars' ? 'on' : ''}" onclick="cardBookSetMode('stars')">升星養成</button>
    </div>`;
}

function renderCardStarBookBody(host, reg) {
    csEnsureStyles();
    ensureCardStars();
    let names = CARD_REGION_MOBS[reg.key] || [];
    let done = names.filter(n => cardStarOf(n) >= CARD_STAR_MAX).length;
    let complete = cardStarRegionComplete(reg.key);
    let bonus = CARD_STAR_MAP_BONUS[reg.key];
    let raceTot = cardStarRaceTotals();
    let raceLines = Object.keys(raceTot).filter(k => raceTot[k] > 0).map(k => {
        let lab = (typeof MOB_RACE_MAJOR_LABELS !== 'undefined' && MOB_RACE_MAJOR_LABELS[k]) ? MOB_RACE_MAJOR_LABELS[k] : k;
        return `${lab}傷害 +${raceTot[k]}%`;
    }).join('　');

    let sum = `<div class="cs-sum">
      <div>★ 升星：每星對該怪<strong>大宗族傷害 +${CARD_STAR_DMG_PER}%</strong>（種族合計上限 +${CARD_STAR_RACE_DMG_CAP}%）、該怪<strong>掉落 +${CARD_STAR_DROP_PER}%</strong>。費用合計 42 張／怪。</div>
      <div class="cs-reserve">保留張數（餵卡不低於此）
        <input type="number" min="0" max="999" value="${player.cardStarReserve|0}" onchange="setCardStarReserve(this.value)">
        <span class="text-slate-500">建議 ≥10（留給娃娃合成／兌換）</span>
      </div>
      <div>本區進度：<b>${done}/${names.length}</b> 達 ★10　${complete ? '<span class="cs-ok">地區完成 ✓ ' + (bonus ? bonus.label : '') + '</span>' : '<span class="cs-warn">未完成（全 ★10 解鎖：' + (bonus ? bonus.label : '—') + '）</span>'}</div>
      <div>種族傷害合計：${raceLines || '—'}</div>
    </div>`;

    let cards = names.map(nm => {
        let info = CARD_MOB_INFO[nm]; let mob = info.mob;
        let st = cardStarOf(nm);
        let owned = cardStarOwnedCount(nm);
        let cost = cardStarCostNext(nm);
        let unlocked = (typeof cardDexScore === 'function') ? cardDexScore(nm) >= 100 : false;
        let avail = Math.max(0, owned - (player.cardStarReserve|0));
        let can = unlocked && st < CARD_STAR_MAX && avail >= cost && cost > 0;
        let starStr = st > 0 ? ('★'.repeat(st) + '☆'.repeat(CARD_STAR_MAX - st)) : '☆'.repeat(CARD_STAR_MAX);
        let _mi = (typeof mobStillImg === 'function') ? mobStillImg(nm, mob.img, false) : { src: (typeof _cardMobImg === 'function' ? _cardMobImg(mob, nm) : ''), fb: [] };
        let thumb = (typeof _codexMobThumbHtml === 'function') ? _codexMobThumbHtml(nm, _mi, !unlocked) : '';
        let maj = _mobRaceMajorOf(mob);
        let majLab = (typeof MOB_RACE_MAJOR_LABELS !== 'undefined' && MOB_RACE_MAJOR_LABELS[maj]) ? MOB_RACE_MAJOR_LABELS[maj] : maj;
        let nmEsc = nm.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        return `<div class="cs-card${st >= CARD_STAR_MAX ? ' max' : ''}">
          ${thumb}
          <div class="cs-name" title="${nm}">${unlocked ? nm : '？？？'}</div>
          <div class="cs-meta">Lv ${mob.lv || '?'} · ${majLab}</div>
          <div class="cs-stars" title="★${st}">${starStr}</div>
          <div class="cs-meta">持有 ${owned}　${st >= CARD_STAR_MAX ? '<span class="cs-ok">滿星</span>' : '下一星 ' + cost + ' 張'}</div>
          <div class="cs-btns">
            <button type="button" ${can ? '' : 'disabled'} onclick="cardStarFeed('${nmEsc}',false)">餵 1 星</button>
            <button type="button" ${can ? '' : 'disabled'} onclick="cardStarFeed('${nmEsc}',true)">餵滿</button>
          </div>
        </div>`;
    }).join('');

    host.innerHTML = _csModeBarHtml() + sum + `<div class="cs-grid">${cards || '<div class="text-slate-500 p-8">此地區暫無怪物。</div>'}</div>`;
}

function dollAwakenModalHtml(item) {
    let info = dollAwakenInfo(item);
    if (!info) return '';
    csEnsureStyles();
    let pct = info.need > 0 ? Math.min(100, Math.round(info.exp / info.need * 100)) : 100;
    let nextPreview = info.tier < DOLL_AWAKEN_MAX
        ? `下一階：娃娃數值再 +${DOLL_AWAKEN_STAT_PCT}%（累計 +${DOLL_AWAKEN_STAT_PCT * (info.tier + 1)}%）`
        : `<span class="daw-t5">【${info.cfg.t5.name}】${info.cfg.t5.desc}</span>`;
    let uid = item.uid;
    return `<div class="daw-box">
      <h4>🪆 六星覺醒　${info.tier}/${DOLL_AWAKEN_MAX} 階</h4>
      <div>EXP ${info.tier >= DOLL_AWAKEN_MAX ? 'MAX' : (info.exp + ' / ' + info.need)}</div>
      <div class="daw-bar"><i style="width:${pct}%"></i></div>
      <div>${nextPreview}</div>
      <div style="margin-top:4px;color:#fdba74">餵卡：對應龍卡 ×3 EXP／龍族卡 ×2／其他卡 ×1。費用約 ${DOLL_AWAKEN_EXP_NEED.reduce((a,b)=>a+b,0)} EXP 滿覺醒。</div>
      <div class="daw-btns">
        <button type="button" ${info.tier >= DOLL_AWAKEN_MAX ? 'disabled' : ''} onclick="dollAwakenFeed('${uid}',true,this)">優先餵對應卡</button>
        <button type="button" ${info.tier >= DOLL_AWAKEN_MAX ? 'disabled' : ''} onclick="dollAwakenFeed('${uid}',false,this)">餵任意卡至升級</button>
      </div>
    </div>`;
}

// ---------- 掛接既有 renderCardBook / openModal ----------
function _patchCardBookRender() {
    if (typeof renderCardBook !== 'function') return;
    if (renderCardBook._csPatched) return;
    let orig = renderCardBook;
    window.renderCardBook = function () {
        csEnsureStyles();
        if (_cardBookMode === 'stars') {
            let host = document.getElementById('card-book-body'); if (!host) return;
            let tabHost = document.getElementById('card-book-tabs');
            if (tabHost && typeof CARD_REGIONS !== 'undefined') {
                tabHost.innerHTML = CARD_REGIONS.map(reg => {
                    let active = (reg.key === _cardBookRegion);
                    let done = cardStarRegionComplete(reg.key);
                    return `<button onclick="cardBookTab('${reg.key}')" class="btn px-3 py-1.5 text-sm font-bold whitespace-nowrap ${active ? 'bg-amber-800 border-amber-500 text-amber-100' : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700'}">${reg.name}${done ? ' ★' : ''}</button>`;
                }).join('');
            }
            let reg = CARD_REGIONS.find(r => r.key === _cardBookRegion) || CARD_REGIONS[0];
            renderCardStarBookBody(host, reg);
            return;
        }
        orig();
        // 在收集模式也插入模式切換列
        let host = document.getElementById('card-book-body');
        if (host && host.firstChild) {
            let bar = document.createElement('div');
            bar.innerHTML = _csModeBarHtml();
            host.insertBefore(bar.firstChild, host.firstChild);
        }
    };
    window.renderCardBook._csPatched = true;
}

function _patchOpenModal() {
    if (typeof openModal !== 'function') return;
    if (openModal._csPatched) return;
    let orig = openModal;
    window.openModal = function (item, isEq, slot) {
        orig(item, isEq, slot);
        try {
            let html = dollAwakenModalHtml(item);
            if (!html) return;
            let desc = document.getElementById('modal-item-desc');
            if (desc) desc.insertAdjacentHTML('beforeend', html);
        } catch (e) {}
    };
    window.openModal._csPatched = true;
}

function _bootPatches() {
    ensureCardStars();
    _patchCardBookRender();
    _patchOpenModal();
}
if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _bootPatches);
    else _bootPatches();
    // 晚於其他腳本再補一次（15/10 可能後載）
    setTimeout(_bootPatches, 0);
}

// exports
window.CARD_STAR_COST = CARD_STAR_COST;
window.CARD_STAR_MAX = CARD_STAR_MAX;
window.CARD_STAR_MAP_BONUS = CARD_STAR_MAP_BONUS;
window.DOLL_AWAKEN_MOBS = DOLL_AWAKEN_MOBS;
window.DOLL_AWAKEN_EXP_NEED = DOLL_AWAKEN_EXP_NEED;
window.ensureCardStars = ensureCardStars;
window.cardStarOf = cardStarOf;
window.cardStarFeed = cardStarFeed;
window.setCardStarReserve = setCardStarReserve;
window.cardBookSetMode = cardBookSetMode;
window.cardStarDmgMult = cardStarDmgMult;
window.cardStarDropMult = cardStarDropMult;
window.cardStarRaceTotals = cardStarRaceTotals;
window.cardStarRegionComplete = cardStarRegionComplete;
window.cardStarMapBonusExpPct = cardStarMapBonusExpPct;
window.cardStarApplyStatBonus = cardStarApplyStatBonus;
window.cardStarOwnedCount = cardStarOwnedCount;
window.dollAwakenInfo = dollAwakenInfo;
window.dollAwakenFeed = dollAwakenFeed;
window.dollAwakenApplyStats = dollAwakenApplyStats;
window.dollAwakenDrBonus = dollAwakenDrBonus;
window.dollAwakenOnMagicHit = dollAwakenOnMagicHit;
window.dollAwakenOnRangedHit = dollAwakenOnRangedHit;
window.dollAwakenOnMeleeHit = dollAwakenOnMeleeHit;
window.dollAwakenT5Id = dollAwakenT5Id;
window.dollAwakenModalHtml = dollAwakenModalHtml;

})();
