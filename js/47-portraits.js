// 🖼️ v3.8.115（v8 立繪）·v3.8.113 立繪資料庫＋可選立繪（v6 質感版＋天堂特色；任何職業可選任何立繪）
//   PORTRAIT_DB：每職業可選立繪（原有職業立繪 assets/character/*.png＋新日系立繪 assets/portraits/*.webp）。
//   角色選擇存於 player.portraitId（隨存檔）；未選＝原本 avatar 立繪。charPortraitUrl/charPortraitName 被覆寫 →
//   #status-panel 背景、傭兵技能設定卡背景等所有用到職業立繪的地方自動套用。
const PORTRAIT_CLS_ORIG = {
    knight: ['男騎士', '女騎士'], mage: ['男法師', '女法師'], elf: ['男妖精', '女妖精'], dark: ['男黑暗妖精', '女黑暗妖精'],
    illusion: ['男幻術士', '女幻術士'], dragon: ['男龍騎士', '女龍騎士'], warrior: ['男戰士', '女戰士'], royal: ['王子', '公主']
};
const PORTRAIT_CLS_LABEL = { knight: '騎士', royal: '王族', elf: '妖精', illusion: '幻術士', warrior: '戰士', mage: '法師', dark: '黑暗妖精', dragon: '龍騎士' };
const PORTRAIT_V8_N = 5;
const PORTRAIT_DB = (function () {   // v3.8.115：只保留 16 原版＋v8 每職業 5 張（v5/v6/v7/extra 已移除）
    let db = [];
    Object.keys(PORTRAIT_CLS_LABEL).forEach(cls => {
        PORTRAIT_CLS_ORIG[cls].forEach(av => db.push({ id: 'orig:' + av, cls, name: av + '（原版）', file: 'assets/character/' + av + '.png', thumb: 'assets/character/' + av + '.png', orig: true, avatar: av }));
        for (let i = 1; i <= PORTRAIT_V8_N; i++) {
            let k = 'v8-' + cls + '-' + i;
            db.push({ id: 'v8:' + cls + '-' + i, cls, name: PORTRAIT_CLS_LABEL[cls] + '立繪 ' + i, file: 'assets/portraits/' + k + '.webp', thumb: 'assets/portraits/' + k + '-t.webp', wide: true });
        }
    });
    return db;
})();
const PORTRAIT_BY_ID = Object.fromEntries(PORTRAIT_DB.map(p => [p.id, p]));
function portraitsForCls(cls) { return PORTRAIT_DB.filter(p => p.cls === cls); }
function portraitEntryOf(p) {
    if (!p || !p.portraitId) return null;
    let e = PORTRAIT_BY_ID[p.portraitId];
    if (e) return e;
    // grok:<filename> → assets/portraits/grok-library/<filename>（未入 PORTRAIT_DB 亦可顯示）
    if (String(p.portraitId).indexOf('grok:') === 0) {
        let g = String(p.portraitId).slice(5).replace(/\\/g, '/').split('/').pop();
        if (g) return { id: p.portraitId, cls: p.cls || null, name: g, file: 'assets/portraits/grok-library/' + g, thumb: 'assets/portraits/grok-library/' + g, wide: true, grok: true };
    }
    return null;   // v3.8.113：不限職業
}
(function () {
    const _origName = charPortraitName, _origUrl = charPortraitUrl;
    charPortraitName = function (p) { let e = portraitEntryOf(p); return e ? e.id.replace(/[^\w:\-\u4e00-\u9fff]/g, '') : _origName(p); };
    charPortraitUrl = function (p) { let e = portraitEntryOf(p); return e ? e.file : _origUrl(p); };
})();
function _applyStatusPortraitPos() {
    let sp = document.getElementById('status-panel'); if (!sp || !player) return;
    let e = portraitEntryOf(player), pos = (e && e.wide) ? '50% 22%' : '';
    if (sp.style.backgroundPosition !== pos) sp.style.backgroundPosition = pos;
}
function setPlayerPortrait(id) {
    if (!player || !player.cls) return;
    let e = PORTRAIT_BY_ID[id];
    if (!e) return;   // 無效 → 不變（任何職業可選任何立繪）
    if ((e.orig && e.avatar === player.avatar)) delete player.portraitId; else player.portraitId = id;
    try { document.getElementById('status-panel').style.backgroundImage = `url('${charPortraitUrl(player)}')`; } catch (x) {}
    _applyStatusPortraitPos();
    try { if (typeof saveGame === 'function') saveGame(); } catch (x) {}
    try { if (typeof updateUI === 'function') updateUI(); } catch (x) {}
    openPortraitPicker(_ppTab);
}
function closePortraitPicker() { let m = document.getElementById('portrait-picker'); if (m) m.remove(); }
let _ppTab = 'all';
function openPortraitPicker(tab) {
    if (!player || !player.cls) return;
    closePortraitPicker();
    if (typeof tab === 'string') _ppTab = tab;
    if (_ppTab !== 'all' && !PORTRAIT_CLS_LABEL[_ppTab]) _ppTab = 'all';
    let curId = (portraitEntryOf(player) || {}).id || ('orig:' + (player.avatar || (PORTRAIT_CLS_ORIG[player.cls] || [])[0]));
    let tabs = ['all'].concat(Object.keys(PORTRAIT_CLS_LABEL));
    let list = _ppTab === 'all' ? PORTRAIT_DB : PORTRAIT_DB.filter(p => p.cls === _ppTab);
    let m = document.createElement('div'); m.id = 'portrait-picker';
    m.innerHTML = `<div class="pp-card"><div class="pp-head"><b>🖼️ 選擇立繪（${PORTRAIT_DB.length}）</b><span class="pp-x" onclick="closePortraitPicker()">✕</span></div>
      <div class="pp-tabs">${tabs.map(t => `<span class="pp-tab${t === _ppTab ? ' pp-on' : ''}" onclick="openPortraitPicker('${t}')">${t === 'all' ? '全部' : PORTRAIT_CLS_LABEL[t]}</span>`).join('')}</div>
      <div class="pp-grid">${list.map(e => `<div class="pp-item${e.id === curId ? ' pp-on' : ''}" onclick="setPlayerPortrait('${e.id}')">
        <img loading="lazy" src="${e.thumb}" alt="" style="${e.orig ? 'object-position:50% 15%' : 'object-position:50% 22%'}"><div class="pp-name">${e.name}${e.id === curId ? ' ✔' : ''}</div></div>`).join('')}</div></div>`;
    m.addEventListener('click', ev => { if (ev.target === m) closePortraitPicker(); });
    document.body.appendChild(m);
}
(function () {
    let st = document.createElement('style');
    st.textContent = '#portrait-picker{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.72);display:flex;align-items:center;justify-content:center;padding:10px}'
        + '#portrait-picker .pp-card{background:#0f172a;border:1px solid #fbbf24;border-radius:10px;max-width:760px;width:100%;max-height:90vh;overflow:auto;padding:10px;-webkit-overflow-scrolling:touch}'
        + '#portrait-picker .pp-head{display:flex;justify-content:space-between;color:#fde68a;margin-bottom:8px;font-size:16px}'
        + '#portrait-picker .pp-tabs{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px}#portrait-picker .pp-tab{cursor:pointer;font-size:12px;color:#cbd5e1;padding:2px 8px;border:1px solid #475569;border-radius:12px}#portrait-picker .pp-tab.pp-on{color:#0f172a;background:#fbbf24;border-color:#fbbf24}'
        + '#portrait-picker .pp-x{cursor:pointer;padding:0 8px;font-size:20px}'
        + '#portrait-picker .pp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}'
        + '#portrait-picker .pp-item{cursor:pointer;border:2px solid #334155;border-radius:8px;overflow:hidden;background:#1e293b}'
        + '#portrait-picker .pp-item.pp-on{border-color:#fbbf24;box-shadow:0 0 10px rgba(251,191,36,.6)}'
        + '#portrait-picker .pp-item img{display:block;width:100%;aspect-ratio:16/10;object-fit:cover}'
        + '#portrait-picker .pp-name{font-size:12px;color:#e2e8f0;text-align:center;padding:3px 2px}'
        + '@media (max-width:600px){#portrait-picker .pp-grid{grid-template-columns:repeat(2,1fr)}}'
        + '#btn-portrait-pick{margin-left:4px;cursor:pointer;font-size:13px;line-height:1;padding:1px 4px;border:1px solid #64748b;border-radius:4px;background:rgba(15,23,42,.6)}';
    document.head.appendChild(st);
    function addBtn() {
        let cn = document.getElementById('st-classname');
        if (!cn || document.getElementById('btn-portrait-pick')) return;
        let b = document.createElement('span'); b.id = 'btn-portrait-pick'; b.title = '選擇立繪'; b.textContent = '🖼️';
        b.onclick = ev => { ev.stopPropagation(); openPortraitPicker(); };
        cn.parentNode.insertBefore(b, cn.nextSibling);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addBtn); else addBtn();
    setInterval(_applyStatusPortraitPos, 1500);
})();

