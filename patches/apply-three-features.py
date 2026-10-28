#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import hashlib, re, json
from pathlib import Path

ROOT = Path('/workspace/idle-lineage/elf-update')

RELIC_NPC = '{ id: "npc_relic_recycle", n: "遺物回收商人", title: "遺物兌換", type: "exchange", d: "專收多餘遺物的回收商人。以背包中五件未裝備的遺物，兌換你指定類別的遺物箱；開箱後隨機獲得該類遺物一件。已裝備的遺物恕不接受。" }'

RELIC_SPOTS = {
    'town_silver_knight': [48, 68],
    'town_kent_castle': [72, 64],
    'town_windwood_castle': [48, 72],
    'town_heine_castle': [66, 54],
    'town_talking': [55, 70],
    'town_elf': [36, 55],
    'town_gludin': [42, 75],
    'town_gludio': [70, 48],
    'town_heine': [38, 58],
    'town_oren': [70, 58],
    'town_aden': [28, 72],
    'town_elder_council': [40, 62],
    'town_pride': [36, 70],
    'town_ivory_tower': [30, 70],
    'town_witon': [55, 78],
    'town_sherine': [55, 70],
    'town_silent': [48, 72],
    'town_hyperia': [58, 48],
    'town_behemoth': [58, 72],
    'town_flame_audience': [58, 72],
    'town_pirate_village': [62, 42],
}
SKIP_TOWNS = {'town_rift', 'town_giran'}


def md5_10(path: Path) -> str:
    h = hashlib.md5()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()[:10]


def patch_00_data_towns(text: str):
    added = []
    towns_start = text.find('towns:')
    brace = text.find('{', towns_start)
    depth = 0
    towns_end = None
    for i in range(brace, len(text)):
        if text[i] == '{':
            depth += 1
        elif text[i] == '}':
            depth -= 1
            if depth == 0:
                towns_end = i
                break
    head, towns_body, tail = text[:brace+1], text[brace+1:towns_end], text[towns_end:]
    pattern = re.compile(r'("town_[^"]+")\s*:\s*\{', re.M)
    pieces = []
    last = 0
    for m in pattern.finditer(towns_body):
        start = m.start()
        obj_brace = towns_body.find('{', m.end()-1)
        d = 0
        end = None
        for i in range(obj_brace, len(towns_body)):
            if towns_body[i] == '{':
                d += 1
            elif towns_body[i] == '}':
                d -= 1
                if d == 0:
                    end = i + 1
                    break
        pieces.append(towns_body[last:start])
        town_block = towns_body[start:end]
        town_id = m.group(1).strip('"')
        if town_id not in SKIP_TOWNS and 'npc_relic_recycle' not in town_block and not re.search(r'npcs:\s*\[\s*\]', town_block):
            npcs_m = re.search(r'npcs:\s*\[', town_block)
            if npcs_m:
                s0 = npcs_m.end() - 1
                dd = 0
                e0 = None
                for i in range(s0, len(town_block)):
                    if town_block[i] == '[':
                        dd += 1
                    elif town_block[i] == ']':
                        dd -= 1
                        if dd == 0:
                            e0 = i
                            break
                if e0 is not None:
                    arr = town_block[s0+1:e0].rstrip()
                    if arr and not arr.endswith(','):
                        insert = ',\n                ' + RELIC_NPC + '\n            '
                    else:
                        insert = '\n                ' + RELIC_NPC + '\n            '
                    town_block = town_block[:e0] + insert + town_block[e0:]
                    added.append(town_id)
        pieces.append(town_block)
        last = end
    pieces.append(towns_body[last:])
    return head + ''.join(pieces) + tail, added


def patch_town_spots_v2(text: str, added_towns):
    lines = text.splitlines(True)
    out = []
    for line in lines:
        m = re.match(r'^(\s*)(town_[a-z0-9_]+):\s*(\[\[.*?\]\])(.*)$', line)
        if not m:
            out.append(line)
            continue
        indent, tid, arr, rest = m.group(1), m.group(2), m.group(3), m.group(4)
        if tid not in RELIC_SPOTS or tid not in added_towns:
            out.append(line)
            continue
        spot = RELIC_SPOTS[tid]
        spot_s = '[%d, %d]' % (spot[0], spot[1])
        if spot_s in arr:
            out.append(line)
            continue
        new_arr = arr[:-1] + ', ' + spot_s + ']'
        if '遺物回收' not in rest:
            if rest.endswith('\n'):
                core = rest[:-1]
                if '//' in core:
                    rest = core + ' 🏺末位遺物回收商人\n'
                else:
                    rest = '   // 🏺末位遺物回收商人\n'
            else:
                rest = rest + '   // 🏺末位遺物回收商人\n'
        out.append('%s%s: %s%s' % (indent, tid, new_arr, rest if rest.endswith('\n') else rest + '\n'))
    return ''.join(out)


