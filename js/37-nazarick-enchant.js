// ========== 🪦 納薩力克附魔（大墳墓入口・大墳墓工匠）==========
// v3.8.86：武器／防具各 3 槽・槽位專屬池（屬性／元素／簽名）。資料存於 item.ne = [{id,t,v?,slot}]。
// 與席琳附魔（item.se）並存。無巨靈。

const NAZ_ENCH_MAX_WPN = 3;
const NAZ_ENCH_MAX_ARM = 3;
const NAZ_ENCH_COST_DRAW = 15;    // v3.8.92 咒印×5（原 3）
const NAZ_ENCH_COST_REROLL = 10;  // v3.8.92 咒印×5（原 2）

const NW_UPGRADE_COST = {
    2: { seal: 60, crystal: 0, gold: 80000 },     // 咒印 12→60；金幣不變
    3: { seal: 275, crystal: 10, gold: 300000 }   // 咒印 55→275、魂晶 2→10；金幣不變
};
const NA_UPGRADE_COST = {
    2: { seal: 50, crystal: 0, gold: 60000 },     // 咒印 10→50；金幣不變
    3: { seal: 225, crystal: 5, gold: 220000 }    // 咒印 45→225、魂晶 1→5；金幣不變
};

const NAZ_SLOT_LABELS = ['第1槽・屬性', '第2槽・元素', '第3槽・簽名'];
const NAZ_SLOT_HINTS_WPN = [
    '力量／敏捷／智力 +1~5（無升級）',
    '對水／火／地／風屬怪物傷害 +10%（無升級）',
    '簽名附魔（可升 T2／T3）'
];
const NAZ_SLOT_HINTS_ARM = [
    '精神／體質／魅力 +1~5（無升級）',
    '來自水／火／地／風屬怪物傷害 −10%（無升級）',
    '簽名附魔・部位獨占（可升 T2／T3）'
];

// ---- 武器池 ----
const NAZ_WEAPON_ENCHANT = {
    // Slot 0 — 屬性
    nw_stat_str: {
        n: '力量銘刻', role: '屬性', slot: 0, noUpgrade: true, stat: 'str',
        d: '力量 +1~5',
        desc(t, en, v) { return `力量 +${v || '?'}`; }
    },
    nw_stat_dex: {
        n: '敏捷銘刻', role: '屬性', slot: 0, noUpgrade: true, stat: 'dex',
        d: '敏捷 +1~5',
        desc(t, en, v) { return `敏捷 +${v || '?'}`; }
    },
    nw_stat_int: {
        n: '智力銘刻', role: '屬性', slot: 0, noUpgrade: true, stat: 'int',
        d: '智力 +1~5',
        desc(t, en, v) { return `智力 +${v || '?'}`; }
    },
    // Slot 1 — 元素
    nw_ele_water: {
        n: '水屬剋制', role: '元素', slot: 1, noUpgrade: true, ele: 'water',
        d: '對水屬怪物傷害 +10%',
        desc() { return '對水屬性怪物的傷害 +10%'; }
    },
    nw_ele_fire: {
        n: '火屬剋制', role: '元素', slot: 1, noUpgrade: true, ele: 'fire',
        d: '對火屬怪物傷害 +10%',
        desc() { return '對火屬性怪物的傷害 +10%'; }
    },
    nw_ele_earth: {
        n: '地屬剋制', role: '元素', slot: 1, noUpgrade: true, ele: 'earth',
        d: '對地屬怪物傷害 +10%',
        desc() { return '對地屬性怪物的傷害 +10%'; }
    },
    nw_ele_wind: {
        n: '風屬剋制', role: '元素', slot: 1, noUpgrade: true, ele: 'wind',
        d: '對風屬怪物傷害 +10%',
        desc() { return '對風屬性怪物的傷害 +10%'; }
    },
    // Slot 2 — 簽名（抽池）
    nw_true_death: {
        n: '真實死亡', role: '刺客', slot: 2,
        d: '一般攻擊（含奇古獸）造成額外傷害％',
        desc(t) {
            let p = t >= 3 ? 15 : (t >= 2 ? 10 : 7);
            return `一般攻擊（含奇古獸）額外造成該次傷害的 ${p}%`;
        }
    },
    nw_grasp_heart: {
        n: '掌握心臟', role: '刺客／近戰', slot: 2,
        d: '目標低血時傷害增幅＋爆擊／重擊機率',
        desc(t, en) {
            let amp = t >= 3 ? 35 : (t >= 2 ? 25 : 15);
            let crit = t >= 3 ? (10 + (en || 0)) : (t >= 2 ? 7 : 5);
            return `目標 HP＜40% 時傷害 +${amp}%；爆擊／重擊機率 +${crit}%`;
        }
    },
    nw_despair_wave: {
        n: '絕望波動', role: '法師', slot: 2,
        d: '魔法命中附加「絕望」並追擊闇傷',
        desc(t, en) {
            let r = t >= 3 ? 18 : (t >= 2 ? 13 : 9);
            let dark = (t >= 3 ? 55 : (t >= 2 ? 35 : 20)) + Math.floor((en || 0) * 1.5);
            return `魔法命中 ${r}%：附加絕望（受傷+12%，6 秒）並追擊 ${dark} 闇傷`;
        }
    },
    nw_time_echo: {
        n: '時停殘響', role: '控制', slot: 2,
        d: '普攻／魔法命中機率短暫冰凍／擊暈',
        desc(t) {
            let rn = t >= 3 ? 12 : (t >= 2 ? 9 : 6);
            let rm = t >= 3 ? 10 : (t >= 2 ? 7 : 5);
            return `普攻命中 ${rn}%：隨機冰凍 2 秒或擊暈 2 秒；魔法命中 ${rm}%：冰凍 2 秒`;
        }
    },
    nw_black_arrow: {
        n: '漆黑之矢', role: '弓箭手', slot: 2,
        d: '命中追擊暗矢（連射亦有效）',
        desc(t, en) {
            let r = t >= 3 ? 20 : (t >= 2 ? 12 : 8);
            let dmg = (t >= 3 ? 48 : (t >= 2 ? 32 : 18)) + Math.floor((en || 0) * 2);
            return `命中 ${r}% 追擊暗矢 ${dmg} 固傷（對連射目標有效）`;
        }
    },
    nw_hellfire_brand: {
        n: '獄炎烙印', role: '法師', slot: 2,
        d: '魔法命中附加獄炎燃燒（%MHP，不刷新，受魔抗）',
        desc(t) {
            let r = t >= 3 ? 22 : (t >= 2 ? 16 : 11);
            // 燃燒固定為 T1/T2 1%、T3 2% MHP；強化不加百分比，觸發率亦不吃強化。
            let pct = t >= 3 ? 2 : 1;
            return `魔法命中 ${r}%：獄炎烙印每秒目標最大 HP 的 ${pct}% 火傷，5 秒（不累計、不刷新；受魔抗減免）`;
        }
    },
    // 祖父：唔入抽池，舊存檔仍讀得到
    nw_perfect_warrior: {
        n: '完璧戰士', role: '近戰', slot: 2, retired: true,
        d: '命中／爆擊／近戰傷害成長（已退役・祖父保留）',
        desc(t) {
            let hit = t >= 3 ? 8 : (t >= 2 ? 5 : 3);
            let crit = t >= 3 ? 8 : (t >= 2 ? 5 : 3);
            let dmg = t >= 3 ? 6 : (t >= 2 ? 4 : 2);
            return `近／遠命中 +${hit}；爆擊 +${crit}%；近戰傷害 +${dmg}（已退役）`;
        }
    },
    nw_frost_mandate: {
        n: '霜骨敕令', role: '近戰／控場', slot: 2, retired: true,
        d: '命中緩速＋冰霜固傷（已退役・祖父保留）',
        desc(t, en) {
            let r = t >= 3 ? 20 : (t >= 2 ? 14 : 10);
            let ice = (t >= 3 ? 36 : (t >= 2 ? 24 : 12)) + Math.floor((en || 0));
            return `命中 ${r}%：緩速 8 秒並造成 ${ice} 冰霜固傷（已退役）`;
        }
    }
};

