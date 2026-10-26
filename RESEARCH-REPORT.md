# Idle Lineage — Elf class update research (read-only)

Project root: `C:\Users\user\Desktop\lingeage\idle-lineage-class-20260825-1924`  
machineId: `5d194dd5-3761-44ca-94be-8ffa499aeafd`  
Copies under: `/workspace/idle-lineage/elf-update/` (hits.txt, deep.txt, slices/)

---

## 0. Class identity

| Field | Value | Where |
|---|---|---|
| class id | `elf` | throughout; CLS maps in afk-history.js:30, afk-dex.js:169, afk-wiki.js:22 |
| Chinese name | `妖精` | same |
| element field | `player.elfEle` ∈ `fire`/`water`/`wind`/`earth` | js/13-shop-save.js:2–7 (`ELF_ELE`), choose at NPC `npc_elion`（艾利溫）Lv≥30 |
| switch cost | `ELF_SWITCH_COST = 500000` | js/13-shop-save.js:8 |
| learn gate key | `reqE` (elf exclusive) + shared mage skills via `reqE` on mage books | js/00-data.js skills; `skillReqLv` js/01-drops-config.js:1267–1289 |
| MAGIC_MASTERY | mastery `e_magic` unlocks mage AoEs `sk_blizzard/tornado/quake/fire_storm` | js/01-drops-config.js:1194,1288 |

**No `reqClass` field** — class gating is `reqE` / `reqM` / `reqK` / `reqD` / etc.

---

## 1. Skill map (Chinese → id → definition → effects)

### 單屬性防禦
| | |
|---|---|
| skill id | `sk_elf_singleres` |
| crystal | `bk_elf_singleres` — `精靈水晶(單屬性防禦)`, p:15000, gachaWeight:0 |
| def | js/00-data.js:**2888** — `{ type:"buff", tier:3, reqE:30, mp:10, dur:64, reqEleAny:true }` |
| crystal def | js/00-data.js:**1731** |
| shop | `npc_linda` list includes `bk_elf_singleres` — js/13-shop-save.js:**207** |
| effect | js/02-stats-recompute.js:**608–614** — while buff active + `p.elfEle`, that element resist **+50** |
| UI label map | js/08-items-equip.js:**1257** |
| VFX/SFX | js/09-vfx-render.js:282; js/17-audio.js:243 |
| wiki | afk-wiki.js:**4542** |
| notes | Needs any chosen attribute (`reqEleAny`). No `d:{}` on skill — effect is hard-coded in recompute. |

### 魔法消除
| | |
|---|---|
| skill id | `sk_elf_magicerase` |
| crystal | `bk_elf_magicerase` — js/00-data.js:**1738**, p:30000, gachaWeight:40 |
| def | js/00-data.js:**2897** — `{ type:"atk", tier:4, reqE:40, mp:30, dmgType:"magic", status:{ kind:"mrhalf", pbase:150, dur:16 } }` |
| cast | js/07-skills-cast.js magic atk branch ~**784+**; pure-status skip-if-already ~**789–794**; `applyMobStatus` |
| ally cast | js/06-status-allies.js `allyCastNonDamage` **1343–1382** (lists 魔法消除) |
| status kind | `mrhalf` — STATUS_NAME「魔抗減半」 js/06:**45** |
| apply | js/06 `applyMobStatus` **66–100**: hit via `abnormalMagicHit` unless `force`; stores `durSec*10` ticks |
| combat effect | js/03-combat-core.js etc. — `effMr = t.st.mrhalf>0 ? t.mr/2 : t.mr`; cleared after taking magic dmg (e.g. js/03:**2492**, **2522**) |
| CD | uses shared attack-skill CD `player.cds.atkSk = getAutoCastInterval(...)` (js/07 ~728/799) — **no skill-specific cd field** |
| UI | appears in `sel-atk-skill` via `type==='atk'` (js/10 `renderSkillSelects` **541–562**) |
| wiki | afk-wiki.js:**4545** |

### 污濁之水（code uses 污濁, never 汚濁）
| | |
|---|---|
| skill id | `sk_elf_muddywater` |
| crystal | `bk_elf_muddywater` — js/00-data.js:**1750**, p:16000, gachaWeight:1 |
| def | js/00-data.js:**2909** — `{ type:"atk", tier:5, reqE:50, mp:20, dmgType:"magic", ele:"water", reqEle:"water", bossOnly:true, status:{ kind:"muddywater", force:true, dur:32 }, ... }` |
| cast gates | bossOnly filter js/07:**786**; skip if already has status **789–794**; ally js/06:**1351**, **1360** |
| effect | js/03-combat-core.js:**803** — boss HP regen ×0.5 while `m.st.muddywater>0` |
| status | `muddywater` in `newMobStatus` js/06:**3**; STATUS_NAME「污濁」 **45** |
| force | skips MR resist (`force:true`) |
| ele gate | `reqEle:"water"` — only water elves |
| drops comment | js/01-drops-config.js:~749 |
| wiki | afk-wiki.js:**4551** |

