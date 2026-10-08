# 新-遺亡之島完整表（怪物改名 + 裝備管線）

## 1. 怪物改名

| 變更 | 說明 |
|---|---|
| 顯示名 | `遺亡之島*` → `新-遺亡之島*` |
| id | `oblin_*` 不變 |
| 地圖 | `oblivion_new` 顯示名維持「新-遺亡之島」 |
| 數量 | 26 隻 |

詳見 `NEW-OBLIVION-MOB-TABLE.md`。

## 2. 裝備數值（對比舊 古老的）

| 名稱 | 舊 | 新 | 增量重點 |
|---|---|---|---|
| 劍 | 35/20 hit5 | 42/24 hit8 db3 str1 | +~20% 傷害、貫穿硬皮 |
| 巨劍 | 27/45 hit3 db3 | 32/52 hit5 db6 con1 hardWear1 | 切割＋削硬皮 |
| 弩槍 | 3/3 hit5 db2 rf90 spd0.9 | 3/3 hit8 db4 rf100 spd0.85 dex1 | 連射與命中提升 |
| 金屬甲 | ac16 hpR1 | ac18 mhp80 dr2 hpR2 | HP 上限＋減傷 |
| 鱗甲 | ac14 hpR8 mpR4 | ac16 hpR10 mpR5 mr8 | 魔防 |
| 皮甲 | ac14 hpR4 mpR8 | ac16 hpR5 mpR10 dex1 | 敏捷 |
| 長袍 | ac12 mpR12 | ac14 mpR15 mdmg2 int1 | 魔傷＋智力 |

## 3. 製作

NPC：`npc_dytite` 迪泰特（威頓村）

```
封印材 ×1 + 新-古代的卷軸 ×1 → 對應 新-古老的*
```

舊系列配方不動。

## 4. 掉落摘要（鍵＝新中文名）

與遺忘之島同機率，材料 id 換為：

- `item_forgotten_*` → `item_new_forgotten_*`
- `item_ancient_scroll` → `item_new_ancient_scroll`
- 其餘（hlm_wind、rng_mr、書籍、boss 雜物等）機率不變

巨大牛人 boss 表保留原 boss 掉落，僅卷軸改 `item_new_ancient_scroll` 0.5。

舊 `遺忘之島*` MOB_DROPS **未改動**。

## 5. 圖示部署路徑

| 類型 | 路徑 |
|---|---|
| 武器 | `assets/icons/weapons/新-古老的*.png` |
| 防具 | `assets/icons/armors/新-古老的*.png` |
| 材料 | `assets/icons/items/新-古代的卷軸.png`、`受封印 新-被遺忘的*.png`、`新-被遺忘的*.png` |
| 部署副本 | `work/new-ancient-deploy/assets/icons/...` |
| 預覽 | `docs/new-ancient-gear-preview.png` |

## 6. 相關程式

- `js/00-data.js` — 怪物名、材料、成品、NPC 文案
- `js/01-drops-config.js` — MOB_DROPS + ITEM_WEIGHTS
- `js/14-craft-pandora.js` — npc_dytite 配方
- `js/10-ui-tabs.js` — WEAPON_TAGS + protectOldSeries
- `js/08-items-equip.js` — 職業白名單加 新-古老的*
- `js/11-world-map.js` — 屬性賦予豁免文案
