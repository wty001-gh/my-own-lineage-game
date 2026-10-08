// ========== 席琳附魔・戰鬥實裝（玩家＋協力傭兵）==========
// 武器：we_*（階層 t、吃 +en）；防具／飾品：ae_*（分部位獨池、最多 2；舊 se_* 遷移）。
// 🧮 v3.8.105：同效果最多 2 件疊加（取最高 2 件·各自全額）；第 3 件起不生效。見 seEquippedMap／seSum／seProc。
// 一般攻擊命中＝主目標普攻一揮（唔跟穿透／連射／三重矢／屠宰者）。

const SE_DEBUFF_KEYS = [
    'freeze', 'stun', 'stone', 'sleep', 'paralyze', 'poison', 'blind', 'weaken', 'disease',
    'vacuum', 'broken', 'slow', 'mrhalf', 'magicseal', 'fragile', 'shatter', 'armorbreak',
    'confuse', 'panic', 'guardbreak', 'terror', 'doom', 'muddywater', 'bind', 'sunder'
];
const SE_INCANT_POOL = [
    { kind: 'magicseal', n: '魔法封印', dur: 16 },
    { kind: 'stone', n: '木乃伊的詛咒', dur: 6 },
    { kind: 'broken', n: '壞物術', dur: 25 },
    { kind: 'weaken', n: '弱化術', dur: 30 },
    { kind: 'disease', n: '疾病術', dur: 30 }
];
const SE_WARHEX_POOL = [
    { kind: 'stun', n: '擊暈', dur: 3 },
    { kind: 'slow', n: '緩速', dur: 12 },
    { kind: 'paralyze', n: '麻痺', dur: 4 }
];

function seWho(who) {
    if (who) return who;
    return (typeof player !== 'undefined') ? player : null;
}
function seIsAlly(who) {
    return !!(who && who._allyName);
}
function seLabel(who) {
    return seIsAlly(who) ? (`協力·${who._allyName}`) : '你';
}
function seRefreshWhoStats(who) {
    who = seWho(who);
    if (!who) return;
    try {
        if (seIsAlly(who) && typeof _allyLevelRecompute === 'function') _allyLevelRecompute(who);
        else if (typeof calcStats === 'function') calcStats();
    } catch (e) {}
}
function seCanon(id) {
    if (typeof _seCanonId === 'function') return _seCanonId(id);
    if (id === 'se_vacuum') return 'se_incant';
    if (id === 'se_blind') return 'se_lethal';
    if (id === 'se_crystalward') return 'ae_crystal';
    if (id === 'se_thorns') return 'ae_thorns';
    if (id === 'se_aegis') return 'ae_aegis';
    if (id === 'se_lastlight') return 'ae_lastlight';
    if (id === 'se_veil') return 'ae_veil';
    if (id === 'se_ghoststep') return 'ae_ghoststep';
    if (id === 'se_crystal') return 'ae_crystal';
    return id;
}

