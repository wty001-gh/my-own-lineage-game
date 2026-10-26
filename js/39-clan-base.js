// 🏰 v3.8.96 血盟據點 Phase 1（clanbase.20261006a）；v3.8.99 Phase 2/3：探險公會＋魔法塔（weather.20261006c）
// 主堡／鐵匠舖／訓練場／藥水工房；資源掉落；施法加速；離線建造／自產結算。
// 掛載：index.html / index-pc.html 於 38-nazarick-combat 之後。

(function () {
'use strict';

const CB_MAX_LV = 10;
const CB_CAST_SPD_CAP = 15;   // 施法加速全域硬上限 %
const CB_BUFF_DUR = 1800;     // 一般 BUFF 30 分鐘（秒）
const CB_PROTECT_KEY = 'clanBaseProtectDay';

// ===== 建築定義 =====
const CB_BUILDINGS = {
    keep: {
        id: 'keep', n: '公會本部', emoji: '🏛️',
        desc: '冒險者公會核心（原主堡）。其他設施等級不可超過公會本部；Lv.5 解鎖第二建造佇列；Lv.10「公會徽章」全體成員特性 +5。',
        effect: lv => lv <= 0 ? '未建造' : `設施等級上限 ${lv}${lv >= 5 ? '・雙佇列' : ''}${lv >= 10 ? '・公會徽章' : ''}`,
        nextEffect: lv => lv >= CB_MAX_LV ? null : `設施等級上限 ${lv + 1}${lv + 1 >= 5 ? '・雙佇列' : ''}${lv + 1 >= 10 ? '・公會徽章（成員特性 +5）' : ''}`
    },
    blacksmith: {
        id: 'blacksmith', n: '鍛造屋', emoji: '⚒️',
        desc: '（原鐵匠舖）每級強化成功率 +0.5%（最高 +5%）、委託帶回裝備機率 +3%。Lv.10 每日一次「保護強化」。',
        effect: lv => lv <= 0 ? '未建造' : `強化成功率 +${(lv * 0.5).toFixed(1)}%・委託裝備 +${lv * 3}%${lv >= 10 ? '・每日保護強化' : ''}`,
        nextEffect: lv => lv >= CB_MAX_LV ? null : `強化成功率 +${((lv + 1) * 0.5).toFixed(1)}%・委託裝備 +${(lv + 1) * 3}%`
    },
    training: {
        id: 'training', n: '訓練場', emoji: '🏟️',
        desc: '掛機時，其他存檔角色獲得主角色經驗的 2%/級（最高 20%）。',
        effect: lv => lv <= 0 ? '未建造' : `其他角色共享 EXP ${lv * 2}%`,
        nextEffect: lv => lv >= CB_MAX_LV ? null : `其他角色共享 EXP ${(lv + 1) * 2}%`
    },
    potion: {
        id: 'potion', n: '藥水工房', emoji: '🧪',
        desc: '解鎖配方；Lv.1–2 基礎藥水每小時自動生產（等級×2）。',
        effect: lv => lv <= 0 ? '未建造' : `配方至 Lv.${lv}・自產 ${lv * 2}/時（基礎）`,
        nextEffect: lv => lv >= CB_MAX_LV ? null : `配方至 Lv.${lv + 1}・自產 ${(lv + 1) * 2}/時`
    },
    explore: {
        id: 'explore', n: '委託板', emoji: '📋',
        desc: '（原探險公會）冒險者公會委託板每日 05:00（台北）刷新 D–S 級委託，派遣自己與隊伍中的傭兵執行（離線亦計時，人不離場）。等級提升委託數量、派遣欄與收益。',
        effect: lv => `委託 ${Math.min(12, 6 + Math.floor(lv * 0.6))} 張・派遣欄 ${Math.min(6, 2 + Math.floor(lv / 2))}・收益 ×${(1 + lv * 0.05).toFixed(2)}`,
        nextEffect: lv => lv >= CB_MAX_LV ? null : `委託 ${Math.min(12, 6 + Math.floor((lv + 1) * 0.6))} 張・派遣欄 ${Math.min(6, 2 + Math.floor((lv + 1) / 2))}・收益 ×${(1 + (lv + 1) * 0.05).toFixed(2)}`
    },
    mage: {
        id: 'mage', n: '魔法塔', emoji: '🔮',
        desc: '每級全隊魔法傷害 +1%、MP 自然恢復 +2%。Lv.10 解鎖據點技能「據點結界」：30 分鐘全隊四屬性抗性 +10（冷卻 2 小時）。',
        effect: lv => lv <= 0 ? '未建造' : `魔法傷害 +${lv}%・MP 回復 +${lv * 2}%${lv >= 10 ? '・據點結界' : ''}`,
        nextEffect: lv => lv >= CB_MAX_LV ? null : `魔法傷害 +${lv + 1}%・MP 回復 +${(lv + 1) * 2}%${lv + 1 >= 10 ? '・解鎖據點結界' : ''}`
    },
    tavern: {
        id: 'tavern', n: '酒館', emoji: '🍺',
        desc: '冒險者聚集的酒館。Lv.1／4／7／10 各增加 1 次每日好感事件。',
        effect: lv => lv <= 0 ? '未建造' : `每日好感事件 +${cbTavernEvents(lv)}`,
        nextEffect: lv => lv >= CB_MAX_LV ? null : `每日好感事件 +${cbTavernEvents(lv + 1)}`
    },
    dorm: {
        id: 'dorm', n: '宿舍', emoji: '🛏️',
        desc: '成員的住處。每級成員每日體力（派遣次數）+10%；Lv.10「同居」好感上限提升至 Lv.12。',
        effect: lv => lv <= 0 ? '未建造' : `成員體力 +${lv * 10}%${lv >= 10 ? '・同居（好感上限 12）' : ''}`,
        nextEffect: lv => lv >= CB_MAX_LV ? null : `成員體力 +${(lv + 1) * 10}%${lv + 1 >= 10 ? '・同居' : ''}`
    },
    intel: {
        id: 'intel', n: '情報室', emoji: '🗺️',
        desc: '需冒險者公會 Lv.5。預覽懸賞頭目屬性；每級頭目蓄力預告時間 +0.2 秒；Lv.10 蓄力時常駐顯示頭目弱點屬性。',
        effect: lv => lv <= 0 ? '未建造' : `蓄力預告 +${(lv * 0.2).toFixed(1)} 秒${lv >= 10 ? '・弱點常駐' : ''}`,
        nextEffect: lv => lv >= CB_MAX_LV ? null : `蓄力預告 +${((lv + 1) * 0.2).toFixed(1)} 秒${lv + 1 >= 10 ? '・弱點常駐' : ''}`
    },
    // 🏛️ v3.8.123 公會擴充：料理／生產／後勤（design/guild-expand-v1.md）
    kitchen: {
        id: 'kitchen', n: '料理屋', emoji: '🍳',
        desc: '需冒險者公會 Lv.2。解鎖料理／宴會委託；每級派遣歸來體力回復 +5%；完成委託可獲便當（短暫攻防）。Lv.10 每日自動煮 3 份公會大餐。',
        effect: lv => lv <= 0 ? '未建造' : `體力回復 +${lv * 5}%・解鎖料理委託${lv >= 10 ? '・每日大餐×3' : ''}`,
        nextEffect: lv => lv >= CB_MAX_LV ? null : `體力回復 +${(lv + 1) * 5}%${lv + 1 >= 10 ? '・每日大餐' : ''}`
    },
    workshop: {
        id: 'workshop', n: '生產工坊', emoji: '🏭',
        desc: '需冒險者公會 Lv.3。解鎖訂單生產委託；採集／調查資源 +2%/級；委託裝備掉落再 +1%/級（與鍛造屋合計上限 +40%）。Lv.10 每週工坊特製箱。',
        effect: lv => lv <= 0 ? '未建造' : `資源 +${lv * 2}%・裝備掉落 +${lv}%${lv >= 10 ? '・每週特製箱' : ''}`,
        nextEffect: lv => lv >= CB_MAX_LV ? null : `資源 +${(lv + 1) * 2}%・裝備掉落 +${lv + 1}%`
    },
    logistics: {
        id: 'logistics', n: '後勤營', emoji: '📦',
        desc: '需冒險者公會 Lv.4。派遣欄 +0.5/級（與委託板合計最多 10）；委託時長 −2%/級（最快 −20%）；失敗懲罰減輕。Lv.10 每日緊急召回 1 次。',
        effect: lv => lv <= 0 ? '未建造' : `派遣欄 +${Math.floor(lv / 2)}・時長 −${Math.min(20, lv * 2)}%${lv >= 10 ? '・緊急召回' : ''}`,
        nextEffect: lv => lv >= CB_MAX_LV ? null : `派遣欄 +${Math.floor((lv + 1) / 2)}・時長 −${Math.min(20, (lv + 1) * 2)}%`
    }
};
function cbTavernEvents(lv) { lv = Math.floor(Number(lv) || 0); return (lv >= 1 ? 1 : 0) + (lv >= 4 ? 1 : 0) + (lv >= 7 ? 1 : 0) + (lv >= 10 ? 1 : 0); }
function cbExpedSlotsFor(lv) { lv = Math.floor(Number(lv) || 0); if (lv <= 0) return 0; return 1 + (lv >= 4 ? 1 : 0) + (lv >= 7 ? 1 : 0) + (lv >= 10 ? 1 : 0); }

// 升級費用：升至目標等級的成本（index = 目標等級）
// 曲線：L1–3 木材+金幣 1–10分；L4–6 加礦石 30分–2時；L7–9 加魔法石 4–8時；L10 加大墳墓/傲慢材料 12時
function _cbCost(wood, ore, magic, gold, soul, frag, pride, mins) {
    return { wood: wood || 0, ore: ore || 0, magic: magic || 0, gold: gold || 0,
             soul: soul || 0, frag: frag || 0, pride: pride || 0, ms: (mins || 1) * 60 * 1000 };
}
// 🏛️ v3.8.119 新設施費用：Lv1→Lv10 幾何插值（設計 guild-v1.md §3）
function _cbGeoCosts(w, o, m, g, mins) {
    const f = (a, i) => { if (!a[1]) return 0; let lo = a[0] || Math.max(1, a[1] * 0.02); return Math.round(lo * Math.pow(a[1] / lo, (i - 1) / 9)); };
    const ore = i => (o[1] ? (i <= 3 ? 0 : Math.round(o[1] * Math.pow((i - 3) / 7, 1.6))) : 0);
    let out = [null];
    for (let i = 1; i <= 10; i++) out.push(_cbCost(f(w, i), ore(i), f(m, i), Math.round(f(g, i) / 1000) * 1000, 0, 0, 0, f(mins, i)));
    return out;
}
const CB_UPGRADE_COST = {
    //              w     ore  mag     gold    soul frag pride  min
    keep: [
        null,
        _cbCost(80,    0,  0,     20000,  0, 0, 0, 1),
        _cbCost(160,   0,  0,     80000,  0, 0, 0, 5),
        _cbCost(320,   0,  0,    250000,  0, 0, 0, 10),
        _cbCost(500,  80,  0,    800000,  0, 0, 0, 30),
        _cbCost(800, 160,  0,   2500000,  5, 0, 0, 60),      // L5 魂晶
        _cbCost(1200,280,  0,   6000000,  0, 0, 0, 120),
        _cbCost(1600,400, 30,  15000000,  0, 0, 0, 240),
        _cbCost(2200,600, 60,  30000000,  0, 0, 0, 360),
        _cbCost(3000,900,100,  55000000,  0, 0, 0, 480),
        _cbCost(4500,1400,200,100000000, 25,50, 0, 720)       // L10 魂晶+殘片
    ],
    blacksmith: [
        null,
        _cbCost(60,    0,  0,     15000, 0, 0, 0, 1),
        _cbCost(120,   0,  0,     60000, 0, 0, 0, 5),
        _cbCost(240,   0,  0,    180000, 0, 0, 0, 10),
        _cbCost(400,  60,  0,    600000, 0, 0, 0, 30),
        _cbCost(650, 120,  0,   1800000, 0, 0, 0, 60),
        _cbCost(1000,220,  0,   4500000, 0, 0, 0, 120),
        _cbCost(1400,350, 25,  12000000, 0, 0, 0, 240),
        _cbCost(1900,520, 50,  25000000, 0, 0, 0, 360),
        _cbCost(2600,750, 85,  45000000, 0, 0, 0, 480),
        _cbCost(3800,1100,150, 80000000, 0, 0, 20, 720)       // L10 傲慢奇美拉皮×20（任一）
    ],
    training: [
        null,
        _cbCost(50,    0,  0,     12000, 0, 0, 0, 1),
        _cbCost(100,   0,  0,     50000, 0, 0, 0, 5),
        _cbCost(200,   0,  0,    150000, 0, 0, 0, 10),
        _cbCost(350,  50,  0,    500000, 0, 0, 0, 30),
        _cbCost(550, 100,  0,   1500000, 0, 0, 0, 60),
        _cbCost(850, 180,  0,   4000000, 0, 0, 0, 120),
        _cbCost(1200,280, 20,  10000000, 0, 0, 0, 240),
        _cbCost(1700,420, 40,  22000000, 0, 0, 0, 360),
        _cbCost(2300,600, 70,  40000000, 0, 0, 0, 480),
        _cbCost(3400,900,120,  70000000, 0,30, 0, 720)        // L10 大墳墓殘片
    ],
    potion: [
        null,
        _cbCost(50,    0,  0,     10000, 0, 0, 0, 1),
        _cbCost(100,   0,  0,     45000, 0, 0, 0, 5),
        _cbCost(200,   0,  0,    140000, 0, 0, 0, 10),
        _cbCost(350,  50,  0,    450000, 0, 0, 0, 30),
        _cbCost(550, 100,  0,   1400000, 0, 0, 0, 60),
        _cbCost(850, 180,  0,   3800000, 0, 0, 0, 120),
        _cbCost(1200,280, 20,   9500000, 0, 0, 0, 240),
        _cbCost(1700,420, 40,  20000000, 0, 0, 0, 360),
        _cbCost(2300,600, 70,  38000000, 0, 0, 0, 480),
        _cbCost(3400,900,120,  65000000,10, 0, 0, 720)        // L10 魂晶
    ],
    explore: [
        null,
        _cbCost(60,    0,  0,     15000, 0, 0, 0, 1),
        _cbCost(120,   0,  0,     55000, 0, 0, 0, 5),
        _cbCost(240,   0,  0,    170000, 0, 0, 0, 10),
        _cbCost(400,  60,  0,    550000, 0, 0, 0, 30),
        _cbCost(650, 120,  0,   1700000, 0, 0, 0, 60),
        _cbCost(1000,220,  0,   4300000, 0, 0, 0, 120),
        _cbCost(1400,350, 25,  11000000, 0, 0, 0, 240),
        _cbCost(1900,520, 50,  24000000, 0, 0, 0, 360),
        _cbCost(2600,750, 85,  43000000, 0, 0, 0, 480),
        _cbCost(3800,1100,150, 75000000, 0,30, 0, 720)        // L10 大墳墓殘片
    ],
    mage: [
        null,
        _cbCost(50,    0,  5,     15000, 0, 0, 0, 1),
        _cbCost(100,   0, 10,     60000, 0, 0, 0, 5),
        _cbCost(200,   0, 15,    180000, 0, 0, 0, 10),
        _cbCost(350,  60, 20,    600000, 0, 0, 0, 30),
        _cbCost(550, 120, 30,   1800000, 0, 0, 0, 60),
        _cbCost(850, 220, 40,   4500000, 0, 0, 0, 120),
        _cbCost(1200,350, 60,  12000000, 0, 0, 0, 240),
        _cbCost(1700,520, 90,  25000000, 0, 0, 0, 360),
        _cbCost(2300,750,130,  45000000, 0, 0, 0, 480),
        _cbCost(3400,1100,220, 85000000,15, 0, 0, 720)        // L10 魂晶
    ],
    tavern: _cbGeoCosts([120, 3000], [0, 0], [0, 0], [30000, 80000000], [10, 600]),
    dorm:   _cbGeoCosts([100, 2500], [0, 1200], [0, 0], [20000, 60000000], [10, 600]),
    intel:  _cbGeoCosts([0, 0], [0, 0], [10, 200], [500000, 100000000], [30, 720]),
    kitchen:   _cbGeoCosts([80, 2000], [40, 800], [0, 0], [25000, 50000000], [20, 480]),
    workshop:  _cbGeoCosts([100, 2500], [80, 1500], [0, 80], [50000, 80000000], [20, 600]),
    logistics: _cbGeoCosts([150, 3000], [100, 2000], [0, 0], [80000, 100000000], [30, 600])
};

// ===== 藥水配方 =====
// cat: heal | combat | defense | speed | gains | boss | special
const CB_RECIPES = [
    { id: 'cb_berry',     n: '野莓藥草水',     unlock: 1, auto: true,  cat: 'heal',
      cost: { wood: 5, gold: 500 },
      d: '立即恢復最大 HP 15%。' },
    { id: 'cb_mana',      n: '清澈魔力水',     unlock: 2, auto: true,  cat: 'heal',
      cost: { wood: 5, gold: 500 },
      d: '立即恢復最大 MP 15%。' },
    { id: 'cb_cookie',    n: '血盟乾糧',       unlock: 3, auto: false, cat: 'heal',
      cost: { wood: 15, ore: 2, gold: 5000 },
      d: '10 秒內恢復 40% 最大 HP（受傷中斷）。全職業可用。' },
    { id: 'cb_antidote',  n: '解毒草茶',       unlock: 4, auto: false, cat: 'heal',
      cost: { wood: 20, ore: 5, gold: 12000 },
      d: '解除中毒，並獲得毒免疫 30 秒。' },
    { id: 'cb_awaken',    n: '入魔清醒劑',     unlock: 5, auto: false, cat: 'heal',
      cost: { wood: 30, ore: 10, magic: 1, gold: 40000 },
      d: '解除沉默／麻痺／恐懼等控制，並獲得控制免疫 10 秒。' },
    { id: 'cb_giant',     n: '巨人燉肉',       unlock: 6, auto: false, cat: 'special',
      cost: { wood: 40, ore: 20, magic: 2, gold: 80000 },
      d: '最大 HP +10%，持續 5 分鐘。', buffKey: 'cb_giant', dur: 300 },
    { id: 'cb_partyheal', n: '全隊治癒藥包',   unlock: 7, auto: false, cat: 'heal',
      cost: { wood: 60, ore: 30, magic: 4, gold: 200000 },
      d: '全隊立即恢復 30% 最大 HP。' },
    { id: 'cb_soulwater', n: '靈魂精華水',     unlock: 8, auto: false, cat: 'heal',
      cost: { wood: 80, ore: 40, magic: 8, gold: 500000, frag: 2 },
      d: '立即恢復 50% HP 與 MP。（需大墳墓裝備殘片）' },
    { id: 'cb_worldtree', n: '世界樹生命露',   unlock: 10, auto: false, cat: 'special',
      cost: { wood: 150, ore: 80, magic: 20, gold: 2000000, soul: 3 },
      d: '死亡時自動復活並恢復 50% HP（每場戰鬥一次）。不滅加護優先時不消耗。' },
    // Combat buffs
    { id: 'cb_berserk',   n: '狂戰士烈酒',     unlock: 2, auto: false, cat: 'combat',
      cost: { wood: 10, gold: 8000 },
      d: '物理傷害 +8%，防禦（AC）−5（變差）。30 分鐘。', buffKey: 'cb_berserk', dur: CB_BUFF_DUR },
    { id: 'cb_sage',      n: '賢者墨水',       unlock: 4, auto: false, cat: 'combat',
      cost: { wood: 20, ore: 8, gold: 25000 },
      d: '魔法傷害 +8%；魔法命中時 MP +1。30 分鐘。', buffKey: 'cb_sage', dur: CB_BUFF_DUR },
    { id: 'cb_hunter',    n: '獵人秘藥',       unlock: 6, auto: false, cat: 'combat',
      cost: { wood: 40, ore: 20, magic: 2, gold: 100000 },
      d: '遠距離命中 +6，連射機率 +5%。30 分鐘。', buffKey: 'cb_hunter', dur: CB_BUFF_DUR },
    // Defense
    { id: 'cb_iron',      n: '鐵皮藥膏',       unlock: 3, auto: false, cat: 'defense',
      cost: { wood: 15, ore: 5, gold: 15000 },
      d: '受到的物理傷害 −6%。30 分鐘。', buffKey: 'cb_iron', dur: CB_BUFF_DUR },
    { id: 'cb_mr',        n: '抵魔符水',       unlock: 5, auto: false, cat: 'defense',
      cost: { wood: 30, ore: 12, magic: 1, gold: 50000 },
      d: 'MR +15。30 分鐘。', buffKey: 'cb_mr', dur: CB_BUFF_DUR },
    { id: 'cb_ele',       n: '元素平衡液',     unlock: 7, auto: false, cat: 'defense',
      cost: { wood: 50, ore: 25, magic: 5, gold: 180000 },
      d: '四屬性抗性各 +12。30 分鐘。', buffKey: 'cb_ele', dur: CB_BUFF_DUR },
    // Speed（與加速／勇敢藥水分離）
    { id: 'cb_bluespd',   n: '藍色蜂蜜',       unlock: 3, auto: false, cat: 'speed',
      cost: { wood: 15, ore: 3, gold: 20000 },
      d: '施法加速 +10%。30 分鐘。（與加速／勇敢藥水獨立）', buffKey: 'cb_bluespd', dur: CB_BUFF_DUR },
    { id: 'cb_wind',      n: '疾風精靈酒',     unlock: 8, auto: false, cat: 'speed',
      cost: { wood: 80, ore: 40, magic: 8, gold: 600000, dragon: 1 },
      d: '攻擊速度 +12%、施法加速 +12%。需飛龍之心。30 分鐘。', buffKey: 'cb_wind', dur: CB_BUFF_DUR },
    // Gains
    { id: 'cb_exp',       n: '經驗卷軸液',     unlock: 4, auto: false, cat: 'gains',
      cost: { wood: 25, ore: 8, gold: 30000 },
      d: '經驗獲得 +20%。30 分鐘。', buffKey: 'cb_exp', dur: CB_BUFF_DUR },
    { id: 'cb_luck',      n: '幸運金幣糖',     unlock: 9, auto: false, cat: 'gains',
      cost: { wood: 100, ore: 50, magic: 12, gold: 800000 },
      d: '掉落率 +10%，金幣 +15%。30 分鐘。', buffKey: 'cb_luck', dur: CB_BUFF_DUR },
    // Boss（一場頭目戰）
    { id: 'cb_sunder',    n: '破甲毒油',       unlock: 9, auto: false, cat: 'boss',
      cost: { wood: 80, ore: 40, magic: 10, gold: 500000 },
      d: '無視頭目硬皮 15%（一場頭目戰）。', buffKey: 'cb_sunder', dur: 0, bossFight: true },
    { id: 'cb_nazwar',    n: '納薩力克戰意藥劑', unlock: 10, auto: false, cat: 'boss',
      cost: { wood: 120, ore: 60, magic: 15, gold: 1500000, soul: 5 },
      d: '對頭目全傷害 +12%（一場頭目戰）。需魂晶。', buffKey: 'cb_nazwar', dur: 0, bossFight: true }
];

const CB_CAT_LABEL = {
    heal: '治療', combat: '戰鬥', defense: '防禦', speed: '速度', gains: '收益', boss: '頭目', special: '特殊'
};
const CB_CAT_KEYS = {
    combat: ['cb_berserk', 'cb_sage', 'cb_hunter'],
    defense: ['cb_iron', 'cb_mr', 'cb_ele'],
    speed: ['cb_bluespd', 'cb_wind'],
    gains: ['cb_exp', 'cb_luck'],
    boss: ['cb_sunder', 'cb_nazwar']
};

// ===== 預設／遷移 =====
function ensureClanBase(p) {
    p = p || (typeof player !== 'undefined' ? player : null);
    if (!p) return null;
    if (!p.clanBase || typeof p.clanBase !== 'object') {
        p.clanBase = {
            res: { wood: 0, ore: 0, magic: 0 },
            lv: { keep: 0, blacksmith: 0, training: 0, potion: 0, explore: 0, mage: 0 },
            queue: [],          // [{ bid, toLv, finishAt }]
            stock: {},         // itemId → count
            autoBuff: { player: [null, null, null, null] },  // 4 slots
            lastProdAt: Date.now(),
            lastSeenAt: Date.now(),
            protectOn: false,
            protectDay: '',
            offlineReport: null,
            trainBank: {}      // slot → pending EXP for other characters
        };
    }
    let cb = p.clanBase;
    if (!cb.res) cb.res = { wood: 0, ore: 0, magic: 0 };
    cb.res.wood = Math.max(0, Math.floor(Number(cb.res.wood) || 0));
    cb.res.ore = Math.max(0, Math.floor(Number(cb.res.ore) || 0));
    cb.res.magic = Math.max(0, Math.floor(Number(cb.res.magic) || 0));
    if (!cb.lv) cb.lv = { keep: 0, blacksmith: 0, training: 0, potion: 0, explore: 0, mage: 0, tavern: 0, dorm: 0, intel: 0, kitchen: 0, workshop: 0, logistics: 0 };
    ['keep', 'blacksmith', 'training', 'potion', 'explore', 'mage', 'tavern', 'dorm', 'intel', 'kitchen', 'workshop', 'logistics'].forEach(k => {
        cb.lv[k] = Math.max(0, Math.min(CB_MAX_LV, Math.floor(Number(cb.lv[k]) || 0)));
    });
    if (!Array.isArray(cb.queue)) cb.queue = [];
    if (!cb.stock || typeof cb.stock !== 'object') cb.stock = {};
    if (!cb.autoBuff || typeof cb.autoBuff !== 'object') cb.autoBuff = { player: [null, null, null, null] };
    if (!Array.isArray(cb.autoBuff.player)) cb.autoBuff.player = [null, null, null, null];
    while (cb.autoBuff.player.length < 4) cb.autoBuff.player.push(null);
    if (!cb.lastProdAt) cb.lastProdAt = Date.now();
    if (!cb.lastSeenAt) cb.lastSeenAt = Date.now();
    if (!cb.trainBank || typeof cb.trainBank !== 'object') cb.trainBank = {};
    if (!Array.isArray(cb.buffFood)) cb.buffFood = [];
    // 🧭 v3.8.99 探險公會：[{ id, slot, name, lv, cls, map, hours, startAt, endAt, seed }]
    if (!Array.isArray(cb.exped)) cb.exped = [];
    cb.exped = cb.exped.filter(e => e && e.slot && e.map && e.endAt > 0);
    // 🔮 v3.8.99 魔法塔「據點結界」
    cb.barrierUntil = Math.max(0, Number(cb.barrierUntil) || 0);
    cb.barrierReadyAt = Math.max(0, Number(cb.barrierReadyAt) || 0);
    cb.barrierAuto = !!cb.barrierAuto;
    return cb;
}

function cbKeepLv(p) { let cb = ensureClanBase(p); return (cb && cb.lv && cb.lv.keep) || 0; }
function cbBldLv(bid, p) { let cb = ensureClanBase(p); return (cb && cb.lv && cb.lv[bid]) || 0; }
function cbQueueSlots(p) { return cbKeepLv(p) >= 5 ? 2 : 1; }

// ===== 資源 =====
function cbAddRes(kind, n, p) {
    let cb = ensureClanBase(p);
    if (!cb || !(n > 0)) return;
    if (kind === 'wood' || kind === 'ore' || kind === 'magic') cb.res[kind] = (cb.res[kind] || 0) + Math.floor(n);
}
function cbStock(id, p) { let cb = ensureClanBase(p); return (cb && cb.stock && cb.stock[id]) || 0; }
function cbAddStock(id, n, p) {
    let cb = ensureClanBase(p);
    if (!cb || !(n > 0)) return;
    cb.stock[id] = (cb.stock[id] || 0) + Math.floor(n);
}
function cbTakeStock(id, n, p) {
    let cb = ensureClanBase(p);
    if (!cb) return false;
    n = Math.floor(n) || 1;
    if ((cb.stock[id] || 0) < n) return false;
    cb.stock[id] -= n;
    if (cb.stock[id] <= 0) delete cb.stock[id];
    return true;
}

// ===== 掉落（掛於 killMob）=====
// 木材：低等野外／地監（lv≤35）約 12%；礦石：中等（lv 36–70 或傲慢／龍之谷）約 6%；魔法石：頭目 18%、精英 hard 4%
function cbOnKill(mob) {
    if (!mob || !player || player.dead) return;
    let cb = ensureClanBase();
    if (!cb) return;
    let lv = mob.lv || 1;
    let rate = (typeof partyDropRate === 'function') ? partyDropRate : (x => x);
    let region = (typeof mapRegionOf === 'function') ? mapRegionOf(mapState.current) : '';
    let midMap = /pride|dragon|龍|傲慢|rastabad|antharas|thebes|tikal|nazarick|forgotten|oblivion/i.test(String(region || '') + String(mapState.current || ''));
    // wood
    if (lv <= 35 && !mob.boss) {
        if (Math.random() < rate(0.12)) { cbAddRes('wood', 1 + (lv >= 20 ? 1 : 0)); }
    } else if (lv <= 50 && !mob.boss && Math.random() < rate(0.04)) {
        cbAddRes('wood', 1);
    }
    // ore
    if ((lv >= 36 && lv <= 75) || midMap) {
        if (!mob.boss && Math.random() < rate(0.06)) cbAddRes('ore', 1);
        else if (mob.boss && Math.random() < rate(0.25)) cbAddRes('ore', 2 + Math.floor(Math.random() * 3));
    }
    // magic stone
    if (mob.boss && Math.random() < rate(0.18)) cbAddRes('magic', 1 + (lv >= 80 ? 1 : 0));
    else if (mob.hard && !mob.boss && Math.random() < rate(0.04)) cbAddRes('magic', 1);
}

// ===== 建造 =====
function cbCanAfford(cost, p) {
    p = p || player;
    let cb = ensureClanBase(p);
    if (!cb || !cost) return false;
    if ((cb.res.wood || 0) < (cost.wood || 0)) return false;
    if ((cb.res.ore || 0) < (cost.ore || 0)) return false;
    if ((cb.res.magic || 0) < (cost.magic || 0)) return false;
    if ((p.gold || 0) < (cost.gold || 0)) return false;
    if ((cost.soul || 0) > 0 && _cbInvCount('mat_nazarick_soulcrystal', p) < cost.soul) return false;
    if ((cost.frag || 0) > 0 && _cbInvCount('mat_nazarick_gearfrag', p) < cost.frag) return false;
    if ((cost.pride || 0) > 0 && _cbPrideMatCount(p) < cost.pride) return false;
    if ((cost.dragon || 0) > 0 && _cbInvCount('mat_dragon_heart', p) < cost.dragon) return false;
    return true;
}
function _cbInvCount(id, p) {
    p = p || player;
    if (!p || !p.inv) return 0;
    return p.inv.reduce((s, i) => s + (i && i.id === id ? (i.cnt || 1) : 0), 0);
}
function _cbPrideMatCount(p) {
    let ids = ['mat_chimera_snake', 'mat_chimera_dragon', 'mat_chimera_goat', 'mat_chimera_lion'];
    return ids.reduce((s, id) => s + _cbInvCount(id, p), 0);
}
function _cbConsumeInv(id, n, p) {
    p = p || player;
    n = Math.floor(n) || 0;
    if (n <= 0) return true;
    for (let i = 0; i < (p.inv || []).length && n > 0; i++) {
        let it = p.inv[i];
        if (!it || it.id !== id) continue;
        let take = Math.min(n, it.cnt || 1);
        it.cnt = (it.cnt || 1) - take;
        n -= take;
        if (it.cnt <= 0) { p.inv.splice(i, 1); i--; }
    }
    return n <= 0;
}
function _cbConsumePride(n, p) {
    let ids = ['mat_chimera_snake', 'mat_chimera_dragon', 'mat_chimera_goat', 'mat_chimera_lion'];
    for (let id of ids) {
        if (n <= 0) break;
        let have = _cbInvCount(id, p);
        let take = Math.min(have, n);
        if (take > 0) { _cbConsumeInv(id, take, p); n -= take; }
    }
    return n <= 0;
}
function cbPay(cost, p) {
    p = p || player;
    let cb = ensureClanBase(p);
    if (!cbCanAfford(cost, p)) return false;
    cb.res.wood -= (cost.wood || 0);
    cb.res.ore -= (cost.ore || 0);
    cb.res.magic -= (cost.magic || 0);
    p.gold -= (cost.gold || 0);
    if (cost.soul) _cbConsumeInv('mat_nazarick_soulcrystal', cost.soul, p);
    if (cost.frag) _cbConsumeInv('mat_nazarick_gearfrag', cost.frag, p);
    if (cost.pride) _cbConsumePride(cost.pride, p);
    if (cost.dragon) _cbConsumeInv('mat_dragon_heart', cost.dragon, p);
    return true;
}

function cbStartUpgrade(bid) {
    let cb = ensureClanBase();
    if (!cb || !CB_UPGRADE_COST[bid]) { if (typeof logSys === 'function') logSys('無法升級此建築。'); return; }
    if (CB_BUILDINGS[bid] && CB_BUILDINGS[bid].locked) { logSys('後續開放。'); return; }
    let cur = cb.lv[bid] || 0;
    if (cur >= CB_MAX_LV) { logSys('已達最高等級。'); return; }
    let keep = cb.lv.keep || 0;
    if (bid !== 'keep' && cur >= keep) { logSys('其他設施等級不可超過公會本部。請先升級公會本部。'); return; }
    if (bid === 'intel' && !(window.GD && GD.level() >= 5)) { logSys('情報室需冒險者公會 Lv.5。'); return; }
    if (bid === 'kitchen' && !(window.GD && GD.level() >= 2)) { logSys('料理屋需冒險者公會 Lv.2。'); return; }
    if (bid === 'workshop' && !(window.GD && GD.level() >= 3)) { logSys('生產工坊需冒險者公會 Lv.3。'); return; }
    if (bid === 'logistics' && !(window.GD && GD.level() >= 4)) { logSys('後勤營需冒險者公會 Lv.4。'); return; }
    if (cb.queue.some(q => q.bid === bid)) { logSys('此建築已在建造佇列中。'); return; }
    if (cb.queue.length >= cbQueueSlots()) { logSys(`建造佇列已滿（${cbQueueSlots()}）。`); return; }
    let toLv = cur + 1;
    let cost = CB_UPGRADE_COST[bid][toLv];
    if (!cost) return;
    if (!cbCanAfford(cost)) { logSys('資源或金幣不足。'); return; }
    if (!cbPay(cost)) return;
    let finishAt = Date.now() + cost.ms;
    // 若佇列有進行中的，新單排在最後一個 finish 之後？Phase1：並行（雙佇列各自獨立計時）
    cb.queue.push({ bid, toLv, finishAt, startedAt: Date.now() });
    if (typeof logSys === 'function') logSys(`<span class="text-amber-300 font-bold">【血盟據點】</span>${CB_BUILDINGS[bid].n} 開始升級至 Lv.${toLv}。`);
    if (typeof saveGame === 'function') saveGame();
    renderClanBaseTab();
}

function cbTickQueue(now) {
    let cb = ensureClanBase();
    if (!cb) return [];
    now = now || Date.now();
    let done = [];
    cb.queue = (cb.queue || []).filter(q => {
        if (!q || !(q.finishAt > 0)) return false;
        if (now >= q.finishAt) {
            cb.lv[q.bid] = Math.max(cb.lv[q.bid] || 0, q.toLv || 0);
            done.push(q);
            return false;
        }
        return true;
    });
    return done;
}

// ===== 藥水工房自產 =====
function cbProduce(now) {
    let cb = ensureClanBase();
    if (!cb) return { berry: 0, mana: 0 };
    now = now || Date.now();
    let lv = cb.lv.potion || 0;
    if (lv < 1) { cb.lastProdAt = now; return { berry: 0, mana: 0 }; }
    let elapsed = Math.max(0, now - (cb.lastProdAt || now));
    let hours = Math.floor(elapsed / 3600000);
    if (hours <= 0) return { berry: 0, mana: 0 };
    let per = lv * 2;   // 每小時各產 level×2
    let berry = 0, mana = 0;
    if (lv >= 1) { berry = per * hours; cbAddStock('cb_berry', berry); }
    if (lv >= 2) { mana = per * hours; cbAddStock('cb_mana', mana); }
    cb.lastProdAt = (cb.lastProdAt || now) + hours * 3600000;
    return { berry, mana, hours };
}

// ===== 離線結算 =====
function cbSettleOffline() {
    let cb = ensureClanBase();
    if (!cb) return null;
    let now = Date.now();
    let awayMs = Math.max(0, now - (cb.lastSeenAt || now));
    let built = cbTickQueue(now);
    let prod = cbProduce(now);
    cb.lastSeenAt = now;
    let report = null;
    let exReady = (cb.exped || []).filter(e => now >= e.endAt).length;
    if (awayMs >= 60000 && (built.length || prod.berry || prod.mana || exReady)) {
        report = { awayMs, built, prod, exReady };
        cb.offlineReport = report;
    }
    return report;
}

function cbShowOfflinePopup() {
    let cb = ensureClanBase();
    if (!cb || !cb.offlineReport) return;
    let r = cb.offlineReport;
    cb.offlineReport = null;
    let mins = Math.floor((r.awayMs || 0) / 60000);
    let lines = [`離線約 ${mins} 分鐘`];
    (r.built || []).forEach(q => {
        lines.push(`✔ ${CB_BUILDINGS[q.bid] ? CB_BUILDINGS[q.bid].n : q.bid} 升至 Lv.${q.toLv}`);
    });
    if (r.prod && (r.prod.berry || r.prod.mana)) {
        let parts = [];
        if (r.prod.berry) parts.push(`野莓藥草水 ×${r.prod.berry}`);
        if (r.prod.mana) parts.push(`清澈魔力水 ×${r.prod.mana}`);
        lines.push(`🧪 自動生產：${parts.join('、')}`);
    }
    if (r.exReady) lines.push(`🧭 探險隊歸來 ${r.exReady} 隊（至血盟據點領取）`);
    if (typeof logSys === 'function') logSys(`<span class="text-amber-300 font-bold">【血盟據點・離線收益】</span><br>${lines.join('<br>')}`);
    try {
        let msg = '🏰 血盟據點・離線收益\n\n' + lines.join('\n');
        if (typeof alert === 'function') setTimeout(() => alert(msg), 400);
    } catch (e) {}
}

// ===== 鐵匠舖 =====
function cbEnhanceBonusPct(p) {
    return cbBldLv('blacksmith', p) * 0.5;   // +0.5% per level
}
function cbProtectAvailable(p) {
    let cb = ensureClanBase(p);
    if (!cb || (cb.lv.blacksmith || 0) < 10) return false;
    let day = _cbDayKey();
    return cb.protectDay !== day || !!cb.protectOn;
}
function cbProtectIsOn(p) {
    let cb = ensureClanBase(p);
    if (!cb || (cb.lv.blacksmith || 0) < 10) return false;
    let day = _cbDayKey();
    if (cb.protectDay !== day) { cb.protectOn = false; return false; }
    return !!cb.protectOn;
}
function cbToggleProtect() {
    let cb = ensureClanBase();
    if (!cb || (cb.lv.blacksmith || 0) < 10) { logSys('鐵匠舖 Lv.10 解鎖保護強化。'); return; }
    let day = _cbDayKey();
    if (cb.protectDay === day && !cb.protectOn) { logSys('今日保護強化已使用完畢。'); return; }
    if (cb.protectDay !== day) { cb.protectDay = day; cb.protectOn = true; }
    else cb.protectOn = !cb.protectOn;
    if (typeof logSys === 'function') logSys(cb.protectOn ? '<span class="text-emerald-300">保護強化已開啟：下一次強化失敗不會損壞裝備。</span>' : '保護強化已關閉。');
    renderClanBaseTab();
    if (typeof saveGame === 'function') saveGame();
}
function cbConsumeProtect() {
    let cb = ensureClanBase();
    if (!cb) return;
    cb.protectOn = false;
    cb.protectDay = _cbDayKey();
}
function _cbDayKey() {
    let d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
}

// ===== 訓練場：其他存檔角色共享 EXP =====
// 定義：主角色獲得 EXP 時，將 trainingLv×2% 寫入 trainBank，對應到「非目前槽、且目前不在隊伍中擔任傭兵」的其他存檔角色；該角色載入時領取。
function cbShareTrainingExp(gained) {
    let cb = ensureClanBase();
    let lv = (cb && cb.lv && cb.lv.training) || 0;
    if (!(lv > 0) || !(gained > 0)) return;
    let share = Math.floor(gained * (lv * 0.02));
    if (share <= 0) return;
    let mySlot = (typeof currentSlot !== 'undefined') ? currentSlot : 0;
    let allySlots = new Set();
    (player.allies || []).forEach(a => { if (a && a._srcSlot != null) allySlots.add(Number(a._srcSlot)); });
    let max = (typeof SAVE_SLOT_MAX === 'number') ? SAVE_SLOT_MAX : 16;
    for (let s = 1; s <= max; s++) {
        if (s === mySlot) continue;
        if (allySlots.has(s)) continue;
        // 只給「有角色」的槽（slotSummary 存在）
        let has = false;
        try { if (typeof slotSummary === 'function' && slotSummary(s)) has = true; } catch (e) {}
        if (!has) continue;
        cb.trainBank[s] = (cb.trainBank[s] || 0) + share;
    }
}
function cbClaimTrainingExp() {
    // 從「其他角色的 trainBank」領？簡化：各角色自己的 clanBase.trainBank[ownSlot] 在存檔裡
    // 實際上 EXP 是寫在「獲得 EXP 的那個角色」的 trainBank[targetSlot]。
    // 領取：掃描所有存檔的 trainBank[mySlot] 太重。改為：寫入全域 key。
    let mySlot = (typeof currentSlot !== 'undefined') ? currentSlot : 0;
    if (!mySlot) return 0;
    let key = 'lineage_idle_clanbase_train_' + mySlot;
    let pending = 0;
    try {
        let raw = (typeof _lzGet === 'function') ? _lzGet(key) : localStorage.getItem(key);
        pending = Math.floor(Number(raw) || 0);
        if (pending > 0) {
            if (typeof _lzSet === 'function') _lzSet(key, '0');
            else localStorage.setItem(key, '0');
        }
    } catch (e) {}
    // 也清自己 trainBank（相容）
    let cb = ensureClanBase();
    if (cb && cb.trainBank && cb.trainBank[mySlot]) {
        pending += Math.floor(cb.trainBank[mySlot] || 0);
        delete cb.trainBank[mySlot];
    }
    if (pending > 0 && player && player.cls) {
        player.exp = (player.exp || 0) + pending;
        if (typeof checkLvUp === 'function') checkLvUp();
        if (typeof logSys === 'function') logSys(`<span class="text-amber-300 font-bold">【訓練場】</span>領取共享經驗 ${pending.toLocaleString()}。`);
    }
    return pending;
}
function cbFlushTrainingBank() {
    // 把 trainBank 寫到各目標槽的全域 key（跨存檔）
    let cb = ensureClanBase();
    if (!cb || !cb.trainBank) return;
    Object.keys(cb.trainBank).forEach(s => {
        let n = Math.floor(cb.trainBank[s] || 0);
        if (n <= 0) return;
        let key = 'lineage_idle_clanbase_train_' + s;
        try {
            let prev = 0;
            let raw = (typeof _lzGet === 'function') ? _lzGet(key) : localStorage.getItem(key);
            prev = Math.floor(Number(raw) || 0);
            let next = String(prev + n);
            if (typeof _lzSet === 'function') _lzSet(key, next);
            else localStorage.setItem(key, next);
        } catch (e) {}
        delete cb.trainBank[s];
    });
}

// ===== 施法加速 =====
function cbCastSpdBonus(who) {
    who = who || player;
    if (!who || !who.buffs) return 0;
    let b = 0;
    if ((who.buffs.cb_bluespd || 0) > 0) b += 10;
    if ((who.buffs.cb_wind || 0) > 0) b += 12;
    return Math.min(CB_CAST_SPD_CAP, b);
}
function cbApplyCastSpd(d, who) {
    if (!d) return;
    let bonus = cbCastSpdBonus(who);
    d.castSpdPct = bonus;
    if (bonus > 0) {
        let div = 1 + bonus / 100;
        if (d.castLock != null) d.castLock = d.castLock / div;
        if (d.supportCastLock != null) d.supportCastLock = d.supportCastLock / div;
    }
}

// ===== 藥水使用 =====
function cbClearCatBuffs(who, cat) {
    let keys = CB_CAT_KEYS[cat];
    if (!keys || !who || !who.buffs) return;
    keys.forEach(k => { who.buffs[k] = 0; });
}
function cbUsePotion(itemId, targetWho, silent) {
    let recipe = CB_RECIPES.find(r => r.id === itemId);
    if (!recipe) return false;
    let who = targetWho || player;
    if (!who) return false;
    if (!cbTakeStock(itemId, 1)) {
        if (!silent && typeof logSys === 'function') logSys('庫存不足。');
        return false;
    }
    let isAlly = !!(who._allyName);
    let mhp = isAlly ? (who.mhp || 1) : (who.mhp || player.mhp || 1);
    let mmp = isAlly ? (who.mmp || 0) : (who.mmp || player.mmp || 0);

    if (itemId === 'cb_berry') {
        let h = Math.max(1, Math.floor(mhp * 0.15));
        if (isAlly) who.curHp = Math.min(mhp, (who.curHp || 0) + h);
        else who.hp = Math.min(mhp, (who.hp || 0) + h);
        if (!silent) logSys(`飲用野莓藥草水，恢復 ${h} HP。`);
    } else if (itemId === 'cb_mana') {
        let m = Math.max(1, Math.floor(mmp * 0.15));
        if (isAlly) who.curMp = Math.min(mmp, (who.curMp || 0) + m);
        else who.mp = Math.min(mmp, (who.mp || 0) + m);
        if (!silent) logSys(`飲用清澈魔力水，恢復 ${m} MP。`);
    } else if (itemId === 'cb_cookie') {
        who._cbCookie = { left: 10, total: Math.max(1, Math.floor(mhp * 0.40)), tickHeal: 0 };
        who._cbCookie.tickHeal = Math.max(1, Math.floor(who._cbCookie.total / 10));
        if (!silent) logSys('食用血盟乾糧，開始持續恢復（受傷會中斷）。');
    } else if (itemId === 'cb_antidote') {
        if (who.statuses) { who.statuses.poison = 0; who.statuses.poisonDmg = 0; }
        who.buffs = who.buffs || {};
        who.buffs.cb_poisonimm = 30;
        if (!silent) logSys('飲用解毒草茶，解除中毒並獲得毒免疫 30 秒。');
    } else if (itemId === 'cb_awaken') {
        if (who.statuses) {
            ['silence', 'paralyze', 'terror', 'panic', 'confuse', 'magicseal', 'stun', 'sleep', 'freeze', 'stone', 'bind'].forEach(k => {
                if (who.statuses[k] > 0) who.statuses[k] = 0;
            });
        }
        who.buffs = who.buffs || {};
        who.buffs.cb_ctrlimm = 10;
        if (!silent) logSys('飲用入魔清醒劑，解除控制並獲得控制免疫 10 秒。');
    } else if (itemId === 'cb_partyheal') {
        let ph = Math.max(1, Math.floor((player.mhp || 1) * 0.30));
        player.hp = Math.min(player.mhp, (player.hp || 0) + ph);
        (player.allies || []).forEach(a => {
            if (!a || a._downed) return;
            let ah = Math.max(1, Math.floor((a.mhp || 1) * 0.30));
            a.curHp = Math.min(a.mhp || 1, (a.curHp || 0) + ah);
        });
        if (!silent) logSys('使用全隊治癒藥包，全隊恢復 30% HP。');
    } else if (itemId === 'cb_soulwater') {
        let h = Math.max(1, Math.floor(mhp * 0.50));
        let m = Math.max(1, Math.floor(mmp * 0.50));
        if (isAlly) { who.curHp = Math.min(mhp, (who.curHp || 0) + h); who.curMp = Math.min(mmp, (who.curMp || 0) + m); }
        else { who.hp = Math.min(mhp, (who.hp || 0) + h); who.mp = Math.min(mmp, (who.mp || 0) + m); }
        if (!silent) logSys(`飲用靈魂精華水，恢復 ${h} HP、${m} MP。`);
    } else if (recipe.buffKey) {
        who.buffs = who.buffs || {};
        if (recipe.cat && CB_CAT_KEYS[recipe.cat]) cbClearCatBuffs(who, recipe.cat);
        if (recipe.bossFight) {
            who.buffs[recipe.buffKey] = 1;   // 標記：一場頭目戰（用 >0 判定；頭目戰結束清除）
            who._cbBossBuff = recipe.buffKey;
        } else {
            who.buffs[recipe.buffKey] = recipe.dur || CB_BUFF_DUR;
        }
        if (!silent) logSys(`使用了 ${recipe.n}。`);
        if (typeof calcStats === 'function' && who === player) calcStats();
        else if (isAlly && typeof _allyLevelRecompute === 'function') _allyLevelRecompute(who);
        // 套用到隊友（共享）
        if (who === player) {
            try {
                cbSyncAllyBuffs();
                (player.allies || []).forEach(a => {
                    if (a && !a._downed && typeof _allyLevelRecompute === 'function') _allyLevelRecompute(a);
                });
            } catch (e) {}
        }
    }
    if (typeof updateUI === 'function') updateUI();
    if (typeof saveGame === 'function') saveGame();
    return true;
}

function cbCraft(itemId, qty) {
    let recipe = CB_RECIPES.find(r => r.id === itemId);
    if (!recipe) return;
    let lv = cbBldLv('potion');
    if (lv < recipe.unlock) { logSys(`藥水工房需達 Lv.${recipe.unlock}。`); return; }
    qty = Math.max(1, Math.floor(Number(qty) || 1));
    let crafted = 0;
    for (let i = 0; i < qty; i++) {
        if (!cbCanAfford(recipe.cost)) break;
        if (!cbPay(recipe.cost)) break;
        cbAddStock(itemId, 1);
        crafted++;
    }
    if (crafted > 0) {
        logSys(`<span class="text-emerald-300">製作了 ${recipe.n} ×${crafted}。</span>`);
        if (typeof saveGame === 'function') saveGame();
        renderClanBaseTab();
    } else logSys('資源不足，無法製作。');
}

// ===== 自動 BUFF 格 =====
function cbSetAutoBuff(slotIdx, itemId) {
    let cb = ensureClanBase();
    if (!cb) return;
    slotIdx = Math.max(0, Math.min(3, Math.floor(slotIdx)));
    if (itemId && !CB_RECIPES.find(r => r.id === itemId && r.buffKey)) {
        logSys('只能設定 BUFF 類消耗品。');
        return;
    }
    cb.autoBuff.player[slotIdx] = itemId || null;
    renderClanBaseTab();
    if (typeof saveGame === 'function') saveGame();
}
function cbAutoBuffTick() {
    // 每秒：若某自動格的 buff 已結束且有庫存 → 對玩家重施
    let cb = ensureClanBase();
    if (!cb || !player || player.dead) return;
    let slots = cb.autoBuff.player || [];
    slots.forEach(id => {
        if (!id) return;
        let recipe = CB_RECIPES.find(r => r.id === id);
        if (!recipe || !recipe.buffKey) return;
        if ((player.buffs[recipe.buffKey] || 0) > 0) return;
        if (cbStock(id) <= 0) return;
        // 同カテゴリ已有其他 → 仍可重施（use 會清同類）
        cbUsePotion(id, player, true);
    });
    // 隊友：共享主角色庫存，套用主角色已有的據點 buff（鏡像到盟友）
    cbSyncAllyBuffs();
}
function cbSyncAllyBuffs() {
    // 將玩家身上的據點 BUFF 同步剩餘時間到盟友（共享效果）；盟友 stats 讀自身 buffs
    if (!player || !player.allies) return;
    let keys = [];
    Object.keys(CB_CAT_KEYS).forEach(c => keys.push.apply(keys, CB_CAT_KEYS[c]));
    keys.push('cb_giant', 'cb_poisonimm', 'cb_ctrlimm');
    player.allies.forEach(a => {
        if (!a || a._downed) return;
        a.buffs = a.buffs || {};
        keys.forEach(k => {
            let pv = player.buffs[k] || 0;
            if (pv > 0) a.buffs[k] = Math.max(a.buffs[k] || 0, pv);
        });
    });
}

// ===== 世界樹復活 =====
function cbTryWorldTreeRevive(who) {
    who = who || player;
    if (!who) return false;
    // 不滅加護已觸發時不會叫到這裡（killPlayer 鏈順序保證）
    let isAlly = !!(who._allyName);
    if (isAlly) {
        if ((who.curHp || 0) > 0) return false;
    } else {
        if (who.dead) return false;
        if ((who.hp || 0) > 0) return false;
    }
    // 每場戰鬥／遭遇一次
    let encounterId = (typeof state !== 'undefined' && state) ? (state._cbEncounterId || state.ticks || 0) : 0;
    if (who._cbWorldTreeUsed === encounterId) return false;
    if (cbStock('cb_worldtree') <= 0) return false;
    if (!cbTakeStock('cb_worldtree', 1)) return false;
    who._cbWorldTreeUsed = encounterId;
    let mhp = isAlly ? (who.mhp || 1) : (who.mhp || 1);
    let heal = Math.max(1, Math.floor(mhp * 0.50));
    if (isAlly) {
        who.curHp = heal;
        who._downed = false;
        if (typeof logCombat === 'function') logCombat(`<span class="text-emerald-300 font-bold">【世界樹生命露・${who._allyName}】</span>復活並恢復 ${heal} HP！`, 'heal');
        try { if (typeof renderSquadPanel === 'function') renderSquadPanel(); } catch (e) {}
    } else {
        who.hp = heal;
        who.dead = false;
        if (typeof logCombat === 'function') logCombat(`<span class="text-emerald-300 font-bold">【世界樹生命露】</span>復活並恢復 ${heal} HP！`, 'heal');
        try { if (typeof updateUI === 'function') updateUI(); } catch (e) {}
    }
    return true;
}

// ===== 戰鬥／屬性掛鉤輔助 =====
function cbPhysDmgOutMult(who) {
    who = who || player;
    if (who && who.buffs && (who.buffs.cb_berserk || 0) > 0) return 1.08;
    return 1;
}
function cbMagicDmgOutMult(who) {
    who = who || player;
    if (who && who.buffs && (who.buffs.cb_sage || 0) > 0) return 1.08;
    return 1;
}
function cbPhysTakenMult(who) {
    who = who || player;
    if (who && who.buffs && (who.buffs.cb_iron || 0) > 0) return 0.94;
    return 1;
}
function cbBossDmgMult(who) {
    who = who || player;
    if (who && who.buffs && (who.buffs.cb_nazwar || 0) > 0) return 1.12;
    return 1;
}
function cbHardSkinIgnorePct(who) {
    who = who || player;
    if (who && who.buffs && (who.buffs.cb_sunder || 0) > 0) return 0.15;
    return 0;
}
function cbExpMult(who) {
    who = who || player;
    if (who && who.buffs && (who.buffs.cb_exp || 0) > 0) return 1.20;
    return 1;
}
function cbDropMult(who) {
    who = who || player;
    if (who && who.buffs && (who.buffs.cb_luck || 0) > 0) return 1.10;
    return 1;
}
function cbGoldMult(who) {
    who = who || player;
    if (who && who.buffs && (who.buffs.cb_luck || 0) > 0) return 1.15;
    return 1;
}
function cbOnBossFightEnd() {
    // 清除頭目戰 BUFF
    let clear = (who) => {
        if (!who || !who.buffs) return;
        ['cb_sunder', 'cb_nazwar'].forEach(k => { who.buffs[k] = 0; });
    };
    clear(player);
    (player.allies || []).forEach(clear);
}
function cbCookieTick(who) {
    if (!who || !who._cbCookie || !(who._cbCookie.left > 0)) return;
    let isAlly = !!(who._allyName);
    if (who._cbCookie.interrupted) { who._cbCookie = null; return; }
    let heal = who._cbCookie.tickHeal || 1;
    let mhp = isAlly ? (who.mhp || 1) : (who.mhp || 1);
    if (isAlly) who.curHp = Math.min(mhp, (who.curHp || 0) + heal);
    else who.hp = Math.min(mhp, (who.hp || 0) + heal);
    who._cbCookie.left--;
    if (who._cbCookie.left <= 0) who._cbCookie = null;
}
function cbInterruptCookie(who) {
    if (who && who._cbCookie) who._cbCookie.interrupted = true;
}
function cbControlImmune(who) {
    return !!(who && who.buffs && (who.buffs.cb_ctrlimm || 0) > 0);
}
function cbPoisonImmune(who) {
    return !!(who && who.buffs && (who.buffs.cb_poisonimm || 0) > 0);
}

// ===== UI =====
function cbEnsureStyles() {
    if (document.getElementById('clanbase-style')) return;
    let s = document.createElement('style');
    s.id = 'clanbase-style';
    s.textContent = `
#tab-clanbase.cb-root, #tab-clanbase .cb-root { color:#e2e8f0; font-size:13px; line-height:1.45; }
.cb-wrap { display:flex; flex-direction:column; gap:10px; padding:6px 4px 16px; box-sizing:border-box; }
.cb-head { border-bottom:1px solid #475569; padding-bottom:8px; }
.cb-title { color:#fde68a; font-weight:700; font-size:1.15rem; }
.cb-sub { color:#94a3b8; font-size:11px; margin-top:2px; }
.cb-res { display:flex; flex-wrap:wrap; gap:6px 10px; background:rgba(15,23,42,.75); border:1px solid #475569; border-radius:8px; padding:8px 10px; }
.cb-res span { white-space:nowrap; }
.cb-res b { font-weight:700; }
.cb-res .w { color:#fbbf24; } .cb-res .o { color:#e2e8f0; } .cb-res .m { color:#c4b5fd; } .cb-res .g { color:#fde047; }
.cb-queue { background:rgba(15,23,42,.55); border:1px solid #334155; border-radius:8px; padding:8px 10px; }
.cb-queue-h { font-weight:700; color:#e2e8f0; margin-bottom:4px; }
.cb-queue-empty { color:#64748b; font-size:12px; }
.cb-queue-row { color:#67e8f9; font-size:12px; margin-top:2px; }
.cb-card { background:rgba(30,41,59,.92); border:1px solid #475569; border-radius:8px; padding:10px; display:flex; flex-direction:column; gap:6px; }
.cb-card.locked { opacity:.55; }
.cb-card-top { display:flex; justify-content:space-between; align-items:flex-start; gap:8px; }
.cb-card-main { min-width:0; flex:1; }
.cb-name { font-weight:700; color:#fef3c7; font-size:14px; }
.cb-lv { color:#67e8f9; font-weight:700; margin-left:4px; }
.cb-desc { color:#94a3b8; font-size:11px; margin-top:2px; }
.cb-eff { color:#6ee7b7; font-size:12px; }
.cb-next { color:#cbd5e1; font-size:12px; }
.cb-cost { color:#94a3b8; font-size:11px; word-break:break-word; }
.cb-warn { color:#fca5a5; font-size:11px; }
.cb-ok { color:#fbbf24; font-size:11px; font-weight:700; }
.cb-prog { height:6px; background:#0f172a; border:1px solid #334155; border-radius:4px; overflow:hidden; margin-top:4px; }
.cb-prog > i { display:block; height:100%; background:linear-gradient(90deg,#b45309,#f59e0b); width:0%; }
.cb-btn { flex-shrink:0; padding:6px 10px !important; font-size:12px !important; font-weight:700 !important; min-width:52px; }
.cb-btn-go { background:linear-gradient(180deg,#92400e,#78350f) !important; border-color:#f59e0b !important; color:#fef3c7 !important; }
.cb-btn-dim { opacity:.55; }
.cb-check { display:flex; align-items:center; gap:6px; font-size:12px; color:#a7f3d0; margin-top:4px; cursor:pointer; }
.cb-check input { width:14px; height:14px; }
.cb-sec { border:1px solid #5b21b6; border-radius:8px; background:rgba(15,23,42,.7); padding:10px; }
.cb-sec-h { color:#ddd6fe; font-weight:700; margin-bottom:6px; }
.cb-sec-note { color:#94a3b8; font-size:11px; margin-bottom:8px; }
.cb-recipes { display:grid; grid-template-columns:1fr; gap:8px; }
@media (min-width:720px){ .cb-recipes { grid-template-columns:1fr 1fr; } }
.cb-recipe { display:flex; gap:8px; align-items:flex-start; background:rgba(30,41,59,.85); border:1px solid #475569; border-radius:8px; padding:8px; }
.cb-recipe.locked { opacity:.45; filter:grayscale(.4); }
.cb-recipe img { width:36px; height:36px; object-fit:contain; flex-shrink:0; background:#0f172a; border:1px solid #334155; border-radius:4px; padding:2px; }
.cb-recipe-body { flex:1; min-width:0; }
.cb-recipe-name { font-weight:700; color:#f1f5f9; font-size:13px; }
.cb-recipe-name .tag { color:#94a3b8; font-weight:500; font-size:11px; margin-left:4px; }
.cb-recipe-name .auto { color:#34d399; font-size:11px; margin-left:4px; }
.cb-recipe-d { color:#94a3b8; font-size:11px; margin-top:2px; }
.cb-recipe-cost { color:#cbd5e1; font-size:11px; margin-top:3px; }
.cb-recipe-acts { display:flex; flex-wrap:wrap; gap:4px; margin-top:6px; }
.cb-recipe-acts .btn { padding:4px 8px !important; font-size:11px !important; font-weight:700 !important; }
.cb-act-craft { background:linear-gradient(180deg,#5b21b6,#3b0764) !important; border-color:#a78bfa !important; color:#ede9fe !important; }
.cb-act-use { background:linear-gradient(180deg,#065f46,#064e3b) !important; border-color:#34d399 !important; color:#d1fae5 !important; }
.cb-autos { border-top:1px solid #334155; margin-top:10px; padding-top:8px; }
.cb-autos-h { font-weight:700; color:#e2e8f0; margin-bottom:2px; }
.cb-autos-note { color:#94a3b8; font-size:11px; margin-bottom:6px; }
.cb-slot { display:flex; align-items:center; gap:8px; margin-top:4px; font-size:12px; }
.cb-slot label { color:#94a3b8; width:36px; flex-shrink:0; }
.cb-slot select { flex:1; min-width:0; background:#0f172a; border:1px solid #475569; border-radius:4px; color:#e2e8f0; padding:4px 6px; font-size:12px; }
#tab-clanbase .cb-exp-sec { border-color:#b45309; }
#tab-clanbase .cb-mage-sec { border-color:#7c3aed; }
#tab-clanbase .cb-exp-row { display:flex; justify-content:space-between; align-items:center; gap:8px; background:rgba(30,41,59,.85); border:1px solid #475569; border-radius:6px; padding:6px 8px; margin-top:6px; }
#tab-clanbase .cb-exp-main { min-width:0; flex:1; font-size:12px; color:#e2e8f0; }
#tab-clanbase .cb-exp-dim { color:#94a3b8; font-size:11px; }
#tab-clanbase .cb-exp-time { color:#67e8f9; font-size:11px; margin-top:2px; }
#tab-clanbase .cb-exp-form { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; align-items:center; }
#tab-clanbase .cb-exp-form select { flex:1 1 140px; min-width:0; background:#0f172a; border:1px solid #475569; border-radius:4px; color:#e2e8f0; padding:5px 6px; font-size:12px; }
#tab-clanbase .cb-exp-form select option:disabled { color:#64748b; }
#tab-clanbase .cb-exp-busy { flex-basis:100%; }
#tab-clanbase .cb-exp-claimall { margin-top:6px; }
#tab-clanbase .cb-mage-v { color:#c4b5fd; }
@media (max-width: 640px) { #tab-clanbase .cb-exp-form select { flex-basis:100%; } #tab-clanbase .cb-exp-form .cb-btn { width:100%; } }
`.replace(/^\s+/gm, '');
    document.head.appendChild(s);
}

function _cbFmtTime(ms) {
    ms = Math.max(0, ms);
    let s = Math.floor(ms / 1000);
    let h = Math.floor(s / 3600); s %= 3600;
    let m = Math.floor(s / 60); s %= 60;
    if (h > 0) return h + '時' + m + '分';
    if (m > 0) return m + '分' + s + '秒';
    return s + '秒';
}
function _cbCostHtml(cost) {
    if (!cost) return '';
    let parts = [];
    if (cost.wood) parts.push('🪵' + cost.wood);
    if (cost.ore) parts.push('⛏️' + cost.ore);
    if (cost.magic) parts.push('💎' + cost.magic);
    if (cost.gold) parts.push('💰' + cost.gold.toLocaleString());
    if (cost.soul) parts.push('魂晶×' + cost.soul);
    if (cost.frag) parts.push('殘片×' + cost.frag);
    if (cost.pride) parts.push('奇美拉皮×' + cost.pride);
    if (cost.dragon) parts.push('飛龍之心×' + cost.dragon);
    if (cost.ms) parts.push('⏱' + _cbFmtTime(cost.ms));
    return parts.join(' ');
}
function _cbQueueFor(bid) {
    let cb = ensureClanBase();
    return (cb.queue || []).find(q => q && q.bid === bid) || null;
}

function renderClanBaseTab() {
    cbEnsureStyles();
    let div = document.getElementById('tab-clanbase');
    if (!div || !player || !player.cls) return;
    div.classList.add('cb-root');
    let cb = ensureClanBase();
    cbTickQueue();
    let now = Date.now();
    let res = cb.res || {};

    let html = '<div class="cb-wrap">';
    html += '<div class="cb-head"><div class="cb-title">🏰 血盟據點</div>'
        + '<div class="cb-sub">資源無上限・離線亦計算建造與自動生產</div></div>';

    html += '<div class="cb-res">'
        + '<span>🪵 木材 <b class="w">' + (res.wood || 0).toLocaleString() + '</b></span>'
        + '<span>⛏️ 礦石 <b class="o">' + (res.ore || 0).toLocaleString() + '</b></span>'
        + '<span>💎 魔法石 <b class="m">' + (res.magic || 0).toLocaleString() + '</b></span>'
        + '<span>💰 金幣 <b class="g">' + (player.gold || 0).toLocaleString() + '</b></span>'
        + '</div>';

    html += '<div class="cb-queue"><div class="cb-queue-h">建造佇列（' + cb.queue.length + '/' + cbQueueSlots() + '）</div>';
    if (!cb.queue.length) html += '<div class="cb-queue-empty">目前沒有建造中的建築</div>';
    else cb.queue.forEach(q => {
        let left = Math.max(0, (q.finishAt || 0) - now);
        let total = Math.max(1, (q.finishAt || now) - (q.startedAt || q.finishAt || now));
        let pct = Math.min(100, Math.max(0, Math.round((1 - left / total) * 100)));
        html += '<div class="cb-queue-row">' + (CB_BUILDINGS[q.bid] ? CB_BUILDINGS[q.bid].n : q.bid)
            + ' → Lv.' + q.toLv + '　剩餘 ' + _cbFmtTime(left) + '</div>'
            + '<div class="cb-prog"><i style="width:' + pct + '%"></i></div>';
    });
    html += '</div>';

    ['keep', 'blacksmith', 'training', 'potion', 'explore', 'mage', 'tavern', 'dorm', 'intel', 'kitchen', 'workshop', 'logistics'].forEach(bid => {
        let b = CB_BUILDINGS[bid];
        if (!b) return;
        if (b.locked) {
            html += '<div class="cb-card locked"><div class="cb-name">' + b.emoji + ' ' + b.n
                + '</div><div class="cb-desc">後續開放</div></div>';
            return;
        }
        let lv = cb.lv[bid] || 0;
        let next = lv + 1;
        let cost = (CB_UPGRADE_COST[bid] && CB_UPGRADE_COST[bid][next]) || null;
        let isMax = lv >= CB_MAX_LV;
        let keepGate = bid !== 'keep' && lv >= (cb.lv.keep || 0) && !isMax;
        let q = _cbQueueFor(bid);
        let inQ = !!q;
        let guildGate = (bid === 'intel' && !(window.GD && GD.level() >= 5))
            || (bid === 'kitchen' && !(window.GD && GD.level() >= 2))
            || (bid === 'workshop' && !(window.GD && GD.level() >= 3))
            || (bid === 'logistics' && !(window.GD && GD.level() >= 4));
        let can = !!(cost && !keepGate && !guildGate && !inQ && !isMax && cb.queue.length < cbQueueSlots() && cbCanAfford(cost));

        html += '<div class="cb-card"><div class="cb-card-top"><div class="cb-card-main">';
        html += '<div class="cb-name">' + b.emoji + ' ' + b.n + '<span class="cb-lv">Lv.' + lv + '</span></div>';
        html += '<div class="cb-desc">' + b.desc + '</div>';
        html += '<div class="cb-eff">目前：' + b.effect(lv) + '</div>';
        if (isMax) {
            html += '<div class="cb-ok">已滿級</div>';
        } else if (inQ) {
            let left = Math.max(0, (q.finishAt || 0) - now);
            let total = Math.max(1, (q.finishAt || now) - (q.startedAt || q.finishAt || now));
            let pct = Math.min(100, Math.max(0, Math.round((1 - left / total) * 100)));
            html += '<div class="cb-next">升級至 Lv.' + q.toLv + '　剩餘 ' + _cbFmtTime(left) + '</div>';
            html += '<div class="cb-prog"><i style="width:' + pct + '%"></i></div>';
        } else if (cost) {
            html += '<div class="cb-next">下一級：' + (b.nextEffect(lv) || '') + '</div>';
            html += '<div class="cb-cost">' + _cbCostHtml(cost) + '</div>';
            if (guildGate) html += '<div class="cb-warn">需冒險者公會 Lv.5</div>';
            else if (keepGate) html += '<div class="cb-warn">需先提升公會本部等級</div>';
            else if (!cbCanAfford(cost)) html += '<div class="cb-warn">資源或金幣不足</div>';
            else if (cb.queue.length >= cbQueueSlots()) html += '<div class="cb-warn">建造佇列已滿</div>';
        }
        html += '</div>';
        if (!isMax && !inQ) {
            html += '<button type="button" class="btn cb-btn ' + (can ? 'cb-btn-go' : 'cb-btn-dim') + '"'
                + (can ? (' onclick="cbStartUpgrade(\'' + bid + '\')"') : ' disabled') + '>升級</button>';
        } else if (inQ) {
            html += '<button type="button" class="btn cb-btn cb-btn-dim" disabled>建造中</button>';
        }
        html += '</div>'; // card-top

        if (bid === 'blacksmith' && lv >= 10) {
            html += '<label class="cb-check"><input type="checkbox" ' + (cbProtectIsOn() ? 'checked' : '')
                + ' onchange="cbToggleProtect()"> 保護強化（今日一次・失敗不損壞）</label>';
        }
        html += '</div>'; // card
    });

    html += (typeof window.gdBasePanelHtml === 'function') ? window.gdBasePanelHtml(cb, now) : _cbExpedPanelHtml(cb, now);   // 🏛️ v3.8.117 委託板取代探險公會派遣表單
    html += _cbMagePanelHtml(cb, now);
    // Potion workshop
    let plv = cb.lv.potion || 0;
    html += '<div class="cb-sec"><div class="cb-sec-h">🧪 藥水工房' + (plv > 0 ? ' Lv.' + plv : '（未建造）') + '</div>';
    if (plv <= 0) {
        html += '<div class="cb-sec-note">建造藥水工房後解鎖配方與自動生產。</div>';
    } else {
        html += '<div class="cb-sec-note">基礎藥水（Lv.1–2）每小時自動生產 ' + (plv * 2) + ' 瓶；其餘手動製作。</div>';
        html += '<div class="cb-recipes">';
        CB_RECIPES.forEach(r => {
            let unlocked = plv >= r.unlock;
            let stock = cbStock(r.id);
            let img = (typeof DB !== 'undefined' && DB.items[r.id] && DB.items[r.id].img)
                ? DB.items[r.id].img : ('assets/icons/items/' + r.n + '.png');
            html += '<div class="cb-recipe' + (unlocked ? '' : ' locked') + '">';
            html += '<img src="' + img + '" alt="" onerror="this.style.visibility=\'hidden\'">';
            html += '<div class="cb-recipe-body">';
            html += '<div class="cb-recipe-name">' + r.n
                + '<span class="tag">[' + (CB_CAT_LABEL[r.cat] || '') + '] 庫存 ' + stock + '</span>'
                + (r.auto ? '<span class="auto">自產</span>' : '') + '</div>';
            html += '<div class="cb-recipe-d">' + r.d + '</div>';
            if (unlocked) {
                html += '<div class="cb-recipe-cost">材料 ' + _cbCostHtml(r.cost) + '</div>';
                html += '<div class="cb-recipe-acts">'
                    + '<button type="button" class="btn cb-act-craft" onclick="cbCraft(\'' + r.id + '\',1)">製作1</button>'
                    + '<button type="button" class="btn cb-act-craft" onclick="cbCraft(\'' + r.id + '\',10)">製作10</button>'
                    + '<button type="button" class="btn cb-act-craft" onclick="cbCraftMax(\'' + r.id + '\')">最大</button>'
                    + '<button type="button" class="btn cb-act-use" onclick="cbUsePotion(\'' + r.id + '\')"'
                    + (stock < 1 ? ' disabled' : '') + '>使用</button>'
                    + '</div>';
            } else {
                html += '<div class="cb-warn">藥水工房 Lv.' + r.unlock + ' 解鎖</div>';
            }
            html += '</div></div>';
        });
        html += '</div>';

        // Auto buff
        html += '<div class="cb-autos"><div class="cb-autos-h">自動 BUFF 格（主角色・最多 4）</div>'
            + '<div class="cb-autos-note">到期自動重施，消耗庫存。隊友共享庫存與 BUFF 效果。</div>';
        let buffOpts = CB_RECIPES.filter(r => r.buffKey && !r.bossFight);
        for (let i = 0; i < 4; i++) {
            let cur = (cb.autoBuff.player[i]) || '';
            html += '<div class="cb-slot"><label>格' + (i + 1) + '</label>'
                + '<select onchange="cbSetAutoBuff(' + i + ', this.value || null)">'
                + '<option value="">（空）</option>';
            buffOpts.forEach(r => {
                if (plv < r.unlock) return;
                html += '<option value="' + r.id + '"' + (cur === r.id ? ' selected' : '') + '>'
                    + r.n + '（庫存 ' + cbStock(r.id) + '）</option>';
            });
            html += '</select></div>';
        }
        html += '</div>';
    }
    html += '</div></div>'; // sec + wrap
    div.innerHTML = html;
    try { _cbExpedFormRestore(); } catch (e) {}
}

function cbCraftMax(itemId) {
    let recipe = CB_RECIPES.find(r => r.id === itemId);
    if (!recipe) return;
    let cb = ensureClanBase();
    let max = 9999;
    let c = recipe.cost;
    if (c.wood) max = Math.min(max, Math.floor((cb.res.wood || 0) / c.wood));
    if (c.ore) max = Math.min(max, Math.floor((cb.res.ore || 0) / c.ore));
    if (c.magic) max = Math.min(max, Math.floor((cb.res.magic || 0) / c.magic));
    if (c.gold) max = Math.min(max, Math.floor((player.gold || 0) / c.gold));
    if (c.soul) max = Math.min(max, Math.floor(_cbInvCount('mat_nazarick_soulcrystal') / c.soul));
    if (c.frag) max = Math.min(max, Math.floor(_cbInvCount('mat_nazarick_gearfrag') / c.frag));
    if (c.dragon) max = Math.min(max, Math.floor(_cbInvCount('mat_dragon_heart') / c.dragon));
    if (c.pride) max = Math.min(max, Math.floor(_cbPrideMatCount() / c.pride));
    if (max < 1) { logSys('資源不足。'); return; }
    cbCraft(itemId, max);
}

// ===================================================================
// 🧭 v3.8.99 探險公會（Phase 2/3）
// ===================================================================
const CB_EXPED_HOURS = [1, 4, 8];
const CB_EXPED_BUSY_KEY = 'lineage_idle_exped_busy';   // 跨角色：slot → { by, endAt }（避免同一角色被兩名隊長同時派遣／招募）
const CB_EXPED_MAP_LV_SLACK = 5;                        // 地圖平均怪物等級 ≤ 角色等級 + 5 才可派遣
function _cbRng(seed) { let a = (seed >>> 0) || 1; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function _cbBusyLoad() { try { let o = JSON.parse(localStorage.getItem(CB_EXPED_BUSY_KEY) || '{}'); return (o && typeof o === 'object') ? o : {}; } catch (e) { return {}; } }
function _cbBusySave(o) { try { localStorage.setItem(CB_EXPED_BUSY_KEY, JSON.stringify(o || {})); } catch (e) {} }
function cbExpedBusyInfo(slot) {
    let o = _cbBusyLoad(), e = o[String(slot)];
    if (!e) return null;
    if (!(e.endAt > 0) || Date.now() > e.endAt + 3 * 86400000) { delete o[String(slot)]; _cbBusySave(o); return null; }   // 隊長角色遺失時 3 天後自動釋放
    return e;
}
function cbExpedSlots(p) { return cbExpedSlotsFor(cbBldLv('explore', p)); }
function _cbCurSlot() { try { return String(typeof currentSlot !== 'undefined' ? currentSlot : ''); } catch (e) { return ''; } }
// 存檔摘要快取 20 秒（據點分頁每 5 秒重繪，避免反覆解壓 16 格存檔）
let _cbSumCache = { at: 0, m: {} };
function _cbSlotSum(n) {
    let now = Date.now();
    if (now - _cbSumCache.at > 20000) _cbSumCache = { at: now, m: {} };
    if (!(n in _cbSumCache.m)) { let v = null; try { v = (typeof slotSummary === 'function') ? slotSummary(n) : null; } catch (e) {} _cbSumCache.m[n] = v; }
    return _cbSumCache.m[n];
}
// 可派遣角色：其他存檔位、同模式、不在隊伍中、未受僱於他人、非安塔瑞斯助戰者、未在探險中
function cbExpedCandidates() {
    let out = [];
    const lim = (typeof SAVE_SLOT_MAX === 'number' && SAVE_SLOT_MAX > 0) ? SAVE_SLOT_MAX : 16;
    let cur = _cbCurSlot();
    let inParty = new Set(((player && player.allies) || []).filter(Boolean).map(a => String(a._slot)));
    let hired = null; try { if (typeof mercEmploymentMap === 'function') hired = mercEmploymentMap(); } catch (e) {}
    let helpers = []; try { if (typeof antharasHelperSlots === 'function') helpers = antharasHelperSlots(); } catch (e) {}
    for (let n = 1; n <= lim; n++) {
        let s = String(n);
        if (s === cur) continue;
        let sum = _cbSlotSum(n);
        if (!sum || !sum.name) continue;
        let why = '';
        if (!!sum.classic !== !!(player && player.classicMode)) why = '模式不同';
        else if (inParty.has(s)) why = '隊伍中';
        else if (hired && hired[s] && typeof mercSlotHiredByOther === 'function' && mercSlotHiredByOther(s, hired)) why = '受僱中';
        else if (helpers.includes(s)) why = '助戰中';
        else if (cbExpedBusyInfo(s)) why = '探險中';
        out.push({ slot: s, name: sum.name, lv: Math.max(1, Math.floor(Number(sum.lv) || 1)), cls: sum.cls || '', why });
    }
    return out;
}
function _cbMapInfo(v) {
    if (typeof DB === 'undefined' || !DB.maps || !Array.isArray(DB.maps[v])) return null;
    let mobs = DB.maps[v].map(id => DB.mobs && DB.mobs[id] ? { id, m: DB.mobs[id] } : null).filter(x => x && !x.m.boss && !x.m.pledgeEnemy && !x.m.trollPlayer && x.m.race !== '建築');
    if (!mobs.length) return null;
    let avg = mobs.reduce((s, x) => s + (Number(x.m.lv) || 1), 0) / mobs.length;
    let tier = Math.max(1, Math.min(6, Math.ceil(avg / 15)));
    return { v, mobs, avg: Math.round(avg), tier };
}
// 已開放的舊地圖：野外＋地監中可選（未灰階、無任務／鑰匙／友好度門檻）且有一般怪物的地圖
function cbExpedMaps() {
    let list = [];
    try {
        ['wild', 'dungeon'].forEach(cat => {
            ((typeof MAP_CATEGORIES !== 'undefined' && MAP_CATEGORIES[cat]) || []).forEach(m => {
                if (!m || !m.v || m.questReq || m.keyHoldReq || m.needKey || m.affinityReq || m.prideReq) return;
                if (typeof mapOptDisabled === 'function' && mapOptDisabled(m)) return;
                let info = _cbMapInfo(m.v);
                if (!info) return;
                info.name = (typeof mapDisplayName === 'function' ? mapDisplayName(m.v) : '') || m.t || m.v;
                list.push(info);
            });
        });
    } catch (e) {}
    return list;
}
function _cbExpedForbidden(id) {
    if (!id) return true;
    let d = DB.items[id];
    if (!d) return true;
    if (d.trialExclusive || d.legend || d.noDrop) return true;
    if (String(id).indexOf('_naz_') >= 0 || String(id).indexOf('mat_nazarick') === 0 || String(id).indexOf('nazarick') >= 0) return true;
    if (id === 'mat_rift_lock') return true;
    return false;
}
// 收益（以派遣時的 seed 決定，讀檔重領不會重抽）
function cbExpedRewards(e, guildLv) {
    let info = _cbMapInfo(e.map);
    let r = { wood: 0, ore: 0, magic: 0, cards: {}, items: [] };
    if (!info) return r;
    let rng = _cbRng(e.seed || 1);
    let h = Math.max(1, Number(e.hours) || 1), t = info.tier;
    let lvF = Math.max(0.5, Math.min(2, (Number(e.lv) || 1) / 50));
    let g = 1 + Math.max(0, Math.min(CB_MAX_LV, guildLv || 0)) * 0.05;
    let jit = () => 0.85 + rng() * 0.3;
    if (t <= 3) r.wood = Math.round(h * (5 + 3 * t) * lvF * g * jit());
    if (t >= 2) r.ore = Math.round(h * (1.5 + 1.2 * t) * lvF * g * jit());
    if (t >= 4) r.magic = Math.floor(h * 0.12 * (t - 3) * lvF * g * jit() + rng());
    // 卡片：每小時 25% 一張該地圖怪物的一般卡
    let cardMobs = info.mobs.filter(x => typeof cardId === 'function' && DB.items[cardId(x.m.n, 1)]);
    for (let i = 0; i < h; i++) {
        if (rng() < 0.25 && cardMobs.length) { let nm = cardMobs[Math.floor(rng() * cardMobs.length)].m.n; r.cards[nm] = (r.cards[nm] || 0) + 1; }
    }
    // 裝備／遺物：單次判定（遺物權重 ×0.3；排除傳說／試煉事件限定／大墳墓）
    let eqChance = Math.min(0.25, 0.02 * h * t / 3 * g);
    if (rng() < eqChance && typeof MOB_DROPS !== 'undefined') {
        let pool = [], tot = 0;
        info.mobs.forEach(x => (MOB_DROPS[x.m.n] || []).forEach(dr => {
            let id = dr && dr[0], d = DB.items[id];
            if (!d || _cbExpedForbidden(id)) return;
            let isRel = (typeof isRelic === 'function') ? isRelic(d) : !!d.relic;
            if (!(((d.type === 'wpn' && !d.isArrow) || d.type === 'arm' || d.type === 'acc') || isRel)) return;
            let w = Math.max(0.01, Number(dr[1]) || 0.01) * (isRel ? 0.3 : 1);
            pool.push([id, w]); tot += w;
        }));
        if (pool.length) { let x = rng() * tot; for (let k = 0; k < pool.length; k++) { x -= pool[k][1]; if (x <= 0) { r.items.push(pool[k][0]); break; } } if (!r.items.length) r.items.push(pool[pool.length - 1][0]); }
    }
    return r;
}
function cbExpedSend(slot, mapV, hours) {
    let cb = ensureClanBase();
    if (!cb) return false;
    hours = Number(hours);
    if (!CB_EXPED_HOURS.includes(hours)) { logSys('探險時間只能選 1／4／8 小時。'); return false; }
    if ((cb.lv.explore || 0) < 1) { logSys('請先建造探險公會。'); return false; }
    if (cb.exped.length >= cbExpedSlots()) { logSys(`派遣欄已滿（${cbExpedSlots()}）。`); return false; }
    let c = cbExpedCandidates().find(x => x.slot === String(slot));
    if (!c) { logSys('找不到可派遣的角色。'); return false; }
    if (c.why) { logSys(`<span class="text-red-400">${c.name} 無法派遣：${c.why}。</span>`); return false; }
    let m = cbExpedMaps().find(x => x.v === mapV);
    if (!m) { logSys('此地圖目前無法派遣。'); return false; }
    if (m.avg > c.lv + CB_EXPED_MAP_LV_SLACK) { logSys(`<span class="text-red-400">${c.name}（Lv.${c.lv}）等級不足，無法前往 ${m.name}（平均 Lv.${m.avg}）。</span>`); return false; }
    let now = Date.now();
    let e = { id: 'ex' + now.toString(36) + Math.floor(Math.random() * 1e6).toString(36), slot: c.slot, name: c.name, lv: c.lv, cls: c.cls,
              map: m.v, mapName: m.name, tier: m.tier, hours, startAt: now, endAt: now + hours * 3600000, seed: (Math.floor(Math.random() * 4294967295) >>> 0) || 7 };
    cb.exped.push(e);
    let o = _cbBusyLoad(); o[c.slot] = { by: _cbCurSlot(), endAt: e.endAt }; _cbBusySave(o);
    logSys(`<span class="text-amber-300 font-bold">【探險公會】</span>${c.name}（Lv.${c.lv}）出發前往 ${m.name}，${hours} 小時後歸來。`);
    if (typeof saveGame === 'function') saveGame();
    renderClanBaseTab();
    return true;
}
function _cbExpedRelease(e) { let o = _cbBusyLoad(); if (o[e.slot] && String(o[e.slot].by) === _cbCurSlot()) { delete o[e.slot]; _cbBusySave(o); } else if (o[e.slot] && Math.abs((o[e.slot].endAt || 0) - e.endAt) < 1000) { delete o[e.slot]; _cbBusySave(o); } }
function cbExpedRecall(id) {
    let cb = ensureClanBase(); if (!cb) return false;
    let e = cb.exped.find(x => x.id === id); if (!e) return false;
    cb.exped = cb.exped.filter(x => x.id !== id);
    _cbExpedRelease(e);
    logSys(`<span class="text-amber-300 font-bold">【探險公會】</span>已召回 ${e.name}（提前召回沒有收穫）。`);
    if (typeof saveGame === 'function') saveGame();
    renderClanBaseTab();
    return true;
}
function cbExpedClaim(id, silentUi) {
    let cb = ensureClanBase(); if (!cb) return null;
    let e = cb.exped.find(x => x.id === id);
    if (!e || Date.now() < e.endAt) return null;
    let r = cbExpedRewards(e, cb.lv.explore || 0);
    cb.exped = cb.exped.filter(x => x.id !== id);
    _cbExpedRelease(e);
    if (r.wood) cbAddRes('wood', r.wood);
    if (r.ore) cbAddRes('ore', r.ore);
    if (r.magic) cbAddRes('magic', r.magic);
    let parts = [];
    if (r.wood) parts.push(`🪵 木材 ×${r.wood}`);
    if (r.ore) parts.push(`⛏️ 礦石 ×${r.ore}`);
    if (r.magic) parts.push(`💎 魔法石 ×${r.magic}`);
    Object.keys(r.cards).forEach(nm => { try { if (typeof acquireCard === 'function') acquireCard(nm, 1, r.cards[nm]); } catch (er) {} parts.push(`🎴 ${nm} 卡 ×${r.cards[nm]}`); });
    r.items.forEach(id2 => { try { gainItem(id2, 1, true); } catch (er) {} parts.push(`✦ ${DB.items[id2] ? DB.items[id2].n : id2}`); });
    logSys(`<span class="text-amber-300 font-bold">【探險公會】</span>${e.name} 從 ${e.mapName || e.map} 歸來（${e.hours} 小時）：${parts.length ? parts.join('、') : '一無所獲'}`);
    if (!silentUi) { if (typeof saveGame === 'function') saveGame(); renderClanBaseTab(); try { if (typeof renderTabs === 'function') renderTabs(true); } catch (er) {} }
    return r;
}
function cbExpedClaimAll() {
    let cb = ensureClanBase(); if (!cb) return 0;
    let n = 0;
    cb.exped.filter(e => Date.now() >= e.endAt).map(e => e.id).forEach(id => { if (cbExpedClaim(id, true)) n++; });
    if (n) { if (typeof saveGame === 'function') saveGame(); renderClanBaseTab(); try { if (typeof renderTabs === 'function') renderTabs(true); } catch (er) {} }
    return n;
}
function cbExpedReadyCount() { let cb = ensureClanBase(); return cb ? cb.exped.filter(e => Date.now() >= e.endAt).length : 0; }
// 派遣中的角色不可被招募為傭兵
try {
    if (typeof toggleAlly === 'function' && !toggleAlly.__cbExped) {
        const _origToggleAlly = toggleAlly;
        const _wrapped = function (slotN) {
            try {
                let s = String(slotN);
                let active = (typeof isAllyActive === 'function') && isAllyActive(s);
                let busy = !active && cbExpedBusyInfo(s);
                if (busy) {
                    let sum = (typeof slotSummary === 'function') ? slotSummary(s) : null;
                    logSys(`<span class="text-red-400">${sum && sum.name ? sum.name : ('存檔 ' + s)} 正在探險中（${_cbFmtTime(Math.max(0, busy.endAt - Date.now()))} 後歸來），無法招募。</span>`);
                    return;
                }
            } catch (e) {}
            return _origToggleAlly.apply(this, arguments);
        };
        _wrapped.__cbExped = true;
        window.toggleAlly = _wrapped;
    }
} catch (e) {}

// ===================================================================
// 🔮 v3.8.99 魔法塔 + 據點結界
// ===================================================================
const CB_BARRIER_DUR = 30 * 60 * 1000;
const CB_BARRIER_CD = 2 * 3600 * 1000;
const CB_BARRIER_RES = 10;
let _cbLeader = null;
// 隊長解析：傭兵重算時全域 player 暫時換成傭兵——此時改用最近一次「真實玩家」重算時記住的隊長，絕不對傭兵 ensureClanBase
function cbPartyLeader(p) {
    let ally = !!(p && (p._allyName || p._slot)) || (typeof _recomputingAlly !== 'undefined' && _recomputingAlly);
    if (p && !ally) { _cbLeader = p; return p; }
    if (_cbLeader) return _cbLeader;
    return (typeof player !== 'undefined' && player && !player._allyName) ? player : null;
}
function _cbRawLv(p, bid) { return (p && p.clanBase && p.clanBase.lv) ? Math.max(0, Math.min(CB_MAX_LV, Math.floor(Number(p.clanBase.lv[bid]) || 0))) : 0; }
function cbMageLv(p) { return _cbRawLv(cbPartyLeader(p), 'mage'); }
function cbBarrierActive(p, now) { let L = cbPartyLeader(p); return !!(L && L.clanBase && (L.clanBase.barrierUntil || 0) > (now || Date.now())); }
function cbMageApplyRegen(p, d) {
    if (!p || !d) return;
    let lv = cbMageLv(p);
    d.cbMagePct = lv;   // 全隊魔法傷害 +1%/級（js/45 extraMagicCoefMult 消費）
    if (lv > 0 && Number(d.mpR) > 0) d.mpR = Math.round(Number(d.mpR) * (1 + lv * 0.02));
    d.cbBarrier = cbBarrierActive(p);
    if (d.cbBarrier) { d.resFire = (d.resFire || 0) + CB_BARRIER_RES; d.resWater = (d.resWater || 0) + CB_BARRIER_RES; d.resWind = (d.resWind || 0) + CB_BARRIER_RES; d.resEarth = (d.resEarth || 0) + CB_BARRIER_RES; }
}
function cbRecomputeParty() {
    try { if (typeof calcStats === 'function') calcStats(); } catch (e) {}
    try { if (typeof _allyLevelRecompute === 'function') ((player && player.allies) || []).forEach(a => { if (a) _allyLevelRecompute(a); }); } catch (e) {}
}
function cbBarrierCast(auto) {
    let cb = ensureClanBase(); if (!cb) return false;
    let now = Date.now();
    if ((cb.lv.mage || 0) < 10) { if (!auto) logSys('魔法塔 Lv.10 才能施放據點結界。'); return false; }
    if (now < (cb.barrierReadyAt || 0)) { if (!auto) logSys(`據點結界冷卻中（${_cbFmtTime(cb.barrierReadyAt - now)}）。`); return false; }
    if (!player || player.dead) return false;
    cb.barrierUntil = now + CB_BARRIER_DUR;
    cb.barrierReadyAt = now + CB_BARRIER_CD;
    _cbBarrierWasOn = true;
    logSys(`<span class="text-violet-300 font-bold">🔮【據點結界】</span>${auto ? '自動' : ''}展開：30 分鐘內全隊四屬性抗性 +${CB_BARRIER_RES}。`);
    cbRecomputeParty();
    if (!auto && typeof saveGame === 'function') saveGame();
    try { renderClanBaseTab(); } catch (e) {}
    return true;
}
function cbToggleBarrierAuto() { let cb = ensureClanBase(); if (!cb) return; cb.barrierAuto = !cb.barrierAuto; if (typeof saveGame === 'function') saveGame(); renderClanBaseTab(); }
let _cbBarrierWasOn = false;
function cbBarrierTick() {
    let cb = player && player.cls ? ensureClanBase() : null; if (!cb) return;
    let now = Date.now(), on = (cb.barrierUntil || 0) > now;
    if (!on && cb.barrierAuto && (cb.lv.mage || 0) >= 10 && now >= (cb.barrierReadyAt || 0) && typeof state !== 'undefined' && state.running && !player.dead
        && typeof mapState !== 'undefined' && mapState && !String(mapState.current || '').startsWith('town_')) { cbBarrierCast(true); return; }
    if (_cbBarrierWasOn && !on) { cbRecomputeParty(); logSys('<span class="text-slate-400">🔮 據點結界已消失。</span>'); }
    _cbBarrierWasOn = on;
}
function _cbExpedPanelHtml(cb, now) {
    let lv = cb.lv.explore || 0;
    let html = '<div class="cb-sec cb-exp-sec" id="cb-exped-panel"><div class="cb-sec-h">🧭 探險公會' + (lv > 0 ? ' Lv.' + lv : '（未建造）') + '</div>';
    if (lv <= 0) return html + '<div class="cb-sec-note">建造探險公會後即可派遣其他存檔角色外出探險。</div></div>';
    let slots = cbExpedSlots();
    html += '<div class="cb-sec-note">派遣欄 ' + cb.exped.length + '/' + slots + '・收益隨角色等級與地圖階級提升；不會帶回試煉／事件限定道具或大墳墓材料。派遣中的角色無法被招募。</div>';
    cb.exped.forEach(e => {
        let left = Math.max(0, e.endAt - now), total = Math.max(1, e.endAt - e.startAt);
        let pct = Math.min(100, Math.round((1 - left / total) * 100));
        html += '<div class="cb-exp-row"><div class="cb-exp-main"><b>' + e.name + '</b> <span class="cb-exp-dim">Lv.' + e.lv + ' ' + (e.cls || '') + '</span><br>'
            + '<span class="cb-exp-dim">' + (e.mapName || e.map) + '・T' + (e.tier || 1) + '・' + e.hours + ' 小時</span>'
            + (left > 0 ? '<div class="cb-exp-time">剩餘 ' + _cbFmtTime(left) + '</div><div class="cb-prog"><i style="width:' + pct + '%"></i></div>' : '<div class="cb-ok">已歸來</div>')
            + '</div>'
            + (left > 0 ? '<button type="button" class="btn cb-btn cb-btn-dim cb-exp-recall" onclick="if(confirm(\'提前召回不會有任何收穫，確定？\'))cbExpedRecall(\'' + e.id + '\')">召回</button>'
                        : '<button type="button" class="btn cb-btn cb-btn-go cb-exp-claim" onclick="cbExpedClaim(\'' + e.id + '\')">領取</button>')
            + '</div>';
    });
    if (cb.exped.some(e => now >= e.endAt) && cb.exped.length > 1) html += '<button type="button" class="btn cb-btn cb-btn-go cb-exp-claimall" onclick="cbExpedClaimAll()">全部領取</button>';
    if (cb.exped.length < slots) {
        let cands = cbExpedCandidates();
        let maps = cbExpedMaps();
        let ok = cands.filter(c => !c.why);
        html += '<div class="cb-exp-form">';
        if (!ok.length) html += '<div class="cb-warn">沒有可派遣的角色（需其他存檔角色、同模式、且不在隊伍中）。</div>';
        else {
            html += '<select id="cb-exp-char" onchange="cbExpedFormRemember();cbExpedFormRefresh()">' + ok.map(c => '<option value="' + c.slot + '" data-lv="' + c.lv + '">' + c.name + '（Lv.' + c.lv + ' ' + c.cls + '）</option>').join('') + '</select>';
            html += '<select id="cb-exp-map" onchange="cbExpedFormRemember()">' + maps.map(m => '<option value="' + m.v + '" data-avg="' + m.avg + '">' + m.name + '（T' + m.tier + '・平均 Lv.' + m.avg + '）</option>').join('') + '</select>';
            html += '<select id="cb-exp-hours" onchange="cbExpedFormRemember()">' + CB_EXPED_HOURS.map(h => '<option value="' + h + '"' + (h === 4 ? ' selected' : '') + '>' + h + ' 小時</option>').join('') + '</select>';
            html += '<button type="button" class="btn cb-btn cb-btn-go" onclick="cbExpedSendFromForm()">派遣</button>';
        }
        let busy = cands.filter(c => c.why);
        if (busy.length) html += '<div class="cb-exp-dim cb-exp-busy">' + busy.map(c => c.name + '（' + c.why + '）').join('、') + '</div>';
        html += '</div>';
    }
    return html + '</div>';
}
let _cbExpSel = { c: '', m: '', h: '' };
function cbExpedFormRemember() {
    let cs = document.getElementById('cb-exp-char'), ms = document.getElementById('cb-exp-map'), hs = document.getElementById('cb-exp-hours');
    _cbExpSel = { c: cs ? cs.value : '', m: ms ? ms.value : '', h: hs ? hs.value : '' };
}
function _cbExpedFormRestore() {
    let set = (id, v) => { let el = document.getElementById(id); if (el && v && Array.from(el.options).some(o => o.value === v)) el.value = v; };
    set('cb-exp-char', _cbExpSel.c); set('cb-exp-hours', _cbExpSel.h);
    cbExpedFormRefresh();
    let ms = document.getElementById('cb-exp-map');
    if (ms && _cbExpSel.m) { let o = Array.from(ms.options).find(x => x.value === _cbExpSel.m); if (o && !o.disabled) ms.value = _cbExpSel.m; }
}
function cbExpedFormRefresh() {
    let cs = document.getElementById('cb-exp-char'), ms = document.getElementById('cb-exp-map');
    if (!cs || !ms) return;
    let o = cs.options[cs.selectedIndex]; let lv = o ? Number(o.getAttribute('data-lv')) || 1 : 1;
    let firstOk = -1;
    Array.from(ms.options).forEach((op, i) => { let bad = (Number(op.getAttribute('data-avg')) || 1) > lv + CB_EXPED_MAP_LV_SLACK; op.disabled = bad; if (!bad) firstOk = i; });
    if (ms.options[ms.selectedIndex] && ms.options[ms.selectedIndex].disabled && firstOk >= 0) ms.selectedIndex = firstOk;
}
function cbExpedSendFromForm() {
    let cs = document.getElementById('cb-exp-char'), ms = document.getElementById('cb-exp-map'), hs = document.getElementById('cb-exp-hours');
    if (!cs || !ms || !hs) return;
    cbExpedSend(cs.value, ms.value, Number(hs.value));
}
function _cbMagePanelHtml(cb, now) {
    let lv = cb.lv.mage || 0;
    let html = '<div class="cb-sec cb-mage-sec" id="cb-mage-panel"><div class="cb-sec-h">🔮 魔法塔' + (lv > 0 ? ' Lv.' + lv : '（未建造）') + '</div>';
    if (lv <= 0) return html + '<div class="cb-sec-note">建造魔法塔後，全隊魔法傷害與 MP 回復提升。</div></div>';
    html += '<div class="cb-sec-note">全隊（含傭兵）魔法傷害 <b class="cb-mage-v">+' + lv + '%</b>・MP 自然恢復 <b class="cb-mage-v">+' + (lv * 2) + '%</b></div>';
    if (lv < 10) return html + '<div class="cb-exp-dim">Lv.10 解鎖「據點結界」</div></div>';
    let on = (cb.barrierUntil || 0) > now, cd = Math.max(0, (cb.barrierReadyAt || 0) - now);
    html += '<div class="cb-exp-row"><div class="cb-exp-main"><b>🛡️ 據點結界</b> <span class="cb-exp-dim">30 分鐘全隊四屬性抗性 +10・冷卻 2 小時</span><br>'
        + (on ? '<span class="cb-ok">生效中・剩餘 ' + _cbFmtTime(cb.barrierUntil - now) + '</span>' : '')
        + (cd > 0 ? '<span class="cb-exp-dim"> 冷卻 ' + _cbFmtTime(cd) + '</span>' : (on ? '' : '<span class="cb-ok">可施放</span>'))
        + '</div><button type="button" class="btn cb-btn ' + (cd > 0 ? 'cb-btn-dim' : 'cb-btn-go') + ' cb-barrier-btn"' + (cd > 0 ? ' disabled' : ' onclick="cbBarrierCast(false)"') + '>施放</button></div>';
    html += '<label class="cb-check"><input type="checkbox" ' + (cb.barrierAuto ? 'checked' : '') + ' onchange="cbToggleBarrierAuto()"> 自動施放（在野外戰鬥中冷卻結束即施放）</label>';
    return html + '</div>';
}

// ===== 週期刷新 UI 佇列倒數 =====
let _cbUiTimer = null;
function cbEnsureUiTimer() {
    if (_cbUiTimer) return;
    _cbUiTimer = setInterval(() => {
        let panel = document.getElementById('tab-clanbase');
        if (panel && !panel.classList.contains('hidden')) {
            cbTickQueue();
            let _ae = document.activeElement;
            if (!(_ae && _ae.tagName === 'SELECT' && panel.contains(_ae))) renderClanBaseTab();   // 🧭 v3.8.99 操作下拉選單時不重繪（避免選單被關閉）
        } else {
            cbTickQueue();
            cbProduce();
        }
        cbFlushTrainingBank();
        try { cbBarrierTick(); } catch (e) {}
        let cb = ensureClanBase();
        if (cb) cb.lastSeenAt = Date.now();
    }, 5000);
}

// ===== 初始化掛點 =====
function cbOnLoadGame() {
    cbEnsureStyles();
    ensureClanBase();
    cbSettleOffline();
    cbClaimTrainingExp();
    cbEnsureUiTimer();
    setTimeout(cbShowOfflinePopup, 600);
}

// Exports
window.ensureClanBase = ensureClanBase;
window.cbKeepLv = cbKeepLv;
window.cbBldLv = cbBldLv;
window.cbQueueSlots = cbQueueSlots;
window.cbEnsureStyles = cbEnsureStyles;
window.cbTickQueue = cbTickQueue;
window.cbProduce = cbProduce;
window.cbCanAfford = cbCanAfford;
window.cbStartUpgrade = cbStartUpgrade;
window.cbCraft = cbCraft;
window.cbCraftMax = cbCraftMax;
window.cbUsePotion = cbUsePotion;
window.cbSetAutoBuff = cbSetAutoBuff;
window.cbToggleProtect = cbToggleProtect;
window.renderClanBaseTab = renderClanBaseTab;
window.cbOnKill = cbOnKill;
window.cbOnLoadGame = cbOnLoadGame;
window.cbShareTrainingExp = cbShareTrainingExp;
window.cbFlushTrainingBank = cbFlushTrainingBank;
window.cbEnhanceBonusPct = cbEnhanceBonusPct;
window.cbProtectIsOn = cbProtectIsOn;
window.cbConsumeProtect = cbConsumeProtect;
window.cbCastSpdBonus = cbCastSpdBonus;
window.cbApplyCastSpd = cbApplyCastSpd;
window.cbTryWorldTreeRevive = cbTryWorldTreeRevive;
window.cbPhysDmgOutMult = cbPhysDmgOutMult;
window.cbMagicDmgOutMult = cbMagicDmgOutMult;
window.cbPhysTakenMult = cbPhysTakenMult;
window.cbBossDmgMult = cbBossDmgMult;
window.cbHardSkinIgnorePct = cbHardSkinIgnorePct;
window.cbExpMult = cbExpMult;
window.cbDropMult = cbDropMult;
window.cbGoldMult = cbGoldMult;
window.cbOnBossFightEnd = cbOnBossFightEnd;
window.cbCookieTick = cbCookieTick;
window.cbInterruptCookie = cbInterruptCookie;
window.cbControlImmune = cbControlImmune;
window.cbPoisonImmune = cbPoisonImmune;
window.cbAutoBuffTick = cbAutoBuffTick;
window.cbSyncAllyBuffs = cbSyncAllyBuffs;
window.cbAddRes = cbAddRes;
window.cbAddStock = cbAddStock;
window.cbStock = cbStock;
window.CB_RECIPES = CB_RECIPES;
window.CB_BUILDINGS = CB_BUILDINGS;
window.CB_UPGRADE_COST = CB_UPGRADE_COST;
window.CB_CAST_SPD_CAP = CB_CAST_SPD_CAP;
window.cbExpedSlotsFor = cbExpedSlotsFor;
window.cbExpedSlots = cbExpedSlots;
window.cbExpedCandidates = cbExpedCandidates;
window.cbExpedMaps = cbExpedMaps;
window.cbExpedRewards = cbExpedRewards;
window.cbExpedSend = cbExpedSend;
window.cbExpedRecall = cbExpedRecall;
window.cbExpedClaim = cbExpedClaim;
window.cbExpedClaimAll = cbExpedClaimAll;
window.cbExpedReadyCount = cbExpedReadyCount;
window.cbExpedBusyInfo = cbExpedBusyInfo;
window.cbExpedFormRefresh = cbExpedFormRefresh;
window.cbExpedFormRemember = cbExpedFormRemember;
window.cbExpedSendFromForm = cbExpedSendFromForm;
window.cbPartyLeader = cbPartyLeader;
window.cbMageLv = cbMageLv;
window.cbBarrierActive = cbBarrierActive;
window.cbMageApplyRegen = cbMageApplyRegen;
window.cbBarrierCast = cbBarrierCast;
window.cbToggleBarrierAuto = cbToggleBarrierAuto;
window.cbBarrierTick = cbBarrierTick;
window.cbRecomputeParty = cbRecomputeParty;
try {
    if (typeof BUFF_NAMES !== 'undefined') {
        Object.assign(BUFF_NAMES, {
            cb_berserk: '狂戰士烈酒', cb_sage: '賢者墨水', cb_hunter: '獵人秘藥',
            cb_iron: '鐵皮藥膏', cb_mr: '抵魔符水', cb_ele: '元素平衡液',
            cb_bluespd: '藍色蜂蜜', cb_wind: '疾風精靈酒',
            cb_exp: '經驗卷軸液', cb_luck: '幸運金幣糖',
            cb_sunder: '破甲毒油', cb_nazwar: '納薩力克戰意',
            cb_giant: '巨人燉肉', cb_poisonimm: '毒免疫', cb_ctrlimm: '控制免疫'
        });
    }
} catch (e) {}

})();
