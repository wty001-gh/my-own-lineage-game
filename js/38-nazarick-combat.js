// ========== 🪦 納薩力克附魔・戰鬥實裝（玩家＋協力傭兵）==========
// v3.8.86：3 槽屬性／元素／簽名；真實死亡＝命中傷害％加成；獄炎只魔法命中・％MHP・不刷新。
// v3.8.91：獄炎觸發 11/16/22%（強化不加觸發）；每秒 T1/T2 1%、T3 2% MHP（強化不加百分比）；5 秒不累計不刷新；受魔抗減免。
// item.ne：nw_* 武器／na_* 防具。與席琳 se_* 並存。

function neWho(who) {
    if (who) return who;
    return (typeof player !== 'undefined') ? player : null;
}
function neIsAlly(who) {
    return !!(who && who._allyName);
}
function neAlive(who) {
    who = neWho(who);
    if (!who) return false;
    if (neIsAlly(who)) return !who._downed && (who.curHp || 0) > 0;
    return !who.dead;
}
function neGetHp(who) {
    who = neWho(who);
    return neIsAlly(who) ? (who.curHp || 0) : (who.hp || 0);
}
function neGetMhp(who) {
    who = neWho(who);
    return who.mhp || 1;
}
function neAddHp(who, amt) {
    who = neWho(who);
    if (!(amt > 0)) return 0;
    let mhp = neGetMhp(who);
    if (neIsAlly(who)) {
        let before = who.curHp || 0;
        who.curHp = Math.min(mhp, before + amt);
        return who.curHp - before;
    }
    let before = who.hp || 0;
    who.hp = Math.min(mhp, before + amt);
    return who.hp - before;
}
function neAddMp(who, amt) {
    who = neWho(who);
    if (!(amt > 0) || !who) return 0;
    if (neIsAlly(who)) {
        // 傭兵多數唔跟 MP；有 mmp 先補
        if (!(who.mmp > 0)) return 0;
        let before = who.mp || 0;
        who.mp = Math.min(who.mmp, before + amt);
        return who.mp - before;
    }
    let before = who.mp || 0;
    who.mp = Math.min(who.mmp || 0, before + amt);
    return who.mp - before;
}
function neLabel(who) {
    return neIsAlly(who) ? (`協力·${who._allyName}`) : '你';
}

function neEquippedEntries(who) {
    who = neWho(who);
    let out = [], seen = {};
    if (!who || !who.eq) return out;
    for (let k in who.eq) {
        let it = who.eq[k];
        if (!it || !Array.isArray(it.ne)) continue;
        if (typeof _neIsNazGear === 'function') {
            if (!_neIsNazGear(it)) continue;
        } else if (!(it.id && String(it.id).indexOf('_naz_') >= 0)) {
            continue;
        }
        let d = (typeof DB !== 'undefined' && DB.items) ? DB.items[it.id] : null;
        let fromWpn = !!(d && d.type === 'wpn');
        let list = (typeof nazEnchList === 'function') ? nazEnchList(it) : it.ne;
        list.forEach(raw => {
            let id, t = 1, v, slot;
            if (typeof raw === 'string') id = raw;
            else if (raw && raw.id) {
                id = raw.id;
                t = Math.max(1, Math.min(3, raw.t || 1));
                if (raw.v != null) v = raw.v;
                if (raw.slot != null) slot = raw.slot;
            } else return;
            if (seen[id]) return;
            if (typeof NAZ_ENCH !== 'undefined' && !NAZ_ENCH[id]) return;
            seen[id] = true;
            let enVal = 0;
            if (fromWpn) enVal = (typeof capWpnEn === 'function') ? capWpnEn(it.en || 0) : (it.en || 0);
            else if (typeof capEn === 'function') enVal = capEn(it.en || 0, d);
            else enVal = it.en || 0;
            let e = { id: id, t: t, fromWpn: fromWpn, en: enVal };
            if (v != null) e.v = v;
            if (slot != null) e.slot = slot;
            out.push(e);
        });
    }
    return out;
}
function neHas(id, who) {
    return neEquippedEntries(who).some(e => e.id === id);
}
function neTier(id, who) {
    let e = neEquippedEntries(who).find(x => x.id === id);
    return e ? (e.t || 1) : 0;
}
function neEntry(id, who) {
    return neEquippedEntries(who).find(x => x.id === id) || null;
}
function neGearEn(who, id) {
    let e = neEquippedEntries(who).find(x => x.id === id);
    return e ? (e.en || 0) : 0;
}
function neWpnEn(who) {
    who = neWho(who);
    if (!who || !who.eq || !who.eq.wpn) return 0;
    let en = who.eq.wpn.en || 0;
    return (typeof capWpnEn === 'function') ? capWpnEn(en) : en;
}

