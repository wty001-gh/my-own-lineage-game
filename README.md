# Idle Lineage（放置天堂）

以《天堂》為題材的網頁放置型 RPG：自動掛機打怪、轉職與技能、裝備強化、怪物卡片、遺物、傭兵（多存檔角色互相協力）、血盟據點、無盡試煉塔、世界事件、天氣晝夜，以及冒險者公會（委託板、野外頭目懸賞與蓄力打斷、公會設施、成員好感度）。另含變形控制戒指可選的自訂角色動畫（綠甲女騎士、金髮女騎士）。

- 目前版本：**v3.8.122**（快取標籤 `guild.20261008f`，見 `version.json`）
- 純前端（HTML／CSS／JavaScript），存檔使用瀏覽器 localStorage，無需伺服器端程式。

## 給其他 Grok／Cursor bot：如何 clone

此 repo 為 **私人**（`wty001-gh/idle-lineage`）。要拉程式碼需具備以下其一：

1. 以已登入、且對此 repo 有讀取權限的 `gh` 帳號操作（作者本機是 `wty001-gh`，scope 含 `repo`）：
   ```bash
   gh auth status
   gh repo clone wty001-gh/idle-lineage
   # 或
   git clone https://github.com/wty001-gh/idle-lineage.git
   ```
2. 被邀請為 collaborator 後，用自己的 GitHub 帳號／token clone。

未授權的 bot／帳號會得到 404，這是預期行為。

## 執行方式

- **PC 版**：用瀏覽器開啟 `index-pc.html`；`index.html` 為通用／手機版入口。
- **PWA**：建議以本機靜態伺服器提供（例如在專案根目錄執行 `python3 -m http.server 8080`，再開 `http://localhost:8080/index-pc.html`），即可安裝為 PWA 並啟用 Service Worker（`sw.js`）離線快取。
- 直接以 `file://` 開啟時，Service Worker 及部分功能可能無法使用。

## 目錄

| 路徑 | 內容 |
|---|---|
| `index-pc.html`／`index.html`／`index-live.html` | 遊戲入口 |
| `js/` | 遊戲主程式（依檔名序號載入；含 `51–54` 公會） |
| `afk-*.js` | 外掛式功能模組（完整清單見 PC 部署；本 repo 目前僅含開發機上的子集） |
| `css/` | 樣式 |
| `assets/` | 圖片、動畫幀（含 `anim/`、`morphanim/` 騎士變形）、立繪、圖示 |
| `docs/` | 設計與資料表文件（含 `docs/design/guild-v1.md`） |
| `sw.js`／`manifest.webmanifest` | PWA |
| `preview-sprite.html` | 騎士 sprite 預覽頁 |

## 尚未納入的檔案（僅存在於作者 PC）

同步當下 PC 離線，下列約 94 個 HTML 參照檔尚未從 `idle-lineage-class-20260825-1924` 拷入，**目前無法完整執行完整 PC 版**：

- 程式：`js/17-audio.js`、`js/18-misc-book.js`、`js/19-equipment-window.js`、`js/20-warehouse-window.js`、`js/26-world-channel.js`、`js/28-pvp-arena.js`、`js/29-siege-v2-data.js`、`js/30-siege-v2.js`、`js/31-castle-guards.js`、`js/32-threat.js`、`js/anim-manifest.js`
- 樣式：`css/tailwind-built.css`、`css/floating-ui.css`
- 約 66 個根目錄 `afk-*.js`（例如 `afk-skin.js`、`afk-mobile.js`；repo 已有開發機上的 14 個）
- 圖片：`assets/logo/*logo.png`、`assets/start/prince/714.png`、`assets/ui/castle-crown.gif`、`public/assets/login/` 等

之後 PC 上線時再補齊並更新本節。

## 版權

私人專案。《天堂》（Lineage）相關名稱與素材版權屬原權利人。
