// ===== 🏰 v3.10.0 自走棋唯一戰鬥：停用舊掛機戰鬥＋公會大廳首頁 =====
// 存檔完全唔郁（player.* 全保留）；只係唔再跑舊 tick、隱藏舊戰鬥畫面。設 AB_ONLY.enabled=false（要喺載入前）可還原。
(function () {
'use strict';
var AB_ONLY = window.AB_ONLY = window.AB_ONLY || {
  enabled: true,
  hideTabs: ['automation', 'trial', 'pvp', 'worldevent', 'audit'],   // 舊戰鬥／社交／事件分頁（血盟／據點保留）
  offlinePopupMinH: 0.25,                                           // 離線 ≥15 分鐘先彈收益窗
  bg: 'assets/area/1920x1080/惡夢-提卡爾祭壇.jpg'
};
if (!AB_ONLY.enabled) return;
document.documentElement.classList.add('ab-only');
// 1) 停用舊戰鬥迴圈：gameLoop 以全域名呼叫 tick()；改做空函式（舊 tick 留喺 window.__oldTick 方便 debug）
try { if (typeof tick === 'function' && !window.__oldTick) { window.__oldTick = tick; tick = function () {}; } } catch (e) {}
function stopOld() { try { if (typeof state !== 'undefined' && state) { state.running = false; } } catch (e) {} }
setInterval(stopOld, 1000);
function H(t, c, h) { var e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; }
function fmt(n) { return Math.round(n || 0).toLocaleString(); }
function A() { return window.abHome; }
function hasP() { return typeof player !== 'undefined' && player && player.cls; }
// 2) 公會大廳
function hall() { var c = document.getElementById('col-center'); if (!c) return null; var h = document.getElementById('ab-hall');
  if (!h) { h = H('div', 'ab-hall'); h.id = 'ab-hall'; c.insertBefore(h, c.firstChild); } return h; }
var HI = 0;   // 目前展示嘅英雄 index
var RW = { SSR: 4, SR: 3, R: 2, N: 1 };
function heroList() { return (A().heroes() || []).slice().sort(function (a, b) { return (RW[b.rarity] || 0) - (RW[a.rarity] || 0) || (b.lv || 0) - (a.lv || 0); }); }
function fullArt(h) { if (!h) return ''; if (window.heroPortraitUrl && h.defId) { var u0 = window.heroPortraitUrl(h); if (u0) return u0; } try { var e = typeof portraitEntryOf === 'function' && portraitEntryOf({ portraitId: h.portraitId, cls: h.cls }); if (e && e.file) return e.file; } catch (x) {} return A().heroPor(h); }
function fullArtOnErr(img, h) { try { var e = typeof portraitEntryOf === 'function' && portraitEntryOf({ portraitId: h.portraitId, cls: h.cls }); img.onerror = null; img.src = (e && (e.file || e.thumb)) || A().heroPor(h) || ''; } catch (x) { img.style.visibility = 'hidden'; } }
function preferFull(h) { if (h && window.heroPortraitUrl && (h.defId || h.portraitId)) { var u = window.heroPortraitUrl(h); if (u) return u; } var id = h && (h.defId || h.id); return id ? ('assets/hero-full/' + id + '.jpg') : fullArt(h); }
function badges() { var api = A(), ab = api.state() || {}, b = {}; var pv = api.offPreview(); if (pv && pv.h >= api.offCap() * 0.5) b.off = 1;
  var now = Date.now(); if ((ab.dispatch || []).some(function (d) { return now >= d.until; }) || (ab.dispatch || []).length < AB_ECON_SLOTS()) b.disp = 1;
  if (((player.gacha && player.gacha.tickets) || 0) > 0) b.hero = (player.gacha.tickets > 99 ? '99+' : player.gacha.tickets);
  try { var wtk0 = (window.AB_WPN && AB_WPN.tickets) ? AB_WPN.tickets() : ((player.gacha && player.gacha.wpnTickets) || 0); if (wtk0 > 0) b.wpn = wtk0 > 99 ? '99+' : wtk0; } catch (eW) {}
  try { var c = Object.keys(api.CLS).some(function (k) { var lv = api.campLv(k); if (lv >= AB_CAMP.maxLv) return false; var cost = AB_ECON.campCost(lv); return player.gold >= cost.gold && api.matN(k) >= cost.mats && (ab.cores || 0) >= (cost.cores || 0); }); if (c) b.camp = 1; } catch (e) {}
  try { var miss = abCodexMissCount(); if (miss > 0) b.codex = miss > 99 ? '99+' : miss; } catch (e2) {}
  return b; }
function abCodexMissCount() {
  var HD = (typeof HERO_DB !== 'undefined' && HERO_DB) || {}, own = {}, api = A();
  try { own = (api && api.ownedDefIds) ? api.ownedDefIds() : {}; } catch (e) { own = {}; }
  var n = 0; Object.keys(HD).forEach(function (id) {
    var open = !(window.AB_WL && AB_WL.enabled) || (typeof wlHero === 'function' ? wlHero(id) : (api && api.wlHero && api.wlHero(id)));
    if (open && !own[id]) n++;
  }); return n;
}
function AB_ECON_SLOTS() { try { return AB_ECON.dispatch.slots; } catch (e) { return 2; } }
function icon(id, ic, t, bd) { return '<button class="abl-ic" id="' + id + '"><i>' + ic + '</i><span>' + t + '</span>' + (bd ? '<em class="abl-bd">' + (bd === 1 ? '!' : bd) + '</em>' : '') + '</button>'; }
function render() { var h = hall(); if (!h || !A() || !hasP()) return; var api = A(), ab = api.state() || {}, mi = api.mainInfo() || {}, C = api.CLS;
  var hs = heroList(); if (HI >= hs.length) HI = 0; var cur = hs[HI];
  var D = api.dgBuild(), farm = ab.dg && ab.dg.farm && D.byV[ab.dg.farm], last = ab.dg && ab.dg.last && D.byV[ab.dg.last];
  var tk = (player.gacha && player.gacha.tickets) || 0, dia = 0; try { dia = typeof pandoraGetSharedDiamonds === 'function' ? pandoraGetSharedDiamonds() : 0; } catch (e) {}
  var B = badges(), HD = (typeof HERO_DB !== 'undefined' && HERO_DB) || {}, cd = cur ? (HD[cur.defId] || {}) : {};
  var tip = '';
  try { var z09 = D.byV && D.byV.zone_09; var req4 = 19; try { if (z09 && window.abDebug) req4 = abDebug.dgReqLv(z09); } catch (e2) {}
    if ((player.lv || 1) < req4) tip = '<div class="abl-tip">💡 未夠 Lv' + req4 + ' 打古魯丁 4F：去「說話之島」關卡練級／通關設農場，離線同派遣都會餵 EXP。而家 Lv' + (player.lv || 1) + (farm ? '・農場 ' + farm.n : '・未設農場') + '</div>';
  } catch (e) {}
  h.className = 'ab-hall abl'; h.style.backgroundImage = 'radial-gradient(ellipse at 50% 55%,rgba(250,204,21,.18),rgba(2,6,23,.2) 40%,rgba(2,6,23,.92) 80%),url("' + AB_ONLY.bg + '")';
  h.innerHTML =
    '<div class="abl-top"><div class="abl-me"><img src="' + (mi.por || '') + '" onerror="this.style.visibility=\'hidden\'"><div><b>' + (mi.name || '主角') + '</b><small>' + ((C[mi.cls] || {}).lb || '') + ' Lv' + (player.lv || 1) + '</small><small class="abl-fame">' + (api.fameTxt ? api.fameTxt() : '公會 Lv' + api.guildLv()) + '</small></div></div>' +
    '<div class="abl-res"><span>💰' + fmt(player.gold) + '</span><span>💎' + fmt(dia) + '</span><span title="英雄招募券">🎫' + fmt(tk) + '</span><span title="專武券">⚔' + fmt((window.AB_WPN && AB_WPN.tickets) ? AB_WPN.tickets() : ((player.gacha && player.gacha.wpnTickets) || 0)) + '</span><span>📦' + fmt(ab.cores) + '</span></div></div>' +
    '<div class="abl-body"><div class="abl-side L">' + icon('abh-dg', '🗺', '地監') + icon('abh-camp', '🏕', '營地', B.camp || B.disp) + icon('abh-hero', '🎫', '招募', B.hero) + icon('abh-wpn', '⚔', '專武', B.wpn) + icon('abh-codex', '📒', '圖鑑', B.codex) + icon('abh-wiki', '📖', '百科') + icon('abh-hist', '📜', '戰績') + '</div>' +
    '<div class="abl-stage">' + (cur ? '<button class="abl-arr l" id="abl-prev">‹</button><img class="abl-full r-' + cur.rarity + '" id="abl-full" src="' + preferFull(cur) + '" draggable="false" onerror="fullArtOnErr(this, heroList()[HI]||{})"><button class="abl-arr r" id="abl-next">›</button>' +
      '<div class="abl-name"><em class="r-' + cur.rarity + '">' + cur.rarity + '</em><b>' + cur.name + '</b><small>' + ((C[cur.cls] || {}).lb || '') + ' · Lv' + (cur.lv || 1) + ' · ' + '★'.repeat(Math.max(1, cur.star || 0)) + '</small><small class="abl-cnt">' + (HI + 1) + ' / ' + hs.length + (cd.blurb ? ' · ' + cd.blurb : '') + '</small></div>' : '<div class="abl-none" id="abh-none" role="button" tabindex="0">未有英雄<br>撳呢度去「招募」</div>') + '</div></div>' +
    tip + '<div class="abl-bot"><div class="abl-info"><span>' + (last ? '上次：' + last.n : '未出發') + '<br>農場：' + (farm ? farm.n : '未有') + '</span><button type="button" class="abl-off" id="abh-off">🌙 領離線' + (B.off ? '<em class="abl-bd">!</em>' : '') + '</button></div><button class="abl-go abl-camp" id="abh-base"><span>🏰 據點</span></button><button class="abl-go" id="abh-start"><span>⚔ 出發</span><small>揀 4 職業＋關卡</small></button>' +
    '<div class="abl-focus">🎯 重點營地<select id="abl-focus"><option value="">（冇）</option>' + Object.keys(C).map(function (k) { return '<option value="' + k + '"' + (ab.focus === k ? ' selected' : '') + '>' + C[k].ic + C[k].lb + ' ' + api.matN(k) + '</option>'; }).join('') + '</select></div></div>';
  var q = function (id, f) { var b = h.querySelector('#' + id); if (b) b.onclick = f; };
  q('abh-start', function () { api.pick(); }); q('abh-dg', function () { api.pick(); });
  var campPage = function () { openPage('camp', '🏕 職業營地・鐵匠・派遣', function (el) { api.campsIn(el); }); };
  var heroPage = function () { openPage('hero', '🎫 英雄・名冊・招募', function (el) { abHeroPage(el); }); };
  q('abh-camp', campPage); q('abh-base', campPage);
  q('abh-hist', function () { openPage('quest', '📜 戰績・表現統計', function (el) { el.innerHTML = '<div class="abp-card ab-hist">' + (window.abHistoryHtml ? abHistoryHtml() : '') + '</div>'; }); });
  q('abh-codex', function () { openPage('codex', '📒 英雄圖鑑', function (el) { abCodexPage(el); }); }); q('abh-wiki', api.wiki); q('abh-off', function () { collect(true); });
  q('abh-hero', heroPage); q('abh-none', heroPage);
  q('abh-wpn', function () { openPage('hero', '⚔ 專武轉蛋・突破', function (el) { abHeroPanel(el, function () { if (typeof openPartyRosterPanel === 'function') openPartyRosterPanel(); }); }); });
  q('abl-prev', function () { HI = (HI - 1 + hs.length) % hs.length; render(); }); q('abl-next', function () { HI = (HI + 1) % hs.length; render(); });
  var fs = h.querySelector('#abl-focus'); if (fs) fs.onchange = function () { api.setFocus(fs.value || null); render(); };
  var img = h.querySelector('#abl-full'); if (img && cur) { var x0 = null, moved = false;
    img.addEventListener('pointerdown', function (e) { x0 = e.clientX; moved = false; });
    img.addEventListener('pointerup', function (e) { if (x0 == null) return; var dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 40) { HI = (HI + (dx < 0 ? 1 : -1) + hs.length) % hs.length; render(); } else heroDetail(cur); }); }
}
function heroDetail(hh) { var api = A(), C = api.CLS, d = ((typeof HERO_DB !== 'undefined' && HERO_DB) || {})[hh.defId] || {};
  var old = document.getElementById('abh-pop'); if (old) old.remove(); var p = H('div', 'abh-pop'); p.id = 'abh-pop';
  var cl = C[hh.cls] || {}; var sk = (d.skills || []).map(function (id) { try { return (DB.skills && DB.skills[id] && DB.skills[id].n) || id; } catch (e) { return id; } }).join('、');
  var cap = (typeof heroLvCap === 'function') ? heroLvCap(hh.star || 0) : ((typeof AP !== 'undefined' && AP.lvCap) ? AP.lvCap(hh.star || 0) : 50);
  p.innerHTML = '<div class="abh-popbox abl-det"><img class="abl-det-img" src="' + preferFull(hh) + '"><div><h3><em class="r-' + hh.rarity + '">' + hh.rarity + '</em> ' + hh.name + '</h3><p>' + (cl.ic || '') + ' ' + (cl.lb || '') + ' · Lv' + (hh.lv || 1) + '/' + cap + ' · 永久★' + (hh.star || 0) + ' · 英雄碎片 ' + (hh.fragments || 0) + (function(){ try { if (!window.AB_WPN || !AB_EXCL || !AB_EXCL[hh.defId]) return ''; var r = AB_WPN.rec(hh.defId); if (!r || !r.owned) return ' · 專武未擁有'; return ' · 專武 ' + (r.star||0) + '★（專武碎片 ' + (r.fragments||0) + '）'; } catch(e){ return ''; } })() + (hh.elfEle ? ' · 元素 ' + hh.elfEle : '') + '</p>' +
    '<p class="abl-st">自走棋基礎（職業）：HP ' + cl.hp + '・攻 ' + cl.atk + '・物/魔防 ' + cl.def + '/' + cl.mr + '・射程 ' + cl.rng + '</p>' + (sk ? '<p>技能：' + sk + '</p>' : '') + (d.blurb ? '<p><b>' + d.blurb + '</b></p>' : '') + (d.lore ? '<p class="abl-lore">' + d.lore + '</p>' : '') +
    '<button class="abh-big" id="abh-pop-ok">關閉</button> <button class="abh-big" id="abh-pop-star">⭐ 英雄碎片突破</button> <button class="abh-big" id="abh-pop-roster">名冊／換裝</button></div></div>';
  document.body.appendChild(p); (function(img,fb){ if(img) img.onerror=function(){ img.onerror=null; img.src=fb||''; }; })(p.querySelector('.abl-det-img'), fullArt(hh)); p.querySelector('#abh-pop-ok').onclick = function () { p.remove(); };
  var sb = p.querySelector('#abh-pop-star'); if (sb) sb.onclick = function () { p.remove(); var hb = document.getElementById('abh-hero'); if (hb) hb.click(); var f = document.getElementById('abp-fn'); if (f) { abHeroPage(f, hh.id); abHeroPanel(f, function () { if (window.openHeroManagePanel) openHeroManagePanel(hh.id); }); } };
  p.querySelector('#abh-pop-roster').onclick = function () { p.remove(); var hb = document.getElementById('abh-hero'); if (hb) hb.click(); var f = document.getElementById('abp-fn'); if (f) abHeroPage(f, hh.id); }; }
window.abHeroDetail = heroDetail;
// v3.10.0：英雄頁直接顯示名冊頭像格；點頭像＝詳情（數值／技能／局外裝／全身立繪）；保留招募入口
function abHeroPage(el, sel) { var api = A(), C = api.CLS, hs = heroList(), tk = (player.gacha && player.gacha.tickets) || 0;
  var cur = sel != null ? hs.filter(function (x) { return String(x.id) === String(sel); })[0] : null;
  var grid = '<div class="abhp-grid">' + (hs.length ? hs.map(function (h) { var cl = C[h.cls] || {}; return '<button class="abhp-c r-' + h.rarity + (cur && cur.id === h.id ? ' on' : '') + '" data-hid="' + h.id + '"><img src="' + preferFull(h) + '" data-fb="1" alt=""><em class="r-' + h.rarity + '">' + h.rarity + '</em><b>' + h.name + '</b><small>' + (cl.ic || '') + (cl.lb || '') + ' · Lv' + (h.lv || 1) + ' · ' + '★'.repeat(Math.max(1, h.star || 0)) + '</small></button>'; }).join('') : '<p class="abh-warn">未有英雄，用招募券招募啦。</p>') + '</div>';
  var det = '';
  if (cur) { var D = window.abDebug || {}, u = null; try { u = D.mkUnit(cur, 'p', -1); u.pc = { basic: false }; u.por = preferFull(cur); } catch (e) { u = null; }
    var hd = ((typeof HERO_DB !== 'undefined' && HERO_DB) || {})[cur.defId] || {};
    det = '<div class="abhp-det"><img class="abhp-full" src="' + preferFull(cur) + '" alt=""><div class="abhp-info">' + (u && D.detailHtml ? D.detailHtml(u) : '') + (hd.blurb ? '<p><b>' + hd.blurb + '</b></p>' : '') + (hd.lore ? '<p class="abl-lore">' + hd.lore + '</p>' : '') +
      '<div class="ab-bar"><button class="abh-big" id="abhp-eq">🎒 換局外裝</button><button class="abh-big" id="abhp-x">收起</button></div></div></div>'; }
  var wtk = (window.AB_WPN && AB_WPN.tickets) ? AB_WPN.tickets() : 0;
  el.innerHTML = '<div class="abp-card abhp-top"><b>🎫 英雄招募券 ' + fmt(tk) + '</b>　<b class="text-fuchsia-300">⚔ 專武券 ' + fmt(wtk) + '</b> <button class="abh-big" id="abp-roster">招募／專武轉蛋</button> <small>擁有英雄 ' + hs.length + '</small></div>' + det + grid;
  Array.prototype.forEach.call(el.querySelectorAll('img[data-fb]'), function (im, i) { var h = hs[i]; im.onerror = function () { fullArtOnErr(im, h || {}); }; });
  var fi = el.querySelector('.abhp-full'); if (fi && cur) fi.onerror = function () { fullArtOnErr(fi, cur); };
  Array.prototype.forEach.call(el.querySelectorAll('[data-hid]'), function (b) { b.onclick = function () { abHeroPage(el, b.dataset.hid); el.scrollTop = 0; }; });
  el.querySelector('#abp-roster').onclick = function () { abHeroPanel(el, function () { if (typeof openPartyRosterPanel === 'function') openPartyRosterPanel(); }); };
  var eq = el.querySelector('#abhp-eq'); if (eq) eq.onclick = function () { abHeroPanel(el, function () { if (window.openHeroEquipmentManager) openHeroEquipmentManager(cur.id); }); };
  var x = el.querySelector('#abhp-x'); if (x) x.onclick = function () { abHeroPage(el); }; }
window.abHeroPage = abHeroPage;
// 英雄頁：舊招募事務所／換裝面板喺獨立區域顯示（取代名冊格，唔疊住），「‹ 返回英雄名冊」或面板「關閉」都會返去名冊
function abHeroPanel(el, open) { var pg = document.getElementById('abl-page'); if (pg) pg._icWanted = true;
  el.innerHTML = '<div class="abp-card abhp-top"><button class="abh-big" id="abhp-back">‹ 返回英雄名冊</button></div><div id="abhp-ic" class="abhp-ic"></div>';
  var box = el.querySelector('#abhp-ic'); abMountIC(box); el.querySelector('#abhp-back').onclick = function () { if (pg) pg._icWanted = false; abRestoreIC(); abHeroPage(el); };
  try { open(); } catch (e) { box.insertAdjacentHTML('beforeend', '<p class="abh-warn">開唔到：' + e.message + '</p>'); } abMountIC(box); }
// 3) 離線收益彈窗
function collect(force) { var api = A(); if (!api || !hasP()) return; var pv = api.offPreview(); if (!force && (!pv || pv.h < AB_ONLY.offlinePopupMinH)) return;
  var r = api.collectIdle(); var c = api.collectCamps() || {}; var d = api.dispatchCollect() || 0; if (!r) return;
  var old = document.getElementById('abh-pop'); if (old) old.remove(); var p = H('div', 'abh-pop'); p.id = 'abh-pop';
  p.innerHTML = '<div class="abh-popbox"><h3>🌙 離線收益</h3>' + (r.noFarm ? '<p>未有農場關（通關任何一關頭目後自動設定），今次只有營地／派遣產出。</p>' : '<p>' + (r.stage || '') + ' · ' + (r.h || 0).toFixed(1) + ' 小時（上限 ' + api.offCap() + '）</p>') +
    '<ul><li>💰 ' + fmt((r.gold || 0) + (c.gold || 0)) + '</li><li>✨ 主角 EXP ' + fmt(r.exp) + (r.heroExp ? '・英雄各 ' + fmt(r.heroExp) : '') + '</li><li>🧱 職業材料 ' + fmt((r.mats || 0) + (c.mats || 0) + d) + '</li>' + (r.fame ? '<li>🏛 名聲 +' + fmt(r.fame) + '</li>' : '') +
    '<li>⛏ 礦石 ' + fmt(r.ore) + '・📦 核心 ' + fmt(r.cores) + '</li><li>🎫 招募券 ' + fmt(r.tickets) + '・💎 ' + fmt(r.diamonds) + '</li><li>🎁 局外裝 ' + fmt(r.gear) + ' 件</li></ul><button class="abh-big" id="abh-pop-ok">收下</button></div>';
  document.body.appendChild(p); p.querySelector('#abh-pop-ok').onclick = function () { p.remove(); render(); }; render(); }
// 4) 隱藏舊分頁
function hideTabs() { AB_ONLY.hideTabs.forEach(function (t) { Array.prototype.forEach.call(document.querySelectorAll('[onclick*="switchTab(\'' + t + '\'"]'), function (b) { b.style.display = 'none'; }); }); }
var shown = false;
setInterval(function () { if (!hasP() || !A()) return; hideTabs(); var gs = document.getElementById('game-screen'); if (gs && gs.classList.contains('hidden')) return;
  if (!shown) { shown = true; render(); collect(false); } else if (!document.getElementById('ab-root') || document.getElementById('ab-root').classList.contains('hidden')) { if (!document.getElementById('abh-pop')) render(); } }, 3000);


// 6) 功能頁專屬 NPC（全頁；左立繪＋對白，右功能）。art:null＝未有立繪，用樣式化剪影代替
// 城鎮 NPC 角色卡已廢（商店／鐵匠／倉庫／委託／交易所／轉生）；只保留營地／招募頁裝飾人
var AB_HOSTS = window.AB_HOSTS = {
  camp:  { n: '芙蕾雅', t: '公會管家・營地', art: 'assets/npc/camp.jpg', p: '幹練嘅管家，將八大營地打理得井井有條。', say: ['營地今日都運作順利。', '材料夠就快啲升級啦！', '派遣隊伍已經準備好出發。'] },
  hero:  { n: '米菈', t: '招募官', art: 'assets/npc/hero.jpg', p: '笑容甜美嘅招募官，相信每位英雄都有命運之緣。', say: ['今日會遇到邊位英雄呢？', '招募券準備好未～', '命運之門已經打開！'] }
};
function hostHtml(k) { var h = AB_HOSTS[k] || {}; var line = h.say ? h.say[Math.floor(Math.random() * h.say.length)] : '';
  return '<div class="abp-host">' + (h.art ? '<img class="abp-art" src="' + h.art + '">' : '<div class="abp-art abp-ph"><span>' + (h.n || '') + '</span><small>立繪待補</small></div>') +
    '<div class="abp-bubble"><b>' + (h.n || '') + '</b><small>' + (h.t || '') + '</small><p>「' + line + '」</p><i>' + (h.p || '') + '</i></div></div>'; }
function openPage(k, title, fill) { closeHub(); var ic0 = document.getElementById('interaction-content'); if (ic0) ic0.innerHTML = ''; var old = document.getElementById('abl-page'); if (old) { abRestoreIC(); old.remove(); } var pg = H('div', 'abp'); pg.id = 'abl-page';
  pg.style.backgroundImage = 'linear-gradient(90deg,rgba(2,6,23,.35),rgba(2,6,23,.95) 55%),url("' + AB_ONLY.bg + '")';
  pg.dataset.k = k; pg.innerHTML = '<div class="abp-top"><button class="abp-back" id="abp-back">‹ 返回大廳</button><b>' + title + '</b><span></span></div><div class="abp-main">' + ((k === 'camp' || k === 'hero') ? hostHtml(k) : '') + '<div class="abp-fn" id="abp-fn"' + ((k === 'camp' || k === 'hero') ? '' : ' style="width:100%;max-width:none"') + '></div></div>';
  document.body.appendChild(pg); pg.querySelector('#abp-back').onclick = closePage; fill(pg.querySelector('#abp-fn')); return pg; }
function abMountIC(el) { var c = document.getElementById('town-interaction-container'); if (!c || !el) return; if (!el.contains(c)) el.appendChild(c); c.classList.remove('hidden'); c.style.display = ''; c.classList.add('abp-ic'); }
// v3.10.0 修正：舊 NPC 面板寫入隱藏嘅 #interaction-content → 有功能頁開住就即刻搬入頁面顯示
function abEnsureIC() { var pg = document.getElementById('abl-page'); if (!pg) return; var c = document.getElementById('town-interaction-container'); if (!c) return; var ic = document.getElementById('interaction-content');
  var hero = pg.dataset.k === 'hero'; if (hero && !pg._icWanted) return;   // 英雄頁：只有撳咗招募／換裝先顯示舊面板
  var tgt = document.getElementById('abhp-ic') || document.getElementById('abl-hub-body') || document.getElementById('abp-fn'); if (!tgt) return;
  var shut = c.classList.contains('hidden') || c.style.display === 'none';
  if (pg.contains(c) && shut && (c._abClosed || hero)) { c._abClosed = 0; if (hero) { pg._icWanted = false; abRestoreIC(); var f = document.getElementById('abp-fn'); if (f) abHeroPage(f); } return; }
  if (!pg.contains(c) && ic && ic.innerHTML.trim()) abMountIC(tgt); else if (pg.contains(c) && shut) { c.classList.remove('hidden'); c.style.display = ''; } }
document.addEventListener('click', function (e) { var b = e.target && e.target.closest && e.target.closest('#town-interaction-container button'); if (b && /關閉|✕|返回/.test(b.textContent || '')) { var c = document.getElementById('town-interaction-container'); if (c) c._abClosed = 1; } }, true);
(function () { if (typeof MutationObserver === 'undefined') return; var t = null; new MutationObserver(function () { if (t) return; t = setTimeout(function () { t = null; abEnsureIC(); }, 30); }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] }); })();
function abRestoreIC() { var c = document.getElementById('town-interaction-container'), tv = document.getElementById('town-view'); if (c && tv && !tv.contains(c)) { tv.appendChild(c); c.classList.add('hidden'); } }
function closePage() { abRestoreIC(); closeHub(); var c = document.getElementById('ab-camp'); if (c) c.remove(); var p = document.getElementById('abl-page'); if (p) p.remove(); render(); }
window.abOpenPage = openPage; window.abClosePage = closePage;
// 5) 城鎮 NPC hub 已廢（ab.20261026a）：大廳唔再露出商店／倉庫／委託／交易所／轉生；DB.towns 資料同存檔唔郁。留 stub 方便 debug。
var NPC_HUB = window.AB_NPC_HUB = { groups: [], drop: { types: [], ids: [] } };
function npcAll() { return []; }
function npcDropped() { return true; }
function npcGroup() { return []; }
function openHub() { /* 已廢：用側欄「鐵匠／營地／派遣」 */ }
function runNpc() { /* 已廢：唔再經大廳 interactNPC */ }
function closeHub() { var cp = document.getElementById('ab-camp'); if (cp && cp.closest && cp.closest('#abl-page')) cp.remove(); var c = document.getElementById('town-interaction-container'); var tv = document.getElementById('town-view'); if (c && tv) { tv.appendChild(c); c.classList.add('hidden'); c.classList.remove('flex'); } var b = document.getElementById('abl-hub'); if (b) b.remove(); }
window.abOpenHub = openHub; window.abNpcAll = npcAll; window.abNpcDropped = npcDropped;

