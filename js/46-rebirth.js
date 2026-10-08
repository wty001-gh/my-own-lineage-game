// ============================================================================
// 🔁 v3.8.111 轉生系統（席琳神殿「轉生天使」；經典模式改在亞丁城鎮）
//
//  規則（用戶規格）：
//   1. Lv99（含 100）可轉生 → 回到 Lv1、經驗歸零。
//   2. 保留轉生前「基礎」最大 HP/MP 的 10%（自然屬性計算：不含裝備／增益／套裝／變身，也不含先前轉生已保留的加成＝不複利）
//      → player.rebirthHp / rebirthMp 累加，js/02 recomputeStats 併入基礎 mhp/mmp。
//   3. 六大屬性回到職業初始值（createBase），配點清空；可分配點數＝創角點數（createBase.pts，同回憶蠟燭模型）＋轉生累積點數。
//      轉生累積點數 player.rebirthPts＝每次轉生 +5（累積）＋每次轉生當下喝過的萬能藥瓶數（1 瓶＝1 點，依 player.panacea 實際加成合計）。
//      萬能藥加成與 panaceaUsed 計數歸零（已轉成點數，不重複計算），可再次飲用到新上限。
//      守恆式：Σ配點＋未分配點數＝創角點數＋max(0, Lv−49)＋rebirthPts（回憶蠟燭 js/13 startRespec 已同步加入 rebirthPts）。
//   4. 每轉生一次：自然配點上限 +5（statAllocCap）、萬能藥使用上限 +5（panaceaQuotaCap）；屬性效果上限 150 不變。
//   5. 精通：已選的本世精通 player.mastery 於轉生時移入 player.masteryLocked（永久生效、不可更換）；再次達 Lv50 可再選 1 種。
//      判定全面改走 masteryHas（js/01），效果疊加。任一角色（目前角色／其他存檔位／出戰傭兵）有未選精通名額 → 頁面頂端提示。
//   6. 升級所需經驗：×(1＋0.5×轉生次數)（js/00 getExpReq(lv, who)）。
//   7. 已學技能全部保留，任何等級皆可使用（js/01 skillReqLv：轉生角色已學技能需求等級視為 1）。
//  不重置：背包／裝備（維持裝備，含第 3/4 戒指欄與第 2 耳環欄）／金幣／倉庫／技能／任務與試煉／收集冊／寵物／血盟等。
// ============================================================================

const REBIRTH_MIN_LV = 99;
const REBIRTH_HPMP_PCT = 0.10;
const REBIRTH_PTS_PER = 5;
const REBIRTH_CAP_PER = 5;
const REBIRTH_PORTRAIT = 'assets/npc/rebirth-angel.png';
const REBIRTH_BG_WIDE = 'assets/npc/rebirth-angel-wide.jpg';
const _RB_STATS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const _RB_STAT_CN = { str: '力量', dex: '敏捷', con: '體質', int: '智力', wis: '精神', cha: '魅力' };

function _rbInt(v) { return Math.max(0, Math.floor(Number(v) || 0)); }
function rebirthCountOf(p) { return _rbInt(p && p.rebirthCount); }

// 舊存檔／傭兵快照補欄位（缺＝0／[]）；js/13 loadGame 呼叫
function rebirthNormalize(p) {
    if (!p || typeof p !== 'object') return p;
    p.rebirthCount = _rbInt(p.rebirthCount);
    p.rebirthHp = _rbInt(p.rebirthHp);
    p.rebirthMp = _rbInt(p.rebirthMp);
    p.rebirthPts = _rbInt(p.rebirthPts);
    if (!Array.isArray(p.masteryLocked)) p.masteryLocked = [];
    if (!Array.isArray(p.rebirthLog)) p.rebirthLog = [];
    return p;
}

// 自然屬性（基礎＋配點＋萬能藥；不含裝備／增益）
function _rbNatural(p, s) { return (p.base && p.base[s] || 0) + (p.alloc && p.alloc[s] || 0) + (p.panacea && p.panacea[s] || 0); }
function _rbPanaceaSum(p) { let n = 0; _RB_STATS.forEach(s => { n += _rbInt(p.panacea && p.panacea[s]); }); return n; }

// 轉生用「基礎最大 HP/MP」：職業公式＋自然 CON/WIS（不含裝備／增益／先前轉生加成）
function rebirthBaseHpMp(p, lvOverride) {
    p = p || player;
    let lv = lvOverride || p.lv || 1;
    if (typeof classBaseHpMp !== 'function') return { hp: p.mhp || 0, mp: p.mmp || 0 };
    return classBaseHpMp(p.cls, lv, _rbNatural(p, 'con'), _rbNatural(p, 'wis'));
}

function rebirthPreview(p) {
    p = p || player;
    let rc = rebirthCountOf(p);
    let lvNow = Math.max(1, Math.floor(Number(p.lv) || 1));
    let estimate = lvNow < REBIRTH_MIN_LV;
    let base = rebirthBaseHpMp(p, estimate ? REBIRTH_MIN_LV : lvNow);
    let keepHp = Math.floor(base.hp * REBIRTH_HPMP_PCT);
    let keepMp = Math.floor(base.mp * REBIRTH_HPMP_PCT);
    let elix = _rbPanaceaSum(p);
    let cb = (typeof createBase !== 'undefined' && createBase[p.cls]) || { pts: 0 };
    let newRebirthPts = _rbInt(p.rebirthPts) + REBIRTH_PTS_PER + elix;
    return {
        estimate: estimate, rc: rc, nextRc: rc + 1,
        baseHp: Math.floor(base.hp), baseMp: Math.floor(base.mp), keepHp: keepHp, keepMp: keepMp,
        totalHp: _rbInt(p.rebirthHp) + keepHp, totalMp: _rbInt(p.rebirthMp) + keepMp,
        elixirs: elix, panaceaUsed: _rbInt(p.panaceaUsed),
        createPts: _rbInt(cb.pts), oldRebirthPts: _rbInt(p.rebirthPts), newRebirthPts: newRebirthPts,
        freeAfter: _rbInt(cb.pts) + newRebirthPts,
        extraAfter: newRebirthPts,   // 比照新角色多出的點數（＝5×轉生次數＋歷次萬能藥轉換）
        statCapNow: 60 + REBIRTH_CAP_PER * rc, statCapNext: 60 + REBIRTH_CAP_PER * (rc + 1),
        quotaNow: 60 + REBIRTH_CAP_PER * rc, quotaNext: 60 + REBIRTH_CAP_PER * (rc + 1),
        expMultNow: 1 + 0.5 * rc, expMultNext: 1 + 0.5 * (rc + 1),
        lockMastery: (!p.classicMode && p.mastery != null) ? p.mastery : null
    };
}

function rebirthCheck(p) {
    p = p || player;
    let reasons = [];
    if (!p || !p.cls) reasons.push('尚未載入角色。');
    else {
        if ((p.lv || 1) < REBIRTH_MIN_LV) reasons.push(`等級不足：需要 Lv${REBIRTH_MIN_LV}（目前 Lv${p.lv || 1}）。`);
        if (p.dead) reasons.push('死亡狀態無法轉生，請先復活。');
        if (typeof _respec !== 'undefined' && _respec) reasons.push('回憶蠟燭配點重置進行中，請先確認或取消。');
        try { if (typeof mercRoleSafeAreaOnly === 'function' && mercRoleSafeAreaOnly()) reasons.push('此角色正在隊伍中擔任傭兵，請先將佢移出隊伍，並切換成遊玩角色後再來轉生。'); } catch (e) {}
    }
    return { ok: reasons.length === 0, reasons: reasons };
}

let _rebirthUI = { confirm: false, ack: false, done: null };

function rebirthAsk() {
    let c = rebirthCheck(player);
    if (!c.ok) { logSys('<span class="text-red-400">' + c.reasons.join(' ') + '</span>'); return; }
    openRebirthStage();   // v3.8.111b：改走專屬全螢幕轉生頁（視覺小說式逐步說明＋最後確認）
}
function rebirthCancel() { _rebirthUI.confirm = false; _rebirthUI.ack = false; _rbRerender(); }
function rebirthAck(el) {
    _rebirthUI.ack = !!(el && el.checked);
    let b = document.getElementById('rb-confirm-btn');
    if (b) { b.disabled = !_rebirthUI.ack; b.classList.toggle('opacity-50', !_rebirthUI.ack); }
}

