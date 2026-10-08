# 惡夢-提卡爾 ＆ 亞丁城堡（v3.8.61 · cache `tikaladen.20260925a`）

## 1. 地圖

| map id | 名稱 | 下拉分類 | 出怪 | 備註 |
|---|---|---|---|---|
| `tikal_nm_area` | 惡夢-提卡爾神廟地區 | 時空裂痕（`MAP_CATEGORIES.rift`／`MAP_REGIONS` rift） | 惡夢版 tikal_area 10 種 | 背景 `assets/area/1920x1080/惡夢-提卡爾神廟地區.jpg`（原圖淡紫暗化，同 NM 底比斯 tint_bg） |
| `tikal_nm_deep` | 惡夢-提卡爾神廟地區深處 | 同上 | 惡夢版 tikal_deep 8 種 | 背景 `…/惡夢-提卡爾神廟地區深處.jpg`；深處怪 2% 掉祭壇鑰匙 |
| `tikal_nm_altar` | 惡夢-提卡爾祭壇 | 同上，`needKey:'item_nm_tikal_altar_key'` | 惡夢杰弗雷庫(雄)＋(雌) | `KING_ROOMS` dual 純 BOSS 房＋`PURE_BOSS_MAPS`；背景 `…/惡夢-提卡爾祭壇.jpg` |
| `aden_castle` | 亞丁城堡 | 特殊（`MAP_CATEGORIES.special`）＋世界地圖「亞丁」區 | 反王軍 6 雜兵＋反王肯恩＋水之魔女賽尼斯（頭目走一般出王判定，可雙王同場） | 背景＝攻城戰「肯特守護塔」`assets/area/siege-v2/肯特城內HD.png`，疊 `1920x1080/肯特內城.jpg` 作缺檔後備；卡片地區 `adencastle`（mhp 5/10/20） |

## 2. 惡夢-提卡爾 怪物（同 NM 底比斯兩段式公式）

公式：HP ×1.85（BOSS ×2.05）再 ×1.12；物理/魔法骰面與 db ×1.28（BOSS ×1.30）再 ×1.1；命中 ×1.22×1.05；經驗 ×(3.2+(lv−23)/47)×1.12；AC −12（BOSS −18）；MR +15（BOSS +25）；金幣 50–400（BOSS 500–2000）；race `惡夢提卡爾`（大宗族推導＝惡魔族，同 NM 底比斯）；淡紫半透明 tint（`MOB_NIGHTMARE_TINT`）＋動畫 alias 回原提卡爾。

| id | 名稱 | Lv | HP（原版） | AC | MR | 傷害 | 命中 | EXP（原版） |
|---|---|---|---|---|---|---|---|---|
| `nm_tikal_azt` | 惡夢-提卡爾艾庫阿茲特 | 23 | 522（252） | -25 | 65 | 2d42+21 | 11 | 1900（530） |
| `nm_tikal_azt_y` | 惡夢-提卡爾艾庫阿茲特(黃) | 26 | 597（288） | -32 | 55 | 2d52+26 | 28 | 2475（677） |
| `nm_tikal_yuka_b` | 惡夢-提卡爾艾庫尤卡(藍) | 29 | 746（360） | -45 | 25 | 2d57+30 | 35 | 3138（842） |
| `nm_tikal_yuka_w` | 惡夢-提卡爾艾庫尤卡(白) | 32 | 895（432） | -48 | 25 | 1d70+7 | 48 | 3893（1025） |
| `nm_tikal_kaira_b` | 惡夢-提卡爾艾庫卡伊拉(藍) | 35 | 1094（528） | -30 | 30 | 1d70+7 | 55 | 4744（1226） |
| `nm_tikal_kaira_y` | 惡夢-提卡爾艾庫卡伊拉(黃) | 39 | 1368（660） | -35 | 30 | 1d75+7 | 63 | 6036（1522） |
| `nm_tikal_bara` | 惡夢-提卡爾艾庫巴拉 | 41 | 1740（840） | -35 | 35 | 2d81+41 | 57 | 6750（1682） |
| `nm_tikal_bara_r` | 惡夢-提卡爾艾庫巴拉(紅) | 44 | 1989（960） | -36 | 35 | 2d87+45 | 62 | 7912（1937） |
| `nm_tikal_eto` | 惡夢-提卡爾艾庫艾托 | 47 | 2188（1056） | -38 | 95 | 2d85+42 | 66 | 9185（2210） |
| `nm_tikal_eto_dry` | 惡夢-提卡爾艾庫艾托(枯竭) | 50 | 2784（1344） | -41 | 25 | 2d100+51 | 71 | 10573（2501） |
| `nm_tikal_mud` | 惡夢-提卡爾薩德泥偶 | 50 | 1679（810） | -38 | 45 | 1d110+11 | 81 | 10573（2501） |
| `nm_tikal_mud_k` | 惡夢-提卡爾薩德泥偶(黑) | 52 | 2089（1008） | -51 | 25 | 1d110+11 | 85 | 11564（2705） |
| `nm_tikal_ska_p` | 惡夢-提卡爾薩德司卡(紫) | 54 | 2984（1440） | -48 | 20 | 2d107+55 | 78 | 12609（2917） |
| `nm_tikal_ska_r` | 惡夢-提卡爾薩德司卡(紅) | 56 | 3232（1560） | -48 | 20 | 2d128+65 | 81 | 13710（3137） |
| `nm_tikal_teo_b` | 惡夢-提卡爾薩德提歐(藍) | 58 | 3481（1680） | -39 | 65 | 2d132+67 | 85 | 14867（3365） |
| `nm_tikal_teo_y` | 惡夢-提卡爾薩德提歐(黃) | 60 | 3730（1800） | -48 | 50 | 2d136+69 | 88 | 16081（3601） |
| `nm_tikal_boss_m` | 惡夢-提卡爾杰弗雷庫(雄) | 70 | 57400（原版載入後 40000） | -158 | 105 | 4d118+238 | 138 | 23054（4901） |
| `nm_tikal_boss_f` | 惡夢-提卡爾杰弗雷庫(雌) | 70 | 45920（原版載入後 40000） | -158 | 105 | 4d79+161 | 138 | 23054（4901） |

