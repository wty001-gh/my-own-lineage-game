// ===== 📜 v3.8.98 試煉／事件限定強化卷與特殊材料 =====
(function () {
'use strict';

function isTrialExclusive(id) {
    let d = DB.items && DB.items[id];
    return !!(d && d.trialExclusive);
}
/** Drop/box/shop/gacha must never roll these */
function trialExclusiveBlocked(id) { return isTrialExclusive(id); }


const RELIC_RESON_POOL = [
    { id: 'hp10', label: 'HP +10', apply: (d, it) => { it.relicReson = { id: 'hp10' }; } },
    { id: 'mr2', label: 'MR +2', apply: (d, it) => { it.relicReson = { id: 'mr2' }; } },
    { id: 'dr1', label: '減傷 +1', apply: (d, it) => { it.relicReson = { id: 'dr1' }; } },
    { id: 'hpr1', label: 'HP恢復 +1', apply: (d, it) => { it.relicReson = { id: 'hpr1' }; } },
    { id: 'extradmg1', label: '額外傷害 +1', apply: (d, it) => { it.relicReson = { id: 'extradmg1' }; } }
];

function trialScrollIdsFor(item) {
    let d = DB.items[item.id]; if (!d) return [];
    let out = [];
    const add = id => { if (player.inv.some(i => i.id === id && !i.lock)) out.push(id); };
    if (d.type === 'wpn') {
        add('scroll_guard_wpn'); add('scroll_guardx_wpn'); add('scroll_seal_stable'); add('scroll_sure_plus'); add('scroll_blessify');
    } else if (d.type === 'arm') {
        add('scroll_guard_arm'); add('scroll_guardx_arm'); add('scroll_seal_stable'); add('scroll_sure_plus'); add('scroll_blessify');
    }
    return out;
}

/** Hooked from showEnhanceOptions — append buttons for exclusive scrolls */
function trialEnhanceOptionsHtml(item, isEq) {
    let ids = trialScrollIdsFor(item);
    if (!ids.length) return '';
    return ids.map(id => {
        let def = DB.items[id];
        let cnt = player.inv.filter(i => i.id === id).reduce((s, i) => s + (i.cnt || 1), 0);
        let it = player.inv.find(i => i.id === id && !i.lock);
        if (!it) return '';
        return `<button class="col-span-2 w-full btn border-emerald-700 bg-emerald-950 hover:bg-emerald-900 py-3 text-base font-bold text-emerald-200 shadow" onclick="executeTrialEnhance('${it.uid}', '${item.uid}', ${!!isEq})">使用 ${def.n} (擁有: ${cnt})</button>`;
    }).join('');
}

function executeTrialEnhance(scrollUid, targetUid, isEq) {
    let scroll = player.inv.find(i => i.uid === scrollUid);
    let target = isEq ? Object.values(player.eq).find(e => e && e.uid === targetUid) : player.inv.find(i => i.uid === targetUid);
    if (!scroll || !target) return;
    let sd = DB.items[scroll.id], td = DB.items[target.id];
    if (!sd || !td || !sd.enhanceKind) return;

    if (sd.enhanceKind === 'blessify') {
        if (target.bless === true) { logSys('已是祝福裝備。'); return; }
        if (target._blessified) { logSys('此件已使用過祝福化卷軸。'); return; }
        if (typeof consume === 'function') consume(scroll); else { scroll.cnt = (scroll.cnt || 1) - 1; if (scroll.cnt <= 0) player.inv = player.inv.filter(i => i.uid !== scroll.uid); }
        target.bless = true;
        target._blessified = true;
        logSys(`<span class="text-yellow-300 font-bold">${getItemFullName(target)} 被祝福化了！</span>`);
        calcStats(); renderTabs(); closeModal(); saveGame();
        return;
    }

    // enhance kinds
    let en = Number(target.en) || 0;
    let cap = (typeof enhanceCap === 'function') ? enhanceCap(td) : 15;
    if (sd.enhanceKind === 'sure') {
        if (en > (sd.enhanceMaxEn || 7)) { logSys('確定強化卷僅可用於 +7 或以下。'); return; }
        if (en >= cap) { logSys('已達上限'); return; }
        if (typeof consume === 'function') consume(scroll);
        target.en = Math.min(cap, en + 1);
        logSys(`<span class="text-amber-200 font-bold">確定強化！→ +${target.en}</span>`);
        calcStats(); renderTabs(); closeModal(); saveGame();
        return;
    }

    if (sd.enhanceTarget === 'wpn' && td.type !== 'wpn') { logSys('卷軸種類不符'); return; }
    if (sd.enhanceTarget === 'arm' && td.type !== 'arm') { logSys('卷軸種類不符'); return; }

    if (sd.enhanceKind === 'guard') {
        let maxEn = sd.enhanceMaxEn || 9;
        if (en >= maxEn) { logSys('守護卷僅支援至 +' + maxEn); return; }
        if (en >= cap) { logSys('已達上限'); return; }
        if (typeof consume === 'function') consume(scroll);
        // roll with no break
        let _oc = (typeof enhanceRollOutcome === 'function') ? enhanceRollOutcome(td, en) : (Math.random() < 0.3 ? 'ok' : 'break');
        if (_oc === 'ok') {
            target.en = Math.min(cap, en + 1);
            logSys(`<span class="text-emerald-300 font-bold">守護強化成功 → +${target.en}</span>`);
        } else {
            logSys(`<span class="text-slate-400">守護強化：失敗但裝備安然無恙。</span>`);
        }
        calcStats(); renderTabs(); closeModal(); saveGame();
        return;
    }

    if (sd.enhanceKind === 'seal') {
        if (en >= cap) { logSys('已達上限'); return; }
        if (typeof consume === 'function') consume(scroll);
        let _oc = (typeof enhanceRollOutcome === 'function') ? enhanceRollOutcome(td, en) : (Math.random() < 0.3 ? 'ok' : 'break');
        if (_oc === 'ok') {
            target.en = Math.min(cap, en + 1);
            logSys(`<span class="text-sky-300 font-bold">封印穩定・成功 → +${target.en}</span>`);
        } else {
            target.en = Math.max(0, en - 1);
            logSys(`<span class="text-sky-200 font-bold">封印穩定・失敗，強化 −1 → +${target.en}</span>`);
        }
        calcStats(); renderTabs(); closeModal(); saveGame();
        return;
    }
}

function useSoulTransfer(srcUid, dstUid) {
    let src = player.inv.find(i => i.uid === srcUid) || Object.values(player.eq).find(e => e && e.uid === srcUid);
    let dst = player.inv.find(i => i.uid === dstUid) || Object.values(player.eq).find(e => e && e.uid === dstUid);
    if (!src || !dst) { logSys('找不到裝備'); return; }
    let sd = DB.items[src.id], dd = DB.items[dst.id];
    if (!sd || !dd) return;
    let slotOk = (sd.slot === dd.slot) || (sd.type === 'wpn' && dd.type === 'wpn');
    if (!slotOk) { logSys('必須同部位'); return; }
    let stone = player.inv.find(i => i.id === 'mat_soul_transfer' && !i.lock);
    if (!stone) { logSys('沒有靈魂回須石'); return; }
    let en = Number(src.en) || 0;
    if (en < 2) { logSys('來源強化至少 +2'); return; }
    if (typeof consume === 'function') consume(stone);
    dst.en = Math.max(0, en - 2);
    src.en = 0;
    logSys(`<span class="text-rose-300 font-bold">靈魂回須：轉移完成（目標 +${dst.en}，來源歸零）</span>`);
    calcStats(); renderTabs(); saveGame();
}

function useRelicReson(uid) {
    let it = player.inv.find(i => i.uid === uid) || Object.values(player.eq).find(e => e && e.uid === uid);
    if (!it) return;
    let d = DB.items[it.id];
    if (!d || !(typeof isRelic === 'function' ? isRelic(d) : d.relic)) { logSys('僅限遺物'); return; }
    if (it.relicReson) { logSys('此遺物已共鳴'); return; }
    let stone = player.inv.find(i => i.id === 'mat_relic_reson' && !i.lock);
    if (!stone) { logSys('沒有遺物共鳴石'); return; }
    if (typeof consume === 'function') consume(stone);
    let pick = RELIC_RESON_POOL[Math.floor(Math.random() * RELIC_RESON_POOL.length)];
    pick.apply(d, it);
    logSys(`<span class="text-fuchsia-300 font-bold">遺物共鳴：${pick.label}</span>`);
    calcStats(); renderTabs(); saveGame();
}

function applyRelicResonStats(p, d) {
    if (!p || !p.eq) return;
    for (let k in p.eq) {
        let e = p.eq[k]; if (!e || !e.relicReson) continue;
        let id = e.relicReson.id;
        if (id === 'hp10') p.mhp = (p.mhp || 0) + 10;
        if (id === 'mr2') d.mr = (d.mr || 0) + 2;
        if (id === 'dr1') d.dr = (d.dr || 0) + 1;
        if (id === 'hpr1') d.hpR = (d.hpR || 0) + 1;
        if (id === 'extradmg1') d.extraDmg = (d.extraDmg || 0) + 1;
    }
}

/** Lock a Nazarick enchant slot using mat_rift_lock.
 *  trialLockNazSlot(slotIdx) — uses currently selected Naz craft item
 *  trialLockNazSlot(itemUid, slotIdx) — lock by uid (ally/player inv or eq)
 */
function trialLockNazSlot(a, b) {
    let itemUid = null, slotIdx = 0;
    if (typeof a === 'string' && typeof b === 'number') { itemUid = a; slotIdx = b|0; }
    else { slotIdx = (a|0); }
    let stone = player.inv.find(i => i.id === 'mat_rift_lock' && !i.lock);
    if (!stone) { logSys('沒有時空裂縫碎片'); return false; }
    let item = null;
    if (itemUid) {
        item = player.inv.find(i => i.uid === itemUid) || Object.values(player.eq).find(e => e && e.uid === itemUid);
        // allies
        if (!item && Array.isArray(player.allies)) {
            for (let al of player.allies) {
                if (!al) continue;
                item = (al.inv||[]).find(i => i.uid === itemUid) || (al.eq && Object.values(al.eq).find(e => e && e.uid === itemUid));
                if (item) break;
            }
        }
    } else {
        let uid = (typeof _neNpcSelUid !== 'undefined') ? _neNpcSelUid : null;
        if (typeof _neFindByUid === 'function' && uid) {
            let found = _neFindByUid(uid);
            item = found && found.item;
        }
    }
    if (!item) { logSys('請先在納薩工匠選擇裝備，或傳入裝備 UID'); return false; }
    if (!item.ne || !item.ne.length) { logSys('此裝備尚無納薩附魔'); return false; }
    if (slotIdx < 0 || slotIdx >= item.ne.length) { logSys('槽位無效'); return false; }
    if (item.neLock && item.neLock[slotIdx]) { logSys('此槽已鎖定'); return false; }
    if (typeof consume === 'function') consume(stone);
    if (!item.neLock) item.neLock = {};
    item.neLock[slotIdx] = true;
    // freeze snapshot so full-array rerolls can restore
    if (!item.neLockSnap) item.neLockSnap = {};
    item.neLockSnap[slotIdx] = JSON.parse(JSON.stringify(item.ne[slotIdx]));
    logSys(`<span class="text-violet-300 font-bold">已鎖定附魔槽 ${slotIdx + 1}</span>`);
    if (typeof saveGame === 'function') saveGame();
    if (typeof renderNazarickEnchant === 'function') {
        let div = document.getElementById('interaction-content');
        if (div) renderNazarickEnchant(div);
    }
    return true;
}

// Patch showEnhanceOptions
function _patchEnhanceUI() {
    if (typeof showEnhanceOptions !== 'function' || showEnhanceOptions._trialPatched) return;
    let orig = showEnhanceOptions;
    window.showEnhanceOptions = function (uid, isEq) {
        orig(uid, isEq);
        try {
            let item = isEq ? Object.values(player.eq).find(e => e && e.uid === uid) : player.inv.find(i => i.uid === uid);
            if (!item) return;
            let html = trialEnhanceOptionsHtml(item, isEq);
            if (!html) return;
            let act = document.getElementById('modal-actions');
            if (act) act.insertAdjacentHTML('beforeend', html);
        } catch (e) {}
    };
    window.showEnhanceOptions._trialPatched = true;
}

// Patch neRerollEnchant to respect locks
function _patchNazReroll() {
    if (typeof neRerollEnchant !== 'function' || neRerollEnchant._trialPatched) return;
    let orig = neRerollEnchant;
    window.neRerollEnchant = function (slotIdx) {
        try {
            let uid = _neNpcSelUid;
            let found = typeof _neFindByUid === 'function' ? _neFindByUid(uid) : null;
            if (found && found.item && found.item.neLock && found.item.neLock[slotIdx]) {
                logSys('<span class="text-violet-300">此槽已被時空裂縫碎片鎖定，無法改寫。</span>');
                return;
            }
        } catch (e) {}
        return orig(slotIdx);
    };
    window.neRerollEnchant._trialPatched = true;
}

// Enhance bonus from world event in enhanceRollOutcome
function _patchEnhanceBonus() {
    if (typeof enhanceRollOutcome !== 'function' || enhanceRollOutcome._trialPatched) return;
    let orig = enhanceRollOutcome;
    window.enhanceRollOutcome = function (d, en) {
        // temporarily boost via wrapping Math? Better: duplicate logic — call orig then...
        // Inject by monkeypatching cbEnhanceBonusPct stack
        let _old = window.cbEnhanceBonusPct;
        window.cbEnhanceBonusPct = function (p) {
            let b = (typeof _old === 'function') ? (_old(p) || 0) : 0;
            try { if (typeof weEnhanceBonusPct === 'function') b += weEnhanceBonusPct(); } catch (e) {}
            return b;
        };
        let r = orig(d, en);
        window.cbEnhanceBonusPct = _old;
        return r;
    };
    window.enhanceRollOutcome._trialPatched = true;
}

function _injectNazLockButtons() {
    try {
        let host = document.getElementById('interaction-content');
        if (!host || host.querySelector('.trial-naz-lock')) return;
        if (!host.innerHTML.includes('改寫')) return;
        let stone = player.inv.find(i => i.id === 'mat_rift_lock' && !i.lock);
        if (!stone) return;
        let found = (typeof _neFindByUid === 'function' && typeof _neNpcSelUid !== 'undefined') ? _neFindByUid(_neNpcSelUid) : null;
        if (!found || !found.item || !found.item.ne) return;
        let it = found.item;
        let bar = document.createElement('div');
        bar.className = 'trial-naz-lock';
        bar.style.cssText = 'margin:6px 0;display:flex;flex-wrap:wrap;gap:4px;align-items:center;';
        bar.innerHTML = '<span style="color:#c4b5fd;font-size:12px">時空裂縫碎片鎖定：</span>';
        it.ne.forEach((_, i) => {
            let locked = !!(it.neLock && it.neLock[i]);
            let b = document.createElement('button');
            b.className = 'btn px-2 py-1 text-xs';
            b.style.cssText = locked ? 'background:#4c1d95;border-color:#a78bfa;color:#ede9fe' : 'background:#312e81;border-color:#7c3aed;color:#ddd6fe';
            b.textContent = locked ? ('槽'+(i+1)+'已鎖') : ('鎖槽'+(i+1));
            b.disabled = locked;
            if (!locked) b.onclick = () => trialLockNazSlot(i);
            bar.appendChild(b);
        });
        host.insertBefore(bar, host.firstChild);
    } catch (e) {}
}
function _bootTrialScrolls() {
    _patchEnhanceUI();
    _patchNazReroll();
    _patchEnhanceBonus();
    if (typeof renderNazarickEnchant === 'function' && !renderNazarickEnchant._trialPatched) {
        let orig = renderNazarickEnchant;
        window.renderNazarickEnchant = function (div) {
            let r = orig(div);
            setTimeout(_injectNazLockButtons, 0);
            return r;
        };
        window.renderNazarickEnchant._trialPatched = true;
    }
}
if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _bootTrialScrolls);
    else _bootTrialScrolls();
    setTimeout(_bootTrialScrolls, 0);
}

