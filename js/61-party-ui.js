// ===== 🪪 v3.8.130 Account-Party UI：名冊編隊／招募事務所／換裝／餵書 =====
(function () {
'use strict';

function apOn() {
    return typeof AP !== 'undefined' && AP && typeof AP.enabled === 'function' && AP.enabled();
}

function _esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

function _clsLabel(cls) {
    return (AP && AP.CLS_LABEL && AP.CLS_LABEL[cls]) || cls || '?';
}

function _rarityMeta(h) {
    var r = (h && h.rarity) || (h && h.defId && typeof HERO_DB !== 'undefined' && HERO_DB[h.defId] && HERO_DB[h.defId].rarity) || 'R';
    r = String(r).toUpperCase();
    var meta = (typeof HERO_RARITY !== 'undefined' && HERO_RARITY[r]) || (AP && AP.RARITY && AP.RARITY[r]) || { label: r, color: '#94a3b8' };
    return { rarity: r, label: meta.label || r, color: meta.color || '#94a3b8' };
}
function _rarityBadge(h) {
    var m = _rarityMeta(h);
    return '<span style="color:' + m.color + ';font-weight:700;font-size:11px;margin-right:4px">' + m.label + '</span>';
}

function _portraitUrl(hero) {
    try { if (hero && hero.defId && typeof heroPortraitUrl === 'function') { var hu = heroPortraitUrl(hero); if (hu) return hu; } } catch (e) {}   // ab.20261023a 統一頭像
    try {
        if (!hero || !hero.portraitId) {
            // fall through to class default below
        } else if (typeof PORTRAIT_BY_ID !== 'undefined' && PORTRAIT_BY_ID[hero.portraitId]) {
            return PORTRAIT_BY_ID[hero.portraitId].file;
        } else if (String(hero.portraitId).indexOf('grok:') === 0) {
            // future: grok:<filename> → assets/portraits/grok-library/<filename>
            var g = String(hero.portraitId).slice(5).replace(/\\/g, '/').split('/').pop();
            if (g) return 'assets/portraits/grok-library/' + g;
        } else if (String(hero.portraitId).indexOf('v8:') === 0) {
            // direct file map if PORTRAIT_BY_ID missing
            var k = 'v8-' + String(hero.portraitId).slice(3);
            return 'assets/portraits/' + k + '.webp';
        }
        if (typeof charPortraitUrl === 'function') {
            var fake = { cls: hero.cls, portraitId: hero.portraitId, avatar: null };
            var u = charPortraitUrl(fake);
            if (u) return u;
        }
    } catch (e) {}
    return '';
}


function apCanBreak(h) {
    try {
        if (window.AP && typeof AP.canBreakthrough === 'function') return !!AP.canBreakthrough(h);
        if (typeof heroCanBreakthrough === 'function') return !!heroCanBreakthrough(h);
    } catch (e) {}
    return false;
}
function apBreakBadge(h) {
    return apCanBreak(h) ? ' <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-600/90 text-amber-50 align-middle">可突破</span>' : '';
}
function openPartyRosterPanel() {
    var div = document.getElementById('interaction-content');
    if (div) renderPartyRoster(div);
}

function renderPartyRoster(div) {
    if (!apOn()) {
        if (typeof renderAllyNPC === 'function') renderAllyNPC(div);
        return;
    }
    AP.ensure(player);
    var ids = AP.partyIds();
    var heroes = player.heroes || [];
    var partySlots = ids.map(function (hid, i) {
        var h = hid ? AP.findHero(hid) : null;
        if (!h) {
            return '<div class="flex items-center justify-between gap-2 bg-slate-900/50 border border-dashed border-slate-600 rounded p-2 text-sm">'
                + '<span class="text-slate-500">空位 ' + (i + 1) + '</span>'
                + '<span class="text-xs text-slate-600">由下方名冊上陣</span></div>';
        }
        var stars = '★'.repeat(h.star || 0) + '☆'.repeat(Math.max(0, 5 - (h.star || 0)));
        return '<div class="flex items-center justify-between gap-2 bg-slate-800/70 border border-amber-700/50 rounded p-2 text-sm">'
            + '<span><b class="text-amber-200">' + _esc(h.name) + '</b>' + apBreakBadge(h) + ' '
            + '<span class="text-slate-400">' + _clsLabel(h.cls) + ' Lv.' + (h.lv || 1) + '/' + AP.lvCap(h.star) + '</span> '
            + '<span class="text-yellow-400 text-xs">' + stars + '</span></span>'
            + '<div class="flex gap-1 shrink-0">'
            + '<button onclick="openHeroManagePanel(\'' + _esc(h.id) + '\')" class="btn py-1 px-2 text-xs bg-sky-950 border-sky-700 text-sky-100">管理</button>'
            + '<button onclick="partyUnequipSlot(' + i + ')" class="btn py-1 px-2 text-xs bg-red-950 border-red-700 text-red-200">下陣</button>'
            + '</div></div>';
    }).join('');

    var inParty = {};
    ids.forEach(function (id) { if (id) inParty[String(id)] = true; });
    var filled = ids.filter(Boolean).length;

    var roster = heroes.map(function (h) {
        if (!h) return '';
        var on = !!inParty[String(h.id)];
        var stars = '★'.repeat(h.star || 0) + '☆'.repeat(Math.max(0, 5 - (h.star || 0)));
        var btn = on
            ? '<span class="text-xs text-emerald-400 px-2">已上場</span>'
            : (filled >= AP.MAX
                ? '<span class="text-xs text-slate-500 px-2">隊滿</span>'
                : '<button onclick="partyDeployHero(\'' + _esc(h.id) + '\')" class="btn py-1 px-3 text-xs bg-emerald-900 border-emerald-700 text-emerald-100">上陣</button>');
        return '<div class="flex items-center justify-between gap-2 bg-slate-800/50 border border-slate-600 rounded p-2 text-sm">'
            + '<span class="min-w-0">' + _rarityBadge(h) + '<b class="text-slate-100">' + _esc(h.name) + '</b>' + apBreakBadge(h) + ' '
            + '<span class="text-slate-400 text-xs">' + _clsLabel(h.cls) + ' · Lv.' + (h.lv || 1) + ' · ' + stars + '</span></span>'
            + '<div class="flex gap-1 shrink-0">'
            + '<button onclick="openHeroManagePanel(\'' + _esc(h.id) + '\')" class="btn py-1 px-2 text-xs bg-slate-700 border-slate-500">管理</button>'
            + btn + '</div></div>';
    }).join('') || '<div class="text-sm text-slate-500">名冊係空嘅——用上方招募券抽英雄入隊。</div>';

    var gacha = (typeof AP.ensureGacha === 'function') ? AP.ensureGacha(player) : (player.gacha || {});
    var tickets = (typeof AP.gachaTickets === 'function') ? AP.gachaTickets() : (gacha.tickets || 0);
    var pitySr = gacha.pitySr || 0, pitySsr = gacha.pitySsr || 0;
    var gachaBox = '<div class="border border-amber-700/60 rounded p-2 bg-amber-950/30 flex flex-col gap-2">'
        + '<div class="text-amber-200 font-bold text-sm">🎫 招募事務所（角色池）</div>'
        + '<div class="text-xs text-slate-300">英雄招募券：<b class="text-amber-300">' + tickets + '</b>'
        + '　·　SR 保底 ' + pitySr + '/30　·　SSR 保底 ' + pitySsr + '/90</div>'
        + '<div class="text-[11px] text-slate-500">全部英雄起手 1★；升星只靠英雄碎片突破。1★ 等級上限 50，每突破 +1★ 上限 +10。重複→碎片；夠數會提示可突破。</div>'
        + '<div class="flex flex-wrap gap-2">'
        + '<button onclick="apHeroGachaPull(1)" class="btn py-1.5 px-3 text-xs bg-amber-900 border-amber-600 text-amber-100"' + (tickets < 1 ? ' disabled style="opacity:.45"' : '') + '>單抽（1 券）</button>'
        + '<button onclick="apHeroGachaPull(10)" class="btn py-1.5 px-3 text-xs bg-violet-900 border-violet-600 text-violet-100"' + (tickets < 10 ? ' disabled style="opacity:.45"' : '') + '>十連（10 券）</button>'
        + '</div></div>';
    var W = window.AB_WPN, Sset = window.AB_SET, wtk = (W && W.tickets) ? W.tickets() : 0, wpity = (player.gacha && player.gacha.wpnPitySsr) || 0;
    var pityCap = (Sset && Sset.GACHA && Sset.GACHA.pitySsr) || (W && W.GACHA && W.GACHA.pitySsr) || 60;
    var wpnBox = '<div class="border border-fuchsia-700/60 rounded p-2 bg-fuchsia-950/30 flex flex-col gap-2">'
        + '<div class="text-fuchsia-200 font-bold text-sm">🛡 專屬裝備轉蛋（武器／防具／飾品）</div>'
        + '<div class="text-xs text-slate-300">專屬裝備券：<b class="text-fuchsia-300">' + wtk + '</b>　·　SSR 英雄件保底 ' + wpity + '/' + pityCap + '</div>'
        + '<div class="text-[11px] text-slate-500">槽位 武器40%／防具30%／飾品30%。開放英雄專屬件；重複→該英雄「專屬碎片」（三件共用，同英雄碎片分開）。武器 3★ 起技能質變；三件齊開套裝質變（固定數字）。</div>'
        + '<div class="flex flex-wrap gap-2">'
        + '<button onclick="apWpnGachaPull(1)" class="btn py-1.5 px-3 text-xs bg-fuchsia-900 border-fuchsia-600 text-fuchsia-100"' + (wtk < 1 ? ' disabled style="opacity:.45"' : '') + '>單抽（1 裝備券）</button>'
        + '<button onclick="apWpnGachaPull(10)" class="btn py-1.5 px-3 text-xs bg-violet-950 border-violet-600 text-violet-100"' + (wtk < 10 ? ' disabled style="opacity:.45"' : '') + '>十連（10 裝備券）</button>'
        + '<button onclick="apWpnBuyGold(1)" class="btn py-1.5 px-3 text-xs bg-slate-800 border-slate-500">買 1 券（💰' + ((W && W.GACHA && W.GACHA.ticketGold) || 800) + '・持有💰' + (player.gold || 0) + '／裝備券 ' + wtk + '）</button>'
        + '<button onclick="apWpnExchange(1)" class="btn py-1.5 px-3 text-xs bg-slate-800 border-slate-500">3 英雄券→1 裝備券（持有招募券 ' + tickets + '／裝備券 ' + wtk + '）</button>'
        + '</div></div>';
    // 職業指定卷（含兌換；顯示持有數）
    var clsBox = (function () {
        if (!Sset || !Sset.CLS_KEYS) return '';
        var exMode = window._apClsExMode || null; // null | 'equip' | 'hero'
        var eqCost = (Sset.GACHA && Sset.GACHA.exchangeClsEquipCost) || 5;
        var hrCost = (Sset.GACHA && Sset.GACHA.exchangeClsHeroCost) || 3;
        var heroTkNow = tickets;
        var wpnTkNow = wtk;
        var rows = Sset.CLS_KEYS.map(function (c) {
            var lb = (Sset.CLS_LB && Sset.CLS_LB[c]) || c;
            var ht = Sset.clsTk('hero', c) || 0, et = Sset.clsTk('equip', c) || 0;
            return '<div class="flex flex-wrap items-center gap-1.5 text-xs bg-slate-900/50 rounded px-2 py-1">'
                + '<span class="text-sky-200 w-14 shrink-0">' + lb + '</span>'
                + '<button onclick="apClsHeroPull(\'' + c + '\')" class="btn py-0.5 px-2 text-[11px] bg-amber-900/80 border-amber-600"' + (ht < 1 ? ' disabled style="opacity:.4"' : '') + '>英雄券 ' + ht + '</button>'
                + '<button onclick="apClsEquipPull(\'' + c + '\')" class="btn py-0.5 px-2 text-[11px] bg-fuchsia-900/80 border-fuchsia-600"' + (et < 1 ? ' disabled style="opacity:.4"' : '') + '>裝備券 ' + et + '</button>'
                + '</div>';
        }).join('');
        var pickRow = '';
        if (exMode === 'equip' || exMode === 'hero') {
            var kindLb = exMode === 'equip' ? '職業裝備券' : '職業英雄券';
            var can = exMode === 'equip' ? (wpnTkNow >= eqCost) : (heroTkNow >= hrCost);
            pickRow = '<div class="flex flex-col gap-1 rounded border border-sky-700/40 bg-slate-950/60 p-1.5">'
                + '<div class="text-[11px] text-sky-200">揀職業換 <b>' + kindLb + '</b>（而家持有：'
                + (exMode === 'equip' ? ('專屬裝備券 <b class="text-fuchsia-300">' + wpnTkNow + '</b>／需 ' + eqCost) : ('英雄招募券 <b class="text-amber-300">' + heroTkNow + '</b>／需 ' + hrCost))
                + '）</div>'
                + '<div class="flex flex-wrap gap-1">'
                + Sset.CLS_KEYS.map(function (c) {
                    var lb = (Sset.CLS_LB && Sset.CLS_LB[c]) || c;
                    var own = Sset.clsTk(exMode === 'equip' ? 'equip' : 'hero', c) || 0;
                    var fn = exMode === 'equip' ? 'apClsEquipExchange' : 'apClsHeroExchange';
                    return '<button onclick="' + fn + '(\'' + c + '\')" class="btn py-0.5 px-2 text-[11px] bg-sky-900/80 border-sky-600"'
                        + (!can ? ' disabled style="opacity:.4"' : '') + '>' + lb + '（持有 ' + own + '）</button>';
                }).join('')
                + '<button onclick="apClsExToggle(null)" class="btn py-0.5 px-2 text-[11px] bg-slate-800 border-slate-600">取消</button>'
                + '</div></div>';
        }
        return '<div class="border border-sky-800/50 rounded p-2 bg-sky-950/20 flex flex-col gap-1.5">'
            + '<div class="text-sky-200 font-bold text-sm">🎟 職業指定卷</div>'
            + '<div class="text-[11px] text-slate-500">取得：頭目／通關機率掉落（跟今場出戰職業）；或用上方兌換。職業英雄券只抽該職；職業裝備券只抽該職三件套。</div>'
            + '<div class="flex flex-wrap gap-2">'
            + '<button onclick="apClsExToggle(\'equip\')" class="btn py-1 px-2 text-[11px] bg-fuchsia-950 border-fuchsia-700"'
            + (exMode === 'equip' ? ' style="outline:1px solid #e879f9"' : '') + '>' + eqCost + ' 專屬裝備券 → 1 自選職業裝備券（持有裝備券 ' + wpnTkNow + '）</button>'
            + '<button onclick="apClsExToggle(\'hero\')" class="btn py-1 px-2 text-[11px] bg-amber-950 border-amber-700"'
            + (exMode === 'hero' ? ' style="outline:1px solid #fbbf24"' : '') + '>' + hrCost + ' 英雄招募券 → 1 自選職業英雄券（持有招募券 ' + heroTkNow + '）</button>'
            + '</div>'
            + pickRow
            + rows + '</div>';
    })();

    // —— 專武庫（擁有專武一覽；專武碎片同英雄碎片分開）——
    var wpnBagFilter = window._apWpnBagFilter || 'all';
    var wpnBagBox = (function () {
        var list = [];
        try {
            if (W && typeof W.listOwned === 'function') list = W.listOwned();
            else if (W && W.ensureBag && window.AB_EXCL) {
                var bag = W.ensureBag(player) || {};
                list = Object.keys(bag).filter(function (id) { return bag[id] && bag[id].owned && AB_EXCL[id]; })
                    .map(function (id) {
                        var e = AB_EXCL[id], r = bag[id];
                        return { defId: id, name: e.n, rarity: e.rarity || r.rarity || 'SR', heroName: e.heroName || '', star: r.star || 0, fragments: r.fragments || 0, equipped: r.equipped !== false };
                    });
            }
        } catch (eL) { list = []; }
        var rarOrd = { SSR: 1, SR: 2 };
        list.sort(function (a, b) { return ((rarOrd[a.rarity] || 9) - (rarOrd[b.rarity] || 9)) || String(a.name).localeCompare(String(b.name)); });
        var shown = list.filter(function (x) {
            if (wpnBagFilter === 'eq') return x.equipped;
            if (wpnBagFilter === 'unmax') return (x.star || 0) < 5;
            return true;
        });
        var filtBtn = function (k, lab) {
            var on = wpnBagFilter === k;
            return '<button onclick="apSetWpnBagFilter(\'' + k + '\')" class="btn py-0.5 px-2 text-[11px] ' + (on ? 'bg-fuchsia-800 border-fuchsia-500 text-fuchsia-50' : 'bg-slate-800 border-slate-600 text-slate-300') + '">' + lab + '</button>';
        };
        var rows = shown.map(function (x) {
            var col = x.rarity === 'SSR' ? '#fbbf24' : '#c084fc';
            var ownH = null;
            try { ownH = ((player && player.heroes) || []).filter(function (h) { return h && h.defId === x.defId; })[0]; } catch (eH) {}
            var stars = '★'.repeat(x.star || 0) + '☆'.repeat(Math.max(0, 5 - (x.star || 0)));
            var act = ownH
                ? '<button onclick="openHeroManagePanel(\'' + _esc(ownH.id) + '\')" class="btn py-1 px-2 text-[11px] bg-slate-700 border-slate-500">管理英雄</button>'
                : '<span class="text-[11px] text-slate-500 px-1">未擁有對應英雄</span>';
            return '<div class="flex items-center justify-between gap-2 bg-slate-900/60 border border-fuchsia-900/50 rounded p-2 text-sm">'
                + '<div class="min-w-0"><div><b style="color:' + col + '">[' + _esc(x.rarity) + ']</b> <b class="text-fuchsia-100">' + _esc(x.name) + '</b>'
                + ' <span class="text-slate-400 text-xs">' + _esc(x.heroName || '') + (x.slot ? '・' + _esc((window.AB_SET && AB_SET.SLOT_LB && AB_SET.SLOT_LB[x.slot]) || x.slot) : '') + '</span></div>'
                + '<div class="text-[11px] text-slate-400">' + stars + ' · 專屬碎片 <b class="text-fuchsia-300">' + (x.fragments || 0) + '</b> · '
                + (x.equipped ? '<span class="text-emerald-300">已裝備</span>' : '<span class="text-slate-500">未裝備</span>') + '</div></div>'
                + '<div class="shrink-0">' + act + '</div></div>';
        }).join('');
        if (!list.length) {
            rows = '<div class="text-sm text-slate-500">未擁有專屬裝備——用上方裝備券抽取</div>';
        } else if (!shown.length) {
            rows = '<div class="text-sm text-slate-500">呢個篩選冇結果</div>';
        }
        return '<div class="border border-fuchsia-800/50 rounded p-2 bg-slate-950/40 flex flex-col gap-2">'
            + '<div class="flex flex-wrap items-center justify-between gap-2">'
            + '<div class="text-fuchsia-200 font-bold text-sm">🛡 專屬裝備庫（' + list.length + '）</div>'
            + '<div class="flex flex-wrap gap-1">' + filtBtn('all', '全部') + filtBtn('eq', '已裝備') + filtBtn('unmax', '未滿星') + '</div></div>'
            + '<div class="text-[11px] text-slate-500">專屬碎片按英雄共用（武器／防具／飾品升星同一池），同英雄碎片完全分開。</div>'
            + '<div class="flex flex-col gap-1.5 max-h-56 overflow-y-auto">' + rows + '</div></div>';
    })();

    div.innerHTML = '<div class="flex flex-col gap-3 p-1">'
        + '<div><div class="text-amber-300 font-bold text-base">🪪 名冊編隊（主角 + 最多 ' + AP.MAX + ' 英雄）</div>'
        + '<div class="text-xs text-slate-400 mt-1">每個創角欄係獨立帳號。上場英雄來自本帳抽卡；裝備由隊長背包轉移，只寫本帳。創角固定 Lv1，起手送 ' + (typeof HERO_STARTER_TICKETS !== 'undefined' ? HERO_STARTER_TICKETS : 70) + ' 張英雄券 + 30 張專屬裝備券（100 抽）。</div></div>'
        + gachaBox + wpnBox + clsBox + wpnBagBox
        + '<div class="text-sm font-bold text-sky-300">目前編隊（' + filled + '/' + AP.MAX + '）</div>'
        + '<div class="flex flex-col gap-1.5">' + partySlots + '</div>'
        + '<div class="text-sm font-bold text-emerald-300">名冊（' + heroes.length + '）</div>'
        + '<div class="flex flex-col gap-1.5 max-h-72 overflow-y-auto">' + roster + '</div>'
        + '<div class="text-xs text-slate-500">提示：左邊隊伍欄點英雄頭卡亦可開管理（換裝／餵技能書）。</div>'
        + '</div>';
}

function partyDeployHero(heroId) {
    if (!apOn()) return;
    var ids = AP.partyIds();
    var slot = -1;
    for (var i = 0; i < ids.length; i++) if (!ids[i]) { slot = i; break; }
    if (slot < 0) { logSys('<span class="text-red-400">編隊已滿（最多 ' + AP.MAX + '）。</span>'); return; }
    if (AP.partySet(slot, heroId)) {
        logSys('<span class="text-emerald-300">已上陣。</span>');
        openPartyRosterPanel();
    }
}

function partyUnequipSlot(index) {
    if (!apOn()) return;
    AP.partySet(index, null);
    openPartyRosterPanel();
}

function openHeroManagePanel(heroId) {
    var div = document.getElementById('interaction-content');
    if (!div) return;
    renderHeroManagePanel(div, heroId);
}

function renderHeroManagePanel(div, heroId) {
    if (!apOn()) return;
    var h = AP.findHero(heroId);
    if (!h) { renderPartyRoster(div); return; }
    var stars = '★'.repeat(h.star || 0) + '☆'.repeat(Math.max(0, 5 - (h.star || 0)));
    var attrs = AP.attrAt(h.cls, h.lv, h.star, (h.rarity || (typeof HERO_DB !== 'undefined' && HERO_DB[h.defId] && HERO_DB[h.defId].rarity) || 'R'));
    var attrLine = ['str', 'dex', 'con', 'int', 'wis', 'cha'].map(function (k) {
        return k.toUpperCase() + ' ' + attrs[k];
    }).join(' · ');
    var skList = (h.skills || []).map(function (sid) {
        var sd = DB.skills[sid];
        return sd ? sd.n : sid;
    }).join('、') || '（未學）';
    var def = (typeof HERO_DB !== 'undefined' && HERO_DB[h.defId]) ? HERO_DB[h.defId] : {};
    var blurb = def.blurb || '';
    var lore = def.lore || '';
    var inTown = typeof _allyManagerInTown === 'function' ? _allyManagerInTown() : true;
    var eqBtn = inTown
        ? '<button onclick="openHeroEquipmentManager(\'' + _esc(heroId) + '\')" class="btn py-2 px-3 text-sm bg-sky-900 border-sky-600 text-sky-100">🎒 換裝</button>'
        : '<span class="text-xs text-slate-500">換裝需喺安全區</span>';
    var bookBtn = inTown
        ? '<button onclick="openHeroSkillbookPanel(\'' + _esc(heroId) + '\')" class="btn py-2 px-3 text-sm bg-violet-900 border-violet-600 text-violet-100">📖 餵技能書</button>'
        : '';

    var curStar = Math.max(0, Math.min(5, Math.floor(Number(h.star) || 0)));
    var fragN = Math.max(0, Math.floor(Number(h.fragments) || 0));
    var nextCost = (typeof AP.starCost === 'function') ? AP.starCost(h) : null;
    var canBreak = nextCost != null && fragN >= nextCost;
    var breakHtml;
    if (curStar >= 5) {
        breakHtml = '<div class="rounded border border-amber-700/60 bg-amber-950/30 p-2 text-xs text-amber-200">⭐ 已達最高 5★ · 等級上限 ' + AP.lvCap(5) + ' · 英雄碎片 ' + fragN + '（保留，唔再換材料）</div>';
    } else {
        breakHtml = '<div class="rounded border border-violet-700/70 bg-violet-950/40 p-2 flex flex-col gap-1">'
            + '<div class="text-sm text-violet-100 font-bold">⭐ 碎片突破升星</div>'
            + '<div class="text-xs text-slate-300">而家 ' + curStar + '★ → 下一星 ' + (curStar + 1) + '★ · 等級上限 ' + AP.lvCap(curStar) + ' → ' + AP.lvCap(curStar + 1)
            + ' · 需要英雄碎片 <b class="' + (canBreak ? 'text-emerald-300' : 'text-rose-300') + '">' + nextCost + '</b>（而家 ' + fragN + '）</div>'
            + '<div class="text-[11px] text-slate-500">重複招募轉「英雄碎片」；只用嚟英雄突破，同專武碎片完全分開。3★ 起技能倍率＋技能質變。</div>'
            + '<button onclick="partyHeroBreakthrough(\'' + _esc(heroId) + '\')" class="btn py-2 px-3 text-sm '
            + (canBreak ? 'bg-amber-800 border-amber-500 text-amber-50' : 'bg-slate-800 border-slate-600 text-slate-400 opacity-60')
            + '"' + (canBreak ? '' : ' disabled') + '>⭐ 突破到 ' + (curStar + 1) + '★（−' + nextCost + ' 英雄碎片）</button></div>';
    }

    div.innerHTML = '<div class="flex flex-col gap-3 p-1">'
        + '<div class="flex items-center justify-between gap-2"><div>'
        + '<div class="text-amber-300 font-bold text-lg">' + _esc(h.name) + ' <span class="text-sm text-slate-400">' + _clsLabel(h.cls) + '</span></div>'
        + '<div class="text-xs text-slate-400">Lv.' + (h.lv || 1) + '/' + AP.lvCap(h.star) + ' · ' + stars + ' · 英雄碎片 ' + fragN + '</div>'
        + '<div class="text-xs text-slate-500 mt-1">' + _esc(attrLine) + '</div>'
        + '</div><button onclick="openPartyRosterPanel()" class="btn py-1 px-3 text-xs bg-slate-700 border-slate-500">返回名冊</button></div>'
        + (blurb ? '<div class="text-sm text-amber-200/90">' + _esc(blurb) + '</div>' : '')
        + (lore ? '<div class="text-xs text-slate-400 leading-relaxed border border-slate-700/80 rounded p-2 bg-slate-900/50">' + _esc(lore) + '</div>' : '')
        + breakHtml
        + (function(){ try {
            var Sset = window.AB_SET, defId = h.defId; if (!defId) return '';
            if (Sset && Sset.enabled) {
              var fr = Sset.frags(defId) || 0;
              var slots = Sset.SLOTS || ['weapon','armor','accessory'];
              var lb = Sset.SLOT_LB || {};
              var rows = slots.map(function (slot) {
                var pk = Sset.pieceKey(defId, slot);
                var pc = (Sset.PIECES && Sset.PIECES[pk]) || null;
                if (!pc) return '';
                var owned = Sset.owned(defId, slot);
                var st = owned ? Sset.star(defId, slot) : 0;
                var eq = owned && Sset.equipped(defId, slot);
                var cost = owned ? Sset.starCost(defId, slot) : null;
                var can = owned && cost != null && fr >= cost && st < 5;
                var line = '<div class="flex flex-wrap items-center justify-between gap-1 border-t border-fuchsia-900/40 pt-1 mt-1">'
                  + '<div class="min-w-0"><div class="text-xs text-fuchsia-100"><b>' + _esc(lb[slot]||slot) + '</b> ' + _esc(pc.n) + ' <span class="text-slate-500">(' + pc.rarity + ')</span></div>';
                if (!owned) line += '<div class="text-[11px] text-slate-500">未擁有</div></div></div>';
                else {
                  line += '<div class="text-[11px] text-slate-400">' + st + '★' + (st < 5 && cost != null ? ' · 下一星 −' + cost : ' · 滿星')
                    + ' · ' + (eq ? '<span class="text-emerald-300">已裝備</span>' : '<span class="text-slate-500">未裝備</span>') + '</div></div>'
                    + '<div class="flex gap-1 shrink-0">'
                    + '<button onclick="partySetBreakthrough(\'' + _esc(defId) + '\',\'' + slot + '\')" class="btn py-0.5 px-2 text-[11px] ' + (can ? 'bg-fuchsia-800 border-fuchsia-500' : 'bg-slate-800 border-slate-600 opacity-60') + '"' + (can ? '' : ' disabled') + '>突破</button>'
                    + '<button onclick="partySetToggle(\'' + _esc(defId) + '\',\'' + slot + '\')" class="btn py-0.5 px-2 text-[11px] bg-slate-700 border-slate-500">' + (eq ? '卸下' : '裝備') + '</button>'
                    + '</div></div>';
                }
                return line;
              }).join('');
              var setOn = Sset.setComplete(defId);
              var sb = Sset.setBonus(defId);
              var setLine = setOn && sb
                ? '<div class="text-[11px] text-emerald-200 mt-1">✦ 套裝質變：' + _esc(sb.text || '') + '</div>'
                : '<div class="text-[11px] text-slate-500 mt-1">三件齊裝備先開套裝質變（固定效果，唔跟平均★）。</div>';
              var aw = '';
              try { if (window.AB_WPN && AB_WPN.awakenText && Sset.owned(defId,'weapon') && Sset.star(defId,'weapon') >= 3) aw = AB_WPN.awakenText(defId, Sset.star(defId,'weapon')) || ''; } catch (eA) {}
              return '<div class="rounded border border-fuchsia-700/60 bg-fuchsia-950/30 p-2 flex flex-col gap-0.5">'
                + '<div class="text-sm text-fuchsia-100 font-bold">🛡 專屬三件套 · 共用碎片 <b class="text-fuchsia-300">' + fr + '</b></div>'
                + rows + setLine
                + (aw ? '<div class="text-[11px] text-fuchsia-200">武器質變：' + _esc(aw) + '</div>' : '')
                + '</div>';
            }
            // fallback 舊專武 UI
            if (!window.AB_WPN || !AB_EXCL || !AB_EXCL[h.defId]) return '';
            var e = AB_EXCL[h.defId], rec = AB_WPN.rec(h.defId), owned = !!(rec && rec.owned);
            var st = owned ? (rec.star||0) : 0, fr2 = owned ? (rec.fragments||0) : 0;
            var cost = owned ? AB_WPN.starCost(h.defId) : null;
            var can = owned && cost != null && fr2 >= cost && st < 5;
            var eq = owned && rec.equipped !== false;
            var html = '<div class="rounded border border-fuchsia-700/60 bg-fuchsia-950/30 p-2 flex flex-col gap-1">'
              + '<div class="text-sm text-fuchsia-100 font-bold">⚔ 專武：' + _esc(e.n) + '（' + e.rarity + '）</div>';
            if (!owned) html += '<div class="text-xs text-slate-400">未擁有——去「專屬裝備轉蛋」抽取。</div>';
            else {
              html += '<div class="text-xs text-slate-300">專武 ' + st + '★ · 碎片 ' + fr2 + '</div>';
              html += '<div class="flex flex-wrap gap-2">'
                + '<button onclick="partyWpnBreakthrough(\'' + _esc(h.defId) + '\')" class="btn py-1.5 px-3 text-xs ' + (can ? 'bg-fuchsia-800 border-fuchsia-500 text-fuchsia-50' : 'bg-slate-800 border-slate-600 text-slate-400 opacity-60') + '"' + (can ? '' : ' disabled') + '>突破</button>'
                + '<button onclick="partyWpnToggle(\'' + _esc(h.defId) + '\')" class="btn py-1.5 px-3 text-xs bg-slate-700 border-slate-500">' + (eq ? '卸下' : '裝備') + '</button></div>';
            }
            html += '</div>';
            return html;
          } catch (eW) { return ''; } })()
        + (function () {
            try {
              var api = window.AB_SKILL_API, defId = h.defId, rar = h.rarity || (def && def.rarity) || 'N';
              var abSk = null, power = '', mulTxt = '';
              if (api && api.resolveByDef && defId) abSk = api.resolveByDef(defId);
              if (!abSk && api && api.resolve) abSk = api.resolve({ defId: defId, cls: h.cls, rarity: rar, hero: true, uniq: (window.UNIQUE && UNIQUE[defId]) || null });
              // UNIQUE name override
              var uniq = (typeof UNIQUE !== 'undefined' && UNIQUE[defId]) || null;
              var n = uniq ? uniq.n : (abSk && abSk.name);
              if (abSk && api.powerOf) power = api.powerOf(abSk.id) || abSk.power || '';
              // preview mul at 1★ perm0（名冊）
              var m = 1;
              if (!(uniq)) m *= ((window.AB_BAL && AB_BAL.heroSk) || 1.15);
              var perm = Math.max(0, Math.min(5, Math.floor(Number(h.star) || 0)));
              var PM = window.AB_PERM_SKILL_MUL || { 0:1,1:1,2:1,3:1.15,4:1.3,5:1.5 };
              m *= (PM[perm] || 1);
              mulTxt = '總倍率 ×' + (Math.round(m * 100) / 100) + '（1★局內・永久' + perm + '★）';
              if (!n) return '<div class="text-sm text-slate-300">已學技能：<span class="text-cyan-300">' + _esc(skList) + '</span></div>';
              return '<div class="text-sm text-slate-300">已學技能：<span class="text-cyan-300">' + _esc(skList) + '</span></div>'
                + '<div class="text-sm text-amber-200/90">⚔ 自走棋技能：<b>' + _esc(n) + '</b>' + (uniq ? ' <span class="text-amber-400 text-xs">專屬</span>' : '')
                + (power ? ' <span class="text-fuchsia-300 text-xs">［本體 ' + _esc(power) + '］</span>' : '')
                + ' <span class="text-emerald-300 text-xs">' + mulTxt + '</span>'
                + (abSk && abSk.desc ? '<div class="text-[11px] text-slate-400 mt-0.5">' + _esc(abSk.desc) + '</div>' : '')
                + '</div>';
            } catch (eAb) {
              return '<div class="text-sm text-slate-300">已學技能：<span class="text-cyan-300">' + _esc(skList) + '</span></div>';
            }
          })()
        + '<div class="flex flex-wrap gap-2">' + eqBtn + bookBtn
        + '<button onclick="partyRemoveAndRefresh(\'' + _esc(heroId) + '\')" class="btn py-2 px-3 text-sm bg-red-950 border-red-700 text-red-200">下陣</button>'
        + '</div>'
        + '<div class="text-xs text-slate-500">裝備只喺本帳英雄同隊長背包之間搬；唔會寫其他創角欄存檔。</div>'
        + '</div>';
}

function partyHeroBreakthrough(heroId) {
    if (!apOn() || typeof AP.breakthrough !== 'function') return;
    var r = AP.breakthrough(heroId);
    if (!r || !r.ok) {
        try { logSys('<span class="text-red-400">⭐ 突破失敗：' + ((r && r.msg) || '未知') + '</span>'); } catch (e) {}
        return;
    }
    try { logSys('<span class="text-amber-300">⭐ 突破成功 → ' + r.star + '★（等級上限 ' + r.lvCap + '）</span>'); } catch (e2) {}
    openHeroManagePanel(heroId);
}

function partyRemoveAndRefresh(heroId) {
    AP.partyRemove(heroId);
    openPartyRosterPanel();
}

function openHeroEquipmentManager(heroId) {
    var div = document.getElementById('interaction-content');
    if (div) renderHeroEquipmentManager(div, heroId);
}

function renderHeroEquipmentManager(div, heroId) {
    if (!apOn()) return;
    var h = AP.findHero(heroId);
    if (!h) { openPartyRosterPanel(); return; }
    if (typeof _allyManagerInTown === 'function' && !_allyManagerInTown()) {
        logSys('<span class="text-red-400">隊員裝備只能喺安全區管理。</span>');
        renderHeroManagePanel(div, heroId);
        return;
    }
    var ally = AP.findAlly(heroId) || (typeof AP.build === 'function' ? AP.build(h) : null);
    var source = ally || h;
    var eq = (h.eq = h.eq || {});
    var slotNames = (typeof ALLY_EQUIP_SLOT_NAME !== 'undefined') ? ALLY_EQUIP_SLOT_NAME : {};
    var equipped = Object.keys(eq).filter(function (s) { return eq[s]; });
    var eqHtml = equipped.length ? equipped.map(function (slot) {
        var item = eq[slot], name = (typeof getItemFullName === 'function') ? getItemFullName(item) : (item.id || '');
        var label = slotNames[slot] || slot;
        return '<div class="flex items-center justify-between gap-2 bg-slate-800/70 border border-slate-600 rounded px-3 py-2">'
            + '<span class="min-w-0 text-sm"><b class="text-slate-300">' + _esc(label) + '</b>　<span class="text-amber-200">' + name + '</span></span>'
            + '<button onclick="AP.heroUnequip(\'' + _esc(heroId) + '\',\'' + _esc(slot) + '\')" class="btn shrink-0 py-1 px-3 text-xs bg-slate-700 border-slate-500">卸下</button></div>';
    }).join('') : '<div class="text-sm text-slate-500">目前沒有穿戴裝備。</div>';

    var inventory = (player.inv || []).filter(function (item) {
        var def = item && DB.items[item.id];
        if (!def || !(def.type === 'wpn' || def.slot)) return false;
        if (typeof _allyCanEquipLeaderItem === 'function' && source) {
            try { return !!_allyCanEquipLeaderItem(source, item); } catch (e) { return false; }
        }
        return true;
    });
    var invHtml = inventory.length ? inventory.map(function (item) {
        var cnt = Math.max(1, Math.floor(item.cnt || 1));
        var name = (typeof getItemFullName === 'function') ? getItemFullName(item) : item.id;
        return '<div class="flex items-center justify-between gap-2 bg-slate-900/60 border border-slate-700 rounded px-3 py-2">'
            + '<span class="min-w-0 text-sm text-slate-200">' + name + (cnt > 1 ? (' ×' + cnt) : '') + '</span>'
            + '<button onclick="AP.heroEquip(\'' + _esc(heroId) + '\',\'' + encodeURIComponent(String(item.uid || '')) + '\')" class="btn shrink-0 py-1 px-3 text-xs bg-emerald-900 border-emerald-700 text-emerald-100">穿戴</button></div>';
    }).join('') : '<div class="text-sm text-slate-500">隊長背包沒有這名英雄可穿戴的裝備。</div>';

    div.innerHTML = '<div class="flex flex-col gap-3 p-1">'
        + '<div class="flex items-center justify-between gap-2"><div>'
        + '<div class="text-amber-300 font-bold">' + _esc(h.name) + ' 的裝備</div>'
        + '<div class="text-xs text-slate-400">裝備由隊長背包提供；卸下會返隊長背包。只寫本帳。</div></div>'
        + '<button onclick="openHeroManagePanel(\'' + _esc(heroId) + '\')" class="btn py-1 px-3 text-xs bg-slate-700 border-slate-500">返回</button></div>'
        + '<div class="flex flex-col gap-2"><div class="text-sm font-bold text-sky-300">已穿戴</div>' + eqHtml + '</div>'
        + '<div class="flex flex-col gap-2"><div class="text-sm font-bold text-emerald-300">隊長背包可穿戴</div>' + invHtml + '</div>'
        + '</div>';
}

function openHeroSkillbookPanel(heroId) {
    var div = document.getElementById('interaction-content');
    if (div) renderHeroSkillbookPanel(div, heroId);
}

function renderHeroSkillbookPanel(div, heroId) {
    if (!apOn()) return;
    var h = AP.findHero(heroId);
    if (!h) { openPartyRosterPanel(); return; }
    var books = (player.inv || []).filter(function (it) {
        var d = it && DB.items[it.id];
        return d && d.type === 'skillbk' && d.sk;
    });
    var rows = books.length ? books.map(function (it) {
        var d = DB.items[it.id], sd = DB.skills[d.sk];
        var learned = (h.skills || []).indexOf(d.sk) >= 0;
        return '<div class="flex items-center justify-between gap-2 bg-slate-800/60 border border-slate-600 rounded px-3 py-2 text-sm">'
            + '<span>' + _esc(d.n) + (learned ? ' <span class="text-amber-400 text-xs">（已學→殘頁）</span>' : '')
            + '<div class="text-xs text-slate-500">' + _esc(sd ? sd.n : d.sk) + '</div></span>'
            + '<button onclick="heroFeedBookUI(\'' + _esc(heroId) + '\',\'' + _esc(String(it.uid || '')) + '\')" class="btn shrink-0 py-1 px-3 text-xs bg-violet-900 border-violet-600 text-violet-100">使用</button></div>';
    }).join('') : '<div class="text-sm text-slate-500">背包冇技能書。</div>';

    div.innerHTML = '<div class="flex flex-col gap-3 p-1">'
        + '<div class="flex items-center justify-between"><div class="text-amber-300 font-bold">餵技能書 → ' + _esc(h.name) + '</div>'
        + '<button onclick="openHeroManagePanel(\'' + _esc(heroId) + '\')" class="btn py-1 px-3 text-xs bg-slate-700 border-slate-500">返回</button></div>'
        + '<div class="flex flex-col gap-1.5 max-h-80 overflow-y-auto">' + rows + '</div></div>';
}

function heroFeedBookUI(heroId, uid) {
    if (AP.feedBook(heroId, uid)) openHeroSkillbookPanel(heroId);
}

// —— 覆寫傭兵公會 NPC 面板 → 名冊 ——
(function patchRenderAllyNPC() {
    if (typeof renderAllyNPC !== 'function') return;
    var _orig = renderAllyNPC;
    window.renderAllyNPC = renderAllyNPC = function (div) {
        if (apOn()) { renderPartyRoster(div); return; }
        return _orig(div);
    };
})();

// —— 左欄隊伍卡可點 ——
(function patchSquadClick() {
    if (typeof renderSquadPanel !== 'function') return;
    var _orig = renderSquadPanel;
    window.renderSquadPanel = renderSquadPanel = function () {
        var r = _orig.apply(this, arguments);
        try { _bindSquadHeroClicks(); } catch (e) {}
        return r;
    };
})();

function _bindSquadHeroClicks() {
    if (!apOn() || !player || !player.allies) return;
    var team = document.getElementById('squad-tab-team');
    if (!team) return;
    var cards = team.querySelectorAll('.ally-compact-card, .bg-slate-900\\/70');
    // 用 ally 順序對應第一批英雄卡（寵物/召喚在後面）
    var heroAllies = player.allies.filter(Boolean);
    var nodes = Array.prototype.slice.call(team.children || []).filter(function (el) {
        return el && el.classList && (el.classList.contains('ally-compact-card') || (el.querySelector && el.querySelector('[id^="squad-rez-"]')));
    });
    // 更穩：用 id prefix squad-hp- / squad-rez-
    heroAllies.forEach(function (a) {
        if (!a || !a._heroId) return;
        var sid = String(a._slot);
        var hp = document.getElementById('squad-hp-' + sid);
        var card = hp ? hp.closest('.ally-compact-card, .bg-slate-900\\/70, .flex') : null;
        if (!card) {
            var rez = document.getElementById('squad-rez-' + sid);
            card = rez ? rez.closest('div.flex, div.bg-slate-900\\/70') : null;
        }
        if (!card || card.dataset.apBound === '1') return;
        card.dataset.apBound = '1';
        card.style.cursor = 'pointer';
        card.title = (card.title ? card.title + ' · ' : '') + '點擊管理英雄';
        card.addEventListener('click', function (ev) {
            if (ev.target && (ev.target.tagName === 'BUTTON' || ev.target.closest('button') || ev.target.tagName === 'INPUT' || ev.target.tagName === 'SELECT')) return;
            openHeroManagePanel(a._heroId);
        });
    });
}

// 技能分頁標題旁加「名冊」快捷（若有 panel header）
(function addRosterShortcut() {
    function tryAdd() {
        var panel = document.getElementById('squad-panel');
        if (!panel || panel.dataset.apRoster === '1') return;
        var head = panel.querySelector('.squad-head, .font-bold, div');
        // 喺分頁按鈕列加
        var btnRow = document.getElementById('squad-tab-btn-team');
        if (!btnRow || !btnRow.parentNode) return;
        if (document.getElementById('squad-tab-btn-roster')) { panel.dataset.apRoster = '1'; return; }
        var b = document.createElement('button');
        b.id = 'squad-tab-btn-roster';
        b.type = 'button';
        b.className = 'btn py-0.5 px-2 text-xs';
        b.textContent = '名冊';
        b.title = '打開英雄名冊編隊';
        b.style.cssText = 'background:#334155;border:1px solid #475569;color:#cbd5e1;margin-left:4px;';
        b.onclick = function (e) {
            e.stopPropagation();
            openPartyRosterPanel();
            // 打開 interaction 面板
            try {
                var ic = document.getElementById('interaction-content');
                if (ic && ic.closest) {
                    var panel2 = document.getElementById('interaction-panel');
                    if (panel2) panel2.classList.remove('hidden');
                }
            } catch (err) {}
        };
        btnRow.parentNode.appendChild(b);
        panel.dataset.apRoster = '1';
    }
    setTimeout(tryAdd, 800);
    setTimeout(tryAdd, 2500);
})();


function apHeroGachaPull(n) {
    if (!apOn()) return;
    n = Math.max(1, Math.min(100, Math.floor(Number(n) || 1)));
    if (typeof AP.gachaPullMany !== 'function') { logSys('<span class="text-red-400">抽卡系統未載入。</span>'); return; }
    var before = AP.gachaTickets();
    if (before < n) { logSys('<span class="text-red-400">招募券不足（需要 ' + n + '，持有 ' + before + '）。</span>'); return; }
    var results = AP.gachaPullMany(n);
    var lines = [];
    var okN = 0;
    results.forEach(function (r) {
        if (!r || !r.ok) {
            if (r && r.msg) lines.push(r.msg);
            return;
        }
        okN++;
        var col = (typeof HERO_RARITY !== 'undefined' && HERO_RARITY[r.rarity] && HERO_RARITY[r.rarity].color) || '#e2e8f0';
        var name = (r.entry && r.entry.name) || r.defId;
        if (r.result && r.result.duplicate) {
            lines.push('<span style="color:' + col + '">[' + r.rarity + ']</span> ' + _esc(name) + '（重複→英雄碎片 +' + ((r.entry && r.entry.fragments) || 0) + '）');
        } else {
            lines.push('<span style="color:' + col + '">[' + r.rarity + ']</span> 新英雄 <b>' + _esc(name) + '</b>');
        }
    });
    if (okN) {
        logSys('<span class="text-amber-300">招募 ×' + okN + '：</span> ' + lines.join('　'));
        try {
            var canN = 0;
            results.forEach(function (r) {
                if (r && r.ok && r.result && r.result.duplicate && r.result.hero && apCanBreak(r.result.hero)) canN++;
            });
            if (canN) logSys('<span class="text-amber-200">⭐ ' + canN + ' 名英雄碎片已夠，可去「管理」突破升星</span>');
        } catch (eB) {}
    } else if (lines.length) {
        logSys('<span class="text-red-400">' + lines[0] + '</span>');
    }
    openPartyRosterPanel();
    try { if (typeof updateUI === 'function') updateUI(); } catch (e) {}
    if (okN) { try { apShowGachaResults(results.filter(function (r) { return r && r.ok; })); } catch (e) { console.warn('gacha popup', e); } }
}
window.apHeroGachaPull = apHeroGachaPull;
// ab.20261022y／ab.20261027c：抽卡結果彈窗（英雄／專武共用 CSS）；SSR/SR 排頭兼發光
var AP_RAR_ORD = { SSR: 1, SR: 2, R: 3, N: 4 };
function apGachaPor(defId) {
    var d = (typeof HERO_DB !== 'undefined' && HERO_DB[defId]) || {};
    try { if (typeof heroPortraitUrl === 'function') { var u = heroPortraitUrl({ defId: defId, cls: d.cls, portraitId: d.portraitId }); if (u) return u; } } catch (x) {}
    return 'assets/hero-full/' + defId + '.jpg';
}
function apEnsureGachaCss() {
    if (document.getElementById('ap-gacha-css')) return;
    var st = document.createElement('style'); st.id = 'ap-gacha-css';
    st.textContent = '#ap-gacha-res{position:fixed;inset:0;z-index:2147483000;background:rgba(2,6,23,.78);display:flex;align-items:center;justify-content:center}'
        + '#ap-gacha-res .gr-box{background:#0f172a;border:2px solid #b45309;border-radius:12px;padding:14px;width:min(760px,94vw);max-height:90vh;overflow:auto;color:#e2e8f0;box-shadow:0 10px 40px #000}'
        + '#ap-gacha-res h3{margin:0 0 4px;font-size:18px;color:#fde68a}#ap-gacha-res .gr-sum{font-size:13px;color:#94a3b8;margin-bottom:10px}'
        + '#ap-gacha-res .gr-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(132px,1fr));gap:8px}'
        + '#ap-gacha-res .gr-c{position:relative;background:#1e293b;border:2px solid var(--rc);border-radius:10px;padding:6px;text-align:center}'
        + '#ap-gacha-res .gr-c img{width:100%;aspect-ratio:1;object-fit:cover;object-position:top;border-radius:6px;background:#0b1220}'
        + '#ap-gacha-res .gr-c.r-SSR{box-shadow:0 0 14px 3px #fbbf24;animation:grGlow 1.6s ease-in-out infinite alternate}#ap-gacha-res .gr-c.r-SR{box-shadow:0 0 10px 2px #c084fc}'
        + '@keyframes grGlow{from{box-shadow:0 0 8px 2px #f59e0b}to{box-shadow:0 0 20px 6px #fde047}}'
        + '#ap-gacha-res .gr-r{position:absolute;top:8px;left:8px;font-weight:900;font-size:13px;padding:0 6px;border-radius:4px;background:rgba(0,0,0,.7);color:var(--rc)}'
        + '#ap-gacha-res .gr-new{position:absolute;top:8px;right:8px;font-weight:900;font-size:12px;padding:0 6px;border-radius:4px;background:#16a34a;color:#fff}'
        + '#ap-gacha-res .gr-dup{font-size:11px;color:#fcd34d}#ap-gacha-res .gr-n{font-weight:700;font-size:14px;color:var(--rc);margin-top:4px}#ap-gacha-res .gr-k{font-size:11px;color:#94a3b8}'
        + '#ap-gacha-res .gr-x{display:block;margin:12px auto 0;padding:8px 28px;font-size:15px;font-weight:700;background:#b45309;color:#fff;border:0;border-radius:8px;cursor:pointer}';
    document.head.appendChild(st);
}
window.apEnsureGachaCss = apEnsureGachaCss;
function apShowGachaResults(list) {
    var old = document.getElementById('ap-gacha-res'); if (old) old.remove();
    apEnsureGachaCss();
    var rows = list.map(function (r, i) { return { r: r, i: i }; }).sort(function (a, b) { return ((AP_RAR_ORD[a.r.rarity] || 9) - (AP_RAR_ORD[b.r.rarity] || 9)) || (a.i - b.i); });
    var cnt = {}; list.forEach(function (r) { cnt[r.rarity] = (cnt[r.rarity] || 0) + 1; });
    var newN = list.filter(function (r) { return !(r.result && r.result.duplicate); }).length;
    var col = function (k) { return (typeof HERO_RARITY !== 'undefined' && HERO_RARITY[k] && HERO_RARITY[k].color) || '#e2e8f0'; };
    var CLL = { knight: '騎士', royal: '王族', elf: '妖精', illusion: '幻術士', warrior: '戰士', mage: '法師', dark: '黑暗妖精', dragon: '龍騎士' }; var clsL = function (c) { return (typeof HERO_CLS_LABEL !== 'undefined' && HERO_CLS_LABEL[c]) || CLL[c] || c || ''; };
    var html = rows.map(function (o) { var r = o.r, d = (typeof HERO_DB !== 'undefined' && HERO_DB[r.defId]) || {}, dup = r.result && r.result.duplicate, h = r.result && r.result.hero;
        return '<div class="gr-c r-' + r.rarity + '" style="--rc:' + col(r.rarity) + '"><img src="' + _esc(apGachaPor(r.defId)) + '" data-def="' + _esc(r.defId) + '" alt=""><span class="gr-r">' + r.rarity + '</span>'
            + (dup ? '' : '<span class="gr-new">NEW</span>') + '<div class="gr-n">' + _esc((r.entry && r.entry.name) || d.name || r.defId) + '</div><div class="gr-k">' + _esc(clsL(d.cls || (h && h.cls))) + '</div>'
            + (dup ? '<div class="gr-dup">重複 → ' + _esc(((h && h.name) || '') ) + ' 英雄碎片 +' + ((r.entry && r.entry.fragments) || 0) + (apCanBreak(h) ? ' · <b style="color:#fbbf24">碎片足夠，可去管理突破</b>' : '') + '</div>' : '<div class="gr-dup" style="color:#4ade80">新英雄 · 起手 1★</div>') + '</div>'; }).join('');
    var box = document.createElement('div'); box.id = 'ap-gacha-res';
    box.innerHTML = '<div class="gr-box"><h3>🎫 招募結果 ×' + list.length + '</h3><div class="gr-sum">' + ['SSR', 'SR', 'R', 'N'].filter(function (k) { return cnt[k]; }).map(function (k) { return '<b style="color:' + col(k) + '">' + k + ' ×' + cnt[k] + '</b>'; }).join('　') + '　·　新英雄 ' + newN + '・重複 ' + (list.length - newN) + '（重複按稀有度轉英雄碎片：' + ['N', 'R', 'SR', 'SSR'].map(function (k) { return k + ' ' + ((typeof HERO_RARITY !== 'undefined' && HERO_RARITY[k] && HERO_RARITY[k].frag) || '?'); }).join('／') + '）</div><div class="gr-grid">' + html + '</div><button class="gr-x" id="ap-gacha-x">確定</button></div>';
    document.body.appendChild(box);
    Array.prototype.forEach.call(box.querySelectorAll('img[data-def]'), function (im) { im.onerror = function () { im.onerror = null; var d = (typeof HERO_DB !== 'undefined' && HERO_DB[im.dataset.def]) || {}; im.src = 'assets/ab-class/' + (d.cls === 'elf' ? 'elf.png' : (d.cls || 'knight') + '.svg'); }; });
    box.querySelector('#ap-gacha-x').onclick = function () { box.remove(); try { var f = document.getElementById('abp-fn'); if (f && window.abHeroPage && !document.getElementById('abhp-ic')) window.abHeroPage(f); } catch (e) {} };
    box.onclick = function (e) { if (e.target === box) box.remove(); };
}
window.apShowGachaResults = apShowGachaResults;

window.openPartyRosterPanel = openPartyRosterPanel;
window.renderPartyRoster = renderPartyRoster;
window.partyDeployHero = partyDeployHero;
window.partyUnequipSlot = partyUnequipSlot;
window.openHeroManagePanel = openHeroManagePanel;
window.openHeroEquipmentManager = openHeroEquipmentManager;
window.openHeroSkillbookPanel = openHeroSkillbookPanel;
window.heroFeedBookUI = heroFeedBookUI;
window.partyRemoveAndRefresh = partyRemoveAndRefresh;

function partyWpnBreakthrough(defId) {
    if (!window.AB_WPN || typeof AB_WPN.breakthrough !== 'function') return;
    var r = AB_WPN.breakthrough(defId);
    if (!r || !r.ok) { try { logSys('<span class="text-red-400">⚔ 專武突破失敗：' + ((r && r.msg) || '未知') + '</span>'); } catch (e) {} return; }
    try { logSys('<span class="text-fuchsia-300">⚔ 專武已突破至 ' + r.star + '★</span>'); } catch (e2) {}
    var h = (typeof AP !== 'undefined' && AP.findHero) ? null : null;
    // refresh manage if open
    try {
      var heroes = (player && player.heroes) || [];
      var own = heroes.filter(function (x) { return x && x.defId === defId; })[0];
      if (own) openHeroManagePanel(own.id);
      else openPartyRosterPanel();
    } catch (e3) { openPartyRosterPanel(); }
}
function partyWpnToggle(defId) {
    if (!window.AB_WPN) return;
    var rec = AB_WPN.rec(defId); if (!rec || !rec.owned) return;
    AB_WPN.setEquipped(defId, rec.equipped === false);
    try {
      var own = ((player && player.heroes) || []).filter(function (x) { return x && x.defId === defId; })[0];
      if (own) openHeroManagePanel(own.id); else openPartyRosterPanel();
    } catch (e) { openPartyRosterPanel(); }
}
function apWpnGachaPull(n) {
    if (!window.AB_WPN || typeof AB_WPN.pullMany !== 'function') { logSys('<span class="text-red-400">專屬裝備轉蛋未載入。</span>'); return; }
    n = Math.max(1, Math.min(100, Math.floor(Number(n) || 1)));
    if (AB_WPN.tickets() < n) { logSys('<span class="text-red-400">專屬裝備券不足（要 ' + n + '，持有 ' + AB_WPN.tickets() + '）。</span>'); return; }
    var results = AB_WPN.pullMany(n);
    var ok = results.filter(function (r) { return r && r.ok; });
    if (ok.length) {
      logSys('<span class="text-fuchsia-300">專屬裝備 ×' + ok.length + '</span>');
    } else if (results[0] && results[0].msg) logSys('<span class="text-red-400">' + results[0].msg + '</span>');
    // 同英雄轉蛋：先刷新名冊／專武庫，再彈結果（避免 refresh 蓋過彈窗）
    openPartyRosterPanel();
    try { if (typeof updateUI === 'function') updateUI(); } catch (e2) {}
    if (ok.length) { try { apShowWpnGachaResults(ok); } catch (e) { console.warn(e); } }
}
function apWpnBuyGold(n) {
    if (!window.AB_WPN) return;
    var r = AB_WPN.buyGold(n || 1);
    if (!r.ok) { logSys('<span class="text-red-400">' + (r.msg || '買唔到') + '</span>'); return; }
    logSys('<span class="text-fuchsia-300">花費 💰' + r.gold + ' 買咗專武券 ×' + r.n + '（而家 ' + r.tickets + '）</span>');
    openPartyRosterPanel();
}
function apWpnExchange(n) {
    if (!window.AB_WPN) return;
    var r = AB_WPN.exchange(n || 1);
    if (!r.ok) { logSys('<span class="text-red-400">' + (r.msg || '換唔到') + '</span>'); return; }
    logSys('<span class="text-fuchsia-300">用 ' + r.spentHeroTk + ' 張英雄招募券換咗專武券 ×' + r.n + '（而家 ' + r.tickets + '）</span>');
    openPartyRosterPanel();
}
function apSetWpnBagFilter(k) {
    window._apWpnBagFilter = (k === 'eq' || k === 'unmax') ? k : 'all';
    try { openPartyRosterPanel(); } catch (e) {}
}
function apShowWpnGachaResults(list) {
    var old = document.getElementById('ap-gacha-res'); if (old) old.remove();
    apEnsureGachaCss(); // 就算今 session 未抽過英雄，專武結果都要有 modal CSS
    var col = function (k) { return k === 'SSR' ? '#fbbf24' : '#c084fc'; };
    var rows = (list || []).map(function (r, i) { return { r: r, i: i }; })
        .sort(function (a, b) { return ((AP_RAR_ORD[a.r.rarity] || 9) - (AP_RAR_ORD[b.r.rarity] || 9)) || (a.i - b.i); });
    var html = rows.map(function (o) {
        var r = o.r;
        var slot = r.slot || 'weapon';
        var slotLb = (window.AB_SET && AB_SET.SLOT_LB && AB_SET.SLOT_LB[slot]) || ({ weapon: '武器', armor: '防具', accessory: '飾品' }[slot] || slot);
        var pc = null;
        try { if (window.AB_SET && AB_SET.PIECES) pc = AB_SET.PIECES[AB_SET.pieceKey(r.defId, slot)]; } catch (eP) {}
        var e = pc || (window.AB_EXCL && AB_EXCL[r.defId]) || {}, dup = !!(r.result && r.result.duplicate);
        var d = (typeof HERO_DB !== 'undefined' && HERO_DB[r.defId]) || {};
        var por = '';
        try { if (typeof heroPortraitUrl === 'function') por = heroPortraitUrl({ defId: r.defId, cls: d.cls, portraitId: d.portraitId }) || ''; } catch (x) {}
        if (!por) por = apGachaPor(r.defId);
        var gain = 0;
        if (dup) {
            if (r.result && r.result.fragments != null) gain = r.result.fragments;
            else if (r.entry && r.entry.fragments != null) gain = r.entry.fragments;
        }
        var nm = e.n || (r.entry && r.entry.name) || r.defId;
        var hn = e.heroName || d.name || '';
        return '<div class="gr-c r-' + r.rarity + '" style="--rc:' + col(r.rarity) + '"><img src="' + _esc(por) + '" data-def="' + _esc(r.defId) + '" alt=""><span class="gr-r">' + r.rarity + '</span>'
            + (dup ? '' : '<span class="gr-new">NEW</span>')
            + '<div class="gr-n">' + _esc(nm) + '</div><div class="gr-k">' + _esc(hn) + '・' + slotLb + '</div>'
            + (dup ? '<div class="gr-dup">重複 → 專屬碎片 +' + gain + '</div>' : '<div class="gr-dup" style="color:#4ade80">新件・已裝備</div>') + '</div>';
    }).join('');
    var box = document.createElement('div'); box.id = 'ap-gacha-res';
    var newN = (list || []).filter(function (r) { return !(r.result && r.result.duplicate); }).length;
    var cnt = {}; (list || []).forEach(function (r) { cnt[r.rarity] = (cnt[r.rarity] || 0) + 1; });
    var sumBits = ['SSR', 'SR'].filter(function (k) { return cnt[k]; }).map(function (k) { return '<b style="color:' + col(k) + '">' + k + ' ×' + cnt[k] + '</b>'; }).join('　');
    box.innerHTML = '<div class="gr-box" style="border-color:#a21caf"><h3>🛡 專屬裝備結果 ×' + (list || []).length + '</h3><div class="gr-sum">' + (sumBits ? sumBits + '　·　' : '') + '新件 ' + newN + '・重複 ' + ((list || []).length - newN) + '（重複→該英雄專屬碎片）</div><div class="gr-grid">' + html + '</div><button class="gr-x" id="ap-gacha-x" style="background:#a21caf">確定</button></div>';
    document.body.appendChild(box);
    Array.prototype.forEach.call(box.querySelectorAll('img[data-def]'), function (im) {
        im.onerror = function () {
            im.onerror = null;
            var d = (typeof HERO_DB !== 'undefined' && HERO_DB[im.dataset.def]) || {};
            im.src = 'assets/ab-class/' + (d.cls === 'elf' ? 'elf.png' : (d.cls || 'knight') + '.svg');
        };
    });
    box.querySelector('#ap-gacha-x').onclick = function () { box.remove(); };
    box.onclick = function (e) { if (e.target === box) box.remove(); };
}
window.apWpnGachaPull = apWpnGachaPull;
window.apWpnBuyGold = apWpnBuyGold;
window.apWpnExchange = apWpnExchange;
window.apSetWpnBagFilter = apSetWpnBagFilter;
window.partyWpnBreakthrough = partyWpnBreakthrough;
window.partyWpnToggle = partyWpnToggle;
window.apShowWpnGachaResults = apShowWpnGachaResults;

function partySetBreakthrough(defId, slot) {
    if (!window.AB_SET) return;
    var r = AB_SET.breakthrough(defId, slot);
    if (!r || !r.ok) { try { logSys('<span class="text-red-400">🛡 突破失敗：' + ((r && r.msg) || '未知') + '</span>'); } catch (e) {} return; }
    try { logSys('<span class="text-fuchsia-300">🛡 已突破至 ' + r.star + '★</span>'); } catch (e2) {}
    try {
      var own = ((player && player.heroes) || []).filter(function (x) { return x && x.defId === defId; })[0];
      if (own) openHeroManagePanel(own.id); else openPartyRosterPanel();
    } catch (e3) { openPartyRosterPanel(); }
}
function partySetToggle(defId, slot) {
    if (!window.AB_SET) return;
    var on = AB_SET.equipped(defId, slot);
    AB_SET.setEquipped(defId, slot, !on);
    try {
      var own = ((player && player.heroes) || []).filter(function (x) { return x && x.defId === defId; })[0];
      if (own) openHeroManagePanel(own.id); else openPartyRosterPanel();
    } catch (e) { openPartyRosterPanel(); }
}
function apClsHeroPull(cls) {
    if (!window.AB_SET) { logSys('<span class="text-red-400">職業卷未載入。</span>'); return; }
    var r = AB_SET.pullClassHero(cls);
    if (!r || !r.ok) { logSys('<span class="text-red-400">' + ((r && r.msg) || '失敗') + '</span>'); return; }
    var d = (typeof HERO_DB !== 'undefined' && HERO_DB[r.defId]) || {};
    logSys('<span class="text-amber-300">🎟 職業英雄券（' + ((AB_SET.CLS_LB && AB_SET.CLS_LB[cls]) || cls) + '）→ ' + (d.name || r.defId) + (r.result && r.result.duplicate ? '（重複→英雄碎片）' : '（新）') + '</span>');
    openPartyRosterPanel();
    try { if (typeof updateUI === 'function') updateUI(); } catch (e) {}
}
function apClsEquipPull(cls) {
    if (!window.AB_SET) { logSys('<span class="text-red-400">職業卷未載入。</span>'); return; }
    var r = AB_SET.pullClassEquip(cls);
    if (!r || !r.ok) { logSys('<span class="text-red-400">' + ((r && r.msg) || '失敗') + '</span>'); return; }
    var pc = r.piece || {};
    logSys('<span class="text-fuchsia-300">🎟 職業裝備券 → ' + (pc.n || r.defId) + '（' + ((AB_SET.SLOT_LB && AB_SET.SLOT_LB[r.slot]) || r.slot) + '）' + (r.result && r.result.duplicate ? ' 重複→專屬碎片' : '') + '</span>');
    openPartyRosterPanel();
    try { if (r.ok) apShowWpnGachaResults([r]); } catch (e) {}
}
function apClsExToggle(mode) {
    window._apClsExMode = (mode === 'equip' || mode === 'hero') ? mode : null;
    try { openPartyRosterPanel(); } catch (e) {}
}
function apClsEquipExchange(cls) {
    if (!window.AB_SET || !AB_SET.exchangeEquipToClsEquip) { logSys('<span class="text-red-400">兌換未載入。</span>'); return; }
    var r = AB_SET.exchangeEquipToClsEquip(cls);
    if (!r || !r.ok) { logSys('<span class="text-red-400">' + ((r && r.msg) || '換唔到') + '</span>'); return; }
    var lb = (AB_SET.CLS_LB && AB_SET.CLS_LB[cls]) || cls;
    logSys('<span class="text-fuchsia-300">兌換：用 ' + r.spent + ' 專屬裝備券 → 🎟' + lb + '職業裝備券 ×1（而家該職 ' + r.tickets + '；剩專屬裝備券 ' + r.wpnTickets + '）</span>');
    window._apClsExMode = null;
    openPartyRosterPanel();
    try { if (typeof updateUI === 'function') updateUI(); } catch (e) {}
}
function apClsHeroExchange(cls) {
    if (!window.AB_SET || !AB_SET.exchangeHeroToClsHero) { logSys('<span class="text-red-400">兌換未載入。</span>'); return; }
    var r = AB_SET.exchangeHeroToClsHero(cls);
    if (!r || !r.ok) { logSys('<span class="text-red-400">' + ((r && r.msg) || '換唔到') + '</span>'); return; }
    var lb = (AB_SET.CLS_LB && AB_SET.CLS_LB[cls]) || cls;
    logSys('<span class="text-amber-300">兌換：用 ' + r.spent + ' 英雄招募券 → 🎟' + lb + '職業英雄券 ×1（而家該職 ' + r.tickets + '；剩招募券 ' + r.heroTickets + '）</span>');
    window._apClsExMode = null;
    openPartyRosterPanel();
    try { if (typeof updateUI === 'function') updateUI(); } catch (e) {}
}
window.partySetBreakthrough = partySetBreakthrough;
window.partySetToggle = partySetToggle;
window.apClsHeroPull = apClsHeroPull;
window.apClsEquipPull = apClsEquipPull;
window.apClsExToggle = apClsExToggle;
window.apClsEquipExchange = apClsEquipExchange;
window.apClsHeroExchange = apClsHeroExchange;

window.partyHeroBreakthrough = partyHeroBreakthrough;

try { console.info('[account-party] D1 party-ui ready · excl-set'); } catch (e) {}
})();
