// ===== 🏛️ v3.8.117 冒險者公會・委託板 UI（PC 版面；手機不另做排版）=====
(function () {
'use strict';
let _tab = 'board', _sel = null, _pick = [], _tm = null;
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function css() {
    if (document.getElementById('gd-style')) return;
    let st = document.createElement('style'); st.id = 'gd-style';
    st.textContent = `
#gd-root{position:fixed;inset:0;z-index:9980;background:linear-gradient(160deg,#1c1917,#0c0a09 60%,#1e1b4b);color:#e7e5e4;display:flex;flex-direction:column;font-size:13px}
#gd-root button{cursor:pointer;border:1px solid #57534e;background:#292524;color:#e7e5e4;border-radius:6px;padding:4px 10px;font-size:12px}
#gd-root button:hover:not(:disabled){border-color:#f59e0b}#gd-root button.on{background:#d97706;color:#1c1917;border-color:#f59e0b;font-weight:bold}
#gd-root button:disabled{opacity:.4;cursor:default}
.gd-top{display:flex;align-items:center;gap:10px;padding:8px 12px;border-bottom:1px solid #44403c;background:rgba(0,0,0,.4);flex-wrap:wrap}
.gd-top .t{font-size:17px;font-weight:bold;color:#fcd34d}.gd-fame{width:180px;height:8px;background:#44403c;border-radius:4px;overflow:hidden;display:inline-block;vertical-align:middle}
.gd-fame i{display:block;height:100%;background:linear-gradient(90deg,#f59e0b,#fde68a)}
.gd-tabs{display:flex;gap:6px;padding:6px 12px}
.gd-body{flex:1;display:flex;min-height:0;gap:10px;padding:0 12px 8px}
.gd-left{flex:1;overflow:auto;min-height:0}.gd-right{width:400px;overflow:auto;min-height:0;background:rgba(0,0,0,.35);border:1px solid #44403c;border-radius:10px;padding:10px}
.gd-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:8px}
.gd-card{position:relative;border:1px solid #57534e;border-radius:10px;padding:8px 10px;background:linear-gradient(135deg,#292524,#1c1917);cursor:pointer;min-height:92px}
.gd-card:hover{border-color:#f59e0b}.gd-card.sel{border-color:#fbbf24;box-shadow:0 0 10px rgba(251,191,36,.5)}.gd-card.taken{opacity:.45}
.gd-card .rk{position:absolute;right:8px;top:6px;font-size:22px;font-weight:900;font-family:serif}
.gd-rk-D{color:#a8a29e}.gd-rk-C{color:#4ade80}.gd-rk-B{color:#60a5fa}.gd-rk-A{color:#c084fc}.gd-rk-S{color:#f87171;text-shadow:0 0 8px #ef4444}
.gd-card.bounty{border-color:#b91c1c;background:linear-gradient(135deg,#450a0a,#1c1917)}
.gd-card .ty{font-weight:bold;color:#fde68a}.gd-card .mp{color:#a8a29e;font-size:12px}.gd-card .rw{margin-top:4px;font-size:12px}
.gd-mem{display:flex;align-items:center;gap:8px;padding:5px;border:1px solid #44403c;border-radius:8px;margin-bottom:5px;cursor:pointer}
.gd-mem.on{border-color:#fbbf24;background:rgba(251,191,36,.12)}.gd-mem.no{opacity:.45;cursor:default}
.gd-mem .av{width:58px;height:38px;border-radius:6px;background-size:cover;background-position:50% 22%;flex-shrink:0;background-color:#292524}
.gd-mem .tr{font-size:11px;color:#a8a29e}.gd-rate{height:10px;background:#44403c;border-radius:5px;overflow:hidden;margin:6px 0}.gd-rate i{display:block;height:100%;background:linear-gradient(90deg,#ef4444,#f59e0b,#22c55e)}
.gd-jobs{border-top:1px solid #44403c;padding:6px 12px;display:flex;gap:6px;flex-wrap:wrap;align-items:center;background:rgba(0,0,0,.4);max-height:120px;overflow:auto}
.gd-job{border:1px solid #57534e;border-radius:8px;padding:3px 8px;font-size:12px}.gd-job.done{border-color:#22c55e;color:#86efac}
.gd-mgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px}
.gd-mc{border:1px solid #44403c;border-radius:10px;overflow:hidden;background:#1c1917}.gd-mc .pi{height:110px;background-size:cover;background-position:50% 22%}
.gd-mc .bd{padding:6px 8px;font-size:12px}.gd-bar{display:flex;align-items:center;gap:4px;font-size:11px}.gd-bar b{width:30px;color:#a8a29e;font-weight:normal}.gd-bar span{flex:1;height:5px;background:#44403c;border-radius:3px;overflow:hidden}.gd-bar i{display:block;height:100%;background:#f59e0b}
@media (max-width:700px){.gd-body{flex-direction:column}.gd-right{width:auto}.gd-fame{width:100px}}
#btn-guild-open{margin-left:4px;cursor:pointer;font-size:13px;line-height:1;padding:1px 4px;border:1px solid #a16207;border-radius:4px;background:rgba(113,63,18,.6)}
`;
    document.head.appendChild(st);
}
function root() { let r = document.getElementById('gd-root'); if (!r) { r = document.createElement('div'); r.id = 'gd-root'; document.body.appendChild(r); } return r; }
function fmtT(ms) { if (ms <= 0) return '完成！'; let s = Math.ceil(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return h ? `${h}時${String(m).padStart(2, '0')}分` : `${m}分${String(s % 60).padStart(2, '0')}秒`; }
function open(tab) {
    if (!player || !player.cls) return;
    css(); GD.ensureBoard(); if (tab) _tab = tab;
    render();
    if (!_tm) _tm = setInterval(tickTimers, 1000);
}
function close() { if (_tm) { clearInterval(_tm); _tm = null; } let r = document.getElementById('gd-root'); if (r) r.remove(); try { saveGame(); } catch (e) {} }
function header() {
    let g = GD.data(), lv = GD.level(g), nx = GD.nextFame(g), prev = GD.FAME_LV[lv - 1] || 0;
    let pct = nx ? Math.round((g.fame - prev) / (nx - prev) * 100) : 100;
    let rc = g.refreshUsed >= 1 ? `刷新（${GD.REFRESH_COST.toLocaleString()} 金・剩 ${Math.max(0, GD.REFRESH_MAX + 1 - g.refreshUsed)}）` : '免費刷新';
    return `<div class="gd-top"><span class="t">🏛️ 冒險者公會 Lv${lv}</span><span>名聲 ${g.fame.toLocaleString()}${nx ? ' / ' + nx.toLocaleString() : ' MAX'} <span class="gd-fame"><i style="width:${pct}%"></i></span></span>
      <span>💰 ${(player.gold || 0).toLocaleString()}</span><span>委託板 Lv${GD.boardLv()}・派遣欄 ${GD.data().jobs.length}/${GD.dispatchSlots()}</span>${g.tickets ? `<span>🎟️ ${g.tickets}</span>` : ''}
      <span style="margin-left:auto"></span><button class="on" onclick="gdUiAutoAll()" title="按成功率自動為未接委託挑選最佳成員並派遣">⚡ 一鍵自動派遣</button><button onclick="gdUiRefresh()" ${g.refreshUsed > GD.REFRESH_MAX ? 'disabled' : ''}>${rc}</button><button onclick="gdUiClose()">✕ 返回</button></div>
      <div class="gd-tabs">${[['board', '📜 委託板'], ['members', '👭 成員'], ['jobs', '⏳ 進行中'], ['bond', '💕 好感' + (window.GDA && GDA.pending() ? '（' + GDA.pending() + '）' : '')], ['guild', '🏛️ 公會・設施']].map(t => `<button class="${_tab === t[0] ? 'on' : ''}" onclick="gdUiTab('${t[0]}')">${t[1]}</button>`).join('')}
      <span style="color:#a8a29e;font-size:12px;align-self:center;margin-left:8px">每日 05:00（台北）刷新・普通委託派遣傭兵執行・頭目懸賞於野外親自討伐</span></div>`;
}
function cardHtml(c) {
    let T = GD.TYPES[c.type];
    return `<div class="gd-card${c.type === 'bounty' ? ' bounty' : ''}${_sel === c.id ? ' sel' : ''}${c.taken ? ' taken' : ''}" onclick="gdUiSel('${c.id}')">
      <span class="rk gd-rk-${c.rank}">${c.rank}</span><div class="ty">${T.emoji} ${T.n}${c.kept ? ' 📌' : ''}</div>
      <div class="mp">${esc(c.type === 'bounty' ? '討伐目標：' + (c.bossName || '?') : c.mapName)}・${c.type === 'bounty' ? (c.rank === 'S' ? '親自出戰' : '出戰／派遣') : (c.hours < 1 ? c.hours * 60 + ' 分' : c.hours + ' 小時')}</div>
      <div class="mp">需求：${GD.TRAIT_N[c.trait]} ${c.req}</div>
      <div class="rw">💰 ${c.gold.toLocaleString()}　🎖️ +${c.fame}${c.taken ? (c.cleared ? '　✅ 已完成' : '　📤 已派遣') : (c.accepted ? '　🎯 懸賞中' : '')}</div></div>`;
}
function detailHtml() {
    let g = GD.data(), c = g.board.find(x => x.id === _sel);
    if (!c) return '<div style="color:#a8a29e">← 選擇一張委託以查看詳情與派遣成員。</div>';
    let T = GD.TYPES[c.type], mems = GD.members();
    let picked = _pick.map(s => mems.find(m => m.slot === s)).filter(Boolean);
    let rate = GD.rate(c, picked);
    let h = `<div style="font-size:16px;font-weight:bold"><span class="gd-rk-${c.rank}">${c.rank}</span> ${T.emoji} ${T.n}委託</div>
      <div style="color:#a8a29e">${esc(c.mapName)}（平均 Lv${c.mapAvg}）${c.type === 'bounty' ? '・目標 👑' + esc(c.bossName || '') : ''}</div>
      <div style="margin:6px 0">需求：主 ${GD.TRAIT_N[c.trait]} ${c.req}・副 ${GD.TRAIT_N[c.sub]}　報酬 💰${c.gold.toLocaleString()} 🎖️+${c.fame}</div>`;
    if (c.taken) return h + `<div style="color:#86efac">${c.cleared ? '✅ 已完成' : '📤 已派遣，請到「進行中」查看。'}</div>`;
    if (c.type === 'bounty') {
        let act = (window.GDB && GDB.active()) || null;
        if (act && act.id === c.id) {
            return h + `<div style="margin:8px 0;padding:8px;border:1px solid #f59e0b;border-radius:8px;background:rgba(120,53,15,.35)">🎯 懸賞進行中：前往「${esc(act.mapName)}」掛機即會遭遇 👑${esc(act.bossName)}。<br>蓄力 ${act.charges}・打斷 ${act.interrupts}・格擋 ${act.blocks}・失敗 ${act.fails}・陣亡 ${act.deaths}</div>
              <div style="display:flex;gap:6px"><button class="on" style="flex:1;padding:7px" onclick="gdUiBountyGo()">🧭 前往地圖</button><button onclick="if(confirm('確定放棄此懸賞？'))gdUiBountyAbandon()">放棄</button></div>`;
        }
        if (act) h += `<div style="color:#fbbf24;margin:6px 0">已有進行中的懸賞「${esc(act.bossName)}」，同一時間只能接一張。</div>`;
        try { let tpl = DB.mobs[c.boss] || {};
            if (GD.cbLv('intel') >= 1) h += `<div style="font-size:12px;color:#d6d3d1;margin:4px 0">🗺️ 情報：👑 ${esc(tpl.n || c.bossName)}・Lv${tpl.lv || '?'}・${{ fire: '火', water: '水', wind: '風', earth: '地' }[tpl.e] || '無'}屬性・蓄力預告 ${(window.GDB ? GDB.chargeTicks() / 10 : 4).toFixed(1)} 秒</div>`;
            else h += `<div style="font-size:12px;color:#78716c;margin:4px 0">🗺️ 建造情報室（公會 Lv5）可預覽頭目等級、屬性與蓄力時間。</div>`; } catch (e) {}
        h += `<div style="margin:8px 0;padding:8px;border:1px solid #b91c1c;border-radius:8px;background:rgba(127,29,29,.3)">⚠ 懸賞頭目會蓄力大招：倒數期間以<b>暈眩／冰凍等控制技能</b>或<b>大量傷害</b>打斷，騎士盾牌／絕對屏障可格擋；否則全隊重創。</div>`;
        h += `<button class="on" style="width:100%;padding:8px;font-size:14px" ${GD.bountyReady() ? '' : 'disabled'} onclick="gdUiBounty('${c.id}')">⚔️ 接受懸賞（前往野外討伐）</button>`;
        if (c.rank === 'S') return h;
        h += `<div style="margin-top:8px;color:#a8a29e;font-size:12px">或派遣成員代為討伐（成功率上限 60%，8 小時）：</div>`;
    }
    h += `<div style="margin:6px 0 4px">派遣成員（最多 3 名）：</div>`;
    h += mems.length ? mems.map(m => {
        let on = _pick.indexOf(m.slot) >= 0;
        return `<div class="gd-mem${on ? ' on' : ''}${m.why ? ' no' : ''}" onclick="${m.why ? '' : `gdUiPick('${m.slot}')`}"><div class="av" style="background-image:url('${esc(GD.memberPortrait(m))}')"></div>
          <div style="flex:1;min-width:0"><div>${on ? '✅ ' : ''}${esc(m.name)}・${GD.CLS_LABEL[m.cls] || m.cls} Lv${m.lv} ${'♥'.repeat(Math.min(5, m.tr.affLv))}</div>
          <div class="tr">${GD.TRAIT_N[c.trait]} ${m.tr[c.trait]}・${GD.TRAIT_N[c.sub]} ${m.tr[c.sub]}・體力 ${Math.max(0, m.tr.stamina - m.st.used)}/${m.tr.stamina}${m.why ? '・<span style="color:#f87171">' + m.why + '</span>' : ''}</div></div></div>`;
    }).join('') : '<div style="color:#a8a29e">沒有可派遣的成員。</div>';
    h += `<div>預計成功率：<b style="font-size:16px;color:${rate >= 70 ? '#4ade80' : rate >= 40 ? '#fbbf24' : '#f87171'}">${picked.length ? rate + '%' : '—'}</b></div><div class="gd-rate"><i style="width:${rate}%"></i></div>
      <div style="display:flex;gap:6px"><button onclick="gdUiAuto()">⚡ 自動編成</button><button class="on" style="flex:1;padding:7px" ${picked.length ? '' : 'disabled'} onclick="gdUiDispatch()">📤 派遣</button><button onclick="gdUiKeep('${c.id}')">${c.kept ? '取消收藏' : '📌 收藏'}</button></div>`;
    return h;
}
function membersHtml() {
    let mems = GD.members(true);
    if (!mems.length) return '<div style="color:#a8a29e;padding:20px">沒有可派遣的成員。</div>';
    let bar = (k, v) => `<div class="gd-bar"><b>${GD.TRAIT_N[k]}</b><span><i style="width:${v}%"></i></span>${v}</div>`;
    return `<div class="gd-mgrid">${mems.map(m => `<div class="gd-mc"><div class="pi" style="background-image:url('${esc(GD.memberPortrait(m))}')"></div><div class="bd">
      <div style="font-weight:bold">${esc(m.name)} <span style="color:#a8a29e;font-weight:normal">${GD.CLS_LABEL[m.cls] || m.cls} Lv${m.lv}</span></div>
      <div style="color:#f9a8d4">好感 Lv${m.tr.affLv} ${'♥'.repeat(Math.min(10, m.tr.affLv))}</div>
      ${['power', 'explore', 'talk', 'gather', 'charm'].map(k => bar(k, m.tr[k])).join('')}
      <div style="font-size:11px;color:#a8a29e">體力 ${Math.max(0, m.tr.stamina - m.st.used)}/${m.tr.stamina}${m.why ? '・' + m.why : ''}</div></div></div>`).join('')}</div>`;
}
function jobsHtml(full) {
    let g = GD.data(), now = Date.now();
    let list = g.jobs.map(j => ({ id: j.id, t: `${j.card.rank} ${GD.TYPES[j.card.type].n}・${j.card.mapName}`, who: j.members.map(m => m.name).join('、'), endAt: j.endAt, rate: j.rate }))
        .concat(GD.legacyJobs().map(e => ({ id: e.id, legacy: true, t: `舊探險（已轉入）・${e.mapName}（${e.hours}時）`, who: e.name, endAt: e.endAt })));
    if (!list.length) return full ? '<div style="color:#a8a29e;padding:20px">目前沒有進行中的委託。</div>' : '<span style="color:#78716c">進行中：無</span>';
    let ready = list.filter(x => now >= x.endAt).length;
    let items = list.map(x => `<span class="gd-job${now >= x.endAt ? ' done' : ''}">${esc(x.who)}｜${esc(x.t)}${x.rate ? '｜' + x.rate + '%' : ''}｜<span data-gd-end="${x.endAt}">${fmtT(x.endAt - now)}</span>
        ${now >= x.endAt ? `<button onclick="gdUiClaim('${x.id}',${x.legacy ? 1 : 0})">領取</button>` : ''}</span>`).join('');
    return `<span>進行中 ${list.length}</span>${items}${ready ? `<button class="on" onclick="gdUiClaimAll()">全部領取（${ready}）</button>` : ''}`;
}
function guildHtml() {
    let g = GD.data(), lv = GD.level(g), L = k => GD.cbLv(k);
    let rows = GD.LV_UNLOCK.map((t, i) => i ? `<tr style="${lv >= i ? 'color:#fde68a' : 'color:#78716c'}"><td style="padding:3px 8px">${lv >= i ? '✅' : '🔒'} Lv${i}</td><td style="padding:3px 8px">${GD.FAME_LV[i - 1].toLocaleString()}</td><td style="padding:3px 8px">${t}</td></tr>` : '').join('');
    let fac = [['keep', '🏛️ 公會本部', l => `設施上限 Lv${l}${l >= 10 ? '・公會徽章（特性 +5）' : ''}`], ['explore', '📋 委託板', l => `委託 ${Math.min(12, 6 + Math.floor(l * 0.6))} 張・派遣欄 ${GD.dispatchSlots()}`],
               ['tavern', '🍺 酒館', l => `每日好感事件 +${(l >= 1) + (l >= 4) + (l >= 7) + (l >= 10)}`], ['dorm', '🛏️ 宿舍', l => `成員體力 +${l * 10}%${l >= 10 ? '・同居' : ''}`],
               ['intel', '🗺️ 情報室', l => `蓄力預告 +${(l * 0.2).toFixed(1)} 秒${l >= 10 ? '・弱點常駐' : ''}${lv < 5 ? '（公會 Lv5 開放）' : ''}`], ['blacksmith', '⚒️ 鍛造屋', l => `強化 +${(l * 0.5).toFixed(1)}%・委託裝備 +${l * 3}%`],
               ['training', '🏟️ 訓練場', l => `共享 EXP ${l * 2}%`], ['mage', '🔮 魔法塔', l => `魔傷 +${l}%・調查委託 +${l}%`]];
    let fc = fac.map(f => `<div style="border:1px solid #44403c;border-radius:8px;padding:6px 8px;background:#1c1917"><b>${f[1]}</b> <span style="color:#fbbf24">Lv${L(f[0])}</span><div style="font-size:12px;color:#a8a29e">${f[2](L(f[0]))}</div></div>`).join('');
    return `<div style="display:flex;gap:12px;flex-wrap:wrap"><div style="flex:1;min-width:380px"><div style="font-weight:bold;color:#fcd34d;margin-bottom:4px">公會等級（名聲）</div>
      <table style="border-collapse:collapse;font-size:12px;width:100%">${rows}</table>
      <div style="margin-top:6px;font-size:12px;color:#a8a29e">目前野外加成：金幣 ×${GD.fieldGoldMult().toFixed(2)}・經驗 ×${GD.fieldExpMult().toFixed(2)}</div></div>
      <div style="flex:1;min-width:380px"><div style="font-weight:bold;color:#fcd34d;margin-bottom:4px">設施（於血盟據點分頁升級）</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">${fc}</div>
      <button class="on" style="margin-top:8px" onclick="gdUiGoBase()">🏰 前往據點升級設施</button></div></div>`;
}
function render() {
    let r = root();
    let body;
    if (_tab === 'board') {
        let b = GD.ensureBoard();
        body = `<div class="gd-body"><div class="gd-left"><div class="gd-grid">${b.map(cardHtml).join('')}</div></div><div class="gd-right" id="gd-detail">${detailHtml()}</div></div>`;
    } else if (_tab === 'members') body = `<div class="gd-body"><div class="gd-left">${membersHtml()}</div></div>`;
    else if (_tab === 'bond') body = `<div class="gd-body"><div class="gd-left">${window.GDA ? GDA.html() : ''}</div></div>`;
    else if (_tab === 'guild') body = `<div class="gd-body"><div class="gd-left">${guildHtml()}</div></div>`;
    else body = `<div class="gd-body"><div class="gd-left" style="display:flex;flex-wrap:wrap;gap:6px;align-content:flex-start">${jobsHtml(true)}</div></div>`;
    r.innerHTML = header() + body + `<div class="gd-jobs" id="gd-jobs">${jobsHtml(false)}</div>`;
}
let _lastReady = -1;
function tickTimers() {
    let r = document.getElementById('gd-root'); if (!r) { clearInterval(_tm); _tm = null; return; }
    let now = Date.now(), ready = 0;
    r.querySelectorAll('[data-gd-end]').forEach(el => { let e = +el.getAttribute('data-gd-end'); if (now >= e) ready++; let t = fmtT(e - now); if (el.textContent !== t) el.textContent = t; });
    if (ready !== _lastReady) { _lastReady = ready; let j = document.getElementById('gd-jobs'); if (j) j.innerHTML = jobsHtml(false); }
}
function rerenderDetail() { let d = document.getElementById('gd-detail'); if (d) d.innerHTML = detailHtml(); else render(); }

window.gdUiOpen = open; window.gdUiClose = close;
window.gdUiTab = t => { _tab = t; render(); };
window.gdUiSel = id => { _sel = id; _pick = []; render(); };
window.gdUiPick = s => { let i = _pick.indexOf(s); if (i >= 0) _pick.splice(i, 1); else if (_pick.length < 3) _pick.push(s); rerenderDetail(); };
window.gdUiDispatch = () => { let r = GD.dispatch(_sel, _pick); if (!r.ok) { try { logSys('<span class="text-red-400">' + r.msg + '</span>'); } catch (e) {} alertMsg(r.msg); return; } _pick = []; render(); };
window.gdUiKeep = id => { GD.keep(id); render(); };
window.gdUiRefresh = () => { if (GD.refresh()) { _sel = null; _pick = []; } render(); };
window.gdUiClaim = (id, legacy) => { if (legacy) GD.claimLegacy(id); else GD.claim(id); render(); };
window.gdUiClaimAll = () => { GD.claimAll(); render(); };
window.gdUiBounty = id => { if (typeof window.gdBountyAccept === 'function') { let r = window.gdBountyAccept(id); if (r && r.ok) { close(); } else if (r && r.msg) alertMsg(r.msg); } };
window.gdUiBountyGo = () => { if (window.gdBountyGo) { close(); gdBountyGo(); } };
window.gdUiBountyAbandon = () => { if (window.gdBountyAbandon) gdBountyAbandon(); render(); };
window.gdUiGoBase = () => { close(); try { let b = document.querySelector("[onclick*=\"switchTab('clanbase'\"]"); if (b) b.click(); } catch (e) {} };
window.gdUiAuto = () => { let c = GD.data().board.find(x => x.id === _sel); if (!c) return; let p = GD.autoPick(c); if (!p) { alertMsg('沒有可派遣的成員。'); return; } _pick = p.slots; rerenderDetail(); };
window.gdUiAutoAll = () => { let n = GD.autoDispatchAll(); _pick = []; render(); if (n) { let j = document.getElementById('gd-jobs'); if (j) j.insertAdjacentHTML('afterbegin', '<span style="color:#86efac">⚡ 已自動派遣 ' + n + ' 件委託</span>'); } };
function alertMsg(m) { let d = document.getElementById('gd-detail'); if (d) { let x = document.createElement('div'); x.style.cssText = 'color:#f87171;margin-top:6px'; x.textContent = m; d.appendChild(x); } }

function addBtn() {
    css();
    let cn = document.getElementById('st-classname');
    if (!cn || document.getElementById('btn-guild-open')) return;
    let b = document.createElement('span'); b.id = 'btn-guild-open'; b.title = '冒險者公會'; b.textContent = '🏛️';
    b.onclick = ev => { ev.stopPropagation(); open(); };
    let after = document.getElementById('btn-portrait-pick') || cn;
    after.parentNode.insertBefore(b, after.nextSibling);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(addBtn, 50)); else setTimeout(addBtn, 50);
setTimeout(addBtn, 1600);
})();