def patch_traditional(path: Path):
    path.write_text('''/**
 * afk-traditional.js — 傳統模式(偽)／自動衝裝
 *
 * 玩家視角：某個角色開了這功能後，「打到的 / 製作的 / 潘朵拉來的 / 開箱的 / 任務的 / 商店買的」裝備
 * 會自帶隨機強化值 +4~+9（含）。手動強化照常可用。每個角色各自開關、隨時可改、只影響之後拿到的。
 *
 * 實作：
 *   - 核心 gainItem 呼叫 window.__afkTradRollEn 決定 _tEn（簽章疊加之前）。
 *   - 本外掛：對「該角色有開 + 可強化裝備(武/防/飾·非箭矢·非遺物)」回傳 4~9 均勻隨機（夾 capEn），
 *     含商店購買（forceNormal 不再擋強化）。其餘一律 0。
 *   - 每角色開關存 localStorage afk_trad_<slot>。
 *
 * 開關：afk-toggles 的 'traditional' ＋ 每存檔位 checkbox。
 */
(function () {
    'use strict';
    if (window.AFK_TOGGLES && !AFK_TOGGLES.enabled('traditional')) return;

    // ── 傳統模式強化：一律隨機 +4~+9（含兩端），再夾到該裝備強化上限 ──────────
    function rnd() { return (typeof lootRng === 'function') ? lootRng('afktraden') : Math.random(); }
    function rollEnhance(d) {
        if (!d) return 0;
        var lvl = 4 + Math.floor(rnd() * 6);   // 4,5,6,7,8,9
        return (typeof capEn === 'function') ? capEn(lvl, d) : Math.min(lvl, 15);
    }

    function slotOf() { return (typeof currentSlot !== 'undefined' && currentSlot != null) ? currentSlot : null; }
    function key(slot) { return 'afk_trad_' + slot; }
    var _onCache = {};
    function isOn(slot) {
        if (slot == null) slot = slotOf();
        if (slot == null) return false;
        if (slot in _onCache) return _onCache[slot];
        try { return (_onCache[slot] = localStorage.getItem(key(slot)) === '1'); } catch (e) { return false; }
    }
    function setOn(slot, on) { try { localStorage.setItem(key(slot), on ? '1' : '0'); } catch (e) {} _onCache[slot] = !!on; }

    // ── 核心鉤子：gainItem 的 _tEn 由這裡決定（含商店 forceNormal）────────────
    window.__afkTradRollEn = function (d, forceNormal, noAffix) {
        if (!isOn()) return 0;
        if (!d) return 0;
        var isEquip = (d.type === 'wpn' && !d.isArrow) || d.type === 'arm' || d.type === 'acc';
        if (!isEquip) return 0;
        if (d.noEnhance) return 0;
        if (typeof isRelic === 'function' && isRelic(d)) return 0;
        return rollEnhance(d);
    };

    window.AFK_TRAD = { isOn: isOn, setOn: setOn, roll: rollEnhance };

    function decorateCards() {
        var grid = document.getElementById('load-slot-grid');
        if (!grid) return;
        var cards = grid.querySelectorAll('.load-slot-card.filled');
        for (var i = 0; i < cards.length; i++) {
            (function (card) {
                var old = card.querySelector('.afk-trad-cb'); if (old) old.remove();
                var slot = parseInt(card.getAttribute('data-slot'), 10);
                if (!slot) return;
                try { if (getComputedStyle(card).position === 'static') card.style.position = 'relative'; } catch (e) {}
                var lab = document.createElement('span');
                lab.className = 'afk-trad-cb';
                lab.title = '傳統模式(偽)：開啟後，取得的裝備（掉落／製作／開箱／任務／商店）自帶隨機強化 +4~+9。隨時可改，只影響之後拿到的裝備。';
                lab.style.cssText = 'position:absolute;top:9%;right:10%;z-index:4;display:flex;align-items:center;gap:3px;padding:2px 5px;border-radius:7px;background:rgba(2,6,23,.78);font-size:.62rem;font-weight:700;color:#e2e8f0;cursor:pointer;text-shadow:0 1px 2px #000;';
                var cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.checked = isOn(slot);
                cb.style.cssText = 'width:13px;height:13px;flex:none;accent-color:#a78bfa;cursor:pointer;margin:0;';
                var txt = document.createElement('span');
                txt.textContent = '傳統';
                lab.appendChild(cb); lab.appendChild(txt);
                lab.addEventListener('click', function (e) {
                    e.stopPropagation();
                    if (e.target !== cb) { cb.checked = !cb.checked; }
                    setOn(slot, cb.checked);
                });
                lab.addEventListener('dblclick', function (e) { e.stopPropagation(); });
                card.appendChild(lab);
            })(cards[i]);
        }
    }
    function wrapRenderLoad() {
        if (typeof window.renderLoadSelect !== 'function' || window.renderLoadSelect.__afkTrad) return false;
        var orig = window.renderLoadSelect;
        var wrapped = function () { orig.apply(this, arguments); try { decorateCards(); } catch (e) {} };
        wrapped.__afkTrad = true;
        window.renderLoadSelect = wrapped;
        return true;
    }
    var okUi = wrapRenderLoad();
    try { console.log('[AFK-traditional] hooks OK — 傳統 +4~+9（含商店）；鉤子 __afkTradRollEn；選角卡 ' + (okUi ? '✓' : '✗')); } catch (e) {}
})();
''', encoding='utf-8')


