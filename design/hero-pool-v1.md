# 英雄角色池 v1（全女 · 96 人 · 暫無立繪）

> 日期：2026-10-18（Asia/Taipei）　實作檔：`elf-update/js/60-heroes.js`（`HERO_DB`）
> 對接：`gacha-star-v1.md` §3／§7 GS1→滿池；`account-party-v1` 名冊／起始 5 人。
> **立繪**：新角 `portraitId: null`；既有 8 名女角保留原 `v8:*` 立繪 id。**未產圖。**

## 0. 摘要

| 項目 | 內容 |
|---|---|
| 總數 | **96**（8 職 × 12） |
| 性別 | **全 `gender: 'f'`**（舊 8 名男性 defId 已移除並以新女角取代） |
| 稀有度 | 每職 N×4／R×4／SR×3／SSR×1 → 合計 **32N／32R／24SR／8SSR** |
| 欄位 | `name, cls, gender, rarity, portraitId, skills, blurb, lore`（妖精另有 `elfEle`） |
| `blurb` | 單行短句（UI 標題感） |
| `lore` | 2–4 句繁中原創短篇（亞丁／說話之島／象牙塔風味；**非**版權角色名） |
| 起始 5 | `STARTER_DEFS` 不變：艾麗雅／莉莉亞／瑟蕾娜／布蕾娜／德拉嘉 |

## 1. 職業 × 稀有度

| cls | N | R | SR | SSR | 合計 |
|---|---|---|---|---|---|
| knight | 4 | 4 | 3 | 1 | 12 |
| royal | 4 | 4 | 3 | 1 | 12 |
| elf | 4 | 4 | 3 | 1 | 12 |
| illusion | 4 | 4 | 3 | 1 | 12 |
| warrior | 4 | 4 | 3 | 1 | 12 |
| mage | 4 | 4 | 3 | 1 | 12 |
| dark | 4 | 4 | 3 | 1 | 12 |
| dragon | 4 | 4 | 3 | 1 | 12 |
| **合計** | **32** | **32** | **24** | **8** | **96** |

## 2. SSR 名單

| defId | 名 | 職 |
|---|---|---|
| `hero_isolde_knight` | 伊索德 | knight |
| `hero_aurelia_royal` | 奧蕾莉亞 | royal |
| `hero_sylwen_elf` | 希爾雯 | elf |
| `hero_morgana_illusion` | 摩根娜 | illusion |
| `hero_skaldi_warrior` | 史卡蒂 | warrior |
| `hero_circe_mage` | 瑟西 | mage |
| `hero_nocturne_dark` | 諾克特 | dark |
| `hero_wyrmia_dragon` | 薇爾米雅 | dragon |

## 3. 妖精屬性分布

`elfEle` ∈ wind／fire／water／earth，12 人中大致各 3（起始莉莉亞＝wind）。

## 4. UI

`61-party-ui.js` → `renderHeroManagePanel`：有 `blurb`／`lore` 時顯示於名冊詳情（技能列表上方）。

## 5. 未做／刻意不做

- 未產生立繪圖檔；新角 `portraitId: null`（UI 回落職業預設頭）
- 未改戰鬥公式／天賦 DRAFT 數值
- 未改原版 `index.html`／`index-pc.html` script 列表
- 未部署整包；可選只同步 `js/60-heroes.js`（＋本文件）到 PC 並排目錄

## 6. 驗收速查

1. `Object.keys(HERO_DB).length === 96`
2. 無 `gender: 'm'`；五個 `STARTER_DEFS` 仍存在且為女
3. 名冊開任一新角可見 lore 短文
4. `node --check js/60-heroes.js` 通過