// useItem hooks for soul transfer / relic reson — via openModal actions or useItem
function trialUseSpecial(item) {
    let d = DB.items[item.id];
    if (!d) return false;
    if (d.eff === 'soul_transfer') {
        logSys('請在強化介面或對兩件同部位裝備使用：先選來源再選目標（簡化：自動找最高強化→次高）。');
        // Auto: highest en equipped or inv as src, another same slot as dst
        let cands = player.inv.concat(Object.values(player.eq).filter(Boolean)).filter(i => {
            let dd = DB.items[i.id]; return dd && (dd.type === 'wpn' || dd.type === 'arm' || dd.type === 'acc') && !dd.noEnhance;
        });
        cands.sort((a, b) => (b.en || 0) - (a.en || 0));
        if (cands.length < 2) { logSys('需要至少兩件可強化裝備'); return true; }
        let src = cands[0];
        let dst = cands.find(x => x.uid !== src.uid && DB.items[x.id].slot === DB.items[src.id].slot) || cands[1];
        useSoulTransfer(src.uid, dst.uid);
        return true;
    }
    if (d.eff === 'relic_reson') {
        let relics = player.inv.concat(Object.values(player.eq).filter(Boolean)).filter(i => {
            let dd = DB.items[i.id]; return dd && (typeof isRelic === 'function' ? isRelic(dd) : dd.relic) && !i.relicReson;
        });
        if (!relics.length) { logSys('沒有可共鳴的遺物'); return true; }
        useRelicReson(relics[0].uid);
        return true;
    }
    return false;
}

window.trialEnhanceOptionsHtml = trialEnhanceOptionsHtml;
window.executeTrialEnhance = executeTrialEnhance;
window.useSoulTransfer = useSoulTransfer;
window.useRelicReson = useRelicReson;
window.applyRelicResonStats = applyRelicResonStats;
window.trialLockNazSlot = trialLockNazSlot;
window.trialUseSpecial = trialUseSpecial;
window.RELIC_RESON_POOL = RELIC_RESON_POOL;
window.isTrialExclusive = isTrialExclusive;
window.trialExclusiveBlocked = trialExclusiveBlocked;

})();