def write_mob_race_js(path: Path):
    path.write_text(r'''// ========== 🧬 怪物大宗族顯示（raceMajor）==========
// 既有 mob.race 為細分種族／副本陣營標籤，戰鬥加成（raceBonus／raceDr／血盟×2…）仍吃細分值，不可覆寫。
// 本檔在 DB 載入後為每隻怪推導 raceMajor（大宗族），並提供 getMobDisplayName 供戰鬥 UI／日誌統一顯示：死亡騎士(不死族)。

const MOB_RACE_MAJOR_LABELS = {
    undead: '不死族', demon: '惡魔族', humanoid: '人型', animal: '動物',
    dragon: '龍族', spirit: '精靈族', elemental: '元素', insect: '昆蟲',
    plant: '植物', construct: '構造體', demi: '亞人', other: '異界'
};

const MOB_RACE_TO_MAJOR = {
    '不死': 'undead', '殭屍': 'undead', '吸血鬼': 'undead', '巫妖': 'undead', '死神': 'undead', '靈魂': 'undead',
    '惡魔': 'demon', '安普': 'demon', '地獄犬': 'demon', '阿西塔基奧': 'demon',
    '玩家': 'humanoid', '血盟': 'humanoid', '黑騎士': 'humanoid', '強盜': 'humanoid', '法師': 'humanoid',
    '長者': 'humanoid', '長老': 'humanoid', '四色': 'humanoid',
    '動物': 'animal', '野獸': 'animal', '魔狼': 'animal', '鯊魚': 'animal', '鮟鱇': 'animal',
    '螃蟹': 'animal', '寄居蟹': 'animal', '海星': 'animal', '龍龜': 'animal',
    '龍': 'dragon', '飛龍': 'dragon', '不死鳥': 'dragon',
    '精靈': 'spirit', '黑暗妖精': 'spirit', '黑暗精靈': 'spirit', '食人妖精': 'spirit',
    '潘': 'spirit', '獨角獸': 'spirit', '格利芬': 'spirit', '黑暗棲林者': 'spirit', '人魚': 'spirit',
    '元素': 'elemental', '地靈': 'elemental', '鬼火': 'elemental',
    '昆蟲': 'insect', '蜘蛛': 'insect', '螞蟻': 'insect', '蜈蚣': 'insect', '毒蠍': 'insect', '思克巴': 'insect',
    '蘑菇': 'plant', '爆彈花': 'plant', '安特': 'plant',
    '高崙': 'construct', '建築': 'construct', '寶箱': 'construct', '魔法生物': 'construct',
    '妖怪': 'demi', '妖魔': 'demi', '哥布林': 'demi', '歐姆': 'demi', '歐吉': 'demi', '巨人': 'demi',
    '狼人': 'demi', '蜥蜴人': 'demi', '蛇女': 'demi', '牛人': 'demi', '變形怪': 'demi', '眼魔': 'demi',
    '喀瑪': 'demi', '哈維': 'demi', '亞力安': 'demi', '侏儒': 'demi', '多羅': 'demi', '鼠人': 'demi',
    '雪怪': 'demi', '梅杜莎': 'demi', '奇美拉': 'demi', '邪惡蜥蜴': 'demi', '亞人': 'demi',
    '提卡爾': 'demi',
    '拉斯塔巴德': 'demon',
    '異界生物': 'other'
};

function _inferMobRaceMajor(m) {
    if (!m) return 'other';
    if (m.raceMajor && MOB_RACE_MAJOR_LABELS[m.raceMajor]) return m.raceMajor;
    let fine = m.race || '';
    if (MOB_RACE_TO_MAJOR[fine]) return MOB_RACE_TO_MAJOR[fine];
    let n = m.n || '';
    if (fine === '底比斯') {
        if (/曼陀羅|花|草|樹/.test(n)) return 'plant';
        if (/聖甲蟲|凱比斯|蟲|蠍/.test(n)) return 'insect';
        if (/尖碑|石奴|斯芬克斯/.test(n)) return 'construct';
        if (/尼荷斯/.test(n)) return 'humanoid';
        return 'demi';
    }
    if (/龍|飛龍|骨龍|法利昂|安塔瑞斯|巴拉卡斯|林德拜爾/.test(n)) return 'dragon';
    if (/骷髏|屍|亡靈|死|幽|魂|墓|巫妖|吸血鬼|殭屍/.test(n)) return 'undead';
    if (/惡魔|炎魔|小鬼|惡靈|惡夢/.test(n)) return 'demon';
    if (/高崙|石人|活鎧|紙人|密密|機關|魔像/.test(n)) return 'construct';
    if (/蜘蛛|蟻|蟲|蠍|蜈蚣/.test(n)) return 'insect';
    if (/樹|花|蘑菇|安特|曼陀羅/.test(n)) return 'plant';
    if (/元素|水靈|風靈|火靈|地靈|史萊姆/.test(n)) return 'elemental';
    return 'other';
}

function initMobRaceMajors() {
    if (!DB || !DB.mobs) return { tagged: 0, counts: {} };
    let counts = {};
    let tagged = 0;
    Object.keys(DB.mobs).forEach(id => {
        let m = DB.mobs[id];
        if (!m) return;
        let maj = _inferMobRaceMajor(m);
        m.raceMajor = maj;
        tagged++;
        let lab = MOB_RACE_MAJOR_LABELS[maj] || maj;
        counts[lab] = (counts[lab] || 0) + 1;
    });
    try { window.__MOB_RACE_STATS = { tagged: tagged, counts: counts }; } catch (e) {}
    return { tagged: tagged, counts: counts };
}

function getMobRaceMajor(m) {
    if (!m) return null;
    let key = m.raceMajor || _inferMobRaceMajor(m);
    return MOB_RACE_MAJOR_LABELS[key] || null;
}

/** 統一顯示名：死亡騎士(不死族) */
function getMobDisplayName(m) {
    if (!m) return '';
    let base = m.n || '';
    if (!base) return '';
    let lab = getMobRaceMajor(m);
    if (!lab) return base;
    if (base.indexOf('(' + lab + ')') >= 0) return base;
    return base + '(' + lab + ')';
}

try { initMobRaceMajors(); } catch (e) { try { console.warn('[mob-race] init failed', e); } catch (_) {} }
''', encoding='utf-8')