### 封印禁地
| | |
|---|---|
| skill id | `sk_elf_seal` |
| crystal | `bk_elf_seal` — js/00-data.js:**1749**, p:60000, gachaWeight:10 |
| def | js/00-data.js:**2908** — `{ type:"atk", tier:5, reqE:50, mp:40, dmgType:"magic", reqEleAny:true, status:{ kind:"magicseal", pbase:100, dur:8 } }` |
| status | `magicseal` — STATUS_NAME「魔法封印」; STATUS_MSG「的魔法遭到封印了。」 js/06:**45–47** |
| player blocked by magicseal | js/07 castSkillInner **427–429** |
| ally / UI | same as other pure-status atk skills; siege data references support2Name「封印禁地」 |
| wiki | afk-wiki.js:**4552** |

### Related resist buff (not “全屬性防禦” name)
| Name | id | note |
|---|---|---|
| 屬性防禦 | `sk_elf_eleres` | js/00-data.js:**2883** — all four resists +10 for 1200s; crystal `bk_elf_eleres` **1727** |
| 全屬性防禦 | — | **does not exist** as a skill name |

---

## 2. Crystal item ids for 單屬性防禦

- **Learning item:** `bk_elf_singleres` (`type:"skillbk"`, `sk:"sk_elf_singleres"`)
- Sold by **琳達** `npc_linda` (js/13-shop-save.js:207 shop list)
- Also in crystal block js/00-data.js:1720–1759

---

## 3. Current elf elemental learn/cast restrictions — how to open all

### Selection (one element only)
- NPC `npc_elion` / UI `renderElionUI` / `chooseElfElement` — js/13-shop-save.js:**141–199**
- First pick free at Lv30; switch costs 500k gold
- UI text:「選擇後將解鎖對應的三、四階精靈魔法」

### Gates (must all be updated to open everything)
1. **Cast:** js/07-skills-cast.js:**435–436**  
   `sk.reqEle && player.elfEle !== sk.reqEle` / `sk.reqEleAny && !player.elfEle`
2. **Player skill UI:** js/10-ui-tabs.js:**557–558** (same checks → disabled options)
3. **Item/equip helper:** js/08-items-equip.js:~**737–738** (mirrored)
4. **Mercenary:** `allySkillElementOk` js/06-status-allies.js:**2769–2776**; used by `_allySkillOptions` js/10:**2561**, `allyMaintainBuffs` **2876**, attack path **2663**

### Skills locked by `reqEle` / `reqEleAny` (from js/00-data.js ~2888–2917)

**reqEleAny** (need any attribute):  
`sk_elf_singleres`, `sk_elf_summon`, `sk_elf_summon2`, `sk_elf_seal`

**reqEle fire:**  
`sk_elf_firewpn`, `sk_elf_dancefire`, `sk_elf_blazewpn`, `sk_elf_flamesoul`, `sk_elf_attrfire`, `sk_elf_energyboost`

**reqEle water:**  
`sk_elf_watervital`, `sk_elf_lifespring`, `sk_elf_lifebless`, `sk_elf_muddywater`

**reqEle wind:**  
`sk_elf_windshot`, `sk_elf_winddash`, `sk_elf_stormeye`, `sk_elf_stormshot`, `sk_elf_preciseshot`

**reqEle earth:**  
`sk_elf_earthguard`, `sk_elf_groundtrap`, `sk_elf_earthshield`, `sk_elf_earthbless`, `sk_elf_steelguard`, `sk_elf_physboost`

### Ways to “open all” (design choices)
- **A (minimal):** remove/bypass `reqEle`/`reqEleAny` checks in the 4 gate sites above (and optionally strip flags from skill defs). Singleres still needs a chosen `elfEle` for +50 targeting unless recompute is changed.
- **B (multi-element):** change `player.elfEle` to a set / bitmask; update gates + `chooseElfElement` + singleres recompute.
- **C (grant-all learn):** learning already allows buying any crystal; restriction is **cast/display**, not learn via `skillReqLv` (reqE only). Opening = gate changes, not shop lists.

Wiki quest blurb: afk-wiki.js:**625** (選定屬性魔法 @ 艾利溫).

---

## 4. Party / settings skill select list builders

| UI | Function | File:line | What to update |
|---|---|---|---|
| Player attack/heal/convert + auto-buff checkboxes | `renderSkillSelects()` | js/10-ui-tabs.js:**541+** | Filters by type; **ele gates 557–558** disable options |
| Merc attack/heal/convert dropdowns | `_allySkillOptions(ally, kind, cur)` | js/10-ui-tabs.js:**2552–2570** | Uses `allySkillElementOk`; atk = `type==='atk' && !healSlot` |
| Merc auto-maintain chips | `allyAutoCastableSkills` / `_allyAutoBuffChips` | js/06:**2814+**, js/10:**2574+** | Also filtered by `allySkillElementOk` |
| Squad panel rebuild | `renderSquadPanel` | js/10:**2586+**; skill tab HTML **2653–2660** | sig includes `elfEle` **2608–2609** |
| Setters | `setAllyAtkSkill` / `setAllyHealSkill` / `setAllyAutoBuff` | js/10:**2727+** | |
| afk-skillbar.js | Manual skill quickbar only (`type==='manual'`) | afk-skillbar.js | **Not** the party/settings lists for these skills |