function _neAttrDelta(fn, before, after) {
    if (typeof fn !== 'function') return 0;
    try { return (fn(after) || 0) - (fn(before) || 0); } catch (e) { return 0; }
}

function neApplyStats(d, p) {
    if (!d || !p) return;
    function _neAddAtkSpd(pct) {
        if (!(pct > 0)) return;
        d.atkSpdPct = (d.atkSpdPct || 0) + pct;
        let m = 1 / (1 + pct / 100);
        if (d.aspd) d.aspd = d.aspd * m;
        if (d.aspdOff) d.aspdOff = d.aspdOff * m;
    }

    // ---- Slot0 屬性（經 v；補衍生差值因 neApplyStats 喺 Phase2 之後）----
    neEquippedEntries(p).forEach(e => {
        let def = (typeof NAZ_ENCH !== 'undefined') ? NAZ_ENCH[e.id] : null;
        if (!def || !def.stat || !(e.v > 0)) return;
        let key = def.stat;
        let add = e.v | 0;
        if (key === 'str') {
            let b = d.str || 0; d.str = b + add;
            d.meleeDmg = (d.meleeDmg || 0) + _neAttrDelta(typeof getStrMeleeDmg === 'function' ? getStrMeleeDmg : null, b, d.str);
            d.meleeHit = (d.meleeHit || 0) + _neAttrDelta(typeof getStrMeleeHit === 'function' ? getStrMeleeHit : null, b, d.str);
            d.meleeCrit = (d.meleeCrit || 0) + _neAttrDelta(typeof getStrMeleeCrit === 'function' ? getStrMeleeCrit : null, b, d.str);
        } else if (key === 'dex') {
            let b = d.dex || 0; d.dex = b + add;
            d.rangedDmg = (d.rangedDmg || 0) + _neAttrDelta(typeof getDexRangedDmg === 'function' ? getDexRangedDmg : null, b, d.dex);
            d.rangedHit = (d.rangedHit || 0) + _neAttrDelta(typeof getDexRangedHit === 'function' ? getDexRangedHit : null, b, d.dex);
            d.rangedCrit = (d.rangedCrit || 0) + _neAttrDelta(typeof getDexRangedCrit === 'function' ? getDexRangedCrit : null, b, d.dex);
            d.ac = (d.ac || 0) + _neAttrDelta(typeof getDexAC === 'function' ? getDexAC : null, b, d.dex);
            d.er = (d.er || 0) + _neAttrDelta(typeof getDexER === 'function' ? getDexER : null, b, d.dex);
        } else if (key === 'int') {
            let b = d.int || 0; d.int = b + add;
            d.magicDmg = (d.magicDmg || 0) + _neAttrDelta(typeof getIntMagicDmg === 'function' ? getIntMagicDmg : null, b, d.int);
            d.magicHit = (d.magicHit || 0) + _neAttrDelta(typeof getIntMagicHit === 'function' ? getIntMagicHit : null, b, d.int);
            d.magicCrit = (d.magicCrit || 0) + _neAttrDelta(typeof getIntMagicCrit === 'function' ? getIntMagicCrit : null, b, d.int);
            d.extraMp = (d.extraMp || 0) + _neAttrDelta(typeof getIntExtraMp === 'function' ? getIntExtraMp : null, b, d.int);
            d.mpReduce = (d.mpReduce || 0) + _neAttrDelta(typeof getIntMpReduce === 'function' ? getIntMpReduce : null, b, d.int);
        } else if (key === 'wis') {
            let b = d.wis || 0; d.wis = b + add;
            d.mr = (d.mr || 0) + _neAttrDelta(typeof getWisMR === 'function' ? getWisMR : null, b, d.wis);
            d.mpR = (d.mpR || 0) + _neAttrDelta(typeof getWisMpRegen === 'function' ? getWisMpRegen : null, b, d.wis);
            if (typeof getWisGrowth === 'function') {
                let lv = p.lv || 1;
                p.mmp = (p.mmp || 0) + (lv - 1) * (getWisGrowth(d.wis) - getWisGrowth(b));
            }
        } else if (key === 'con') {
            let b = d.con || 0; d.con = b + add;
            if (typeof getConGrowth === 'function') {
                let lv = p.lv || 1;
                p.mhp = (p.mhp || 0) + (lv - 1) * (getConGrowth(d.con, p.cls) - getConGrowth(b, p.cls));
            }
            if (typeof getConHpRegenMax === 'function') {
                d.hpRegenMax = (d.hpRegenMax || 0) + (getConHpRegenMax(d.con) - getConHpRegenMax(b));
            }
        } else if (key === 'cha') {
            d.cha = (d.cha || 0) + add;
        }
    });

    // ---- Slot1 元素：寫入 d 供 outgoing／incoming ----
    let eleOut = d.neEleOut || (d.neEleOut = {});
    let eleRes = d.neEleRes || (d.neEleRes = {});
    ['nw_ele_water', 'nw_ele_fire', 'nw_ele_earth', 'nw_ele_wind'].forEach(id => {
        if (neTier(id, p) > 0) {
            let ele = (NAZ_ENCH[id] && NAZ_ENCH[id].ele) || id.split('_').pop();
            eleOut[ele] = (eleOut[ele] || 0) + 10;
        }
    });
    ['na_res_water', 'na_res_fire', 'na_res_earth', 'na_res_wind'].forEach(id => {
        if (neTier(id, p) > 0) {
            let ele = (NAZ_ENCH[id] && NAZ_ENCH[id].ele) || id.split('_').pop();
            eleRes[ele] = (eleRes[ele] || 0) + 10;
        }
    });

    // ---- 祖父：完璧戰士 ----
    let pw = neTier('nw_perfect_warrior', p);
    if (pw > 0) {
        let hit = pw >= 3 ? 8 : (pw >= 2 ? 5 : 3);
        let crit = pw >= 3 ? 8 : (pw >= 2 ? 5 : 3);
        let dmg = pw >= 3 ? 6 : (pw >= 2 ? 4 : 2);
        d.meleeHit = (d.meleeHit || 0) + hit;
        d.rangedHit = (d.rangedHit || 0) + hit;
        d.meleeCrit = (d.meleeCrit || 0) + crit;
        d.rangedCrit = (d.rangedCrit || 0) + crit;
        d.meleeDmg = (d.meleeDmg || 0) + dmg;
    }

    // ---- 真實死亡：命中傷害％加成 ----
    let td = neTier('nw_true_death', p);
    if (td > 0) {
        d.neTrueDeathPct = td >= 3 ? 15 : (td >= 2 ? 10 : 7);
    }

    // ---- 掌握心臟 ----
    let gh = neTier('nw_grasp_heart', p);
    if (gh > 0) {
        d.neGraspAmp = gh >= 3 ? 1.35 : (gh >= 2 ? 1.25 : 1.15);
        d.neGraspHpPct = 0.40;
        let en = neWpnEn(p);
        d.neGraspCritPct = gh >= 3 ? (10 + en) : (gh >= 2 ? 7 : 5);
    }

    // ---- 防具簽名 ----
    let dw = neTier('na_dark_wisdom', p);
    if (dw > 0) {
        d.magicDmg = (d.magicDmg || 0) + (dw >= 3 ? 10 : (dw >= 2 ? 7 : 4));
        d.mr = (d.mr || 0) + (dw >= 3 ? 15 : (dw >= 2 ? 10 : 6));
        d.mpR = (d.mpR || 0) + (dw >= 3 ? 15 : (dw >= 2 ? 10 : 6));
    }
    let mb = neTier('na_metal_body', p);
    if (mb > 0) {
        d.ac = (d.ac || 0) - (mb >= 3 ? 7 : (mb >= 2 ? 6 : 5));
        d.crushDr = (d.crushDr || 0) + (mb >= 3 ? 18 : (mb >= 2 ? 12 : 8));
    }
    let sw = neTier('na_silence_ward', p);
    if (sw > 0) {
        d.mr = (d.mr || 0) + (sw >= 3 ? 12 : (sw >= 2 ? 8 : 5));
        d.neMagicDrPct = (d.neMagicDrPct || 0) + (sw >= 3 ? 12 : (sw >= 2 ? 8 : 5));
    }
    let ht = neTier('na_high_tier', p);
    if (ht > 0) {
        d.nePhysDrPct = (d.nePhysDrPct || 0) + (ht >= 3 ? 12 : (ht >= 2 ? 8 : 5));
    }
    let bf = neTier('na_blood_frenzy', p);
    if (bf > 0) {
        d.neBloodFrenzyAmp = bf >= 3 ? 1.22 : (bf >= 2 ? 1.15 : 1.10);
        d.neBloodFrenzyHp = 0.35;
    }
    let gm = neTier('na_gargantua_mass', p);
    if (gm > 0) {
        let pct = gm >= 3 ? 0.20 : (gm >= 2 ? 0.15 : 0.10);
        p.mhp = (p.mhp || 0) + Math.floor((p.mhp || 0) * pct);
        d.dr = (d.dr || 0) + (gm >= 3 ? 7 : (gm >= 2 ? 6 : 5));
        d.crushDr = (d.crushDr || 0) + (gm >= 3 ? 14 : (gm >= 2 ? 10 : 6));
    }
    let og = neTier('na_overlord_gaze', p);
    if (og > 0) {
        d.stunResist = (d.stunResist || 0) + (og >= 3 ? 22 : (og >= 2 ? 14 : 8));
        let hit = og >= 3 ? 8 : (og >= 2 ? 5 : 3);
        d.meleeHit = (d.meleeHit || 0) + hit;
        d.rangedHit = (d.rangedHit || 0) + hit;
        d.magicHit = (d.magicHit || 0) + hit;
    }
    let ab = neTier('na_aegis_bastion', p);
    if (ab > 0) {
        d.physDrGated = (d.physDrGated || 0) + (ab >= 3 ? 8 : (ab >= 2 ? 5 : 3));
        d.ac = (d.ac || 0) - (ab >= 3 ? 3 : (ab >= 2 ? 2 : 1));
        d.nePhysDrPct = (d.nePhysDrPct || 0) + (ab >= 3 ? 6 : (ab >= 2 ? 4 : 2));
    }
    let sv = neTier('na_shadow_veil', p);
    if (sv > 0) {
        d.er = (d.er || 0) + (sv >= 3 ? 11 : (sv >= 2 ? 7 : 4));
        _neAddAtkSpd(sv >= 3 ? 11 : (sv >= 2 ? 7 : 4));
    }
    let ds = neTier('na_death_shroud', p);
    if (ds > 0) {
        d.killHealHp = (d.killHealHp || 0) + (ds >= 3 ? 70 : (ds >= 2 ? 45 : 25));
        d.killHealMp = (d.killHealMp || 0) + (ds >= 3 ? 5 : (ds >= 2 ? 4 : 3));
    }
    let ag = neTier('na_assassin_grip', p);
    if (ag > 0) {
        let hit = ag >= 3 ? 11 : (ag >= 2 ? 7 : 4);
        let crit = ag >= 3 ? 8 : (ag >= 2 ? 5 : 3);
        let dmg = ag >= 3 ? 6 : (ag >= 2 ? 4 : 2);
        d.meleeHit = (d.meleeHit || 0) + hit;
        d.rangedHit = (d.rangedHit || 0) + hit;
        d.meleeCrit = (d.meleeCrit || 0) + crit;
        d.rangedCrit = (d.rangedCrit || 0) + crit;
        d.meleeDmg = (d.meleeDmg || 0) + dmg;
        d.rangedDmg = (d.rangedDmg || 0) + dmg;
    }
    let spw = neTier('na_spellweave', p);
    if (spw > 0) {
        d.magicDmg = (d.magicDmg || 0) + (spw >= 3 ? 8 : (spw >= 2 ? 5 : 3));
        d.magicHit = (d.magicHit || 0) + (spw >= 3 ? 11 : (spw >= 2 ? 7 : 4));
        d.extraMp = (d.extraMp || 0) + (spw >= 3 ? 8 : (spw >= 2 ? 5 : 3));
    }
    let fs = neTier('na_froststep', p);
    if (fs > 0) {
        d.freezeResist = (d.freezeResist || 0) + (fs >= 3 ? 22 : (fs >= 2 ? 14 : 8));
        if (fs >= 2) d.immSlow = true;
        d.er = (d.er || 0) + (fs >= 3 ? 8 : (fs >= 2 ? 5 : 3));
    }
    let hs = neTier('na_hunter_stride', p);
    if (hs > 0) {
        _neAddAtkSpd(hs >= 3 ? 12 : (hs >= 2 ? 8 : 5));
        d.rangedHit = (d.rangedHit || 0) + (hs >= 3 ? 11 : (hs >= 2 ? 7 : 4));
        d.meleeHit = (d.meleeHit || 0) + (hs >= 3 ? 6 : (hs >= 2 ? 4 : 2));
    }
    let im = neTier('na_iron_march', p);
    if (im > 0) {
        d.mr = (d.mr || 0) + (im >= 3 ? 12 : (im >= 2 ? 8 : 5));
        d.stunResist = (d.stunResist || 0) + (im >= 3 ? 20 : (im >= 2 ? 12 : 6));
        d.dr = (d.dr || 0) + (im >= 3 ? 3 : (im >= 2 ? 2 : 1));
    }
}