// ===== 🧮 v3.8.105 席琳附魔疊加規則：同效果最多 2 件生效（取最高 2 件·各自全額）=====
//  · 收集全部已裝備部位嘅附魔實例（唔再 dedupe）→ 依 階層↓、主數值↓、強化↓ 排序 → 頭 2 件 active，第 3 件起不生效
//  · 修正舊 bug：舊版 seen[id] 只認 eq 迭代第一件（T1 戒指可以遮住 T3 戒指）
//  · 數值型＝兩件相加；觸發機率＝兩件機率相加（命中後按機率加權揀邊件嘅傷害／階層）
const SE_STACK_MAX = 2;
function _seTv(t, a, b, c) { return t >= 3 ? c : (t >= 2 ? b : a); }
/** 每件附魔嘅單件數值（與 js/35 desc 一致）。v＝主數值（排序用）；其他欄位＝副數值 */
const SE_VAL = {
    we_pierce:   (t, en) => ({ v: _seTv(t, 0, 15, 25) }),                       // 硬皮增傷 %
    we_undead:   (t, en) => ({ v: _seTv(t, 5.5, 10.5, 21) + Math.min(10, Math.floor(en / 2)) }),
    we_drain:    (t, en) => { let p = _seTv(t, 3, 5, 7); if (en >= 7) p = Math.min(10, p + 3); return { v: p }; },
    we_hpleech:  (t, en) => ({ v: _seTv(t, 8, 14, 22) + Math.floor(en / 3) }),
    we_mpdrain:  (t, en) => ({ v: _seTv(t, 2, 4, 6) + Math.max(0, en - 6) }),
    we_sunder:   (t, en) => ({ v: _seTv(t, 8, 12, 16), r: _seTv(t, 8, 12, 16) }),
    we_execute:  (t, en) => ({ v: _seTv(t, 15, 20, 25) }),
    we_incant:   (t, en) => ({ v: _seTv(t, 10, 15, 20), r: _seTv(t, 10, 15, 20) }),
    we_lethal:   (t, en) => ({ v: _seTv(t, 3, 5, 10) }),
    we_dualhit:  (t, en) => { let r = _seTv(t, 3, 5, 7); if (en >= 10) r = Math.min(10, r + 3); return { v: r, r: r }; },
    we_elechase: (t, en) => ({ v: _seTv(t, 10, 12, 15), r: _seTv(t, 10, 12, 15), dmg: _seTv(t, 20, 35, 50) + en }),
    we_warhex:   (t, en) => ({ v: _seTv(t, 8, 12, 16), r: _seTv(t, 8, 12, 16) }),
    we_skillfang:(t, en) => ({ v: _seTv(t, 5, 7, 9), r: _seTv(t, 5, 7, 9), ir: _seTv(t, 10, 15, 20) }),
    we_enhance:  (t, en) => ({ v: en * _seTv(t, 1, 2, 3) }),
    we_critfury: (t, en) => ({ v: _seTv(t, 15, 25, 35), sec: _seTv(t, 3, 4, 5) }),
    ae_thorns:   (t, en) => ({ v: Math.max(1, _seTv(t, 10, 18, 28) + Math.floor(en / 2)) }),
    ae_aegis:    (t, en) => ({ v: _seTv(t, 15, 22, 30) }),
    ae_crystal:  (t, en) => ({ v: _seTv(t, 8, 12, 16), sec: _seTv(t, 60, 50, 45) }),
    ae_lastlight:(t, en) => ({ v: -_seTv(t, 10, 8, 6), min: _seTv(t, 10, 8, 6) }),
    ae_ironhide: (t, en) => ({ v: _seTv(t, 3, 5, 8) }),
    ae_hpregen:  (t, en) => ({ v: _seTv(t, 3, 5, 8) + Math.floor(en / 4) }),
    ae_fortify:  (t, en) => ({ v: _seTv(t, 1, 2, 3) }),
    ae_vitalplate:(t, en) => ({ v: _seTv(t, 30, 60, 100) + en * 2 }),
    ae_secondwind:(t, en) => ({ v: _seTv(t, 3, 5, 8) }),
    ae_veil:     (t, en) => ({ v: _seTv(t, 6, 10, 14) }),
    ae_ward:     (t, en) => ({ v: _seTv(t, 3, 5, 8) + Math.floor(en / 5) }),
    ae_ghoststep:(t, en) => ({ v: _seTv(t, 50, 70, 90) + Math.floor(en / 2), mp: _seTv(t, 10, 14, 18) }),
    ae_shadowcloak:(t, en) => ({ v: _seTv(t, 3, 5, 8) + Math.floor(en / 5) }),
    ae_manaweave:(t, en) => ({ v: _seTv(t, 2, 3, 5) + Math.floor(en / 5) }),
    ae_windcut:  (t, en) => ({ v: _seTv(t, 15, 25, 40) + Math.floor(en / 2) }),
    ae_mut_heal: (t, en) => ({ v: _seTv(t, 8, 12, 18) }),
    ae_mut_shield:(t, en) => ({ v: _seTv(t, 8, 14, 20) }),
    ae_clarity:  (t, en) => ({ v: _seTv(t, 3, 5, 8) + Math.floor(en / 5) }),
    ae_focus:    (t, en) => ({ v: _seTv(t, 2, 4, 6) + Math.floor(en / 5) }),
    ae_mindveil: (t, en) => ({ v: _seTv(t, 3, 5, 8) }),
    ae_glovehit: (t, en) => { let r = _seTv(t, 4, 6, 8); if (en >= 10) r = Math.min(10, r + 2); return { v: r, r: r, pct: _seTv(t, 0.20, 0.28, 0.35) }; },
    ae_grip:     (t, en) => ({ v: _seTv(t, 2, 4, 6) + Math.floor(en / 5) }),
    ae_fistvine: (t, en) => ({ v: _seTv(t, 4, 8, 12) + Math.floor(en / 2) }),
    ae_razor:    (t, en) => ({ v: _seTv(t, 1, 2, 4) }),
    ae_puncture: (t, en) => ({ v: _seTv(t, 8, 12, 16), r: _seTv(t, 8, 12, 16) }),
    ae_bloodlet: (t, en) => ({ v: _seTv(t, 1, 2, 3) }),
    ae_bootpace: (t, en) => ({ v: _seTv(t, 3, 5, 8) }),
    ae_quickstep:(t, en) => ({ v: _seTv(t, 2, 4, 6) + Math.floor(en / 5) }),
    ae_earthbind:(t, en) => ({ v: _seTv(t, 5, 8, 12), r: _seTv(t, 5, 8, 12) }),
    ae_sprint:   (t, en) => ({ v: _seTv(t, 2, 4, 6) }),
    ae_stomp:    (t, en) => ({ v: _seTv(t, 5, 8, 12), r: _seTv(t, 5, 8, 12) }),
    ae_trail:    (t, en) => ({ v: _seTv(t, 10, 15, 20) }),
    ae_bulwark:  (t, en) => ({ v: _seTv(t, 2, 3, 4) + (en >= 10 ? 1 : 0) }),
    ae_mirror:   (t, en) => ({ v: _seTv(t, 10, 16, 24) + Math.floor(en / 2) }),
    ae_guardheal:(t, en) => ({ v: _seTv(t, 5, 9, 14) + Math.floor(en / 3) }),
    ae_parry:    (t, en) => ({ v: _seTv(t, 3, 5, 8) }),
    ae_bastion:  (t, en) => ({ v: _seTv(t, 1, 2, 3) }),
    ae_rebound:  (t, en) => ({ v: _seTv(t, 8, 12, 16), r: _seTv(t, 8, 12, 16), dmg: _seTv(t, 8, 14, 22) + Math.floor(en / 2) }),
    ae_bloodring:(t, en) => ({ v: _seTv(t, 2, 3, 4) }),
    ae_beltbulk: (t, en) => ({ v: Math.min(20, _seTv(t, 5, 8, 10) + Math.floor(en / 2)) }),
    ae_mpregen:  (t, en) => ({ v: _seTv(t, 2, 3, 5) + Math.floor(en / 5) }),
    ae_charmhit: (t, en) => ({ v: _seTv(t, 1, 2, 3) + Math.floor(en / 6) }),
    ae_soulwell: (t, en) => ({ v: _seTv(t, 20, 40, 70) + en }),
    ae_lifetap:  (t, en) => ({ v: _seTv(t, 20, 35, 50), r: 4, dmg: _seTv(t, 20, 35, 50) })
};
const SE_ALIAS = {
    se_soulleech: 'we_drain', se_sunder: 'we_sunder', se_execute: 'we_execute',
    se_incant: 'we_incant', se_lethal: 'we_lethal',
    se_thorns: 'ae_thorns', se_aegis: 'ae_aegis', se_lastlight: 'ae_lastlight',
    se_veil: 'ae_veil', se_ghoststep: 'ae_ghoststep', se_crystal: 'ae_crystal',
    se_crystalward: 'ae_crystal'
};
function seResolveId(id) {
    id = seCanon(id);
    return SE_ALIAS[id] || id;
}
function seVal(id, t, en) {
    let f = SE_VAL[id];
    let o = f ? f(t || 1, en || 0) : null;
    return o || { v: 0 };
}
function _seKnownId(id) {
    if (typeof SHERINE_ENCH !== 'undefined' && SHERINE_ENCH[id]) return true;
    if (typeof WEAPON_ENCHANT !== 'undefined' && WEAPON_ENCHANT[id]) return true;
    if (typeof GEAR_ENCHANT !== 'undefined' && GEAR_ENCHANT[id]) return true;
    return typeof SHERINE_ENCH === 'undefined';
}
/** 所有已裝備附魔實例（含第 3 件起），依 id 分組並排序：{ id: [{id,t,en,fromWpn,slot,item,val,rank,active}] } */
function seEquippedMap(who) {
    who = seWho(who);
    let map = {};
    if (!who || !who.eq) return map;
    for (let k in who.eq) {
        let it = who.eq[k];
        if (!it || !Array.isArray(it.se) || !it.se.length) continue;
        let d = (typeof DB !== 'undefined' && DB.items) ? DB.items[it.id] : null;
        let fromWpn = !!(d && d.type === 'wpn');
        let list = (typeof sherineEnchList === 'function') ? sherineEnchList(it) : it.se;
        let enVal = 0;
        if (fromWpn) enVal = (typeof capWpnEn === 'function') ? capWpnEn(it.en || 0) : (it.en || 0);
        else if (typeof capEn === 'function') enVal = capEn(it.en || 0, d);
        else enVal = it.en || 0;
        let seenInItem = {};
        list.forEach(raw => {
            let id, t = 1;
            if (typeof raw === 'string') { id = seResolveId(raw); }
            else if (raw && raw.id) { id = seResolveId(raw.id); t = Math.max(1, Math.min(3, raw.t || 1)); }
            else return;
            if (seenInItem[id] || !_seKnownId(id)) return;
            seenInItem[id] = true;
            (map[id] = map[id] || []).push({ id: id, t: t, fromWpn: fromWpn, en: enVal, slot: k, item: it, val: seVal(id, t, enVal) });
        });
    }
    for (let id in map) {
        map[id].sort((a, b) => (b.t - a.t) || ((b.val.v || 0) - (a.val.v || 0)) || ((b.en || 0) - (a.en || 0)));
        map[id].forEach((e, i) => { e.rank = i; e.active = i < SE_STACK_MAX; });
    }
    return map;
}
/** 某效果所有實例（排序後；含不生效） */
function seAllInstances(id, who) {
    let m = seEquippedMap(who);
    return m[seResolveId(id)] || [];
}
/** 某效果生效實例（最多 2 件） */
function seActive(id, who) {
    return seAllInstances(id, who).slice(0, SE_STACK_MAX);
}
/** 生效實例某欄位總和（預設主數值 v） */
function seSum(id, who, key) {
    key = key || 'v';
    return seActive(id, who).reduce((s, e) => s + (Number(e.val[key]) || 0), 0);
}
/** 觸發：機率＝生效實例 r 相加（%）；成功時按機率加權揀出觸發嘅實例，否則 null */
function seProc(id, who, rateKey) {
    rateKey = rateKey || 'r';
    let act = seActive(id, who);
    if (!act.length) return null;
    let total = act.reduce((s, e) => s + (Number(e.val[rateKey]) || 0), 0);
    if (!(total > 0)) return null;
    let roll = Math.random() * 100;
    if (roll >= total) return null;
    for (let i = 0; i < act.length; i++) {
        roll -= (Number(act[i].val[rateKey]) || 0);
        if (roll < 0) return act[i];
    }
    return act[act.length - 1];
}
/** 舊介面：生效實例平鋪列表（每效果最多 2 件；修正最高階） */
function seEquippedEntries(who) {
    let m = seEquippedMap(who), out = [];
    for (let id in m) m[id].forEach(e => { if (e.active) out.push({ id: e.id, t: e.t, fromWpn: e.fromWpn, en: e.en, slot: e.slot, rank: e.rank }); });
    return out;
}
function seEquippedIds(who) {
    let m = seEquippedMap(who);
    return Object.keys(m);
}
function seHas(id, who) {
    return seAllInstances(id, who).length > 0;
}
/** 最高階（修正：唔再受 eq 迭代次序影響） */
function seTier(id, who) {
    let a = seAllInstances(id, who);
    return a.length ? (a[0].t || 1) : 0;
}
/** 最高順位實例嘅強化值 */
function seGearEn(who, id) {
    let a = seAllInstances(id, who);
    return a.length ? (a[0].en || 0) : 0;
}
/** 某件裝備上嘅某附魔，係咪因為已達 2 件上限而不生效（只對 who 已裝備嘅物品） */
function seInstanceInactive(item, id, who) {
    who = seWho(who);
    if (!item || !who || !who.eq) return false;
    let a = seAllInstances(id, who);
    let hit = a.find(e => e.item === item || (item.uid != null && e.item && e.item.uid === item.uid));
    return !!(hit && !hit.active);
}
/** 疊加規則短註（工具提示／克洛托） */
const SE_STACK_NOTE = {
    we_pierce: '2 件：無視硬皮不重複；硬皮增傷相加',
    we_undead: '2 件：各自擲骰相加',
    we_execute: '2 件：增傷％相加',
    we_critfury: '2 件：攻速相加，持續取較長',
    we_skillfang: '2 件：機率相加（共用 1.5 秒冷卻）',
    we_mpdrain: '2 件：數值相加（每揮仍只觸發一次）',
    ae_crystal: '2 件：護盾％相加，間隔取較短',
    ae_lastlight: '2 件：不會重複觸發；冷卻 −30%',
    ae_secondwind: '2 件：回復％相加（冷卻不變）',
    ae_mut_heal: '2 件：倍率加成相加',
    ae_mut_shield: '2 件：倍率加成相加',
    ae_trail: '2 件：攻速相加',
    ae_bastion: '2 件：需裝盾，減傷相加',
    ae_lifetap: '2 件：機率相加'
};
function seStackNote(id) {
    id = seResolveId(id);
    if (SE_STACK_NOTE[id]) return SE_STACK_NOTE[id];
    let f = SE_VAL[id];
    if (f) { let o = f(1, 0); if (o && o.r != null) return '2 件：機率相加'; }
    return '2 件：數值相加';
}
/** we_undead：每件生效實例各自擲骰（js/03 玩家／js/06 傭兵共用） */
function seUndeadRoll(d) {
    let list = d && Array.isArray(d.seUndeadList) ? d.seUndeadList : (d && d.seUndeadTier ? [{ t: d.seUndeadTier, en: d.seUndeadEn || 0 }] : []);
    let s = 0;
    list.forEach(e => {
        let _ut = e.t || 1;
        if (_ut >= 3) s += roll(2, 20);
        else if (_ut >= 2) s += roll(1, 20);
        else s += roll(1, 10);
        s += Math.min(10, Math.floor((e.en || 0) / 2));
    });
    return s;
}
function seWpnEn(who) {
    who = seWho(who);
    if (!who || !who.eq || !who.eq.wpn) return 0;
    let en = who.eq.wpn.en || 0;
    return (typeof capWpnEn === 'function') ? capWpnEn(en) : en;
}

