// ========== 🧬 怪物大宗族＋四大屬性顯示（raceMajor / e）==========
// 既有 mob.race 為細分種族／副本陣營標籤，戰鬥加成（raceBonus／raceDr／血盟×2…）仍吃細分值，不可覆寫。
// 本檔在 DB 載入後為每隻怪推導 raceMajor（大宗族）與四大屬性 e（fire/water/wind/earth），
// 並提供 getMobDisplayName 供戰鬥 UI／日誌統一顯示：死亡騎士(不死族/地)。

const MOB_RACE_MAJOR_LABELS = {
    undead: '不死族', demon: '惡魔族', humanoid: '人型', animal: '動物',
    dragon: '龍族', spirit: '精靈族', elemental: '元素', insect: '昆蟲',
    plant: '植物', construct: '構造體', demi: '亞人', other: '異界'
};

const MOB_ELEMENT_LABELS = {
    fire: '火', water: '水', wind: '風', earth: '地'
};
const MOB_ELEMENTS = ['fire', 'water', 'wind', 'earth'];

const MOB_RACE_TO_MAJOR = {
    '不死': 'undead', '殭屍': 'undead', '吸血鬼': 'undead', '巫妖': 'undead', '死神': 'undead', '靈魂': 'undead',
    '惡魔': 'demon', '安普': 'demon', '地獄犬': 'demon', '阿西塔基奧': 'demon',
    '玩家': 'humanoid', '血盟': 'humanoid', '黑騎士': 'humanoid', '強盜': 'humanoid', '法師': 'humanoid',
    '長者': 'humanoid', '長老': 'humanoid', '四色': 'humanoid',
    '動物': 'animal', '野獸': 'animal', '魔狼': 'animal', '鯊魚': 'animal', '鮟鱇': 'animal',
    '螃蟹': 'animal', '寄居蟹': 'animal', '海星': 'animal', '龍龜': 'animal',
    '龍': 'dragon', '飛龍': 'dragon', '不死鳥': 'dragon',
    '精靈': 'spirit', '黑暗妖精': 'spirit', '黑暗精靈': 'spirit', '食人妖精': 'spirit',
    '潘': 'spirit', '獨角獸': 'spirit', '格利芬': 'spirit', '黑暗棲林者': 'spirit', '人魚': 'spirit',
    '元素': 'elemental', '地靈': 'elemental', '鬼火': 'elemental',
    '昆蟲': 'insect', '蜘蛛': 'insect', '螞蟻': 'insect', '蜈蚣': 'insect', '毒蠍': 'insect', '思克巴': 'insect',
    '蘑菇': 'plant', '爆彈花': 'plant', '安特': 'plant',
    '高崙': 'construct', '建築': 'construct', '寶箱': 'construct', '魔法生物': 'construct',
    '妖怪': 'demi', '妖魔': 'demi', '哥布林': 'demi', '歐姆': 'demi', '歐吉': 'demi', '巨人': 'demi',
    '狼人': 'demi', '蜥蜴人': 'demi', '蛇女': 'demi', '牛人': 'demi', '變形怪': 'demi', '眼魔': 'demi',
    '喀瑪': 'demi', '哈維': 'demi', '亞力安': 'demi', '侏儒': 'demi', '多羅': 'demi', '鼠人': 'demi',
    '雪怪': 'demi', '梅杜莎': 'demi', '奇美拉': 'demi', '邪惡蜥蜴': 'demi', '亞人': 'demi',
    '提卡爾': 'demi',
    '拉斯塔巴德': 'demon',
    '異界生物': 'other',
    '墳墓守護者': 'undead',
    '反王軍': 'humanoid'   // 🏰 v3.8.61 亞丁城堡
};

/** 名稱明確覆寫大宗族（細分 race 誤標時；如巨大骷髏 race=妖怪→demi） */
const MOB_RACE_MAJOR_NAME_OVERRIDES = {
    '巨大骷髏': 'undead'
};

