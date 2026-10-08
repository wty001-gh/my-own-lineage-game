# 納薩力克地下大墳墓（Nazarick Great Tomb）— 結構設計

> 狀態：**結構／流程設計 only**（2026-09-20）。  
> **不實作**怪物數值、EXP、裝備、掉落。主題怪／階層王圖與動畫另開 art/anim pipeline。  
> 安茲動畫素材已備：`/workspace/ainz-anim-out/安茲烏爾恭/`（約 101 幀／含 `_icon`、`attack_*`、`attack_s_*` 等）。

---

## 1. 世界觀形狀（權威）

納薩力克地下大墳墓＝**倒三角**：挑戰方向是 **向下**。

| 位置 | 樓層 | 意義 |
|---|---|---|
| **頂端（入口／起點）** | **F10 → F9** | 昴宿星團（戰鬥女僕） |
| 中段 | F8 → F4 | 各階層王領域，越深越難 |
| **最底（終局）** | **F1** | 雅兒貝德 ＋ 安茲烏爾恭 |

擊敗該層 **階層王（guardian）→ 自動下降一層**（不必手動選圖）。

---

## 2. 推薦進度 TOP → BOTTOM

| 樓層 | 地圖顯示名（繁中） | 階層王／主題 | 建議 map ID | 備註 |
|---:|---|---|---|---|
| **10** | 納薩力克．昴宿星團（上層） | 昴宿星團戰鬥女僕（主題／可多隻 maid boss） | `nazarick_f10` | 頂端起點 |
| **9** | 納薩力克．昴宿星團（下層） | 昴宿星團（延續／可另名 maid） | `nazarick_f9` | 可與 F10 合併為一圖（見 §4） |
| **8** | 納薩力克．第8階層 | **威克提姆**（Victim） | `nazarick_f8` | 天使／聖域感 |
| **7** | 納薩力克．第7階層 | **迪米烏哥斯**（Demiurge） | `nazarick_f7` | 惡魔／熔爐 |
| **6** | 納薩力克．第6階層 | **亞烏拉 ＋ 馬雷**（Aura + Mare） | `nazarick_f6` | 雙守護者（可 dual） |
| **5** | 納薩力克．第5階層 | **科塞巴斯**（Cocytus） | `nazarick_f5` | 冰／蟲甲殼 |
| **4** | 納薩力克．第4階層 | **加戈蘭圖亞**（Gargantua） | `nazarick_f4` | 巨像／高崙 |
| **3** | 納薩力克．夏提雅領域（上層） | 夏提雅領域／吸血鬼 | `nazarick_f3` | 可與 F2 合併 |
| **2** | 納薩力克．夏提雅領域（下層） | **夏提雅**（Shalltear） | `nazarick_f2` | 階層王房可放此層 |
| **1** | 納薩力克．王座之間 | **雅兒貝德 ＋ 安茲烏爾恭** | `nazarick_f1` | 最深終局；建議 dual BOSS |

可選安全區入口（比照 `town_pride`／`town_rift`）：

| ID | 顯示名 | 用途 |
|---|---|---|
| `town_nazarick` | 納薩力克．大墳墓入口 | 開始下降／回入口；**不**自動出怪 |

---

## 3. 既有系統對照（已讀程式）

### 3.1 地圖選單／地區

- **分類下拉資料**：`js/11-world-map.js` → `MAP_CATEGORIES`（village／wild／dungeon／special／tower／rift／pirate_island）
- **地區分組**：同檔 `MAP_REGIONS`（**新增地圖必須兩邊都加**，否則不下拉）
- **惡夢-底比斯**：掛在 `rift`（`thebes_nm_desert`／`thebes_nm_pyramid`／`thebes_nm_temple`）
- **腐敗-精靈墓穴**：掛在 `wild` + 地區 `burningwillow`（與 `elf_grave` 同區）
- 出怪池：`js/00-data.js` → `DB.maps[mapId] = [mobId, ...]`（陣列即可；空陣列 `[]` 安全，見 `arena_pvp`）

### 3.2 「頭目清算 → 下一張圖」既有 pattern（優先複用）

