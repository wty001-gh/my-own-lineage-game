# Idle Lineage（放置天堂）

以《天堂》為題材的網頁放置型 RPG：自動掛機打怪、轉職與技能、裝備強化、怪物卡片、遺物、傭兵（多存檔角色互相協力）、血盟據點、無盡試煉塔、世界事件、天氣晝夜，以及冒險者公會（委託板、野外頭目懸賞與蓄力打斷機制、公會設施、成員好感度）。

- 目前版本：**v3.8.119**（快取標籤 `guild.20261008c`，見 `version.json`）
- 純前端（HTML／CSS／JavaScript），存檔使用瀏覽器 localStorage，無需伺服器端程式。

## 執行方式

- **PC 版**：用瀏覽器開啟 `index-pc.html`；`index.html` 為通用／手機版入口。
- **PWA**：建議以本機靜態伺服器提供（例如在專案根目錄執行 `python3 -m http.server 8080`，再開 `http://localhost:8080/index-pc.html`），即可安裝為 PWA 並啟用 Service Worker（`sw.js`）離線快取。
- 直接以 `file://` 開啟時，Service Worker 及部分功能可能無法使用。

## 目錄

| 路徑 | 內容 |
|---|---|
| `index-pc.html`／`index.html`／`index-live.html` | 遊戲入口 |
| `js/` | 遊戲主程式（依檔名序號載入） |
| `afk-*.js` | 外掛式功能模組 |
| `css/` | 樣式 |
| `assets/` | 圖片、動畫幀、立繪、圖示 |
| `docs/` | 設計與資料表文件 |
| `sw.js`／`manifest.webmanifest` | PWA |

## 尚未納入的檔案

此版本由開發用工作副本上傳，**部分只存在於作者 PC 的檔案尚未包含**，因此目前無法完整執行：

- 原創角色美術、部分怪物圖示、登入畫面與職業 logo 圖片（`assets/logo/`、`assets/start/`、`public/assets/login/` 等）
- `css/tailwind-built.css`、`css/floating-ui.css`
- 部分程式檔：`js/17-audio.js`、`js/18-misc-book.js`、`js/19-equipment-window.js`、`js/20-warehouse-window.js`、`js/26-world-channel.js`、`js/28-pvp-arena.js`、`js/29-siege-v2-data.js`、`js/30-siege-v2.js`、`js/31-castle-guards.js`、`js/32-threat.js`、`js/anim-manifest.js`
- 66 個 `afk-*.js` 外掛模組（例如 `afk-skin.js`、`afk-mobile.js`）

之後會從 PC 補上這些檔案。

## 版權

私人專案。《天堂》（Lineage）相關名稱與素材版權屬原權利人。
