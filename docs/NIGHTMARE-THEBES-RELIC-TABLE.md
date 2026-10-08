# 惡夢-底比斯 · 遺物表

地圖：`thebes_nm_*`｜18 隻怪物各掉 1 件新遺物（`0.0001%`）｜舊底比斯遺物掉落保留不動

## 平衡選擇

- 對照 vanilla 遺物約 **+15–25%**（與 新-遺亡 同公式）
- **惡夢／腐敗維持同 uplift 公式（parity）**：兩者掉率皆 `0.0001%`；惡夢裝備另有寶箱門檻，遺物不再額外加碼
- 舊底比斯／舊精靈墓穴／新-遺亡遺物 **完全不動**

## 遺物表

| 怪物 | 新 id | 名稱 | 主要數值 | 對照 |
|---|---|---|---|---|
| 惡夢-底比斯 曼陀羅草(白) | `relic_nm_mandra_spirit` | 惡夢．曼陀羅之靈 | 31/31 hit1 mpR18 int1 extraMp9 instakill1.2% | relic_mandra_spirit 26/26 |
| 惡夢-底比斯 曼陀羅草 | `relic_nm_death_leaf` | 惡夢．隱蔽的死亡草葉 | ac6 stealth instakillFull1.2% | relic_death_leaf ac5 |
| 惡夢-底比斯 聖甲蟲 | `relic_nm_scarab_shin` | 惡夢．古代聖甲蟲脛甲 | ac5 resEarth12 | relic_scarab_shin ac4 resEarth10 |
| 惡夢-底比斯 聖甲蟲(藍) | `relic_nm_scarab_nest` | 惡夢．聖甲蟲的孵育巢 | ac2 cha-2 aggroHide | relic_scarab_nest ac1 cha-3 |
| 惡夢-底比斯 凱比斯(黑) | `relic_nm_darkscorpion_pincers` | 惡夢．暗黑蠍的雙鉗 | 19/13 hit14 db16 combo33 kiss5% poisonMult1.35 | relic_darkscorpion_pincers 16/11 |
| 惡夢-底比斯 凱比斯(紅) | `relic_nm_redscorpion_ring` | 惡夢．紅蠍尾環戒 | dex1 wis3 mhp-24 | relic_redscorpion_ring wis2 mhp-30 |
| 惡夢-底比斯 尖碑石奴 | `relic_nm_weathered_obelisk` | 惡夢．風化的巨型方尖碑 | 31/31 hit14 db19 crush heavy12% wind | relic_weathered_obelisk 26/26 |
| 惡夢-底比斯 尖碑石奴(黑) | `relic_nm_burden_gauntlet` | 惡夢．負重的堅忍巨臂 | ac10 weightCap180 con2 | relic_burden_gauntlet ac8 weightCap150 |
| 惡夢-底比斯 斯芬克斯 | `relic_nm_guardian_riddle` | 惡夢．守護獸的難題 | ac10 mr6 hardSkin | relic_guardian_riddle ac8 mr5 |
| 惡夢-底比斯 斯芬克斯(黑) | `relic_nm_sphinx_black_wing` | 惡夢．人面獅身的漆黑羽翼 | ac9 er6 drPerEr5 | relic_sphinx_black_wing ac7 er5 |
| 惡夢-底比斯 尼荷斯 | `relic_nm_overlook_thunder` | 惡夢．俯瞰大地的雷電 | ac3 aura thunder 9s | relic_overlook_thunder ac2 interval100 |
| 惡夢-底比斯 尼荷斯(藍) | `relic_nm_sky_god_avatar` | 惡夢．天空之神的化身 | ac13 wearerEle wind | relic_sky_god_avatar ac11 |
| 惡夢-底比斯 阿努斯 | `relic_nm_sand_shroud` | 惡夢．砂塵裹屍布 | ac9 er10 mr8 resEarth8 | invent·砂塵防禦披風 |
| 惡夢-底比斯 阿努斯(黑) | `relic_nm_blacksand_seal` | 惡夢．黑砂咒印 | ac3 mr14 stunResist20 | invent·抗性項鍊 |
| 惡夢-底比斯 巴斯 | `relic_nm_stormcat_claw` | 惡夢．雷貓之爪 | ac6 dex2 meleeHit5 rangedHit3 | invent·命中手套 |
| 惡夢-底比斯 巴斯(紅) | `relic_nm_redthunder_collar` | 惡夢．赤霆項圈 | ac2 str1 mdmg3 aura11s | invent·雷霆項鍊 |
| 惡夢-底比斯 阿努比斯 | `relic_nm_jackal_judgment` | 惡夢．胡狼神判杖 | 32/30 hit10 db8 str2 int2 mdmg7 mpR14 mr5 magicstrike kiss14%（底比斯魔杖上級）＋鷹神之瞳套組 | invent·裁決法杖 |
| 惡夢-底比斯 賀洛斯 | `relic_nm_falcon_eye` | 惡夢．鷹神之瞳 | ac1 int2 mdmg5 mr8 mpR4 | invent·法傷耳環 |

## 掉落

- 各對應 mob **1 件**，機率 **`0.0001%`**（與新-遺亡相同）
- 共通：`relic:true, noEnhance:true, gachaWeight:0, p:10000`（蛋無 noEnhance）

## 控制台

```js
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