function neTargetHpRatio(target) {
    if (!target) return 1;
    let mhp = target.mhp || target.maxHp || target.hp || 1;
    let hp = target.curHp != null ? target.curHp : (target.hp || 0);
    return mhp > 0 ? (hp / mhp) : 1;
}

/** 掌握心臟：目標低血時爆擊／重擊機率加成（％） */
function neGraspCritBonus(who, target) {
    who = neWho(who);
    if (!who || !who.d || !(who.d.neGraspCritPct > 0) || !target) return 0;
    if (neTargetHpRatio(target) < (who.d.neGraspHpPct || 0.40)) return who.d.neGraspCritPct;
    return 0;
}

function neApplyOutgoingAmp(dmg, who, target) {
    who = neWho(who);
    if (!(dmg > 0) || !who) return dmg;
    let d = who.d || {};
    // 元素 outgoing
    if (target && target.e && d.neEleOut && d.neEleOut[target.e] > 0) {
        dmg = Math.max(1, Math.floor(dmg * (1 + d.neEleOut[target.e] / 100)));
    }
    // 掌握心臟
    if (d.neGraspAmp > 1 && target) {
        if (neTargetHpRatio(target) < (d.neGraspHpPct || 0.40)) {
            dmg = Math.max(1, Math.floor(dmg * d.neGraspAmp));
        }
    }
    // 血宴狂氣
    if (d.neBloodFrenzyAmp > 1) {
        let mhp = neGetMhp(who);
        let hp = neGetHp(who);
        if (mhp > 0 && hp / mhp < (d.neBloodFrenzyHp || 0.35)) {
            dmg = Math.max(1, Math.floor(dmg * d.neBloodFrenzyAmp));
        }
    }
    return dmg;
}