**對照 NM 底比斯**（同等級段）：
| NM 底比斯 | Lv | HP | 傷害 | 命中 | EXP |
|---|---|---|---|---|---|
| 惡夢-底比斯 曼陀羅草(白) | 23 | 580 | 2d42+21 | 10 | 1900 |
| 惡夢-底比斯 斯芬克斯(黑) | 50 | 2321 | 2d100+51 | 71 | 10573 |
| 惡夢-底比斯 尼荷斯(藍) | 52 | 2321 | 1d110+11 | 85 | 11564 |
| 惡夢-底比斯 阿努比斯 | 70 | 57400 | 4d118+238 | 138 | 23054 |
| 惡夢-底比斯 賀洛斯 | 70 | 45920 | 4d79+161 | 138 | 23054 |

→ 原版提卡爾與原版底比斯是同一等級帶（Lv23–60＋Lv70 雙王），故套用完全同一公式，惡夢-提卡爾與惡夢-底比斯同難度帶；惡夢杰弗雷庫(雄) 與 惡夢阿努比斯 數值一致（HP 57400、資料 4d132+133→載入後 BOSS 傷害曲線 4d118+238、命中 138、EXP 23054）。

## 3. 惡夢-提卡爾 裝備（巴特爾接合碎片 → 惡夢寶箱 → 成品）

| id | 名稱 | 主數值 | 原版對照 |
|---|---|---|---|
| `wpn_nm_kukulkan_spear` | 惡夢-提卡爾庫庫爾坎之矛 | dmgS 31、dmgL 26、hit 8、dmgBonus 3、mr 7、str 1、dex 2、pierceChance 95、惡魔之吻 10% | dmgS 24、dmgL 20、hit 5、mr 5、dex 2、pierceChance 90 |
| `wpn_nm_kukulkan_gauntlet` | 惡夢-提卡爾庫庫爾坎鐵手甲 | dmgS 5、dmgL 5、hit 3、dmgBonus 6、dex 2、mhp 45、rapidfire 100、惡魔之吻 10% | dmgS 3、dmgL 3、dmgBonus 4、dex 1、mhp 30、rapidfire 100 |
| `shd_nm_kukulkan` | 惡夢-提卡爾庫庫爾坎之盾 | ac 4、dr 3、mr 4、hitstunReduce 3 | ac 3、dr 2、hitstunReduce 2 |
| `hlm_nm_kukulkan` | 惡夢-提卡爾庫庫爾坎面具 | ac 4、mr 7、mpR 4、mdmg 1 | ac 3、mr 5、mpR 2 |
| `acc_nm_tikal_fang` | 惡夢-提卡爾杰弗雷庫尖牙 | dr 1、str 1、dex 1、mhp 45 | str 1、dex 1、mhp 30 |
| `acc_nm_tikal_eye` | 惡夢-提卡爾杰弗雷庫之眼 | mr 4、int 1、con 1、mmp 45 | int 1、con 1、mmp 30 |