const NAZ_WPN_DRAW_POOLS = [
    ['nw_stat_str', 'nw_stat_dex', 'nw_stat_int'],
    ['nw_ele_water', 'nw_ele_fire', 'nw_ele_earth', 'nw_ele_wind'],
    ['nw_true_death', 'nw_grasp_heart', 'nw_despair_wave', 'nw_time_echo', 'nw_black_arrow', 'nw_hellfire_brand']
];

// ---- 防具池 ----
const NAZ_ARMOR_ENCHANT = {
    // Slot 0
    na_stat_wis: {
        n: '精神銘刻', role: '屬性', slot: 0, noUpgrade: true, stat: 'wis',
        d: '精神 +1~5',
        desc(t, en, v) { return `精神 +${v || '?'}`; }
    },
    na_stat_con: {
        n: '體質銘刻', role: '屬性', slot: 0, noUpgrade: true, stat: 'con',
        d: '體質 +1~5',
        desc(t, en, v) { return `體質 +${v || '?'}`; }
    },
    na_stat_cha: {
        n: '魅力銘刻', role: '屬性', slot: 0, noUpgrade: true, stat: 'cha',
        d: '魅力 +1~5',
        desc(t, en, v) { return `魅力 +${v || '?'}`; }
    },
    // Slot 1
    na_res_water: {
        n: '水屬抗禦', role: '元素', slot: 1, noUpgrade: true, ele: 'water',
        d: '來自水屬怪物傷害 −10%',
        desc() { return '來自水屬性怪物的傷害 −10%'; }
    },
    na_res_fire: {
        n: '火屬抗禦', role: '元素', slot: 1, noUpgrade: true, ele: 'fire',
        d: '來自火屬怪物傷害 −10%',
        desc() { return '來自火屬性怪物的傷害 −10%'; }
    },
    na_res_earth: {
        n: '地屬抗禦', role: '元素', slot: 1, noUpgrade: true, ele: 'earth',
        d: '來自地屬怪物傷害 −10%',
        desc() { return '來自地屬性怪物的傷害 −10%'; }
    },
    na_res_wind: {
        n: '風屬抗禦', role: '元素', slot: 1, noUpgrade: true, ele: 'wind',
        d: '來自風屬怪物傷害 −10%',
        desc() { return '來自風屬性怪物的傷害 −10%'; }
    },
    // Slot 2 — 簽名・部位獨占
    na_high_tier: {
        n: '高階存在', role: '坦克', groups: ['ARMOR'], slot: 2,
        d: '受到物理傷害減免',
        desc(t) {
            let p = t >= 3 ? 12 : (t >= 2 ? 8 : 5);
            return `受到物理傷害 −${p}%`;
        }
    },
    na_immortal_bless: {
        n: '不滅加護', role: '坦克', groups: ['ARMOR'], slot: 2,
        d: '致命傷時改為殘血（長冷卻）',
        desc(t) {
            let pct = t >= 3 ? 40 : (t >= 2 ? 28 : 18);
            let cd = t >= 3 ? 90 : (t >= 2 ? 120 : 150);
            return `致命傷改恢復最大 HP 的 ${pct}%（冷卻 ${cd} 秒）`;
        }
    },
    na_gargantua_mass: {
        n: '巨像重壓', role: '坦克', groups: ['ARMOR'], slot: 2,
        d: 'HP 上限％／減傷／受重擊減傷',
        desc(t) {
            let hp = t >= 3 ? 20 : (t >= 2 ? 15 : 10);
            let dr = t >= 3 ? 7 : (t >= 2 ? 6 : 5);
            let cr = t >= 3 ? 14 : (t >= 2 ? 10 : 6);
            return `HP 上限 +${hp}%；減傷 +${dr}；受重擊傷害 −${cr}%`;
        }
    },
    na_metal_body: {
        n: '金屬身軀', role: '坦克', groups: ['HELM'], slot: 2,
        d: 'AC 與重擊減傷',
        desc(t) {
            let ac = t >= 3 ? 7 : (t >= 2 ? 6 : 5);
            let cr = t >= 3 ? 18 : (t >= 2 ? 12 : 8);
            return `AC −${ac}；受重擊傷害 −${cr}%`;
        }
    },
    na_dark_wisdom: {
        n: '闇黒叡智', role: '法師', groups: ['HELM'], slot: 2,
        d: '魔法傷害／魔防／MP 回復',
        desc(t) {
            let md = t >= 3 ? 10 : (t >= 2 ? 7 : 4);
            let mr = t >= 3 ? 15 : (t >= 2 ? 10 : 6);
            let mpr = t >= 3 ? 15 : (t >= 2 ? 10 : 6);
            return `魔法傷害 +${md}；MR +${mr}；MP 回復 +${mpr}`;
        }
    },
    na_overlord_gaze: {
        n: '至高凝視', role: '命中／耐性', groups: ['HELM'], slot: 2,
        d: '震暈耐性與命中',
        desc(t) {
            let st = t >= 3 ? 22 : (t >= 2 ? 14 : 8);
            let hit = t >= 3 ? 8 : (t >= 2 ? 5 : 3);
            return `震暈耐性 +${st}%；近／遠命中 +${hit}；魔法命中 +${hit}`;
        }
    },
    na_bone_wall: {
        n: '骸骨之壁', role: '坦克', groups: ['SHIELD'], slot: 2,
        d: '受擊反彈傷害給攻擊者',
        desc(t, en) {
            let th = (t >= 3 ? 36 : (t >= 2 ? 24 : 14)) + Math.floor((en || 0) / 2);
            return `受擊反彈 ${th} 點傷害`;
        }
    },
    na_guardians_oath: {
        n: '守護者誓約', role: '輔助／坦', groups: ['SHIELD'], slot: 2,
        d: '受擊時恢復 HP',
        desc(t, en) {
            let v = (t >= 3 ? 18 : (t >= 2 ? 12 : 7)) + Math.floor((en || 0) / 3);
            return `受擊恢復 ${v} HP`;
        }
    },
    na_aegis_bastion: {
        n: '守護壁壘', role: '坦克', groups: ['SHIELD'], slot: 2,
        d: '受擊減傷／AC／物理減傷%',
        desc(t) {
            let pg = t >= 3 ? 8 : (t >= 2 ? 5 : 3);
            let ac = t >= 3 ? 3 : (t >= 2 ? 2 : 1);
            let pr = t >= 3 ? 6 : (t >= 2 ? 4 : 2);
            return `受擊減傷（一般攻擊）+${pg}%（每 3 秒最多 1 次）；AC −${ac}；受到物理傷害 −${pr}%`;
        }
    },
    na_silence_ward: {
        n: '沈黙結界', role: '法師／輔助', groups: ['CLOAK'], slot: 2,
        d: '魔法受傷減免＋MR',
        desc(t) {
            let red = t >= 3 ? 12 : (t >= 2 ? 8 : 5);
            let mr = t >= 3 ? 12 : (t >= 2 ? 8 : 5);
            return `受到魔法傷害 −${red}%；MR +${mr}`;
        }
    },
    na_shadow_veil: {
        n: '影紗潛行', role: '迴避／攻速', groups: ['CLOAK'], slot: 2,
        d: '迴避與攻速',
        desc(t) {
            let er = t >= 3 ? 11 : (t >= 2 ? 7 : 4);
            let as_ = t >= 3 ? 11 : (t >= 2 ? 7 : 4);
            return `迴避 +${er}；攻速 +${as_}%`;
        }
    },
    na_death_shroud: {
        n: '亡靈棺紗', role: '擊殺回復', groups: ['CLOAK'], slot: 2,
        d: '擊殺回 HP／MP',
        desc(t) {
            let heal = t >= 3 ? 70 : (t >= 2 ? 45 : 25);
            let mp = t >= 3 ? 5 : (t >= 2 ? 4 : 3);
            return `擊殺恢復 ${heal} HP、${mp} MP`;
        }
    },
    na_blood_frenzy: {
        n: '血宴狂氣', role: '遠近戰', groups: ['HAND'], slot: 2,
        d: '低血時輸出增幅',
        desc(t) {
            let amp = t >= 3 ? 22 : (t >= 2 ? 15 : 10);
            return `自身 HP＜35% 時，造成傷害 +${amp}%`;
        }
    },
    na_assassin_grip: {
        n: '暗殺者握勁', role: '遠近戰', groups: ['HAND'], slot: 2,
        d: '遠近戰命中／爆擊／傷害',
        desc(t) {
            let hit = t >= 3 ? 11 : (t >= 2 ? 7 : 4);
            let crit = t >= 3 ? 8 : (t >= 2 ? 5 : 3);
            let dmg = t >= 3 ? 6 : (t >= 2 ? 4 : 2);
            return `近／遠命中 +${hit}；近／遠爆擊 +${crit}%；近／遠傷害 +${dmg}`;
        }
    },
    na_spellweave: {
        n: '咒紋編織', role: '法師', groups: ['HAND'], slot: 2,
        d: '魔法傷害／命中／SP',
        desc(t) {
            let md = t >= 3 ? 8 : (t >= 2 ? 5 : 3);
            let hit = t >= 3 ? 11 : (t >= 2 ? 7 : 4);
            let mp = t >= 3 ? 8 : (t >= 2 ? 5 : 3);
            return `魔法傷害 +${md}；魔法命中 +${hit}；額外魔法點數 +${mp}`;
        }
    },
    na_froststep: {
        n: '霜骨步', role: '耐性／迴避', groups: ['FEET'], slot: 2,
        d: '冰凍耐性／免疫緩速／迴避',
        desc(t) {
            let fr = t >= 3 ? 22 : (t >= 2 ? 14 : 8);
            let er = t >= 3 ? 8 : (t >= 2 ? 5 : 3);
            let imm = t >= 2 ? '；免疫緩速' : '';
            return `冰凍耐性 +${fr}%${imm}；迴避 +${er}`;
        }
    },
    na_hunter_stride: {
        n: '追獵步伐', role: '攻速／命中', groups: ['FEET'], slot: 2,
        d: '攻速與命中',
        desc(t) {
            let as_ = t >= 3 ? 12 : (t >= 2 ? 8 : 5);
            let rh = t >= 3 ? 11 : (t >= 2 ? 7 : 4);
            let mh = t >= 3 ? 6 : (t >= 2 ? 4 : 2);
            return `攻速 +${as_}%；遠命中 +${rh}；近命中 +${mh}`;
        }
    },
    na_iron_march: {
        n: '鐵蹄進軍', role: '坦克', groups: ['FEET'], slot: 2,
        d: 'MR／震暈耐性／減傷',
        desc(t) {
            let mr = t >= 3 ? 12 : (t >= 2 ? 8 : 5);
            let st = t >= 3 ? 20 : (t >= 2 ? 12 : 6);
            let dr = t >= 3 ? 3 : (t >= 2 ? 2 : 1);
            return `MR +${mr}；震暈耐性 +${st}%；減傷 +${dr}`;
        }
    }
};