function neOnNormalHit(target, dmg, who) {
    who = neWho(who);
    if (!who || !neAlive(who) || !target || !(dmg > 0)) return;
    let tag = neLabel(who) === '你' ? '' : (neLabel(who) + '·');
    let en = neWpnEn(who);

    if (target.curHp <= 0) return;

    // 時停殘響（普攻）
    let te = neTier('nw_time_echo', who);
    if (te > 0 && target.curHp > 0) {
        let r = te >= 3 ? 0.12 : (te >= 2 ? 0.09 : 0.06);
        if (Math.random() < r && typeof applyMobStatus === 'function') {
            let pick = Math.random() < 0.5
                ? { kind: 'freeze', n: '冰凍', dur: 2 }
                : { kind: 'stun', n: '擊暈', dur: 2 };
            applyMobStatus(target, { kind: pick.kind, force: true, dur: pick.dur }, tag + '時停殘響・' + pick.n);
        }
    }

    // 漆黑之矢
    let ba = neTier('nw_black_arrow', who);
    if (ba > 0 && target.curHp > 0) {
        let rate = ba >= 3 ? 20 : (ba >= 2 ? 12 : 8);
        if (Math.random() * 100 < rate) {
            let edmg = (ba >= 3 ? 48 : (ba >= 2 ? 32 : 18)) + Math.floor(en * 2);
            target.curHp -= edmg;
            target.justHit = 'dark';
            if (typeof mobWake === 'function') mobWake(target);
            logCombat(`<span class="c-nazarick font-bold">【${tag}漆黑之矢】</span>追擊 ${edmg} 暗矢傷害。`, 'player-special');
        }
    }

    // 祖父：霜骨敕令（仍生效）
    let fm = neTier('nw_frost_mandate', who);
    if (fm > 0 && target.curHp > 0) {
        let rate = fm >= 3 ? 0.20 : (fm >= 2 ? 0.14 : 0.10);
        if (Math.random() < rate) {
            let ice = (fm >= 3 ? 36 : (fm >= 2 ? 24 : 12)) + Math.floor(en);
            target.curHp -= ice;
            target.justHit = 'water';
            if (typeof applyMobStatus === 'function') {
                applyMobStatus(target, { kind: 'slow', force: true, dur: 8 }, tag + '霜骨敕令');
            }
            logCombat(`<span class="c-nazarick font-bold">【${tag}霜骨敕令】</span>冰霜 ${ice} 並緩速。`, 'player-special');
        }
    }
    // 獄炎烙印：已移至 neOnMagicHit（魔法命中 only）
}

