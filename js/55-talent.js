// ===== 🧭 v3.8.124 天賦＝每名角色獨立（唔係公會共用）=====
// 存檔：player.talents（當前角色）；其他存檔位寫入該格 lineage_idle_save_N 的 p.talents。
// 公會派遣評分／門檻讀「該成員」自己嘅 spent。
(function () {
'use strict';

const TL_NODES = {
    a_explore: { tree: 'adv', n: '探路者', cost: 1, max: 5, pre: [], d: '探索特性 +2／級' },
    a_talk:    { tree: 'adv', n: '交涉術', cost: 1, max: 5, pre: [], d: '交涉 +2／級；委託金幣 +0.5%／級' },
    a_gather:  { tree: 'adv', n: '豐收', cost: 1, max: 5, pre: [], d: '採集 +2／級；資源 +1%／級' },
    a_charm:   { tree: 'adv', n: '豐采', cost: 1, max: 5, pre: [], d: '魅力 +2／級；名聲 +0.5%／級' },
    a_stam:    { tree: 'adv', n: '強韌', cost: 2, max: 3, pre: [], d: '每日體力 +1／級' },
    a_first_aid: { tree: 'adv', n: '急救', cost: 2, max: 1, pre: [], d: '解鎖救援委託門檻' },
    a_ruin:    { tree: 'adv', n: '遺跡知識', cost: 2, max: 3, pre: ['a_explore'], d: '遺跡委託評分 +3／級；遺物率 +10%／級' },
    a_orator:  { tree: 'adv', n: '口才', cost: 2, max: 3, pre: ['a_talk'], d: '護送／商路評分 +3／級' },
    a_cook:    { tree: 'adv', n: '膳事', cost: 2, max: 1, pre: [], d: '料理委託門檻（或料理屋）' },
    a_drop:    { tree: 'adv', n: '拾荒直覺', cost: 3, max: 2, pre: ['a_gather'], d: '稀有裝備率 ×(1+15%／級)' },
    a_big:     { tree: 'adv', n: '奇蹟運搬', cost: 3, max: 2, pre: ['a_charm'], d: '大成功率 ×(1+10%／級)' },
    a_weight:  { tree: 'adv', n: '達標偏壓', cost: 3, max: 3, pre: ['a_talk', 'a_explore'], d: '評分差 −10～0 時可視作 +3／級' },
    a_lead:    { tree: 'adv', n: '隊長術', cost: 3, max: 2, pre: ['a_charm'], d: '當隊長時全隊特性評分 +2／級' },
    c_hp:   { tree: 'combat', n: '體魄', cost: 1, max: 5, pre: [], d: '最大 HP +1.5%／級' },
    c_atk:  { tree: 'combat', n: '銳刃', cost: 1, max: 5, pre: [], d: '物理傷害 +1%／級' },
    c_mag:  { tree: 'combat', n: '魔導', cost: 1, max: 5, pre: [], d: '魔法傷害 +1%／級' },
    c_aspd: { tree: 'combat', n: '迅捷', cost: 2, max: 3, pre: ['c_atk'], d: '攻擊間隔 −2%／級' },
    c_crit: { tree: 'combat', n: '弱點洞察', cost: 2, max: 3, pre: ['c_atk'], d: '近／遠距爆擊率 +1%／級' },
    c_dr:   { tree: 'combat', n: '鐵壁', cost: 2, max: 3, pre: ['c_hp'], d: '受傷 −1%／級' },
    c_boss: { tree: 'combat', n: '狩首', cost: 3, max: 3, pre: ['c_crit'], d: '對頭目傷害 +3%／級' }
};

/** 正規化／補點數到某個角色物件（需有 .lv 與可寫 .talents） */
function tlBag(host) {
    if (!host || typeof host !== 'object') return null;
    if (!host.talents || typeof host.talents !== 'object') host.talents = { pts: 0, spent: {}, resetDay: '', resetFreeUsed: false };
    let t = host.talents;
    if (!t.spent || typeof t.spent !== 'object') t.spent = {};
    t.pts = Math.max(0, Math.floor(Number(t.pts) || 0));
    let lv = Math.max(1, Number(host.lv) || 1);
    let grant = Math.floor(lv / 5); // 之後 gacha 星數另外 + star×4
    let star = Math.max(0, Math.floor(Number(host.star) || 0));
    grant += star * 4;
    let base = Math.max(0, Math.floor(Number(t._lvGrant) || 0));
    if (grant > base) { t.pts += (grant - base); t._lvGrant = grant; }
    return t;
}

function tlCloneBag(src, lv, star) {
    let host = { lv: lv || 1, star: star || 0, talents: src ? JSON.parse(JSON.stringify(src)) : { pts: 0, spent: {}, resetDay: '' } };
    return tlBag(host);
}

function tlLv(id, t) {
    if (!t) return 0;
    return Math.max(0, Math.min((TL_NODES[id] && TL_NODES[id].max) || 0, Math.floor(Number(t.spent[id]) || 0)));
}

function tlSpentTotal(t) {
    if (!t) return 0;
    let n = 0;
    Object.keys(t.spent || {}).forEach(id => {
        let node = TL_NODES[id]; if (!node) return;
        n += tlLv(id, t) * node.cost;
    });
    return n;
}

function tlCanPut(id, t) {
    let node = TL_NODES[id];
    if (!t || !node) return { ok: false, msg: '無此節點' };
    if (tlLv(id, t) >= node.max) return { ok: false, msg: '已滿級' };
    for (let pre of node.pre) if (tlLv(pre, t) < 1) return { ok: false, msg: '需要前置：' + (TL_NODES[pre] ? TL_NODES[pre].n : pre) };
    if (t.pts < node.cost) return { ok: false, msg: '天賦點不足' };
    return { ok: true };
}

/** 由存檔位讀取 talents 快照（唔改 live player） */
function tlReadSlot(slotN) {
    slotN = String(slotN);
    try {
        if (typeof currentSlot !== 'undefined' && String(currentSlot) === slotN && player) {
            return tlBag(player);
        }
        if (typeof _lzGet !== 'function') return null;
        let raw = _lzGet('lineage_idle_save_' + slotN);
        if (!raw) return null;
        let payload = (typeof _saveUnwrap === 'function') ? _saveUnwrap(raw).payload : raw;
        let d = JSON.parse(payload);
        if (!d || !d.p) return null;
        let bag = tlCloneBag(d.p.talents, d.p.lv, d.p.star);
        return bag;
    } catch (e) { return null; }
}

/** 寫回其他存檔位嘅 talents（當前格直接改 player） */
function tlWriteSlot(slotN, talents) {
    slotN = String(slotN);
    try {
        if (typeof currentSlot !== 'undefined' && String(currentSlot) === slotN && player) {
            player.talents = talents;
            try { if (typeof saveGame === 'function') saveGame(); } catch (e) {}
            try { if (typeof recomputeStats === 'function') recomputeStats(); } catch (e) {}
            return true;
        }
        if (typeof _lzGet !== 'function' || typeof _lzSet !== 'function') return false;
        let key = 'lineage_idle_save_' + slotN;
        let raw = _lzGet(key);
        if (!raw) return false;
        let un = (typeof _saveUnwrap === 'function') ? _saveUnwrap(raw) : { payload: raw };
        let d = JSON.parse(un.payload);
        if (!d || !d.p) return false;
        d.p.talents = talents;
        let out = (typeof _saveWrap === 'function') ? _saveWrap(JSON.stringify(d)) : JSON.stringify(d);
        if (!_lzSet(key, out)) return false;
        // 若該角色正在隊伍中，同步 ally 快照
        try {
            ((player && player.allies) || []).forEach(a => {
                if (a && String(a._slot) === slotN) a.talents = JSON.parse(JSON.stringify(talents));
            });
        } catch (e) {}
        return true;
    } catch (e) { return false; }
}

/** 成員物件 → 其天賦袋（優先 m.talents，否則讀 slot） */
function tlBagOfMember(m) {
    if (!m) return tlBag(player);
    if (m.talents && typeof m.talents === 'object') {
        // 補點數用成員等級
        let host = { lv: m.lv, star: m.star, talents: m.talents };
        tlBag(host);
        m.talents = host.talents;
        return m.talents;
    }
    if (m.self && player) return tlBag(player);
    if (m.slot != null && String(m.slot).match(/^\d+$/)) {
        let bag = tlReadSlot(m.slot);
        if (bag) { m.talents = bag; return bag; }
    }
    return { pts: 0, spent: {}, resetDay: '' };
}

function tlTraitFlat(t) {
    t = t || (player ? tlBag(player) : null);
    return {
        explore: tlLv('a_explore', t) * 2,
        talk: tlLv('a_talk', t) * 2,
        gather: tlLv('a_gather', t) * 2,
        charm: tlLv('a_charm', t) * 2,
        stamina: tlLv('a_stam', t)
    };
}

function tlGuildScore(member, card, isLeader) {
    if (!card) return 0;
    let t = tlBagOfMember(member);
    if (!t) return 0;
    let type = card.type, s = 0;
    if (type === 'relic') s += tlLv('a_ruin', t) * 3;
    if (type === 'escort' || type === 'trade') s += tlLv('a_orator', t) * 3;
    if (type === 'rescue') s += tlLv('a_first_aid', t) * 5;
    if (type === 'cook') s += tlLv('a_cook', t) * 5;
    if (type === 'survey' || type === 'gather') s += tlLv('a_explore', t);
    if (isLeader) s += tlLv('a_lead', t) * 2;
    return Math.min(25, s);
}

function tlWeightBoost(S_total, R, tOrMembers) {
    let w = 0;
    if (Array.isArray(tOrMembers)) {
        tOrMembers.forEach(m => { w = Math.max(w, tlLv('a_weight', tlBagOfMember(m))); });
    } else {
        w = tlLv('a_weight', tOrMembers || (player && tlBag(player)));
    }
    if (!w) return 0;
    let diff = S_total - R;
    if (diff >= -10 && diff <= 0) return w * 3;
    return 0;
}

function tlRewardMods(t) {
    t = t || (player ? tlBag(player) : null);
    return {
        gold: 1 + tlLv('a_talk', t) * 0.005,
        fame: 1 + tlLv('a_charm', t) * 0.005,
        res: 1 + tlLv('a_gather', t) * 0.01,
        gear: 1 + tlLv('a_drop', t) * 0.15,
        relic: 1 + tlLv('a_ruin', t) * 0.10,
        great: 1 + tlLv('a_big', t) * 0.10
    };
}

/** 隊伍獎勵倍率：各成員平均（每人用自己嘅樹） */
function tlRewardModsParty(mems) {
    if (!mems || !mems.length) return tlRewardMods();
    let acc = { gold: 0, fame: 0, res: 0, gear: 0, relic: 0, great: 0 }, n = 0;
    mems.forEach(m => {
        let mod = tlRewardMods(tlBagOfMember(m));
        Object.keys(acc).forEach(k => { acc[k] += mod[k]; });
        n++;
    });
    if (!n) return tlRewardMods();
    Object.keys(acc).forEach(k => { acc[k] /= n; });
    return acc;
}

function tlHas(id, min, tOrMember) {
    let t = tOrMember;
    if (t && t.spent === undefined && (t.slot != null || t.tr)) t = tlBagOfMember(t);
    if (!t || t.spent === undefined) t = player ? tlBag(player) : null;
    return tlLv(id, t) >= (min || 1);
}

/** 隊伍內是否有人滿足天賦門檻 */
function tlPartyHas(id, min, mems) {
    return (mems || []).some(m => tlHas(id, min, m));
}

function tlCombatMods(t) {
    t = t || (player ? tlBag(player) : null);
    return {
        hp: 1 + tlLv('c_hp', t) * 0.015,
        atk: 1 + tlLv('c_atk', t) * 0.01,
        mag: 1 + tlLv('c_mag', t) * 0.01,
        aspd: 1 - Math.min(0.06, tlLv('c_aspd', t) * 0.02),
        dr: tlLv('c_dr', t) * 0.01,
        boss: tlLv('c_boss', t) * 0.03,
        crit: tlLv('c_crit', t)
    };
}

// —— 編輯目標：{ kind:'self'|'slot', slot, name, lv } ——
let _edit = null;

function tlSetEditTarget(target) {
    _edit = target || { kind: 'self', slot: (typeof currentSlot !== 'undefined' ? String(currentSlot) : 'self'), name: (player && player.name) || '自己', lv: (player && player.lv) || 1 };
    if (_edit.kind === 'self' && player) tlBag(player);
    return _edit;
}

function tlGetEditBag() {
    if (!_edit || _edit.kind === 'self') return player ? tlBag(player) : null;
    if (_edit._bag) { tlBag({ lv: _edit.lv, star: _edit.star, talents: _edit._bag }); return _edit._bag; }
    let bag = tlReadSlot(_edit.slot);
    _edit._bag = bag || { pts: 0, spent: {}, resetDay: '' };
    tlBag({ lv: _edit.lv || 1, star: _edit.star || 0, talents: _edit._bag });
    return _edit._bag;
}

function tlPersistEdit() {
    let bag = tlGetEditBag();
    if (!bag) return false;
    if (!_edit || _edit.kind === 'self') {
        if (player) { player.talents = bag; try { saveGame(); } catch (e) {} try { recomputeStats(); } catch (e) {} }
        return true;
    }
    return tlWriteSlot(_edit.slot, bag);
}

function tlPut(id) {
    let t = tlGetEditBag();
    let c = tlCanPut(id, t);
    if (!c.ok) { if (typeof logSys === 'function') logSys('<span class="text-red-400">' + c.msg + '</span>'); return false; }
    let node = TL_NODES[id];
    t.pts -= node.cost;
    t.spent[id] = tlLv(id, t) + 1;
    tlPersistEdit();
    return true;
}

function tlReset() {
    let t = tlGetEditBag(); if (!t) return false;
    let day = (window.GD && GD.dayKey) ? GD.dayKey() : new Date().toISOString().slice(0, 10);
    let free = t.resetDay !== day;
    const COST = 1000000;
    // 重置費用只由「當前操作中嘅玩家」付（編輯他人角色亦然）
    let payTag = '（今日免費）';
    if (!free) {
        // 🧭 v3.8.127 重置付款：記憶粉 ×1 → 1,000,000 金 → 龍鑽 ×20（talent-v1 §重置）
        let dust = (player.inv || []).find(i => i && i.id === 'mem_dust');
        let dia = 0; try { dia = typeof pandoraGetSharedDiamonds === 'function' ? Number(pandoraGetSharedDiamonds()) || 0 : 0; } catch (e) {}
        if (dust && typeof consume === 'function') { consume(dust); payTag = '（−記憶粉 ×1）'; }
        else if ((player.gold || 0) >= COST) { player.gold -= COST; payTag = '（−1,000,000 金）'; }
        else if (dia >= 20 && typeof pandoraAdjustSharedDiamonds === 'function' && (pandoraAdjustSharedDiamonds(-20) || {}).ok !== false) { payTag = '（−💎20）'; }
        else { logSys('<span class="text-red-400">重置需要 記憶粉×1、1,000,000 金幣或 💎20（今日免費已用）。</span>'); return false; }
    } else {
        t.resetDay = day; t.resetFreeUsed = true;
    }
    let refund = tlSpentTotal(t);
    t.spent = {};
    t.pts += refund;
    logSys('<span class="text-amber-300">【天賦】</span>' + ((_edit && _edit.name) || '角色') + ' 已重置' + payTag + '，返還 ' + refund + ' 點。');
    tlPersistEdit();
    try { if (_edit && _edit.kind === 'self') saveGame(); else saveGame(); } catch (e) {}
    return true;
}

function tlSummaryLine(t) {
    if (!t) return '未配置';
    let keys = Object.keys(t.spent || {}).filter(id => tlLv(id, t) > 0);
    if (!keys.length) return '尚未投入（剩餘 ' + t.pts + '）';
    return keys.slice(0, 4).map(id => (TL_NODES[id] ? TL_NODES[id].n : id) + tlLv(id, t)).join('、') + (keys.length > 4 ? '…' : '') + '・剩' + t.pts;
}

function tlPanelHtml() {
    if (!_edit) tlSetEditTarget({ kind: 'self', name: (player && player.name) || '自己', lv: player && player.lv });
    let t = tlGetEditBag();
    if (!t) return '<div class="p-4 text-slate-400">請先進入遊戲。</div>';
    let name = (_edit && _edit.name) || '角色';
    let mk = tree => {
        let h = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">';
        Object.keys(TL_NODES).filter(id => TL_NODES[id].tree === tree).forEach(id => {
            let n = TL_NODES[id], lv = tlLv(id, t), can = tlCanPut(id, t).ok;
            h += `<div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:8px">
              <div style="display:flex;justify-content:space-between;gap:6px"><b style="color:#fde68a">${n.n}</b><span style="color:#94a3b8">${lv}/${n.max}</span></div>
              <div style="font-size:12px;color:#cbd5e1;margin:4px 0">${n.d}</div>
              <div style="font-size:11px;color:#64748b">消耗 ${n.cost} 點${n.pre.length ? '・需 ' + n.pre.map(p => TL_NODES[p].n).join('/') : ''}</div>
              <button class="btn" style="margin-top:4px;opacity:${can ? 1 : 0.45}" onclick="TL.put('${id}');try{if(window.gdUiTalentRefresh)gdUiTalentRefresh()}catch(e){}">投入</button>
            </div>`;
        });
        return h + '</div>';
    };
    return `<div style="padding:8px 4px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:8px">
        <div><b style="color:#fbbf24">🧭 ${name} 的天賦</b>（個人・非公會共用）　剩餘 <b style="color:#4ade80">${t.pts}</b>　已投入 ${tlSpentTotal(t)}</div>
        <div style="display:flex;gap:6px">
          <button class="btn" onclick="TL.reset();try{if(window.gdUiTalentRefresh)gdUiTalentRefresh()}catch(e){}">重置</button>
          <button class="btn" onclick="try{if(window.gdUiTalentClose)gdUiTalentClose()}catch(e){}">✕ 關閉</button>
        </div>
      </div>
      <div style="font-size:12px;color:#a8a29e;margin-bottom:6px">點數來自此角色等級（每 5 級 1 點；日後星數另加）。切換角色／存檔位各自獨立。</div>
      <div style="font-weight:bold;color:#93c5fd;margin:8px 0 4px">🧭 冒險樹</div>${mk('adv')}
      <div style="font-weight:bold;color:#fca5a5;margin:12px 0 4px">⚔️ 戰鬥樹</div>${mk('combat')}
    </div>`;
}

function tlOpenSelf() {
    tlSetEditTarget({ kind: 'self', slot: String(typeof currentSlot !== 'undefined' ? currentSlot : ''), name: (player && player.name) || '自己', lv: player && player.lv, star: player && player.star });
    tlOpenOverlay();
}

function tlOpenOverlay() {
    if (typeof window.gdUiTalentOpen === 'function') { window.gdUiTalentOpen(); return; }
    let d = document.getElementById('tl-overlay');
    if (!d) { d = document.createElement('div'); d.id = 'tl-overlay'; d.style.cssText = 'position:fixed;inset:0;z-index:9990;background:rgba(0,0,0,.75);overflow:auto;padding:20px'; document.body.appendChild(d); }
    d.innerHTML = '<div style="max-width:900px;margin:0 auto;background:#0f172a;border:1px solid #475569;border-radius:12px;padding:12px">' + tlPanelHtml() + '</div>';
    window.gdUiTalentRefresh = () => { let x = document.getElementById('tl-overlay'); if (x) { let box = x.firstChild; if (box) box.innerHTML = tlPanelHtml(); } };
    window.gdUiTalentClose = () => { let x = document.getElementById('tl-overlay'); if (x) x.remove(); };
}
function tlOpenMember(m) {
    if (!m || m.self) return tlOpenSelf();
    let slot = String(m.slot);
    if (!/^\d+$/.test(slot)) {
        if (typeof logSys === 'function') logSys('<span class="text-amber-300">此成員沒有獨立存檔位，無法單獨配置天賦。</span>');
        return;
    }
    tlSetEditTarget({ kind: 'slot', slot, name: m.name, lv: m.lv, star: m.star });
    _edit._bag = null;
    tlGetEditBag();
    tlOpenOverlay();
}

// 🧭 v3.8.127 天賦戰鬥葉＋公會便當實際入傷害公式（之前 _tlAtk/_tlMag/_tlDr/_tlBoss 只寫唔讀）
function tlFoodBuff() {
    try { let cb = (typeof ensureClanBase === 'function') ? ensureClanBase() : null; let now = Date.now(), a = 0, df = 0;
        ((cb && cb.buffFood) || []).forEach(f => { if (f && f.expAt > now) { a = Math.max(a, f.atk || 0); df = Math.max(df, f.def || 0); } });
        return { atk: a, def: df }; } catch (e) { return { atk: 0, def: 0 }; }
}
// 傭兵：招募快照帶來源角色 talents → 換身 recompute（02 `p === player` 換身時成立）已寫入 ally.d._tl*；純傭兵無天賦＝1/0。
// 便當：公會（clanBase）共用 → 主角＋參戰傭兵同享。
function tlIsParty(who) {
    if (typeof player === 'undefined' || !who) return false;
    if (who === player) return true;
    return !!(who._slot != null && Array.isArray(player.allies) && player.allies.indexOf(who) >= 0);
}
function tlApplyOutgoing(dmg, who, target, kind) {
    if (!(dmg > 0) || !who || !who.d || !tlIsParty(who)) return dmg;
    let d = who.d, m = kind === 'magic' ? (d._tlMag || 1) : (d._tlAtk || 1);
    if (target && target.boss && d._tlBoss) m *= 1 + d._tlBoss;
    m *= 1 + tlFoodBuff().atk;
    return m === 1 ? dmg : Math.max(1, Math.floor(dmg * m));
}
function tlApplyIncoming(dmg, who) {
    if (!(dmg > 0) || !who || !who.d || !tlIsParty(who)) return dmg;
    let r = (who.d._tlDr || 0) + tlFoodBuff().def;
    return r > 0 ? Math.max(1, Math.floor(dmg * (1 - Math.min(0.3, r)))) : dmg;
}
window.tlApplyOutgoing = tlApplyOutgoing; window.tlApplyIncoming = tlApplyIncoming; window.tlFoodBuff = tlFoodBuff;

window.TL = {
    NODES: TL_NODES, ensure: () => player ? tlBag(player) : null, bag: tlBag, lv: tlLv, put: tlPut, reset: tlReset, canPut: tlCanPut,
    traitFlat: tlTraitFlat, guildScore: tlGuildScore, weightBoost: tlWeightBoost,
    rewardMods: tlRewardMods, rewardModsParty: tlRewardModsParty, has: tlHas, partyHas: tlPartyHas,
    combatMods: tlCombatMods, panelHtml: tlPanelHtml, spentTotal: tlSpentTotal,
    bagOfMember: tlBagOfMember, readSlot: tlReadSlot, writeSlot: tlWriteSlot,
    setEditTarget: tlSetEditTarget, openSelf: tlOpenSelf, openMember: tlOpenMember, summaryLine: tlSummaryLine,
    getEdit: () => _edit
};
})();
