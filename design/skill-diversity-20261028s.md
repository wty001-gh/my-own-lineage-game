# 技能多元化定案（ab.20261028s）

來源：用戶技能池 Excel「技能池／星數倍率／傷害公式」sheet；對照 `js/74-skill-pool.js`、`js/60-heroes.js`。

## 問題

1. **HERO_DB.skills 成組複製**：同職多隻英雄 skills 陣列完全一樣（最嚴重：妖精 9 人同一組、騎士／戰士／黑暗／龍騎各 8 人同一組）。
2. **戰鬥 resolve 只拎稀有度第一技**：冇 UNIQUE 嘅同職同稀有度英雄，實際出招完全一樣（`primaryOf(cls, rarity)[0]`）。
3. **倍率唔夠顯眼**：棋子詳情已有「技能倍率 ×m」，但圖鑑／名冊管理／出招 callout 未統一顯示。

## 規則

| 項目 | 定案 |
|------|------|
| 士兵／基本兵 | 只 N 級技 ×0.85；唔派 R+ 控場大招 |
| 英雄戰鬥技 | `AB_HERO_ASSIGN[defId]` → 池內技；有 UNIQUE 仍優先 |
| 簽名技 | 每英雄至少 1 個 UNIQUE 或極少共用技；同職同稀有度唔可完全相同 skills／assign |
| SSR／SR | 差異要明顯（不同池檔技或 UNIQUE） |
| 顯示技 HERO_DB.skills | 重配 Lineage `DB.skills` id；唔成組複製；可與戰鬥技名呼應但唔必 1:1 |
| 倍率顯示 | 圖鑑詳情、英雄管理、棋子詳情、出招 callout；數字跟 STAR_MUL／PERM／heroSk／士兵 ×0.85／專武星 |

## 倍率（跟 Excel「星數倍率」「傷害公式」）

- 局內合成星（技能）：1★×1／2★×1.5／3★×2.25
- 永久星（技能）：0–2★×1／3★×1.15／4★×1.3／5★×1.5
- 專武星（技能）：3★×1.08／4★×1.14／5★×1.22
- 非 UNIQUE 英雄再 ×1.15（BAL.heroSk）；士兵再 ×0.85
- 技能說明內嘅「N×」係技能本體係數（Excel 效果欄），疊加喺上面總倍率 `m` 之後

## 實裝摘要

- `74-skill-pool.js`：`AB_HERO_ASSIGN` + resolve 跟 defId；`API.info` 回傳 power／mul 文案
- `60-heroes.js`：全庫 skills 重配（開放英雄優先唔撞）
- `70-autobattle.js`：UNIQUE 維持原有 USK 實作（銀誓／王權／虛像／北境斧／衝擊／治癒／潮汐等）；KNIGHT assign 擴；callout 顯示 ×m；百科段
- `61-party-ui.js`／`71-ab-only.js`：管理／圖鑑顯示戰鬥技＋倍率
- cache → **ab.20261028s**（唔部署）

## 倍率顯示位置（ab.20261028s）

| 位置 | 檔案 | 內容 |
|------|------|------|
| 棋子詳情 | `70` detailHtml | 技能名＋總倍率 ×m＋倍率構成＋本體說明（API.info 含［本體］） |
| 出招 callout | `70` skillCallout | 招式名後 `×m` |
| 名冊管理 | `61-party-ui` | ⚔ 自走棋技能＋［本體］＋總倍率（1★局內・永久星） |
| 圖鑑詳情 | `71-ab-only` | ⚔ 自走棋技能＋［本體］＋總倍率 |
| 百科 | `70` wiki | ㉟½ 技能多元化段 |
