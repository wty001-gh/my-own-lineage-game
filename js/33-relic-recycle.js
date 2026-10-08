// ========== 🏺 遺物回收商人（relicon.20260919a 還原）==========
// 以背包中五件未裝備、未鎖定的遺物，兌換指定類別遺物箱；開箱後隨機獲得該類遺物一件。
// 依賴：EQUIP_CATEGORIES（16）、RELIC_CAT_ITEMS／registerRelicObtained（21）、isRelic／gainItem／uid（01／08）

const RELIC_RECYCLE_COST = 5;

function ensureRelicCatBoxes() {
    if (typeof DB === 'undefined' || !DB.items) return;
    let cats = (typeof EQUIP_CATEGORIES !== 'undefined') ? EQUIP_CATEGORIES : [];
    cats.forEach(c => {
        if (!c || !c.key) return;
        let boxId = 'relic_box_' + c.key;
        if (!DB.items[boxId]) {
            DB.items[boxId] = {
                n: '遺物箱（' + c.name + '）',
                type: 'misc',
                eff: 'relic_cat_box',
                relicCat: c.key,
                p: 0,
                gachaWeight: 0,
                noUse: false,
                d: '開啟後隨機獲得一件「' + c.name + '」類別的遺物（含該部位全部現有遺物）。由遺物回收商人以五件多餘遺物兌換。'
            };
        } else {
            // 刷新說明，標明含新建遺物
            DB.items[boxId].d = '開啟後隨機獲得一件「' + c.name + '」類別的遺物（含該部位全部現有遺物）。由遺物回收商人以五件多餘遺物兌換。';
            DB.items[boxId].eff = 'relic_cat_box';
            DB.items[boxId].relicCat = c.key;
        }
        try {
            if (typeof ITEM_WEIGHTS !== 'undefined' && ITEM_WEIGHTS[DB.items[boxId].n] == null) ITEM_WEIGHTS[DB.items[boxId].n] = 1;
        } catch (e) {}
    });
}
ensureRelicCatBoxes();
if (typeof window !== 'undefined') window.ensureRelicCatBoxes = ensureRelicCatBoxes;

// 🪦 v3.8.79：大墳墓三職專屬遺物——強制併入回收箱／索引對應分類（盾牌／臂甲／腰帶）
const NAZ_V379_CLASS_RELICS = [
    { id: 'relic_naz_victim_tome', cat: 'shield' },       // 威克提姆的心象法書
    { id: 'relic_naz_demiurge_armguard', cat: 'armguard' }, // 迪米烏哥斯的龍炎臂甲
    { id: 'relic_naz_gargantua_belt', cat: 'belt' }         // 高格斯的碎岩腰帶
];
function ensureNazV379RelicPools() {
    if (typeof DB === 'undefined' || !DB.items) return;
    if (typeof rebuildRelicIndex === 'function') rebuildRelicIndex();
    if (typeof RELIC_CAT_ITEMS === 'undefined') return;
    NAZ_V379_CLASS_RELICS.forEach(function (row) {
        let d = DB.items[row.id];
        if (!d || !(d.relic || (typeof isRelic === 'function' && isRelic(d)))) return;
        if (!RELIC_CAT_ITEMS[row.cat]) RELIC_CAT_ITEMS[row.cat] = [];
        if (RELIC_CAT_ITEMS[row.cat].indexOf(row.id) < 0) RELIC_CAT_ITEMS[row.cat].push(row.id);
        if (typeof RELIC_ITEM_CAT !== 'undefined') RELIC_ITEM_CAT[row.id] = row.cat;
    });
}
if (typeof window !== 'undefined') window.ensureNazV379RelicPools = ensureNazV379RelicPools;
try { ensureNazV379RelicPools(); } catch (e) {}

function _relicRecycleEligibleList() {
    if (!player || !Array.isArray(player.inv)) return [];
    let out = [];
    player.inv.forEach(it => {
        if (!it || !it.id || it.lock) return;
        let d = DB.items[it.id];
        if (!d || !(typeof isRelic === 'function' ? isRelic(d) : d.relic)) return;
        if (String(it.id).indexOf('relic_box_') === 0 || d.eff === 'relic_cat_box') return;
        let cnt = Math.max(1, Math.floor(Number(it.cnt) || 1));
        for (let i = 0; i < cnt; i++) out.push(it);
    });
    return out;
}