const NAZ_ARM_DRAW_POOLS_BASE = [
    ['na_stat_wis', 'na_stat_con', 'na_stat_cha'],
    ['na_res_water', 'na_res_fire', 'na_res_earth', 'na_res_wind'],
    null // slot 2 filled by gear group
];

const NAZ_ENCH = Object.assign({}, NAZ_WEAPON_ENCHANT, NAZ_ARMOR_ENCHANT);

/** 僅大墳墓專屬裝可銘刻：id 含 _naz_ 或 set 以 naz_ 開頭 */
function _neIsNazGear(itemOrId) {
    let id = typeof itemOrId === 'string' ? itemOrId : (itemOrId && itemOrId.id);
    if (!id) return false;
    if (id.indexOf('_naz_') >= 0) return true;
    let d = (typeof DB !== 'undefined' && DB.items) ? DB.items[id] : null;
    if (d && typeof d.set === 'string' && d.set.indexOf('naz_') === 0) return true;
    return false;
}

function nazEnchName(id) {
    return (NAZ_ENCH[id] && NAZ_ENCH[id].n) || id;
}
function nazEnchDesc(id, t, en, v) {
    let e = NAZ_ENCH[id];
    if (!e) return '';
    t = Math.max(1, Math.min(3, t || 1));
    if (typeof e.desc === 'function') return e.desc(t, en || 0, v);
    return e.d || '';
}
function nazEnchTierLabel(t) {
    t = Math.max(1, Math.min(3, t || 1));
    return 'T' + t;
}
function nazEnchList(item) {
    if (!item || !Array.isArray(item.ne)) return [];
    let out = [];
    item.ne.forEach(raw => {
        let id, t = 1, v, slot;
        if (typeof raw === 'string') id = raw;
        else if (raw && raw.id) {
            id = raw.id;
            t = Math.max(1, Math.min(3, raw.t || 1));
            if (raw.v != null) v = Math.max(1, Math.min(5, raw.v | 0));
            if (raw.slot != null) slot = Math.max(0, Math.min(2, raw.slot | 0));
        } else return;
        if (!NAZ_ENCH[id]) return;
        let entry = { id: id, t: t };
        if (v != null) entry.v = v;
        if (slot == null) slot = _neInferSlot(id);
        if (slot != null) entry.slot = slot;
        out.push(entry);
    });
    return out;
}