function seAlive(who) {
    who = seWho(who);
    if (!who) return false;
    if (seIsAlly(who)) return !who._downed && (who.curHp || 0) > 0;
    return !who.dead;
}
function seGetHp(who) {
    who = seWho(who);
    return seIsAlly(who) ? (who.curHp || 0) : (who.hp || 0);
}
function seGetMhp(who) {
    who = seWho(who);
    return who.mhp || 1;
}
function seGetMp(who) {
    who = seWho(who);
    return who.mp || 0;
}
function seGetMmp(who) {
    who = seWho(who);
    return who.mmp || 0;
}
function seAddHp(who, amt) {
    who = seWho(who);
    if (!(amt > 0)) return 0;
    let mhp = seGetMhp(who);
    if (seIsAlly(who)) {
        let before = who.curHp || 0;
        who.curHp = Math.min(mhp, before + amt);
        return who.curHp - before;
    }
    let before = who.hp || 0;
    who.hp = Math.min(mhp, before + amt);
    return who.hp - before;
}
function seAddMp(who, amt) {
    who = seWho(who);
    if (!(amt > 0)) return 0;
    let mmp = seGetMmp(who);
    let before = who.mp || 0;
    who.mp = Math.min(mmp, before + amt);
    return who.mp - before;
}

function seApplyStats(d, p) {
    if (!d || !p) return;
    // v3.8.105：d 係重用物件，先清走上一輪席琳旗標（舊版卸下武器後旗標會殘留；sePhysDr 會每輪累加）
    d.seIgnHardSkin = false; d.seHardSkinMult = 0; d.seDblStrikeRate = 0; d.seDblStrikeMult = 0;
    d.seEnhanceFlat = 0; d.seUndeadTier = 0; d.seUndeadEn = 0; d.seUndeadList = null; d.seExecuteAmp = 0; d.sePhysDr = 0;
    let S = (id) => seSum(id, p);
    let lethal = S('we_lethal');
    if (lethal > 0) {
        d.meleeCrit = (d.meleeCrit || 0) + lethal;
        d.rangedCrit = (d.rangedCrit || 0) + lethal;
        d.magicCrit = (d.magicCrit || 0) + lethal;
    }

    // ---- 防具／飾品（分部位獨池；同效果最多 2 件相加）----
    let ag = S('ae_aegis');
    if (ag > 0) d.crushDr = (d.crushDr || 0) + ag;
    let ih = S('ae_ironhide');
    if (ih > 0) d.sePhysDr = (d.sePhysDr || 0) + ih;
    let ft = S('ae_fortify');
    if (ft > 0) d.ac = (d.ac || 0) - ft;
    let bw = S('ae_bulwark');
    if (bw > 0) d.dr = (d.dr || 0) + bw;
    let bs = S('ae_bastion');
    if (bs > 0 && p.eq && p.eq.shield) d.dr = (d.dr || 0) + bs;
    let wd = S('ae_ward');
    if (wd > 0) {
        d.resFire = (d.resFire || 0) + wd;
        d.resWater = (d.resWater || 0) + wd;
        d.resWind = (d.resWind || 0) + wd;
        d.resEarth = (d.resEarth || 0) + wd;
    }
    let hr = S('ae_hpregen');
    if (hr > 0) d.hpR = (d.hpR || 0) + hr;
    let mr = S('ae_mpregen');
    if (mr > 0) d.mpR = (d.mpR || 0) + mr;
    let mw = S('ae_manaweave');
    if (mw > 0) d.mpR = (d.mpR || 0) + mw;
    let qs = S('ae_quickstep');
    if (qs > 0) d.er = (d.er || 0) + qs;
    let sc = S('ae_shadowcloak');
    if (sc > 0) d.er = (d.er || 0) + sc;
    let bp = S('ae_bootpace');
    if (bp > 0) d.atkSpdPct = (d.atkSpdPct || 0) + bp;
    let sp = S('ae_sprint');
    if (sp > 0) d.atkSpdPct = (d.atkSpdPct || 0) + sp;
    // 殘跡：迴避後短時攻速（flag 由 seOnDodge 寫入）
    if (p._seTrailUntil && typeof state !== 'undefined' && p._seTrailUntil > state.ticks) {
        d.atkSpdPct = (d.atkSpdPct || 0) + (p._seTrailPct || 0);
    }
    let gp = S('ae_grip');
    if (gp > 0) d.meleeHit = (d.meleeHit || 0) + gp;
    let rz = S('ae_razor');
    if (rz > 0) {
        d.meleeCrit = (d.meleeCrit || 0) + rz;
        d.rangedCrit = (d.rangedCrit || 0) + rz;
    }
    let cl = S('ae_clarity');
    if (cl > 0) d.mr = (d.mr || 0) + cl;
    let fc = S('ae_focus');
    if (fc > 0) {
        if (typeof d.magicHit === 'number' || 'magicHit' in d) d.magicHit = (d.magicHit || 0) + fc;
        else d.extraHit = (d.extraHit || 0) + fc;
    }
    let ch = S('ae_charmhit');
    if (ch > 0) {
        d.meleeHit = (d.meleeHit || 0) + ch;
        d.rangedHit = (d.rangedHit || 0) + ch;
    }
    let sw = S('ae_soulwell');
    if (sw > 0) {
        p.mmp = (p.mmp || 0) + sw;
        p._seSoulwellBonus = sw;
    } else {
        p._seSoulwellBonus = 0;
    }
    p._seBeltbulkTier = seTier('ae_beltbulk', p);
    p._seBeltbulkEn = seGearEn(p, 'ae_beltbulk');
    p._seBeltbulkPct = S('ae_beltbulk');
    p._seVitalplateTier = seTier('ae_vitalplate', p);
    p._seVitalplateEn = seGearEn(p, 'ae_vitalplate');
    p._seVitalplateFlat = S('ae_vitalplate');
    // 戰鬥旗標（getPhysicalDmg / ally 讀取）
    if (seHas('we_pierce', p)) {
        d.seIgnHardSkin = true;
        d.seHardSkinMult = 1 + S('we_pierce') / 100;
    }
    let dh = S('we_dualhit');
    if (dh > 0) {
        d.seDblStrikeRate = dh;
        d.seDblStrikeMult = 1.5;
    }
    let enh = S('we_enhance');
    if (enh > 0) d.seEnhanceFlat = enh;
    let ud = seActive('we_undead', p);
    if (ud.length) {
        d.seUndeadTier = ud[0].t;
        d.seUndeadEn = ud[0].en || 0;
        d.seUndeadList = ud.map(e => ({ t: e.t, en: e.en || 0 }));
    }
    let xa = S('we_execute');
    if (xa > 0) d.seExecuteAmp = 1 + xa / 100;
}