function _relicRecycleCount() {
    // 以件數計（堆疊 cnt 拆開）；同一 stack 多件會重複引用同一物件
    let seen = _relicRecycleEligibleList();
    return seen.length;
}

function _relicRecycleConsume(n) {
    n = Math.max(0, Math.floor(n) || 0);
    if (n <= 0) return true;
    let need = n;
    let gone = new Set();
    for (let it of player.inv) {
        if (need <= 0) break;
        if (!it || !it.id || it.lock || gone.has(it.uid)) continue;
        let d = DB.items[it.id];
        if (!d || !(typeof isRelic === 'function' ? isRelic(d) : d.relic)) continue;
        if (String(it.id).indexOf('relic_box_') === 0 || d.eff === 'relic_cat_box') continue;
        let take = Math.min(Math.max(1, it.cnt || 1), need);
        it.cnt = (it.cnt || 1) - take;
        need -= take;
        if (it.cnt <= 0) gone.add(it.uid);
    }
    if (gone.size) player.inv = player.inv.filter(i => !gone.has(i.uid));
    return need <= 0;
}

function _relicCatPool(catKey) {
    // ⚡ v3.8.67：池以 RELIC_CAT_ITEMS 為主，並併入 DB 掃到的同分類新 id（呼叫端須先 rebuildRelicIndex）
    let pool = [];
    if (typeof RELIC_CAT_ITEMS !== 'undefined' && RELIC_CAT_ITEMS[catKey] && RELIC_CAT_ITEMS[catKey].length) {
        pool = RELIC_CAT_ITEMS[catKey].slice();
    }
    // 雙保險：索引漏網時直接掃 DB（同分類）
    if ((!pool.length || pool.length < 1) && typeof DB !== 'undefined' && DB.items) {
        pool = [];
        for (let id in DB.items) {
            let d = DB.items[id];
            if (!d || !(typeof isRelic === 'function' ? isRelic(d) : d.relic)) continue;
            if (String(id).indexOf('relic_box_') === 0 || d.eff === 'relic_cat_box') continue;
            let ck = (typeof equipCatKey === 'function') ? equipCatKey(id, d) : null;
            if (ck === catKey) pool.push(id);
        }
    }
    // 再保險：即使用索引，亦併入 DB 掃到但索引沒有的新 id（防快取／舊版索引）
    if (typeof DB !== 'undefined' && DB.items && typeof equipCatKey === 'function') {
        let have = new Set(pool);
        for (let id in DB.items) {
            if (have.has(id)) continue;
            let d = DB.items[id];
            if (!d || !(typeof isRelic === 'function' ? isRelic(d) : d.relic)) continue;
            if (String(id).indexOf('relic_box_') === 0 || d.eff === 'relic_cat_box') continue;
            if (d.type !== 'wpn' && d.type !== 'arm' && d.type !== 'acc') continue;
            if (equipCatKey(id, d) === catKey) { pool.push(id); have.add(id); }
        }
    }
    return pool.filter(id => DB.items[id]);
}