Player selects: `#sel-atk-skill`, `#sel-heal-skill`, `#sel-convert-skill`, `#auto-sk-<sid>`.

---

## 5. Timed buffs + “cannot recast until buff ends”

### Duration model
- Skill `dur` = **seconds**
- Applied: `player.buffs[skId] = sk.dur` (js/07:**954**)
- Tick-down: once per second (`state.ticks % 10 === 0`) js/03-combat-core.js:**711–732** (`player.buffs[k]--`)
- Ally same: js/06:**2863–2868**
- Mob statuses: `applyMobStatus` stores `durSec * 10` ticks (js/06:**77–88**)

### noRefresh pattern (cannot recast while active)
- Flag on skill def: `noRefresh: true`
- Player gate: js/07-skills-cast.js:**940**  
  `if(sk.noRefresh && (player.buffs[skId]||0)>0) return false;`
- Ally maintain: treats any active buff as “already on” — js/06:**2884** `if ((ally.buffs[sid]||0)>0) continue;`
- Examples with `noRefresh`:  
  `sk_elf_watervital`, `sk_elf_flamesoul`, `sk_elf_preciseshot`, `sk_elf_attrfire`, `sk_elf_physboost`, `sk_elf_energyboost` (and dragon awaken `noRefresh` elsewhere)
- Buffs **without** noRefresh still auto-refresh when expired via auto-buff checkboxes; many buffs simply re-cast when `buffs[sid]===0`.
- Pure-status atk skills use “already has status → skip” (js/07:**789–794**) — mirror for debuff-until-ends.

### Mirror recipe for a new timed self-buff
1. Def in js/00-data.js: `type:"buff", dur:<sec>, noRefresh:true` (if needed)
2. Cast path already sets `player.buffs[skId]=sk.dur`
3. Effect in js/02 recompute or combat hooks
4. Optional wiki note in afk-wiki.js SKILL_NOTES

---

## 6. On-attack proc buffs (existing patterns)

### A. Timed buff that modifies normal attacks
| Buff | Hook | Behavior |
|---|---|---|
| `sk_elf_attrfire` | js/04-combat-attack.js:**121** | while buff >0, 30% → dmg×1.5 (same as dark burn) |
| `sk_dark_burn` | js/04:**120** | identical 30% ×1.5 pattern |
| `sk_elf_flamesoul` | js/03-combat-core.js:**2343–2344** | melee weapon roll forced max |
| `sk_elf_preciseshot` | js/03:**2325** | hit roll 1 → hit |

### B. Weapon procs (not class buffs)
- `procStatusSkill: { skId, rate }` → `applyWeaponProcStatusSkill` js/04:**502–509**
- `onHitCastSkill: { skId, cdSec }` → js/04:**268** (`player._onHitCastCd`)
- `procStatus: { kind, rate, dur }` → `applyWeaponProcStatus` js/04:**514–519**

Best mirror for “on-attack proc while buff up”: **attrfire / dark_burn** pattern in `playerAttack` (js/04 ~120–121).

---

## Recommended edit plan (do not implement yet)

**Prefer core `js/0x-*.js`**, not `afk-*.js` patches:
1. **js/00-data.js** — skill/crystal defs, `reqEle`/`reqEleAny`/`dur`/`noRefresh`/`status`
2. **js/07-skills-cast.js** — cast gates, noRefresh, status apply / bossOnly
3. **js/02-stats-recompute.js** — singleres (+ any new resist math)
4. **js/03-combat-core.js** / **js/04-combat-attack.js** — muddywater regen, mrhalf consume, on-hit buff procs
5. **js/06-status-allies.js** — status kinds/names, allyCastNonDamage, allySkillElementOk, maintain
6. **js/10-ui-tabs.js** — `renderSkillSelects` + `_allySkillOptions` display gates
7. **js/13-shop-save.js** — only if changing ELF_ELE multi-select / linda shop
8. **afk-wiki.js** — docs only (SKILL_NOTES ~4536+)
9. **afk-skillbar.js** — irrelevant for these skills (manual only)

`afk-*.js` patch style is appropriate for wiki/UI chrome, **not** for skill combat authority.

---

## Quick ID cheat sheet

```
妖精          class=elf
單屬性防禦    sk_elf_singleres / bk_elf_singleres
魔法消除      sk_elf_magicerase / bk_elf_magicerase  status=mrhalf
污濁之水      sk_elf_muddywater / bk_elf_muddywater  status=muddywater (reqEle water, bossOnly)
封印禁地      sk_elf_seal / bk_elf_seal              status=magicseal
屬性防禦      sk_elf_eleres / bk_elf_eleres          (all-ele +10; not 全屬性防禦)
```