// ===== 📒 英雄圖鑑（ab.20261026c）：已開放未抽到一眼睇 =====
var _cx = { tab: 'open', cls: '', rar: '', showLocked: false };
function abCodexEntries() {
  var HD = (typeof HERO_DB !== 'undefined' && HERO_DB) || {}, api = A(), C = (api && api.CLS) || {}, own = {};
  try { own = (api && api.ownedDefIds) ? api.ownedDefIds() : {}; } catch (e) { own = {}; }
  var wlFn = (typeof wlHero === 'function') ? wlHero : (api && api.wlHero); var RORD = { SSR: 4, SR: 3, R: 2, N: 1 };
  return Object.keys(HD).map(function (id) {
    var d = HD[id] || {}; var open = !(window.AB_WL && AB_WL.enabled) || (wlFn ? !!wlFn(id) : true);
    return { defId: id, name: d.name || id, cls: d.cls || 'knight', rarity: d.rarity || 'N', portraitId: d.portraitId, blurb: d.blurb || '', lore: d.lore || '', skills: d.skills || [], elfEle: d.elfEle || null, open: open, owned: !!own[id] };
  }).sort(function (a, b) {
    return (RORD[b.rarity] || 0) - (RORD[a.rarity] || 0) || String(a.cls).localeCompare(b.cls) || String(a.name).localeCompare(b.name);
  });
}
function abCodexPor(e) {
  try { if (window.heroPortraitUrl) { var u = window.heroPortraitUrl({ defId: e.defId, cls: e.cls, portraitId: e.portraitId }); if (u) return u; } } catch (x) {}
  return 'assets/hero-full/' + e.defId + '.jpg';
}
function abCodexPage(el) {
  if (!el) return; var api = A(), C = (api && api.CLS) || {}, all = abCodexEntries();
  var opened = all.filter(function (e) { return e.open; }), ownedN = opened.filter(function (e) { return e.owned; }).length, missN = opened.length - ownedN;
  var list = all.filter(function (e) {
    if (!e.open) {
      if (!_cx.showLocked) return false;
      if (_cx.tab === 'miss' || _cx.tab === 'own') return false;   // 未開放唔算未抽／已擁有
    } else {
      if (_cx.tab === 'miss' && e.owned) return false;
      if (_cx.tab === 'own' && !e.owned) return false;
    }
    if (_cx.cls && e.cls !== _cx.cls) return false;
    if (_cx.rar && e.rarity !== _cx.rar) return false;
    return true;
  });
  var chip = function (k, lab, on) { return '<button type="button" class="ab-cx-chip' + (on ? ' on' : '') + '" data-cx="' + k + '">' + lab + '</button>'; };
  var sum = '<div class="ab-cx-sum"><b>已開放 ' + ownedN + '／' + opened.length + ' 已擁有</b>' +
    (missN ? '<span class="ab-cx-miss">未抽到 ' + missN + '</span>' : '<span class="ab-cx-ok">已開放全部擁有 ✔</span>') +
    '<small>全庫 ' + all.length + (_cx.showLocked ? '（含未開放）' : '') + ' · 顯示 ' + list.length + '</small></div>';
  var filters = '<div class="ab-cx-filters">' +
    chip('tab:open', '全部已開放', _cx.tab === 'open') + chip('tab:miss', '未抽到', _cx.tab === 'miss') + chip('tab:own', '已擁有', _cx.tab === 'own') +
    '<span class="ab-cx-sep">｜</span>' +
    ['SSR','SR','R','N'].map(function (r) { return chip('rar:' + r, r, _cx.rar === r); }).join('') +
    '<button type="button" class="ab-cx-chip' + (_cx.rar === '' ? ' on' : '') + '" data-cx="rar:">稀有度·全</button>' +
    '<span class="ab-cx-sep">｜</span>' +
    Object.keys(C).map(function (k) { return chip('cls:' + k, (C[k].ic || '') + (C[k].lb || k), _cx.cls === k); }).join('') +
    '<button type="button" class="ab-cx-chip' + (_cx.cls === '' ? ' on' : '') + '" data-cx="cls:">職業·全</button>' +
    '<label class="ab-cx-lock"><input type="checkbox" id="ab-cx-lock"' + (_cx.showLocked ? ' checked' : '') + '> 顯示未開放</label></div>';
  var grid = '<div class="ab-cx-grid">' + (list.length ? list.map(function (e) {
    var cl = C[e.cls] || {}; var st = !e.open ? 'locked' : (e.owned ? 'owned' : 'miss');
    var nm = e.open ? e.name : '？？？';
    var tag = !e.open ? '<i class="ab-cx-tag lock">🔒</i>' : (e.owned ? '<i class="ab-cx-tag ok">✔</i>' : '<i class="ab-cx-tag miss">未抽</i>');
    var por = e.open ? abCodexPor(e) : '';
    return '<button type="button" class="ab-cx-c r-' + e.rarity + ' ' + st + '" data-def="' + e.defId + '"' + (e.open ? '' : ' data-locked="1"') + '>' +
      (e.open ? '<img src="' + por + '" alt="" data-fb="1">' : '<div class="ab-cx-sil" aria-hidden="true">' + (cl.ic || '❔') + '</div>') +
      '<em class="r-' + e.rarity + '">' + e.rarity + '</em>' + tag +
      '<b>' + nm + '</b><small>' + (cl.ic || '') + (cl.lb || e.cls) + '</small></button>';
  }).join('') : '<p class="abh-warn">呢個篩選冇結果。</p>') + '</div>';
  el.innerHTML = '<div class="abp-card ab-codex">' + sum + filters + grid + '</div>';
  Array.prototype.forEach.call(el.querySelectorAll('img[data-fb]'), function (im) {
    var id = im.closest('[data-def]') && im.closest('[data-def]').dataset.def;
    var e = all.filter(function (x) { return x.defId === id; })[0];
    im.onerror = function () { im.onerror = null; im.src = 'assets/ab-class/' + ((e && e.cls === 'elf') ? 'elf.png' : ((e && e.cls) || 'knight') + '.svg'); };
  });
  Array.prototype.forEach.call(el.querySelectorAll('[data-cx]'), function (b) {
    b.onclick = function () {
      var v = b.getAttribute('data-cx') || ''; var p = v.split(':'), k = p[0], val = p.slice(1).join(':');
      if (k === 'tab') _cx.tab = val; else if (k === 'cls') _cx.cls = val; else if (k === 'rar') _cx.rar = val;
      abCodexPage(el);
    };
  });
  var lk = el.querySelector('#ab-cx-lock'); if (lk) lk.onchange = function () { _cx.showLocked = !!lk.checked; abCodexPage(el); };
  Array.prototype.forEach.call(el.querySelectorAll('.ab-cx-c[data-def]'), function (b) {
    b.onclick = function () {
      var e = all.filter(function (x) { return x.defId === b.dataset.def; })[0]; if (!e) return;
      if (!e.open) { abCodexLockedTip(); return; }
      abCodexDetail(e);
    };
  });
}
function abCodexLockedTip() {
  var old = document.getElementById('abh-pop'); if (old) old.remove();
  var p = H('div', 'abh-pop'); p.id = 'abh-pop';
  p.innerHTML = '<div class="abh-popbox"><h3>🔒 未開放</h3><p>呢位英雄暫時未入招募池，之後先會開。</p><button class="abh-big" id="abh-pop-ok">關閉</button></div>';
  document.body.appendChild(p); p.querySelector('#abh-pop-ok').onclick = function () { p.remove(); };
}
function abCodexDetail(e) {
  var api = A(), C = (api && api.CLS) || {}, cl = C[e.cls] || {};
  var sk = (e.skills || []).map(function (id) { try { return (DB.skills && DB.skills[id] && DB.skills[id].n) || id; } catch (x) { return id; } }).join('、');
  var old = document.getElementById('abh-pop'); if (old) old.remove(); var p = H('div', 'abh-pop'); p.id = 'abh-pop';
  var st = e.owned ? '<span class="ab-cx-ok">✔ 已擁有</span>' : '<span class="ab-cx-miss">未抽到 · 可喺招募抽</span>';
  p.innerHTML = '<div class="abh-popbox abl-det ab-cx-det"><img class="abl-det-img" src="' + abCodexPor(e) + '" alt=""><div><h3><em class="r-' + e.rarity + '">' + e.rarity + '</em> ' + e.name + '</h3>' +
    '<p>' + (cl.ic || '') + ' ' + (cl.lb || e.cls) + (e.elfEle ? ' · 元素 ' + e.elfEle : '') + ' · ' + st + '</p>' +
    (sk ? '<p>技能：' + sk + '</p>' : '') + (e.blurb ? '<p><b>' + e.blurb + '</b></p>' : '') + (e.lore ? '<p class="abl-lore">' + e.lore + '</p>' : '') +
    '<button class="abh-big" id="abh-pop-ok">關閉</button>' + (e.owned ? '' : ' <button class="abh-big" id="abh-pop-gacha">去招募</button>') + '</div></div>';
  document.body.appendChild(p);
  (function (img) { if (img) img.onerror = function () { img.onerror = null; img.src = 'assets/ab-class/' + (e.cls === 'elf' ? 'elf.png' : (e.cls || 'knight') + '.svg'); }; })(p.querySelector('.abl-det-img'));
  p.querySelector('#abh-pop-ok').onclick = function () { p.remove(); };
  var g = p.querySelector('#abh-pop-gacha'); if (g) g.onclick = function () { p.remove(); var hb = document.getElementById('abh-hero'); if (hb) hb.click(); };
}
window.abCodexPage = abCodexPage;

