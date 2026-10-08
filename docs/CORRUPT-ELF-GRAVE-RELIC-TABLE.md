# 腐敗-精靈墓穴 · 遺物表

地圖：`elf_grave_corrupt`｜17 隻怪物各掉 1 件新遺物（`0.0001%`）｜舊精靈墓穴遺物掉落保留不動

## 平衡選擇

- 對照 vanilla 遺物約 **+15–25%**（與 新-遺亡 同公式）
- **惡夢／腐敗維持同 uplift 公式（parity）**：兩者掉率皆 `0.0001%`；惡夢裝備另有寶箱門檻，遺物不再額外加碼
- 舊底比斯／舊精靈墓穴／新-遺亡遺物 **完全不動**

## 遺物表

| 怪物 | 新 id | 名稱 | 主要數值 | 對照 |
|---|---|---|---|---|
| 腐敗-地之牙 | `relic_cor_earthfang_core` | 腐敗．地之牙的殘核 | ac1 mhp36 earthWpn×1.3 | relic_earthfang_core mhp30 ×1.2 |
| 腐敗-風之牙 | `relic_cor_windfang_breeze` | 腐敗．風之牙的微風 | ac2 er4 windWpn×1.3 | relic_windfang_breeze ac1 er3 ×1.2 |
| 腐敗-水之牙 | `relic_cor_waterfang_tear` | 腐敗．水之牙的淚滴 | ac1 mpR3 waterWpn×1.3 | relic_waterfang_tear mpR2 ×1.2 |
| 腐敗-火之牙 | `relic_cor_firefang_ember` | 腐敗．火之牙的餘燼 | ac4 fireWpn×1.3 | relic_firefang_ember ac3 ×1.2 |
| 腐敗-水靈之主 | `relic_cor_water_orb` | 腐敗．水靈的魔力珠 | 3/3 hit16 db16 frozen+60 freeze4% | relic_water_orb 2/2 hit13 frozen+50 freeze3% |
| 腐敗-深淵食屍鬼 | `relic_cor_ghoul_visage` | 腐敗．食屍鬼的啃食面容 | ac12 mhp36 killHeal36 | relic_ghoul_visage ac10 mhp30 killHeal30 |
| 腐敗-深淵弓箭手 | `relic_cor_marksman_corset` | 腐敗．精銳射手的戰鬥束衣 | ac12 rangedHit4 dex2 er6 | relic_marksman_corset ac10 rangedHit3 er5 |
| 腐敗-地靈之主 | `relic_cor_earthshatter_sword` | 腐敗．大地碎裂劍 | 12/13 hit16 db20 earth slowScale | relic_earthshatter_sword 10/11 hit13 db17 |
| 腐敗-風靈之主 | `relic_cor_gale_fistblade` | 腐敗．疾風拳刃 | 14/19 hit18 db14 combo75 atkSpd40% windblade4% | relic_gale_fistblade 12/16 combo70 atkSpd35% |
| 腐敗-火靈之主 | `relic_cor_hellfire_hammer` | 腐敗．業火鍛造鎚 | 10/7 hit16 db16 crush hardskinFire | relic_hellfire_hammer 8/6 hit13 db13 |
| 腐敗-西斯 | `relic_cor_beheading_scythe` | 腐敗．斬首的巨大鐮刀 | 25/31 hit16 db16 cleave instakill heal36 | relic_beheading_scythe 21/26 heal30 |
| 腐敗-深淵地靈 | `relic_cor_calamity_egg` | 腐敗．充滿災厄氣息的蛋 | eff:calamityegg → 災厄蜥蜴 | relic_calamity_egg |
| 腐敗-曼波兔 | `relic_cor_treasured_carrot` | 腐敗．珍藏的巨大胡蘿蔔 | ac2 cha4 pet/summon +6/+6/+2 | relic_treasured_carrot ac1 cha3 +5/+5/+1 |
| 腐敗-深淵水靈 | `relic_cor_abyss_water_core` | 腐敗．深淵水核 | ac2 mpR5 mr10 resWater15 mdmg2 | invent·水核 |
| 腐敗-深淵風靈 | `relic_cor_abyss_wind_core` | 腐敗．深淵風核 | ac2 er10 dex2 resWind15 | invent·風核 |
| 腐敗-深淵火靈 | `relic_cor_abyss_fire_core` | 腐敗．深淵火核 | ac2 str1 meleeDmg2 resFire15 mr8 | invent·火核 |
| 腐敗-深淵之主 | `relic_cor_abyss_crown` | 腐敗．深淵主冠 | ac12 mr14 mhp60 dr4 resEarth10 | invent·BOSS冠 |

## 掉落

- 各對應 mob **1 件**，機率 **`0.0001%`**（與新-遺亡相同）
- 共通：`relic:true, noEnhance:true, gachaWeight:0, p:10000`（蛋無 noEnhance）

## 控制台

```js
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