function renderRelicRecycleNPC(div) {
    if (!div) return;
    if (typeof rebuildRelicIndex === 'function') rebuildRelicIndex();
    if (typeof ensureRelicCatBoxes === 'function') ensureRelicCatBoxes();
    if (typeof ensureNazV379RelicPools === 'function') ensureNazV379RelicPools();
    let have = _relicRecycleCount();
    let cats = (typeof EQUIP_CATEGORIES !== 'undefined') ? EQUIP_CATEGORIES : [];
    let rows = cats.filter(c => _relicCatPool(c.key).length > 0).map(c => {
        let poolN = _relicCatPool(c.key).length;
        let can = have >= RELIC_RECYCLE_COST;
        return `<div class="flex items-center justify-between gap-2 bg-slate-800/60 border border-slate-600 rounded p-3">
            <div class="text-sm text-slate-200 leading-relaxed min-w-0">
                <span class="c-relic font-bold">遺物箱（${c.name}）</span>
                <span class="text-xs text-slate-400">· 池內 ${poolN} 件</span><br>
                <span class="text-xs text-slate-400">消耗：背包未裝備、未鎖定遺物 ×${RELIC_RECYCLE_COST}（任何類別皆可）</span>
            </div>
            <button class="btn ${can ? 'bg-sky-800 hover:bg-sky-700 border-sky-500' : 'bg-slate-600 border-slate-500 opacity-60 cursor-not-allowed'} py-2 px-4 font-bold shrink-0"
                ${can ? '' : 'disabled'} onclick="relicRecycleExchange('${c.key}')">兌換</button>
        </div>`;
    }).join('');
    div.innerHTML = `<div class="flex flex-col gap-3 p-1">
        <div class="text-slate-300 text-sm leading-relaxed">遺物回收商人：多餘嘅遺物交嚟啦。以背包入面 <span class="c-relic font-bold">五件未裝備、未鎖定</span> 嘅遺物，兌換你指定類別嘅遺物箱；開箱池<strong>含全部現有遺物</strong>（含傲慢之塔頭目、亞丁城堡、惡夢底比斯／提卡爾、大墳墓（含三職專屬）等新建）。已裝備嘅恕不接受。</div>
        <div class="text-xs text-slate-400">目前可回收遺物：<span class="c-relic font-bold">${have}</span> 件（需要 ${RELIC_RECYCLE_COST} 件先可以兌換）</div>
        ${rows || '<div class="text-slate-500 text-sm p-2">目前未有可用嘅遺物分類。</div>'}
    </div>`;
}

function renderRelicRecycle(div) { renderRelicRecycleNPC(div); }

function relicRecycleExchange(catKey) {
    if (!catKey) return;
    if (typeof rebuildRelicIndex === 'function') rebuildRelicIndex();
    if (typeof ensureRelicCatBoxes === 'function') ensureRelicCatBoxes();
    if (typeof ensureNazV379RelicPools === 'function') ensureNazV379RelicPools();
    let pool = _relicCatPool(catKey);
    if (!pool.length) {
        if (typeof logSys === 'function') logSys('<span class="text-red-400">呢個分類暫時未有遺物可兌換。</span>');
        return;
    }
    let have = _relicRecycleCount();
    if (have < RELIC_RECYCLE_COST) {
        if (typeof logSys === 'function') logSys(`<span class="text-red-400">可回收遺物不足（持有 ${have}／需要 ${RELIC_RECYCLE_COST}）。已裝備或鎖定嘅唔計。</span>`);
        return;
    }
    let cat = (typeof EQUIP_CATEGORIES !== 'undefined') ? EQUIP_CATEGORIES.find(c => c.key === catKey) : null;
    let label = (cat && cat.name) || catKey;
    if (!confirm(`確定用 ${RELIC_RECYCLE_COST} 件未裝備遺物，兌換「遺物箱（${label}）」？`)) return;
    if (!_relicRecycleConsume(RELIC_RECYCLE_COST)) {
        if (typeof logSys === 'function') logSys('<span class="text-red-400">回收失敗：扣除遺物時出錯。</span>');
        return;
    }
    let boxId = 'relic_box_' + catKey;
    if (!DB.items[boxId]) {
        DB.items[boxId] = {
            n: '遺物箱（' + label + '）', type: 'misc', eff: 'relic_cat_box', relicCat: catKey,
            p: 0, gachaWeight: 0, d: '開啟後隨機獲得一件「' + label + '」類別的遺物。'
        };
    }
    gainItem(boxId, 1, true, true);
    if (typeof logSys === 'function') {
        logSys(`<span class="c-relic font-bold">✦ 遺物回收</span>：消耗遺物 ×${RELIC_RECYCLE_COST}，獲得 <span class="c-relic font-bold">${DB.items[boxId].n}</span>。`);
    }
    if (typeof renderTabs === 'function') renderTabs();
    if (typeof saveGame === 'function') saveGame();
    let el = document.getElementById('interaction-content');
    if (el) renderRelicRecycleNPC(el);
}