// 執行轉生（不可逆）。opts.skipAck＝測試／外部腳本用
function doRebirth(opts) {
    opts = opts || {};
    if (!opts.skipAck && !(_rebirthUI.confirm && _rebirthUI.ack)) return false;
    let c = rebirthCheck(player);
    if (!c.ok) { logSys('<span class="text-red-400">' + c.reasons.join(' ') + '</span>'); return false; }
    rebirthNormalize(player);
    let pv = rebirthPreview(player);
    let fromLv = player.lv || 1;
    let cb = createBase[player.cls];
    if (!cb) return false;

    player.rebirthCount = pv.nextRc;
    player.rebirthHp = pv.totalHp;
    player.rebirthMp = pv.totalMp;
    player.rebirthPts = pv.newRebirthPts;
    // 精通：本世選擇 → 鎖定（永久生效）；經典模式無精通
    let lockedName = '';
    if (pv.lockMastery) {
        if (player.masteryLocked.indexOf(pv.lockMastery) < 0) player.masteryLocked.push(pv.lockMastery);
        try { lockedName = MASTERY_DATA[player.cls].list[pv.lockMastery].n; } catch (e) { lockedName = pv.lockMastery; }
        player.mastery = null;
        player.masteryChangeCnt = 0;
    }
    // 屬性：回到職業初始值＋清空配點與萬能藥（已轉為點數）
    player.base = { str: cb.str, dex: cb.dex, con: cb.con, int: cb.int, wis: cb.wis, cha: cb.cha };
    player.alloc = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
    player.panacea = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
    player.panaceaUsed = 0;
    player.lv = 1; player.exp = 0;
    player.bonus = pv.freeAfter;
    player.rebirthLog.push({ n: pv.nextRc, at: Date.now(), fromLv: fromLv, hp: pv.keepHp, mp: pv.keepMp, elixirs: pv.elixirs, pts: REBIRTH_PTS_PER + pv.elixirs, locked: pv.lockMastery || null });
    if (player.rebirthLog.length > 50) player.rebirthLog = player.rebirthLog.slice(-50);

    calcStats();
    player.hp = player.mhp; player.mp = player.mmp;
    try { if (typeof _petEnforceCarry === 'function') { _petEnforceCarry(); if (typeof petRosterSave === 'function') petRosterSave(); } } catch (e) {}
    try { if (typeof renderSkillSelects === 'function') renderSkillSelects(); } catch (e) {}
    try { renderTabs(true); } catch (e) {}
    try { updateUI(); } catch (e) {}
    saveGame();
    logSys(`<span class="text-yellow-300 font-bold text-lg">✦✦✦ 第 ${pv.nextRc} 次轉生完成！✦✦✦</span> <span class="text-amber-200">回到 Lv1；永久 HP +${pv.keepHp}、MP +${pv.keepMp}（累計 HP +${pv.totalHp}／MP +${pv.totalMp}）；可分配點數 ${pv.freeAfter}；配點／萬能藥上限 ${pv.statCapNext}；升級經驗 ×${pv.expMultNext}。${lockedName ? `精通「${lockedName}」已鎖定。` : ''}</span>`);
    try { vfxLevelUp(); } catch (e) {}
    _rebirthUI = { confirm: false, ack: false, done: { n: pv.nextRc, pv: pv, lockedName: lockedName } };
    try { _rbSpecRefresh(true); } catch (e) {}
    _rbRerender();
    return true;
}

function _rbRerender() {
    let el = document.getElementById('interaction-content');
    if (el && el.querySelector('.rb-wrap')) renderRebirthAngel(el);
}