- 寶箱：`item_nm_kukulkan_box_basic/high`（`NM_KUKULKAN_BOX_*`，成品 0.25%/0.75%，結構同庫庫爾坎寶箱）；碎片 `mat_nm_kukulkan_{basic,high}_{up,down}`（巴特爾配方 js/14）。
- 祭壇鑰匙 `item_nm_tikal_altar_key`（深處怪 2%）。BOSS：惡夢項鍊各 0.15%、高級寶箱 100%、龜裂之核 100%、卷軸 100%（同 NM 底比斯 BOSS 表）。

## 4. 惡夢-提卡爾 遺物（18 件 · 各 0.0001%）

| id | 名稱 | 掉落怪 | 效果 |
|---|---|---|---|
| `relic_nm_azt_mirror` | 惡夢．阿茲特的反光石 | 惡夢-提卡爾艾庫阿茲特 | ac 1、mr 4、惡夢艾庫阿茲特體內的幽紫反光石，扭曲無形法術更甚。無屬性抗性 +26。 |
| `relic_nm_azt_prism` | 惡夢．阿茲特的折射寶石 | 惡夢-提卡爾艾庫阿茲特(黃) | ac 1、mr 3、惡夢艾庫阿茲特凝結的折射寶石，分解四方元素之力。四屬抗性各 +7。 |
| `relic_nm_yuka_blowdart` | 惡夢．艾庫尤卡的吹箭 | 惡夢-提卡爾艾庫尤卡(藍) | dmgS 3、dmgL 3、hit 15、dmgBonus 12、rapidfire 35、惡夢艾庫尤卡的幽毒吹箭，快若疾風、連發如雨（需裝備箭矢）。 |
| `relic_nm_yuka_quiver` | 惡夢．艾庫尤卡的永續箭筒 | 惡夢-提卡爾艾庫尤卡(白) | dmgS 19、dmgL 9、惡夢艾庫尤卡取之不盡的幽影箭筒。 |
| `relic_nm_kaira_fang` | 惡夢．艾庫卡伊拉的毒牙 | 惡夢-提卡爾艾庫卡伊拉(藍) | dmgS 12、dmgL 12、hit 16、dmgBonus 11、惡夢艾庫卡伊拉的滴毒獠牙，撕咬之處毒咒纏身；對中毒目標傷害 +20%。 |
| `relic_nm_kaira_hood` | 惡夢．艾庫卡伊拉的華麗兜帽 | 惡夢-提卡爾艾庫卡伊拉(黃) | ac 9、dr 6、mr 4、惡夢艾庫卡伊拉的幽紫鱗紋兜帽，鮮豔奪目引敵注目。 |
| `relic_nm_bara_wing` | 惡夢．沾滿鱗粉的飛翼 | 惡夢-提卡爾艾庫巴拉 | ac 5、mr 38、惡夢艾庫巴拉沾滿幽紫鱗粉的薄翼，抖落的粉塵擾亂法術。魔防 +38。 |
| `relic_nm_bara_eye` | 惡夢．毒蛾的赤紅眼球 | 惡夢-提卡爾艾庫巴拉(紅) | ac 9、mr 4、惡夢艾庫巴拉的赤紫複眼，凝視劇毒亦無動於衷。免疫中毒。 |
| `relic_nm_eto_whip` | 惡夢．艾庫艾托的鞭笞藤 | 惡夢-提卡爾艾庫艾托 | dmgS 22、dmgL 22、hit 15、dmgBonus 16、pierceChance 100、惡夢艾庫艾托的幽藤長鞭，命中時 7% 使敵緩速；對緩速目標傷害 +14%。 |
| `relic_nm_eto_wand` | 惡夢．艾庫艾托的枯竭魔杖 | 惡夢-提卡爾艾庫艾托(枯竭) | dmgS 12、dmgL 12、hit 12、dmgBonus 12、mdmg 7、惡夢艾庫艾托枯竭的魔杖，榨乾魔力換取更毀滅之威（自動施法 MP×2、傷害×1.7）。 |
| `relic_nm_mud_idol` | 惡夢．特產易碎泥偶 | 惡夢-提卡爾薩德泥偶 | dmgS 26、dmgL 26、hit 16、dmgBonus 14、惡夢提卡爾的幽紫泥偶，猛擊爆裂卻反噬自身（反噬時間縮短）。 |
| `relic_nm_mud_jar` | 惡夢．祭祀儀式陶罐 | 惡夢-提卡爾薩德泥偶(黑) | ac 10、mr 4、惡夢提卡爾祭祀用的厚重陶罐，卸去衝擊護住頭首。 |
| `relic_nm_ska_soul` | 惡夢．阿茲特獻祭亡靈 | 惡夢-提卡爾薩德司卡(紫) | dmgS 33、dmgL 33、hit 1、int 3、con -2、mpR 13、惡夢阿茲特獻祭的亡靈化作幻術士的奇古獸；1.2% 即死並回復 6% HP。 |
| `relic_nm_ska_armguard` | 惡夢．薩德司卡石護臂 | 惡夢-提卡爾薩德司卡(紅) | ac 8、dr 1、mhp 30、惡夢薩德司卡剝落的石護臂，堅厚護體。臂甲（裝於副手，可與雙手武器並用）。 |
| `relic_nm_teo_hammer` | 惡夢．薩德提歐的玩具鎚 | 惡夢-提卡爾薩德提歐(藍) | dmgS 17、dmgL 16、hit 14、dmgBonus 17、str 1、惡夢薩德提歐揮舞的笨重玩具鎚，掄起帶起幽紫狂風。 |
| `relic_nm_teo_footprint` | 惡夢．薩德提歐的笨重足跡 | 惡夢-提卡爾薩德提歐(黃) | ac 8、con 1、惡夢薩德提歐踏出的足跡凝成的脛甲，沉穩厚實。 |
| `relic_nm_serpent_fang` | 惡夢．蛇神的倒勾獠牙 | 惡夢-提卡爾杰弗雷庫(雄) | dmgS 31、dmgL 26、hit 32、dmgBonus 17、mr 7、dex 2、pierceChance 95、惡夢杰弗雷庫的倒勾獠牙，纏繞幽紫蛇咒。與惡夢．蛇神的凝視同時裝備時：近距離傷害 +4、命中 +4、魔防 +6、HP +60。 |
| `relic_nm_serpent_gaze` | 惡夢．蛇神的凝視 | 惡夢-提卡爾杰弗雷庫(雌) | mr 4、int 2、con 1、mmp 70、惡夢杰弗雷庫凝視的幽光，於力竭時湧現魔力。與惡夢．蛇神的倒勾獠牙同時裝備時觸發套組效果。 |
| `relic_aden_guard_oath` | 反王近衛的誓約鎧 | 反王近衛騎士 | ac 14、dr 4、mhp 40、誓死效忠反王的近衛騎士之鎧，刻著叛軍誓詞。減傷 +4、HP +40，更易吸引敵人。 |
| `relic_aden_dk_flameblade` | 叛亂死騎的烈炎巨劍 | 反王死亡騎士 | dmgS 33、dmgL 36、hit 12、dmgBonus 18、str 2、投靠反王的死亡騎士所持烈炎巨劍。切割；火屬性；攻擊 8% 觸發大地崩裂（全體）。 |
| `relic_aden_court_grimoire` | 宮廷法師的禁咒項鍊 | 反王宮廷法師 | ac 2、mr 8、int 2、mpR 6、mdmg 5、反王宮廷法師封印禁咒的項鍊。智力 +2、魔法傷害 +5、MP恢復 +6。 |
| `relic_aden_rebel_longbow` | 叛軍神射手的長弓 | 反王弓箭手 | dmgS 6、dmgL 6、hit 14、dmgBonus 11、dex 2、rapidfire 40、亞丁城牆上叛軍神射手的長弓，連發 40%、無視硬皮（需裝備箭矢）。 |
| `relic_aden_assassin_blades` | 暗殺者的淬毒雙刃 | 反王黑暗妖精刺客 | dmgS 22、dmgL 15、hit 16、dmgBonus 16、dex 2、反王麾下黑暗妖精刺客的淬毒雙刃。連擊 35%；4% 使敵中毒；對中毒目標傷害 +18%。 |
| `relic_aden_icemaid_veil` | 冰之侍女的霜紗 | 賽尼斯的冰之侍女 | ac 9、侍奉水之魔女的冰之侍女所披霜紗。迴避 +6（迴避轉減傷）、水抗 +15、冰凍耐性 +20。 |
| `relic_aden_ken_crown` | 反王肯恩的叛逆王冠 | 反王肯恩 | ac 10、str 2、con 2、mhp 80、篡奪亞丁王位的反王肯恩之冠。與賽尼斯的水精之淚同時裝備時：HP/MP +100、HP/MP 恢復 +10、減傷 +3。 |
| `relic_aden_cerenis_tear` | 賽尼斯的水精之淚 | 水之魔女賽尼斯 | ac 1、mr 10、int 2、mdmg 4、水之魔女賽尼斯為肯恩流下的淚凝成的耳環。每 10 秒免費施放一次冰雪暴（全體）。 |