function seDrainPct(who) {
    return seSum('we_drain', who) / 100;
}


/** 席琳「魔汲」we_mpdrain：恢復 MP。每揮／每次施法最多一次（_seDidMpDrain）。
 *  可由普攻命中、魔擊主擊、傭兵施法後呼叫。擴散魔擊不應呼叫。 */
function seApplyMpDrain(who) {
    who = seWho(who);
    if (!who || !seAlive(who)) return 0;
    if (who._seDidMpDrain) return 0;
    let amt = seSum('we_mpdrain', who);
    if (!(amt > 0)) return 0;
    let got = seAddMp(who, amt);
    if (got > 0) {
        who._seDidMpDrain = true;
        let tag = seIsAlly(who) ? `協力·${who._allyName}·` : '';
        logCombat(`<span class="c-sherine font-bold">【${tag}魔汲】</span>恢復 ${got} MP。`, 'heal');
        if (!seIsAlly(who) && typeof updateUI === 'function') { try { updateUI(); } catch (e) {} }
    }
    return got;
}

function seOnNormalHit(target, dmg, who) {
    who = seWho(who);
    if (!who || !seAlive(who) || !target || !(dmg > 0)) return;
    let tag = seIsAlly(who) ? `協力·${who._allyName}·` : '';

    // 噬魂（2 件％相加）
    let vp = seDrainPct(who);
    if (vp > 0) {
        let heal = Math.floor(dmg * vp);
        let got = seAddHp(who, heal);
        if (got > 0) logCombat(`<span class="c-sherine font-bold">【${tag}噬魂】</span>吸取了 ${got} 點生命。`, 'heal');
    }

    // 汲血（2 件相加）
    let hl = seSum('we_hpleech', who);
    if (hl > 0) {
        let got = seAddHp(who, hl);
        if (got > 0) logCombat(`<span class="c-sherine font-bold">【${tag}汲血】</span>恢復 ${got} HP。`, 'heal');
    }

    // 魔汲（抽出 seApplyMpDrain：魔擊主擊／施法後亦可觸發；每揮一次）
    seApplyMpDrain(who);

    if (target.curHp <= 0) return;

    // 裂甲（機率相加）
    if (seProc('we_sunder', who) && typeof applyMobStatus === 'function') {
        applyMobStatus(target, { kind: 'sunder', force: true, dur: 5 }, tag + '裂甲');
    }

    // 處刑：改為低血傷害增幅（seApplyStats → seExecuteAmp；getPhysicalDmg／ally 結算）

    // 屬追（武器當前屬性，無則火；機率相加，傷害取觸發嗰件）
    if (target.curHp > 0) {
        let ep = seProc('we_elechase', who);
        if (ep) {
            let edmg = ep.val.dmg || 0;
            let ele = 'fire';
            try {
                let wInst = (ep.item) || (who.eq && who.eq.wpn);
                let wDef = wInst && DB.items[wInst.id];
                if (typeof getWpnEle === 'function') ele = getWpnEle(wInst, wDef, who) || 'fire';
                else if (wDef && wDef.ele) ele = wDef.ele;
            } catch (e) {}
            if (!ele || ele === 'none') ele = 'fire';
            target.curHp -= edmg;
            target.justHit = ele;
            if (typeof mobWake === 'function') mobWake(target);
            let eleN = ({ fire: '火', water: '水', wind: '風', earth: '地' })[ele] || ele;
            logCombat(`<span class="c-sherine font-bold">【${tag}屬追】</span>追擊 ${edmg} 點${eleN}屬性傷害。`, 'player-special');
        }
    }

    // 戰咒（機率相加）
    if (target.curHp > 0 && seProc('we_warhex', who)) {
        let pick = SE_WARHEX_POOL[Math.floor(Math.random() * SE_WARHEX_POOL.length)];
        if (typeof applyMobStatus === 'function') {
            applyMobStatus(target, { kind: pick.kind, force: true, dur: pick.dur }, tag + '戰咒・' + pick.n);
        }
    }

    // 技能附咒（共享短 CD，避免每擊連環）
    seTrySkillProc(who, target, tag);


    // 手套・連截（弱於武器追擊；機率相加，比例取觸發嗰件）
    if (target.curHp > 0) {
        let gp = seProc('ae_glovehit', who);
        if (gp) {
            let extra = Math.max(1, Math.floor(dmg * (gp.val.pct || 0.2)));
            target.curHp -= extra;
            target.justHit = 'melee';
            logCombat(`<span class="c-sherine font-bold">【${tag}連截】</span>追加 ${extra} 傷害。`, 'player-special');
        }
    }
    // 蔓拳（2 件相加）
    let fv = seSum('ae_fistvine', who);
    if (fv > 0 && target.curHp > 0) {
        target.curHp -= fv;
        logCombat(`<span class="c-sherine font-bold">【${tag}蔓拳】</span>追加 ${fv} 固定傷害。`, 'player-special');
    }
    // 穿刺（手套・弱裂甲；機率相加）
    if (target.curHp > 0 && seProc('ae_puncture', who) && typeof applyMobStatus === 'function') {
        applyMobStatus(target, { kind: 'sunder', force: true, dur: 5 }, tag + '穿刺');
    }
    // 放血（弱於噬魂；％相加）
    let bl = seSum('ae_bloodlet', who);
    if (bl > 0 && dmg > 0) {
        let got = seAddHp(who, Math.floor(dmg * bl / 100));
        if (got > 0) logCombat(`<span class="c-sherine font-bold">【${tag}放血】</span>吸取了 ${got} 點生命。`, 'heal');
    }
    // 命汲（飾品・小機率固定回血；機率相加）
    let lp = seProc('ae_lifetap', who);
    if (lp) {
        let got = seAddHp(who, lp.val.dmg || 0);
        if (got > 0) logCombat(`<span class="c-sherine font-bold">【${tag}命汲】</span>恢復 ${got} HP。`, 'heal');
    }
    // 狂怒：由 grantCritFuryHaste 路徑外掛；此處若爆擊旗在 who 上
}