/** 細分種族視為不死（戰鬥加成／即死／墓碑盾與 raceMajor 對齊） */
const MOB_UNDEAD_FINE_RACES = {
    '不死': 1, '不死族': 1, '殭屍': 1, '吸血鬼': 1, '巫妖': 1, '死神': 1, '靈魂': 1, '墳墓守護者': 1
};

/** 名稱關鍵字：補捉 raceMajor 未標成 undead、但明顯亡者的怪（避免單字「死」誤傷不死鳥等） */
const MOB_UNDEAD_NAME_RE = /骷髏|食屍|屍鬼|亡靈|木乃伊|巫妖|吸血鬼|殭屍|死神|死亡騎士|鬼魂|影魔|死亡之劍|魂騎士|巨大骷髏|幽魂|紅鬼魂|不死(?!鳥)/;

/**
 * 統一判定「是否不死」——所有對不死裝備／魔法共用。
 * true when: m.un、raceMajor==='undead'、細分 race 屬不死系、或名稱關鍵字命中。
 */
function isUndeadMob(m) {
    if (!m) return false;
    if (m.un) return true;
    if (m.raceMajor === 'undead') return true;
    let fine = m.race || '';
    if (fine && MOB_UNDEAD_FINE_RACES[fine]) return true;
    let n = m.n || '';
    if (n && MOB_UNDEAD_NAME_RE.test(n)) return true;
    return false;
}

/** 明確覆寫（名稱／種族規則推不到、或既有 e 明顯不合理時） */
const MOB_ELEMENT_OVERRIDES = {
    // 既有錯誤修正
    baphomet: 'fire',
    ant_kama_flame: 'fire',
    ant_kama_flame_king: 'fire',
    iv_stone_golem: 'earth',
    iv_iron_golem: 'earth',
    nm_039: 'fire',          // 夢幻之島鬼火（原 earth）
    nm_045: 'fire',          // 夢幻之島大鬼火（原 earth）
    pride_flamesoul_r: 'fire',
    pride_flamesoul_b: 'fire',
    // 明確 lore
    ice_demon: 'water',
    pride_fireegg: 'fire',
    flame_avatar: 'fire',
    flame_skba_queen: 'fire',
    flame_imp: 'fire',
    flame_baless: 'fire',
    flame_skba: 'fire',
    flame_demon: 'fire',
    flame_baphomet: 'fire',
    sanct_dantes: 'earth',
    pride_bonedragon: 'earth',
    sanct_wyvern: 'wind',
    pride_drake: 'wind',
    antaras: 'earth',
    fafurion: 'water',
    valakas: 'fire',
    lindvior: 'wind',
    // 建築／構造
    siege_tower: 'earth',
    siege_gate: 'earth',
    siege_tower_heine: 'earth',
    siege_gate_heine: 'earth',
    siege_tower_ww: 'wind',   // 風木
    siege_gate_ww: 'wind',
    pride_stairs: 'earth',
    obli_portal: 'wind',
    pirate_chest: 'earth',
    // 血盟／攻城 NPC（依角色意象）
    esti_enemy: 'earth', aton_enemy: 'earth',
    julian_enemy: 'wind', ovi_enemy: 'wind',
    joe_enemy: 'fire', senis_enemy: 'fire',
    siege_tros: 'earth', siege_esti: 'earth', siege_aton: 'earth',
    siege_julian: 'wind', siege_ovi: 'wind',
    siege_joe: 'fire', siege_senis: 'fire', siege_grit: 'earth',
    // 白目玩家（依職業）
    troll_royal: 'earth', troll2_royal: 'earth',
    troll_knight: 'earth', troll2_knight: 'earth',
    troll_elf: 'wind', troll2_elf: 'wind',
    troll_mage: 'fire', troll2_mage: 'fire',
    troll_dark: 'earth', troll2_dark: 'earth',
    troll_dragon: 'fire', troll2_dragon: 'fire',
    troll_illusion: 'wind', troll2_illusion: 'wind',
    troll_warrior: 'earth', troll2_warrior: 'earth'
};

