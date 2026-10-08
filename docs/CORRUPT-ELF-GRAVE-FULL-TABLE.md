# 腐敗-精靈墓穴（Corrupted Elf Grave）完整表

## 地圖

| id | 顯示名 | 進入 |
|---|---|---|
| `elf_grave_corrupt` | 腐敗-精靈墓穴 | 地圖下拉 → 燃柳村地區／野外 → **腐敗-精靈墓穴**（與精靈墓穴同區） |

## 取得方針（設計選擇）

- **直掉＋製作雙軌（偏遺島「直做易」）**：成品可自腐敗 mob 直掉；亦可於 **精靈女皇** 用基底裝備＋`腐敗精華` 升級。
- **巴特爾**：`腐敗骨片 ×5 → 腐敗精華`。
- 不走純箱抽；因此裝備數值 uplift 約對齊惡夢線（~+20% 體感），但旗艦奧短另具 **腐敗滅魂**。

## 新武器屬性：腐敗滅魂（`undeadSlayer`）

| 項目 | 內容 |
|---|---|
| 旗標 | `undeadSlayer: true` |
| 中文 | **腐敗滅魂** |
| vs `unBonus` | `unBonus`＝對不死／狼人 **+1D20**；`undeadSlayer`＝**+2D20**（已移除不死最終物理 ×1.2） |
| 優先序 | 同武器：`undeadSlayer` 骰傷優先，不與 `unBonus` 骰疊加；神聖武器仍在兩者皆無時才 +1D20（僅不死） |
| 狼人 | 吃 +2D20（與不死相同；已無倍率差） |
| Hook | 玩家 `js/03-combat-core.js` `getPhysicalDmg`；傭兵 `js/06-status-allies.js` `allyUnbonusBonus` + `allyUndeadSlayerMult` |
| 裝備 | 旗艦 `wpn_cor_ori_dagger`（並保留 `unBonus`/`req:"all"` 身分） |

## 怪物

| lv | 名稱 | id | HP | AC | MR | EXP | ×vanilla | dmg | hit | db |
|---|---|---|---|---|---|---|---|---|---|---|
| 40 | 腐敗-地之牙 | `cor_elf_earthfang` | 2220 | -42 | 35 | 5123 | 3.2 | `[2, 73]` | 52 | 37 |
| 40 | 腐敗-風之牙 | `cor_elf_windfang` | 2220 | -42 | 35 | 5123 | 3.2 | `[1, 68]` | 61 | 6 |
| 40 | 腐敗-水之牙 | `cor_elf_waterfang` | 2220 | -42 | 35 | 5123 | 3.2 | `[2, 73]` | 52 | 37 |
| 40 | 腐敗-火之牙 | `cor_elf_firefang` | 2220 | -42 | 35 | 5123 | 3.2 | `[2, 73]` | 52 | 37 |
| 45 | 腐敗-水靈之主 | `cor_elf_waterlord` | 2590 | -52 | 50 | 6888 | 3.4 | `[2, 76]` | 60 | 38 |
| 45 | 腐敗-深淵食屍鬼 | `cor_abyss_ghoul` | 4440 | -22 | 83 | 6888 | 3.4 | `[2, 76]` | 60 | 38 |
| 45 | 腐敗-深淵弓箭手 | `cor_abyss_archer` | 1110 | -77 | 73 | 6888 | 3.4 | `[1, 68]` | 70 | 6 |
| 45 | 腐敗-地靈之主 | `cor_elf_earthlord` | 2590 | -52 | 50 | 6888 | 3.4 | `[2, 81]` | 60 | 41 |
| 45 | 腐敗-風靈之主 | `cor_elf_windlord` | 2590 | -52 | 50 | 6888 | 3.4 | `[1, 68]` | 70 | 6 |
| 45 | 腐敗-火靈之主 | `cor_elf_firelord` | 2590 | -52 | 50 | 6888 | 3.4 | `[2, 76]` | 60 | 38 |
| 50 | 腐敗-西斯 | `cor_abyss_sith` | 4440 | -47 | 90 | 9004 | 3.6 | `[2, 91]` | 68 | 46 |
| 55 | 腐敗-深淵水靈 | `cor_abyss_water` | 3330 | -62 | 60 | 11499 | 3.8 | `[2, 115]` | 76 | 58 |
| 55 | 腐敗-深淵地靈 | `cor_abyss_earth` | 3330 | -62 | 60 | 11499 | 3.8 | `[2, 115]` | 76 | 58 |
| 55 | 腐敗-深淵風靈 | `cor_abyss_wind` | 3330 | -62 | 60 | 11499 | 3.8 | `[1, 111]` | 85 | 12 |
| 55 | 腐敗-深淵火靈 | `cor_abyss_fire` | 3330 | -62 | 60 | 11499 | 3.8 | `[2, 115]` | 76 | 58 |
| 50 | 腐敗-曼波兔 | `cor_mambo_rabbit` | 5850 | -54 | 80 | 7200 | 3.6 | `[2, 91]` | 68 | 46 |
| 65 | 腐敗-深淵之主 | `cor_abyss_lord` | 12300 | -78 | 85 | 15124 | 4.2 | `[4, 104]` | 105 | 105 |

