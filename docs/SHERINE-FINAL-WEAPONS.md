# 席琳．最終武器（art + stats）

**命名方案：** 統一前綴 **`席琳．`**（淡金／瘋狂席琳結晶主題）。  
- 不用 `真．`（已用於真．冥皇系列基底）  
- 不用 `究極．`（技能用詞）  
- 取得途徑 **TBD**（無掉落／商店／NPC；`gachaWeight:0`；可用 `gainItem`）

**視覺：** 既有武器圖 → 淡黃／奶油金光暈＋淡金邊框（對齊 `瘋狂席琳結晶`）。  
**標記：** `legend:true` + `sherineFinal:true` → 名稱 `c-sherine-mad`、圖示 `sherine-mad-glow-icon`。

## 對照表

| 角色 | base id | base 名 | new id | new 名 | 關鍵數值變化 |
|------|---------|---------|--------|--------|--------------|
| 騎士／矛 | `wpn_ancient_spear` | 古代神之槍 | `wpn_sherine_ancient_spear` | 席琳．古代神之槍 | 27/30→**32/36** hit3→5 db5→**10** pierce90→**95** str+1 |
| 法師／杖 | `wpn_holycrystal_wand` | 聖晶魔杖 | `wpn_sherine_holycrystal_wand` | 席琳．聖晶魔杖 | 13/15→**16/19** hit8→10 int2→**3** mdmg8→**12** mmp50→**80** 落雷10→**15**% |
| 黑暗／雙刀 | `wpn_redshadow_dual` | 紅影雙刀 | `wpn_sherine_redshadow_dual` | 席琳．紅影雙刀 | 27/18→**32/22** hit10→12 db18→**24** combo35→**45** 遲滯10→**15** dex/wis+3 |
| 妖精／弓 | `wpn_rotten_longbow` | 腐壞的長弓 | `wpn_sherine_rotten_longbow` | 席琳．腐壞的長弓 | 5/4→**8/7** hit7→10 db5→**10** 連射100 貫穿 dex+1 |
| 多職／匕首 | `wpn_windblade_dagger` | 風刃短劍 | `wpn_sherine_windblade_dagger` | 席琳．風刃短劍 | 23/16→**27/19** hit10→12 db10→**15** mhp100→**150** vamp10→**15**% dex+3 |
| 騎士龍騎／雙手劍 | `wpn_emperor_blade` | 真．冥皇執行劍 | `wpn_sherine_emperor_blade` | 席琳．冥皇執行劍 | 28/33→**33/39** hit5→7 db20→**28** str3 dex2 stun+30 |
| 幻術／奇古獸 | `wpn_qigu_frost` | 寒冰奇古獸 | `wpn_sherine_qigu_frost` | 席琳．寒冰奇古獸 | 25/25→**30/30** hit0→2 mdmg1→**3** int1→**2** legend+mindbreak |
| 龍騎／鎖鏈劍 | `wpn_chain_frost` | 寒冰鎖鏈劍 | `wpn_sherine_chain_frost` | 席琳．寒冰鎖鏈劍 | 24/20→**29/25** hit4→6 db3→**8** 裂術骰[8,4]→**[8,6]** 機率1→**3**% heal20→**25**% |
| 戰士／斧 | `wpn_ancient_axe` | 古代神之斧 | `wpn_sherine_ancient_axe` | 席琳．古代神之斧 | 25/28→**30/34** hit3→5 db8→**14** str+1 |

## Console

```js
gainItem('wpn_sherine_ancient_spear',1);
gainItem('wpn_sherine_holycrystal_wand',1);
gainItem('wpn_sherine_redshadow_dual',1);
gainItem('wpn_sherine_rotten_longbow',1);
gainItem('wpn_sherine_windblade_dagger',1);
gainItem('wpn_sherine_emperor_blade',1);
gainItem('wpn_sherine_qigu_frost',1);
gainItem('wpn_sherine_chain_frost',1);
gainItem('wpn_sherine_ancient_axe',1);
```