function seTrySkillProc(who, target, tag) {
    if (!who || !target || target.curHp <= 0) return;
    let cdKey = '_seSkillProcCd';
    if ((who[cdKey] || 0) > (typeof state !== 'undefined' ? state.ticks : 0)) return;
    if (!seHas('we_skillfang', who)) return;
    let fp = seProc('we_skillfang', who);   // 2 件機率相加；觸發嗰件決定強化／咒言機率
    if (!fp) return;
    who[cdKey] = (typeof state !== 'undefined' ? state.ticks : 0) + 15; // 1.5s CD
    let en = fp.en || 0;
    let wpnInst = fp.item || (who.eq && who.eq.wpn);
    let wpnDef = wpnInst && DB.items[wpnInst.id];
    let skills = ['sk_firearrow', 'sk_hell_fang', 'sk_icearrow', 'sk_windblade'];
    // 🪄 v3.8.48：傭兵走 allyProcFreeMagicSkill（自身魔傷）；玩家維持 procFreeMagicSkill
    let _procOk = seIsAlly(who)
        ? (typeof allyProcFreeMagicSkill === 'function')
        : (typeof procFreeMagicSkill === 'function');
    if (_procOk) {
        logCombat(`<span class="c-sherine font-bold">【${tag}${typeof sherineEnchName === 'function' ? sherineEnchName('we_skillfang') : '附咒・元素矢'}】</span>觸發！火箭＋地獄之牙＋冰箭＋風刃！`, 'player-special');
        skills.forEach(sk => {
            try {
                if (target.curHp <= 0) return;
                if (seIsAlly(who)) allyProcFreeMagicSkill(who, target, sk, en, false, wpnDef || wpnInst);
                else procFreeMagicSkill(target, sk, en, false, wpnDef || wpnInst);
            } catch (e) {}
        });
    }
    // 🪄 v3.8.43：元素矢成功後只判定「一次」咒言（唔跟四矢各自 seOnMagicHit；用觸發嗰件 we_skillfang 嘅階）
    //    procFreeMagicSkill 故意唔叫 seOnMagicHit；獨立 we_incant 仍由真正施法 seOnMagicHit 處理。
    if (target && target.curHp > 0) {
        let iRate = (fp.val.ir || 10) / 100;
        if (Math.random() < iRate) {
            let pick = SE_INCANT_POOL[Math.floor(Math.random() * SE_INCANT_POOL.length)];
            if (typeof applyMobStatus === 'function' && pick) {
                applyMobStatus(target, { kind: pick.kind, force: true, dur: pick.dur }, tag + '附咒・元素矢・咒言・' + pick.n);
            }
        }
    }
}

function seOnMagicHit(target, who) {
    who = seWho(who);
    if (!who || !seAlive(who) || !target || target.curHp <= 0) return;
    if (!seProc('we_incant', who)) return;   // 2 件機率相加
    let pick = SE_INCANT_POOL[Math.floor(Math.random() * SE_INCANT_POOL.length)];
    let tag = seIsAlly(who) ? `協力·${who._allyName}·` : '';
    if (typeof applyMobStatus === 'function') {
        applyMobStatus(target, { kind: pick.kind, force: true, dur: pick.dur }, tag + '咒言・' + pick.n);
    }
}