- Mob 數：**17**
- Lv 範圍：40–65
- EXP 範圍：5123–15124（約 3.2–4.2× vanilla）

## 裝備

| id | 名稱 | req | 重點 |
|---|---|---|---|
| `wpn_cor_ori_dagger` | 腐敗．奧里哈魯根短劍 | **all** | 旗艦；9/9 hit+2 db+4 spd0.55；`unBonus`+**`undeadSlayer`**；匕首出血 |
| `wpn_cor_mithril_dagger` | 腐敗．米索莉短劍 | **all** | 8/7 hit+1 db+2；`unBonus`；mpR4 mdmg2 |
| `glv_cor_*_spirit` | 腐敗．四靈手套 | all | str2、屬抗6、mpR2 mr2 ac-1 |
| `hlm_cor_mambo` | 腐敗．曼波帽子 | all | cha2、睡/凍抗15、mr3 |
| `amr_cor_mambo` | 腐敗．曼波外套 | all | ac1、水抗12、火抗-8、cha3、mhp30 |
| `mat_cor_essence` / `mat_cor_shard` | 腐敗精華／骨片 | — | 製作材料 |

## 製作

```
巴特爾：腐敗骨片×5 → 腐敗精華
精靈女皇：
  奧里哈魯根短劍＋腐敗精華×25＋奧里哈魯根×20＋金幣20萬 → 腐敗．奧里哈魯根短劍
  米索莉短劍＋腐敗精華×12＋奧里哈魯根×10＋金幣8萬 → 腐敗．米索莉短劍
  各靈手套／曼波帽／外套＋腐敗精華 → 腐敗版
```

## 遺物（新版）

見 `CORRUPT-ELF-GRAVE-RELIC-TABLE.md`（17 件·`0.0001%`）

## 控制台

```js
mapState.current='elf_grave_corrupt'; typeof changeMap==='function' && changeMap(true);
gainItem('wpn_cor_ori_dagger',1);
gainItem('wpn_cor_mithril_dagger',1);
gainItem('glv_cor_earth_spirit',1); gainItem('glv_cor_wind_spirit',1);
gainItem('glv_cor_water_spirit',1); gainItem('glv_cor_fire_spirit',1);
gainItem('hlm_cor_mambo',1); gainItem('amr_cor_mambo',1);
gainItem('mat_cor_essence',50); gainItem('mat_cor_shard',100);

// 腐敗-精靈墓穴新版遺物
gainItem('relic_cor_earthfang_core',1);
gainItem('relic_cor_windfang_breeze',1);
gainItem('relic_cor_waterfang_tear',1);
gainItem('relic_cor_firefang_ember',1);
gainItem('relic_cor_water_orb',1);
gainItem('relic_cor_ghoul_visage',1);
gainItem('relic_cor_marksman_corset',1);
gainItem('relic_cor_earthshatter_sword',1);
gainItem('relic_cor_gale_fistblade',1);
gainItem('relic_cor_hellfire_hammer',1);
gainItem('relic_cor_beheading_scythe',1);
gainItem('relic_cor_calamity_egg',1);
gainItem('relic_cor_treasured_carrot',1);
gainItem('relic_cor_abyss_water_core',1);
gainItem('relic_cor_abyss_wind_core',1);
gainItem('relic_cor_abyss_fire_core',1);
gainItem('relic_cor_abyss_crown',1);
```

## 驗證

1. 硬重新整理（cache bust `packrelics.20260915b`）
2. 燃柳村 → 腐敗-精靈墓穴；確認 sickly green tint（非淡紫／非暗紅）
3. 裝備腐敗奧短打不死／狼人：傷害應有 +2D20（**無** ×1.2）
4. 精靈女皇製作／gainItem 確認圖示病綠光暈


> 本輪遺物更新 cache bust：`packrelics.20260915b`／GAME_VERSION `v3.8.36`（腐敗滅魂僅 +2D20）