def patch_combat_display(text: str) -> str:
    return re.sub(
        r'(\$\{getMobColor\(([A-Za-z_][A-Za-z0-9_]*)\.lv\)\}">)\$\{\2\.n\}',
        r'\1${getMobDisplayName(\2)}',
        text,
    )


def patch_vfx_name(text: str) -> str:
    lines = text.splitlines(True)
    out = []
    for line in lines:
        if 'getMobNameClass(m)' in line and '${m.n}' in line:
            line = line.replace('title="${m.n}', 'title="${getMobDisplayName(m)')
            if '${_npcClanNameTag}' in line:
                line = line.replace('>${m.n}</span>${_npcClanNameTag}', '>${getMobDisplayName(m)}</span>${_npcClanNameTag}')
            else:
                line = re.sub(r'(getMobNameClass\(m\)[^>]*>)\$\{m\.n\}', r'\1${getMobDisplayName(m)}', line, count=1)
        out.append(line)
    return ''.join(out)


def patch_loot_mob_log(text: str) -> str:
    old = '`${_lootMobInfo.n}`'
    # more precise
    a = '${_lootMobInfo.n}'
    b = "${(typeof getMobDisplayName==='function'?getMobDisplayName(_lootMobInfo):_lootMobInfo.n)}"
    # only in the gain log line
    lines = text.splitlines(True)
    out = []
    for line in lines:
        if 'sys-item-gain' in line and '_lootMobInfo.n' in line:
            line = line.replace(a, b)
        out.append(line)
    return ''.join(out)