function _neInferSlot(id) {
    let def = NAZ_ENCH[id];
    if (def && def.slot != null) return def.slot;
    for (let s = 0; s < 3; s++) {
        if (NAZ_WPN_DRAW_POOLS[s] && NAZ_WPN_DRAW_POOLS[s].indexOf(id) >= 0) return s;
        if (NAZ_ARM_DRAW_POOLS_BASE[s] && NAZ_ARM_DRAW_POOLS_BASE[s].indexOf(id) >= 0) return s;
    }
    if (NAZ_WEAPON_ENCHANT[id] || NAZ_ARMOR_ENCHANT[id]) return 2;
    return null;
}

function _neGearGroup(d) {
    if (!d) return '';
    if (d.type === 'wpn' && !d.isArrow) return 'wpn';
    let s = d.slot || '';
    if (d.type === 'arm') {
        if (s === 'helm' || s === 'head') return 'HELM';
        if (s === 'armor' || s === 'body' || !s) return 'ARMOR';
        if (s === 'cloak') return 'CLOAK';
        if (s === 'gloves' || s === 'glove' || s === 'hand') return 'HAND';
        if (s === 'boots' || s === 'boot' || s === 'feet') return 'FEET';
        if (s === 'shield') return 'SHIELD';
        return 'ARMOR';
    }
    if (s === 'helm') return 'HELM';
    if (s === 'armor') return 'ARMOR';
    if (s === 'cloak') return 'CLOAK';
    if (s === 'gloves') return 'HAND';
    if (s === 'boots') return 'FEET';
    if (s === 'shield') return 'SHIELD';
    return '';
}
function _neEligibleDef(d, itemOrId) {
    if (!d) return false;
    let id = typeof itemOrId === 'string' ? itemOrId : (itemOrId && itemOrId.id);
    if (!id && d) return false;
    if (!_neIsNazGear(id || itemOrId)) return false;
    if (d.type === 'wpn' && !d.isArrow) return true;
    let g = _neGearGroup(d);
    return !!(g && g !== 'wpn');
}
function _neEligibleItem(item) {
    if (!item || !item.id) return false;
    let d = DB.items[item.id];
    return _neEligibleDef(d, item);
}
function _neIsGearItem(item) {
    if (!_neEligibleItem(item)) return false;
    let d = DB.items[item.id];
    return !!(d && d.type !== 'wpn');
}
function _neItemEn(item) {
    if (!item) return 0;
    let d = DB.items[item.id];
    if (d && d.type === 'wpn') return (typeof capWpnEn === 'function') ? capWpnEn(item.en || 0) : (item.en || 0);
    return (typeof capEn === 'function') ? capEn(item.en || 0, d) : (item.en || 0);
}

/** 依裝備類型＋部位回傳某槽抽池（唔含 retired） */
function _neDrawPoolForSlot(d, slotIdx, ownedIds) {
    let skip = {};
    (ownedIds || []).forEach(id => { skip[id] = true; });
    let pool = [];
    if (d && d.type === 'wpn' && !d.isArrow) {
        pool = (NAZ_WPN_DRAW_POOLS[slotIdx] || []).slice();
    } else if (slotIdx === 0 || slotIdx === 1) {
        pool = (NAZ_ARM_DRAW_POOLS_BASE[slotIdx] || []).slice();
    } else {
        let g = _neGearGroup(d);
        pool = Object.keys(NAZ_ARMOR_ENCHANT).filter(id => {
            let e = NAZ_ARMOR_ENCHANT[id];
            if (!e || e.slot !== 2 || e.retired || e.noUpgrade) return false;
            let gs = e.groups || [];
            return gs.indexOf(g) >= 0;
        });
    }
    return pool.filter(id => !skip[id] && NAZ_ENCH[id] && !NAZ_ENCH[id].retired);
}

/** 將現有 ne 編成 3 槽陣列（祖父溢出掛喺 overflow） */
function _neSlotMap(item, isWpn) {
    let all = nazEnchList(item);
    let relevant = isWpn
        ? all.filter(x => NAZ_WEAPON_ENCHANT[x.id])
        : all.filter(x => NAZ_ARMOR_ENCHANT[x.id]);
    let slots = [null, null, null];
    let overflow = [];
    relevant.forEach(e => {
        let s = (e.slot != null) ? e.slot : _neInferSlot(e.id);
        if (s == null || s < 0 || s > 2) s = 2;
        let entry = Object.assign({}, e, { slot: s });
        if (!slots[s]) slots[s] = entry;
        else overflow.push(entry);
    });
    return { slots: slots, overflow: overflow, all: relevant };
}
function _neSerializeSlots(slots, overflow, otherKeep) {
    let out = [];
    for (let i = 0; i < 3; i++) {
        if (slots[i]) {
            let e = { id: slots[i].id, t: slots[i].t || 1, slot: i };
            if (slots[i].v != null) e.v = slots[i].v;
            out.push(e);
        }
    }
    (overflow || []).forEach(e => {
        let x = { id: e.id, t: e.t || 1, slot: e.slot != null ? e.slot : 2 };
        if (e.v != null) x.v = e.v;
        out.push(x);
    });
    (otherKeep || []).forEach(e => {
        let x = { id: e.id, t: e.t || 1 };
        if (e.v != null) x.v = e.v;
        if (e.slot != null) x.slot = e.slot;
        out.push(x);
    });
    return out;
}

function _neRollStatV() {
    return 1 + Math.floor(_neRng() * 5);
}
function _neMakeDrawEntry(id, slotIdx) {
    let def = NAZ_ENCH[id];
    let e = { id: id, t: 1, slot: slotIdx };
    if (def && def.stat) e.v = _neRollStatV();
    return e;
}
function _neCanUpgrade(id) {
    let def = NAZ_ENCH[id];
    if (!def || def.noUpgrade || def.retired) return false;
    return (def.slot == null || def.slot === 2);
}