const MOB_RACE_ELEMENT_DEFAULT = {
    '鬼火': 'fire', '地獄犬': 'fire', '阿西塔基奧': 'fire', '不死鳥': 'fire', '爆彈花': 'fire', '毒蠍': 'fire', '潘': 'fire', '魔狼': 'fire',
    '雪怪': 'water', '人魚': 'water', '鯊魚': 'water', '鮟鱇': 'water', '螃蟹': 'water', '寄居蟹': 'water', '海星': 'water', '龍龜': 'water', '邪惡蜥蜴': 'water',
    '格利芬': 'wind', '哈維': 'wind', '飛龍': 'wind', '安普': 'wind', '狼人': 'wind',
    '地靈': 'earth', '高崙': 'earth', '建築': 'earth', '寶箱': 'earth', '蘑菇': 'earth', '安特': 'earth', '蜘蛛': 'earth', '螞蟻': 'earth', '蜈蚣': 'earth',
    '哥布林': 'earth', '妖魔': 'fire', '歐姆': 'earth', '牛人': 'earth', '侏儒': 'earth', '多羅': 'earth', '鼠人': 'earth', '亞力安': 'earth',
    '不死': 'earth', '殭屍': 'earth', '吸血鬼': 'earth', '巫妖': 'earth', '死神': 'earth',
    '惡魔': 'fire', '思克巴': 'earth', '食人妖精': 'fire',
    '黑騎士': 'earth', '強盜': 'earth', '玩家': 'earth', '血盟': 'earth',
    '黑暗妖精': 'earth', '黑暗精靈': 'earth', '黑暗棲林者': 'wind', '拉斯塔巴德': 'earth',
    '精靈': 'wind', '獨角獸': 'earth', '梅杜莎': 'earth', '奇美拉': 'wind',
    '提卡爾': 'earth', '底比斯': 'earth', '墳墓守護者': 'earth', '異界生物': 'earth', '反王軍': 'earth'
};

const MOB_RACE_MAJOR_ELEMENT_DEFAULT = {
    undead: 'earth', demon: 'fire', humanoid: 'earth', animal: 'earth',
    dragon: 'earth', spirit: 'wind', elemental: 'earth', insect: 'earth',
    plant: 'earth', construct: 'earth', demi: 'earth', other: 'earth'
};

function _inferMobRaceMajor(m) {
    if (!m) return 'other';
    if (m.raceMajor && MOB_RACE_MAJOR_LABELS[m.raceMajor]) return m.raceMajor;
    if (m.n && MOB_RACE_MAJOR_NAME_OVERRIDES[m.n]) return MOB_RACE_MAJOR_NAME_OVERRIDES[m.n];
    let fine = m.race || '';
    if (MOB_RACE_TO_MAJOR[fine]) return MOB_RACE_TO_MAJOR[fine];
    let n = m.n || '';
    if (fine === '底比斯') {
        if (/曼陀羅|花|草|樹/.test(n)) return 'plant';
        if (/聖甲蟲|凱比斯|蟲|蠍/.test(n)) return 'insect';
        if (/尖碑|石奴|斯芬克斯/.test(n)) return 'construct';
        if (/尼荷斯/.test(n)) return 'humanoid';
        return 'demi';
    }
    if (/龍|飛龍|骨龍|法利昂|安塔瑞斯|巴拉卡斯|林德拜爾/.test(n)) return 'dragon';
    if (/骷髏|屍|亡靈|死|幽|魂|墓|巫妖|吸血鬼|殭屍/.test(n)) return 'undead';
    if (/惡魔|炎魔|小鬼|惡靈|惡夢/.test(n)) return 'demon';
    if (/高崙|石人|活鎧|紙人|密密|機關|魔像/.test(n)) return 'construct';
    if (/蜘蛛|蟻|蟲|蠍|蜈蚣/.test(n)) return 'insect';
    if (/樹|花|蘑菇|安特|曼陀羅/.test(n)) return 'plant';
    if (/元素|水靈|風靈|火靈|地靈|史萊姆/.test(n)) return 'elemental';
    return 'other';
}