套組：惡夢．蛇神的倒勾獠牙＋惡夢．蛇神的凝視 → 近傷+4、近命+4、魔防+6、HP+60（js/02）。反王肯恩的叛逆王冠＋賽尼斯的水精之淚 → HP/MP+100、HP/MP恢復+10、減傷+3。

## 5. 亞丁城堡 怪物（race `反王軍` → 人型／地）

| id | 名稱 | Lv | HP | AC | MR | 傷害 | 命中 | EXP | 技能 | 動畫 |
|---|---|---|---|---|---|---|---|---|---|---|
| `aden_c_knight` | 反王近衛騎士 | 84 | 22000 | -118 | 100 | 3d125+85 | 118 | 11200 | — | alias 黑騎士 |
| `aden_c_deathknight` | 反王死亡騎士 | 86 | 25000 | -122 | 105 | 3d132+90 | 120 | 12500 | 地獄火 | alias 死亡騎士 |
| `aden_c_mage` | 反王宮廷法師 | 83 | 18000 | -108 | 130 | 2d110+70 | 110 | 10500 | 火球 | alias 黑法師 |
| `aden_c_archer` | 反王弓箭手 | 82 | 16000 | -100 | 95 | 2d120+60 | 125 | 10000 | — | alias 火焰弓箭手 |
| `aden_c_darkelf` | 反王黑暗妖精刺客 | 83 | 19000 | -112 | 100 | 2d115+70 | 130 | 10800 | 中毒 | alias 黑暗妖精士兵 |
| `aden_c_icemaid` | 賽尼斯的冰之侍女 | 84 | 19000 | -105 | 140 | 2d110+70 | 112 | 11000 | 冰矛圍籬 | alias 冰之女王侍女 |
| `aden_ken` | 反王肯恩 | 90 | 150000 | -165 | 150 | 4d190+170 | 168 | 36000 | 放射斬／衝擊波動 | 新 `assets/anim/反王肯恩/` |
| `aden_cerenis` | 水之魔女賽尼斯 | 88 | 110000 | -158 | 190 | 3d150+120 | 160 | 32000 | 流星雨／冰雪暴／中級治癒術 | 新 `assets/anim/水之魔女賽尼斯/` |

