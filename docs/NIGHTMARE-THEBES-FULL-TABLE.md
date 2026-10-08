<!-- v3.8.44：惡夢底比斯四把武器 procRateBase 5→10；武器 PROC 可觸發席琳咒言 -->
# 惡夢-底比斯（Nightmare Thebes）完整表

## 地圖

| id | 顯示名 | 進入 |
|---|---|---|
| `thebes_nm_desert` | 惡夢-底比斯沙漠 | 時空裂痕選單直接進入 |
| `thebes_nm_pyramid` | 惡夢-底比斯金字塔 | 時空裂痕選單直接進入 |
| `thebes_nm_temple` | 惡夢-底比斯祭壇 | 需 `item_nm_thebes_altar_key`（惡夢-底比斯歐西里斯祭壇鑰匙） |

## 平衡方針（惡夢相對 vanilla Thebes；2026-09-15b 微幅強化）

- 取得路徑較難（寶箱 gacha），略高於先前對齊 新-遺亡 uplift 的數值
- 經驗：約 vanilla ×3.6～4.7（Lv 帶不變；本輪再 +12%）
- HP：一般／BOSS 在惡夢基線上再 **+12%**
- 傷害／db：再 **+10%**（含技能 mag）；命中再 **+5%**
- AC／MR：維持惡夢既有修正（AC 再 −12／BOSS −18；MR +15／BOSS +25）
- 裝備：惡夢基線再 **+約10%** 主屬／傷害（獨特效果保留；仍低於席琳終武）

## 怪物（18）

| Lv | 名稱 | id | HP | AC | MR | EXP | vs原倍率 | dmg | hit | db |
|---:|---|---|---:|---:|---:|---:|---:|---|---:|---:|
| 23 | 惡夢-底比斯 曼陀羅草(白) | `nm_thebes_mandra_w` | 580 | -22 | 65 | 1900 | 3.58 | `[2, 42]` | 10 | 21 |
| 26 | 惡夢-底比斯 曼陀羅草 | `nm_thebes_mandra` | 663 | -27 | 65 | 2475 | 3.66 | `[2, 52]` | 28 | 26 |
| 29 | 惡夢-底比斯 聖甲蟲 | `nm_thebes_scarab` | 829 | -37 | 75 | 3138 | 3.73 | `[2, 57]` | 35 | 30 |
| 32 | 惡夢-底比斯 聖甲蟲(藍) | `nm_thebes_scarab_b` | 995 | -37 | 80 | 3893 | 3.8 | `[1, 70]` | 48 | 7 |
| 35 | 惡夢-底比斯 凱比斯(黑) | `nm_thebes_kebis_b` | 995 | -32 | 81 | 3967 | 3.87 | `[1, 70]` | 55 | 7 |
| 39 | 惡夢-底比斯 凱比斯(紅) | `nm_thebes_kebis_r` | 1243 | -37 | 81 | 6036 | 3.97 | `[1, 75]` | 63 | 7 |
| 41 | 惡夢-底比斯 尖碑石奴 | `nm_thebes_obelisk` | 1450 | -37 | 95 | 6750 | 4.01 | `[2, 81]` | 57 | 41 |
| 44 | 惡夢-底比斯 尖碑石奴(黑) | `nm_thebes_obelisk_b` | 1658 | -37 | 95 | 7912 | 4.08 | `[2, 87]` | 62 | 45 |
| 47 | 惡夢-底比斯 斯芬克斯 | `nm_thebes_sphinx` | 1823 | -41 | 115 | 9185 | 4.16 | `[2, 85]` | 66 | 42 |
| 50 | 惡夢-底比斯 尼荷斯 | `nm_thebes_nehos` | 1865 | -32 | 75 | 10573 | 4.23 | `[1, 110]` | 81 | 11 |
| 50 | 惡夢-底比斯 斯芬克斯(黑) | `nm_thebes_sphinx_b` | 2321 | -44 | 115 | 10573 | 4.23 | `[2, 100]` | 71 | 51 |
| 52 | 惡夢-底比斯 尼荷斯(藍) | `nm_thebes_nehos_b` | 2321 | -42 | 75 | 11564 | 4.28 | `[1, 110]` | 85 | 11 |
| 54 | 惡夢-底比斯 阿努斯 | `nm_thebes_anus` | 2486 | -52 | 80 | 12609 | 4.32 | `[2, 107]` | 78 | 55 |
| 56 | 惡夢-底比斯 阿努斯(黑) | `nm_thebes_anus_b` | 2694 | -52 | 80 | 13710 | 4.37 | `[2, 128]` | 81 | 65 |
| 58 | 惡夢-底比斯 巴斯 | `nm_thebes_bas` | 2901 | -42 | 85 | 14867 | 4.42 | `[2, 132]` | 85 | 67 |
| 60 | 惡夢-底比斯 巴斯(紅) | `nm_thebes_bas_r` | 3108 | -42 | 85 | 16081 | 4.47 | `[2, 136]` | 88 | 69 |
| 70 | 惡夢-底比斯 賀洛斯 | `nm_thebes_horus` | 45920 | -158 | 105 | 23054 | 4.7 | `[4, 132]` | 138 | 133 |
| 70 | 惡夢-底比斯 阿努比斯 | `nm_thebes_anubis` | 57400 | -158 | 105 | 23054 | 4.7 | `[4, 132]` | 138 | 133 |