function seIncomingDmg(dmg, kind, who) {
    who = seWho(who);
    if (!(dmg > 0) || !who || !seAlive(who)) return dmg;
    // 減傷：同效果 2 件％相加，各效果之間照舊連乘
    let vt = seSum('ae_veil', who);
    if (kind === 'magic' && vt > 0) dmg = Math.max(1, Math.floor(dmg * (1 - vt / 100)));
    let mv = seSum('ae_mindveil', who);
    if (kind === 'magic' && mv > 0) dmg = Math.max(1, Math.floor(dmg * (1 - mv / 100)));
    let pdt = seSum('ae_ironhide', who);
    if (kind === 'phys' && pdt > 0) dmg = Math.max(1, Math.floor(dmg * (1 - pdt / 100)));
    let py = seSum('ae_parry', who);
    if (kind === 'phys' && py > 0) dmg = Math.max(1, Math.floor(dmg * (1 - py / 100)));
    // 血戒：受擊吸血（％相加）
    let br = seSum('ae_bloodring', who);
    if (br > 0 && dmg > 0) {
        let heal = Math.max(1, Math.floor(dmg * br / 100));
        let got = seAddHp(who, heal);
        if (got > 0) {
            let tag = seIsAlly(who) ? `協力·${who._allyName}·` : '';
            logCombat(`<span class="c-sherine font-bold">【${tag}血戒】</span>吸取 ${got} HP。`, 'heal');
        }
    }
    // 守癒（相加）
    let gh = seSum('ae_guardheal', who);
    if (gh > 0 && dmg > 0) {
        let got = seAddHp(who, gh);
        if (got > 0) {
            let tag = seIsAlly(who) ? `協力·${who._allyName}·` : '';
            logCombat(`<span class="c-sherine font-bold">【${tag}守癒】</span>恢復 ${got} HP。`, 'heal');
        }
    }
    // 回氣：受擊後恢復 mhp%（30s CD；2 件％相加，冷卻不變）
    let sw2 = seSum('ae_secondwind', who);
    if (sw2 > 0 && dmg > 0) {
        let now = (typeof state !== 'undefined' ? state.ticks : 0);
        if ((who._seSecondWindCd || 0) <= now) {
            who._seSecondWindCd = now + 300; // 30s
            let mhp = (typeof seGetMhp === 'function') ? seGetMhp(who) : (who.mhp || 1);
            let got = seAddHp(who, Math.max(1, Math.floor(mhp * sw2 / 100)));
            if (got > 0) {
                let tag = seIsAlly(who) ? `協力·${who._allyName}·` : '';
                logCombat(`<span class="c-sherine font-bold">【${tag}回氣】</span>恢復 ${got} HP。`, 'heal');
            }
        }
    }
    // 鏡盾：受魔法反彈（由呼叫端傳 mob 時另處理；此處記旗）
    let sh = who._seCrystalShield || 0;
    if (sh > 0 && dmg > 0) {
        let used = Math.min(sh, dmg);
        who._seCrystalShield = sh - used;
        dmg -= used;
        if (used > 0) {
            let tag = seIsAlly(who) ? `協力·${who._allyName}·` : '';
            logCombat(`<span class="c-sherine font-bold">【${tag}結晶】</span>護盾吸收了 ${used} 點傷害${who._seCrystalShield > 0 ? `（剩餘 ${who._seCrystalShield}）` : '（碎裂）'}。`, 'magic');
        }
    }
    return Math.max(0, dmg);
}

function seThornsOnHit(mob, takenDmg, who) {
    who = seWho(who);
    if (!who || !mob || mob.curHp <= 0 || mob._dead || !(takenDmg > 0)) return;
    let th = seSum('ae_thorns', who);   // 2 件相加
    if (th > 0 && !who._seThornsLock) {
        let tag = seIsAlly(who) ? `協力·${who._allyName}·` : '';
        who._seThornsLock = true;
        try {
            mob.curHp -= th;
            mob.justHit = 'magic';
            if (typeof mobWake === 'function') mobWake(mob);
            logCombat(`<span class="c-sherine font-bold">【${tag}棘刺】</span>反彈 ${th} 點傷害給 <span class="${getMobColor(mob.lv)}">${getMobDisplayName(mob)}</span>。`, 'magic');
            if (mob.curHp <= 0) {
                let i = mapState.mobs.findIndex(x => x && x.uid === mob.uid);
                if (i !== -1 && typeof killMob === 'function') killMob(i);
            }
        } finally {
            who._seThornsLock = false;
        }
    }
    // 反震（盾・弱於棘刺）
    if (mob.curHp > 0) seReboundOnHit(mob, takenDmg, who);
}

function seReboundOnHit(mob, takenDmg, who) {
    who = seWho(who);
    if (!who || !mob || mob.curHp <= 0 || mob._dead || !(takenDmg > 0)) return;
    if (!seHas('ae_rebound', who)) return;
    if (who._seReboundLock || who._seThornsLock) return;
    let rp = seProc('ae_rebound', who);   // 機率相加；傷害取觸發嗰件
    if (!rp) return;
    let flat = rp.val.dmg || 0;
    let tag = seIsAlly(who) ? `協力·${who._allyName}·` : '';
    who._seReboundLock = true;
    try {
        mob.curHp -= flat;
        mob.justHit = 'magic';
        if (typeof mobWake === 'function') mobWake(mob);
        logCombat(`<span class="c-sherine font-bold">【${tag}反震】</span>反彈 ${flat} 點傷害給 <span class="${getMobColor(mob.lv)}">${getMobDisplayName(mob)}</span>。`, 'magic');
        if (mob.curHp <= 0) {
            let i = mapState.mobs.findIndex(x => x && x.uid === mob.uid);
            if (i !== -1 && typeof killMob === 'function') killMob(i);
        }
    } finally {
        who._seReboundLock = false;
    }
}

function seOnDodge(who, mob) {
    who = seWho(who);
    if (!who || !seAlive(who)) return;
    let tag = seIsAlly(who) ? `協力·${who._allyName}·` : '';
    if (seHas('ae_ghoststep', who)) {
        let h = seAddHp(who, seSum('ae_ghoststep', who));
        let m = seAddMp(who, seSum('ae_ghoststep', who, 'mp'));
        if (h > 0 || m > 0) {
            logCombat(`<span class="c-sherine font-bold">【${tag}殘影】</span>迴避後恢復 ${h} HP、${m} MP。`, 'heal');
        }
    }
    // 風刃披：迴避對攻擊者固傷（相加）
    let flat = seSum('ae_windcut', who);
    if (flat > 0 && mob && mob.curHp > 0 && !mob._dead) {
        if (who._seWindcutLock) { /* 防反彈鏈 */ }
        else {
            who._seWindcutLock = true;
            try {
                mob.curHp -= flat;
                mob.justHit = 'magic';
                if (typeof mobWake === 'function') mobWake(mob);
                logCombat(`<span class="c-sherine font-bold">【${tag}風刃披】</span>迴避反擊 ${flat} 點傷害給 <span class="${getMobColor(mob.lv)}">${getMobDisplayName(mob)}</span>。`, 'magic');
                if (mob.curHp <= 0) {
                    let i = mapState.mobs.findIndex(x => x && x.uid === mob.uid);
                    if (i !== -1 && typeof killMob === 'function') killMob(i);
                }
            } finally {
                who._seWindcutLock = false;
            }
        }
    }
    // 殘跡：迴避後短時攻速（2 件相加）
    let pct = seSum('ae_trail', who);
    if (pct > 0) {
        let _was = (who._seTrailUntil || 0) > (typeof state !== 'undefined' ? state.ticks : 0);
        who._seTrailUntil = (typeof state !== 'undefined' ? state.ticks : 0) + 30; // 3s
        who._seTrailPct = pct;
        if (!_was) {
            seRefreshWhoStats(who);
            logCombat(`<span class="c-sherine font-bold">【${tag}殘跡】</span>攻速 +${pct}%（3 秒）`, 'player-special');
        }
    }
}