function _rbEnsureStyle() {
    if (document.getElementById('rebirth-style')) return;
    let st = document.createElement('style');
    st.id = 'rebirth-style';
    st.textContent = [
        '#interaction-content > .rb-wrap{position:relative;display:flex;gap:14px;align-items:flex-start;padding:12px;border-radius:10px;border:1px solid rgba(251,191,36,.45);',
        '  background:linear-gradient(rgba(10,10,20,.84),rgba(10,10,20,.93)),url("' + REBIRTH_BG_WIDE + '") center 20%/cover no-repeat !important;box-shadow:inset 0 0 40px rgba(251,191,36,.12);}',
        '.rb-portrait{flex:0 0 32%;max-width:300px;position:sticky;top:0;}',
        '.rb-portrait img{display:block;width:100%;aspect-ratio:4/5;object-fit:cover;border-radius:10px;border:1px solid rgba(253,224,71,.6);box-shadow:0 0 22px rgba(253,224,71,.35);}',
        '.rb-portrait .rb-quote{margin-top:8px;color:#fde68a;font-size:13px;line-height:1.6;text-shadow:0 1px 2px #000;}',
        '.rb-body{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:10px;}',
        '.rb-card{background:rgba(15,15,30,.72);border:1px solid rgba(148,163,184,.35);border-radius:8px;padding:10px 12px;font-size:13.5px;line-height:1.65;color:#e2e8f0;}',
        '.rb-card.gold{border-color:rgba(251,191,36,.65);box-shadow:0 0 12px rgba(251,191,36,.15);}',
        '.rb-card.red{border-color:rgba(248,113,113,.7);}',
        '.rb-card h4{font-weight:700;color:#fcd34d;margin:0 0 4px 0;font-size:14.5px;letter-spacing:.05em;}',
        '.rb-grid{display:grid;grid-template-columns:auto 1fr;gap:2px 12px;}',
        '.rb-grid > :nth-child(odd){color:#94a3b8;white-space:nowrap;}',
        '.rb-grid b{color:#fde68a;}',
        '.rb-rules li{margin:3px 0 3px 1.1em;list-style:disc;}',
        '.rb-rules b{color:#fde68a;}',
        '.rb-btn{width:100%;padding:12px 8px;font-size:16px;font-weight:700;border-radius:8px;color:#fff;border:1px solid #f59e0b;background:linear-gradient(#b45309,#78350f);}',
        '.rb-btn:disabled{background:#475569 !important;border-color:#64748b !important;cursor:not-allowed;}',
        '.rb-btn.ghost{background:#334155;border-color:#64748b;}',
        '#st-rebirth{margin-left:6px;font-size:12px;font-weight:700;color:#fcd34d;border:1px solid rgba(252,211,77,.6);border-radius:9px;padding:0 6px;vertical-align:middle;}',
        '@media (max-width: 768px){',
        '  #interaction-content > .rb-wrap{flex-direction:column;padding:8px;gap:8px;background:linear-gradient(rgba(10,10,20,.88),rgba(10,10,20,.94)) !important;}',
        '  .rb-portrait{position:relative;max-width:none;width:100%;flex:none;}',
        '  .rb-portrait img{aspect-ratio:auto;height:210px;object-position:50% 16%;}',
        '  .rb-card{font-size:13px;padding:8px 10px;}',
        '}',
        // 頂端精通提醒
        '#spec-pick-banner{position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 4px);transform:translateX(-50%);z-index:9500;max-width:min(94vw,640px);',
        '  display:flex;align-items:center;gap:8px;padding:6px 10px 6px 14px;border-radius:999px;cursor:pointer;color:#1c1917;font-weight:700;font-size:13.5px;',
        '  background:linear-gradient(90deg,#fde68a,#fbbf24,#fde68a);border:2px solid #fff7d6;box-shadow:0 0 16px rgba(251,191,36,.85),0 2px 8px rgba(0,0,0,.6);animation:rbPulse 1.6s ease-in-out infinite;}',
        '#spec-pick-banner .sp-txt{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
        '#spec-pick-banner .sp-x{flex:0 0 auto;width:22px;height:22px;border-radius:50%;background:rgba(0,0,0,.25);color:#fff;font-size:13px;line-height:22px;text-align:center;}',
        '#spec-pick-badge{position:fixed;right:8px;top:calc(env(safe-area-inset-top,0px) + 4px);z-index:9500;cursor:pointer;padding:3px 9px;border-radius:999px;font-weight:700;font-size:13px;',
        '  background:#fbbf24;color:#1c1917;border:2px solid #fff7d6;box-shadow:0 0 10px rgba(251,191,36,.8);animation:rbPulse 1.6s ease-in-out infinite;}',
        '@keyframes rbPulse{0%,100%{box-shadow:0 0 8px rgba(251,191,36,.6),0 2px 8px rgba(0,0,0,.6);}50%{box-shadow:0 0 22px rgba(251,191,36,1),0 2px 8px rgba(0,0,0,.6);}}',
        '.rb-dim{color:#94a3b8;} .rb-warn{color:#fcd34d;} .rb-bad{color:#fca5a5;}',
        // ---- 小確認框 ----
        '.rb-prompt{position:fixed;inset:0;z-index:10040;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.62);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);animation:rbFade .18s ease-out;padding:16px;}',
        '.rbp-card{width:min(92vw,400px);border-radius:12px;padding:14px 16px 16px;color:#e2e8f0;border:1px solid rgba(251,191,36,.7);',
        '  background:linear-gradient(rgba(14,12,26,.9),rgba(10,10,20,.96)),url("' + REBIRTH_BG_WIDE + '") center 25%/cover;box-shadow:0 0 28px rgba(251,191,36,.28),0 10px 30px rgba(0,0,0,.7);font-family:inherit;}',
        '.rbp-head{display:flex;align-items:center;gap:10px;margin-bottom:10px;}',
        '.rbp-head img{width:54px;height:54px;border-radius:50%;object-fit:cover;object-position:52% 14%;border:2px solid rgba(253,224,71,.8);box-shadow:0 0 12px rgba(253,224,71,.5);}',
        '.rbp-name{font-weight:800;color:#fde68a;font-size:16px;letter-spacing:.08em;} .rbp-title{color:#94a3b8;font-size:12px;}',
        '.rbp-q{font-size:19px;font-weight:800;color:#fff;text-align:center;margin:4px 0 4px;letter-spacing:.06em;text-shadow:0 0 10px rgba(253,224,71,.5);}',
        '.rbp-sub{text-align:center;color:#cbd5e1;font-size:13px;margin-bottom:12px;}',
        '.rbp-why{color:#fca5a5;font-size:13.5px;line-height:1.6;background:rgba(127,29,29,.25);border:1px solid rgba(248,113,113,.45);border-radius:8px;padding:8px 10px;margin:6px 0 12px;}',
        '.rbp-btns{display:flex;gap:8px;} .rbp-b{flex:1 1 0;padding:10px 4px;border-radius:8px;font-size:15px;font-weight:700;color:#fff;border:1px solid #64748b;background:#334155;cursor:pointer;}',
        '.rbp-b.gold{border-color:#f59e0b;background:linear-gradient(#d97706,#92400e);box-shadow:0 0 10px rgba(245,158,11,.4);} .rbp-b.dim{background:#1e293b;color:#cbd5e1;}',
        '.rbp-b:hover{filter:brightness(1.15);}',
        // ---- 全螢幕轉生頁 ----
        '.rb-stage{position:fixed;inset:0;z-index:10050;overflow:hidden;background:#05040a;color:#f1f5f9;opacity:0;transition:opacity .6s ease;font-family:inherit;user-select:none;-webkit-user-select:none;}',
        '.rb-stage.in{opacity:1;}',
        '.rbs-bg{position:absolute;inset:-30px;background:url("' + REBIRTH_BG_WIDE + '") center 30%/cover no-repeat;filter:blur(7px) brightness(.38) saturate(1.1);transform:scale(1.05);}',
        '.rb-stage::after{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 50% 35%,rgba(253,230,138,.10),rgba(0,0,0,0) 45%,rgba(0,0,0,.55) 100%);}',
        '.rbs-angel-wrap{position:absolute;left:50%;bottom:0;height:86vh;aspect-ratio:4/5;transform:translateX(-50%);z-index:1;opacity:0;animation:rbAngelIn 1.4s ease-out .2s forwards;}',
        '.rbs-angel{display:block;width:100%;height:100%;object-fit:cover;object-position:50% 10%;border-radius:18px 18px 0 0;animation:rbFloat 6s ease-in-out infinite,rbGlow 4s ease-in-out infinite;',
        '  -webkit-mask-image:linear-gradient(to bottom,transparent 0,#000 12%,#000 70%,transparent 100%),linear-gradient(to right,transparent 0,#000 9%,#000 91%,transparent 100%);-webkit-mask-composite:source-in;mask-image:linear-gradient(to bottom,transparent 0,#000 12%,#000 70%,transparent 100%),linear-gradient(to right,transparent 0,#000 9%,#000 91%,transparent 100%);mask-composite:intersect;}',
        '.rbs-sparks{position:absolute;inset:0;z-index:2;pointer-events:none;}',
        '.rbs-sparks i{position:absolute;bottom:-10px;width:var(--sz,3px);height:var(--sz,3px);border-radius:50%;background:#fff7d6;box-shadow:0 0 8px 2px rgba(253,224,71,.75);opacity:0;animation:rbSpark 7s linear infinite;}',
        '.rbs-top{position:absolute;top:calc(env(safe-area-inset-top,0px) + 10px);right:12px;z-index:6;display:flex;gap:8px;}',
        '.rbs-tbtn{padding:6px 12px;border-radius:999px;font-size:14px;font-weight:700;color:#fde68a;background:rgba(15,12,30,.72);border:1px solid rgba(253,224,71,.55);cursor:pointer;backdrop-filter:blur(3px);}',
        '.rbs-box{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 3vh);width:min(960px,94vw);min-height:150px;z-index:5;cursor:pointer;',
        '  padding:26px 22px 16px;border-radius:14px;border:1px solid rgba(253,224,71,.65);background:linear-gradient(rgba(16,12,34,.88),rgba(8,6,18,.93));box-shadow:0 0 0 1px rgba(0,0,0,.6),0 0 30px rgba(253,224,71,.18),inset 0 0 30px rgba(253,224,71,.06);}',
        '.rbs-name{position:absolute;top:-15px;left:22px;padding:3px 16px;border-radius:8px;font-weight:800;font-size:15px;letter-spacing:.15em;color:#1c1917;background:linear-gradient(90deg,#fde68a,#fbbf24);border:1px solid #fff7d6;box-shadow:0 0 12px rgba(251,191,36,.6);}',
        '.rbs-text{font-size:17px;line-height:1.75;min-height:3.5em;text-shadow:0 1px 2px #000;} .rbs-text b{color:#fde68a;} .rbs-text .rb-bad{color:#fca5a5;}',
        '.rbs-caret{color:#fde68a;animation:rbBlink .8s steps(1) infinite;margin-left:1px;}',
        '.rbs-next{text-align:right;color:#fde68a;font-weight:700;font-size:14px;margin-top:4px;animation:rbNudge 1.2s ease-in-out infinite;}',
        '.rbs-choices{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-top:10px;} .rbs-choices:empty{display:none;}',
        '.rbs-c{flex:1 1 200px;max-width:340px;padding:12px 10px;border-radius:10px;font-size:16px;font-weight:800;color:#fff;border:1px solid #64748b;background:rgba(51,65,85,.92);cursor:pointer;}',
        '.rbs-c.gold{border-color:#fbbf24;background:linear-gradient(#d97706,#92400e);box-shadow:0 0 14px rgba(251,191,36,.45);}',
        '.rbs-c.sure{background:linear-gradient(#dc2626,#7f1d1d);border-color:#fca5a5;box-shadow:0 0 18px rgba(248,113,113,.7);animation:rbPulseRed 1s ease-in-out infinite;}',
        '.rbs-burst{position:absolute;left:50%;top:42%;width:0;height:0;z-index:4;pointer-events:none;}',
        '.rbs-burst i{position:absolute;left:0;top:0;width:7px;height:7px;border-radius:50%;background:#fffbe6;box-shadow:0 0 12px 4px rgba(253,224,71,.9);opacity:0;}',
        '.rb-stage[data-step="4"] .rbs-burst i{animation:rbBurst 1.6s ease-out forwards;}',
        '.rbs-flash{position:absolute;inset:0;z-index:4;pointer-events:none;opacity:0;background:radial-gradient(circle at 50% 40%,#fff 0,#fffbe6 30%,rgba(253,224,71,.5) 60%,rgba(255,255,255,0) 85%);}',
        '.rb-stage.bursting .rbs-flash{animation:rbFlash 1.9s ease-out forwards;}',
        '.rb-stage.bursting .rbs-angel,.rb-stage[data-step="4"] .rbs-angel{animation:rbFloat 6s ease-in-out infinite,rbGlowBurst 1s ease-in-out infinite;}',
        '@keyframes rbGlowBurst{0%,100%{filter:brightness(1.4) drop-shadow(0 0 30px rgba(255,247,214,.9))}50%{filter:brightness(1.8) drop-shadow(0 0 60px rgba(255,247,214,1))}}',
        '.rb-stage.reborn .rbs-angel{animation:rbFloat 6s ease-in-out infinite,rbGlowStrong 3s ease-in-out infinite;}',
        '.rbs-rules{position:absolute;inset:0;z-index:8;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.6);padding:12px;} .rbs-rules[hidden]{display:none;}',
        '.rbs-rules-inner{width:min(820px,96vw);max-height:88vh;display:flex;flex-direction:column;border-radius:12px;border:1px solid rgba(253,224,71,.6);background:rgba(10,8,22,.96);box-shadow:0 0 30px rgba(0,0,0,.8);}',
        '.rbs-rules-head{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;font-weight:800;color:#fde68a;border-bottom:1px solid rgba(253,224,71,.3);}',
        '.rbs-rules-body{overflow:auto;-webkit-overflow-scrolling:touch;padding:10px;display:flex;flex-direction:column;gap:10px;user-select:text;-webkit-user-select:text;}',
        '@keyframes rbFade{from{opacity:0}to{opacity:1}}',
        '@keyframes rbAngelIn{from{opacity:0;filter:blur(6px)}to{opacity:1;filter:none}}',
        '@keyframes rbFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}',
        '@keyframes rbGlow{0%,100%{filter:drop-shadow(0 0 10px rgba(253,224,71,.25))}50%{filter:drop-shadow(0 0 26px rgba(253,224,71,.55))}}',
        '@keyframes rbGlowStrong{0%,100%{filter:brightness(1.08) drop-shadow(0 0 18px rgba(253,224,71,.5))}50%{filter:brightness(1.2) drop-shadow(0 0 38px rgba(253,224,71,.85))}}',
        '@keyframes rbSpark{0%{transform:translateY(0);opacity:0}10%{opacity:.9}100%{transform:translateY(-105vh);opacity:0}}',
        '@keyframes rbBlink{50%{opacity:0}}',
        '@keyframes rbNudge{0%,100%{transform:translateX(0)}50%{transform:translateX(4px)}}',
        '@keyframes rbPulseRed{0%,100%{box-shadow:0 0 10px rgba(248,113,113,.5)}50%{box-shadow:0 0 24px rgba(248,113,113,1)}}',
        '@keyframes rbBurst{0%{transform:translate(0,0) scale(.4);opacity:0}15%{opacity:1}100%{transform:translate(var(--dx),var(--dy)) scale(1.3);opacity:0}}',
        '@keyframes rbFlash{0%{opacity:0}25%{opacity:1}55%{opacity:.95}100%{opacity:0}}',
        '@media (max-width: 768px){',
        '  .rbs-angel-wrap{left:0;right:0;top:0;bottom:auto;width:100vw;height:58vh;aspect-ratio:auto;transform:none;}',
        '  .rbs-angel{border-radius:0;object-position:50% 12%;-webkit-mask-image:linear-gradient(to bottom,#000 72%,transparent 100%);-webkit-mask-composite:source-over;mask-image:linear-gradient(to bottom,#000 72%,transparent 100%);mask-composite:add;}',
        '  .rbs-box{width:auto;left:8px;right:8px;transform:none;bottom:calc(env(safe-area-inset-bottom,0px) + 10px);padding:22px 14px 12px;min-height:0;}',
        '  .rbs-text{max-height:34vh;overflow:auto;-webkit-overflow-scrolling:touch;}',
        '  .rbs-text{font-size:15px;line-height:1.65;}',
        '  .rbs-c{flex:1 1 140px;font-size:15px;padding:11px 6px;}',
        '  .rbs-burst{top:30%;}',
        '}',
        '.afk-npcl-ico img.rb-npcl-face{width:40px;height:40px;max-width:none;max-height:none;object-fit:cover;object-position:52% 14%;border-radius:50%;border:1px solid rgba(253,224,71,.7);}'
    ].join('\n');
    (document.head || document.documentElement).appendChild(st);
}