對照：納薩力克雜兵 Lv90–91 HP 28k–35k EXP 11.5k–12.5k；昴宿星團 BOSS Lv92–96 HP 92k–120k、4d175~189+159~177。亞丁城堡定位＝NM 底比斯之上、納薩力克之下的野外頭目圖；反王肯恩 HP 150k 為目前單體野外頭目最高之一，水之魔女賽尼斯會自我治癒（2500–4000）＋流星雨＋冰雪暴（冰凍）。

## 6. 亞丁城堡 裝備

| id | 名稱 | 部位 | 主數值 | 掉落 |
|---|---|---|---|---|
| `hlm_rebel_king` | 反王頭盔 | helm | ac 6、mr 8、str 1、mhp 30 | 肯恩 0.3% |
| `amr_rebel_king` | 反王盔甲 | armor | ac 12、dr 3、mhp 60 | 肯恩 0.2% |
| `glv_rebel_king` | 反王手套 | gloves | ac 5、dex 1 | 肯恩 0.3%／近衛騎士 0.02% |
| `bot_rebel_king` | 反王長靴 | boots | ac 6、mhp 30 | 肯恩 0.3%／死亡騎士 0.02% |
| `wpn_ken_scepter` | 反王肯恩的權杖 | wpn | dmgS 25、dmgL 21、hit 8、dmgBonus 12、mr 8、str 1、惡魔之吻 12% | 肯恩 0.15% |
| `hlm_cerenis` | 賽尼斯頭箍 | helm | ac 5、mr 8、int 2、mpR 3 | 賽尼斯 0.3%／刺客 0.02% |
| `amr_cerenis` | 賽尼斯斗篷 | armor | ac 9、mr 10、mmp 60、mdmg 2 | 賽尼斯 0.2% |
| `glv_cerenis` | 賽尼斯手套 | gloves | ac 4、mdmg 2 | 賽尼斯 0.3%／宮廷法師 0.02% |
| `bot_cerenis` | 賽尼斯長靴 | boots | ac 5、mr 6、mpR 3 | 賽尼斯 0.3%／冰之侍女 0.02% |
| `wpn_cerenis_staff` | 賽尼斯的水晶魔杖 | wpn | dmgS 28、dmgL 26、hit 6、dmgBonus 6、mr 8、int 3、mpR 12、mdmg 6、惡魔之吻 12% | 賽尼斯 0.15% |