function neOnMagicHit(target, who) {
    who = neWho(who);
    if (!who || !neAlive(who) || !target || target.curHp <= 0) return;
    // 🏰 賢者墨水：魔法命中 MP +1
    try {
        if (who.d && who.d.cbSageMp) {
            if (who._allyName) who.curMp = Math.min(who.mmp || 0, (who.curMp || 0) + 1);
            else who.mp = Math.min(who.mmp || 0, (who.mp || 0) + 1);
        }
    } catch (e) {}
    let tag = neLabel(who) === '你' ? '' : (neLabel(who) + '·');
    let en = neWpnEn(who);

    let dw = neTier('nw_despair_wave', who);
    if (dw > 0) {
        let r = dw >= 3 ? 0.18 : (dw >= 2 ? 0.13 : 0.09);
        if (Math.random() < r) {
            // 本地絕望 +12%／6 秒。共用裂甲 sunder 維持 +10%，唔好改 fragileMult 嘅 sunder。
            target._neDespairUntil = ((typeof state !== 'undefined' && state) ? state.ticks : 0) + 60;
            let dark = (dw >= 3 ? 55 : (dw >= 2 ? 35 : 20)) + Math.floor(en * 1.5);
            target.curHp -= dark;
            target.justHit = 'dark';
            if (typeof mobWake === 'function') mobWake(target);
            logCombat(`<span class="c-nazarick font-bold">【${tag}絕望波動】</span>闇傷 ${dark} 並附加絕望（受傷+12%，6 秒）。`, 'magic');
        }
    }

    // 時停（魔法＝冰凍）
    let te = neTier('nw_time_echo', who);
    if (te > 0 && target.curHp > 0) {
        let r = te >= 3 ? 0.10 : (te >= 2 ? 0.07 : 0.05);
        if (Math.random() < r && typeof applyMobStatus === 'function') {
            applyMobStatus(target, { kind: 'freeze', force: true, dur: 2 }, tag + '時停殘響');
        }
    }

    // 獄炎烙印：只魔法命中；5 秒不累計、不刷新。
    // 每秒火傷％固定為階基數（T1/T2＝1、T3＝2），強化不加百分比。
    // 觸發率 11/16/22%，強化欄為 —（不加觸發）。烙印當下依魔抗折一次（比照魔法：魔抗減半／混亂恐慌 MR−10），之後每秒打已折減的固傷。
    let hb = neTier('nw_hellfire_brand', who);
    if (hb > 0 && target.curHp > 0) {
        let already = target._neHellfire && (target._neHellfire.until || 0) > (typeof state !== 'undefined' ? state.ticks : 0);
        if (!already) {
            let rate = hb >= 3 ? 0.22 : (hb >= 2 ? 0.16 : 0.11);
            if (Math.random() < rate) {
                let pctPts = hb >= 3 ? 2 : 1;
                let mhp = target.hp || target.mhp || 1;
                let raw = Math.max(1, Math.floor(mhp * pctPts / 100));
                let effMr = target.mr || 0;
                if (target.st && target.st.mrhalf > 0) effMr = effMr / 2;
                if (target.st && (target.st.confuse > 0 || target.st.panic > 0)) effMr = Math.max(0, effMr - 10);
                let tick = Math.max(1, Math.floor(raw * ((typeof mrMult === 'function') ? mrMult(effMr) : 1)));
                let now = (typeof state !== 'undefined' ? state.ticks : 0);
                target._neHellfire = { until: now + 50 };
                target._burnDot = {
                    left: 50,
                    dmg: tick,
                    tick: 10,
                    src: neIsAlly(who) ? (typeof _dpsAllySrc === 'function' ? _dpsAllySrc(who) : 'ally') : undefined
                };
                logCombat(`<span class="c-nazarick font-bold">【${tag}獄炎烙印】</span>每秒 ${tick} 火傷（${pctPts}% MHP・5 秒・不刷新・受魔抗）。`, 'magic');
            }
        }
    }
}