function _rbMasteryName(cls, id) { try { return MASTERY_DATA[cls].list[id].n; } catch (e) { return id; } }

// ---- 規則／狀態／預覽 HTML（NPC 規則面板與全螢幕轉生頁的「📜 規則」共用）----
function _rbStatusHtml(p, pv) {
    let classic = !!p.classicMode;
    let locked = (p.masteryLocked || []).map(id => _rbMasteryName(p.cls, id));
    let curM = p.mastery != null ? _rbMasteryName(p.cls, p.mastery) : '';
    let masteryLine = classic ? '<span class="rb-dim">經典模式無精通</span>'
        : ((locked.length ? `🔒 ${locked.join('、')}` : '') + (curM ? `${locked.length ? '　' : ''}★ 本世：${curM}` : '') || '<span class="rb-dim">尚未選擇</span>');
    return `<div class="rb-card"><h4>📜 你目前的轉生狀態</h4><div class="rb-grid">
        <span>轉生次數</span><span><b>${pv.rc}</b> 次</span>
        <span>轉生 HP/MP 加成</span><span>HP <b>+${_rbInt(p.rebirthHp)}</b>　MP <b>+${_rbInt(p.rebirthMp)}</b>（已併入基礎值）</span>
        <span>轉生累積點數</span><span><b>${_rbInt(p.rebirthPts)}</b> 點（5×轉生次數＋歷次轉換的萬能藥）</span>
        <span>升級經驗倍率</span><span><b>×${pv.expMultNow}</b></span>
        <span>自然配點上限</span><span><b>${pv.statCapNow}</b>（屬性效果上限 150 不變）</span>
        <span>萬能藥</span><span>已使用 <b>${_rbInt(p.panaceaUsed)}</b> / 上限 <b>${pv.quotaNow}</b> 瓶（目前加成合計 ${pv.elixirs} 點）</span>
        <span>精通</span><span>${masteryLine}</span>
    </div></div>`;
}
function _rbPreviewHtml(p, pv) {
    let classic = !!p.classicMode;
    let locked = (p.masteryLocked || []);
    let lvLine = pv.estimate
        ? `<div class="rb-warn" style="font-size:12px;margin-bottom:4px">目前 Lv${p.lv || 1}，尚未達到 Lv${REBIRTH_MIN_LV}——以下為「以目前自然屬性、於 Lv${REBIRTH_MIN_LV} 轉生」的試算。</div>` : '';
    return `<div class="rb-card gold"><h4>🔮 本次（第 ${pv.nextRc} 次）轉生預覽</h4>${lvLine}<div class="rb-grid">
        <span>保留 HP</span><span><b>+${pv.keepHp}</b>（基礎最大 HP ${pv.baseHp} 的 10%）→ 累計 <b>+${pv.totalHp}</b></span>
        <span>保留 MP</span><span><b>+${pv.keepMp}</b>（基礎最大 MP ${pv.baseMp} 的 10%）→ 累計 <b>+${pv.totalMp}</b></span>
        <span>轉生後等級</span><span>Lv1（經驗歸零）</span>
        <span>六大屬性</span><span>回到職業初始值（${_RB_STATS.map(s => _RB_STAT_CN[s] + ' ' + (createBase[p.cls] ? createBase[p.cls][s] : '?')).join('／')}）</span>
        <span>可分配點數</span><span><b>${pv.freeAfter}</b> 點＝創角點數 ${pv.createPts}＋轉生累積 ${pv.newRebirthPts}（之前 ${pv.oldRebirthPts}＋本次轉生 ${REBIRTH_PTS_PER}＋萬能藥轉換 ${pv.elixirs}）</span>
        <span>比新角色多</span><span><b>+${pv.extraAfter}</b> 點</span>
        <span>新配點上限</span><span>${pv.statCapNow} → <b>${pv.statCapNext}</b></span>
        <span>新萬能藥上限</span><span>${pv.quotaNow} → <b>${pv.quotaNext}</b> 瓶（已使用數歸零，可再次飲用）</span>
        <span>升級經驗</span><span>×${pv.expMultNow} → <b>×${pv.expMultNext}</b></span>
        <span>精通</span><span>${classic ? '經典模式無精通' : (pv.lockMastery ? `「${_rbMasteryName(p.cls, pv.lockMastery)}」將鎖定（永久生效）；轉生後再達 Lv50 可再選 1 種` : (locked.length ? '已鎖定的精通持續生效；本世尚未選擇精通（不會新增鎖定）' : '本世尚未選擇精通（轉生後不會有鎖定精通）'))}</span>
    </div></div>`;
}
function _rbRulesHtml(p) {
    let classic = !!p.classicMode;
    let mdN = (typeof MASTERY_DATA !== 'undefined' && MASTERY_DATA[p.cls]) ? Object.keys(MASTERY_DATA[p.cls].list).length : 4;
    return `<div class="rb-card"><h4>📖 轉生規則說明</h4><ul class="rb-rules">
        <li><b>條件</b>：等級達 <b>Lv${REBIRTH_MIN_LV}</b>（Lv100 亦可）。死亡中、回憶蠟燭配點重置中無法轉生。${classic ? '經典模式可轉生（在亞丁城鎮），但經典模式沒有精通。' : '經典模式角色亦可轉生（席琳神殿不開放，改在亞丁城鎮找我）。'}</li>
        <li><b>只限遊玩中的角色</b>：轉生只對「目前正在遊玩的角色」生效，隊伍成員／傭兵不能轉生。若此角色正在別人的隊伍中擔任傭兵，請先將佢移出隊伍，並切換成遊玩角色後再來轉生。你自己隊伍裡的傭兵<b>不需要</b>解散。</li>
        <li><b>等級</b>：轉生後回到 <b>Lv1</b>，經驗歸零，重新成長。</li>
        <li><b>HP／MP 保留</b>：保留轉生前<b>基礎</b>最大 HP、MP 的 <b>10%</b>，永久加入基礎值。基礎值＝職業成長＋自然體質／精神（基礎＋配點＋萬能藥），<b>不含</b>裝備、增益、套裝、變身、收集冊等加成，也不含先前轉生保留的加成（不複利）。每次轉生累加。</li>
        <li><b>屬性重置</b>：六大屬性回到職業初始值，所有配點清空；創角點數與轉生累積點數全部退回，在 Lv1 即可重新分配（與回憶蠟燭相同的配點方式）。Lv50 起每升一級仍 +1 點。</li>
        <li><b>轉生獎勵點數</b>：每次轉生額外 <b>+${REBIRTH_PTS_PER}</b> 點，可累積（第 N 次轉生後共 ${REBIRTH_PTS_PER}×N 點），每次轉生都會連同萬能藥點數一起退回重配，不會遺失也不會重複計算。</li>
        <li><b>萬能藥轉換</b>：轉生前喝下的萬能藥（力量／敏捷／體質／智力／精神／魅力）<b>1 瓶＝1 點</b>全數轉為可分配點數；例：喝了 5 瓶萬能藥(STR)，第 1 次轉生後可多分配 5＋5＝<b>10</b> 點。萬能藥已使用數歸零，轉生後可再次飲用到新上限。</li>
        <li><b>上限提升</b>：每次轉生自然配點上限 <b>+${REBIRTH_CAP_PER}</b>（60→65→70…），萬能藥使用上限 <b>+${REBIRTH_CAP_PER}</b> 瓶（60→65→70…）。屬性效果上限 150 不變。</li>
        <li><b>職業精通</b>：已選的精通在轉生時<b>鎖定保留</b>、永久生效，無法更換或重置。轉生後再次達到 <b>Lv50</b>，可到威頓村「漢」<b>額外選擇 1 種</b>尚未擁有的精通（本世所選可付費更換，下次轉生時鎖定）。轉生 3 次即可同時擁有全部 ${mdN} 種精通，效果同時生效、互相疊加。有未選擇的精通名額時，畫面頂端會出現提示。</li>
        <li><b>經驗懲罰</b>：每次轉生後升級所需經驗 <b>+50%</b>（累加：1 轉 ×1.5、2 轉 ×2、3 轉 ×2.5……）。</li>
        <li><b>保留不變</b>：<b>已學技能全部保留</b>（任何等級皆可使用）、背包、裝備（維持裝備中；第 3/4 戒指欄、第 2 耳環欄已裝備者也維持，但卸下後需重新達到該等級才能再裝）、金幣、倉庫、任務與試煉進度、收集冊、寵物、血盟等全部保留。</li>
        <li><b>傭兵</b>：以此角色為來源招募的傭兵同樣吃到轉生加成（HP/MP、屬性、精通、經驗倍率）；已出戰的傭兵快照是招募當下的資料，重新招募即可更新。</li>
        <li class="rb-bad"><b class="rb-bad">轉生無法復原</b>，請確認後再進行。</li>
    </ul></div>`;
}

