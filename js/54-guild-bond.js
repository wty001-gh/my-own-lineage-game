// ===== 💕 v3.8.119 冒險者公會：成員好感度（每日事件三選一＋送禮）=====
// 好感 Lv1–10（宿舍 Lv10「同居」→12）；每級需 100×級數。每日事件 3 次＋酒館（Lv1/4/7/10 各 +1）＋公會 Lv9 +1。
// 選得最好 +40、普通 +20、不太好 +5；送禮：職業喜好 +30、其他 +10，每人每日 3 份。
// 寫作規範：浪漫、曖昧、溫馨；無性描寫、無裸露；所有成員皆為成年冒險者。
(function () {
'use strict';
// {n}＝成員名。opts：[選項, 分數, 回應]
const EVENTS = [
    { id: 'moon', where: '🍺 酒館', line: '「公會長，今晚的月色真美……陪我喝一杯，好嗎？」',
      opts: [['「好，這杯我請。」', 40, '「呵呵，那就說好了——今晚你可不准先走喔。」'], ['「明天還有委託，早點休息吧。」', 20, '「……也是呢。你總是這麼認真。」'], ['（默默點頭，眼神飄向別處）', 5, '「欸？你在發呆嗎？真是的……」']] },
    { id: 'spar', where: '🏟️ 訓練場', line: '「再來一次！這次不准你讓我。」她撥開被汗水沾濕的瀏海，眼神閃閃發亮。',
      opts: [['「好，全力以赴。」', 40, '「這才像話！……剛才那一下，有點帥呢。」'], ['「先休息一下吧，別勉強。」', 20, '「哼，只有這次聽你的。」'], ['「你已經夠強了，不用練了。」', 5, '「……你是在敷衍我吧？」']] },
    { id: 'return', where: '📜 委託歸來', line: '「……任務完成了。你該不會，一直在擔心我吧？」',
      opts: [['「當然擔心。歡迎回來。」', 40, '她別過臉，耳尖卻紅了：「……我回來了。」'], ['「我知道你一定做得到。」', 20, '「嗯，因為是你交給我的任務嘛。」'], ['「報告寫好了嗎？」', 5, '「……你這個人真的很不解風情耶。」']] },
    { id: 'night', where: '🌙 深夜', night: true, line: '「睡不著……可以說個故事給我聽嗎？就一個。」',
      opts: [['「那就說勇者與公主的故事吧。」', 40, '聽到一半，她靠著你的肩膀睡著了，嘴角帶著笑。'], ['「陪你看一會兒星星吧。」', 20, '「……星星好多。有你在，好像就不怕黑了。」'], ['「快去睡，明天要早起。」', 5, '「……小氣鬼。」']] },
    { id: 'rain', where: '🌧️ 雨天', line: '「下雨了呢……傘只有一把。要不要，一起撐？」',
      opts: [['「靠近一點，別淋濕了。」', 40, '「……嗯。」她的肩膀輕輕碰著你，誰也沒有再說話。'], ['「傘給你，我跑回去就好。」', 20, '「笨蛋！感冒了誰來帶公會啊……」'], ['「等雨停再走吧。」', 5, '「……也好啦。」她小聲地嘆了口氣。']] },
    { id: 'ribbon', where: '🛍️ 市集', line: '「這條髮帶……你覺得適合我嗎？」她把髮帶比在髮梢，偷偷看著你的反應。',
      opts: [['「很適合你，我買給你。」', 40, '「真的？那我每天都戴著。」'], ['「旁邊那條紅色的更襯你。」', 20, '「是嗎？原來你喜歡紅色啊……記住了。」'], ['「都差不多吧。」', 5, '「……問你真是白問了。」']] },
    { id: 'bento', where: '🍱 午後', line: '「我、我試著做了便當……味道可能不太好，你別勉強。」',
      opts: [['「很好吃。謝謝你。」', 40, '「真的嗎？那……明天也幫你做。」'], ['「下次我們一起做吧。」', 20, '「一起……嗯，好啊。」'], ['「還可以，鹽放多了點。」', 5, '「……下次會注意的啦。」']] },
    { id: 'wound', where: '🩹 歸途', line: '「只是小傷，不用大驚小怪……喂，你幹嘛握著我的手？」',
      opts: [['「別動，讓我幫你包紮。」', 40, '「……你的手好溫暖。再握一下下就好。」'], ['「下次別這麼逞強了。」', 20, '「知道啦……謝謝你。」'], ['「那我放手了。」', 5, '「……誰叫你真的放開啊。」']] },
    { id: 'armor', where: '⚒️ 鍛造屋', line: '「新打的鎧甲……看起來怎麼樣？會不會很奇怪？」',
      opts: [['「很好看，英姿颯爽。」', 40, '「嘿嘿，被你這麼說，穿起來都輕了呢。」'], ['「防禦力應該不錯。」', 20, '「重點不是那個啦……不過，謝謝。」'], ['「肩甲好像有點歪。」', 5, '「……你只看得到這個嗎？」']] },
    { id: 'star', where: '🌠 流星夜', line: '「聽說對著流星許願就會實現。你許了什麼願？」',
      opts: [['「希望能一直和你一起冒險。」', 40, '「……笨蛋，說出來就不靈了啦。」她卻笑得比星星還亮。'], ['「希望公會升到十級。」', 20, '「真像你會許的願。那我幫你一起實現。」'], ['「秘密。」', 5, '「小氣。那我也不告訴你。」']] },
    { id: 'jealous', where: '🍺 酒館', line: '「最近你好像常常和別人一起出任務呢……沒什麼，我只是隨口問問。」',
      opts: [['「下一趟，只帶你去。」', 40, '「……說好了喔？不准反悔。」'], ['「大家都是重要的夥伴。」', 20, '「我知道啦……只是有點在意而已。」'], ['「你在吃醋嗎？」', 5, '「才、才沒有！」她猛地轉過身去。']] },
    { id: 'dance', where: '💃 舞會', line: '「酒館今晚有舞會……你，會跳舞嗎？」',
      opts: [['「不太會，你教我吧。」', 40, '「那，手給我。跟著我的節奏……對，就是這樣。」'], ['「踩到你的腳可別生氣。」', 20, '「呵呵，那我就踩回來。」'], ['「我只會揮劍。」', 5, '「……那你就在旁邊看著吧。」']] },
    { id: 'morning', where: '☀️ 清晨', line: '「早安，公會長。你的頭髮翹起來了……別動，我幫你整理。」',
      opts: [['「謝謝，有你真好。」', 40, '「……一大早就說這種話，犯規。」'], ['「你起得真早。」', 20, '「因為想在出發前見你一面啊。」'], ['「我自己來就好。」', 5, '「……好吧。」她有點失落地收回了手。']] },
    { id: 'letter', where: '✉️ 委託前夕', line: '「這封信……等我出發之後你再看，好嗎？現在不准打開！」',
      opts: [['「我會好好收著，等你平安回來。」', 40, '「嗯……一定會回來的。因為還有話想當面跟你說。」'], ['「裡面寫了什麼？」', 20, '「秘、密！」'], ['（當場拆開）', 5, '「啊啊啊！不是說了不准嗎！」']] }
];
const GIFTS = [
    { id: 'flower', n: '💐 花束', cost: 20000 },
    { id: 'sweet', n: '🍰 甜點', cost: 50000 },
    { id: 'perfume', n: '🌸 香水', cost: 120000 },
    { id: 'jewel', n: '💍 首飾', cost: 300000 },
    { id: 'book', n: '📖 古書', cost: 80000 }
];
const FAV = { knight: 'sweet', royal: 'jewel', elf: 'flower', illusion: 'book', warrior: 'sweet', mage: 'book', dark: 'perfume', dragon: 'jewel' };
const AFF_LINES = { 3: '解鎖專屬台詞', 5: '派遣特性再提升', 7: '解鎖親密台詞', 10: '稱號「摯愛」' };
const TALK = {
    3: '「和你一起的日子，好像每天都在發光。」',
    7: '「公會長……不，在只有我們的時候，可以叫你的名字嗎？」',
    10: '「無論走到哪裡，我的歸處都是你身邊。」'
};

function _hash(s) { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h || 7; }
function _rng(seed) { let s = seed >>> 0 || 7; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return (s >>> 0) / 4294967296; }; }
function cur() { try { return String(currentSlot); } catch (e) { return ''; } }
function evCount() { let t = 0; try { t = (typeof cbTavernEvents === 'function') ? cbTavernEvents(GD.cbLv('tavern')) : 0; } catch (e) {} if (!t) { let l = GD.cbLv('tavern'); t = (l >= 1) + (l >= 4) + (l >= 7) + (l >= 10); } return 3 + t + (GD.level() >= 9 ? 1 : 0); }
function isNight() { try { return typeof wxIsNight === 'function' && wxIsNight(); } catch (e) { return false; } }
function ensure() {
    let g = GD.data(); if (!g) return null;
    let day = GD.dayKey();
    if (!g.aff || g.aff.day !== day) g.aff = { day, list: [], gifts: {} };
    let want = evCount(), mems = GD.members(true);
    if (!mems.length) return g.aff;
    if (g.aff.list.length < want) {
        let r = _rng(_hash(day + '|aff|' + cur() + '|' + g.aff.list.length));
        let night = isNight();
        while (g.aff.list.length < want) {
            let m = mems[Math.floor(r() * mems.length)];
            let pool = EVENTS.filter(e => (!e.night || night) && !g.aff.list.some(x => x.ev === e.id));
            if (!pool.length) pool = EVENTS;
            let e = pool[Math.floor(r() * pool.length)];
            let order = [0, 1, 2].sort(() => r() - 0.5);
            g.aff.list.push({ slot: m.slot, name: m.name, cls: m.cls, ev: e.id, order, pick: -1 });
        }
    }
    return g.aff;
}
function addAff(slot, n) {
    let st = GD.memberState(slot), lv0 = GD.affLv(st.aff);
    st.aff += n;
    let lv1 = GD.affLv(st.aff);
    GD.gdRefreshMembers();
    return { lv0, lv1 };
}
function choose(i, k) {
    let a = ensure(); if (!a) return null;
    let x = a.list[i]; if (!x || x.pick >= 0) return null;
    let e = EVENTS.find(v => v.id === x.ev); if (!e) return null;
    let o = e.opts[x.order[k]]; if (!o) return null;
    x.pick = x.order[k];
    let r = addAff(x.slot, o[1]);
    logSys(`<span class="text-pink-300">💕 ${x.name}：</span>${o[2]}（好感 +${o[1]}）`);
    if (r.lv1 > r.lv0) lvUpLog(x.name, r.lv1);
    try { saveGame(); } catch (e2) {}
    return { score: o[1], reply: o[2], lvUp: r.lv1 > r.lv0 ? r.lv1 : 0 };
}
function lvUpLog(name, lv) { logSys(`<span class="text-pink-200 font-bold">💗 與 ${name} 的好感升至 Lv${lv}！${AFF_LINES[lv] ? '（' + AFF_LINES[lv] + '）' : ''}</span>`); }
function gift(slot, gid) {
    let a = ensure(), G = GIFTS.find(x => x.id === gid); if (!a || !G) return { ok: false, msg: '無效的禮物。' };
    let m = GD.members(true).find(x => x.slot === String(slot)); if (!m) return { ok: false, msg: '找不到成員。' };
    let used = a.gifts[slot] || 0; if (used >= 3) return { ok: false, msg: `今天已經送給 ${m.name} 3 份禮物了。` };
    if ((player.gold || 0) < G.cost) return { ok: false, msg: `金幣不足（需要 ${G.cost.toLocaleString()}）。` };
    player.gold -= G.cost; a.gifts[slot] = used + 1;
    let fav = FAV[m.cls] === gid, n = fav ? 30 : 10;
    let r = addAff(slot, n);
    logSys(`<span class="text-pink-300">🎁 送給 ${m.name} ${G.n}：</span>${fav ? '「這是……我最喜歡的！你怎麼知道？」' : '「謝謝你，我會好好珍惜的。」'}（好感 +${n}）`);
    if (r.lv1 > r.lv0) lvUpLog(m.name, r.lv1);
    try { saveGame(); } catch (e) {}
    return { ok: true, fav, n };
}

// ---------- UI（嵌入 js/52 委託板視窗的「💕 好感」分頁）----------
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
let _gsel = '', _last = null;
function css() {
    if (document.getElementById('gda-style')) return;
    let s = document.createElement('style'); s.id = 'gda-style';
    s.textContent = `.gda-wrap{display:flex;gap:10px;min-height:0;height:100%}.gda-ev{flex:1.4;overflow:auto}.gda-gift{flex:1;overflow:auto;background:rgba(0,0,0,.3);border:1px solid #44403c;border-radius:10px;padding:8px}
.gda-card{display:flex;gap:10px;border:1px solid #9d174d;border-radius:12px;padding:8px;margin-bottom:8px;background:linear-gradient(135deg,rgba(80,7,36,.55),rgba(28,25,23,.9))}
.gda-card.done{border-color:#44403c;opacity:.7}.gda-pi{width:110px;height:140px;border-radius:10px;background-size:cover;background-position:50% 18%;flex-shrink:0;background-color:#292524}
.gda-who{color:#f9a8d4;font-weight:bold}.gda-line{margin:4px 0 6px;line-height:1.5}.gda-opt{display:block;width:100%;text-align:left;margin-bottom:4px}
#gd-root .gda-opt{background:rgba(131,24,67,.35);border-color:#9d174d}#gd-root .gda-opt:hover{border-color:#f9a8d4}
.gda-reply{color:#fbcfe8;font-style:italic}.gda-m{display:flex;align-items:center;gap:6px;padding:4px;border:1px solid #44403c;border-radius:8px;margin-bottom:4px;cursor:pointer}
.gda-m.on{border-color:#f472b6;background:rgba(244,114,182,.12)}.gda-m .av{width:40px;height:40px;border-radius:50%;background-size:cover;background-position:50% 18%;flex-shrink:0}
.gda-hb{height:5px;background:#44403c;border-radius:3px;overflow:hidden;margin-top:2px}.gda-hb i{display:block;height:100%;background:linear-gradient(90deg,#ec4899,#f9a8d4)}`;
    document.head.appendChild(s);
}
function html() {
    css();
    let a = ensure(), mems = GD.members(true);
    if (!mems.length) return '<div style="color:#a8a29e;padding:20px">沒有其他存檔角色。建立新角色後即可與成員培養好感。</div>';
    let left = a.list.length - a.list.filter(x => x.pick >= 0).length;
    let ev = `<div style="margin-bottom:6px;color:#fbcfe8">今日事件 ${a.list.length - left}/${a.list.length}（酒館 Lv${GD.cbLv('tavern')}${GD.level() >= 9 ? '・公會 Lv9 +1' : ''}）・每日 05:00 刷新</div>`;
    ev += a.list.map((x, i) => {
        let e = EVENTS.find(v => v.id === x.ev); if (!e) return '';
        let m = mems.find(v => v.slot === x.slot) || { cls: x.cls, name: x.name };
        let pic = GD.memberPortrait(m);
        let body = x.pick >= 0 ? `<div class="gda-reply">你：${esc(e.opts[x.pick][0])}<br>${esc(x.name)}：${esc(e.opts[x.pick][2])}　<b style="color:#f9a8d4">+${e.opts[x.pick][1]}</b></div>`
            : x.order.map((k, j) => `<button class="gda-opt" onclick="gdaChoose(${i},${j})">${esc(e.opts[k][0])}</button>`).join('');
        return `<div class="gda-card${x.pick >= 0 ? ' done' : ''}"><div class="gda-pi" style="background-image:url('${esc(pic)}')"></div><div style="flex:1;min-width:0">
          <div class="gda-who">${e.where}・${esc(x.name)}（${GD.CLS_LABEL[x.cls] || x.cls}）</div><div class="gda-line">${esc(e.line)}</div>${body}</div></div>`;
    }).join('');
    if (!_gsel || !mems.some(m => m.slot === _gsel)) _gsel = mems[0].slot;
    let sel = mems.find(m => m.slot === _gsel), cap = GD.affCap();
    let gf = `<div style="font-weight:bold;color:#f9a8d4;margin-bottom:4px">🎁 送禮・成員好感（上限 Lv${cap}）</div>`;
    gf += mems.map(m => { let nx = GD.affNext(m.st.aff); let pct = nx ? Math.round(nx.have / nx.need * 100) : 100;
        return `<div class="gda-m${m.slot === _gsel ? ' on' : ''}" onclick="gdaSel('${m.slot}')"><div class="av" style="background-image:url('${esc(GD.memberPortrait(m))}')"></div><div style="flex:1;min-width:0">
          <div>${esc(m.name)} <span style="color:#a8a29e;font-size:11px">${GD.CLS_LABEL[m.cls] || m.cls}</span> <span style="color:#f472b6">Lv${m.tr.affLv}${m.tr.affLv >= 10 ? '・摯愛' : ''}</span></div>
          <div class="gda-hb"><i style="width:${pct}%"></i></div></div><span style="font-size:11px;color:#a8a29e">🎁${(a.gifts[m.slot] || 0)}/3</span></div>`; }).join('');
    if (sel) {
        let al = sel.tr.affLv, lines = Object.keys(TALK).filter(k => al >= +k).map(k => `<div class="gda-reply" style="margin:2px 0">Lv${k}：${TALK[k]}</div>`).join('');
        gf += `<div style="margin-top:6px;border-top:1px solid #44403c;padding-top:6px"><b>${esc(sel.name)}</b> 喜好禮物：${al >= 3 ? `<span style="color:#f9a8d4">${(GIFTS.find(x => x.id === FAV[sel.cls]) || {}).n || '?'}</span>` : '<span style="font-size:11px;color:#78716c">好感 Lv3 後得知</span>'}
          <div style="display:flex;flex-wrap:wrap;gap:4px;margin:6px 0">${GIFTS.map(G => `<button onclick="gdaGift('${sel.slot}','${G.id}')" ${(a.gifts[sel.slot] || 0) >= 3 || (player.gold || 0) < G.cost ? 'disabled' : ''}>${G.n} ${(G.cost / 10000)}萬</button>`).join('')}</div>${lines}</div>`;
    }
    if (_last) gf += `<div style="margin-top:6px;color:${_last.ok === false ? '#f87171' : '#86efac'}">${esc(_last.msg)}</div>`;
    return `<div class="gda-wrap"><div class="gda-ev">${ev}</div><div class="gda-gift">${gf}</div></div>`;
}
function rer() { try { if (typeof gdUiTab === 'function') gdUiTab('bond'); } catch (e) {} }
window.gdaChoose = (i, k) => { let r = choose(i, k); _last = r ? { msg: r.lvUp ? `好感升至 Lv${r.lvUp}！` : `好感 +${r.score}` } : null; rer(); };
window.gdaSel = s => { _gsel = String(s); _last = null; rer(); };
window.gdaGift = (s, gid) => { let r = gift(s, gid); _last = r.ok ? { msg: r.fav ? `正中喜好！好感 +${r.n}` : `好感 +${r.n}` } : { ok: false, msg: r.msg }; rer(); };
window.GDA = { html, ensure, choose, gift, EVENTS, GIFTS, FAV, pending: () => { try { let a = ensure(); return a ? a.list.filter(x => x.pick < 0).length : 0; } catch (e) { return 0; } } };
})();
