# Portrait paths v1（立繪路徑）

> 日期：2026-10-20（Asia/Taipei）· Idle Lineage account-party 並排入口

## 目錄

| 用途 | 相對路徑（相對遊戲根目錄） |
|------|---------------------------|
| 遊戲內建 v8 立繪（全圖） | `assets/portraits/v8-{cls}-{n}.webp` |
| 遊戲內建 v8 縮圖 | `assets/portraits/v8-{cls}-{n}-t.webp` |
| Grok 程式庫匯入 | `assets/portraits/grok-library/` |
| 原版職業頭 | `assets/character/{avatar}.png` |

目前每職有 **5** 張 v8（`n = 1..5`），八職共 **40** 全圖 + **40** 縮圖 = **80** 檔。

## portraitId 協定

| 方案 | 例子 | 解析結果 |
|------|------|----------|
| `v8:cls-n` | `v8:knight-3` | `assets/portraits/v8-knight-3.webp`（縮圖加 `-t`） |
| `orig:avatar` | `orig:女騎士` | `assets/character/女騎士.png` |
| `grok:filename`（預留） | `grok:aria-01.png` | `assets/portraits/grok-library/aria-01.png` |
| `null` | — | UI 回落職業預設頭（`charPortraitUrl`） |

對照表由 `js/47-portraits.js` 的 `PORTRAIT_DB` → `PORTRAIT_BY_ID` 建立：

```text
id:  'v8:' + cls + '-' + i
file: 'assets/portraits/v8-' + cls + '-' + i + '.webp'
thumb:'assets/portraits/v8-' + cls + '-' + i + '-t.webp'
```

名冊／組隊 UI（`js/61-party-ui.js` → `_portraitUrl`）優先讀 `PORTRAIT_BY_ID`；若缺表仍可用 `v8:`／`grok:` 直接拼路徑。

## 英雄綁定（HERO_DB）

- 每職最多綁 5 個已存在的 `v8:cls-1..5`（有檔才綁，唔發明檔名）。
- 其餘英雄 `portraitId: null`，等 Grok 匯入或新 v8 再開。
- 只影響 **account-party** 入口（`index-account.html` / `index-account-pc.html`）；原版 `index-pc.html` 唔改。

## PC 路徑

```text
C:\Users\user\Desktop\lingeage\idle-lineage-class-20260825-1924\assets\portraits\
C:\Users\user\Desktop\lingeage\idle-lineage-class-20260825-1924\assets\portraits\grok-library\
```

Grok Library 下載完成後，檔案應放入 `grok-library\`，再按需把對應英雄的 `portraitId` 設成 `grok:<檔名>`。