- **反王套裝（4 件，set `rebel`）**：防禦-10、HP+100、HP自然恢復+12、減傷+2、近距離傷害+4，變身「反王肯恩」（POLY_TIERS 既有形態）。原作：防禦-3、hpr+12、變身反王肯恩。
- **賽尼斯套裝（4 件，set `cerenis`）**：防禦-6、MP+100、MP自然恢復+12、魔防+10、魔法傷害+3，變身「賽尼斯」。原作：防禦-2、MP+100、mpr+12、變身賽尼斯。
- 對照：真．冥皇 5 件 AC 7/10/6/5/7＋套裝防禦-20；NM 底比斯雙手劍 28/34+3。

## 7. 亞丁城堡 遺物（8 件 · 各 0.0001%）

（見上方第 4 節表格後段 relic_aden_*）

## 8. 素材來源

- 反王肯恩／賽尼斯 BOSS 動畫：**由天堂原作 NPC 靜態圖製作（非原作動畫）**。來源 https://loalineage.com/assets/npcgfx/2419-90732a57.png （反王肯恩）、https://loalineage.com/assets/npcgfx/2468-e1771db6.png （賽尼斯）；以 31 張同站 npcgfx 逐像素眾數重建地磚去背、去投影、×3 放大，再走納薩力克 optical-flow 動作轉移管線（`/workspace/build_nazarick_multisource.py`；肯恩套 死亡騎士 模板、賽尼斯套 玩家女法師 模板）。腳本 `work/tikaladen-src/build_aden_anim.py`。
- 反王／賽尼斯套裝、權杖圖示：天堂原作 invgfx（loalineage.com），去黑底放大 2×；賽尼斯的水晶魔杖＝原作「水晶魔杖」圖染藍（裝備本身為自訂）。亞丁遺物圖示同為原作 invgfx 改色。
- 惡夢-提卡爾 圖示／背景／怪物圖：原版提卡爾素材加淡紫幽光（沿用 `work/nightmare-thebes/make_assets.py` 的 purple_aura / tint_full / tint_bg）。腳本 `work/tikaladen-src/make_assets.py`。
- 魔女「賽里斯」＝天堂原作 **賽尼斯（Cerenis）**，反王肯恩的戀人、水之魔女；因遊戲已有攻城敵人「魔女賽尼斯／賽尼斯」（alias 玩家女法師），BOSS 命名「水之魔女賽尼斯」避免動畫 alias 衝突。

## Boss anim hotfix 2 — kenarm (2026-09-26)
- Arms now rotate at the shoulder joints for 反王肯恩 / 水之魔女賽尼斯 (was whole-body transform only).
- Build: `work/kenfix-src/build_kenarm.py` (kenfix builder + `Rig` arm compositor) with masks in `work/kenfix-src/arms.py`
  (native-res arm masks; Ken sword arm = upper arm @shoulder + forearm/hand/blade @elbow two-bone chain; torso gaps inpainted).
  Output `work/kenfix-src/out-arm/`; preview `python preview.py <out-arm/> /workspace/ken-cerenis-anim-preview-v2`.
- Same file names / counts as kenfix, no deletions, no JS change. Bundle `work/kenarm-20260926a-deploy/`.