/** 殘光冷卻（分鐘）：最高階嗰件；有第 2 件生效 → 冷卻 −30% */
function seLastLightCdMin(who) {
    let act = seActive('ae_lastlight', who);
    if (!act.length) return 0;
    let m = act[0].val.min || 10;
    if (act.length >= 2) m = m * 0.7;
    return m;
}
function seTryLastLight(who) {
    who = seWho(who);
    if (!who || !seHas('ae_lastlight', who)) return false;
    if ((who._seLastLightCd || 0) > state.ticks) return false;
    let cdTicks = Math.round(seLastLightCdMin(who) * 600);
    if (seIsAlly(who)) {
        if ((who.curHp || 0) > 0) return false;
        who.curHp = 1;
        who._downed = false;
        who._seLastLightCd = state.ticks + cdTicks;
        logCombat(`<span class="c-sherine font-bold">【協力·${who._allyName}·殘光】</span>致命一擊化為餘輝，剩下 1 HP。（冷卻中）`, 'heal');
        try { if (typeof renderSquadPanel === 'function') renderSquadPanel(); } catch (e) {}
        return true;
    }
    if (who.dead) return false;
    if ((who.hp || 0) > 0) return false;
    who.hp = 1;
    who._seLastLightCd = state.ticks + cdTicks;
    logCombat(`<span class="c-sherine font-bold">【殘光】</span>致命一擊化為餘輝，你剩下 1 HP。（冷卻中）`, 'heal');
    try { if (typeof updateUI === 'function') updateUI(); } catch (e) {}
    return true;
}

function seCrystalShieldAmt(who) {
    return Math.max(0, Math.floor((who && who._seCrystalShield) || 0));
}
/** 結晶護盾％：2 件相加 */
function seCrystalPct(who) {
    return seSum('ae_crystal', who) / 100;
}
function seCrystalShieldCap(who) {
    if (!who) return 1;
    let pct = seCrystalPct(who);
    if (!(pct > 0)) pct = 0.10;
    let mhp = (typeof seGetMhp === 'function') ? seGetMhp(who) : (who.mhp || who.hp || 1);
    return Math.max(1, Math.floor(mhp * pct));
}
function seUpdateShieldBar(who, fillId, txtId, wrapId) {
    let cur = seCrystalShieldAmt(who);
    let has = !!(who && seHas('ae_crystal', who));
    let wrap = wrapId ? document.getElementById(wrapId) : null;
    if (wrap) wrap.style.display = (has || cur > 0) ? '' : 'none';
    let fill = document.getElementById(fillId);
    let txt = document.getElementById(txtId);
    if (!fill && !txt) return;
    let cap = Math.max(seCrystalShieldCap(who), cur, 1);
    if (fill) fill.style.width = Math.max(0, Math.min(100, (cur / cap) * 100)) + '%';
    if (txt) txt.innerText = has || cur > 0 ? (cur + '/' + cap) : '0';
}

function seCrystalTickOne(who) {
    if (!who || !seAlive(who)) return;
    let act = seActive('ae_crystal', who);
    if (!act.length) { who._seCrystalShield = 0; return; }
    if ((who._seCrystalNext || 0) > state.ticks) return;
    let pct = seCrystalPct(who);
    let sec = Math.min.apply(null, act.map(e => e.val.sec || 60));   // 間隔取較短
    let amt = Math.max(1, Math.floor(seGetMhp(who) * pct));
    who._seCrystalShield = amt;
    who._seCrystalNext = state.ticks + sec * 10;
    let tag = seIsAlly(who) ? `協力·${who._allyName}·` : '';
    logCombat(`<span class="c-sherine font-bold">【${tag}結晶】</span>獲得 ${amt} 點護盾。`, 'magic');
}
function seCrystalTick() {
    if (typeof player !== 'undefined' && player) seCrystalTickOne(player);
    if (typeof player !== 'undefined' && player && Array.isArray(player.allies)) {
        player.allies.forEach(a => { if (a) seCrystalTickOne(a); });
    }
}

/** 是否為「回血魔法」（淨化類除外）：以技能旗標辨識，涵蓋妖精／治盔等 */
function seIsHpHealSkill(skId) {
    if (!skId || typeof DB === 'undefined' || !DB.skills) return false;
    if (skId === 'sk_antidote' || skId === 'sk_holy_light' || skId === 'sk_cancel') return false;
    let sk = DB.skills[skId];
    if (!sk) return false;
    if (sk.classicHeal || sk.groupHeal || sk.healDice || sk.healBase != null || sk.fullRestore) return true;
    if (sk.type === 'heal' && (sk.valDice || sk.hot)) return true;
    return false;
}


/** 護變：影響 AC（正值＝加防）或 MR 的增益技 */
function seIsAcMrBuffSkill(skId) {
    if (!skId || typeof DB === 'undefined' || !DB.skills) return false;
    let sk = DB.skills[skId];
    if (!sk || sk.type !== 'buff' || !sk.d) return false;
    let ac = Number(sk.d.ac) || 0;
    let mr = Number(sk.d.mr) || 0;
    // Lineage：d.ac 正值＝AC 減益數（更好防）；負值＝AC 變差（如狂暴）不放大
    if (ac > 0 || mr > 0) return true;
    return false;
}

/** 技變倍率：癒變／護變。癒變看回血旗標；護變看 AC／MR 增益（或白名單）。掛 equipSkillDmgMult／rollHealingSpell／buff AC */
function seSkillMutMult(skId, who) {
    who = seWho(who);
    if (!who || !skId) return 1;
    let m = 1;
    let def = null;
    if (seHas('ae_mut_heal', who) && typeof GEAR_ENCHANT !== 'undefined' && (def = GEAR_ENCHANT.ae_mut_heal)) {
        let ok = !!def.mutAllHeals && seIsHpHealSkill(skId);
        if (!ok && def.mutSkills && def.mutSkills.indexOf(skId) >= 0) ok = true;
        if (ok) m *= (1 + seSum('ae_mut_heal', who) / 100);   // 2 件：加成相加（1.18 → 1.36）
    }
    if (seHas('ae_mut_shield', who) && typeof GEAR_ENCHANT !== 'undefined' && (def = GEAR_ENCHANT.ae_mut_shield)) {
        let ok = !!def.mutAllAcMr && typeof seIsAcMrBuffSkill === 'function' && seIsAcMrBuffSkill(skId);
        if (!ok && def.mutSkills && def.mutSkills.indexOf(skId) >= 0) ok = true;
        // 聖結界：無 d.ac/mr，仍屬防護技變
        if (!ok && skId === 'sk_holy_barrier') ok = true;
        if (ok) m *= (1 + seSum('ae_mut_shield', who) / 100);
    }
    return m;
}

/** 護變：解析施法者倍率（優先讀分享時蓋章的 _seMutShieldFrom） */
function seMutShieldMultResolved(skId, who) {
    who = seWho(who);
    if (!who || !skId) return 1;
    let stamped = who._seMutShieldFrom && Number(who._seMutShieldFrom[skId]);
    if (stamped > 1) return stamped;
    return seSkillMutMult(skId, who);
}

/** 護變整數加值：max(base, ceil(base×mult))，base≥1 時 T1+ 至少多 1 */
function seMutShieldBoost(base, skId, who) {
    let b = Number(base) || 0;
    if (!(b >= 1)) return b;
    let mult = seMutShieldMultResolved(skId, who);
    if (!(mult > 1)) return b;
    return Math.max(b, Math.ceil(b * mult));
}

/** 施法者蓋章護變倍率到 buff 受益者（含自身／TEAM_SHARE） */
function seStampMutShield(skId, caster, target) {
    if (!skId || !caster || !target) return;
    let mult = seSkillMutMult(skId, caster);
    if (!(mult > 1)) return;
    if (!target._seMutShieldFrom) target._seMutShieldFrom = {};
    target._seMutShieldFrom[skId] = Math.max(Number(target._seMutShieldFrom[skId]) || 1, mult);
}