window.abHallRender = render; window.abOfflineCollect = collect;
})();

// v3.10.0 hotfix：英雄換裝改用自走棋局外裝（ab.gearBag），唔再受舊「安全區」限制
(function () {
  if (typeof window === 'undefined') return;
  window._allyManagerInTown = function () { return true; };
  var SLN = { weapon: '武器', armor: '盔甲', helm: '頭盔', gloves: '手套', boots: '靴', acc: '飾品' };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function render(heroId) {
    var div = document.getElementById('interaction-content'); if (!div) return;
    var D = window.abDebug || {}; var ab = D.ensureAb ? D.ensureAb() : (player && player.ab); if (!ab) return;
    var h = (window.AP && AP.findHero) ? AP.findHero(heroId) : null; if (!h) { div.innerHTML = '<p class="abh-warn">呢隻係示範英雄（未擁有），唔可以換裝。先用招募券招募英雄。</p>'; return; }
    var rar = h.rarity || (window.HERO_DB && HERO_DB[h.defId] && HERO_DB[h.defId].rarity) || 'R';
    var cap = (window.AB_TIER_CAP || {})[rar] || 2, key = 'h:' + heroId;
    var sets = window.AB_SETS_ALL || []; var stN = function (id) { var s = sets.filter(function (x) { return x.id === id; })[0]; return s ? s.n : id; };
    var bag = ab.gearBag || [];
    var mine = bag.filter(function (g) { return g.on === key; });
    var free = bag.filter(function (g) { return g.on !== key; });
    var row = function (g, on) { var over = g.tier > cap; var who = g.on && g.on !== key ? '（' + '其他英雄用緊' + '）' : '';
      var GD_ = window.abGearDesc ? abGearDesc(g, key) : { text: '', html: '' }; return '<div class="flex items-center justify-between gap-2 bg-slate-900/60 border border-slate-700 rounded px-3 py-2" title="' + esc(GD_.text) + '"><span class="text-sm">' + SLN[g.slot] + '　<b class="text-amber-200">T' + g.tier + ' ' + esc(stN(g.set)) + ' +' + (g.en || 0) + '</b> <small class="text-slate-400">' + who + '</small>' + GD_.html + '</span>' +
        (on ? '<button class="btn py-1 px-3 text-xs bg-slate-700 border-slate-500" data-abgo="">卸下</button>' : (over ? '<small class="text-red-400">' + rar + ' 最高 T' + cap + '</small>' : '<button class="btn py-1 px-3 text-xs bg-emerald-900 border-emerald-700 text-emerald-100" data-abgo="' + key + '">穿戴</button>')) + '</div>'; };
    div.innerHTML = '<div class="flex flex-col gap-3 p-1"><div class="flex items-center justify-between"><div><div class="text-amber-300 font-bold">' + esc(h.name) + ' 嘅局外裝備</div><div class="text-xs text-slate-400">' + rar + ' 最高可裝 T' + cap + '；同部位會自動替換。</div></div><button class="btn py-1 px-3 text-xs bg-slate-700 border-slate-500" id="abge-back">返回</button></div>' +
      '<div class="text-sm font-bold text-sky-300">已穿戴 ' + mine.length + '/6：<small class="text-slate-300">' + (mine.length ? ['weapon','armor','helm','gloves','boots','acc'].map(function (sl) { var g = mine.filter(function (x) { return x.slot === sl; })[0]; return g ? SLN[sl] + ' T' + g.tier + ' ' + esc(stN(g.set)) + (g.en ? '+' + g.en : '') : null; }).filter(Boolean).join('・') : '未有穿戴') + '</small></div>' +
      (window.abGearBagHtml ? abGearBagHtml({ ctx: 'hero', key: key, cap: cap, action: function (g) { if (g.on === key) return '<button class="btn py-1 px-3 text-xs bg-slate-700 border-slate-500" data-abgo="" data-uid="' + g.uid + '">卸下</button>'; if (g.tier > cap) return '<small class="text-red-400">' + rar + ' 最高 T' + cap + '，唔可以著</small>'; return '<button class="btn py-1 px-3 text-xs bg-emerald-900 border-emerald-700 text-emerald-100" data-abgo="' + key + '" data-uid="' + g.uid + '">穿戴' + (g.on ? '（由 ' + esc('其他英雄') + ' 搶過嚟）' : '') + '</button>'; } }) : '') + '</div>';
    div.querySelector('#abge-back').onclick = function () { if (window.openHeroManagePanel) openHeroManagePanel(heroId); };
    Array.prototype.forEach.call(div.querySelectorAll('[data-uid]'), function (b) { b.onclick = function () {
      var g = bag.filter(function (x) { return x.uid === b.getAttribute('data-uid'); })[0]; var on = b.getAttribute('data-abgo') || null;
      if (on && g && D.gearEquip) { bag.forEach(function (x) { if (x !== g && x.on === on && x.slot === g.slot) x.on = null; }); }
      if (D.gearEquip) D.gearEquip(b.getAttribute('data-uid'), on); render(heroId); }; });
    if (window.abGearBagBind) abGearBagBind(div, 'hero', function () { render(heroId); });
  }
  window.openHeroEquipmentManager = function (heroId) { var f = document.getElementById('abhp-ic') || document.getElementById('abp-fn'); var pg = document.getElementById('abl-page'); if (pg) pg._icWanted = true; if (f && typeof abMountIC === 'function') abMountIC(f); render(heroId); };
})();
