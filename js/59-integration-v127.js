// ===== 🧭 v3.8.127 整合補完：扭蛋專屬技能書／記憶粉／特效／狀態圖示 =====
// 設計：mall-gacha-v1 §5.1、talent-v1 §重置。全部經現有通用路徑（skillbk 學習、auto-cast、02 buff d、07 傷害）。
(function () {
'use strict';
if (typeof DB === 'undefined' || !DB.items || !DB.skills) return;
var SI = 'assets/icons/skills/', II = 'assets/icons/items/';

// —— 技能（數值錨：灼熱武器 5/5@25MP、閃亮之盾 AC8、岩漿之箭 10d8、三重矢 3 箭@15MP、鏡反射） ——
var SK = {
    sk_royal_domain: { n: '王權領域', type: 'buff', label: '增益', cat: 'royal', tier: 5, reqRoy: 55, mp: 40, dur: 640, noRefresh: true,
        d: { extraDmg: 6, extraHit: 6, ac: 4 }, img: SI + '精準目標.png',
        desc: '王權威光籠罩自身：額外傷害 +6、額外命中 +6、AC −4（640 秒，效果結束才可再施放）。', msg: '王權領域展開，你嘅號令無人可違。' },
    sk_dragon_slayer: { n: '屠龍奧義', type: 'atk', tier: 4, reqDk: 55, mp: 0, hpCost: 40, dmgType: 'magic', ele: 'fire',
        multiDmg: [[12, 10]], bossMult: 1.5, img: SI + '岩漿之箭.png',
        desc: '凝聚龍血之炎轟擊單體：火屬性 12d10 魔法傷害；對頭目傷害 ×1.5。消耗 HP 40。' },
    sk_elf_triple2: { n: '三重矢·改', type: 'atk', tier: 5, reqE: 45, mp: 22, dmgType: 'physical', ranged: true, reqWpn: 'bow', hits: 4, skillAddDmg: 3,
        img: SI + '三重矢.png', desc: '強化版三重矢：連射 4 箭，每箭傷害 +3（需裝備弓，消耗箭矢）；同樣觸發連射／月光爆裂。' },
    sk_illu_mirrorshard: { n: '鏡之殘章', type: 'buff', label: '增益', tier: 5, reqI: 45, mp: 30, dur: 320, noRefresh: true,
        d: { mr: 12, er: 6, magicDmg: 3 }, img: SI + '鏡像.png',
        desc: '殘破鏡面折射幻影：MR +12、ER +6、魔攻 +3（320 秒，效果結束才可再施放）。', msg: '鏡之殘片環繞你，幻影層層疊疊。' }
};
var BK = {
    bk_royal_domain:     { type: 'skillbk', n: '魔法書(王權領域)',     p: 60000, sk: 'sk_royal_domain',     gachaWeight: 0, mallExclusive: true, img: II + '魔法書(閃亮之盾).png', d: '龍鑽扭蛋 SSR。王族可學（等級 55）。' },
    bk_dragon_slayer:    { type: 'skillbk', n: '龍騎士書板(屠龍奧義)', p: 60000, sk: 'sk_dragon_slayer',    gachaWeight: 0, mallExclusive: true, img: II + '龍騎士書板(岩漿之箭).png', d: '龍鑽扭蛋 SSR。龍騎士可學（等級 55）。' },
    bk_elf_triple2:      { type: 'skillbk', n: '精靈水晶(三重矢·改)', p: 20000, sk: 'sk_elf_triple2',      gachaWeight: 0, mallExclusive: true, img: II + '精靈水晶(三重矢).png', d: '龍鑽扭蛋 SR。妖精可學（等級 45）。' },
    bk_illu_mirrorshard: { type: 'skillbk', n: '記憶水晶(鏡之殘章)', p: 20000, sk: 'sk_illu_mirrorshard', gachaWeight: 0, mallExclusive: true, img: II + '記憶水晶(鏡像).png', d: '龍鑽扭蛋 SR。幻術士可學（等級 45）。' }
};
Object.keys(SK).forEach(function (k) { if (!DB.skills[k]) DB.skills[k] = SK[k]; });
Object.keys(BK).forEach(function (k) { if (!DB.items[k]) DB.items[k] = BK[k]; });

// —— 記憶粉：天賦重置代幣（talent-v1）；扭蛋 R/N 材料池 ——
if (!DB.items.mem_dust) DB.items.mem_dust = { n: '記憶粉', type: 'etc', p: 20000, gachaWeight: 40, c: 'text-violet-300',
    img: II + '回憶蠟燭.png', d: '閃爍微光嘅記憶結晶粉末。天賦「重置」（今日免費已用時）優先消耗 1 個，代替 1,000,000 金幣。' };

// —— 技能書殘頁：扭蛋抽到已學技能書→轉殘頁（§5.1）；10 張換任一專屬書（商城「取得／兌換」） ——
if (!DB.items.mg_book_frag) DB.items.mg_book_frag = { n: '技能書殘頁', type: 'etc', p: 2000, gachaWeight: 0, c: 'text-amber-200',
    img: II + '魔法書(閃亮之盾).png', d: '龍鑽扭蛋抽到已學技能書時轉化而成。10 張可喺龍鑽商城「取得／兌換」換任一本扭蛋專屬技能書。' };

// —— 道具收藏冊（18-misc-book 喺本檔之前建索引）：補登新道具＋41–43 試煉／事件道具 ——
try { if (typeof MISC_ITEM_CAT !== 'undefined' && typeof MISC_CAT_ITEMS !== 'undefined' && typeof miscCatKey === 'function') {
    ['bk_royal_domain', 'bk_dragon_slayer', 'bk_elf_triple2', 'bk_illu_mirrorshard', 'mem_dust', 'mg_book_frag',
     'cur_trial_badge', 'cur_event_badge', 'scroll_blessify', 'scroll_guard_wpn', 'scroll_guard_arm', 'scroll_guardx_wpn', 'scroll_guardx_arm',
     'scroll_seal_stable', 'scroll_sure_plus', 'mat_rift_lock', 'mat_relic_reson', 'mat_soul_transfer'].forEach(function (id) {
        var d = DB.items[id]; if (!d || MISC_ITEM_CAT[id]) return;
        var ck = miscCatKey(id, d); if (!ck) return;
        if (!MISC_CAT_ITEMS[ck]) MISC_CAT_ITEMS[ck] = [];
        MISC_CAT_ITEMS[ck].push(id); MISC_ITEM_CAT[id] = ck;
    });
} } catch (e) {}

// —— 特效（09 以技能名查表）：沿用最近似現有特效 ——
try { if (typeof SPELL_FX !== 'undefined' && !SPELL_FX['屠龍奧義']) SPELL_FX['屠龍奧義'] = SPELL_FX['燃燒的火球'] || SPELL_FX['火箭']; } catch (e) {}
try { if (typeof SELF_FX !== 'undefined') {
    if (!SELF_FX['王權領域']) SELF_FX['王權領域'] = SELF_FX['精準目標'] || SELF_FX['烈炎武器'];
    if (!SELF_FX['鏡之殘章']) SELF_FX['鏡之殘章'] = SELF_FX['鏡反射'];
} } catch (e) {}
// —— 狀態列圖示（08 STATUS_ICON_SKILLS：buff → 圖示名） ——
try { if (typeof STATUS_ICON_SKILLS !== 'undefined') {
    STATUS_ICON_SKILLS.sk_royal_domain = '精準目標';
    STATUS_ICON_SKILLS.sk_illu_mirrorshard = '鏡像';
} } catch (e) {}

// —— 扭蛋池：專屬書強制入池（56 依 p 分級：≥50000 SSR、≥10000 SR） ——
try { if (window.MG && MG.build) { /* 池為 lazy cache，首次開商城先建，故此處只需確保 DB 已註冊 */ } } catch (e) {}
})();