function _neUpgradeCostFor(isWpn, nextTier) {
    return (isWpn ? NW_UPGRADE_COST : NA_UPGRADE_COST)[nextTier];
}
function _neSealHave() {
    return (typeof questCountId === 'function') ? questCountId('mat_nazarick_runeseal') : 0;
}
function _neCrystalHave() {
    return (typeof questCountId === 'function') ? questCountId('mat_nazarick_soulcrystal') : 0;
}
function _neConsumeSeal(n) {
    n = Math.max(0, Math.floor(n) || 0);
    if (!n) return true;
    if (_neSealHave() < n) return false;
    if (typeof questConsumeId === 'function') questConsumeId('mat_nazarick_runeseal', n);
    return true;
}
function _neConsumeCrystal(n) {
    n = Math.max(0, Math.floor(n) || 0);
    if (!n) return true;
    if (_neCrystalHave() < n) return false;
    if (typeof questConsumeId === 'function') questConsumeId('mat_nazarick_soulcrystal', n);
    return true;
}
function _neConsumeGold(n) {
    n = Math.max(0, Math.floor(n) || 0);
    if (!n) return true;
    if (!player || (player.gold || 0) < n) return false;
    player.gold -= n;
    return true;
}
function _neFindByUid(uid) {
    if (!uid || !player) return null;
    if (player.eq) {
        for (let k in player.eq) {
            let it = player.eq[k];
            if (it && it.uid === uid) return { item: it, where: 'eq', slot: k };
        }
    }
    if (Array.isArray(player.inv)) {
        for (let i = 0; i < player.inv.length; i++) {
            let it = player.inv[i];
            if (it && it.uid === uid) return { item: it, where: 'inv', index: i };
        }
    }
    return null;
}
function _neSplitIfStacked(found) {
    if (!found || found.where !== 'inv') return found;
    let target = found.item;
    if ((target.cnt || 1) <= 1) return found;
    target.cnt--;
    let single = Object.assign({}, target, { cnt: 1, uid: (typeof uid === 'function' ? uid() : ('ne_' + Date.now())) });
    if (Array.isArray(target.se)) single.se = JSON.parse(JSON.stringify(target.se));
    if (Array.isArray(target.ne)) single.ne = JSON.parse(JSON.stringify(target.ne));
    if (Array.isArray(target.gw)) single.gw = target.gw.slice();
    delete target.ne;
    player.inv.push(single);
    _neNpcSelUid = single.uid;
    return { item: single, where: 'inv' };
}
function _neRng() {
    if (typeof lootRng === 'function') {
        try { return lootRng('naz_ench'); } catch (e) {}
    }
    return Math.random();
}
function _nePick(pool) {
    if (!pool || !pool.length) return '';
    return pool[Math.floor(_neRng() * pool.length)];
}
function _neEligibleEntries() {
    let rows = [];
    if (player && player.eq) {
        Object.keys(player.eq).forEach(slot => {
            let it = player.eq[slot];
            if (!it) return;
            if (!_neEligibleDef(DB.items[it.id], it)) return;
            rows.push({ item: it, where: 'eq', slot: slot });
        });
    }
    if (player && Array.isArray(player.inv)) {
        player.inv.forEach(it => {
            if (!it) return;
            if (!_neEligibleDef(DB.items[it.id], it)) return;
            rows.push({ item: it, where: 'inv' });
        });
    }
    return rows;
}
function _neAfter() {
    try { if (typeof calcStats === 'function') calcStats(); } catch (e) {}
    try { if (typeof renderTabs === 'function') renderTabs(true); } catch (e) {}
    try { if (typeof updateUI === 'function') updateUI(); } catch (e) {}
    try {
        let el = document.getElementById('interaction-content');
        if (el) renderNazarickEnchant(el);
    } catch (e) {}
}

let _neNpcSelUid = '';
let _neSmithTab = 'craft';

function neSelectItem(uid) {
    _neNpcSelUid = uid || '';
    let el = document.getElementById('interaction-content');
    if (el) renderNazarickEnchant(el);
}

function neDrawEnchant() {
    let found = _neFindByUid(_neNpcSelUid);
    if (!found) { logSys('<span class="text-amber-300">未選擇裝備。</span>'); return; }
    found = _neSplitIfStacked(found);
    let d = DB.items[found.item.id];
    if (!_neEligibleItem(found.item)) {
        logSys('<span class="text-amber-300">只有大墳墓專屬武器／防具／遺物可以銘刻納薩力克附魔。</span>');
        return;
    }
    let isWpn = d.type === 'wpn' && !d.isArrow;
    let map = _neSlotMap(found.item, isWpn);
    let slotIdx = -1;
    for (let i = 0; i < 3; i++) {
        if (!map.slots[i]) { slotIdx = i; break; }
    }
    if (slotIdx < 0) {
        logSys(`<span class="text-amber-300">已經有 ${isWpn ? NAZ_ENCH_MAX_WPN : NAZ_ENCH_MAX_ARM} 條納薩力克附魔。</span>`);
        return;
    }
    let owned = map.slots.filter(Boolean).map(x => x.id);
    let pool = _neDrawPoolForSlot(d, slotIdx, owned);
    if (!pool.length) { logSys('<span class="text-amber-300">呢個槽冇得再抽嘅附魔。</span>'); return; }
    if (_neSealHave() < NAZ_ENCH_COST_DRAW) {
        logSys(`<span class="text-red-400 font-bold">納薩力克咒印不足。</span>（需要 ${NAZ_ENCH_COST_DRAW}）`);
        return;
    }
    _neConsumeSeal(NAZ_ENCH_COST_DRAW);
    let picked = _nePick(pool);
    let entry = _neMakeDrawEntry(picked, slotIdx);
    map.slots[slotIdx] = entry;
    let otherKeep = isWpn
        ? nazEnchList(found.item).filter(x => NAZ_ARMOR_ENCHANT[x.id])
        : nazEnchList(found.item).filter(x => NAZ_WEAPON_ENCHANT[x.id]);
    found.item.ne = _neSerializeSlots(map.slots, map.overflow, otherKeep);
    let kind = isWpn ? '武器' : '防具';
    let vNote = entry.v != null ? ` +${entry.v}` : '';
    logSys(`<span class="c-nazarick font-bold">✦ 大墳墓工匠銘刻${kind}附魔【${NAZ_SLOT_LABELS[slotIdx]}】：${nazEnchName(picked)}${vNote} T1</span>（${nazEnchDesc(picked, 1, _neItemEn(found.item), entry.v)}）（消耗 納薩力克咒印 ×${NAZ_ENCH_COST_DRAW}）`);
    _neAfter();
}

