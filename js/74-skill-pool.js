// ===== ab.20261028s 技能池（Excel「技能池」）＋英雄逐隻分配 =====
// 士兵／基本兵：只用 N 級技 ×0.85；英雄按稀有度；UNIQUE 優先。
// 依賴 70 暴露 window.AB_SKILL_API.ctx（hurt／heal／foes…）。
(function () {
'use strict';

var SOLDIER_MUL = 0.85;
var API = window.AB_SKILL_API = window.AB_SKILL_API || {};

function C() { return API.ctx || {}; }
function K() { return (C().BAL && C().BAL.sk) || {}; }

function sk(id, name, rarity, desc, fn) {
  return { id: id, name: name, rarity: rarity, desc: desc, fn: fn };
}

// —— 各職技能實作（真實效果；非空 stub）——
function buildPool() {
  var pool = {};

  // ========== 騎士 ==========
  pool.knight = {
    N: [
      sk('knight_taunt', '嘲諷・盾壁', 'N', '半徑2嘲諷1.8秒＋自身10%HP護盾', function (u, t, m) {
        var c = C(), skv = K();
        c.inRadius(u.cell, 2, c.enemySide(u)).forEach(function (e) { e.taunt = u; e.tauntT = skv.knightTaunt || 1.8; });
        u.shield += Math.round(u.mhp * (skv.knightShield || 0.10) * m);
        c.ringFx(u, '#93c5fd', 2); c.floatTxt(u, '嘲諷！', '#93c5fd');
      }),
      sk('knight_solid', '堅固防護', 'N', '自身受傷−30%，4秒', function (u, t, m) {
        var c = C(); u.drB = 0.30; u.drT = 4 * Math.max(1, m * 0.85); c.ringFx(u, '#93c5fd', 0); c.floatTxt(u, '堅固', '#93c5fd');
      })
    ],
    R: [
      sk('knight_redarm', '增幅防禦', 'R', '我方前2排物防+15，5秒', function (u, t, m) {
        var c = C(), CLS = c.CLS || {};
        c.alive(u.side).forEach(function (a) {
          if (CLS[a.cls] && CLS[a.cls].front) { a.defB = (a.defB || 0) + 15; a.defT = Math.max(a.defT || 0, 5); }
        });
        c.ringFx(u, '#93c5fd', 2); c.floatTxt(u, '防禦↑', '#93c5fd');
      }),
      sk('knight_counter', '反擊屏障', 'R', '4秒內反彈30%近戰傷害', function (u, t, m) {
        var c = C(); u.reflP = 0.30; u.reflT = 4; c.ringFx(u, '#e5e7eb', 0); c.floatTxt(u, '反擊', '#e5e7eb');
      })
    ],
    SR: [
      sk('knight_guard', '守護之盾', 'SR', '最低血隊友4秒內50%傷害代受', function (u, t, m) {
        var c = C();
        var low = c.alive(u.side).filter(function (a) { return a !== u; }).sort(function (a, b) { return a.hp / a.mhp - b.hp / b.mhp; })[0];
        if (low) { low.guardBy = u; low.guardT = 4; low.guardP = 0.5; c.ringFx(low, '#93c5fd', 0); c.floatTxt(low, '守護', '#93c5fd'); }
      }),
      sk('knight_shock', '衝擊之暈', 'SR', '單體暈1.6秒＋1.0×物傷', function (u, t, m) {
        var c = C(); if (!t) return;
        c.hurt(u, t, u.atk * 1.0 * m, 'phys', { noMana: true });
        t.stun = Math.max(t.stun || 0, 1.6 + (m - 1) * 0.3);
        c.floatTxt(t, '暈', '#93c5fd'); c.ringFx(t, '#93c5fd', 0);
      })
    ],
    SSR: [
      sk('knight_isolde', '銀誓壁壘', 'SSR', '全隊護盾＋嘲諷', function (u, t, m) {
        var c = C(), skv = K();
        c.alive(u.side).forEach(function (a) { a.shield += Math.round(a.mhp * (skv.isoldeShield || 0.12) * m); });
        c.inRadius(u.cell, 2, c.enemySide(u)).forEach(function (e) { e.taunt = u; e.tauntT = (skv.knightTaunt || 1.8) * 0.6; });
        c.ringFx(u, '#93c5fd', 3); c.floatTxt(u, '銀誓！', '#93c5fd');
      }),
      sk('knight_last', '背水一戰', 'SSR', '致命傷留1HP、無敵2.5秒、回20%', function (u, t, m) {
        var c = C(), skv = K();
        u.lastStand = { heal: 0.2, inv: 2.5 };
        c.inRadius(u.cell, 2, c.enemySide(u)).forEach(function (e) { e.taunt = u; e.tauntT = (skv.knightTaunt || 1.8) * 0.5; });
        u.shield += Math.round(u.mhp * (skv.knightShield || 0.10) * m * 0.5);
        c.ringFx(u, '#fbbf24', 1); c.floatTxt(u, '背水', '#fbbf24');
      })
    ]
  };

  // ========== 戰士 ==========
  pool.warrior = {
    N: [
      sk('war_cleave', '旋風斬', 'N', '目標周圍1格1.8×物傷', function (u, t, m) {
        var c = C(), skv = K(); if (!t) return;
        c.inRadius(t.cell, 1, t.side).forEach(function (e) { c.hurt(u, e, u.atk * (skv.warCleave || 1.8) * m, 'phys', { noMana: true }); });
        c.ringFx(t, '#cbd5e1', 1);
      }),
      sk('war_ls', '嗜血', 'N', '擊殺後回15%最大HP（施放時自療8%＋標記）', function (u, t, m) {
        var c = C();
        u._warBloodlust = 0.15;
        c.heal(u, u, u.mhp * 0.08 * m); if (t) c.hurt(u, t, u.atk * 1.2 * m, 'phys', { noMana: true });
        c.floatTxt(u, '嗜血', '#f87171');
      })
    ],
    R: [
      sk('war_rage', '狂怒', 'R', '血<50%攻速+15%（施放時立即進入4秒）', function (u, t, m) {
        var c = C();
        u.rageAs = Math.max(u.rageAs || 0, 0.15); u.asBuffT = Math.max(u.asBuffT || 0, 4);
        if (t) c.hurt(u, t, u.atk * 1.1 * m, 'phys', { noMana: true });
        c.floatTxt(u, '狂怒', '#fb923c');
      }),
      sk('war_shatter', '破甲一擊', 'R', '單體物防−50，3秒＋1.4×物傷', function (u, t, m) {
        var c = C(); if (!t) return;
        c.hurt(u, t, u.atk * 1.4 * m, 'phys', { noMana: true });
        t.def = Math.max(0, (t.def || 0) - 50); t.defBreakT = Math.max(t.defBreakT || 0, 3);
        c.floatTxt(t, '破甲', '#cbd5e1'); c.ringFx(t, '#cbd5e1', 0);
      })
    ],
    SR: [
      sk('war_skaldi', '北境斧王', 'SR', '周圍1格2.4×＋吸血30%', function (u, t, m) {
        var c = C();
        var es = c.inRadius(u.cell, 1, c.enemySide(u)); if (!es.length && t) es = [t];
        var tot = 0; es.forEach(function (e) { tot += c.hurt(u, e, u.atk * 2.4 * m, 'phys', { noMana: true }); });
        c.heal(u, u, tot * 0.3); c.ringFx(u, '#cbd5e1', 1);
      }),
      sk('war_rend', '撕裂', 'SR', '目標流血3秒（每秒0.2×）', function (u, t, m) {
        var c = C(); if (!t) return;
        c.hurt(u, t, u.atk * 1.0 * m, 'phys', { noMana: true });
        t.burn = { t: 3, d: u.atk * 0.2 * m, src: u, stack: Math.min(3, ((t.burn && t.burn.stack) || 0) + 1) };
        c.floatTxt(t, '撕裂', '#ef4444');
      })
    ],
    SSR: [
      sk('war_roar', '戰吼', 'SSR', '全隊攻擊+15%，4秒', function (u, t, m) {
        var c = C();
        c.alive(u.side).forEach(function (a) {
          a.buffAtk = Math.max(a.buffAtk || 0, 0.15); a.buffT = Math.max(a.buffT || 0, 4);
          a.slowT = 0; // 清隊友減速
        });
        c.ringFx(u, '#fbbf24', 3); c.floatTxt(u, '戰吼！', '#fbbf24');
      }),
      sk('war_finale', '旋風終焉', 'SSR', '大範圍2.2×，擊中≥3人回滿能量', function (u, t, m) {
        var c = C();
        var es = c.inRadius(u.cell, 2, c.enemySide(u)); if (!es.length && t) es = c.inRadius(t.cell, 1, t.side);
        es.forEach(function (e) { c.hurt(u, e, u.atk * 2.2 * m, 'phys', { noMana: true }); });
        if (es.length >= 3) u.mana = u.mmana;
        c.ringFx(u, '#e2e8f0', 2); c.floatTxt(u, '終焉', '#e2e8f0');
      })
    ]
  };

  // ========== 龍騎士 ==========
  pool.dragon = {
    N: [
      sk('dra_breath', '龍息', 'N', '目標周圍1格1.6×魔傷＋燃燒', function (u, t, m) {
        var c = C(), skv = K(); if (!t) return;
        c.inRadius(t.cell, 1, t.side).forEach(function (e) {
          c.hurt(u, e, u.atk * (skv.dragonBreath || 1.6) * m, 'mag', { noMana: true });
          e.burn = { t: 3, d: u.atk * 0.15 * m, src: u };
        });
        c.lineFx(u, t, '#f97316');
      }),
      sk('dra_scale', '龍鱗', 'N', '自身物防魔防+20，4秒', function (u, t, m) {
        var c = C();
        u.defB = (u.defB || 0) + 20; u.defT = Math.max(u.defT || 0, 4);
        u.mrB = (u.mrB || 0) + 20; u.mrT = Math.max(u.mrT || 0, 4);
        c.ringFx(u, '#f97316', 0); c.floatTxt(u, '龍鱗', '#f97316');
      })
    ],
    R: [
      sk('dra_awe', '龍威', 'R', '周圍敵人攻速−10%，3秒', function (u, t, m) {
        var c = C();
        c.inRadius(u.cell, 2, c.enemySide(u)).forEach(function (e) { e.slowT = Math.max(e.slowT || 0, 3); e.asSlow = Math.max(e.asSlow || 0, 0.10); });
        if (t) c.hurt(u, t, u.atk * 1.0 * m, 'mag', { noMana: true });
        c.ringFx(u, '#fb923c', 2); c.floatTxt(u, '龍威', '#fb923c');
      }),
      sk('dra_drag', '鎖鏈拖拽', 'R', '拉一個後排到面前＋1.2×物傷', function (u, t, m) {
        var c = C();
        var fs = c.foes(u); if (!fs.length) return;
        var back = fs.slice().sort(function (a, b) { return c.dist(u.cell, b.cell) - c.dist(u.cell, a.cell); })[0];
        var spot = c.adjFree(u.cell); if (spot >= 0) back.cell = spot;
        c.hurt(u, back, u.atk * 1.2 * m, 'phys', { noMana: true });
        c.floatTxt(back, '拖拽', '#f97316'); c.ringFx(back, '#f97316', 0);
      })
    ],
    SR: [
      sk('dra_burst', '龍炎爆發', 'SR', '燃燒目標額外1.2×；無燃則上燃', function (u, t, m) {
        var c = C();
        var tg = c.foes(u).filter(function (e) { return e.burn; });
        if (!tg.length && t) { t.burn = { t: 3, d: u.atk * 0.15 * m, src: u }; tg = [t]; }
        tg.forEach(function (e) { c.hurt(u, e, u.atk * 1.2 * m, 'mag', { noMana: true }); });
        c.ringFx(u, '#ef4444', 1);
      }),
      sk('dra_blood', '龍血', 'SR', '受擊回血標記＋立即自療10%', function (u, t, m) {
        var c = C();
        u._draBlood = 0.12; c.heal(u, u, u.mhp * 0.10 * m);
        c.floatTxt(u, '龍血', '#f87171'); c.ringFx(u, '#f87171', 0);
      })
    ],
    SSR: [
      sk('dra_wrath', '古龍之怒', 'SSR', '直線龍息2.5×＋燃燒', function (u, t, m) {
        var c = C(); if (!t) t = c.foes(u)[0]; if (!t) return;
        var es = c.inRadius(t.cell, 1, t.side).concat([t]);
        var seen = {};
        es.forEach(function (e) {
          if (seen[e.uid]) return; seen[e.uid] = 1;
          c.hurt(u, e, u.atk * 2.5 * m, 'mag', { noMana: true });
          e.burn = { t: 3, d: u.atk * 0.2 * m, src: u };
          e.stun = Math.max(e.stun || 0, 0.5);
        });
        c.lineFx(u, t, '#dc2626');
      }),
      sk('dra_pact', '龍騎士契約', 'SSR', '召喚小龍標記6秒（自身攻速+12%、攻+10%）', function (u, t, m) {
        var c = C();
        u.asBuffT = Math.max(u.asBuffT || 0, 6); u.buffAtk = Math.max(u.buffAtk || 0, 0.10); u.buffT = Math.max(u.buffT || 0, 6);
        u._draWyrm = 6;
        if (t) c.hurt(u, t, u.atk * 1.5 * m, 'mag', { noMana: true });
        c.floatTxt(u, '契約', '#f97316'); c.ringFx(u, '#f97316', 1);
      })
    ]
  };

  // ========== 妖精 ==========
  pool.elf = {
    N: [
      sk('elf_triple', '三重矢', 'N', '最近3敵各1.4×（水元素：治療變體）', function (u, t, m) {
        var c = C(), skv = K();
        if (u.elfEle === 'water') {
          var al = c.alive(u.side); var low = al.slice().sort(function (a, b) { return a.hp / a.mhp - b.hp / b.mhp; })[0];
          if (low) { c.heal(u, low, u.atk * (skv.waterHeal || 1.6) * m); c.cleanse(low); c.ringFx(low, '#7dd3fc', 0); }
          var f = t || c.foes(u)[0]; if (f) c.hurt(u, f, u.atk * (skv.elfShot || 1.4) * 0.5 * m, 'mag', { noMana: true });
          return;
        }
        var fs = c.foes(u).sort(function (a, b) { return c.dist(u.cell, a.cell) - c.dist(u.cell, b.cell); }).slice(0, 3);
        while (fs.length && fs.length < 3) fs.push(fs[0]);
        fs.forEach(function (f, i) {
          if (c.S && c.S.sim) { c.hurt(u, f, u.atk * (skv.elfShot || 1.4) * m, 'phys', { noMana: true }); return; }
          setTimeout(function () { c.projFx(u, f, '#9ccc65', function () { c.hurt(u, f, u.atk * (skv.elfShot || 1.4) * m, 'phys', { noMana: true }); }); }, i * 90);
        });
      }),
      sk('elf_ele', '元素箭', 'N', '對目標1.3×並附加自身元素效果', function (u, t, m) {
        var c = C(); if (!t) t = c.foes(u)[0]; if (!t) return;
        c.hurt(u, t, u.atk * 1.3 * m, 'phys', { noMana: true });
        if (u.ele === 'fire' || u.elfEle === 'fire') t.burn = { t: 3, d: u.atk * 0.12 * m, src: u };
        else if (u.ele === 'water' || u.elfEle === 'water') t.slowT = Math.max(t.slowT || 0, 2);
        else if (u.ele === 'wind' || u.elfEle === 'wind') { u.asBuffT = Math.max(u.asBuffT || 0, 2); }
        else if (u.ele === 'earth' || u.elfEle === 'earth') { t.def = Math.max(0, (t.def || 0) - 6); }
        c.projFx(u, t, '#a3e635', null);
      })
    ],
    R: [
      sk('elf_spring', '淨化之泉', 'R', '最低血治療＋每秒回復', function (u, t, m) {
        var c = C();
        var low = c.alive(u.side).slice().sort(function (a, b) { return a.hp / a.mhp - b.hp / b.mhp; })[0];
        if (low) { c.heal(u, low, u.atk * 1.4 * m); c.cleanse(low); low.hot = { t: 3, v: u.atk * 0.2 * m, src: u }; c.ringFx(low, '#7dd3fc', 0); }
      }),
      sk('elf_gale', '疾風', 'R', '自身攻速+20%，3秒', function (u, t, m) {
        var c = C(); u.asBuffT = Math.max(u.asBuffT || 0, 3); u._elfGale = 0.20;
        if (t) c.hurt(u, t, u.atk * 1.1 * m, 'phys', { noMana: true });
        c.floatTxt(u, '疾風', '#86efac');
      }),
      sk('elf_ley', '地脈', 'R', '目標物防魔防−8，3秒可疊3層＋1.1×', function (u, t, m) {
        var c = C(); if (!t) return;
        c.hurt(u, t, u.atk * 1.1 * m, 'phys', { noMana: true });
        t._ley = Math.min(3, (t._ley || 0) + 1);
        t.def = Math.max(0, (t.def || 0) - 8); t.mr = Math.max(0, (t.mr || 0) - 8);
        t.slowT = Math.max(t.slowT || 0, 3);
        c.floatTxt(t, '地脈×' + t._ley, '#a8a29e');
      })
    ],
    SR: [
      sk('elf_burn', '燃燒之矢', 'SR', '上燃燒，燃燒目標+30%', function (u, t, m) {
        var c = C(); if (!t) t = c.foes(u)[0]; if (!t) return;
        var mul = t.burn ? 1.3 : 1.0;
        c.hurt(u, t, u.atk * 1.5 * m * mul, 'phys', { noMana: true });
        t.burn = { t: 3, d: u.atk * 0.18 * m, src: u, stack: Math.min(2, ((t.burn && t.burn.stack) || 0) + 1) };
        c.projFx(u, t, '#f97316', null);
      }),
      sk('elf_tide', '潮汐', 'SR', '治療2位隊員', function (u, t, m) {
        var c = C();
        var lows = c.alive(u.side).slice().sort(function (a, b) { return a.hp / a.mhp - b.hp / b.mhp; }).slice(0, 2);
        lows.forEach(function (a) { c.heal(u, a, u.atk * 1.3 * m); a.mr = (a.mr || 0) + 10; a.mrT = Math.max(a.mrT || 0, 4); c.ringFx(a, '#38bdf8', 0); });
      }),
      sk('elf_blade', '風刃', 'SR', '直線3格1.6×', function (u, t, m) {
        var c = C(); if (!t) t = c.foes(u)[0]; if (!t) return;
        c.foes(u).filter(function (e) { return c.dist(u.cell, e.cell) <= 3; }).sort(function (a, b) { return c.dist(u.cell, a.cell) - c.dist(u.cell, b.cell); }).slice(0, 3)
          .forEach(function (e) { c.hurt(u, e, u.atk * 1.6 * m, 'phys', { noMana: true }); });
        c.lineFx(u, t, '#86efac');
      }),
      sk('elf_quake', '岩崩', 'SR', '目標周圍1格1.5×＋暈0.3秒', function (u, t, m) {
        var c = C(); if (!t) return;
        c.inRadius(t.cell, 1, t.side).forEach(function (e) {
          c.hurt(u, e, u.atk * 1.5 * m, 'phys', { noMana: true });
          e.stun = Math.max(e.stun || 0, 0.3);
        });
        c.ringFx(t, '#a8a29e', 1);
      })
    ],
    SSR: [
      sk('elf_storm', '箭雨風暴', 'SSR', '5箭隨機，優先低血', function (u, t, m) {
        var c = C(), skv = K();
        var fs = c.foes(u).slice().sort(function (a, b) { return a.hp / a.mhp - b.hp / b.mhp; });
        if (!fs.length) return;
        for (var i = 0; i < 5; i++) {
          var f = fs[i % fs.length];
          c.hurt(u, f, u.atk * (skv.elfShot || 1.4) * 0.85 * m, 'phys', { noMana: true });
          if (Math.random() < 0.25) {
            var adj = c.inRadius(f.cell, 1, f.side).filter(function (x) { return x !== f; })[0];
            if (adj) c.hurt(u, adj, u.atk * 0.7 * m, 'phys', { noMana: true });
          }
        }
        c.ringFx(u, '#bef264', 2);
      }),
      sk('elf_world', '世界樹', 'SSR', '全隊小治療＋攻速', function (u, t, m) {
        var c = C();
        c.alive(u.side).forEach(function (a) {
          c.heal(u, a, u.atk * 0.8 * m); a.asBuffT = Math.max(a.asBuffT || 0, 4);
          if (u.ele || u.elfEle) a._elfWorldEle = u.ele || u.elfEle;
        });
        c.ringFx(u, '#4ade80', 4); c.floatTxt(u, '世界樹', '#4ade80');
      })
    ]
  };

  // ========== 法師 ==========
  pool.mage = {
    N: [
      sk('mage_fireball', '火球', 'N', '目標＋周圍1格2.1×魔傷', function (u, t, m) {
        var c = C(), skv = K(); if (!t) return;
        var best = t, bn = 0;
        c.foes(u).forEach(function (f) { var n = c.inRadius(f.cell, 1, f.side).length; if (n > bn) { bn = n; best = f; } });
        var nm = c.alive(u.side).filter(function (a) { return a.cls === 'mage'; }).length;
        m *= Math.pow(skv.mageStack || 0.85, Math.max(0, nm - 2));
        var doHit = function () {
          c.inRadius(best.cell, 1, best.side).forEach(function (e) {
            c.hurt(u, e, u.atk * (skv.mageAoe || 2.1) * m * (e === best ? 1 : (skv.mageFall || 0.6)), 'mag', { noMana: true });
          });
          c.ringFx(best, '#ff7a45', 1);
        };
        if (c.S && c.S.sim) doHit(); else c.projFx(u, best, '#ff7a45', doHit);
      }),
      sk('mage_ignite', '點燃', 'N', '單體上燃燒＋1.2×魔傷', function (u, t, m) {
        var c = C(); if (!t) return;
        c.hurt(u, t, u.atk * 1.2 * m, 'mag', { noMana: true });
        t.burn = { t: 3, d: u.atk * 0.2 * m, src: u };
        c.floatTxt(t, '點燃', '#f97316');
      })
    ],
    R: [
      sk('mage_frost', '寒冰', 'R', '目標減速35%，2秒＋1.3×', function (u, t, m) {
        var c = C(); if (!t) return;
        c.hurt(u, t, u.atk * 1.3 * m, 'mag', { noMana: true });
        t.slowT = Math.max(t.slowT || 0, 2); t.asSlow = Math.max(t.asSlow || 0, 0.35);
        c.floatTxt(t, '寒冰', '#7dd3fc');
      }),
      sk('mage_well', '魔力湧泉', 'R', '相鄰隊友能量+20', function (u, t, m) {
        var c = C();
        c.inRadius(u.cell, 1, u.side).forEach(function (a) { a.mana = Math.min(a.mmana || 99, (a.mana || 0) + 20); });
        if (t) c.hurt(u, t, u.atk * 0.8 * m, 'mag', { noMana: true });
        c.ringFx(u, '#c084fc', 1); c.floatTxt(u, '湧泉', '#c084fc');
      })
    ],
    SR: [
      sk('mage_blast', '爆炎', 'SR', '燃燒目標周圍額外爆炸', function (u, t, m) {
        var c = C(), skv = K();
        var burned = c.foes(u).filter(function (e) { return e.burn; });
        if (!burned.length && t) { t.burn = { t: 3, d: u.atk * 0.15 * m, src: u }; burned = [t]; }
        burned.forEach(function (b) {
          c.inRadius(b.cell, 1, b.side).forEach(function (e) {
            c.hurt(u, e, u.atk * (skv.mageAoe || 2.1) * 0.7 * m, 'mag', { noMana: true });
            e.burn = { t: 3, d: u.atk * 0.12 * m, src: u };
          });
          c.ringFx(b, '#ef4444', 1);
        });
      }),
      sk('mage_bolt', '落雷', 'SR', '隨機2敵，優先高攻擊', function (u, t, m) {
        var c = C();
        var fs = c.foes(u).slice().sort(function (a, b) { return b.atk - a.atk; }).slice(0, 2);
        fs.forEach(function (e) { c.hurt(u, e, u.atk * 1.8 * m, 'mag', { noMana: true }); c.ringFx(e, '#fde047', 0); });
        u._mageBoltBoost = 0.15;
      })
    ],
    SSR: [
      sk('mage_meteor', '流星', 'SSR', '大範圍2.5×＋燃燒', function (u, t, m) {
        var c = C(), skv = K();
        var nm = c.alive(u.side).filter(function (a) { return a.cls === 'mage'; }).length;
        m *= Math.pow(skv.mageStack || 0.85, Math.max(0, nm - 2));
        var center = t || c.foes(u)[0]; if (!center) return;
        c.inRadius(center.cell, 2, center.side).forEach(function (e) {
          var mul = e.burn ? 1.4 : 1.0;
          c.hurt(u, e, u.atk * 2.5 * m * mul, 'mag', { noMana: true });
          e.burn = { t: 3, d: u.atk * 0.22 * m, src: u };
        });
        c.ringFx(center, '#f97316', 2); c.floatTxt(u, '流星！', '#f97316');
      }),
      sk('mage_res', '元素共鳴', 'SSR', '每種元素全隊魔傷+5%（最多+20%）', function (u, t, m) {
        var c = C();
        var eles = {};
        c.alive(u.side).forEach(function (a) { if (a.ele) eles[a.ele] = 1; if (a.elfEle) eles[a.elfEle] = 1; });
        var n = Math.min(4, Object.keys(eles).length);
        var bonus = 0.05 * n;
        c.alive(u.side).forEach(function (a) { a.sp = (a.sp || 1) + bonus; a._eleResT = 5; });
        c.foes(u).forEach(function (e) { if (e.burn) e.burn.t = (e.burn.t || 0) + 1; });
        if (t) c.hurt(u, t, u.atk * 1.2 * m, 'mag', { noMana: true });
        c.floatTxt(u, '共鳴+' + Math.round(bonus * 100) + '%', '#c084fc');
      })
    ]
  };

  // ========== 幻術士 ==========
  pool.illusion = {
    N: [
      sk('illu_bind', '幻象束縛', 'N', '攻擊最高2敵暈1.2秒', function (u, t, m) {
        var c = C(), skv = K();
        var fs = c.foes(u).sort(function (a, b) { return b.atk - a.atk; }).slice(0, m >= 2 ? 3 : 2);
        fs.forEach(function (f) {
          c.hurt(u, f, u.atk * (skv.illuHit || 1.0) * m, 'mag', { noMana: true });
          f.stun = Math.max(f.stun || 0, 1.2 + (m - 1) * 0.4);
          c.floatTxt(f, '暈', '#e879f9'); c.ringFx(f, '#e879f9', 0);
        });
      }),
      sk('illu_confuse', '迷惑', 'N', '目標miss+20%，3秒＋0.9×', function (u, t, m) {
        var c = C(); if (!t) return;
        c.hurt(u, t, u.atk * 0.9 * m, 'mag', { noMana: true });
        t.missP = Math.max(t.missP || 0, 0.20); t.missT = Math.max(t.missT || 0, 3);
        c.floatTxt(t, '迷惑', '#e879f9');
      })
    ],
    R: [
      sk('illu_mirror', '虛像', 'R', '自己獲得1次免傷', function (u, t, m) {
        var c = C(); u._illuGuard = 1; u.invT = Math.max(u.invT || 0, 0.3);
        if (t) c.hurt(u, t, u.atk * 0.8 * m, 'mag', { noMana: true });
        c.floatTxt(u, '虛像', '#e879f9');
      }),
      sk('illu_drain', '魔力吸取', 'R', '對1敵傷害並偷能量', function (u, t, m) {
        var c = C(); if (!t) return;
        c.hurt(u, t, u.atk * 1.3 * m, 'mag', { noMana: true });
        var steal = Math.min(25, t.mana || 0); t.mana = Math.max(0, (t.mana || 0) - steal);
        u.mana = Math.min(u.mmana, (u.mana || 0) + steal + 10);
        c.floatTxt(t, '吸取', '#c084fc');
      })
    ],
    SR: [
      sk('illu_city', '虛像都城', 'SR', '全體暈1.0秒＋小傷害', function (u, t, m) {
        var c = C();
        // OP：英雄限定（士兵唔會抽到 SR）；持續略收
        var st = Math.min(1.0 * m, 1.2);
        c.foes(u).forEach(function (f) {
          f.stun = Math.max(f.stun || 0, st);
          c.hurt(u, f, u.atk * 0.9 * m, 'mag', { noMana: true });
          f.vulnT = Math.max(f.vulnT || 0, st); f.vulnP = Math.max(f.vulnP || 0, 0.10);
          c.ringFx(f, '#e879f9', 0);
        });
      }),
      sk('illu_clone', '鏡像', 'SR', '自身攻速+15%、下次技能+20%（5秒分身感）', function (u, t, m) {
        var c = C();
        u.asBuffT = Math.max(u.asBuffT || 0, 5); u._illuClone = 0.20; u.sp = (u.sp || 1) + 0.15;
        if (t) c.hurt(u, t, u.atk * 1.1 * m, 'mag', { noMana: true });
        c.floatTxt(u, '鏡像', '#e879f9'); c.ringFx(u, '#e879f9', 0);
      })
    ],
    SSR: [
      sk('illu_nightmare', '夢魘', 'SSR', '全體減速＋攻擊最高者暈', function (u, t, m) {
        var c = C();
        c.foes(u).forEach(function (f) { f.slowT = Math.max(f.slowT || 0, 2.5); });
        var top = c.foes(u).slice().sort(function (a, b) { return b.atk - a.atk; })[0];
        if (top) {
          top.stun = Math.max(top.stun || 0, Math.min(1.2, 1.0 * m));
          top._skillDown = 0.30;
          c.hurt(u, top, u.atk * 1.2 * m, 'mag', { noMana: true });
          c.floatTxt(top, '夢魘', '#a855f7');
        }
        c.ringFx(u, '#a855f7', 3);
      }),
      sk('illu_dominate', '幻術支配', 'SSR', '隨機控制1敵3秒（攻−40%＋對其友軍小傷）', function (u, t, m) {
        var c = C();
        var fs = c.foes(u); if (!fs.length) return;
        var vic = fs[Math.floor(Math.random() * fs.length)];
        vic.stun = Math.max(vic.stun || 0, 0.8);
        vic.buffAtk = Math.min(vic.buffAtk || 0, -0.40); vic.buffT = Math.max(vic.buffT || 0, 3);
        vic._domBomb = { t: 3, src: u, d: u.atk * 1.5 * m };
        c.inRadius(vic.cell, 1, vic.side).forEach(function (e) {
          if (e !== vic) c.hurt(u, e, u.atk * 0.6 * m, 'mag', { noMana: true });
        });
        c.floatTxt(vic, '支配', '#e879f9');
      })
    ]
  };

  // ========== 黑暗妖精 ==========
  pool.dark = {
    N: [
      sk('dark_ambush', '暗影突襲', 'N', '跳最遠殘血，2.1×必爆＋吸血', function (u, t, m) {
        var c = C(), skv = K();
        var fs = c.foes(u); if (!fs.length) return;
        var back = fs.slice().sort(function (a, b) {
          return (c.dist(u.cell, b.cell) - c.dist(u.cell, a.cell)) * 0.5 + ((a.hp / a.mhp) - (b.hp / b.mhp));
        })[0];
        var spot = c.adjFree(back.cell); if (spot >= 0) u.cell = spot;
        var dd = c.hurt(u, back, u.atk * (skv.darkHit || 2.1) * m, 'phys', { noMana: true, crit: true });
        if (dd > 0) c.heal(u, u, dd * (skv.darkLs || 0.35), { vamp: true });
        u.invT = skv.darkInv || 0.8;
        c.ringFx(back, '#a78bfa', 0);
      }),
      sk('dark_poison', '毒刃', 'N', '上毒3秒＋1.3×', function (u, t, m) {
        var c = C(); if (!t) return;
        c.hurt(u, t, u.atk * 1.3 * m, 'phys', { noMana: true });
        t.burn = { t: 3, d: u.atk * 0.18 * m, src: u }; // 毒用 burn tick
        c.floatTxt(t, '毒', '#86efac');
      })
    ],
    R: [
      sk('dark_stealth', '隱匿', 'R', '3秒內下一次攻擊必爆', function (u, t, m) {
        var c = C(); u.nextCrit = true; u.invT = Math.max(u.invT || 0, 0.5);
        if (t) c.hurt(u, t, u.atk * 1.2 * m, 'phys', { noMana: true, crit: true });
        c.floatTxt(u, '隱匿', '#a78bfa');
      }),
      sk('dark_fade', '影遁', 'R', '受擊後短時間攻速+15%＋小傷', function (u, t, m) {
        var c = C(); u.asBuffT = Math.max(u.asBuffT || 0, 3); u._darkFade = 0.15;
        if (t) c.hurt(u, t, u.atk * 1.1 * m, 'phys', { noMana: true });
        c.floatTxt(u, '影遁', '#a78bfa');
      })
    ],
    SR: [
      sk('dark_combo', '暗影連擊', 'SR', '突襲後再打一次0.8×', function (u, t, m) {
        var c = C(), skv = K();
        var fs = c.foes(u); if (!fs.length) return;
        var back = fs.slice().sort(function (a, b) {
          return (c.dist(u.cell, b.cell) - c.dist(u.cell, a.cell)) * 0.5 + ((a.hp / a.mhp) - (b.hp / b.mhp));
        })[0];
        var spot = c.adjFree(back.cell); if (spot >= 0) u.cell = spot;
        var dd = c.hurt(u, back, u.atk * (skv.darkHit || 2.1) * m, 'phys', { noMana: true, crit: true });
        if (dd > 0) c.heal(u, u, dd * (skv.darkLs || 0.35), { vamp: true });
        var dd2 = c.hurt(u, back, u.atk * 0.8 * m, 'phys', { noMana: true, crit: true });
        if (dd2 > 0) c.heal(u, u, dd2 * (skv.darkLs || 0.35) * 0.8, { vamp: true });
        u.invT = skv.darkInv || 0.8;
        c.ringFx(back, '#a78bfa', 0);
      }),
      sk('dark_mark', '致命標記', 'SR', '目標被標記，隊友打佢+15%', function (u, t, m) {
        var c = C(); if (!t) return;
        c.hurt(u, t, u.atk * 1.4 * m, 'phys', { noMana: true, crit: true });
        t._darkMark = { t: 5, mul: 0.15, src: u };
        c.floatTxt(t, '標記', '#c084fc');
      })
    ],
    SSR: [
      sk('dark_dance', '暗影之舞', 'SSR', '連續跳3個殘血（SSR英雄專用）', function (u, t, m) {
        var c = C(), skv = K();
        var fs = c.foes(u).slice().sort(function (a, b) { return a.hp / a.mhp - b.hp / b.mhp; });
        var n = Math.min(3, fs.length);
        for (var i = 0; i < n; i++) {
          var back = fs[i];
          var spot = c.adjFree(back.cell); if (spot >= 0) u.cell = spot;
          var dd = c.hurt(u, back, u.atk * (skv.darkHit || 2.1) * 0.85 * m, 'phys', { noMana: true, crit: true });
          if (dd > 0) c.heal(u, u, dd * (skv.darkLs || 0.35) * 0.7, { vamp: true });
          u.invT = Math.max(u.invT || 0, 0.5);
          c.ringFx(back, '#a78bfa', 0);
        }
        c.floatTxt(u, '影舞', '#a78bfa');
      }),
      sk('dark_night', '夜幕', 'SSR', '3秒內全隊暴擊+10%，自己+20%', function (u, t, m) {
        var c = C();
        c.alive(u.side).forEach(function (a) { a.crit = (a.crit || 0) + 0.10; a._nightCritT = 3; });
        u.crit = (u.crit || 0) + 0.20;
        if (t) c.hurt(u, t, u.atk * 1.5 * m, 'phys', { noMana: true, crit: true });
        c.ringFx(u, '#581c87', 3); c.floatTxt(u, '夜幕', '#c084fc');
      })
    ]
  };

  // ========== 王族 ==========
  pool.royal = {
    N: [
      sk('royal_bless', '王者祝福', 'N', '最低血治療＋全隊攻擊+15%', function (u, t, m) {
        var c = C(), skv = K();
        var al = c.alive(u.side);
        var low = al.slice().sort(function (a, b) { return a.hp / a.mhp - b.hp / b.mhp; })[0];
        if (low) c.heal(u, low, u.atk * (skv.royalHeal || 1.5) * m);
        al.forEach(function (a) {
          a.buffAtk = a.buffT > 0 ? Math.max(a.buffAtk || 0, skv.royalBuff || 0.15) : (skv.royalBuff || 0.15);
          a.buffT = Math.max(a.buffT || 0, 4);
        });
        c.ringFx(u, '#fde68a', 3);
      }),
      sk('royal_inspire', '激勵', 'N', '全隊能量+10', function (u, t, m) {
        var c = C();
        c.alive(u.side).forEach(function (a) { a.mana = Math.min(a.mmana || 99, (a.mana || 0) + 10); });
        c.ringFx(u, '#fde68a', 2); c.floatTxt(u, '激勵', '#fde68a');
      })
    ],
    R: [
      sk('royal_aura', '王權光環', 'R', '周圍隊友物防／魔防+5＋小治療', function (u, t, m) {
        var c = C();
        c.inRadius(u.cell, 2, u.side).forEach(function (a) {
          a.defB = (a.defB || 0) + 5; a.defT = Math.max(a.defT || 0, 5);
          a.mrB = (a.mrB || 0) + 5; a.mrT = Math.max(a.mrT || 0, 5);
          c.heal(u, a, u.atk * 0.6 * m);
        });
        c.ringFx(u, '#fde68a', 2);
      })
    ],
    SR: [
      sk('royal_order', '號令', 'SR', '隨機一名隊友立即回35能量（技能聯動）', function (u, t, m) {
        var c = C();
        var al = c.alive(u.side).filter(function (a) { return a !== u && !a.isMain; });
        var ally = al.length ? al[Math.floor(Math.random() * al.length)] : null;
        if (ally) {
          ally.mana = Math.min(ally.mmana || 99, (ally.mana || 0) + 35);
          ally.sp = (ally.sp || 1) + 0.20; ally._orderBoost = 4;
          c.floatTxt(ally, '號令', '#fbbf24');
        }
        var low = c.alive(u.side).slice().sort(function (a, b) { return a.hp / a.mhp - b.hp / b.mhp; })[0];
        if (low) c.heal(u, low, u.atk * 1.0 * m);
      }),
      sk('royal_light', '王權聖光', 'SR', '全隊治療1.8×＋攻擊+30%', function (u, t, m) {
        var c = C();
        c.alive(u.side).forEach(function (a) {
          c.heal(u, a, u.atk * 1.8 * m); c.cleanse(a);
          a.buffAtk = Math.max(a.buffAtk || 0, 0.30); a.buffT = Math.max(a.buffT || 0, 5);
        });
        c.ringFx(u, '#fde68a', 6);
      })
    ],
    SSR: [
      sk('royal_guard', '王國守護', 'SSR', '全隊護盾＋治療', function (u, t, m) {
        var c = C();
        c.alive(u.side).forEach(function (a) {
          c.heal(u, a, u.atk * 1.2 * m);
          a.shield += Math.round(a.mhp * 0.12 * m);
          a._ccImmune = Math.max(a._ccImmune || 0, 3);
        });
        c.ringFx(u, '#fbbf24', 4); c.floatTxt(u, '王國守護', '#fbbf24');
      }),
      sk('royal_arrive', '王者降臨', 'SSR', '全隊攻擊+25%、攻速+10%，6秒', function (u, t, m) {
        var c = C();
        c.alive(u.side).forEach(function (a) {
          a.buffAtk = Math.max(a.buffAtk || 0, 0.25); a.buffT = Math.max(a.buffT || 0, 6);
          a.asBuffT = Math.max(a.asBuffT || 0, 6); a._royalArrive = 6;
        });
        c.ringFx(u, '#facc15', 5); c.floatTxt(u, '降臨！', '#facc15');
      })
    ]
  };

  return pool;
}

var AB_SKILLS = window.AB_SKILLS = buildPool();
var BY_ID = window.AB_SKILL_BY_ID = {};
var BY_NAME = {};
Object.keys(AB_SKILLS).forEach(function (cls) {
  Object.keys(AB_SKILLS[cls]).forEach(function (r) {
    (AB_SKILLS[cls][r] || []).forEach(function (s) {
      BY_ID[s.id] = s; BY_NAME[s.name] = s;
    });
  });
});

// UNIQUE 名／fn → 池內技能（保留 USK 實作時用名／desc）
var UNIQ_TO_ID = {
  u_isolde: 'knight_isolde', u_aurelia: 'royal_light', u_morgana: 'illu_city', u_skaldi: 'war_skaldi',
  k_shock: 'knight_shock', k_solid: 'knight_solid', k_redarm: 'knight_redarm', k_counter: 'knight_counter',
  k_guard: 'knight_guard', k_last: 'knight_last', k_taunt: 'knight_taunt', k_heal: 'knight_guard',
  u_sylwen: 'elf_world', u_circe: 'mage_meteor', u_nocturne: 'dark_dance', u_wyrmia: 'dra_wrath',
  u_thyra: 'war_rend', u_terrae: 'elf_quake', u_ignis: 'mage_blast', u_umbra: 'dark_mark',
  u_ignara: 'dra_burst', u_ophelia: 'royal_order', u_iris: 'illu_clone', u_pyria: 'elf_burn',
  u_brenna: 'war_shatter', u_nyx: 'dark_stealth', u_celine: 'royal_aura', u_echo: 'illu_bind',
  u_cinder: 'dra_breath'
};


// ab.20261028s：每英雄戰鬥技（跟 Excel 技能池；UNIQUE 仍優先）
var AB_HERO_ASSIGN = window.AB_HERO_ASSIGN = {
  "hero_isolde_knight": "knight_isolde",
  "hero_viviane_knight": "knight_guard",
  "hero_petra_knight": "knight_shock",
  "hero_aurelia_royal": "royal_light",
  "hero_celine_royal": "royal_aura",
  "hero_ophelia_royal": "royal_order",
  "hero_morgana_illusion": "illu_city",
  "hero_iris_illusion": "illu_clone",
  "hero_echo_illusion": "illu_bind",
  "hero_skaldi_warrior": "war_skaldi",
  "hero_brenna_warrior": "war_shatter",
  "hero_thyra_warrior": "war_rend",
  "hero_sylwen_elf": "elf_world",
  "hero_terrae_elf": "elf_quake",
  "hero_pyria_elf": "elf_burn",
  "hero_circe_mage": "mage_meteor",
  "hero_ignis_mage": "mage_blast",
  "hero_sora_mage": "mage_well",
  "hero_nocturne_dark": "dark_dance",
  "hero_umbra_dark": "dark_mark",
  "hero_nyx_dark": "dark_stealth",
  "hero_wyrmia_dragon": "dra_wrath",
  "hero_ignara_dragon": "dra_burst",
  "hero_cinder_dragon": "dra_breath",
  "hero_aria_knight": "knight_redarm",
  "hero_cassia_knight": "knight_counter",
  "hero_rheina_knight": "knight_taunt",
  "hero_nora_knight": "knight_solid",
  "hero_selene_knight": "knight_last",
  "hero_brigitte_knight": "knight_last",
  "hero_lena_knight": "knight_solid",
  "hero_mirae_knight": "knight_redarm",
  "hero_jodie_knight": "knight_counter",
  "hero_lisette_royal": "royal_guard",
  "hero_ysolde_royal": "royal_arrive",
  "hero_rosalie_royal": "royal_inspire",
  "hero_beatrix_royal": "royal_bless",
  "hero_nadine_royal": "royal_bless",
  "hero_fleur_royal": "royal_inspire",
  "hero_claire_royal": "royal_aura",
  "hero_elise_royal": "royal_order",
  "hero_margot_royal": "royal_light",
  "hero_liria_elf": "elf_spring",
  "hero_faelira_elf": "elf_ley",
  "hero_nyssa_elf": "elf_gale",
  "hero_aelin_elf": "elf_ele",
  "hero_mireille_elf": "elf_triple",
  "hero_orla_elf": "elf_tide",
  "hero_winda_elf": "elf_blade",
  "hero_saffra_elf": "elf_storm",
  "hero_lyra_elf": "elf_triple",
  "hero_mira_illusion": "illu_mirror",
  "hero_phantom_illusion": "illu_drain",
  "hero_zephyra_illusion": "illu_nightmare",
  "hero_lumen_illusion": "illu_confuse",
  "hero_shade_illusion": "illu_dominate",
  "hero_prism_illusion": "illu_dominate",
  "hero_veil_illusion": "illu_confuse",
  "hero_glint_illusion": "illu_mirror",
  "hero_misty_illusion": "illu_drain",
  "hero_gunda_warrior": "war_roar",
  "hero_ragna_warrior": "war_cleave",
  "hero_hilda_warrior": "war_rage",
  "hero_freya_warrior": "war_ls",
  "hero_astrid_warrior": "war_finale",
  "hero_bertha_warrior": "war_cleave",
  "hero_kara_warrior": "war_ls",
  "hero_ursa_warrior": "war_rage",
  "hero_dagna_warrior": "war_shatter",
  "hero_serena_mage": "mage_frost",
  "hero_glacia_mage": "mage_bolt",
  "hero_nivea_mage": "mage_fireball",
  "hero_ember_mage": "mage_ignite",
  "hero_crystal_mage": "mage_res",
  "hero_pyra_mage": "mage_res",
  "hero_yuki_mage": "mage_ignite",
  "hero_luna_mage": "mage_frost",
  "hero_hazel_mage": "mage_well",
  "hero_ravenna_dark": "dark_combo",
  "hero_sable_dark": "dark_fade",
  "hero_vespera_dark": "dark_poison",
  "hero_kage_dark": "dark_ambush",
  "hero_dusk_dark": "dark_night",
  "hero_nori_dark": "dark_ambush",
  "hero_sil_dark": "dark_poison",
  "hero_mora_dark": "dark_stealth",
  "hero_pix_dark": "dark_fade",
  "hero_draga_dragon": "dra_awe",
  "hero_scalea_dragon": "dra_blood",
  "hero_terror_dragon": "dra_drag",
  "hero_lava_dragon": "dra_scale",
  "hero_oryn_dragon": "dra_pact",
  "hero_verna_dragon": "dra_pact",
  "hero_ash_dragon": "dra_scale",
  "hero_ridge_dragon": "dra_awe",
  "hero_sol_dragon": "dra_drag"
};
var AB_SKILL_POWER = window.AB_SKILL_POWER = {
  "knight_taunt": "護盾10%HP",
  "knight_solid": "受傷−30%",
  "knight_redarm": "物防+15",
  "knight_counter": "反彈30%",
  "knight_guard": "代受50%",
  "knight_shock": "1.0×＋暈",
  "knight_isolde": "護盾12%HP",
  "knight_last": "回20%HP",
  "war_cleave": "1.8×",
  "war_ls": "回15%HP",
  "war_rage": "攻速+15%",
  "war_shatter": "1.4×破甲",
  "war_skaldi": "2.4×吸血30%",
  "war_rend": "0.2×/秒",
  "war_roar": "攻+15%",
  "war_finale": "2.2×",
  "dra_breath": "1.6×燃",
  "dra_scale": "雙防+20",
  "dra_awe": "攻速−10%",
  "dra_drag": "1.2×拉拽",
  "dra_burst": "1.2×燃爆",
  "dra_blood": "自療10%",
  "dra_wrath": "2.5×燃",
  "dra_pact": "攻+10%攻速+12%",
  "elf_triple": "1.4××3",
  "elf_ele": "1.3×元素",
  "elf_spring": "1.4×治療",
  "elf_gale": "攻速+20%",
  "elf_ley": "1.1×破防",
  "elf_burn": "1.5×燃",
  "elf_tide": "1.3×治療×2",
  "elf_blade": "1.6×",
  "elf_quake": "1.5×暈",
  "elf_storm": "1.4××5",
  "elf_world": "0.8×治療",
  "mage_fireball": "2.1×",
  "mage_ignite": "1.2×燃",
  "mage_frost": "1.3×減速",
  "mage_well": "能量+20",
  "mage_blast": "燃爆",
  "mage_bolt": "1.8××2",
  "mage_meteor": "2.5×",
  "mage_res": "魔傷+5%/元素",
  "illu_bind": "1.0×暈",
  "illu_confuse": "0.9×miss",
  "illu_mirror": "免傷1次",
  "illu_drain": "1.3×偷能",
  "illu_city": "0.9×全體暈",
  "illu_clone": "攻速+15%",
  "illu_nightmare": "1.2×控",
  "illu_dominate": "支配3秒",
  "dark_ambush": "2.1×必爆",
  "dark_poison": "1.3×毒",
  "dark_stealth": "1.2×必爆",
  "dark_fade": "1.1×",
  "dark_combo": "2.1×+0.8×",
  "dark_mark": "1.4×標記",
  "dark_dance": "2.1××3",
  "dark_night": "1.5×暴擊",
  "royal_bless": "1.5×治療",
  "royal_inspire": "能量+10",
  "royal_aura": "0.6×治療",
  "royal_order": "能量+35",
  "royal_light": "1.8×治療",
  "royal_guard": "1.2×治療護盾",
  "royal_arrive": "攻+25%"
};

function isSoldierUnit(u) {
  if (!u || u.mob || u.isMain) return false;
  if (u.pc && (!u.pc.defId || u.pc.basic)) return true;
  if (u.basic) return true;
  if (!u.defId) return true;
  return false;
}

function primaryOf(cls, rarity) {
  var bag = AB_SKILLS[cls]; if (!bag) return null;
  var list = bag[rarity] || bag.N; if (!list || !list.length) return null;
  return list[0];
}

function resolveSkill(u) {
  if (!u) return null;
  var c = C();
  if (u.mob) return null;

  if (u.uniq) {
    var uid = UNIQ_TO_ID[u.uniq.fn];
    var fromPool = uid && BY_ID[uid];
    var byName = BY_NAME[u.uniq.n];
    var USK = c.USK || {};
    var fn = USK[u.uniq.fn];
    if (fromPool || byName) {
      var base = fromPool || byName;
      return { id: base.id, name: u.uniq.n || base.name, rarity: base.rarity, desc: base.desc, fn: fn || base.fn, uniq: true, soldier: false, power: AB_SKILL_POWER[base.id] || '' };
    }
    return { id: u.uniq.fn, name: u.uniq.n, rarity: u.rarity || 'SSR', desc: '', fn: fn, uniq: true, soldier: false, power: (uid && AB_SKILL_POWER[uid]) || '' };
  }

  var soldier = isSoldierUnit(u);
  var rar = soldier ? 'N' : String(u.rarity || 'N').toUpperCase();
  if (rar !== 'N' && rar !== 'R' && rar !== 'SR' && rar !== 'SSR') rar = 'N';

  var def = null;
  if (!soldier && u.defId && AB_HERO_ASSIGN[u.defId] && BY_ID[AB_HERO_ASSIGN[u.defId]]) {
    def = BY_ID[AB_HERO_ASSIGN[u.defId]];
  }
  if (!def) def = primaryOf(u.cls, rar) || primaryOf(u.cls, 'N');
  if (!def) return null;
  return { id: def.id, name: def.name, rarity: def.rarity, desc: def.desc, fn: def.fn, uniq: false, soldier: soldier, power: AB_SKILL_POWER[def.id] || '' };
}
API.resolve = resolveSkill;
API.isSoldier = isSoldierUnit;
API.SOLDIER_MUL = SOLDIER_MUL;
API.primaryOf = primaryOf;
API.assign = AB_HERO_ASSIGN;
API.powerOf = function (id) { return AB_SKILL_POWER[id] || ""; };
API.resolveByDef = function (defId) { var id = AB_HERO_ASSIGN[defId]; return id && BY_ID[id] ? BY_ID[id] : null; };
API.info = function (u) {
  var sk = resolveSkill(u);
  if (!sk) return null;
  var d = sk.desc || '';
  if (sk.power) d += ' <small class="ab-gold">［本體 ' + sk.power + '］</small>';
  if (sk.soldier) d += ' <small class="ab-dim">（士兵 N 級 ×' + SOLDIER_MUL + '）</small>';
  return { n: sk.name, d: d, uniq: !!sk.uniq, id: sk.id, rarity: sk.rarity, soldier: !!sk.soldier, power: sk.power || '' };
};

API.ready = function () { return !!(API.ctx && API.ctx.hurt); };

try { console.log('[ab] skill-pool ab.20261028s：' + Object.keys(BY_ID).length + ' skills / ' + Object.keys(AB_HERO_ASSIGN).length + ' hero assigns'); } catch (e) {}
})();