## 裝備

| id | 名稱 |
|---|---|
| wpn_nm_thebes_bow | 惡夢-底比斯歐西里斯弓 |
| wpn_nm_thebes_dual | 惡夢-底比斯歐西里斯雙刀 |
| wpn_nm_thebes_2hsword | 惡夢-底比斯歐西里斯雙手劍 |
| wpn_nm_thebes_wand | 惡夢-底比斯歐西里斯魔杖 |
| blt_nm_thebes_osiris | 惡夢-底比斯歐西里斯腰帶 |
| acc_nm_thebes_horus | 惡夢-底比斯賀洛斯戒指 |
| acc_nm_thebes_anubis | 惡夢-底比斯阿努比斯戒指 |

## 製作

NPC：`npc_bartel` 巴特爾（希培利亞）

```
惡夢-歐西里斯初級寶箱碎片(上)+(下) → 惡夢-上鎖的歐西里斯初級寶箱
惡夢-歐西里斯高級寶箱碎片(上)+(下) → 惡夢-上鎖的歐西里斯高級寶箱
開啟寶箱：每箱消耗 龜裂之核 ×1 → 機率出惡夢-底比斯武器
```

## 遺物（新版）

見 `NIGHTMARE-THEBES-RELIC-TABLE.md`（18 件·`0.0001%`）

## 控制台

```js
// 地圖跳轉
changeMap && (mapState.current='thebes_nm_desert', typeof changeMap==='function' && changeMap(true));
// 或於地圖選單：時空裂痕 → 惡夢-底比斯*

// 獲得裝備／鑰匙
gainItem('wpn_nm_thebes_bow',1);
gainItem('wpn_nm_thebes_dual',1);
gainItem('wpn_nm_thebes_2hsword',1);
gainItem('wpn_nm_thebes_wand',1);
gainItem('blt_nm_thebes_osiris',1);
gainItem('acc_nm_thebes_horus',1);
gainItem('acc_nm_thebes_anubis',1);
gainItem('item_nm_thebes_altar_key',5);
gainItem('item_nm_osiris_box_high',3);
gainItem('mat_crack_core',10);

// 惡夢-底比斯新版遺物
gainItem('relic_nm_mandra_spirit',1);
gainItem('relic_nm_death_leaf',1);
gainItem('relic_nm_scarab_shin',1);
gainItem('relic_nm_scarab_nest',1);
gainItem('relic_nm_darkscorpion_pincers',1);
gainItem('relic_nm_redscorpion_ring',1);
gainItem('relic_nm_weathered_obelisk',1);
gainItem('relic_nm_burden_gauntlet',1);
gainItem('relic_nm_guardian_riddle',1);
gainItem('relic_nm_sphinx_black_wing',1);
gainItem('relic_nm_overlook_thunder',1);
gainItem('relic_nm_sky_god_avatar',1);
gainItem('relic_nm_sand_shroud',1);
gainItem('relic_nm_blacksand_seal',1);
gainItem('relic_nm_stormcat_claw',1);
gainItem('relic_nm_redthunder_collar',1);
gainItem('relic_nm_jackal_judgment',1);
gainItem('relic_nm_falcon_eye',1);
```

## 驗證步驟

1. 硬重新整理（cache bust `packrelics.20260915b`／ `nmthebes.20260915b`）
2. 時空裂痕 → 惡夢-底比斯沙漠／金字塔；確認 mob 有淡紫 spectral 濾鏡
3. 金字塔刷鑰匙 → 祭壇雙 BOSS
4. 巴特爾合成惡夢寶箱並開啟
5. `gainItem` 確認圖示為淡紫光暈


> 本輪遺物更新 cache bust：`packrelics.20260915b`／GAME_VERSION `v3.8.36`