function neRerollEnchant(slotIdx) {
    let found = _neFindByUid(_neNpcSelUid);
    if (!found) { logSys('<span class="text-amber-300">未選擇裝備。</span>'); return; }
    found = _neSplitIfStacked(found);
    if (!_neEligibleItem(found.item)) {
        logSys('<span class="text-amber-300">只有大墳墓專屬武器／防具／遺物可以銘刻納薩力克附魔。</span>');
        return;
    }
    let d = DB.items[found.item.id];
    let isWpn = d.type === 'wpn' && !d.isArrow;
    let map = _neSlotMap(found.item, isWpn);
    let cur = map.slots[slotIdx];
    if (!cur) { logSys('<span class="text-amber-300">呢個槽係空嘅。</span>'); return; }
    // 改寫喺同一槽池；排除其他已佔 id（可抽返自己以外）
    let owned = map.slots.filter((x, i) => x && i !== slotIdx).map(x => x.id);
    let pool = _neDrawPoolForSlot(d, slotIdx, owned);
    // 祖父 retired：改寫時用簽名抽池取代
    if (!pool.length && cur.slot === 2) {
        pool = _neDrawPoolForSlot(d, 2, owned);
    }
    if (!pool.length) { logSys('<span class="text-amber-300">冇得改寫嘅附魔。</span>'); return; }
    if (_neSealHave() < NAZ_ENCH_COST_REROLL) {
        logSys(`<span class="text-red-400 font-bold">納薩力克咒印不足。</span>（需要 ${NAZ_ENCH_COST_REROLL}）`);
        return;
    }
    _neConsumeSeal(NAZ_ENCH_COST_REROLL);
    let picked = _nePick(pool);
    let entry = _neMakeDrawEntry(picked, slotIdx);
    map.slots[slotIdx] = entry;
    let otherKeep = isWpn
        ? nazEnchList(found.item).filter(x => NAZ_ARMOR_ENCHANT[x.id])
        : nazEnchList(found.item).filter(x => NAZ_WEAPON_ENCHANT[x.id]);
    found.item.ne = _neSerializeSlots(map.slots, map.overflow, otherKeep);
    let vNote = entry.v != null ? ` +${entry.v}` : '';
    logSys(`<span class="c-nazarick font-bold">✦ 大墳墓工匠改寫【${NAZ_SLOT_LABELS[slotIdx]}】：${nazEnchName(picked)}${vNote} T1</span>（${nazEnchDesc(picked, 1, _neItemEn(found.item), entry.v)}）（消耗 咒印 ×${NAZ_ENCH_COST_REROLL}；階層重置）`);
    _neAfter();
}

function neUpgradeEnchant(slotIdx) {
    let found = _neFindByUid(_neNpcSelUid);
    if (!found) { logSys('<span class="text-amber-300">未選擇裝備。</span>'); return; }
    found = _neSplitIfStacked(found);
    if (!_neEligibleItem(found.item)) {
        logSys('<span class="text-amber-300">只有大墳墓專屬武器／防具／遺物可以銘刻納薩力克附魔。</span>');
        return;
    }
    let d = DB.items[found.item.id];
    let isWpn = d.type === 'wpn' && !d.isArrow;
    let map = _neSlotMap(found.item, isWpn);
    let entry = map.slots[slotIdx];
    if (!entry) { logSys('<span class="text-amber-300">冇呢條附魔。</span>'); return; }
    if (!_neCanUpgrade(entry.id)) {
        logSys('<span class="text-amber-300">呢條附魔唔可以升級（屬性／元素槽無 T2／T3）。</span>');
        return;
    }
    let next = (entry.t || 1) + 1;
    if (next > 3) { logSys('<span class="text-amber-300">已滿階。</span>'); return; }
    let cost = _neUpgradeCostFor(isWpn, next);
    if (!cost) return;
    if (_neSealHave() < cost.seal) {
        logSys(`<span class="text-red-400 font-bold">納薩力克咒印不足。</span>（需要 ${cost.seal}）`);
        return;
    }
    if (cost.crystal && _neCrystalHave() < cost.crystal) {
        logSys(`<span class="text-red-400 font-bold">納薩力克魂晶不足。</span>（需要 ${cost.crystal}）`);
        return;
    }
    if ((player.gold || 0) < cost.gold) {
        logSys(`<span class="text-red-400 font-bold">金幣不足。</span>（需要 ${cost.gold.toLocaleString()}）`);
        return;
    }
    _neConsumeSeal(cost.seal);
    if (cost.crystal) _neConsumeCrystal(cost.crystal);
    _neConsumeGold(cost.gold);
    entry.t = next;
    map.slots[slotIdx] = entry;
    let otherKeep = isWpn
        ? nazEnchList(found.item).filter(x => NAZ_ARMOR_ENCHANT[x.id])
        : nazEnchList(found.item).filter(x => NAZ_WEAPON_ENCHANT[x.id]);
    found.item.ne = _neSerializeSlots(map.slots, map.overflow, otherKeep);
    let bits = [`咒印×${cost.seal}`];
    if (cost.crystal) bits.push(`魂晶×${cost.crystal}`);
    bits.push(`金 ${cost.gold.toLocaleString()}`);
    logSys(`<span class="c-nazarick font-bold">✦ 大墳墓工匠強化附魔：${nazEnchName(entry.id)} → T${next}</span>（${nazEnchDesc(entry.id, next, _neItemEn(found.item), entry.v)}）（消耗 ${bits.join('、')}）`);
    _neAfter();
}

function renderNazarickSmithHub(div, tab) {
    if (tab) _neSmithTab = tab;
    if (!div) div = document.getElementById('interaction-content');
    if (!div) return;
    if (_neSmithTab === 'enchant') {
        renderNazarickEnchant(div);
        return;
    }
    if (typeof renderUniversalCraft === 'function') {
        renderUniversalCraft(div, 'npc_nazarick_smith');
        let bar = `<div class="flex gap-2 mb-3 px-1">
            <button type="button" class="btn px-3 py-1 text-sm bg-violet-900 border-violet-500 font-bold" onclick="renderNazarickSmithHub(null,'craft')">製作／卷軸</button>
            <button type="button" class="btn px-3 py-1 text-sm bg-slate-800 border-slate-600" onclick="renderNazarickSmithHub(null,'enchant')">納薩力克附魔</button>
        </div>`;
        div.innerHTML = bar + div.innerHTML;
    } else {
        div.innerHTML = '<div class="p-4 text-red-400">製作系統未載入。</div>';
    }
}