| Pattern | 旗標設定（`killMob`） | 清算消費（`settleDeadMobs`） | 推進函式 | 適配納薩 |
|---|---|---|---|---|
| **傲慢之塔攀登** | `state._prideAdvance = true`（`js/05-kill-progression.js` ~609） | ~655–658 → `prideOnBossKill()` | `enterPrideFloor(n)`：直接改 `mapState.current`、重排 spawn，**不走** `changeMap` | **最佳模板**：改為下降 `n-1` |
| **侵蝕安塔瑞斯** | `state._antAdvance = mob.n` | → `antharasOnBossKill` | 區間陣列 `ANTHARAS_AREAS` 往下一區 | 適合「少數大區」分組方案 |
| **遺忘之島傳送門** | `state._oblivionAdvance` | → `oblivionOnPortalKill` | 途中→本島 | 僅單次跳轉 |
| **軍王之室／雙祭壇** | `state._kbVictory`（`KING_ROOMS` dual） | 有鑰匙重生／無鑰匙回村 | `kbVictoryTeleport`／`kbRoomRespawn` | F1 dual（雅兒＋安茲）可學 `thebes_nm_temple` dual；**通關後**另接下降或結算回入口 |

**本專案選定 hook（權威）：**

1. 在 `killMob`（`js/05-kill-progression.js`）於 `_prideAdvance`／`_antAdvance` 旁加：  
   `if (state.nazarickDescend && mob.boss && !player.dead) state._nazarickAdvance = true;`
2. 在 `settleDeadMobs` 同檔消費：  
   `if (state._nazarickAdvance) { state._nazarickAdvance = false; nazarickOnGuardianKill(); }`
3. 新函式（建議放同檔 05，鏡像 `prideOnBossKill`／`enterPrideFloor`）：
   - `startNazarickDescend()` — 自 F10（或合併後的頂圖）開始，`state.nazarickDescend = true`，`state.nazarickFloor = 10`
   - `enterNazarickFloor(n)` — `mapState.current = 'nazarick_f' + n`（或查表到合併 mapId）
   - `nazarickOnGuardianKill()` — `next = floor - 1`；若有下一層則 `enterNazarickFloor(next)`；若已清 F1 則結算並 `setMapSelectors('town_nazarick'); changeMap(true)`

> ⚠️ 手動擊殺必須在設旗標**之後**才呼叫 `settleDeadMobs()`（既有註解 v3.5.94 已強調，勿打破順序）。

### 3.3 與底比斯／腐敗的差異

- 惡夢-底比斯／腐敗墓穴＝**靜態選單地圖**，清完不自動換圖（祭壇靠鑰匙＋`KING_ROOMS`／`PURE_BOSS_MAPS`）。
- 納薩＝**流程性下降地城**，行為對齊傲慢之塔攀登，方向相反。

---

## 4. 地圖數量策略（若 UI 想少圖）

若不想一次掛 10 張選單圖，可 **合併**，但 **階層王清除後仍要 auto-descend**（換到下一組 mapId）：

| 方案 | 地圖數 | 合併 | 下降鏈 |
|---|---:|---|---|
| **A. 全樓層**（預設實作目標） | 10 + 入口 | 無 | F10→…→F1 |
| **B. 分組**（對齊底比斯「少數大區」） | 8 + 入口 | `nazarick_pleiades`＝F10+F9；`nazarick_shalltear`＝F3+F2 | 清 Pleiades 王 → F8；清 Shalltear 王 → F1 |
| **C. 極簡** | 4 + 入口 | 頂／中／夏提雅／王座 | 僅 3 次 auto-descend；**不建議**（樓層感弱） |

**建議先做 A**（`nazarick_f10`…`nazarick_f1`），選單可只露 `town_nazarick`＋「開始下降」按鈕；攀登中樓層用 `mapRegionOf` 特判（同 `pride_f*` → `tower`）。

---

## 5. 世界下拉掛點（實作時）

建議新地區，避免塞進 `rift`／`burningwillow`：

```text
MAP_CATEGORIES.nazarick = [
  { v:'town_nazarick', t:'納薩力克．大墳墓入口', c:'#fde68a' },
  // 可選：farming 用合併圖；攀登中的 nazarick_fN 可不列選單
];

MAP_REGIONS 加：
{ key:'nazarick', label:'納薩力克地下大墳墓', maps:[
  { v:'town_nazarick', t:'大墳墓入口' },
]}
```

`mapRegionOf`：`v.startsWith('nazarick_f')` → `'nazarick'`（比照 `pride_f`）。

背景：`applyAreaBackground`（`js/11-world-map.js`）之後再掛 tomb／暗色資產（art 任務）。

---

## 6. 雜兵（trash）— 只 REUSE 既有 `DB.mobs`（不要新圖）

後期再調強度；此處僅 **主題對應候選**（名稱來自現行 `js/00-data.js`）。