/** 名稱／外觀關鍵字 → 屬性（愈前面愈優先） */
function _inferElementFromName(n) {
    if (!n) return null;
    // 四大龍王／經典名
    if (/巴拉卡斯|炎龍|火龍/.test(n)) return 'fire';
    if (/法利昂|水龍/.test(n)) return 'water';
    if (/林德拜爾|風龍/.test(n)) return 'wind';
    if (/安塔瑞斯|地龍|骨龍/.test(n)) return 'earth';
    // 明確元素詞（火系含炎魔／巴風／鬼火）
    if (/鬼火|炎魔|巴風特|火炎|火焰|烈炎|熔岩|灼熱|業火|地獄火|火靈|火之|炎之|焰|熔岩蛋|火炎蛋/.test(n)) return 'fire';
    if (/冰|霜|雪|冰凍|凍結|凍傷|冷|水靈|水之|海底|深海|海洋|海盜|海賊|人魚|海星|潮|濕|雨|藍尾|冰原/.test(n)) return 'water';
    if (/風靈|風之|雷電|雷擊|閃電|翼龍|飛龍|格利芬|哈維|風木|漂浮/.test(n) || (/翼/.test(n) && /龍|惡魔|司祭|鳥|鷹/.test(n))) return 'wind';
    if (/地靈|地之|石頭|岩石|鋼鐵高崙|泥偶|尖碑|石奴|土|泥/.test(n)) return 'earth';
    // 色調暗示（較弱，排後；避免「象牙塔」誤觸「牙」）
    if (/紅|赤/.test(n) && /龍|精靈|元素|之牙|之主|之靈/.test(n)) return 'fire';
    if (/藍/.test(n) && /龍|精靈|元素|之牙|之主|之靈|藍尾/.test(n)) return 'water';
    if (/綠|青/.test(n) && /龍|精靈|元素|之牙|之主|之靈/.test(n)) return 'wind';
    if (/黃|褐/.test(n) && /龍|精靈|元素|之牙|之主|之靈/.test(n)) return 'earth';
    // 職業／兵種弱提示（不用單字「劍」，避免「死亡之劍」誤判）
    if (/弓箭|神射手|射手|巡守|遊俠/.test(n)) return 'wind';
    if (/法師|魔女|巫師|黑魔法師/.test(n)) return 'fire';
    if (/騎士|士兵|將軍|戰士/.test(n) && !/死亡騎士/.test(n)) return 'earth';
    return null;
}

function _elementConflicts(name, ele) {
    if (!ele || !name) return false;
    if (ele === 'water' && /火|炎|焰|熔岩|炎魔|巴風特|鬼火|火炎/.test(name) && !/冰火|水火/.test(name)) return true;
    if (ele === 'fire' && /冰|霜|雪|冰凍|凍結|水靈|冰石/.test(name) && !/炎冰|火冰/.test(name)) return true;
    if (ele === 'wind' && /石頭高崙|鋼鐵高崙|岩石|地靈|泥偶|冰石/.test(name)) return true;
    if (ele === 'earth' && /鬼火|炎魔|巴風特|火炎|火焰|烈炎|熔岩|冰|霜|雪|風靈|水靈/.test(name)) return true;
    return false;
}

function _inferMobElement(m, id) {
    if (!m) return 'earth';
    if (id && MOB_ELEMENT_OVERRIDES[id]) return MOB_ELEMENT_OVERRIDES[id];
    let n = m.n || '';
    let fromName = _inferElementFromName(n);
    if (fromName) return fromName;
    let fine = m.race || '';
    let cur = m.e;
    let maj = m.raceMajor || _inferMobRaceMajor(m);
    // 既有四大屬性且與名稱不衝突時保留；但惡魔族掛地屬、鬼火掛地屬等明顯不合理者改推
    if (MOB_ELEMENTS.indexOf(cur) >= 0 && !_elementConflicts(n, cur)) {
        let demonEarth = (fine === '惡魔' || maj === 'demon' || /惡魔|巴列斯|夢魘/.test(n)) && cur === 'earth' && !/石|岩|地靈|土/.test(n);
        let ghostEarth = (fine === '鬼火' || /鬼火/.test(n)) && cur === 'earth';
        if (!demonEarth && !ghostEarth) return cur;
    }
    if (MOB_RACE_ELEMENT_DEFAULT[fine]) return MOB_RACE_ELEMENT_DEFAULT[fine];
    if (MOB_RACE_MAJOR_ELEMENT_DEFAULT[maj]) return MOB_RACE_MAJOR_ELEMENT_DEFAULT[maj];
    return 'earth';
}