function renderNazarickEnchant(div) {
    if (!div) return;
    _neSmithTab = 'enchant';
    let have = _neSealHave();
    let cry = _neCrystalHave();
    let gold = (player && player.gold) || 0;
    let rows = _neEligibleEntries();
    if (!_neNpcSelUid && rows[0] && rows[0].item) _neNpcSelUid = rows[0].item.uid;
    let found = _neFindByUid(_neNpcSelUid);
    let sel = found && found.item;
    let selD = sel && DB.items[sel.id];
    if (sel && !_neEligibleItem(sel)) { sel = null; selD = null; }

    let listHtml = rows.map(r => {
        let it = r.item;
        let d = DB.items[it.id];
        let isWpn = d && d.type === 'wpn' && !d.isArrow;
        let map = _neSlotMap(it, isWpn);
        let nShow = map.slots.filter(Boolean).length;
        let maxShow = isWpn ? NAZ_ENCH_MAX_WPN : NAZ_ENCH_MAX_ARM;
        let mark = r.where === 'eq' ? '<span class="text-slate-500 text-xs">穿著</span>' : '';
        let on = it.uid === _neNpcSelUid;
        let kind = d && d.type === 'wpn' ? '武器' : '防具';
        return `<button type="button" class="w-full text-left px-2 py-1.5 rounded border ${on ? 'border-violet-500 bg-violet-950/50' : 'border-slate-700 bg-slate-900/70 hover:bg-slate-800'} mb-1" onclick="neSelectItem('${it.uid}')">
            <div class="flex items-center justify-between gap-2">
                <span class="truncate text-sm font-bold">${typeof getItemFullName === 'function' ? getItemFullName(it) : (d && d.n)}</span>
                ${mark}
            </div>
            <div class="text-xs text-slate-400">${kind}・納薩附魔 ${nShow}/${maxShow}</div>
        </button>`;
    }).join('') || '<div class="text-slate-500 text-sm py-6 text-center">背包同身上冇大墳墓專屬裝備（守護／奧術套、納薩武器、納薩遺物）。</div>';

    let detail = '<div class="text-slate-500 text-sm py-6 text-center">喺左邊揀一件裝備。</div>';
    if (sel && selD) {
        let isWpn = selD.type === 'wpn' && !selD.isArrow;
        let isGear = _neIsGearItem(sel);
        let en = _neItemEn(sel);
        let map = _neSlotMap(sel, isWpn);
        let maxSlots = isWpn ? NAZ_ENCH_MAX_WPN : (isGear ? NAZ_ENCH_MAX_ARM : 0);
        let costTable = isWpn ? NW_UPGRADE_COST : NA_UPGRADE_COST;
        let hints = isWpn ? NAZ_SLOT_HINTS_WPN : NAZ_SLOT_HINTS_ARM;
        let slots = '';
        for (let i = 0; i < maxSlots; i++) {
            let e = map.slots[i];
            let slotTitle = NAZ_SLOT_LABELS[i];
            if (e) {
                let next = (e.t || 1) + 1;
                let cost = costTable[next];
                let upBtn = '';
                if (_neCanUpgrade(e.id)) {
                    if (cost) {
                        let ok = have >= cost.seal && cry >= cost.crystal && gold >= cost.gold;
                        let tip = `升 T${next}：咒印×${cost.seal}` + (cost.crystal ? `、魂晶×${cost.crystal}` : '') + `、金 ${cost.gold.toLocaleString()}`;
                        upBtn = `<button class="btn px-2 py-1 text-xs ${ok ? 'bg-violet-900 border-violet-500' : 'opacity-50'}" title="${tip}" onclick="neUpgradeEnchant(${i})">升級→T${next}</button>`;
                    } else {
                        upBtn = `<span class="text-xs text-amber-300 font-bold">滿階 T3</span>`;
                    }
                } else {
                    upBtn = `<span class="text-xs text-slate-500">無升級</span>`;
                }
                let vNote = e.v != null ? ` <span class="text-emerald-300">+${e.v}</span>` : '';
                slots += `<div class="border border-violet-800 bg-violet-950/40 rounded p-2 mb-2">
                    <div class="text-[10px] text-violet-300/80 mb-0.5">${slotTitle}・${hints[i]}</div>
                    <div class="flex items-center justify-between gap-2 flex-wrap">
                        <span class="c-nazarick font-bold">✦ ${nazEnchName(e.id)}${vNote} <span class="text-amber-300">${nazEnchTierLabel(e.t)}</span></span>
                        <div class="flex gap-1">${upBtn}
                            <button class="btn px-2 py-1 text-xs bg-violet-900 border-violet-600" onclick="neRerollEnchant(${i})">改寫 ×${NAZ_ENCH_COST_REROLL}</button>
                        </div>
                    </div>
                    <div class="text-xs text-slate-300 mt-1">${nazEnchDesc(e.id, e.t, en, e.v)}</div>
                </div>`;
            } else {
                slots += `<div class="border border-dashed border-slate-700 rounded p-2 mb-2 text-slate-500 text-sm">
                    <div class="font-bold text-slate-400">${slotTitle}（空）</div>
                    <div class="text-xs mt-0.5">${hints[i]}</div>
                </div>`;
            }
        }
        let filled = map.slots.filter(Boolean).length;
        let canDraw = (isWpn || isGear) && filled < maxSlots;
        let nextEmpty = map.slots.findIndex(x => !x);
        let title = isWpn ? `武器附魔 ${filled}/${NAZ_ENCH_MAX_WPN}` : `防具附魔 ${filled}/${NAZ_ENCH_MAX_ARM}`;
        let drawLabel = nextEmpty >= 0
            ? `抽取${isWpn ? '武器' : '防具'}【${NAZ_SLOT_LABELS[nextEmpty]}】T1`
            : (isWpn ? '抽取武器附魔 T1' : '抽取防具附魔 T1');
        let poolHtml = '';
        if (isWpn || isGear) {
            let blocks = [];
            for (let s = 0; s < 3; s++) {
                let fullPool = _neDrawPoolForSlot(selD, s, []);
                let owned = map.slots[s] ? map.slots[s].id : '';
                let prows = fullPool.map(id => {
                    let def = NAZ_ENCH[id];
                    if (!def) return '';
                    let mark = owned === id ? ' <span class="text-violet-300">（已有）</span>' : '';
                    return `<div class="text-xs border-b border-slate-800/80 py-0.5"><span class="c-nazarick font-bold">${def.n}</span>${mark} <span class="text-slate-500">〔${def.role || ''}〕</span> <span class="text-slate-400">${def.d}</span></div>`;
                }).filter(Boolean).join('');
                blocks.push(`<div class="mb-2"><div class="text-violet-200 text-xs font-bold mb-0.5">${NAZ_SLOT_LABELS[s]}（${fullPool.length}）・${hints[s]}</div>${prows || '<div class="text-xs text-slate-600">（空池）</div>'}</div>`);
            }
            poolHtml = `<div class="mt-3 border border-slate-700 rounded p-2 bg-slate-900/60">
                <div class="text-slate-200 font-bold text-sm mb-1">呢件可抽到的附魔（按槽）</div>
                <div class="overflow-y-auto pr-1" style="max-height:12rem;">${blocks.join('')}</div>
            </div>`;
        }
        detail = `
            <div class="font-bold mb-2">${typeof getItemFullName === 'function' ? getItemFullName(sel) : selD.n} <span class="text-slate-400 text-xs">強化 +${en}</span></div>
            <div class="text-slate-200 font-bold text-sm mb-1">${title}</div>
            ${slots}
            <button class="btn w-full py-2 font-bold ${canDraw ? 'bg-violet-900 border-violet-500' : 'opacity-50 cursor-not-allowed'}" ${canDraw ? 'onclick="neDrawEnchant()"' : 'disabled'}>
                <span class="c-nazarick">${drawLabel}</span> ×${NAZ_ENCH_COST_DRAW}
            </button>
            ${canDraw ? '<div class="text-xs text-slate-500 mt-1">抽取順序：空槽 1→2→3；每槽只抽該槽專屬池。屬性／元素無升級，簽名可升 T2／T3。</div>' : `<div class="text-xs text-slate-500 mt-1">已滿 ${maxSlots} 槽；可以改寫或升級簽名。</div>`}
            ${poolHtml}`;
    }

    let catalogW = '';
    for (let s = 0; s < 3; s++) {
        let ids = NAZ_WPN_DRAW_POOLS[s] || [];
        catalogW += `<div class="text-violet-300 text-xs font-bold mt-1 mb-0.5">${NAZ_SLOT_LABELS[s]}</div>`;
        ids.forEach(id => {
            let e = NAZ_WEAPON_ENCHANT[id];
            if (!e) return;
            catalogW += `<div class="text-xs border-b border-slate-800 py-1"><span class="c-nazarick font-bold">${e.n}</span> <span class="text-slate-500">〔${e.role}〕</span> <span class="text-slate-300">${e.d}</span></div>`;
        });
    }
    catalogW += `<div class="text-slate-500 text-xs mt-2">祖父保留（唔入抽池）：完璧戰士、霜骨敕令</div>`;

    let catalogA = '';
    catalogA += `<div class="text-violet-300 text-xs font-bold mt-1 mb-0.5">${NAZ_SLOT_LABELS[0]}／${NAZ_SLOT_LABELS[1]}</div>`;
    ['na_stat_wis','na_stat_con','na_stat_cha','na_res_water','na_res_fire','na_res_earth','na_res_wind'].forEach(id => {
        let e = NAZ_ARMOR_ENCHANT[id];
        if (!e) return;
        catalogA += `<div class="text-xs border-b border-slate-800 py-1"><span class="c-nazarick font-bold">${e.n}</span> <span class="text-slate-500">〔${e.role}〕</span> <span class="text-slate-300">${e.d}</span></div>`;
    });
    catalogA += `<div class="text-violet-300 text-xs font-bold mt-2 mb-0.5">${NAZ_SLOT_LABELS[2]}・部位獨占</div>`;
    Object.keys(NAZ_ARMOR_ENCHANT).forEach(id => {
        let e = NAZ_ARMOR_ENCHANT[id];
        if (!e || e.slot !== 2) return;
        let g = (e.groups && e.groups.length) ? e.groups.join('/') : '';
        catalogA += `<div class="text-xs border-b border-slate-800 py-1"><span class="c-nazarick font-bold">${e.n}</span> <span class="text-amber-400/80">${g}</span> <span class="text-slate-500">〔${e.role}〕</span> <span class="text-slate-300">${e.d}</span></div>`;
    });

    div.innerHTML = `<div class="p-2 flex flex-col gap-3">
        <div class="flex gap-2">
            <button type="button" class="btn px-3 py-1 text-sm bg-slate-800 border-slate-600" onclick="renderNazarickSmithHub(null,'craft')">製作／卷軸</button>
            <button type="button" class="btn px-3 py-1 text-sm bg-violet-900 border-violet-500 font-bold" onclick="renderNazarickSmithHub(null,'enchant')">納薩力克附魔</button>
        </div>
        <div class="text-slate-300 text-sm">大墳墓工匠：「三道咒印、三條法則——屬性、元素、簽名。獻上納薩力克咒印，我替你銘刻至高者殘響。」</div>
        <div class="text-xs text-slate-400">
            僅限大墳墓專屬裝（id 含 _naz_／遺物 relic_naz_*）。武器／防具各 <span class="c-nazarick font-bold">${NAZ_ENCH_MAX_WPN} 槽</span>（第1屬性／第2元素／第3簽名・與席琳附魔並存）。
            抽取 T1 ×${NAZ_ENCH_COST_DRAW}、改寫 ×${NAZ_ENCH_COST_REROLL}；
            武器 T2：咒印×${NW_UPGRADE_COST[2].seal}＋金8萬；T3：咒印×${NW_UPGRADE_COST[3].seal}＋魂晶×${NW_UPGRADE_COST[3].crystal}＋金30萬。
            防具 T2：咒印×${NA_UPGRADE_COST[2].seal}＋金6萬；T3：咒印×${NA_UPGRADE_COST[3].seal}＋魂晶×${NA_UPGRADE_COST[3].crystal}＋金22萬。
            持有：<span class="c-nazarick font-bold">咒印 ${have.toLocaleString()}</span>／
            <span class="text-violet-300 font-bold">魂晶 ${cry.toLocaleString()}</span>／
            <span class="text-yellow-300 font-bold">金 ${gold.toLocaleString()}</span>
        </div>
        <div class="grid gap-3" style="grid-template-columns:minmax(180px,38%) 1fr;">
            <div class="max-h-80 overflow-y-auto pr-1">${listHtml}</div>
            <div>${detail}</div>
        </div>
        <details class="border border-slate-700 rounded p-2 bg-slate-900/50">
            <summary class="cursor-pointer text-slate-200 font-bold text-sm">武器附魔一覽（3 槽）</summary>
            <div class="mt-2">${catalogW}</div>
        </details>
        <details class="border border-slate-700 rounded p-2 bg-slate-900/50">
            <summary class="cursor-pointer text-slate-200 font-bold text-sm">防具附魔一覽（3 槽＋18 簽名）</summary>
            <div class="mt-2">${catalogA}</div>
        </details>
    </div>`;
}

window.NAZ_WEAPON_ENCHANT = NAZ_WEAPON_ENCHANT;
window.NAZ_ARMOR_ENCHANT = NAZ_ARMOR_ENCHANT;
window.NAZ_ENCH = NAZ_ENCH;
window.NAZ_ENCH_MAX_WPN = NAZ_ENCH_MAX_WPN;
window.NAZ_ENCH_MAX_ARM = NAZ_ENCH_MAX_ARM;
window.nazEnchName = nazEnchName;
window.nazEnchDesc = nazEnchDesc;
window.nazEnchList = nazEnchList;
window.nazEnchTierLabel = nazEnchTierLabel;
window._neIsNazGear = _neIsNazGear;
window.neDrawEnchant = neDrawEnchant;
window.neRerollEnchant = neRerollEnchant;
window.neUpgradeEnchant = neUpgradeEnchant;
window.neSelectItem = neSelectItem;
window.renderNazarickEnchant = renderNazarickEnchant;
window.renderNazarickSmithHub = renderNazarickSmithHub;