function neIncomingDmg(dmg, kind, who, attacker) {
    who = neWho(who);
    if (typeof tlApplyIncoming === 'function') { try { dmg = tlApplyIncoming(dmg, who); } catch (e) {} }   // 🧭 v3.8.127 天賦鐵壁／便當
    if (!(dmg > 0) || !who || !neAlive(who)) return dmg;
    let d = who.d || {};
    // 元素 incoming（來自對應屬性怪物）
    let mobEle = attacker && attacker.e;
    if (mobEle && d.neEleRes && d.neEleRes[mobEle] > 0) {
        dmg = Math.max(1, Math.floor(dmg * (1 - Math.min(40, d.neEleRes[mobEle]) / 100)));
    }
    if (kind === 'phys' && (d.nePhysDrPct || 0) > 0) {
        dmg = Math.max(1, Math.floor(dmg * (1 - Math.min(40, d.nePhysDrPct) / 100)));
    }
    if (kind === 'magic' && (d.neMagicDrPct || 0) > 0) {
        dmg = Math.max(1, Math.floor(dmg * (1 - Math.min(40, d.neMagicDrPct) / 100)));
    }
    let go = neTier('na_guardians_oath', who);
    if (go > 0 && dmg > 0) {
        let v = (go >= 3 ? 18 : (go >= 2 ? 12 : 7)) + Math.floor(neGearEn(who, 'na_guardians_oath') / 3);
        let got = neAddHp(who, v);
        if (got > 0) {
            let tag = neLabel(who) === '你' ? '' : (neLabel(who) + '·');
            logCombat(`<span class="c-nazarick font-bold">【${tag}守護者誓約】</span>恢復 ${got} HP。`, 'heal');
        }
    }
    return Math.max(0, dmg);
}