// ab.20261023a：英雄頭像統一入口——招募結果／英雄頁／自走棋（酒館卡、棋子、板凳）／派遣全部用呢個，同一英雄同一張圖。
// 優先：英雄專屬立繪 assets/hero-full/<defId>.jpg → 英雄嘅 portraitId 立繪 → 職業預設圖。
var HERO_FULL_IDS = ["hero_aurelia_royal", "hero_brenna_warrior", "hero_celine_royal", "hero_cinder_dragon", "hero_echo_illusion", "hero_ignara_dragon", "hero_ignis_mage", "hero_isolde_knight", "hero_morgana_illusion", "hero_nyx_dark", "hero_petra_knight", "hero_pyria_elf", "hero_skaldi_warrior", "hero_sora_mage", "hero_terrae_elf", "hero_umbra_dark"];
function heroPortraitUrl(h) {
    if (!h) return '';
    var db = (typeof HERO_DB !== 'undefined' && HERO_DB) || window.HERO_DB || {};
    var def = h.defId || (db[h.id] ? h.id : null), d = (def && db[def]) || {};
    if (def && HERO_FULL_IDS.indexOf(def) >= 0) return 'assets/hero-full/' + def + '.jpg';
    var pid = h.portraitId || d.portraitId, cls = h.cls || d.cls;
    try { var e = pid && portraitEntryOf({ portraitId: pid, cls: cls }); if (e) return e.file || e.thumb; } catch (x) {}
    try { if (typeof charPortraitUrl === 'function') return charPortraitUrl({ cls: cls, avatar: null }); } catch (x) {}
    return '';
}
window.heroPortraitUrl = heroPortraitUrl;