function initMobRaceMajors() {
    if (!DB || !DB.mobs) return { tagged: 0, counts: {} };
    let counts = {};
    let tagged = 0;
    Object.keys(DB.mobs).forEach(id => {
        let m = DB.mobs[id];
        if (!m) return;
        let maj = _inferMobRaceMajor(m);
        m.raceMajor = maj;
        // 🧬 與顯示 raceMajor 對齊：補上缺漏的 un 旗標，讓既有 unBonus／起死回生／墓碑盾等全部生效
        if (isUndeadMob(m)) m.un = true;
        tagged++;
        let lab = MOB_RACE_MAJOR_LABELS[maj] || maj;
        counts[lab] = (counts[lab] || 0) + 1;
    });
    try { window.__MOB_RACE_STATS = { tagged: tagged, counts: counts }; } catch (e) {}
    return { tagged: tagged, counts: counts };
}

function initMobElements() {
    if (!DB || !DB.mobs) return { tagged: 0, counts: {}, fixes: [], byRaceMajor: {} };
    let counts = { fire: 0, water: 0, wind: 0, earth: 0 };
    let byRaceMajor = {};
    let fixes = [];
    let tagged = 0;
    Object.keys(DB.mobs).forEach(id => {
        let m = DB.mobs[id];
        if (!m) return;
        let oldE = m.e;
        let neu = _inferMobElement(m, id);
        if (MOB_ELEMENTS.indexOf(neu) < 0) neu = 'earth';
        if (oldE !== neu) {
            fixes.push({ id: id, n: m.n || id, old: oldE || 'none', neu: neu });
        }
        m.e = neu;
        tagged++;
        counts[neu] = (counts[neu] || 0) + 1;
        let maj = m.raceMajor || _inferMobRaceMajor(m);
        let majLab = MOB_RACE_MAJOR_LABELS[maj] || maj;
        if (!byRaceMajor[majLab]) byRaceMajor[majLab] = { fire: 0, water: 0, wind: 0, earth: 0 };
        byRaceMajor[majLab][neu] = (byRaceMajor[majLab][neu] || 0) + 1;
    });
    let stats = { tagged: tagged, counts: counts, fixes: fixes, byRaceMajor: byRaceMajor };
    try { window.__MOB_ELEMENT_STATS = stats; } catch (e) {}
    return stats;
}

function getMobRaceMajor(m) {
    if (!m) return null;
    let key = m.raceMajor || _inferMobRaceMajor(m);
    return MOB_RACE_MAJOR_LABELS[key] || null;
}

function getMobElementLabel(m) {
    if (!m) return null;
    let key = (m.e && MOB_ELEMENTS.indexOf(m.e) >= 0) ? m.e : null;
    if (!key) return null;
    return MOB_ELEMENT_LABELS[key] || null;
}

/** 統一顯示名：死亡騎士(不死族/地) */
function getMobDisplayName(m) {
    if (!m) return '';
    let base = m.n || '';
    if (!base) return '';
    let raceLab = getMobRaceMajor(m);
    let eleLab = getMobElementLabel(m);
    // 去掉既有尾綴（種族）或（種族/屬性），避免重複疊加
    let core = base.replace(/（[^）]+）\s*$/, '').replace(/\([^)]*\)\s*$/, '');
    if (raceLab && eleLab) return core + '(' + raceLab + '/' + eleLab + ')';
    if (raceLab) return core + '(' + raceLab + ')';
    if (eleLab) return core + '(' + eleLab + ')';
    return core;
}

function initMobRaceAndElements() {
    let race = initMobRaceMajors();
    let ele = initMobElements();
    try {
        window.__MOB_RACE_ELE_STATS = { race: race, element: ele };
    } catch (e) {}
    return { race: race, element: ele };
}

try { initMobRaceAndElements(); } catch (e) { try { console.warn('[mob-race] init failed', e); } catch (_) {} }