// NPC 規則／狀態面板（「查看規則」；浮動視窗）
function renderRebirthAngel(div) {
    _rbEnsureStyle();
    rebirthNormalize(player);
    let p = player, pv = rebirthPreview(p), chk = rebirthCheck(p);
    let done = _rebirthUI.done;
    let doneHtml = done ? `<div class="rb-card gold"><h4>✦ 第 ${done.n} 次轉生完成</h4>
        你已回到 Lv1。永久 HP <b>+${done.pv.keepHp}</b>、MP <b>+${done.pv.keepMp}</b>；
        可分配點數 <b>${done.pv.freeAfter}</b> 點——請到「能力」分頁按＋分配。${done.lockedName ? `精通「${done.lockedName}」已鎖定保留。` : ''}</div>` : '';
    let actionHtml = chk.ok
        ? `<button class="rb-btn" onclick="openRebirthStage()">🔁 進行轉生（第 ${pv.nextRc} 次）</button>`
        : `<button class="rb-btn" disabled>無法轉生</button><div class="rb-bad" style="font-size:12px;margin-top:4px">${chk.reasons.join('<br>')}</div>`;
    div.innerHTML = `<div class="rb-wrap">
        <div class="rb-portrait"><img src="${REBIRTH_PORTRAIT}" alt="轉生天使" onerror="this.style.display='none'">
            <div class="rb-quote">「抵達凡人極限的勇者啊……把你的靈魂交給我。我會讓你回到起點，帶著這一世的力量，走得比從前更遠。」</div></div>
        <div class="rb-body">${doneHtml}${_rbStatusHtml(p, pv)}${_rbPreviewHtml(p, pv)}<div>${actionHtml}</div>${_rbRulesHtml(p)}</div>
    </div>`;
}
function openRebirthRules() {
    closeRebirthPrompt();
    _rbOpenFloat('轉生天使', '轉生', renderRebirthAngel);
}

// ===================== 🔁 點擊轉生天使：小確認框 =====================
function _rbEsc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); }
function closeRebirthPrompt() { let m = document.getElementById('rb-prompt'); if (m) m.remove(); }
function openRebirthPrompt() {
    _rbEnsureStyle();
    closeRebirthPrompt();
    rebirthNormalize(player);
    let chk = rebirthCheck(player), pv = rebirthPreview(player);
    let m = document.createElement('div');
    m.id = 'rb-prompt'; m.className = 'rb-prompt';
    let body = chk.ok
        ? `<div class="rbp-q">是否要進行轉生？</div>
           <div class="rbp-sub">第 ${pv.nextRc} 次轉生　Lv${player.lv} → Lv1　·　升級經驗 ×${pv.expMultNext}</div>
           <div class="rbp-btns"><button class="rbp-b gold" data-act="go">進行轉生</button><button class="rbp-b" data-act="rules">查看規則</button><button class="rbp-b dim" data-act="cancel">取消</button></div>`
        : `<div class="rbp-q">現在還不能轉生</div>
           <div class="rbp-why">${chk.reasons.map(_rbEsc).join('<br>')}</div>
           <div class="rbp-btns"><button class="rbp-b gold" data-act="rules">查看規則</button><button class="rbp-b dim" data-act="cancel">關閉</button></div>`;
    m.innerHTML = `<div class="rbp-card"><div class="rbp-head"><img src="${REBIRTH_PORTRAIT}" alt=""><div><div class="rbp-name">轉生天使</div><div class="rbp-title">[轉生]</div></div></div>${body}</div>`;
    m.addEventListener('click', ev => {
        let act = ev.target && ev.target.getAttribute && ev.target.getAttribute('data-act');
        if (ev.target === m || act === 'cancel') { closeRebirthPrompt(); return; }
        if (act === 'rules') { openRebirthRules(); return; }
        if (act === 'go') { closeRebirthPrompt(); openRebirthStage(); }
    });
    document.body.appendChild(m);
}