/** 聖結界減傷比例（預設 0.30）；護變以整數％ ceil 後轉回 */
function seHolyBarrierReducePct(who) {
    let base = 30;
    let boosted = seMutShieldBoost(base, 'sk_holy_barrier', who);
    return Math.min(90, Math.max(0, boosted)) / 100;
}

/** 狂怒：爆擊後攻速（鏡像 relic critFuryHaste） */
function seTryCritFury(who) {
    who = seWho(who);
    if (!who || !seHas('we_critfury', who)) return;
    let act = seActive('we_critfury', who);
    let pct = seSum('we_critfury', who);                          // 2 件：攻速相加
    let sec = Math.max.apply(null, act.map(e => e.val.sec || 3));  // 持續取較長
    let _was = (who._seCritFuryUntil || 0) > (typeof state !== 'undefined' ? state.ticks : 0);
    who._seCritFuryUntil = (typeof state !== 'undefined' ? state.ticks : 0) + sec * 10;
    who._seCritFuryPct = pct;
    if (!_was) {
        seRefreshWhoStats(who);
        let tag = seIsAlly(who) ? `協力·${who._allyName}·` : '';
        logCombat(`<span class="c-sherine font-bold">【${tag}狂怒】</span>攻速 +${pct}%（${sec} 秒）`, 'player-special');
    }
}

/** 供 atkSpd 讀取 */
function seCritFuryAspdBonus(who) {
    who = seWho(who);
    if (!who || !who._seCritFuryUntil || !state) return 0;
    if (who._seCritFuryUntil <= state.ticks) return 0;
    return who._seCritFuryPct || 0;
}

function seTryFireNull(who) {
    who = seWho(who);
    if (!who || !who.d || !who.d.fireNullify) return false;
    let cd = who.d.seFireNullCd || 100;
    if ((who._fireNullCd || 0) > state.ticks) return false;
    // If already handled by relic path using fixed 100, still OK; enchant shortens via seFireNullCd when we set below
    return true;
}
function seMirrorOnMagicHit(mob, takenDmg, who) {
    who = seWho(who);
    if (!who || !mob || mob.curHp <= 0 || !(takenDmg > 0)) return;
    let base = seSum('ae_mirror', who);   // 2 件相加
    if (!(base > 0)) return;
    let tag = seIsAlly(who) ? `協力·${who._allyName}·` : '';
    mob.curHp -= base;
    mob.justHit = 'magic';
    if (typeof mobWake === 'function') mobWake(mob);
    logCombat(`<span class="c-sherine font-bold">【${tag}鏡盾】</span>反彈 ${base} 點魔法傷害給 <span class="${getMobColor(mob.lv)}">${getMobDisplayName(mob)}</span>。`, 'magic');
    if (mob.curHp <= 0) {
        let i = mapState.mobs.findIndex(x => x && x.uid === mob.uid);
        if (i !== -1 && typeof killMob === 'function') killMob(i);
    }
}
function seEarthbindOnHit(mob, who) {
    who = seWho(who);
    if (!who || !mob || mob.curHp <= 0) return;
    let tag = seIsAlly(who) ? `協力·${who._allyName}·` : '';
    if (seProc('ae_earthbind', who) && typeof applyMobStatus === 'function') {   // 機率相加
        applyMobStatus(mob, { kind: 'slow', force: true, dur: 8 }, tag + '踏地');
    }
    // 震踏：受擊小機率暈攻擊者（機率相加）
    if (mob.curHp > 0 && seProc('ae_stomp', who) && typeof applyMobStatus === 'function') {
        applyMobStatus(mob, { kind: 'stun', force: true, dur: 2 }, tag + '震踏');
    }
}
/** 厚帶 MHP%：每件各自（上限 20%）全額，最多 2 件相加 */
function seBeltbulkPct(p) {
    return seSum('ae_beltbulk', p);
}
function seApplyMhpBonus(p) {
    if (!p) return;
    let baseMhp = Math.max(0, Number(p.mhp) || 0);
    let bonus = 0;
    let pct = seBeltbulkPct(p);
    if (pct > 0) bonus += Math.floor(baseMhp * pct / 100);
    let flat = seSum('ae_vitalplate', p);   // 2 件相加
    if (flat > 0) bonus += flat;
    p._seMhpBonus = bonus;
    if (bonus > 0) {
        p.mhp = baseMhp + bonus;
        if (!p._allyName && p.hp > p.mhp) p.hp = p.mhp;
        if (p._allyName && p.curHp > p.mhp) p.curHp = p.mhp;
    }
}

if (typeof window !== 'undefined') {
    window.seMirrorOnMagicHit = seMirrorOnMagicHit;
    window.seEarthbindOnHit = seEarthbindOnHit;
    window.seApplyMhpBonus = seApplyMhpBonus;
    window.seGearEn = seGearEn;
    window.seTryFireNull = seTryFireNull;

    window.seHas = seHas;
    window.SE_STACK_MAX = SE_STACK_MAX;
    window.SE_VAL = SE_VAL;
    window.seVal = seVal;
    window.seResolveId = seResolveId;
    window.seEquippedMap = seEquippedMap;
    window.seAllInstances = seAllInstances;
    window.seActive = seActive;
    window.seSum = seSum;
    window.seProc = seProc;
    window.seInstanceInactive = seInstanceInactive;
    window.seStackNote = seStackNote;
    window.seUndeadRoll = seUndeadRoll;
    window.seCrystalPct = seCrystalPct;
    window.seLastLightCdMin = seLastLightCdMin;
    window.seTier = seTier;
    window.seEquippedIds = seEquippedIds;
    window.seEquippedEntries = seEquippedEntries;
    window.seRefreshWhoStats = seRefreshWhoStats;
    window.seApplyStats = seApplyStats;
    window.seApplyMpDrain = seApplyMpDrain;
    window.seOnNormalHit = seOnNormalHit;
    window.seOnMagicHit = seOnMagicHit;
    window.seIncomingDmg = seIncomingDmg;
    window.seThornsOnHit = seThornsOnHit;
    window.seReboundOnHit = seReboundOnHit;
    window.seOnDodge = seOnDodge;
    window.seTryLastLight = seTryLastLight;
    window.seCrystalTick = seCrystalTick;
    window.seCrystalShieldAmt = seCrystalShieldAmt;
    window.seCrystalShieldCap = seCrystalShieldCap;
    window.seUpdateShieldBar = seUpdateShieldBar;
    window.seIsAcMrBuffSkill = seIsAcMrBuffSkill;
    window.seSkillMutMult = seSkillMutMult;
    window.seIsHpHealSkill = seIsHpHealSkill;
    window.seMutShieldBoost = seMutShieldBoost;
    window.seMutShieldMultResolved = seMutShieldMultResolved;
    window.seStampMutShield = seStampMutShield;
    window.seHolyBarrierReducePct = seHolyBarrierReducePct;
    window.seBeltbulkPct = seBeltbulkPct;
    window.seTryCritFury = seTryCritFury;
    window.seCritFuryAspdBonus = seCritFuryAspdBonus;
    window.seWpnEn = seWpnEn;
}
