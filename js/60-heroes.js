// ===== 🪪 v3.8.130 Account-Party：heroes[]／party／角色池抽卡／稀有度差距 =====
// 設計：account-party-v1 · gacha-star-v1 · fit-analysis。上場＝主角＋≤5 英雄。
// v3.8.130：取消創角等級加速；新帳送英雄招募券（v3.10.0 起 50 張，見 HERO_STARTER_TICKETS）；拉開 N/R/SR/SSR 數值差距。
(function () {
'use strict';

var ACCOUNT_PARTY = window.ACCOUNT_PARTY = window.ACCOUNT_PARTY || {
    enabled: true,
    mercLegacy: false,   // D1：預設關閉跨存檔傭兵路徑（招募 UI 改名冊；舊 allies 數字 _slot 會卸下）
    version: 'd1'
};
var PARTY_HERO_MAX = 5;
window.PARTY_HERO_MAX = PARTY_HERO_MAX;

function apEnabled() {
    return !!(ACCOUNT_PARTY && ACCOUNT_PARTY.enabled && typeof player !== 'undefined' && player && player.cls);
}

// —— 職業模板（gacha-star-v1 §2）——
var HERO_ATTR = {
    knight:   { str: 14, dex: 8,  int: 6,  con: 14, wis: 8,  cha: 10, pri: 'str', sec: 'con' },
    royal:    { str: 8,  dex: 8,  int: 10, con: 10, wis: 10, cha: 16, pri: 'cha', sec: 'wis' },
    elf:      { str: 8,  dex: 16, int: 8,  con: 9,  wis: 10, cha: 9,  pri: 'dex', sec: 'wis' },
    illusion: { str: 6,  dex: 10, int: 15, con: 8,  wis: 12, cha: 11, pri: 'int', sec: 'cha' },
    warrior:  { str: 16, dex: 10, int: 5,  con: 13, wis: 6,  cha: 8,  pri: 'str', sec: 'dex' },
    mage:     { str: 5,  dex: 8,  int: 16, con: 8,  wis: 14, cha: 9,  pri: 'int', sec: 'wis' },
    dark:     { str: 12, dex: 14, int: 8,  con: 10, wis: 8,  cha: 10, pri: 'dex', sec: 'str' },
    dragon:   { str: 15, dex: 8,  int: 8,  con: 14, wis: 9,  cha: 8,  pri: 'str', sec: 'con' }
};
var HERO_GROWTH = {
    knight:   { str: 0.98, dex: 0.45, int: 0.25, con: 0.95, wis: 0.40, cha: 0.35 },
    royal:    { str: 0.45, dex: 0.45, int: 0.55, con: 0.55, wis: 0.60, cha: 1.05 },
    elf:      { str: 0.40, dex: 1.05, int: 0.45, con: 0.50, wis: 0.60, cha: 0.40 },
    illusion: { str: 0.30, dex: 0.55, int: 1.00, con: 0.40, wis: 0.70, cha: 0.65 },
    warrior:  { str: 1.05, dex: 0.70, int: 0.20, con: 0.90, wis: 0.30, cha: 0.35 },
    mage:     { str: 0.20, dex: 0.40, int: 1.05, con: 0.40, wis: 0.90, cha: 0.40 },
    dark:     { str: 0.75, dex: 0.95, int: 0.40, con: 0.55, wis: 0.40, cha: 0.45 },
    dragon:   { str: 1.00, dex: 0.40, int: 0.40, con: 0.95, wis: 0.45, cha: 0.35 }
};
var HERO_AVATAR = {
    knight: { f: '女騎士', m: '男騎士' }, royal: { f: '公主', m: '王子' },
    elf: { f: '女妖精', m: '男妖精' }, illusion: { f: '女幻術士', m: '男幻術士' },
    warrior: { f: '女戰士', m: '男戰士' }, mage: { f: '女法師', m: '男法師' },
    dark: { f: '女黑暗妖精', m: '男黑暗妖精' }, dragon: { f: '女龍騎士', m: '男龍騎士' }
};
var HERO_CLS_LABEL = { knight: '騎士', royal: '王族', elf: '妖精', illusion: '幻術士', warrior: '戰士', mage: '法師', dark: '黑暗妖精', dragon: '龍騎士' };

// —— 稀有度差距（v3.8.130：拉開 N/R/SR/SSR 體感）——
// attrMul／growthMul 乘喺模板基底同每級成長；starPri／starSec 取代舊「主+2／副+1」。
var HERO_RARITY = {
    // ab.20261028q：全部稀有度起手 1★（升星只靠碎片突破）
    N:   { w: 60, star0: 1, talent: 0,  attrMul: 0.80, growthMul: 0.80, starPri: 1.0, starSec: 0.5, frag: 5,  label: 'N',   color: '#94a3b8' },
    R:   { w: 27, star0: 1, talent: 3,  attrMul: 1.00, growthMul: 1.00, starPri: 2.0, starSec: 1.0, frag: 10, label: 'R',   color: '#60a5fa' },
    SR:  { w: 10, star0: 1, talent: 8,  attrMul: 1.22, growthMul: 1.18, starPri: 3.5, starSec: 2.0, frag: 20, label: 'SR',  color: '#c084fc' },
    SSR: { w:  3, star0: 1, talent: 14, attrMul: 1.50, growthMul: 1.40, starPri: 5.5, starSec: 3.0, frag: 30, label: 'SSR', color: '#fbbf24' }
};
var HERO_GACHA_PITY = { sr: 30, ssr: 90 };
var HERO_STARTER_TICKETS = (window.AB_START && window.AB_START.heroTickets != null) ? window.AB_START.heroTickets : 70;   // ab.20261028e：新號 70 英雄券（+30 裝備券＝100 抽）

// 每職業 12 人＝96（GS1→滿池）；全女；skills＝起始可學技能 id；lore＝圖鑑長文；portraitId 新角暫 null
var HERO_DB = {
    hero_aria_knight: { name: '艾麗雅', cls: 'knight', gender: 'f', rarity: 'R', portraitId: 'grok:224d4ea4-af3f-4637-aefe-36d623c16d94.jpg', skills: ['sk_heal1', 'sk_shield', 'sk_reduction_armor'], blurb: '銀甲女騎士，擅長守勢。', lore: '出身亞丁王國邊疆小鎮的平民騎士。為守護說話之島碼頭的商旅，自願加入王室遠征編制。銀甲並非華飾，而是她一寸寸磨亮的誓言。' },
    hero_isolde_knight: { name: '伊索德', cls: 'knight', gender: 'f', rarity: 'SSR', portraitId: 'grok:e18dbcad-27d1-4c51-846e-d06a9d83025f.jpg', skills: ['sk_heal2', 'sk_shield', 'sk_shock_stun', 'sk_counter_barrier'], blurb: '亞丁銀誓團團長。', lore: '被稱為「銀誓」的騎士團長，曾在象牙塔外圍擋下失控的元素潮汐三日三夜。傳說她的盾上刻有亡友之名，每一次格擋都像在替某人續命。宮廷忌憚她的聲望，卻離不開她的盾牆。' },
    hero_cassia_knight: { name: '卡西雅', cls: 'knight', gender: 'f', rarity: 'SR', portraitId: 'grok:6c55098e-8858-4624-aec6-3df8805a65ff.jpg', skills: ['sk_heal1', 'sk_shield2', 'sk_shock_stun', 'sk_solid_shield'], blurb: '盾牆指揮官。', lore: '曾於說話之島防衛戰中以十二人盾牆守住東門缺口。指揮風格冷靜到近乎冷酷，但部下都知道她會把最後一口水留給傷兵。' },
    hero_rheina_knight: { name: '蕾娜', cls: 'knight', gender: 'f', rarity: 'SR', portraitId: 'grok:2045516f-e0db-4ddf-b587-010dd7be2efc.jpg', skills: ['sk_heal1', 'sk_shield', 'sk_shock_stun', 'sk_haste_spell'], blurb: '巡防騎士。', lore: '長年巡邏亞丁與古魯丁之間的商路。不喜歡宮廷宴會，寧可睡在馬廄旁聽風。她認得每一段被盜賊踩過的轍印。' },
    hero_viviane_knight: { name: '薇薇安', cls: 'knight', gender: 'f', rarity: 'SR', portraitId: 'grok:7654367e-b7ea-4d7b-a29d-1e3036156774.jpg', skills: ['sk_heal1', 'sk_shield', 'sk_bless_wpn', 'sk_holy_barrier'], blurb: '聖光守護者。', lore: '幼時在神殿成長，成年後選擇以騎士而非祭司的身分護教。她相信「劍能到達禱詞到達不了的地方」，卻仍在每晚默誦舊日經文。' },
    hero_nora_knight: { name: '諾拉', cls: 'knight', gender: 'f', rarity: 'R', portraitId: 'grok:0326186d-1fa7-497d-96e4-76012b3923a5.jpg', skills: ['sk_heal1', 'sk_shield', 'sk_solid_shield'], blurb: '新人城衛。', lore: '剛從訓練營畢業的城牆守衛。盔甲還有點大，眼神卻已經學會不逃避。夢想是有朝一日站上王城榮譽守衛的班列。' },
    hero_selene_knight: { name: '塞勒涅', cls: 'knight', gender: 'f', rarity: 'R', portraitId: 'grok:a35e00d8-9cec-45c5-90bd-a025fc593144.jpg', skills: ['sk_heal1', 'sk_shield', 'sk_shock_stun', 'sk_energy_sense'], blurb: '夜巡騎士。', lore: '專責夜間巡邏的騎士。習慣在月光下讀敵人的腳步聲，同伴笑她像貓，她只回一句：「貓不會讓人睡不好。」' },
    hero_brigitte_knight: { name: '布麗姬', cls: 'knight', gender: 'f', rarity: 'R', portraitId: 'grok:78fd2174-0da7-4211-84e5-8b12816ff412.jpg', skills: ['sk_heal1', 'sk_shield2', 'sk_counter_barrier'], blurb: '鐵壁女爵。', lore: '貴族出身卻拒絕華麗披風，堅持穿實戰板甲。家族希望她聯姻，她回信只寫：「我的聯姻對象是前線。」' },
    hero_petra_knight: { name: '佩特拉', cls: 'knight', gender: 'f', rarity: 'N', portraitId: 'grok:51efe938-d73a-4baa-8968-ee7a1710f0c0.jpg', skills: ['sk_shock_stun', 'sk_shield', 'sk_heal1'], blurb: '見習盾衛。', lore: '說話之島港口的見習守衛。白天搬貨、晚上練盾，薪水大多拿去修盔甲。她說總有一天要護住整條碼頭。' },
    hero_lena_knight: { name: '蕾娜絲', cls: 'knight', gender: 'f', rarity: 'N', portraitId: 'grok:3bc8ba20-1df0-489e-ac43-5491c20ae6de.jpg', skills: ['sk_heal1', 'sk_shield', 'sk_bless_wpn'], blurb: '村鎮護衛。', lore: '鄉下村莊請來的護衛騎士。對手是野狼與偶爾冒頭的哥布林，但她仍把每一次巡邏當成王城閱兵般認真。' },
    hero_mirae_knight: { name: '米拉艾', cls: 'knight', gender: 'f', rarity: 'N', portraitId: 'grok:d37b7aa4-0098-4287-aac7-92cce8a0e9bc.jpg', skills: ['sk_heal1', 'sk_bless_wpn', 'sk_holy_wpn'], blurb: '誓言見習生。', lore: '在騎士學院墊底畢業的見習生。戰鬥成績普通，但從未放棄任何一次救援任務。教官評語只有四字：「會回來。」' },
    hero_jodie_knight: { name: '喬蒂', cls: 'knight', gender: 'f', rarity: 'N', portraitId: 'grok:b19ff98b-e8e9-4181-9232-dd8707e32c90.jpg', skills: ['sk_heal1', 'sk_shield', 'sk_heal_mid'], blurb: '後勤騎士。', lore: '負責補給線護衛的騎士。不善言辭，卻記得每個隊伍需要的繃帶數量。她覺得「讓人活著回家」也是一種勝利。' },
    hero_celine_royal: { name: '塞琳', cls: 'royal', gender: 'f', rarity: 'R', portraitId: 'grok:0ab1e4d7-58d1-48f9-aeaf-5733ba344e87.jpg', skills: ['sk_heal1', 'sk_royal_precise', 'sk_royal_burnweapon'], blurb: '年輕公主。', lore: '亞丁旁支王族的公主，自幼被教導禮儀多於劍術。離開宮牆後才發現世界比宴會廳廣闊得多，於是把禮儀化作安撫同伴的力量。' },
    hero_aurelia_royal: { name: '奧蕾莉亞', cls: 'royal', gender: 'f', rarity: 'SSR', portraitId: 'grok:2512758b-4724-4fbb-a5df-db616741eac3.jpg', skills: ['sk_heal2', 'sk_royal_precise', 'sk_royal_burnweapon', 'sk_holy_light'], blurb: '血脈繼承者。', lore: '被秘藏於象牙塔側殿的血脈繼承者。宮廷宣稱她「在外遊學」，實則她在收集散落各地的王權殘章。她的微笑能止息爭吵，也能讓對手忘了自己為何拔劍。' },
    hero_lisette_royal: { name: '麗賽特', cls: 'royal', gender: 'f', rarity: 'SR', portraitId: 'grok:4e0ab44d-3d07-44ba-b6f5-44a8a18cd1ff.jpg', skills: ['sk_heal1', 'sk_royal_precise', 'sk_charm'], blurb: '外交使節。', lore: '穿梭於亞丁與精靈使者之間的外交官。從不帶多餘護衛，只帶一柄裝飾劍與滿腹典故。敵人常在談妥條件後才發現自己被說服了。' },
    hero_ophelia_royal: { name: '奧菲莉亞', cls: 'royal', gender: 'f', rarity: 'SR', portraitId: 'grok:a67f401f-3a1e-4959-bbc9-c599e91c9624.jpg', skills: ['sk_heal1', 'sk_royal_precise', 'sk_shield', 'sk_holy_barrier'], blurb: '宮廷指揮。', lore: '曾以一封親筆信調動三支邊防軍化解饑荒暴動。她相信權柄是責任，不是特權，因此拒絕任何只為面子的閱兵。' },
    hero_ysolde_royal: { name: '伊索蒂', cls: 'royal', gender: 'f', rarity: 'SR', portraitId: 'grok:23fe6c04-2c20-4db9-a116-1e892f014f4e.jpg', skills: ['sk_heal1', 'sk_royal_burnweapon', 'sk_holy_dash'], blurb: '戰地公主。', lore: '堅持親赴前線慰問傷兵的公主。禮服下藏著輕甲，發言簡潔有力。士兵們說：「她一到，繃帶都比較聽話。」' },
    hero_rosalie_royal: { name: '羅莎莉', cls: 'royal', gender: 'f', rarity: 'R', portraitId: 'grok:33b5ebaf-44ac-437f-835b-87fb2cbde59b.jpg', skills: ['sk_heal1', 'sk_royal_precise', 'sk_bless_wpn'], blurb: '儀典官。', lore: '負責王城儀典的年輕王族。表面溫柔，實則把每一次儀式都當成情報交換場合。她記得每位賓客的忌諱與偏好。' },
    hero_beatrix_royal: { name: '碧翠絲', cls: 'royal', gender: 'f', rarity: 'R', portraitId: 'grok:a98abb3c-5d8e-4f09-9f20-0c411ebecd08.jpg', skills: ['sk_heal1', 'sk_royal_burnweapon', 'sk_shield', 'sk_shock_stun'], blurb: '王室護衛長。', lore: '雖具王族血脈，卻選擇站在王座外側而非坐上它。護衛時話少刀準；退班後會偷偷去市場買蜂蜜餅。' },
    hero_nadine_royal: { name: '娜汀', cls: 'royal', gender: 'f', rarity: 'R', portraitId: 'grok:27271778-968b-46f9-8642-2a374e6fa14a.jpg', skills: ['sk_heal1', 'sk_royal_precise', 'sk_shield', 'sk_energy_sense'], blurb: '文書公主。', lore: '沉迷檔案室的王族。能從稅冊與軍報拼出整條補給線的漏洞。有人笑她像書蟲，叛軍卻最怕她的筆。' },
    hero_fleur_royal: { name: '芙蕾', cls: 'royal', gender: 'f', rarity: 'N', portraitId: 'grok:917c8784-b228-4d95-9936-9a6656d17c14.jpg', skills: ['sk_heal1', 'sk_royal_precise', 'sk_heal_mid'], blurb: '見習女官。', lore: '剛入宮的見習女官，仍在背誦繁複禮節。第一次出城任務時被風吹亂髮髻，卻笑著說：「這樣比較像人。」' },
    hero_claire_royal: { name: '克萊兒', cls: 'royal', gender: 'f', rarity: 'N', portraitId: 'grok:04f9553a-229d-4449-af55-14e10c4f2518.jpg', skills: ['sk_heal1', 'sk_royal_precise', 'sk_shield', 'sk_antidote'], blurb: '巡訪貴族。', lore: '被派去邊陲巡訪的年輕貴族。起初嫌泥土髒，後來學會在泥地裡向村民鞠躬。她把第一封家書寫得很短：「我還活著，也想讓他們活著。」' },
    hero_elise_royal: { name: '艾莉絲', cls: 'royal', gender: 'f', rarity: 'N', portraitId: 'grok:7dc622f6-3266-4b49-b0d4-fc4d2ee6c24a.jpg', skills: ['sk_heal1', 'sk_royal_burnweapon', 'sk_holy_light'], blurb: '歌詠侍女。', lore: '以歌聲安撫軍心的侍從。戰鬥力普通，卻能在營火旁讓所有人暫時忘記恐懼。她說音樂是最短的和平條約。' },
    hero_margot_royal: { name: '瑪戈', cls: 'royal', gender: 'f', rarity: 'N', portraitId: 'grok:4dc8602e-0943-4c4e-ba5c-dca7f314af0d.jpg', skills: ['sk_heal1', 'sk_royal_burnweapon', 'sk_shield', 'sk_bless_wpn'], blurb: '徽章學徒。', lore: '負責保管家族徽章的學徒。對紋章學近乎執拗，能從敵軍旗幟判斷來歷。夢想是親手設計一面「人人願意守護」的旗。' },
    hero_liria_elf: { name: '莉莉亞', cls: 'elf', gender: 'f', rarity: 'R', portraitId: 'grok:e4731ca2-2b0e-4fef-a408-c3d9cf9fd534.jpg', skills: ['sk_elf_winddash', 'sk_elf_triple', 'sk_shield', 'sk_heal1'], blurb: '森林弓手。', lore: '來自說話之島外圍密林的精靈弓手。箭不虛發不是天賦，而是數十年對著風聲練習的結果。她討厭城市的噪音，卻願意為同伴走進石牆。', elfEle: 'wind' },
    hero_sylwen_elf: { name: '希爾雯', cls: 'elf', gender: 'f', rarity: 'SSR', portraitId: 'grok:8406b2ef-891d-4068-b4de-2cfd17fe0fe6.jpg', skills: ['sk_elf_worldtree', 'sk_elf_triple', 'sk_elf_windshot', 'sk_heal1'], blurb: '世界樹守望者。', lore: '被長老稱為「聽得見樹心」的守望者。她能從葉脈震動預知風暴與獸潮。傳說她曾一箭射斷入侵者的戰旗杆，而未傷一人——因為警告已經足夠。', elfEle: 'wind' },
    hero_faelira_elf: { name: '菲莉拉', cls: 'elf', gender: 'f', rarity: 'SR', portraitId: 'grok:0cb62af4-58b7-4a33-ae8b-4f540905bcbf.jpg', skills: ['sk_elf_firewpn', 'sk_elf_triple', 'sk_firearrow', 'sk_heal1'], blurb: '焰羽遊俠。', lore: '火屬性精靈遊俠，箭簇常帶餘溫。族人一度擔心她失控，直到她用焰箭燒掉瘟疫巢穴而不波及民居。她笑稱自己只是「比較急性子的風」。', elfEle: 'fire' },
    hero_nyssa_elf: { name: '妮莎', cls: 'elf', gender: 'f', rarity: 'SR', portraitId: 'grok:b807502e-d534-47d7-8442-70a2e6a5f94f.jpg', skills: ['sk_elf_watervital', 'sk_elf_triple', 'sk_elf_lifespring', 'sk_heal1'], blurb: '潮聲射手。', lore: '沿岸精靈村落的守護者。箭術與潮汐同拍，敵人常在浪退時才發現腳踝已被箭釘住。她收集貝殼當計數器，每救一人就多一枚。', elfEle: 'water' },
    hero_terrae_elf: { name: '泰菈', cls: 'elf', gender: 'f', rarity: 'SR', portraitId: 'grok:0c9ff774-c1c0-4372-a68b-d51010f861ac.jpg', skills: ['sk_elf_earthguard', 'sk_elf_triple', 'sk_elf_groundtrap', 'sk_heal1'], blurb: '岩根哨兵。', lore: '駐守山地隘口的地屬性精靈。沉默寡言，卻會在石壁上刻下每位過路旅人的名字以示迎送。盜賊最怕她的「歡迎儀式」。', elfEle: 'earth' },
    hero_aelin_elf: { name: '艾琳', cls: 'elf', gender: 'f', rarity: 'R', portraitId: 'grok:550bb957-4815-41b7-a352-16cf50b2bb21.jpg', skills: ['sk_elf_preciseshot', 'sk_elf_triple', 'sk_shield', 'sk_heal1'], blurb: '風語斥候。', lore: '擅長潛行與傳訊的斥候。能用葉哨把情報送到數里之外。她不喜歡戰鬥，但更不喜歡同伴收不到警告。', elfEle: 'wind' },
    hero_pyria_elf: { name: '琵莉雅', cls: 'elf', gender: 'f', rarity: 'R', portraitId: 'grok:d0615527-855a-43ab-85bf-070352931204.jpg', skills: ['sk_elf_dancefire', 'sk_elf_triple', 'sk_firearrow', 'sk_heal1'], blurb: '焚線獵手。', lore: '專精火線封鎖的獵手。會在敵軍退路預燃灌木帶，迫使其進入弓陣。她對「漂亮的火」毫無興趣，只要有效。', elfEle: 'fire' },
    hero_mireille_elf: { name: '米蕾', cls: 'elf', gender: 'f', rarity: 'R', portraitId: 'grok:2fce8a50-49e4-46d1-9f0e-5bf5739494b7.jpg', skills: ['sk_elf_muddywater', 'sk_elf_triple', 'sk_shield', 'sk_heal1'], blurb: '霧澤弓手。', lore: '在霧氣瀰漫的澤地長大。敵人看不清她，她卻能靠水聲定位。營裡流傳：跟米蕾夜行，記得先脫金屬靴。', elfEle: 'water' },
    hero_orla_elf: { name: '歐拉', cls: 'elf', gender: 'f', rarity: 'N', portraitId: 'grok:56028382-8ee1-43c8-95c3-80349c3acd00.jpg', skills: ['sk_elf_earthbless', 'sk_elf_triple', 'sk_shield', 'sk_heal1'], blurb: '苗圃守衛。', lore: '負責守護精靈苗圃的年輕守衛。箭術尚幼，但對每一株幼苗的水分了然於心。她相信長大的樹會記得誰澆過水。', elfEle: 'earth' },
    hero_winda_elf: { name: '溫達', cls: 'elf', gender: 'f', rarity: 'N', portraitId: 'grok:6ee9c0c2-939c-4ac1-9e3d-317eb187a9b6.jpg', skills: ['sk_elf_windshot', 'sk_elf_triple', 'sk_shield', 'sk_heal1'], blurb: '見習風箭。', lore: '剛獲准離開村落的見習弓手。第一次看見人類城鎮時愣了很久，只說：「石頭房子…也會呼吸嗎？」', elfEle: 'wind' },
    hero_saffra_elf: { name: '莎芙拉', cls: 'elf', gender: 'f', rarity: 'N', portraitId: 'grok:b508b793-cf51-4dd6-9edc-bf94eede73f5.jpg', skills: ['sk_elf_attrfire', 'sk_elf_triple', 'sk_firearrow', 'sk_heal1'], blurb: '餘燼學徒。', lore: '火屬性學徒，仍在學習控制火星。曾不慎燒焦自己的弓梢，現在出任務必備兩壺水——一壺給人，一壺給弓。', elfEle: 'fire' },
    hero_lyra_elf: { name: '萊菈', cls: 'elf', gender: 'f', rarity: 'N', portraitId: 'grok:c40b32be-c32f-4f25-8f0c-023af2af7df0.jpg', skills: ['sk_elf_purify', 'sk_elf_triple', 'sk_shield', 'sk_heal1'], blurb: '溪畔哨兵。', lore: '溪邊村落的哨兵。任務多半是驅趕過貪的漁人與迷路的獸。她把每一支回收的箭都刻上記號，說那是「回家的路」。', elfEle: 'water' },
    hero_mira_illusion: { name: '米拉', cls: 'illusion', gender: 'f', rarity: 'R', portraitId: 'grok:df6009de-be77-40f4-aeeb-73a34aa7c42d.jpg', skills: ['sk_illu_mirror', 'sk_illu_insight'], blurb: '鏡之法師。', lore: '象牙塔外圍自學成才的幻術士。擅長用鏡像迷惑盜賊與野獸。她很少直視他人眼睛，不是害羞，而是怕自己不小心「看見太多」。' },
    hero_morgana_illusion: { name: '摩根娜', cls: 'illusion', gender: 'f', rarity: 'SSR', portraitId: 'grok:6b4e592c-2de3-4264-b75f-71fd6d148b89.jpg', skills: ['sk_illu_insight', 'sk_illu_mirror', 'sk_illu_cube_burn'], blurb: '虛像編織者。', lore: '傳說能把整座廢墟織成繁華都城幻景的高手。象牙塔曾邀請她任教，她只留下一句：「真實太貴，我賣不起。」如今她遊走邊境，用幻象替弱者爭取逃跑的時間。' },
    hero_iris_illusion: { name: '伊莉絲', cls: 'illusion', gender: 'f', rarity: 'SR', portraitId: 'grok:2d35676d-bc0c-4fad-a13f-a6cfc166ef5e.jpg', skills: ['sk_illu_cube_burn', 'sk_illu_mirror', 'sk_chill'], blurb: '虹彩術士。', lore: '以色彩層層疊加製造深度錯覺的術士。戰場上敵軍常朝空氣揮刀。她把這稱為「免費的護甲」。' },
    hero_phantom_illusion: { name: '芳騰', cls: 'illusion', gender: 'f', rarity: 'SR', portraitId: 'grok:051a63bf-6135-477b-a5d4-e5d269e6b1bb.jpg', skills: ['sk_illu_cube_burn', 'sk_illu_mirror', 'sk_heal1'], blurb: '洞察者。', lore: '專破幻術的幻術士——聽起來矛盾，卻是她的招牌。她能指出哪一道牆是假的、哪一句謊是真的。傭兵團搶著僱她當「掃雷器」。' },
    hero_zephyra_illusion: { name: '潔菲拉', cls: 'illusion', gender: 'f', rarity: 'SR', portraitId: 'grok:57a4687f-1703-4bdd-85b1-50b5069d3856.jpg', skills: ['sk_illu_mirror', 'sk_illu_insight', 'sk_energy_sense'], blurb: '煙霧舞者。', lore: '把煙與鏡結合的戰鬥舞者。敵人以為抓住她，抓到的往往是殘影。她說跳舞不是為了美，是為了讓刀找不到節奏。' },
    hero_lumen_illusion: { name: '露門', cls: 'illusion', gender: 'f', rarity: 'R', portraitId: 'grok:09d88a59-501d-4329-ac01-fd833129369e.jpg', skills: ['sk_illu_cube_burn', 'sk_illu_insight'], blurb: '光影戲法師。', lore: '街頭出身的戲法師，後來把把戲帶進戰場。會用閃光干擾敵眼，再讓隊友完成致命一擊。她堅持分紅要算「表演費」。' },
    hero_shade_illusion: { name: '謝德', cls: 'illusion', gender: 'f', rarity: 'R', portraitId: 'grok:85a58b71-6ca0-477d-984f-4d26a22e1d4b.jpg', skills: ['sk_illu_insight', 'sk_heal1'], blurb: '影辨術士。', lore: '能分辨真實陰影與偽影的專家。在迷宮與遺跡中極受歡迎。她的筆記密密麻麻，封面卻只寫「別信你的眼睛」。' },
    hero_prism_illusion: { name: '普莉絲', cls: 'illusion', gender: 'f', rarity: 'R', portraitId: 'grok:167ba0f4-1a3e-4367-ae3c-15ad8b170d30.jpg', skills: ['sk_illu_mirror', 'sk_heal1'], blurb: '棱鏡學者。', lore: '象牙塔旁聽生，從未正式註冊。她用自製棱鏡研究光的折射，偶爾把研究成果「借」給需要逃脫的人。' },
    hero_echo_illusion: { name: '艾可', cls: 'illusion', gender: 'f', rarity: 'N', portraitId: 'grok:2ba0173e-251c-4674-871b-1d5ec04a4ce3.jpg', skills: ['sk_illu_mirror', 'sk_illu_cube_burn', 'sk_heal1', 'sk_energy_sense'], blurb: '回聲學徒。', lore: '剛學會製造回聲幻音的學徒。曾把自己嚇哭，現在已能用假腳步聲引開守衛。夢想是開一間「誠實的幻覺劇場」。' },
    hero_veil_illusion: { name: '薇兒', cls: 'illusion', gender: 'f', rarity: 'N', portraitId: 'grok:62599731-1056-4484-9d00-f46f0ef459df.jpg', skills: ['sk_illu_cube_burn', 'sk_chill'], blurb: '面紗術士。', lore: '習慣戴薄紗的新人。紗下不是傷，而是她用來練習「被注視卻不被看穿」的道具。同伴說她說話總像在出謎語。' },
    hero_glint_illusion: { name: '葛琳', cls: 'illusion', gender: 'f', rarity: 'N', portraitId: 'grok:41dfed62-c119-41bd-8458-b76752e97e21.jpg', skills: ['sk_illu_mirror', 'sk_illu_cube_burn'], blurb: '閃片戲法。', lore: '口袋裡永遠有碎鏡片的女孩。戰鬥時撒出一片片反光，爭取三秒混亂。她把這三秒稱為「人生最貴的租金」。' },
    hero_misty_illusion: { name: '蜜絲蒂', cls: 'illusion', gender: 'f', rarity: 'N', portraitId: 'grok:8e4be1e4-4dd4-4c39-afc2-b3c5ed089979.jpg', skills: ['sk_illu_insight', 'sk_illu_mirror', 'sk_chill'], blurb: '薄霧學徒。', lore: '製造薄霧掩護撤退的學徒。攻擊力有限，卻讓無數小隊活著離開森林。她說：「能跑，就是贏。」' },
    hero_brenna_warrior: { name: '布蕾娜', cls: 'warrior', gender: 'f', rarity: 'R', portraitId: 'grok:3a2749ea-6e7b-4b26-b44a-3eb64ca74466.jpg', skills: ['sk_warrior_throwaxe', 'sk_warrior_dualaxe', 'sk_warrior_crush'], blurb: '狂戰士氣質。', lore: '在古魯丁礦區長大的斧戰士。笑聲比斧還響，但從不會對平民揮刀。她相信痛快一戰能解決大部分誤會——其餘的用酒。' },
    hero_skaldi_warrior: { name: '史卡蒂', cls: 'warrior', gender: 'f', rarity: 'SSR', portraitId: 'grok:8fbc1290-100c-4600-8dab-65f0c5f115ad.jpg', skills: ['sk_warrior_dualaxe', 'sk_warrior_crush', 'sk_warrior_berserk'], blurb: '北境斧王。', lore: '北境流傳的斧王之女，一斧能斷開凍土與鎖鏈。拒絕繼承部落王座，理由是「王座坐不住，戰場站得住」。如今她以傭兵身分行走亞丁，尋找值得一戰的對手與值得守護的篝火。' },
    hero_gunda_warrior: { name: '貢妲', cls: 'warrior', gender: 'f', rarity: 'SR', portraitId: 'grok:0877303a-e307-4829-81d8-9a31cae3fcf9.jpg', skills: ['sk_warrior_throwaxe', 'sk_warrior_crush', 'sk_warrior_roar'], blurb: '雙斧先鋒。', lore: '衝鋒時從不回頭看的先鋒。隊長們又愛又怕：她能撕開敵陣，也可能衝太深。她的解決方案是在腰間綁繩——讓隊友能把她拽回來。' },
    hero_ragna_warrior: { name: '菈格納', cls: 'warrior', gender: 'f', rarity: 'SR', portraitId: 'grok:2b8cff91-fa50-4cbc-9f23-89a4b311f743.jpg', skills: ['sk_warrior_dualaxe', 'sk_warrior_armorbody', 'sk_warrior_crush'], blurb: '粉碎者。', lore: '專打盾牆與車陣的重斧手。說話慢，下斧快。她收集斷裂的盾牌碎片當紀念，說那是「對手曾努力過的證明」。' },
    hero_thyra_warrior: { name: '蒂菈', cls: 'warrior', gender: 'f', rarity: 'SR', portraitId: 'grok:9824f6fe-f381-4fdc-89e3-031340fc4230.jpg', skills: ['sk_warrior_throwaxe', 'sk_warrior_endurance', 'sk_warrior_crush'], blurb: '戰嚎指揮者。', lore: '以戰嚎統一節奏的戰士。同伴聽到她的吼聲會不自覺加速揮武器。敵軍則形容那聲音「像山在搬家」。' },
    hero_hilda_warrior: { name: '希爾達', cls: 'warrior', gender: 'f', rarity: 'R', portraitId: 'grok:e39de991-d6f8-413f-a725-a3b1ed17408a.jpg', skills: ['sk_warrior_dualaxe', 'sk_warrior_outlaw', 'sk_warrior_crush'], blurb: '礦區斧衛。', lore: '曾是礦場護衛，習慣在狹窄坑道作戰。因此她的斧法短促有力，擅長近身絞殺。離開礦坑後仍下意識低頭走路。' },
    hero_freya_warrior: { name: '芙蕾雅', cls: 'warrior', gender: 'f', rarity: 'R', portraitId: 'grok:3a64a84a-8768-444b-b266-b176294fc243.jpg', skills: ['sk_warrior_throwaxe', 'sk_warrior_dualaxe', 'sk_warrior_berserk'], blurb: '投斧獵手。', lore: '遠近皆能的投斧手。比賽時從來不准同伴拾回斧頭——「丟出去的，就要有收回來的本事。」' },
    hero_astrid_warrior: { name: '阿絲翠', cls: 'warrior', gender: 'f', rarity: 'R', portraitId: 'grok:5d991a22-a2f0-4954-b417-d96c37df90ed.jpg', skills: ['sk_warrior_crush', 'sk_warrior_roar', 'sk_warrior_armorbody'], blurb: '角鬥學徒。', lore: '從地下角鬥場走出的戰士。規矩意識強得驚人：說好單挑就不群毆。她把這份固執帶進正式軍隊，長官拿她沒辦法。' },
    hero_bertha_warrior: { name: '蓓莎', cls: 'warrior', gender: 'f', rarity: 'N', portraitId: 'grok:76328501-a6e9-43f9-9281-995c6f80983e.jpg', skills: ['sk_warrior_throwaxe', 'sk_warrior_crush'], blurb: '見習斧兵。', lore: '剛摸到第一把真斧的見習兵。揮空的次數比擊中多，但每一次揮空她都笑得很大聲：「至少風被我嚇到了。」' },
    hero_kara_warrior: { name: '卡拉', cls: 'warrior', gender: 'f', rarity: 'N', portraitId: 'grok:c1fdb690-8033-4d93-8b04-c738227a6183.jpg', skills: ['sk_warrior_dualaxe', 'sk_warrior_crush'], blurb: '車隊護衛。', lore: '商隊雇來的護衛。敵人多是盜賊而非魔獸，她照打不誤。薪水結清後會把多的肉乾分給車夫的孩子。' },
    hero_ursa_warrior: { name: '烏爾莎', cls: 'warrior', gender: 'f', rarity: 'N', portraitId: 'grok:b7705b1c-5029-44d3-a9f2-f0b393de0d30.jpg', skills: ['sk_warrior_throwaxe', 'sk_warrior_dualaxe', 'sk_warrior_endurance'], blurb: '熊皮戰士。', lore: '披著舊熊皮斗篷的新人。斗篷是母親留下的，防寒勝於防刃。她說有一天要自己獵一頭——「用力氣，不是用運氣。」' },
    hero_dagna_warrior: { name: '達格娜', cls: 'warrior', gender: 'f', rarity: 'N', portraitId: 'grok:a2d3a40c-e9ff-4466-84a3-d1609497f385.jpg', skills: ['sk_warrior_dualaxe', 'sk_warrior_berserk', 'sk_warrior_roar'], blurb: '木樁練習生。', lore: '軍營裡對木樁練到深夜的練習生。教官說她「木頭都快成精了」。她回：「那木頭成精，我也該出師了。」' },
    hero_serena_mage: { name: '瑟蕾娜', cls: 'mage', gender: 'f', rarity: 'R', portraitId: 'grok:a1933a6d-7c83-4729-bca6-7bf968fbaf44.jpg', skills: ['sk_heal1', 'sk_firearrow', 'sk_fireball', 'sk_shield'], blurb: '火焰法師，語帶嘲諷。', lore: '象牙塔旁聽出身的火焰法師。咒語唸得快，吐槽更快。她燒的是敵陣，不是橋——至少她自己這麼堅持。' },
    hero_circe_mage: { name: '瑟西', cls: 'mage', gender: 'f', rarity: 'SSR', portraitId: 'grok:ef682d03-bbb0-4d31-951b-d346efa77e46.jpg', skills: ['sk_heal1', 'sk_icearrow', 'sk_chill', 'sk_shield'], blurb: '獄炎座主。', lore: '曾在象牙塔內引發「可控的意外」而被暫時除名的火焰座主級人物。她能把火球壓成針、再展開成牆。如今以自由法師身分行走，條件只有一條：別叫她「老師」。' },
    hero_glacia_mage: { name: '格拉西亞', cls: 'mage', gender: 'f', rarity: 'SR', portraitId: 'grok:7c8cf7ca-07e5-4d4a-8309-2ecbd3a38949.jpg', skills: ['sk_heal1', 'sk_fireball', 'sk_blaze', 'sk_shield'], blurb: '寒冰學者。', lore: '把戰場當成實驗室的冰系學者。筆記比法杖重要。她能用寒冰氣息精確凍結敵方弓弦而不傷人——如果她心情好的話。' },
    hero_ignis_mage: { name: '伊格妮絲', cls: 'mage', gender: 'f', rarity: 'SR', portraitId: 'grok:86057201-2cb2-4778-a0b9-9d95bad66ece.jpg', skills: ['sk_heal1', 'sk_icearrow', 'sk_blizzard', 'sk_shield'], blurb: '熾焰砲手。', lore: '專精大範圍燃燒火球的砲手型法師。友善火控極佳，隊友很少被誤傷。她的口頭禪是：「先算距離，再算爆炸。」' },
    hero_nivea_mage: { name: '妮薇雅', cls: 'mage', gender: 'f', rarity: 'SR', portraitId: 'grok:3a25ea1e-fc44-4a44-8e65-b2c448941de1.jpg', skills: ['sk_heal1', 'sk_firearrow', 'sk_fireball_burst', 'sk_shield'], blurb: '霜線控場。', lore: '以冰箭與寒氣劃出敵我分界的控場法師。她討厭無意義的屠殺，更喜歡讓敵人「冷靜一下」。字面意思。' },
    hero_ember_mage: { name: '安柏', cls: 'mage', gender: 'f', rarity: 'R', portraitId: 'grok:f6f349fd-db98-4997-91f2-920daaf6d1cc.jpg', skills: ['sk_heal1', 'sk_icearrow', 'sk_frost_spike', 'sk_shield'], blurb: '餘火術士。', lore: '擅長殘火續燃的術士。第一發火球之後，戰場會餘熱不斷。她說這樣比較省魔力——也比較有儀式感。' },
    hero_crystal_mage: { name: '克莉斯', cls: 'mage', gender: 'f', rarity: 'R', portraitId: 'grok:68cadedd-71cc-4ead-9c20-36fd8c1cc976.jpg', skills: ['sk_heal1', 'sk_fireball', 'sk_fire_storm', 'sk_shield'], blurb: '晶冰術士。', lore: '用冰晶折射視線干擾敵軍的法師。戰鬥風格偏輔助，但被逼急時冰箭一樣不留情。' },
    hero_pyra_mage: { name: '珮菈', cls: 'mage', gender: 'f', rarity: 'R', portraitId: 'grok:3fe370a0-c9b5-4ba3-97d9-9189949e047f.jpg', skills: ['sk_heal1', 'sk_chill', 'sk_ice_spike', 'sk_shield'], blurb: '點火顧問。', lore: '曾幫鐵匠鋪點爐的法師，後來把「點火」技術帶到戰場。她能在潮濕天氣依然點燃火球，鐵匠們尊稱她「天氣剋星」。' },
    hero_sora_mage: { name: '索菈', cls: 'mage', gender: 'f', rarity: 'N', portraitId: 'grok:34f3bf31-c271-4217-bec2-17b6568dc321.jpg', skills: ['sk_heal1', 'sk_firearrow', 'sk_blaze', 'sk_shield'], blurb: '見習火徒。', lore: '剛學會火箭的見習生。練習時燒過三根木樁與自己的袖口。現在袖口都做短一截，美其名為「戰鬥剪裁」。' },
    hero_yuki_mage: { name: '優紀', cls: 'mage', gender: 'f', rarity: 'N', portraitId: 'grok:7a93c906-367a-4ebf-8024-e51929c41efc.jpg', skills: ['sk_heal1', 'sk_icearrow', 'sk_chill', 'sk_heal_mid'], blurb: '見習冰徒。', lore: '冰箭總是偏左兩寸的新人。她認真校正準星，隊友則學會站在她右側。關係意外地和諧。' },
    hero_luna_mage: { name: '露娜', cls: 'mage', gender: 'f', rarity: 'N', portraitId: 'grok:23604303-021c-4c52-b961-dbac2cd015e0.jpg', skills: ['sk_heal1', 'sk_fireball', 'sk_shield', 'sk_energy_sense'], blurb: '夜讀學徒。', lore: '習慣在月光下讀魔法書的學徒。白天容易打瞌睡，夜晚卻特別清醒。隊伍夜戰時她意外地可靠。' },
    hero_hazel_mage: { name: '海柔', cls: 'mage', gender: 'f', rarity: 'N', portraitId: 'grok:40b35a17-dcc7-418b-80ae-439e0c384d67.jpg', skills: ['sk_heal1', 'sk_firearrow', 'sk_fireball', 'sk_heal_mid'], blurb: '藥劑兼職。', lore: '一邊學火系一邊幫藥劑師打雜。能分辨哪些材料遇火會爆炸——這讓她在實驗室活得比預期久。' },
    hero_nyx_dark: { name: '妮克斯', cls: 'dark', gender: 'f', rarity: 'R', portraitId: 'grok:bcc79b1d-e8b6-4a79-a180-5474e6ef8e12.jpg', skills: ['sk_dark_armorbreak', 'sk_dark_double', 'sk_dark_stealth'], blurb: '暗影刺客。', lore: '黑暗妖精社會邊緣的刺客。不對「光明」懷恨，只對「出賣」零容忍。雙刀出鞘前她會先數自己的呼吸——數到穩，再動手。' },
    hero_nocturne_dark: { name: '諾克特', cls: 'dark', gender: 'f', rarity: 'SSR', portraitId: 'grok:b6f06d05-8742-4814-a1e5-b628c0869b12.jpg', skills: ['sk_dark_armorbreak', 'sk_dark_poison', 'sk_dark_double'], blurb: '影之女帝。', lore: '暗精靈氏族幾乎只在耳語中提起的存在。據說她能在無月之夜穿過三重哨線取走一封信而不驚動任何人。她為錢辦事，但從不接「殺孩子」的單——這條底線讓某些雇主很頭痛。' },
    hero_umbra_dark: { name: '安布菈', cls: 'dark', gender: 'f', rarity: 'SR', portraitId: 'grok:8aa45b52-2013-4003-a3f1-8bbcfa10a6f7.jpg', skills: ['sk_dark_double', 'sk_dark_blind', 'sk_dark_fang'], blurb: '破甲專家。', lore: '專精破壞盔甲的暗精靈。她研究鎧甲接縫比研究詩歌認真。敵人倒下前常聽見她輕聲說：「線縫在這。」' },
    hero_ravenna_dark: { name: '菈薇娜', cls: 'dark', gender: 'f', rarity: 'SR', portraitId: 'grok:07580b86-ea6d-4b7a-a1d5-efe08a6f383a.jpg', skills: ['sk_dark_armorbreak', 'sk_dark_double', 'sk_dark_crit'], blurb: '毒刃行者。', lore: '使用淬毒雙刃的行者。毒藥劑量精算到只讓目標失去戰鬥力。她說：「死太快，問不到路。」' },
    hero_sable_dark: { name: '賽博', cls: 'dark', gender: 'f', rarity: 'SR', portraitId: 'grok:7b0a22f7-ee29-41ef-8d3e-bb2dbcbdaf55.jpg', skills: ['sk_dark_poison', 'sk_dark_stealth', 'sk_dark_dodge'], blurb: '盲域刺客。', lore: '擅長致盲與突襲的組合技。戰場上她製造的黑暗只持續數息，卻足夠改寫戰局。同伴形容與她配合像「把燈關掉再打開」。' },
    hero_vespera_dark: { name: '薇絲佩', cls: 'dark', gender: 'f', rarity: 'R', portraitId: 'grok:7bd4b93a-90c8-407c-b65e-92ee67e4e33a.jpg', skills: ['sk_dark_armorbreak', 'sk_dark_shadow', 'sk_dark_double'], blurb: '夜語斥候。', lore: '以耳語傳訊的斥候。能在敵營牆外複述裡面的對話。她收取的報酬常常是情報交換，而非金幣。' },
    hero_kage_dark: { name: '影繪', cls: 'dark', gender: 'f', rarity: 'R', portraitId: 'grok:a2f29a00-39ba-4848-a49d-7444edcbb0ef.jpg', skills: ['sk_dark_double', 'sk_dark_burn', 'sk_dark_fang'], blurb: '雙刀影。', lore: '雙刀流暗精靈，刀法華麗但效率至上。她拒絕「為美而舞刀」的評價：「美是順便的，活著才是主題。」' },
    hero_dusk_dark: { name: '達斯克', cls: 'dark', gender: 'f', rarity: 'R', portraitId: 'grok:44bfba64-84ca-4db5-8205-da4866ca7859.jpg', skills: ['sk_dark_armorbreak', 'sk_dark_double', 'sk_dark_blind'], blurb: '暮色獵手。', lore: '專在黃昏出獵的刺客。她認為那是視線最不可靠的時刻——對敵我皆然，所以她練到自己最可靠。' },
    hero_nori_dark: { name: '諾莉', cls: 'dark', gender: 'f', rarity: 'N', portraitId: 'grok:02f59e8c-bed7-4e84-8327-702950f79f01.jpg', skills: ['sk_dark_poison', 'sk_dark_double', 'sk_dark_crit'], blurb: '見習影徒。', lore: '剛離開氏族訓練場的見習生。潛行時仍會踩到乾枝，但每一次失誤她都記在手背——寫滿了就換另一隻手。' },
    hero_sil_dark: { name: '希爾', cls: 'dark', gender: 'f', rarity: 'N', portraitId: 'grok:444015d9-e93c-46d9-a749-a3b853c4d94c.jpg', skills: ['sk_dark_armorbreak', 'sk_dark_stealth', 'sk_dark_dodge'], blurb: '刀鞘學徒。', lore: '負責保養刀劍多於揮砍的學徒。她能聽出刀刃缺了哪裡的口。教官說：「先聽懂刀，再讓刀聽你。」' },
    hero_mora_dark: { name: '茉菈', cls: 'dark', gender: 'f', rarity: 'N', portraitId: 'grok:ac44246a-e8df-42dc-8173-442c3264c3a4.jpg', skills: ['sk_dark_double', 'sk_dark_fang', 'sk_dark_shadow'], blurb: '盲布練習生。', lore: '練習蒙眼行走的新人。撞牆次數逐年下降，自信逐年上升。她夢想在真正的黑暗裡也不迷路。' },
    hero_pix_dark: { name: '碧克絲', cls: 'dark', gender: 'f', rarity: 'N', portraitId: 'grok:ec8e9c89-f883-49d0-b1a6-f8e424e78695.jpg', skills: ['sk_dark_blind', 'sk_dark_poison', 'sk_dark_armorbreak'], blurb: '信使刺客。', lore: '以送信為主業、自衛為副業的暗精靈。刀很少出鞘，但出鞘的信都送到了。她的座右銘：「信比命輕，承諾比信重。」' },
    hero_draga_dragon: { name: '德拉嘉', cls: 'dragon', gender: 'f', rarity: 'R', portraitId: 'grok:6e489bdc-8245-4232-a3b7-b31016898495.jpg', skills: ['sk_dragon_armor', 'sk_dragon_lavabolt', 'sk_dragon_flameslash'], blurb: '女龍騎士。', lore: '與幼龍訂下契約的女龍騎士。龍還小，脾氣不小；她學會用耐心兌換忠誠。岩浆之箭是她與龍共同呼吸的節奏。' },
    hero_wyrmia_dragon: { name: '薇爾米雅', cls: 'dragon', gender: 'f', rarity: 'SSR', portraitId: 'grok:253cb271-a553-4aea-9cbb-c125ff8b2a09.jpg', skills: ['sk_dragon_armor', 'sk_dragon_flameslash', 'sk_dragon_terror'], blurb: '古龍血承者。', lore: '血管裡流著稀薄古龍血的承約者。不需坐騎也能喚出龍息餘溫。象牙塔與王室都曾試圖收編她，她只問一句：「你們能對龍誠實嗎？」答案不滿意，她便繼續流浪。' },
    hero_ignara_dragon: { name: '伊格納菈', cls: 'dragon', gender: 'f', rarity: 'SR', portraitId: 'grok:cb152a8e-c2f9-4a8f-8ae5-b940cbbc32c5.jpg', skills: ['sk_dragon_armor', 'sk_dragon_terror', 'sk_dragon_lavaspit'], blurb: '焰刃龍騎。', lore: '偏好近身焰刃的龍騎士。坐騎是脾氣暴躁的赤鱗，她卻能在衝鋒中精準換軌。敵軍說她「人龍一體」，她說「只是吵完架還肯一起飛」。' },
    hero_scalea_dragon: { name: '史卡莉亞', cls: 'dragon', gender: 'f', rarity: 'SR', portraitId: 'grok:9b23a19c-a811-404d-a0cf-b0513b0d604d.jpg', skills: ['sk_dragon_armor', 'sk_dragon_lavabolt', 'sk_dragon_bloodlust'], blurb: '鱗甲守護。', lore: '以防禦見長的龍騎士。龍之護鎧在她身上幾乎不斷。她把受傷的同伴扛上龍背的畫面，成了邊軍的流動傳說。' },
    hero_terror_dragon: { name: '泰菈爾', cls: 'dragon', gender: 'f', rarity: 'SR', portraitId: 'grok:b54e3789-96b6-4fc8-84b4-5610fa608670.jpg', skills: ['sk_dragon_armor', 'sk_dragon_guardbreak', 'sk_dragon_flameslash'], blurb: '威壓先驅。', lore: '擅用龍威壓制敵陣士氣的先驅。真正動手之前，對手的膝蓋往往先妥協。她很少濫用這份恐懼，因為「怕太久的人，會做出更可怕的事」。' },
    hero_lava_dragon: { name: '拉瓦', cls: 'dragon', gender: 'f', rarity: 'R', portraitId: 'grok:d10640f3-9989-469d-aad3-5147e5fade90.jpg', skills: ['sk_dragon_armor', 'sk_dragon_slaughter', 'sk_dragon_lavabolt'], blurb: '熔岩射手。', lore: '遠程岩漿箭為主的龍騎。精度驚人，常在敵方法師詠唱到一半時打斷。她的龍討厭下雨，所以她隨身帶防水油布——給龍的。' },
    hero_oryn_dragon: { name: '奧琳', cls: 'dragon', gender: 'f', rarity: 'R', portraitId: 'grok:42c08477-d548-48b3-bf5f-8c4802561b5d.jpg', skills: ['sk_dragon_armor', 'sk_dragon_deadlybody', 'sk_dragon_terror'], blurb: '契約學徒長。', lore: '幫助新人完成初次契約的學徒長。見證過太多失敗與眼淚，因此她對「想騎龍的衝動」格外嚴格，對「想理解龍的心」格外溫柔。' },
    hero_verna_dragon: { name: '薇爾娜', cls: 'dragon', gender: 'f', rarity: 'R', portraitId: 'grok:16ea4f99-9618-436c-8d2e-09c92bc2ac68.jpg', skills: ['sk_dragon_armor', 'sk_dragon_lavabolt', 'sk_dragon_deathlightning'], blurb: '翼下護衛。', lore: '專責在龍翼陰影下保護落地同伴的護衛。空戰不是她的強項，地面救援卻是。龍喜歡她，因為她總帶肉乾。' },
    hero_cinder_dragon: { name: '辛德', cls: 'dragon', gender: 'f', rarity: 'N', portraitId: 'grok:ad64afda-0a59-4803-9da3-10214d9bcfb3.jpg', skills: ['sk_dragon_armor', 'sk_dragon_flameslash', 'sk_dragon_bloodlust'], blurb: '見習龍騎。', lore: '剛通過契約試煉的見習生。起飛時仍會閉眼三秒。她把這三秒寫進日記：「總有一天，睜著眼也能笑。」' },
    hero_ash_dragon: { name: '艾許', cls: 'dragon', gender: 'f', rarity: 'N', portraitId: 'grok:2bffddc7-ac05-4a72-a876-ea1b72fd4cef.jpg', skills: ['sk_dragon_armor', 'sk_dragon_terror', 'sk_dragon_reaper'], blurb: '灰燼飼育員。', lore: '在龍巢負責清理灰燼與餵食的飼育員出身。戰鬥經驗少，卻最懂龍的情緒。隊伍缺她時，龍會故意飛慢。' },
    hero_ridge_dragon: { name: '莉奇', cls: 'dragon', gender: 'f', rarity: 'N', portraitId: 'grok:a4b2222a-3884-4f62-b5bf-1e65e81d8f4a.jpg', skills: ['sk_dragon_armor', 'sk_dragon_lavabolt', 'sk_dragon_guardbreak'], blurb: '山脊巡衛。', lore: '沿著山脊航線巡邏的新人。地圖畫得比槍法好。長官說：「飛得穩比打得準重要——你先活著畫完地圖。」' },
    hero_sol_dragon: { name: '索爾', cls: 'dragon', gender: 'f', rarity: 'N', portraitId: 'grok:bd26eb6d-ea9f-4db0-b51e-59e97277c615.jpg', skills: ['sk_dragon_armor', 'sk_dragon_flameslash', 'sk_dragon_lavaspit'], blurb: '日光練習生。', lore: '喜歡在日出時訓練的練習生。龍威壓還不穩，常常只嚇到自己的坐騎。她與龍約定：嚇到對方就請對方吃一頓——目前她請得比較多。' }
};
window.HERO_DB = HERO_DB;

var STARTER_DEFS = ['hero_aria_knight', 'hero_liria_elf', 'hero_serena_mage', 'hero_brenna_warrior', 'hero_draga_dragon'];

function heroLvCap(star) {
    star = Math.max(0, Math.min(5, Math.floor(Number(star) || 0)));
    // ab.20261028q：起手 1★＝上限 50；每突破 +1★ → +10 上限 → 5★=90
    return 50 + Math.max(0, star - 1) * 10;
}
// 局外永久升星（碎片突破）：費用按「下一星」＋稀有度倍率（同稀有度碎片產量對齊）
// base = 升到 1/2/3/4/5★；mul N0.8／R1／SR1.2／SSR1.5
var HERO_STAR_COST_BASE = [20, 50, 100, 180, 300];
var HERO_STAR_COST_MUL = { N: 0.8, R: 1.0, SR: 1.2, SSR: 1.5 };
function heroStarCost(heroOrRarity, fromStar) {
    var star, rarity;
    if (heroOrRarity && typeof heroOrRarity === 'object') {
        star = Math.max(0, Math.min(5, Math.floor(Number(heroOrRarity.star) || 0)));
        rarity = heroRarityOf(heroOrRarity).label || 'R';
    } else {
        star = Math.max(0, Math.min(5, Math.floor(Number(fromStar) || 0)));
        rarity = String(heroOrRarity || 'R').toUpperCase();
    }
    if (star >= 5) return null;
    var base = HERO_STAR_COST_BASE[star];
    if (base == null) return null;
    var mul = HERO_STAR_COST_MUL[rarity] != null ? HERO_STAR_COST_MUL[rarity] : 1;
    return Math.max(1, Math.round(base * mul));
}
/** 碎片是否夠下一星突破 */
function heroCanBreakthrough(heroOrId) {
    var h = (heroOrId && typeof heroOrId === 'object') ? heroOrId : findHero(heroOrId);
    if (!h) return false;
    var star = Math.max(0, Math.min(5, Math.floor(Number(h.star) || 0)));
    if (star >= 5) return false;
    var cost = heroStarCost(h);
    if (cost == null || cost <= 0) return false;
    return Math.max(0, Math.floor(Number(h.fragments) || 0)) >= cost;
}
/** 消耗該英雄碎片突破 +1 星；成功回 {ok, hero, cost, star}，失敗回 {ok:false, msg} */
function heroBreakthrough(heroId) {
    var h = findHero(heroId);
    if (!h) return { ok: false, msg: '搵唔到英雄' };
    var star = Math.max(0, Math.min(5, Math.floor(Number(h.star) || 0)));
    if (star >= 5) return { ok: false, msg: '已達最高 5★' };
    var cost = heroStarCost(h);
    if (cost == null || cost <= 0) return { ok: false, msg: '無法突破' };
    var fr = Math.max(0, Math.floor(Number(h.fragments) || 0));
    if (fr < cost) return { ok: false, msg: '碎片不足（要 ' + cost + '，而家 ' + fr + '）' };
    h.fragments = fr - cost;
    h.star = star + 1;
    // 等級唔會因升星自動提高，但 cap 會放寬；若之前被 cap 卡住，下次升級可繼續
    try {
        if (typeof logSys === 'function') {
            logSys('<span class="text-amber-300">⭐ 「' + h.name + '」英雄碎片突破 → ' + h.star + '★（消耗英雄碎片 ' + cost + '，剩 ' + h.fragments + '；等級上限 ' + heroLvCap(h.star) + '）' + (h.star >= 3 ? ' · 技能質變已解鎖' : '') + '</span>');
        }
    } catch (e) {}
    try {
        var ally = findAllyByHero(h.id);
        if (ally) {
            // 同步屬性（星加主／副屬）
            var attrs = heroAttrAt(h.cls, h.lv || 1, h.star || 0, heroRarityOf(h));
            if (ally.base) {
                ['str', 'dex', 'int', 'con', 'wis', 'cha'].forEach(function (k) { ally.base[k] = attrs[k]; });
            }
            try { if (typeof _allyLevelRecompute === 'function') _allyLevelRecompute(ally); } catch (e2) {}
            try {
                // 強制用新星重算戰鬥屬性
                var rebuilt = buildHeroCombatant(h);
                if (rebuilt && typeof syncPartyAllies === 'function') syncPartyAllies({ preserveLive: true });
            } catch (e3) {}
        }
    } catch (e4) {}
    try { if (typeof saveGame === 'function') saveGame(); } catch (e5) {}
    return { ok: true, hero: h, cost: cost, star: h.star, lvCap: heroLvCap(h.star) };
}
function heroRarityOf(defOrHero) {
    var r = null;
    if (defOrHero && defOrHero.rarity) r = defOrHero.rarity;
    else if (defOrHero && defOrHero.defId && HERO_DB[defOrHero.defId]) r = HERO_DB[defOrHero.defId].rarity;
    r = String(r || 'R').toUpperCase();
    return HERO_RARITY[r] || HERO_RARITY.R;
}
function heroAttrAt(cls, lv, star, rarity) {
    var base = HERO_ATTR[cls] || HERO_ATTR.knight;
    var g = HERO_GROWTH[cls] || HERO_GROWTH.knight;
    var rr = (typeof rarity === 'string') ? (HERO_RARITY[rarity] || HERO_RARITY.R)
        : (rarity && rarity.attrMul != null ? rarity : HERO_RARITY.R);
    lv = Math.max(1, Math.floor(Number(lv) || 1));
    star = Math.max(0, Math.min(5, Math.floor(Number(star) || 0)));
    var am = Number(rr.attrMul) || 1;
    var gm = Number(rr.growthMul) || 1;
    var sp = Number(rr.starPri) || 2;
    var ss = Number(rr.starSec) || 1;
    var out = {};
    ['str', 'dex', 'int', 'con', 'wis', 'cha'].forEach(function (k) {
        var v = (base[k] || 8) * am + (g[k] || 0.4) * gm * (lv - 1);
        if (k === base.pri) v += star * sp;
        else if (k === base.sec) v += star * ss;
        out[k] = Math.min(150, Math.floor(v));
    });
    return out;
}

function _heroUid() {
    return 'h' + Date.now().toString(36).slice(-4) + Math.floor(Math.random() * 1e4).toString(36);
}

function createHeroFromDef(defId, opts) {
    opts = opts || {};
    var def = HERO_DB[defId];
    if (!def) return null;
    var rr = heroRarityOf(def);
    var star = opts.star != null ? opts.star : (rr.star0 != null ? rr.star0 : 1);
    var lv = Math.max(1, Math.min(heroLvCap(star), Math.floor(Number(opts.lv) || 1)));
    var skills = (def.skills || []).filter(function (sid) { return typeof DB !== 'undefined' && DB.skills && DB.skills[sid]; });
    var talentPts = opts.talentPts != null ? opts.talentPts : (rr.talent != null ? rr.talent : 0);
    return {
        id: opts.id || _heroUid(),
        defId: defId,
        name: def.name,
        cls: def.cls,
        gender: def.gender || 'f',
        rarity: def.rarity || 'R',
        star: star,
        lv: lv,
        exp: 0,
        bonus: lv >= 50 ? (lv - 49) : 0,
        fragments: 0,
        eq: {},
        skills: skills.slice(),
        talents: { pts: talentPts, spent: {}, specialty: null },
        portraitId: def.portraitId || null,
        elfEle: def.elfEle || null,
        locked: false,
        createdAt: Date.now()
    };
}

function findHero(id) {
    if (!player || !Array.isArray(player.heroes) || id == null) return null;
    id = String(id);
    for (var i = 0; i < player.heroes.length; i++) {
        if (player.heroes[i] && String(player.heroes[i].id) === id) return player.heroes[i];
    }
    return null;
}

function findAllyByHero(heroId) {
    if (!player || !Array.isArray(player.allies)) return null;
    heroId = String(heroId);
    for (var i = 0; i < player.allies.length; i++) {
        var a = player.allies[i];
        if (a && String(a._heroId || '') === heroId) return a;
    }
    return null;
}

function emptyEq() {
    return {
        wpn: null, offwpn: null, arrow: null, helm: null, armor: null, shin: null, tshirt: null,
        cloak: null, gloves: null, shield: null, boots: null, belt: null, amulet: null,
        ear1: null, ear2: null, ring1: null, ring2: null, ring3: null, ring4: null, doll: null
    };
}

/** 由名冊英雄建出與 buildAlly 同形狀嘅戰鬥單位。_slot＝heroId（僅 DOM／查找；禁止當 save key）。 */
function buildHeroCombatant(hero) {
    if (!hero || !hero.cls) return null;
    var def = HERO_DB[hero.defId] || {};
    var attrs = heroAttrAt(hero.cls, hero.lv || 1, hero.star || 0, heroRarityOf(hero));
    var avatarMap = HERO_AVATAR[hero.cls] || HERO_AVATAR.knight;
    var ally = {
        cls: hero.cls,
        name: hero.name || def.name || '英雄',
        lv: Math.max(1, Math.floor(Number(hero.lv) || 1)),
        exp: Math.max(0, Math.floor(Number(hero.exp) || 0)),
        bonus: Math.max(0, Math.floor(Number(hero.bonus) || 0)),
        base: attrs,
        alloc: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
        panacea: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
        eq: JSON.parse(JSON.stringify(hero.eq || {})),
        skills: Array.isArray(hero.skills) ? hero.skills.slice() : [],
        talents: hero.talents ? JSON.parse(JSON.stringify(hero.talents)) : { pts: 0, spent: {} },
        buffs: { haste: 0, brave: 0, blue: 0, cautious: 0, elfcookie: 0, poly: 0, shield: 0 },
        statuses: {},
        config: {},
        avatar: avatarMap[hero.gender === 'm' ? 'm' : 'f'],
        portraitId: hero.portraitId || def.portraitId || null,
        elfEle: hero.elfEle || def.elfEle || null,
        alignmentValue: 0,
        classicMode: !!(player && player.classicMode),
        enSeed: 'hero:' + hero.id,
        _mercPermanentPotions: true
    };
    // 補齊 eq 缺鍵
    var eqFull = emptyEq();
    Object.keys(eqFull).forEach(function (k) { if (ally.eq[k] === undefined) ally.eq[k] = null; });
    Object.keys(ally.eq).forEach(function (k) { if (!(k in eqFull) && k.indexOf('rem_') !== 0) {/* keep extras */} });

    ally.summon = null; ally.charmed = null; ally.partners = []; ally.allies = [];
    delete ally.summonsV2; delete ally._summonV2On; delete ally._summonV2Sk;

    var _save = player;
    if (_save) {
        ally.cardDex = _save.cardDex; ally.equipDex = _save.equipDex;
        ally.miscDex = _save.miscDex; ally.cardStars = _save.cardStars;
    }
    player = ally;
    var ok = true;
    if (typeof _recomputingAlly !== 'undefined') _recomputingAlly = true;
    try { recomputeStats(); } catch (e) { ok = false; }
    if (typeof _recomputingAlly !== 'undefined') _recomputingAlly = false;
    delete ally.cardDex; delete ally.equipDex; delete ally.miscDex; delete ally.relicDex; delete ally.cardStars;
    player = _save;
    try { if (typeof calcStats === 'function') calcStats(); } catch (e2) {}
    if (!ok) return null;

    try { if (typeof _applyMercCubeRes === 'function') _applyMercCubeRes(ally); } catch (e3) {}

    ally._heroId = String(hero.id);
    ally._slot = String(hero.id);   // DOM／_findAlly 相容；isNumericSaveSlot 會擋外存檔寫入
    ally._allyName = ally.name;
    ally._isHero = true;
    ally._atkCd = 0;
    ally.curHp = ally.mhp;
    ally.mp = ally.mmp;
    ally._downed = false;
    ally._reviveCd = 0;
    ally._expGained = 0;
    ally._alignmentDelta = 0;
    ally._atkSkill = '';
    ally._healSkill = '';
    ally._convertSkill = '';
    ally._healHpPct = 70;
    {
        var _w = (ally.eq && ally.eq.wpn) ? DB.items[ally.eq.wpn.id] : null;
        ally._rapidfire = (_w && _w.isBow && _w.rapidfire) ? _w.rapidfire : 0;
    }
    // 預設攻擊技：第一個 type:atk 技能
    if (!ally._atkSkill && ally.skills && ally.skills.length) {
        for (var si = 0; si < ally.skills.length; si++) {
            var sd = DB.skills[ally.skills[si]];
            if (sd && sd.type === 'atk') { ally._atkSkill = ally.skills[si]; break; }
        }
    }
    return ally;
}

function isNumericSaveSlot(slot) {
    return /^\d+$/.test(String(slot == null ? '' : slot));
}

function apPersistHeroProgress(ally) {
    if (!ally || !ally._heroId) return;
    var h = findHero(ally._heroId);
    if (!h) return;
    var cap = heroLvCap(h.star);
    var lv = Math.max(1, Math.floor(Number(ally.lv) || 1));
    if (lv > cap) { lv = cap; ally.lv = cap; ally.exp = 0; }
    h.lv = lv;
    h.exp = Math.max(0, Math.floor(Number(ally.exp) || 0));
    h.bonus = Math.max(0, Math.floor(Number(ally.bonus) || 0));
    if (ally.eq) h.eq = JSON.parse(JSON.stringify(ally.eq));
    if (Array.isArray(ally.skills)) h.skills = ally.skills.slice();
    if (ally.talents) h.talents = JSON.parse(JSON.stringify(ally.talents));
    if (ally.elfEle) h.elfEle = ally.elfEle;
    ally._expGained = 0;
    ally._alignmentDelta = 0;
}

function apPersistAllHeroProgress() {
    if (!apEnabled() || !player || !Array.isArray(player.allies)) return;
    player.allies.forEach(function (a) { if (a && a._heroId) apPersistHeroProgress(a); });
}

function partyHeroIds() {
    if (!player) return [null, null, null, null, null];
    if (!player.party || typeof player.party !== 'object') player.party = { heroIds: [null, null, null, null, null] };
    var ids = player.party.heroIds;
    if (!Array.isArray(ids)) ids = [];
    while (ids.length < PARTY_HERO_MAX) ids.push(null);
    if (ids.length > PARTY_HERO_MAX) ids = ids.slice(0, PARTY_HERO_MAX);
    player.party.heroIds = ids;
    return ids;
}

/** 由 party.heroIds 重建 player.allies；preserveLive 保留 HP／CD／倒地。 */
function syncPartyAllies(opts) {
    opts = opts || {};
    if (!apEnabled()) return;
    var ids = partyHeroIds().filter(function (id) { return !!id; });
    var prev = {};
    (player.allies || []).forEach(function (a) {
        if (a && a._heroId) prev[String(a._heroId)] = a;
    });
    // 卸下舊跨存檔傭兵（數字 _slot 且無 _heroId）
    var next = [];
    ids.forEach(function (hid) {
        var hero = findHero(hid);
        if (!hero) return;
        var fresh = buildHeroCombatant(hero);
        if (!fresh) return;
        var old = prev[String(hid)];
        if (opts.preserveLive && old) {
            fresh.curHp = old.curHp != null ? old.curHp : fresh.curHp;
            fresh.mp = old.mp != null ? old.mp : fresh.mp;
            fresh._atkCd = old._atkCd || 0;
            fresh._downed = !!old._downed;
            fresh._reviveCd = old._reviveCd || 0;
            fresh.buffs = old.buffs || fresh.buffs;
            fresh.statuses = old.statuses || {};
            fresh._atkSkill = old._atkSkill != null ? old._atkSkill : fresh._atkSkill;
            fresh._healSkill = old._healSkill != null ? old._healSkill : fresh._healSkill;
            fresh._convertSkill = old._convertSkill != null ? old._convertSkill : fresh._convertSkill;
            fresh._healHpPct = old._healHpPct != null ? old._healHpPct : fresh._healHpPct;
            fresh._potHpPct = old._potHpPct;
            fresh._hpSkillPct = old._hpSkillPct;
            fresh._castMpPct = old._castMpPct;
            fresh._autoBuff = old._autoBuff;
            if (old.curHp != null) fresh.curHp = Math.max(0, Math.min(fresh.curHp, fresh.mhp || 1));
            if (old.mp != null) fresh.mp = Math.max(0, Math.min(fresh.mp, fresh.mmp || 0));
        }
        next.push(fresh);
    });
    player.allies = next;
}

function partySetAt(index, heroId) {
    if (!apEnabled()) return false;
    var ids = partyHeroIds();
    index = Math.floor(Number(index));
    if (index < 0 || index >= PARTY_HERO_MAX) return false;
    if (heroId == null || heroId === '') {
        ids[index] = null;
    } else {
        heroId = String(heroId);
        if (!findHero(heroId)) return false;
        // 已喺其他位 → 先清
        for (var i = 0; i < ids.length; i++) if (String(ids[i]) === heroId) ids[i] = null;
        var filled = ids.filter(Boolean).length;
        if (!ids[index] && filled >= PARTY_HERO_MAX) return false;
        ids[index] = heroId;
    }
    player.party.heroIds = ids;
    syncPartyAllies({ preserveLive: true });
    try { saveGame(); } catch (e) {}
    try { if (typeof updateUI === 'function') updateUI(); } catch (e2) {}
    try { if (typeof renderSquadPanel === 'function') { window._squadSigTeam = ''; window._squadSigSkill = ''; renderSquadPanel(); } } catch (e3) {}
    return true;
}

function partyRemoveHero(heroId) {
    var ids = partyHeroIds();
    heroId = String(heroId);
    var changed = false;
    for (var i = 0; i < ids.length; i++) {
        if (String(ids[i]) === heroId) { ids[i] = null; changed = true; }
    }
    if (!changed) return false;
    player.party.heroIds = ids;
    syncPartyAllies({ preserveLive: true });
    try { saveGame(); } catch (e) {}
    return true;
}

function ensureHeroGacha(p) {
    p = p || player;
    if (!p) return null;
    if (!p.gacha || typeof p.gacha !== 'object') {
        p.gacha = { pool: 'standard', pitySr: 0, pitySsr: 0, tickets: 0, hist: [] };
    }
    if (typeof p.gacha.tickets !== 'number' || p.gacha.tickets < 0) p.gacha.tickets = Math.max(0, Math.floor(Number(p.gacha.tickets) || 0));
    if (typeof p.gacha.pitySr !== 'number') p.gacha.pitySr = 0;
    if (typeof p.gacha.pitySsr !== 'number') p.gacha.pitySsr = 0;
    if (!Array.isArray(p.gacha.hist)) p.gacha.hist = [];
    return p.gacha;
}

/** 新帳／首次開啟 account-party 存檔：送 HERO_STARTER_TICKETS 張「英雄招募券」（角色池專用，唔係公會膠囊券）。 */
function grantStarterPullTickets(p) {
    p = p || player;
    if (!p || !ACCOUNT_PARTY.enabled) return 0;
    if (p._apStarterPullsGranted) return 0;
    var g = ensureHeroGacha(p);
    g.tickets = (g.tickets || 0) + HERO_STARTER_TICKETS;
    // ab.20261028e：一併送 30 張專屬裝備券（70+30＝100 抽）
    if (g.wpnTickets == null) g.wpnTickets = 0;
    g.wpnTickets = (g.wpnTickets || 0) + 30;
    p._apStarterPullsGranted = true;
    p._apExcl100Granted = true;
    try {
        if (typeof logSys === 'function') {
            logSys('<span class="text-amber-300">✦ 新號 100 抽：英雄招募券 ×' + HERO_STARTER_TICKETS + ' ＋ 專屬裝備券 ×30（名冊招募／專屬裝備轉蛋）</span>');
        }
    } catch (e) {}
    return HERO_STARTER_TICKETS;
}

/** 舊版免費 5 人種子：保留函式畀 debug／相容；新帳改送招募券，唔再自動塞英雄。 */
function seedStarterHeroes(p) {
    p = p || player;
    if (!p) return;
    if (!Array.isArray(p.heroes)) p.heroes = [];
    if (p.heroes.length > 0) return;
    var lv = 1;
    var ids = [];
    STARTER_DEFS.forEach(function (defId) {
        var h = createHeroFromDef(defId, { lv: lv, star: 0 });
        if (h) { p.heroes.push(h); ids.push(h.id); }
    });
    while (ids.length < PARTY_HERO_MAX) ids.push(null);
    p.party = { heroIds: ids.slice(0, PARTY_HERO_MAX) };
    p._apStarterSeeded = true;
}

function ensureAccountParty(p) {
    p = p || player;
    if (!p || !p.cls) return;
    if (!Array.isArray(p.heroes)) p.heroes = [];
    if (!p.party || typeof p.party !== 'object') p.party = { heroIds: [null, null, null, null, null] };
    if (!Array.isArray(p.party.heroIds)) p.party.heroIds = [null, null, null, null, null];
    while (p.party.heroIds.length < PARTY_HERO_MAX) p.party.heroIds.push(null);
    p.party.heroIds = p.party.heroIds.slice(0, PARTY_HERO_MAX).map(function (id) {
        if (!id) return null;
        id = String(id);
        for (var i = 0; i < p.heroes.length; i++) if (p.heroes[i] && String(p.heroes[i].id) === id) return id;
        return null;
    });
    // v3.8.130：空名冊唔再送 5 名免費英雄；改送 HERO_STARTER_TICKETS 抽招募券
    ensureHeroGacha(p);
    if (ACCOUNT_PARTY.enabled) grantStarterPullTickets(p);
}

// —— 裝備：只改本帳 hero.eq ↔ 主角 inv ——
function _heroEquipCtx(heroId, notify) {
    if (!apEnabled()) return null;
    if (typeof _allyManagerInTown === 'function' && !_allyManagerInTown()) {
        if (notify) logSys('<span class="text-red-400">隊員裝備只能喺安全區管理。</span>');
        return null;
    }
    var hero = findHero(heroId);
    if (!hero) { if (notify) logSys('<span class="text-red-400">搵唔到呢位英雄。</span>'); return null; }
    var ally = findAllyByHero(heroId);
    if (!ally) {
        // 未上場亦可改裝：臨時建一個
        ally = buildHeroCombatant(hero);
        if (!ally) return null;
    }
    hero.eq = hero.eq || {};
    return { heroId: String(heroId), hero: hero, ally: ally };
}

function _commitHeroEq(ctx) {
    if (!ctx || !ctx.hero || !ctx.ally) return;
    ctx.hero.eq = JSON.parse(JSON.stringify(ctx.ally.eq || {}));
    ctx.hero.skills = Array.isArray(ctx.ally.skills) ? ctx.ally.skills.slice() : (ctx.hero.skills || []);
    // 若喺 party → 重算該戰鬥單位
    var live = findAllyByHero(ctx.heroId);
    if (live) {
        var fresh = buildHeroCombatant(ctx.hero);
        if (fresh) {
            fresh.curHp = Math.min(live.curHp != null ? live.curHp : fresh.mhp, fresh.mhp || 1);
            fresh.mp = Math.min(live.mp != null ? live.mp : fresh.mmp, fresh.mmp || 0);
            fresh._atkSkill = live._atkSkill; fresh._healSkill = live._healSkill;
            fresh._convertSkill = live._convertSkill; fresh._autoBuff = live._autoBuff;
            fresh._healHpPct = live._healHpPct; fresh._potHpPct = live._potHpPct;
            fresh._hpSkillPct = live._hpSkillPct; fresh._castMpPct = live._castMpPct;
            fresh._downed = live._downed; fresh._reviveCd = live._reviveCd;
            var idx = player.allies.indexOf(live);
            if (idx >= 0) player.allies[idx] = fresh;
            ctx.ally = fresh;
        }
    }
    try { saveGame(); } catch (e) {}
    try { if (typeof calcStats === 'function') calcStats(); } catch (e2) {}
    try { if (typeof updateUI === 'function') updateUI(); } catch (e3) {}
}

function heroEquipItem(heroId, encodedUid) {
    var ctx = _heroEquipCtx(heroId, true);
    if (!ctx) return;
    var leader = player, leaderBefore = (typeof _allyCloneInventory === 'function') ? _allyCloneInventory(leader.inv) : JSON.parse(JSON.stringify(leader.inv || []));
    var leaderChanged = false;
    var itemUid = decodeURIComponent(String(encodedUid || ''));
    var source = ctx.ally;
    if (!source.inv) source.inv = [];
    var snapshot = (typeof _allySnapshotEquipment === 'function') ? _allySnapshotEquipment(source) : { inv: [], eq: JSON.parse(JSON.stringify(source.eq || {})) };
    try {
        if (typeof _withAllyEquipmentContext !== 'function') throw new Error('no ctx');
        _withAllyEquipmentContext(source, function () {
            var item = (leader.inv || []).find(function (i) { return i && String(i.uid) === itemUid; });
            if (!item) { logSys('<span class="text-slate-400">該物品已不在隊長背包中。</span>'); return; }
            var def = DB.items[item.id];
            if (!def) { logSys('<span class="text-red-400">找不到該物品資料。</span>'); return; }
            if (typeof _allyCanEquipLeaderItem === 'function' && !_allyCanEquipLeaderItem(source, item)) {
                logSys('<span class="text-slate-400">呢位英雄無法穿戴該裝備。</span>'); return;
            }
            var count = def.isArrow ? Math.max(1, Math.floor(item.cnt || 1)) : 1;
            var token = 'hero-transfer-' + (typeof uid === 'function' ? uid() : String(Date.now()));
            var transfer = Object.assign({}, item, { cnt: count, uid: (typeof uid === 'function' ? uid() : 'u' + Date.now()), _allyTransferToken: token });
            var beforeEquip = (typeof _allyEquippedEntries === 'function') ? _allyEquippedEntries(source.eq) : [];
            if (def.isArrow && source.eq.arrow && source.eq.arrow.id !== 'wpn_shaha_arrow') {
                source.inv.push(source.eq.arrow); source.eq.arrow = null;
            }
            source.inv.push(transfer);
            equipItem(transfer);
            var equipped = Object.values(source.eq || {}).find(function (now) { return now && now._allyTransferToken === token; });
            if (!equipped) {
                if (typeof _allyRestoreEquipment === 'function') _allyRestoreEquipment(source, snapshot);
                return;
            }
            delete equipped._allyTransferToken;
            if (typeof _allyConsumeLeaderItem === 'function' && !_allyConsumeLeaderItem(leader, item, count)) throw new Error('leader item missing');
            if (typeof _allyReturnDisplacedEquipment === 'function' && !_allyReturnDisplacedEquipment(source, leader, beforeEquip)) throw new Error('displaced');
            leaderChanged = true;
        });
    } catch (e) {
        if (typeof _allyRestoreEquipment === 'function') _allyRestoreEquipment(source, snapshot);
        leader.inv = leaderBefore; leaderChanged = false;
        logSys('<span class="text-red-400">裝備轉移失敗，已還原。</span>');
        return;
    }
    if (!leaderChanged) return;
    source.inv = []; // 英雄唔留獨立背包
    _commitHeroEq(ctx);
    logSys('<span class="text-emerald-300">已為 ' + (ctx.hero.name || '英雄') + ' 穿戴裝備。</span>');
    if (typeof openHeroEquipmentManager === 'function') openHeroEquipmentManager(heroId);
}

function heroUnequipItem(heroId, slot) {
    var ctx = _heroEquipCtx(heroId, true);
    if (!ctx) return;
    var leader = player, leaderBefore = (typeof _allyCloneInventory === 'function') ? _allyCloneInventory(leader.inv) : JSON.parse(JSON.stringify(leader.inv || []));
    var source = ctx.ally;
    if (!source.inv) source.inv = [];
    var snapshot = (typeof _allySnapshotEquipment === 'function') ? _allySnapshotEquipment(source) : { inv: [], eq: JSON.parse(JSON.stringify(source.eq || {})) };
    var beforeEquip = (typeof _allyEquippedEntries === 'function') ? _allyEquippedEntries(source.eq) : [];
    var ok = false;
    try {
        _withAllyEquipmentContext(source, function () {
            if (!source.eq[slot]) { logSys('<span class="text-slate-400">該欄位沒有裝備。</span>'); return; }
            unequipItem(slot);
            if (typeof _allyReturnDisplacedEquipment === 'function' && !_allyReturnDisplacedEquipment(source, leader, beforeEquip)) throw new Error('displaced');
            ok = true;
        });
    } catch (e) {
        if (typeof _allyRestoreEquipment === 'function') _allyRestoreEquipment(source, snapshot);
        leader.inv = leaderBefore;
        logSys('<span class="text-red-400">卸下失敗，已還原。</span>');
        return;
    }
    if (!ok) return;
    source.inv = [];
    _commitHeroEq(ctx);
    if (typeof openHeroEquipmentManager === 'function') openHeroEquipmentManager(heroId);
}

/** 餵技能書畀英雄（消耗主角背包書；已學→殘頁）。 */
function heroFeedSkillbook(heroId, itemUid) {
    var ctx = _heroEquipCtx(heroId, true);
    if (!ctx) return false;
    var hero = ctx.hero, ally = ctx.ally;
    var item = (player.inv || []).find(function (i) { return i && String(i.uid) === String(itemUid); });
    if (!item) { logSys('<span class="text-slate-400">背包搵唔到呢本書。</span>'); return false; }
    var def = DB.items[item.id];
    if (!def || def.type !== 'skillbk' || !def.sk) { logSys('<span class="text-slate-400">呢樣唔係技能書。</span>'); return false; }
    var sd = DB.skills[def.sk];
    if (!sd) return false;
    // 臨時以英雄身份檢查職業／等級
    var live = player;
    var can = false, reason = '';
    try {
        player = ally;
        var reqLv = (typeof skillReqLv === 'function') ? skillReqLv(sd, def.sk) : undefined;
        if (reqLv === undefined) reason = '職業無法學習「' + sd.n + '」。';
        else if ((ally.lv || 1) < reqLv) reason = '等級不足（需 Lv.' + reqLv + '）。';
        else if (sd.reqEle && ally.cls !== 'elf' && ally.elfEle !== sd.reqEle) reason = '屬性不符。';
        else if (sd.reqEleAny && !ally.elfEle) reason = '尚未選擇屬性。';
        else can = true;
    } finally { player = live; }
    if (!can) { logSys('<span class="text-red-400">' + reason + '</span>'); return false; }

    if (!Array.isArray(hero.skills)) hero.skills = [];
    if (hero.skills.indexOf(def.sk) >= 0) {
        // 已學→殘頁
        if (typeof consume === 'function') {
            player = live;
            // consume 期望當前 player；手動扣
        }
        var idx = player.inv.indexOf(item);
        if (idx < 0) idx = player.inv.findIndex(function (r) { return r && String(r.uid) === String(item.uid); });
        if (idx >= 0) {
            var ent = player.inv[idx], c = Math.max(1, Math.floor(ent.cnt || 1));
            if (c <= 1) player.inv.splice(idx, 1); else ent.cnt = c - 1;
        }
        var frag = 1;
        if (def.mallExclusive && (def.p || 0) >= 50000) frag = 5;
        else if (def.mallExclusive && (def.p || 0) >= 10000) frag = 3;
        if (typeof gainItem === 'function') gainItem('mg_book_frag', frag, true, true);
        logSys('<span class="text-amber-300">' + hero.name + ' 已學過「' + sd.n + '」，轉為技能書殘頁 ×' + frag + '。</span>');
    } else {
        hero.skills.push(def.sk);
        var idx2 = player.inv.findIndex(function (r) { return r && String(r.uid) === String(item.uid); });
        if (idx2 >= 0) {
            var ent2 = player.inv[idx2], c2 = Math.max(1, Math.floor(ent2.cnt || 1));
            if (c2 <= 1) player.inv.splice(idx2, 1); else ent2.cnt = c2 - 1;
        }
        logSys('<span class="text-cyan-300">' + hero.name + ' 學會咗「' + sd.n + '」！</span>');
    }
    ally.skills = hero.skills.slice();
    _commitHeroEq(ctx);
    return true;
}

function grantHeroByDef(defId, opts) {
    if (!apEnabled()) return null;
    ensureAccountParty(player);
    var h = createHeroFromDef(defId, opts || {});
    if (!h) return null;
    var def = HERO_DB[defId] || {};
    var rr = heroRarityOf(def);
    var fragGain = rr.frag != null ? rr.frag : 10;
    var dup = player.heroes.find(function (x) { return x && x.defId === defId; });
    if (dup) {
        dup.fragments = (dup.fragments || 0) + fragGain;
        logSys('<span class="text-amber-300">重複英雄「' + dup.name + '」→ 英雄碎片 +' + fragGain + '（而家 ' + dup.fragments + '）。唔會變成專武碎片。</span>');
        try { saveGame(); } catch (e) {}
        return { hero: dup, duplicate: true, fragments: fragGain };
    }
    player.heroes.push(h);
    logSys('<span class="text-emerald-300">獲得英雄：' + h.name + '（' + (rr.label || def.rarity || '?') + '・' + (HERO_CLS_LABEL[h.cls] || h.cls) + '）</span>');
    try { saveGame(); } catch (e2) {}
    return { hero: h, duplicate: false, fragments: 0 };
}

function heroPoolByRarity(rarity) {
    var out = [];
    Object.keys(HERO_DB).forEach(function (id) {
        var d = HERO_DB[id];
        if (d && String(d.rarity || '').toUpperCase() === String(rarity).toUpperCase()) out.push(id);
    });
    return out;
}

function heroRollRarity(g) {
    g = g || ensureHeroGacha(player);
    var pitySr = (g.pitySr || 0) + 1;
    var pitySsr = (g.pitySsr || 0) + 1;
    if (pitySsr >= HERO_GACHA_PITY.ssr) return 'SSR';
    if (pitySr >= HERO_GACHA_PITY.sr) {
        // 強制 SR+：按 SR/SSR 相對權重
        var wSr = HERO_RARITY.SR.w, wSsr = HERO_RARITY.SSR.w;
        return (Math.random() * (wSr + wSsr) < wSsr) ? 'SSR' : 'SR';
    }
    var total = HERO_RARITY.N.w + HERO_RARITY.R.w + HERO_RARITY.SR.w + HERO_RARITY.SSR.w;
    var roll = Math.random() * total;
    if (roll < HERO_RARITY.SSR.w) return 'SSR';
    roll -= HERO_RARITY.SSR.w;
    if (roll < HERO_RARITY.SR.w) return 'SR';
    roll -= HERO_RARITY.SR.w;
    if (roll < HERO_RARITY.R.w) return 'R';
    return 'N';
}

function heroBumpPity(g, rarity) {
    if (rarity === 'SSR') { g.pitySr = 0; g.pitySsr = 0; }
    else if (rarity === 'SR') { g.pitySr = 0; g.pitySsr = (g.pitySsr || 0) + 1; }
    else { g.pitySr = (g.pitySr || 0) + 1; g.pitySsr = (g.pitySsr || 0) + 1; }
}

/** 消耗 1 張英雄招募券抽 1 次。回傳 {ok, msg, rarity, defId, result} */
function heroGachaPullOne() {
    if (!apEnabled()) return { ok: false, msg: '帳號組隊模式未啟用。' };
    ensureAccountParty(player);
    var g = ensureHeroGacha(player);
    if ((g.tickets || 0) < 1) return { ok: false, msg: '英雄招募券不足（持有 ' + (g.tickets || 0) + '）。' };
    g.tickets -= 1;
    var rarity = heroRollRarity(g);
    heroBumpPity(g, rarity);
    var pool = heroPoolByRarity(rarity);
    var _wl = (window.AB_WL && Array.isArray(window.AB_WL.heroes)) ? window.AB_WL.heroes : null;
    if (_wl) pool = pool.filter(function (d) { return _wl.indexOf(d) >= 0; });
    if (!pool.length && _wl) { var _r = ['SSR','SR','R','N']; for (var _i = 0; _i < _r.length && !pool.length; _i++) { pool = heroPoolByRarity(_r[_i]).filter(function (d) { return _wl.indexOf(d) >= 0; }); if (pool.length) rarity = _r[_i]; } }
    if (!pool.length) {
        // 極端：該稀有度空池 → 降到 R
        rarity = 'R';
        pool = heroPoolByRarity('R');
    }
    var defId = pool[Math.floor(Math.random() * pool.length)];
    var got = grantHeroByDef(defId, {});
    var entry = {
        at: Date.now(),
        defId: defId,
        rarity: rarity,
        name: (HERO_DB[defId] && HERO_DB[defId].name) || defId,
        duplicate: !!(got && got.duplicate),
        fragments: got && got.fragments || 0
    };
    g.hist = (g.hist || []).concat([entry]).slice(-80);
    try { saveGame(); } catch (e) {}
    return { ok: true, rarity: rarity, defId: defId, result: got, entry: entry, tickets: g.tickets };
}

function heroGachaPullMany(n) {
    n = Math.max(1, Math.min(100, Math.floor(Number(n) || 1)));
    var out = [];
    for (var i = 0; i < n; i++) {
        var r = heroGachaPullOne();
        out.push(r);
        if (!r.ok) break;
    }
    return out;
}

function heroGachaTickets() {
    try {
        if (!player) return 0;
        ensureHeroGacha(player);
        return player.gacha.tickets || 0;
    } catch (e) { return 0; }
}

// —— 猴子補丁：上限／身份／經驗／刷新／招募 ——
function apInstallPatches() {
    if (typeof allyActiveCap === 'function') {
        var _cap = allyActiveCap;
        window.allyActiveCap = allyActiveCap = function () {
            if (apEnabled()) return PARTY_HERO_MAX;
            return _cap.apply(this, arguments);
        };
    }
    if (typeof tlIsParty === 'function') {
        var _tl = tlIsParty;
        window.tlIsParty = tlIsParty = function (who) {
            if (typeof player === 'undefined' || !who) return false;
            if (who === player) return true;
            if (who._heroId != null && Array.isArray(player.allies) && player.allies.indexOf(who) >= 0) return true;
            return _tl(who);
        };
    }
    if (typeof _settleAllyExp === 'function') {
        var _se = _settleAllyExp;
        window._settleAllyExp = _settleAllyExp = function (ally, reason) {
            if (ally && ally._heroId) {
                apPersistHeroProgress(ally);
                return ally._allyName ? ('<span class="text-emerald-300">' + ally._allyName + ' 進度已寫回本帳名冊。</span>') : '';
            }
            // 舊跨存檔傭兵：仍走帳本（遷移／解散）；英雄唔入此外路徑
            return _se(ally, reason);
        };
    }
    if (typeof _settleAllyExpDirect === 'function') {
        var _sed = _settleAllyExpDirect;
        window._settleAllyExpDirect = _settleAllyExpDirect = function (ally, reason) {
            if (ally && ally._heroId) {
                apPersistHeroProgress(ally);
                return '';
            }
            return _sed(ally, reason);
        };
    }
    if (typeof refreshAllyOnce === 'function') {
        var _ra = refreshAllyOnce;
        window.refreshAllyOnce = refreshAllyOnce = function (slotN) {
            slotN = String(slotN);
            if (apEnabled() && !isNumericSaveSlot(slotN)) {
                var ally = (player.allies || []).find(function (a) { return a && String(a._slot) === slotN; });
                if (ally && ally._heroId) {
                    apPersistHeroProgress(ally);
                    var fresh = buildHeroCombatant(findHero(ally._heroId));
                    if (!fresh) {
                        player.allies = (player.allies || []).filter(function (a) { return a !== ally; });
                        return { kind: 'dismiss', msg: '' };
                    }
                    fresh.curHp = Math.min(ally.curHp != null ? ally.curHp : fresh.mhp, fresh.mhp);
                    fresh.mp = Math.min(ally.mp != null ? ally.mp : fresh.mmp, fresh.mmp);
                    fresh._atkSkill = ally._atkSkill; fresh._healSkill = ally._healSkill;
                    fresh._convertSkill = ally._convertSkill; fresh._autoBuff = ally._autoBuff;
                    var idx = player.allies.indexOf(ally);
                    if (idx >= 0) player.allies[idx] = fresh;
                    return { kind: 'refresh', msg: '' };
                }
            }
            if (apEnabled() && ACCOUNT_PARTY && !ACCOUNT_PARTY.mercLegacy && isNumericSaveSlot(slotN)) {
                // 舊數字槽：卸下
                var cur = (player.allies || []).find(function (a) { return a && String(a._slot) === slotN && !a._heroId; });
                if (cur) {
                    player.allies = player.allies.filter(function (a) { return a !== cur; });
                    return { kind: 'dismiss', msg: '<span class="text-amber-300">舊版跨存檔傭兵已卸下（帳號組隊模式）。</span>' };
                }
            }
            return _ra(slotN);
        };
    }
    if (typeof refreshAllAllies === 'function') {
        var _raa = refreshAllAllies;
        window.refreshAllAllies = refreshAllAllies = function () {
            if (apEnabled()) {
                try {
                    apPersistAllHeroProgress();
                    // 卸舊數字傭兵
                    if (ACCOUNT_PARTY && !ACCOUNT_PARTY.mercLegacy) {
                        player.allies = (player.allies || []).filter(function (a) { return a && a._heroId; });
                    }
                    syncPartyAllies({ preserveLive: true });
                    try { saveGame(); } catch (e) {}
                    return (player.allies || []).length;
                } catch (e2) { return 0; }
            }
            return _raa.apply(this, arguments);
        };
    }
    if (typeof toggleAlly === 'function') {
        var _ta = toggleAlly;
        window.toggleAlly = toggleAlly = function (slotN) {
            if (apEnabled() && ACCOUNT_PARTY && !ACCOUNT_PARTY.mercLegacy) {
                logSys('<span class="text-amber-300">帳號組隊模式：請用「名冊編隊」上陣英雄，唔再招募其他存檔。</span>');
                return;
            }
            return _ta(slotN);
        };
    }
    if (typeof _allyManagerSource === 'function') {
        var _ams = _allyManagerSource;
        window._allyManagerSource = _allyManagerSource = function (slotN, notify) {
            slotN = String(slotN);
            if (apEnabled() && !isNumericSaveSlot(slotN)) {
                // 英雄路徑：唔讀外存檔
                if (typeof _allyManagerInTown === 'function' && !_allyManagerInTown()) {
                    if (notify) logSys('<span class="text-red-400">隊員裝備與任務只能在安全區管理。</span>');
                    return null;
                }
                var ally = (player.allies || []).find(function (a) { return a && String(a._slot) === slotN; });
                var hero = ally && ally._heroId ? findHero(ally._heroId) : findHero(slotN);
                if (!hero) { if (notify) logSys('<span class="text-red-400">該英雄不在名冊。</span>'); return null; }
                if (!ally) ally = buildHeroCombatant(hero);
                // 假造 source＝hero 自己（eq），doc 唔寫外檔
                return { slotN: slotN, ally: ally, doc: null, source: hero, _isHero: true };
            }
            if (apEnabled() && ACCOUNT_PARTY && !ACCOUNT_PARTY.mercLegacy && isNumericSaveSlot(slotN)) {
                if (notify) logSys('<span class="text-amber-300">帳號組隊模式唔再管理外存檔裝備。</span>');
                return null;
            }
            return _ams(slotN, notify);
        };
    }
    if (typeof _saveManagedAllyEquipment === 'function') {
        var _smae = _saveManagedAllyEquipment;
        window._saveManagedAllyEquipment = _saveManagedAllyEquipment = function (slotN, mutate) {
            slotN = String(slotN);
            if (apEnabled() && !isNumericSaveSlot(slotN)) {
                var ctx = _heroEquipCtx(slotN, true);
                if (!ctx) return false;
                var before = JSON.stringify(ctx.ally.eq || {});
                try {
                    if (!ctx.ally.inv) ctx.ally.inv = [];
                    _withAllyEquipmentContext(ctx.ally, function () { mutate(ctx.ally); });
                } catch (e) {
                    logSys('<span class="text-red-400">隊員裝備操作失敗。</span>');
                    return false;
                }
                if (before === JSON.stringify(ctx.ally.eq || {})) return false;
                ctx.ally.inv = [];
                _commitHeroEq(ctx);
                return true;
            }
            return _smae(slotN, mutate);
        };
    }
    if (typeof saveGame === 'function') {
        var _sg = saveGame;
        window.saveGame = saveGame = function () {
            try { if (apEnabled()) apPersistAllHeroProgress(); } catch (e) {}
            return _sg.apply(this, arguments);
        };
    }
    if (typeof loadGame === 'function') {
        var _lg = loadGame;
        window.loadGame = loadGame = function () {
            var r = _lg.apply(this, arguments);
            try {
                if (player && player.cls && ACCOUNT_PARTY.enabled) {
                    ensureAccountParty(player);
                    // 遷移：舊數字槽傭兵先結算待領，再換成英雄編隊
                    try {
                        (player.allies || []).slice().forEach(function (a) {
                            if (a && !a._heroId && isNumericSaveSlot(a._slot) && typeof _settleAllyExp === 'function') {
                                var m = _settleAllyExp(a, 'dismiss');
                                if (m && typeof logSys === 'function') logSys(m);
                            }
                        });
                    } catch (eMig) {}
                    syncPartyAllies({ preserveLive: false });
                    try { window._squadSigTeam = ''; window._squadSigSkill = ''; } catch (eSig) {}
                }
            } catch (e) { try { console.warn('account-party load', e); } catch (e2) {} }
            return r;
        };
    }
    // 抽卡版：取消「創角平均等級／Lv52 加速」——新角固定 Lv1
    if (typeof getNewCharStartInfo === 'function' && !getNewCharStartInfo._apGachaLv1) {
        var _gncsi = getNewCharStartInfo;
        window.getNewCharStartInfo = getNewCharStartInfo = function () {
            var info = _gncsi.apply(this, arguments) || { lv: 1, count: 0 };
            if (ACCOUNT_PARTY && ACCOUNT_PARTY.enabled) {
                return { lv: 1, count: info.count || 0, avg: 1, note: 'account-party-gacha' };
            }
            return info;
        };
        getNewCharStartInfo._apGachaLv1 = true;
    }
    if (typeof newCharStartHintInfo === 'function' && !newCharStartHintInfo._apGachaLv1) {
        var _ncshi = newCharStartHintInfo;
        window.newCharStartHintInfo = newCharStartHintInfo = function () {
            if (ACCOUNT_PARTY && ACCOUNT_PARTY.enabled) {
                return { lv: 1, count: 0, avg: 1, note: 'account-party-gacha' };
            }
            return _ncshi.apply(this, arguments);
        };
        newCharStartHintInfo._apGachaLv1 = true;
    }
    if (typeof startGame === 'function') {
        var _stg = startGame;
        window.startGame = startGame = function () {
            var r = _stg.apply(this, arguments);
            try {
                if (player && player.cls && ACCOUNT_PARTY.enabled) {
                    // 若外掛（afk-start30）仍把等級抬高，抽卡版強制還原為 Lv1（只喺創角當下、尚未手動升級前）
                    if (!player._apGachaLevelLocked && (player.lv || 1) > 1 && (player._apJustCreated || !player._apStarterPullsGranted || player.exp === 0)) {
                        // 僅當看起來係「剛創角被加速」：exp=0 且未標記已練級
                        if ((player.exp || 0) === 0 && !(player._apPlayerLeveled)) {
                            player.lv = 1;
                            player.exp = 0;
                            player.bonus = 0;
                            try { if (typeof calcStats === 'function') calcStats(); } catch (eLv) {}
                            try { player.hp = player.mhp; player.mp = player.mmp; } catch (eHp) {}
                        }
                    }
                    player._apJustCreated = false;
                    ensureAccountParty(player);
                    syncPartyAllies({ preserveLive: false });
                    try { saveGame(); } catch (e) {}
                }
            } catch (e2) {}
            return r;
        };
    }
    // 英雄升級受 star cap
    if (typeof _allyLevelRecompute === 'function') {
        var _alr = _allyLevelRecompute;
        window._allyLevelRecompute = _allyLevelRecompute = function (ally) {
            if (ally && ally._heroId) {
                var h = findHero(ally._heroId);
                if (h) {
                    var cap = heroLvCap(h.star);
                    if ((ally.lv || 1) > cap) { ally.lv = cap; ally.exp = 0; }
                }
            }
            var out = _alr(ally);
            if (ally && ally._heroId) apPersistHeroProgress(ally);
            return out;
        };
    }
}

// 公開 API
window.AP = {
    enabled: apEnabled,
    ensure: ensureAccountParty,
    sync: syncPartyAllies,
    build: buildHeroCombatant,
    findHero: findHero,
    findAlly: findAllyByHero,
    partyIds: partyHeroIds,
    partySet: partySetAt,
    partyRemove: partyRemoveHero,
    grant: grantHeroByDef,
    seed: seedStarterHeroes,
    heroEquip: heroEquipItem,
    heroUnequip: heroUnequipItem,
    feedBook: heroFeedSkillbook,
    persist: apPersistHeroProgress,
    lvCap: heroLvCap,
    starCost: heroStarCost,
    breakthrough: heroBreakthrough,
    canBreakthrough: heroCanBreakthrough,
    STAR_COST_BASE: HERO_STAR_COST_BASE,
    STAR_COST_MUL: HERO_STAR_COST_MUL,
    attrAt: function (cls, lv, star, rarity) { return heroAttrAt(cls, lv, star, rarity); },
    rarityOf: heroRarityOf,
    RARITY: HERO_RARITY,
    gachaPull: heroGachaPullOne,
    gachaPullMany: heroGachaPullMany,
    gachaTickets: heroGachaTickets,
    ensureGacha: ensureHeroGacha,
    grantStarterTickets: grantStarterPullTickets,
    isSaveSlot: isNumericSaveSlot,
    CLS_LABEL: HERO_CLS_LABEL,
    STARTER_DEFS: STARTER_DEFS,
    STARTER_TICKETS: HERO_STARTER_TICKETS,
    MAX: PARTY_HERO_MAX
};
window.HERO_RARITY = HERO_RARITY;

apInstallPatches();
try { console.info('[account-party] D1 heroes.js ready · PARTY_HERO_MAX=' + PARTY_HERO_MAX); } catch (e) {}
})();