function neThornsOnHit(mob, takenDmg, who) {
    who = neWho(who);
    if (!who || !mob || mob.curHp <= 0 || mob._dead || !(takenDmg > 0)) return;
    let tt = neTier('na_bone_wall', who);
    if (!(tt > 0) || who._neThornsLock) return;
    let th = Math.max(1, (tt >= 3 ? 36 : (tt >= 2 ? 24 : 14)) + Math.floor(neGearEn(who, 'na_bone_wall') / 2));
    let tag = neLabel(who) === '你' ? '' : (neLabel(who) + '·');
    who._neThornsLock = true;
    try {
        mob.curHp -= th;
        mob.justHit = 'magic';
        if (typeof mobWake === 'function') mobWake(mob);
        logCombat(`<span class="c-nazarick font-bold">【${tag}骸骨之壁】</span>反彈 ${th} 點傷害給 <span class="${typeof getMobColor === 'function' ? getMobColor(mob.lv) : ''}">${typeof getMobDisplayName === 'function' ? getMobDisplayName(mob) : (mob.n || '')}</span>。`, 'magic');
        if (mob.curHp <= 0) {
            let i = mapState.mobs.findIndex(x => x && x.uid === mob.uid);
            if (i !== -1 && typeof killMob === 'function') killMob(i);
        }
    } finally {
        who._neThornsLock = false;
    }
}