// ⚡ v3.8.66：支援一次開多個（qty／全部）；先抽完再按種類批次 gainItem，結尾才重繪／存檔，避免大量開啟卡死。
let _relicBoxOpenBusy = false;
function openRelicCatBox(item, silent, qty) {
    if (_relicBoxOpenBusy) {
        if (!silent && typeof logSys === 'function') logSys('<span class="text-slate-400">遺物箱開啟中，請稍候…</span>');
        return false;
    }
    if (!item || !item.id) return false;
    let d = DB.items[item.id];
    if (!d || d.eff !== 'relic_cat_box') return false;
    let invItem = player.inv.find(i => i.uid === item.uid) || player.inv.find(i => i.id === item.id && (i.cnt || 0) > 0);
    if (!invItem) {
        if (!silent && typeof logSys === 'function') logSys('<span class="text-slate-400">背包入面搵唔到呢個遺物箱。</span>');
        return false;
    }
    if (typeof rebuildRelicIndex === 'function') rebuildRelicIndex();
    if (typeof ensureRelicCatBoxes === 'function') ensureRelicCatBoxes();
    if (typeof ensureNazV379RelicPools === 'function') ensureNazV379RelicPools();
    let catKey = d.relicCat || String(item.id).replace(/^relic_box_/, '');
    let pool = _relicCatPool(catKey);
    if (!pool.length) {
        if (!silent && typeof logSys === 'function') logSys('<span class="text-red-400">呢個遺物箱分類係空嘅，無法開啟。</span>');
        return false;
    }
    let have = invItem.cnt || 1;
    let n = (qty == null) ? 1 : Math.floor(+qty);
    if (!(n > 0)) n = 1;
    if (n > have) n = have;
    // 持有多個且未指定數量：問一次（預設全部），與歐西里斯寶箱體驗一致
    if (qty == null && have > 1 && !silent) {
        let raw = prompt(`要開啟幾個 ${d.n}？（持有 ${have} 個）`, have);
        if (raw == null) return false;
        n = Math.max(1, Math.min(have, parseInt(raw, 10) || 1));
    }
    _relicBoxOpenBusy = true;
    invItem.cnt = have - n;
    if (invItem.cnt <= 0) player.inv = player.inv.filter(i => i.uid !== invItem.uid);

    let gotMap = {};
    for (let i = 0; i < n; i++) {
        let id = pool[Math.floor(Math.random() * pool.length)];
        gotMap[id] = (gotMap[id] || 0) + 1;
    }
    for (let id of Object.keys(gotMap)) {
        gainItem(id, gotMap[id], true, true, false, true);   // 遺物不附詞綴 + deferUi
        if (typeof registerRelicObtained === 'function') registerRelicObtained(id);
    }
    if (!silent && typeof logSys === 'function') {
        let parts = Object.keys(gotMap).map(id => {
            let show = { id: id, en: 0, bless: false, anc: false, attr: false, cnt: gotMap[id] };
            let nm = (typeof getItemFullName === 'function') ? getItemFullName(show) : ((DB.items[id] && DB.items[id].n) || id);
            let col = (typeof getItemColor === 'function') ? getItemColor(show) : 'c-relic';
            return `<span class="${col} font-bold">${nm}</span>×${gotMap[id]}`;
        });
        logSys(`<span class="c-relic font-bold">✦ 開啟遺物箱 ×${n}</span>：${parts.join('、')}`, 'relic');
    }
    if (n === 1) {
        try {
            let only = Object.keys(gotMap)[0];
            if (typeof vfxRareDrop === 'function' && only && DB.items[only]) vfxRareDrop(DB.items[only].n);
        } catch (e) {}
    }
    if (typeof renderTabs === 'function') renderTabs(true);
    if (typeof updateUI === 'function') updateUI();
    let doSave = function() {
        try { if (typeof saveGame === 'function') saveGame(); } catch (e) {}
        _relicBoxOpenBusy = false;
    };
    if (n >= 200) setTimeout(doSave, 0); else doSave();
    return true;
}

// 舊別名（退役 stub 曾匯出）
function openRelicRecycleBox(item, silent) { return openRelicCatBox(item, silent); }

if (typeof window !== 'undefined') {
    window.renderRelicRecycleNPC = renderRelicRecycleNPC;
    window.renderRelicRecycle = renderRelicRecycle;
    window.relicRecycleExchange = relicRecycleExchange;
    window.openRelicCatBox = openRelicCatBox;
    window.openRelicRecycleBox = openRelicRecycleBox;
}