| 樓層 | 主題 | 建議 reuse mob id（顯示名） |
|---:|---|---|
| F10–F9 | maid／人型侍從 | `ice_maid`（冰之女王侍女）、`b_knight`（黑騎士）、`nm_011`（黑騎士搜索隊）、`de_gate_soldier`（黑暗妖精士兵）、`de_lab_mage`（黑暗妖精法師）、`fighter`（妖魔鬥士） |
| F8 | 天使／聖（遊戲無真天使） | 暫代：`iv_lightball`（象牙塔閃電球）、`elder`（長老）、`fallen_priest1`／`fallen_priest2`（墮落的司祭）、`griffon`（格利芬）、`phoenix`（不死鳥）— **正式天使／Victim 本體走新 art** |
| F7 | 惡魔 | `succubus`（思克巴）、`pride_imp`（小惡魔）、`flame_imp`（炎魔的小惡魔）、`flame_demon`（炎魔的惡魔）、`ashitakio`（阿西塔基奧）、`cerberus`（地獄犬）、`baphomet`（巴風特）、`iv_spirit`（象牙塔惡靈） |
| F6 | 黑暗妖精／野獸 | `dark_elf`（黑暗精靈）、`de_gate_soldier`／`de_gate_general`、`de_lab_mage`、`wolf`（狼人）、`ice_wolf`（冰原狼人）、`bear`（歐熊）、`demon_bear`（魔熊）、`lycan`（萊肯）、`harpy`（哈維） |
| F5 | 昆蟲／甲殼 | `ant`（巨蟻）、`giant_ant`（巨大兵蟻）、`ant_guard`（巨大守護螞蟻）、`scorpion`（毒蠍）、`spider`（夏洛伯）、`ungoliant`（楊果里恩）、`metal_centipede`（金屬蜈蚣）、`thebes_scarab`（底比斯 聖甲蟲） |
| F4 | 高崙／巨像 | `stone_golem`（石頭高崙）、`lava_golem`（熔岩高崙）、`iv_stone_golem`／`iv_iron_golem`、`pride_irongolem`（恐怖的鋼鐵高崙）、`thebes_obelisk`（底比斯 尖碑石奴）、`cyclops`（獨眼巨人）、`giant`／`giant_warrior`、`tomb_guardian_giant`（巨大墳墓守護者） |
| F3–F2 | 吸血鬼／不死 | `zombie`（人形殭屍）、`skeleton`／`skel_archer`、`ghoul`（食屍鬼）、`pride_marcus_vampire`（馬昆斯吸血鬼）、`harpy`（哈維）、`tomb_guardian`（墳墓守護者）、`demon_bat`（魔蝙蝠）— **夏提雅本體新 art** |
| F1 | 王座雜兵（可極少） | 可沿用 F2–F3 不死，或幾乎空池、只放 dual BOSS（比照 `thebes_nm_temple`） |

**階層王／主題命名怪**：本階段 **不建** `DB.mobs` 條目、不調 stats；僅在 NOTES／本表保留顯示名，等 web 圖＋anim。

---

## 7. 階層王清單（art／anim 待辦，非本任務）

| 樓層 | 繁中名 | 之後 mob id 草案（未實作） | 素材備註 |
|---:|---|---|---|
| 10–9 | 昴宿星團（女僕群） | `naz_pleiades_*` | 多隻或輪替 |
| 8 | 威克提姆 | `naz_victim` | |
| 7 | 迪米烏哥斯 | `naz_demiurge` | |
| 6 | 亞烏拉、馬雷 | `naz_aura`、`naz_mare` | dual 可學 KING_ROOMS |
| 5 | 科塞巴斯 | `naz_cocytus` | |
| 4 | 加戈蘭圖亞 | `naz_gargantua` | |
| 2 | 夏提雅 | `naz_shalltear` | |
| 1 | 雅兒貝德、安茲烏爾恭 | `naz_albedo`、`naz_ainz` | 安茲 anim 已在 `ainz-anim-out/安茲烏爾恭/` |

---

## 8. 明確不做（本階段）

- 不寫 drops（`01-drops-config.js`）
- 不調 mob HP／EXP／AC／裝備
- 不 scrape 圖片、不 deploy 到 PC
- 不把空地圖掛進 live `MAP_CATEGORIES`（避免玩家點進空圖）— stub 僅放 `work/nazarick/`

---

## 9. 下一步（給 art／anim／實作 pipeline）

1. Art：各階層王＋主題 trash 立繪／icon（安茲可直接吃現有 out）
2. Anim：對齊既有 mob 幀命名（`attack_*`／`attack_s_*`／`_icon`）
3. 實作：依 `work/nazarick/NOTES.md` 改 `05`／`11`／`00-data`／`03`（PURE_BOSS／KING_ROOMS dual）
4. 強度／掉落：另開數值任務（晚遊戲）