function neTryImmortalBless(who) {
    who = neWho(who);
    let t = neTier('na_immortal_bless', who);
    if (!who || !(t > 0)) return false;
    let now = (typeof state !== 'undefined' ? state.ticks : 0);
    if ((who._neImmortalCd || 0) > now) return false;
    let cdSec = t >= 3 ? 90 : (t >= 2 ? 120 : 150);
    let cdTicks = cdSec * 10;
    let pct = t >= 3 ? 0.40 : (t >= 2 ? 0.28 : 0.18);
    let heal = Math.max(1, Math.floor(neGetMhp(who) * pct));
    if (neIsAlly(who)) {
        if ((who.curHp || 0) > 0) return false;
        who.curHp = heal;
        who._downed = false;
        who._neImmortalCd = now + cdTicks;
        logCombat(`<span class="c-nazarick font-bold">【協力·${who._allyName}·不滅加護】</span>抵擋死亡，恢復 ${heal} HP！`, 'heal');
        try { if (typeof renderSquadPanel === 'function') renderSquadPanel(); } catch (e) {}
        return true;
    }
    if (who.dead) return false;
    if ((who.hp || 0) > 0) return false;
    who.hp = heal;
    who._neImmortalCd = now + cdTicks;
    logCombat(`<span class="c-nazarick font-bold">【不滅加護】</span>以大墳墓加護抵擋死亡，恢復 ${heal} HP！`, 'heal');
    try { if (typeof updateUI === 'function') updateUI(); } catch (e) {}
    return true;
}

/** 真實死亡：額外固傷 = floor(hitDmg * pct/100)；亦用於奇古獸 */
function neApplyIgnoreDr(dmg, who) {
    who = neWho(who);
    if (!(dmg > 0) || !who || !who.d) return dmg;
    let p = who.d.neTrueDeathPct || 0;
    if (!(p > 0)) return dmg;
    return dmg + Math.max(0, Math.floor(dmg * p / 100));
}

window.neHas = neHas;
window.neTier = neTier;
window.neEntry = neEntry;
window.neApplyStats = neApplyStats;
window.neOnNormalHit = neOnNormalHit;
window.neOnMagicHit = neOnMagicHit;
window.neIncomingDmg = neIncomingDmg;
window.neThornsOnHit = neThornsOnHit;
window.neTryImmortalBless = neTryImmortalBless;
window.neApplyOutgoingAmp = neApplyOutgoingAmp;
window.neApplyIgnoreDr = neApplyIgnoreDr;
window.neGraspCritBonus = neGraspCritBonus;
window.neEquippedEntries = neEquippedEntries;
window.neAddMp = neAddMp;