def bump_index(index_path: Path, changed_files: dict):
    text = index_path.read_text(encoding='utf-8')
    for rel, ver in changed_files.items():
        pat = re.compile(r'(src=["\']' + re.escape(rel) + r'\?v=)([0-9a-fA-F]+)(["\'])')
        if pat.search(text):
            text = pat.sub(r'\g<1>' + ver + r'\3', text)
        else:
            pat2 = re.compile(r'(src=["\']' + re.escape(rel) + r')(["\'])')
            if pat2.search(text):
                text = pat2.sub(r'\1?v=' + ver + r'\2', text)
            else:
                print('WARN: script tag not found for', rel)
    if '34-mob-race.js' not in text:
        ver = changed_files.get('js/34-mob-race.js', '0000000000')
        text = re.sub(
            r'(<script src="js/00-data\.js\?v=[0-9a-fA-F]+"></script>)',
            r'\1\n    <script src="js/34-mob-race.js?v=' + ver + r'"></script>',
            text,
            count=1,
        )
    else:
        ver = changed_files.get('js/34-mob-race.js', '0000000000')
        text = re.sub(
            r'(src=["\']js/34-mob-race\.js\?v=)([0-9a-fA-F]+)',
            r'\g<1>' + ver,
            text,
        )
    index_path.write_text(text, encoding='utf-8')


def main():
    # Need fresh copies if prior failed mid-way — assume current files OK
    data_path = ROOT / 'js/00-data.js'
    data = data_path.read_text(encoding='utf-8')
    # If already patched from failed run, skip re-add
    data2, added = patch_00_data_towns(data)
    data_path.write_text(data2, encoding='utf-8')
    print('Feature1 towns added:', added)

    wm_path = ROOT / 'js/11-world-map.js'
    wm = wm_path.read_text(encoding='utf-8')
    wm2 = patch_town_spots_v2(wm, set(added))
    wm_path.write_text(wm2, encoding='utf-8')
    print('Feature1 spots done')

    patch_traditional(ROOT / 'afk-traditional.js')
    print('Feature2 done')

    race_path = ROOT / 'js/34-mob-race.js'
    write_mob_race_js(race_path)

    # Ensure combat files present under js/
    for fname in ['03-combat-core.js', '04-combat-attack.js', '09-vfx-render.js', '06-status-allies.js']:
        jp = ROOT / 'js' / fname
        if not jp.exists():
            alt = ROOT / fname
            if alt.exists():
                jp.write_bytes(alt.read_bytes())
                print('copied', fname, 'into js/')

    for fname in ['js/03-combat-core.js', 'js/04-combat-attack.js', 'js/06-status-allies.js', 'js/09-vfx-render.js']:
        p = ROOT / fname
        if not p.exists():
            print('MISSING', fname)
            continue
        t = p.read_text(encoding='utf-8')
        t2 = patch_combat_display(t)
        if fname.endswith('09-vfx-render.js'):
            t2 = patch_vfx_name(t2)
        p.write_text(t2, encoding='utf-8')
        print('display', fname, 'changed' if t2 != t else 'same')

    p8 = ROOT / 'js/08-items-equip.js'
    t8 = p8.read_text(encoding='utf-8')
    p8.write_text(patch_loot_mob_log(t8), encoding='utf-8')

    changed = [
        'js/00-data.js', 'js/11-world-map.js', 'js/33-relic-recycle.js',
        'js/08-items-equip.js', 'js/03-combat-core.js', 'js/04-combat-attack.js',
        'js/09-vfx-render.js', 'js/34-mob-race.js', 'afk-traditional.js'
    ]
    if (ROOT / 'js/06-status-allies.js').exists():
        changed.append('js/06-status-allies.js')
    vers = {rel: md5_10(ROOT / rel) for rel in changed if (ROOT / rel).exists()}
    for k, v in vers.items():
        print(k, v)
    bump_index(ROOT / 'index.html', vers)
    (ROOT / 'patches/report.json').write_text(json.dumps({'towns_added': added, 'versions': vers}, ensure_ascii=False, indent=2), encoding='utf-8')
    print('DONE')

if __name__ == '__main__':
    main()