// ===================== 🔁 專屬全螢幕轉生頁（視覺小說式） =====================
let _rbStage = null;   // { step, typing, timer, full, pv, sure, busy, done }
function _rbStageEl() { return document.getElementById('rb-stage'); }
function closeRebirthStage() {
    if (_rbStage && _rbStage.busy) return;   // 轉生演出中不可關閉
    if (_rbStage && _rbStage.timer) clearInterval(_rbStage.timer);
    if (_rbStage && _rbStage.sureTimer) clearTimeout(_rbStage.sureTimer);
    _rbStage = null;
    let el = _rbStageEl(); if (el) el.remove();
    document.removeEventListener('keydown', _rbStageKey);
}
function _rbStageKey(ev) {
    if (!_rbStage) return;
    if (ev.key === 'Escape') { let r = document.querySelector('#rb-stage .rbs-rules'); if (r && !r.hidden) { r.hidden = true; return; } if (_rbStage.step < 4) closeRebirthStage(); }
    else if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); rbStageAdvance(); }
}
function _rbCharName(p) { return p.name || p.avatar || _rbClsName(p.cls); }
function _rbStageScript(p, pv) {
    let nm = _rbEsc(_rbCharName(p)), cls = _rbClsName(p.cls);
    let locked = (p.masteryLocked || []).map(id => _rbMasteryName(p.cls, id));
    if (pv.lockMastery) locked = locked.concat([_rbMasteryName(p.cls, pv.lockMastery)]);
    let cb = createBase[p.cls] || {};
    let classic = !!p.classicMode;
    let specMore = !classic && (typeof MASTERY_DATA !== 'undefined' && MASTERY_DATA[p.cls]) && locked.length < Object.keys(MASTERY_DATA[p.cls].list).length;
    return [
        // a) 招呼
        `${p.name ? nm + '，' : ''}${cls}的勇者啊……<br>你終於站上了凡人的極限——Lv${p.lv}。${pv.rc > 0 ? `這已是你第 <b>${pv.nextRc}</b> 次來到我面前了呢。` : ''}<br>我是引導靈魂回歸起點的<b>轉生天使</b>。讓我告訴你，轉生之後會發生什麼。`,
        // b) 保留
        `首先，這些會<b>原封不動地留下</b>：<br>✦ <b>已學會的 ${(p.skills || []).length} 個技能</b>全部保留，Lv1 也能使用<br>✦ 身上的裝備、背包道具、<b>${(p.gold || 0).toLocaleString()}</b> 金幣、倉庫、任務與收集冊<br>${locked.length ? `✦ 精通 <b>${locked.map(_rbEsc).join('、')}</b> 將鎖定並永久生效<br>` : ''}✦ 這一世基礎生命的一成：<b>HP +${pv.keepHp}</b>、<b>MP +${pv.keepMp}</b>（累計 HP +${pv.totalHp}／MP +${pv.totalMp}）`,
        // c) 重置與獲得
        `而這些會<b>回到起點</b>：等級 <b>Lv1</b>、經驗歸零；六大屬性回到 ${cls} 的初始值（力${cb.str}／敏${cb.dex}／體${cb.con}／智${cb.int}／精${cb.wis}／魅${cb.cha}）；萬能藥使用數 ${pv.panaceaUsed} → 0。<br>作為代價與恩賜，你將得到 <b>${pv.freeAfter} 點</b>可自由分配的能力點數（創角 ${pv.createPts}＋轉生 ${pv.newRebirthPts}${pv.elixirs ? `，含萬能藥轉換 ${pv.elixirs}` : ''}），配點上限與萬能藥上限提升為 <b>${pv.statCapNext}／${pv.quotaNext}</b>。<br>只是……之後升級所需的經驗會變成 <b>×${pv.expMultNext}</b>。`,
        // d) 最後確認
        `轉生<b class="rb-bad">無法復原</b>。<br>${nm}，你願意捨下這一世的等級，帶著這些力量重新出發嗎？`,
        // e) 演出
        `那麼……閉上眼睛吧。`,
        // f) 結語（轉生後由 _rbStageDoneText 產生）
        ''
    ];
}
function _rbStageDoneText() {
    let d = _rbStage && _rbStage.done;
    let p = player, pv = d ? d.pv : rebirthPreview(p);
    let classic = !!p.classicMode;
    let n = rebirthCountOf(p);
    let specMore = !classic && (typeof MASTERY_DATA !== 'undefined' && MASTERY_DATA[p.cls]) && (p.masteryLocked || []).length < Object.keys(MASTERY_DATA[p.cls].list).length;
    return `歡迎回來，<b>${_rbEsc(_rbCharName(p))}</b>。你已完成第 <b>${n}</b> 次轉生（<b>轉${n}</b>），現在是 <b>Lv1</b>。<br>你有 <b>${p.bonus}</b> 點能力點數等著分配（上限 ${typeof statAllocCap === 'function' ? statAllocCap() : 60}），永久 HP +${pv.keepHp}、MP +${pv.keepMp} 已經在你體內。${d && d.lockedName ? `<br>精通「${_rbEsc(d.lockedName)}」已鎖定，永遠與你同在。` : ''}${specMore ? '<br>再次抵達 <b>Lv50</b> 時，記得去威頓村找「漢」領悟新的精通。' : ''}<br>去吧，這一次你會走得更遠。`;
}
function openRebirthStage() {
    _rbEnsureStyle();
    closeRebirthPrompt();
    let chk = rebirthCheck(player);
    if (!chk.ok) { openRebirthPrompt(); return; }
    closeRebirthStage();
    rebirthNormalize(player);
    let pv = rebirthPreview(player);
    _rbStage = { step: 0, typing: false, timer: null, full: '', pv: pv, script: _rbStageScript(player, pv), sure: false, busy: false, done: null };
    let st = document.createElement('div');
    st.id = 'rb-stage'; st.className = 'rb-stage';
    let sparks = '';
    for (let i = 0; i < 26; i++) sparks += `<i style="left:${(Math.random() * 100).toFixed(1)}%;animation-delay:${(Math.random() * 6).toFixed(2)}s;animation-duration:${(5 + Math.random() * 5).toFixed(2)}s;--sz:${(2 + Math.random() * 4).toFixed(1)}px"></i>`;
    st.innerHTML = `
        <div class="rbs-bg"></div>
        <div class="rbs-sparks">${sparks}</div>
        <div class="rbs-angel-wrap"><img class="rbs-angel" src="${REBIRTH_PORTRAIT}" alt="轉生天使"></div>
        <div class="rbs-burst"></div>
        <div class="rbs-flash"></div>
        <div class="rbs-top"><button class="rbs-tbtn" data-act="rules">📜 規則</button><button class="rbs-tbtn" data-act="close" title="讓我再想想">✕</button></div>
        <div class="rbs-box" data-act="box">
            <div class="rbs-name">轉生天使</div>
            <div class="rbs-text"></div>
            <div class="rbs-choices"></div>
            <div class="rbs-next" data-act="next">▶ 繼續</div>
        </div>
        <div class="rbs-rules" hidden><div class="rbs-rules-inner">
            <div class="rbs-rules-head"><span>📜 轉生規則與預覽</span><button class="rbs-tbtn" data-act="rules-close">✕ 返回</button></div>
            <div class="rbs-rules-body"></div></div></div>`;
    st.addEventListener('click', ev => {
        let t = ev.target, act = null;
        while (t && t !== st && !act) { act = t.getAttribute && t.getAttribute('data-act'); if (!act) t = t.parentElement; }
        if (!act) return;
        if (act === 'rules') { rbStageShowRules(); return; }
        if (act === 'rules-close') { let r = st.querySelector('.rbs-rules'); if (r) r.hidden = true; return; }
        if (act === 'close') { if (_rbStage && _rbStage.step >= 5) closeRebirthStage(); else rbStageDecline(); return; }
        if (act === 'yes') { ev.stopPropagation(); rbStageAccept(); return; }
        if (act === 'no') { ev.stopPropagation(); rbStageDecline(); return; }
        if (act === 'alloc') { ev.stopPropagation(); rbStageGoAlloc(); return; }
        if (act === 'finish') { ev.stopPropagation(); closeRebirthStage(); return; }
        if (act === 'next' || act === 'box') rbStageAdvance();
    });
    document.body.appendChild(st);
    document.addEventListener('keydown', _rbStageKey);
    requestAnimationFrame(() => st.classList.add('in'));
    _rbStageShow(0);
}
function rbStageShowRules() {
    let st = _rbStageEl(); if (!st) return;
    let r = st.querySelector('.rbs-rules'), b = st.querySelector('.rbs-rules-body');
    if (b) b.innerHTML = _rbStatusHtml(player, rebirthPreview(player)) + (rebirthCountOf(player) && _rbStage && _rbStage.done ? '' : _rbPreviewHtml(player, rebirthPreview(player))) + _rbRulesHtml(player);
    if (r) r.hidden = false;
}
function _rbType(el, html, done) {
    if (_rbStage.timer) clearInterval(_rbStage.timer);
    let tokens = html.match(/<[^>]+>|&[a-z#0-9]+;|[\s\S]/gi) || [];
    let i = 0, out = '';
    _rbStage.typing = true; _rbStage.full = html; _rbStage.onTyped = done;
    el.innerHTML = '';
    _rbStage.timer = setInterval(() => {
        if (!_rbStage) return;
        while (i < tokens.length) { let t = tokens[i++]; out += t; if (t[0] !== '<') break; }
        el.innerHTML = out + '<span class="rbs-caret">▌</span>';
        if (i >= tokens.length) rbStageFinishTyping();
    }, 26);
}
function rbStageFinishTyping() {
    if (!_rbStage || !_rbStage.typing) return;
    clearInterval(_rbStage.timer); _rbStage.timer = null; _rbStage.typing = false;
    let st = _rbStageEl(); if (!st) return;
    st.querySelector('.rbs-text').innerHTML = _rbStage.full;
    let cb = _rbStage.onTyped; _rbStage.onTyped = null;
    if (cb) cb();
}
function _rbStageShow(step) {
    let st = _rbStageEl(); if (!st || !_rbStage) return;
    _rbStage.step = step; _rbStage.sure = false;
    st.setAttribute('data-step', String(step));
    let text = step === 5 ? _rbStageDoneText() : _rbStage.script[step];
    let ch = st.querySelector('.rbs-choices'), nx = st.querySelector('.rbs-next');
    ch.innerHTML = ''; nx.style.visibility = 'hidden';
    _rbType(st.querySelector('.rbs-text'), text, () => {
        if (step <= 2) nx.style.visibility = 'visible';
        else if (step === 3) ch.innerHTML = `<button class="rbs-c gold" data-act="yes">我願意轉生</button><button class="rbs-c" data-act="no">讓我再想想</button>`;
        else if (step === 4) _rbStageBurst();
        else if (step === 5) ch.innerHTML = `<button class="rbs-c gold" data-act="alloc">前往分配點數</button><button class="rbs-c" data-act="finish">關閉</button>`;
    });
}
function rbStageAdvance() {
    if (!_rbStage || _rbStage.busy) return;
    if (_rbStage.typing) { rbStageFinishTyping(); return; }
    if (_rbStage.step <= 2) _rbStageShow(_rbStage.step + 1);
}
function rbStageDecline() {
    if (!_rbStage || _rbStage.busy) return;
    closeRebirthStage();
    try { logSys('<span class="text-slate-300">轉生天使：「沒關係，我會一直在這裡等你。」（未進行轉生）</span>'); } catch (e) {}
}
function rbStageAccept() {
    if (!_rbStage || _rbStage.busy || _rbStage.step !== 3) return;
    let st = _rbStageEl();
    if (!_rbStage.sure) {   // 第一次按：要求再按一次確認（無法復原）
        _rbStage.sure = true;
        let b = st && st.querySelector('[data-act="yes"]');
        if (b) { b.textContent = '真的要轉生嗎？再按一次確認（無法復原）'; b.classList.add('sure'); }
        _rbStage.sureTimer = setTimeout(() => { if (_rbStage && _rbStage.step === 3 && _rbStage.sure) { _rbStage.sure = false; let bb = _rbStageEl() && _rbStageEl().querySelector('[data-act="yes"]'); if (bb) { bb.textContent = '我願意轉生'; bb.classList.remove('sure'); } } }, 6000);
        return;
    }
    let chk = rebirthCheck(player);
    if (!chk.ok) { closeRebirthStage(); openRebirthPrompt(); return; }
    _rbStageShow(4);
}
function _rbStageBurst() {
    let st = _rbStageEl(); if (!st || !_rbStage) return;
    _rbStage.busy = true;
    let burst = st.querySelector('.rbs-burst'), html = '';
    for (let i = 0; i < 48; i++) {
        let ang = Math.random() * Math.PI * 2, dist = 30 + Math.random() * 45;
        html += `<i style="--dx:${(Math.cos(ang) * dist).toFixed(1)}vmin;--dy:${(Math.sin(ang) * dist).toFixed(1)}vmin;animation-delay:${(Math.random() * 0.35).toFixed(2)}s"></i>`;
    }
    burst.innerHTML = html;
    setTimeout(() => { let s = _rbStageEl(); if (s) s.classList.add('bursting'); }, 350);
    setTimeout(() => {
        if (!_rbStage) return;
        let ok = false;
        try { ok = doRebirth({ skipAck: true }); } catch (e) { ok = false; try { console.warn('rebirth failed', e); } catch (e2) {} }
        _rbStage.done = ok ? (_rebirthUI.done || { pv: _rbStage.pv }) : null;
        _rbStage.busy = false;
        let s = _rbStageEl(); if (s) { s.classList.remove('bursting'); s.classList.add('reborn'); }
        if (!ok) { let t = s && s.querySelector('.rbs-text'); if (t) t.innerHTML = '<span class="rb-bad">轉生失敗，請稍後再試。</span>'; let c = s && s.querySelector('.rbs-choices'); if (c) c.innerHTML = '<button class="rbs-c" data-act="finish">關閉</button>'; return; }
        _rbStageShow(5);
    }, 2300);
}
function rbStageGoAlloc() {
    closeRebirthStage();
    try { if (typeof closeNpcInteraction === 'function') closeNpcInteraction(); } catch (e) {}
    try { let sb = document.querySelector('[onclick*="switchTab(\'stats\'"]'); if (sb && typeof switchTab === 'function') switchTab('stats', sb); } catch (e) {}
}

// ===================== 🏅 精通提醒（頁面頂端） =====================
let _rbSpecCache = { at: 0, list: [] };
let _rbSpecDismissSig = null;

function _rbSlotPlayers() {
    let out = [];
    const lim = (typeof SAVE_SLOT_MAX === 'number' && SAVE_SLOT_MAX > 0) ? SAVE_SLOT_MAX : 16;
    if (typeof _lzGet !== 'function' || typeof _saveUnwrap !== 'function') return out;
    for (let n = 1; n <= lim; n++) {
        if (typeof currentSlot !== 'undefined' && player && player.cls && String(n) === String(currentSlot)) continue;
        try {
            let raw = _lzGet('lineage_idle_save_' + n);
            if (!raw) continue;
            let pl = _saveUnwrap(raw).payload;
            if (!pl) continue;
            let p = JSON.parse(pl).p;
            if (p && p.cls) out.push({ slot: n, p: p });
        } catch (e) {}
    }
    return out;
}
function _rbClsName(c) { return ({ knight: '騎士', mage: '法師', elf: '妖精', dark: '黑暗妖精', illusion: '幻術士', dragon: '龍騎士', warrior: '戰士', royal: '王族' })[c] || c; }
function _rbCharLabel(p, slot) { return (p.name || _rbClsName(p.cls)) + ` Lv${p.lv || 1}` + (slot != null ? `（存檔 ${slot}）` : ''); }

// 掃描：目前角色（即時）＋其他存檔位（30 秒快取）＋出戰傭兵快照（需來源存檔亦未選）
function rebirthSpecPending(force) {
    let list = [];
    let now = Date.now();
    if (force || now - _rbSpecCache.at > 30000) {
        let slots = [];
        try { slots = _rbSlotPlayers(); } catch (e) {}
        _rbSpecCache = { at: now, slots: slots };
    }
    let slotMap = {};
    (_rbSpecCache.slots || []).forEach(s => { slotMap[s.slot] = s.p; });
    if (player && player.cls && masteryPickAvailable(player)) list.push({ cur: true, slot: (typeof currentSlot !== 'undefined' ? currentSlot : null), label: _rbCharLabel(player, null) + '（目前角色）', p: player });
    (_rbSpecCache.slots || []).forEach(s => { if (masteryPickAvailable(s.p)) list.push({ cur: false, slot: s.slot, label: _rbCharLabel(s.p, s.slot), p: s.p }); });
    try {
        (player && player.allies || []).forEach(a => {
            if (!a || !masteryPickAvailable(a)) return;
            let sl = a._slot != null ? Number(a._slot) : null;
            if (list.some(x => String(x.slot) === String(sl))) return;
            let src = slotMap[sl];
            if (src && src.mastery != null) return;   // 來源存檔已選 → 快照過期，不提示
            list.push({ cur: false, slot: sl, label: (a._allyName || _rbCharLabel(a, null)) + ` Lv${a.lv || 1}（出戰傭兵·存檔 ${sl}）`, p: a, ally: true });
        });
    } catch (e) {}
    return list;
}

function _rbSpecRefresh(force) {
    _rbEnsureStyle();
    let gs = document.getElementById('game-screen');
    let inGame = !!(player && player.cls && gs && !gs.classList.contains('hidden'));
    let list = inGame ? rebirthSpecPending(force) : [];
    let sig = list.map(x => x.slot + ':' + (x.p.lv >= 50 ? 1 : 0) + ':' + (x.cur ? 'c' : '')).join('|');
    let ban = document.getElementById('spec-pick-banner');
    let badge = document.getElementById('spec-pick-badge');
    if (!list.length) { if (ban) ban.remove(); if (badge) badge.remove(); _rbSpecDismissSig = null; return list; }
    let collapsed = _rbSpecDismissSig === sig;
    if (collapsed) {
        if (ban) ban.remove();
        if (!badge) { badge = document.createElement('div'); badge.id = 'spec-pick-badge'; badge.onclick = () => { _rbSpecDismissSig = null; _rbSpecRefresh(); }; document.body.appendChild(badge); }
        badge.textContent = '🏅 精通 ' + list.length;
        badge.title = '有尚未選擇的職業精通（點此展開提示）';
        return list;
    }
    if (badge) badge.remove();
    if (!ban) {
        ban = document.createElement('div'); ban.id = 'spec-pick-banner';
        ban.innerHTML = '<span class="sp-txt"></span><span class="sp-x" title="收合">✕</span>';
        ban.addEventListener('click', ev => {
            if (ev.target && ev.target.classList && ev.target.classList.contains('sp-x')) { ev.stopPropagation(); _rbSpecDismissSig = ban.dataset.sig; _rbSpecRefresh(); return; }
            openSpecPickNotice();
        });
        document.body.appendChild(ban);
    }
    ban.dataset.sig = sig;
    let first = list[0];
    let txt = list.some(x => x.cur)
        ? `🏅 你有尚未選擇的職業精通！點此立即選擇${list.length > 1 ? `（另有 ${list.length - 1} 位角色）` : ''}`
        : `🏅 ${first.label}${list.length > 1 ? ` 等 ${list.length} 位` : ''} 可選擇職業精通（點此查看）`;
    let t = ban.querySelector('.sp-txt'); if (t && t.textContent !== txt) t.textContent = txt;
    return list;
}

function _rbOpenFloat(name, title, fn) {
    let panel = document.getElementById('town-interaction-container');
    if (!panel) return false;
    let tv = document.getElementById('town-view');
    let townHidden = !tv || tv.classList.contains('hidden');
    if (townHidden && panel.parentElement && panel.parentElement.id === 'town-view') document.body.appendChild(panel);   // 同潘朵拉快捷鍵：狩獵中改掛 body
    if (typeof openTownFloatWindow === 'function') { openTownFloatWindow(name, title, fn); return true; }
    return false;
}
function openHanMasteryShortcut() {
    let panel = document.getElementById('town-interaction-container');
    if (!panel) return;
    let tv = document.getElementById('town-view');
    if ((!tv || tv.classList.contains('hidden')) && panel.parentElement && panel.parentElement.id === 'town-view') document.body.appendChild(panel);
    interactNPC('npc_han', 'town_witon');
}
function openSpecPickNotice() {
    let list = rebirthSpecPending(true);
    if (list.length === 1 && list[0].cur) { openHanMasteryShortcut(); return; }
    _rbOpenFloat('職業精通提醒', '未選擇的精通', div => {
        let rows = list.map(x => `<li class="my-1">${x.cur ? '⭐ ' : ''}<b class="text-yellow-200">${x.label}</b>${x.cur ? '' : '　<span class="text-slate-400 text-xs">請切換到該角色後前往威頓村「漢」選擇</span>'}</li>`).join('');
        let hasCur = list.some(x => x.cur);
        div.innerHTML = `<div class="rb-card gold" style="margin:4px"><h4>🏅 下列角色有尚未選擇的職業精通</h4>
            <ul class="rb-rules">${rows || '<li>目前沒有。</li>'}</ul>
            <div class="text-xs text-slate-300 mt-2">精通在 <b>威頓村「漢」</b> 選擇（Lv50 以上）。轉生後再次達 Lv50 可額外選擇 1 種，已鎖定的精通持續生效。</div>
            ${hasCur ? '<button class="rb-btn mt-2" onclick="openHanMasteryShortcut()">⭐ 立即為目前角色選擇精通</button>' : ''}</div>`;
    });
}

// 等級旁「轉N」標記 + 定時刷新提醒
function _rbTick() {
    try {
        let lv = document.getElementById('st-lv');
        if (lv && player && player.cls) {
            let tag = document.getElementById('st-rebirth');
            let rc = rebirthCountOf(player);
            if (rc > 0) {
                if (!tag) { tag = document.createElement('span'); tag.id = 'st-rebirth'; lv.insertAdjacentElement('afterend', tag); }
                let t = '轉' + rc; if (tag.textContent !== t) { tag.textContent = t; tag.title = `轉生 ${rc} 次·升級經驗 ×${1 + 0.5 * rc}`; }
            } else if (tag) tag.remove();
        }
    } catch (e) {}
    try { _rbSpecRefresh(false); } catch (e) {}
}
// NPC 條列式外掛（afk-npclist·PC 版）：轉生天使那一列改用立繪頭像
function _rbNpcListFace() {
    try {
        document.querySelectorAll('#afk-npclist .afk-npcl-row').forEach(row => {
            let nm = row.querySelector('.afk-npcl-name');
            if (!nm || nm.textContent.indexOf('轉生天使') !== 0) return;
            let ico = row.querySelector('.afk-npcl-ico');
            if (!ico || ico.querySelector('img.rb-npcl-face')) return;
            ico.innerHTML = '<img class="rb-npcl-face" src="' + REBIRTH_PORTRAIT + '" alt="">';
        });
    } catch (e) {}
}
(function _rbInit() {
    try {
        _rbEnsureStyle();
        setInterval(_rbTick, 2000);
        if (typeof MutationObserver === 'function') {
            let mo = new MutationObserver(() => { if (document.getElementById('afk-npclist')) _rbNpcListFace(); });
            let start = () => { let tv = document.getElementById('town-view') || document.body; mo.observe(tv, { childList: true, subtree: true }); };
            if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
        }
    } catch (e) {}
})();
