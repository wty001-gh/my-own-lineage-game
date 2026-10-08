# Sherine Enchant Player ↔ Ally Audit

**Date:** 2026-09-19 (Asia/Taipei)  
**Cache / deploy tag:** `enchaudit.20260919a`  
**GAME_VERSION:** `v3.8.48`  
**Scope:** all `WEAPON_ENCHANT` (`we_*`) + `GEAR_ENCHANT` (`ae_*`) in `js/35-sherine-enchant.js`

## Method

1. Listed every id from `WEAPON_ENCHANT` + `GEAR_ENCHANT`.
2. Mapped each id to helpers in `js/36-sherine-combat.js` (`seApplyStats`, `seOnNormalHit`, `seIncomingDmg`, `seOnDodge`, `seTrySkillProc`, `seOnMagicHit`, `seThornsOnHit`→`seReboundOnHit`, `seTryLastLight`, `seCrystal*`, `seEarthbindOnHit`, `seMirrorOnMagicHit`, `seSkillMutMult`, `seApplyMhpBonus`, `seTryCritFury`, …).
3. Traced call sites:
   - **Player:** `js/02-stats-recompute.js`, `js/03-combat-core.js`, `js/04-combat-attack.js`, `js/07-skills-cast.js`
   - **Ally:** `js/06-status-allies.js` (+ ally dodge/incoming in `js/04-combat-attack.js`; `buildAlly` / `_allyLevelRecompute` → `calcStats` → `seApplyStats`)
4. Classified status (post-fix).

## Status legend

| Status | Meaning |
|--------|---------|
| **OK_BOTH** | Combat/event hook wired for player **and** ally (or helper accepts `who` and both call sites pass it). |
| **STATS_OK** | Effect only via `seApplyStats` / `seApplyMhpBonus`; both player `calcStats` and ally `buildAlly`/`_allyLevelRecompute` call these. |
| **PLAYER_ONLY** | Ally missing hook / wrong caster path (pre-fix). |
| **BROKEN** | Defined but no live combat consumer. |
| **FIXED** | Was PLAYER_ONLY; patched in this audit to mirror player. |

## Summary counts (post-fix)

| Class | Count |
|-------|------:|
| OK_BOTH | 36 |
| STATS_OK | 20 |
| PLAYER_ONLY (remaining) | **0** |
| BROKEN | **0** |
| ALLY_ONLY | 0 |
| **Fixed this pass** | **3** (`we_skillfang`, `we_critfury`, `ae_trail`) |
| **Total enchants** | **59** (15 weapon + 44 gear) |

## Pre-fix PLAYER_ONLY (missing / wrong call site)

| id | Missing / wrong site | Fix |
|----|----------------------|-----|
| `we_skillfang` | `seTrySkillProc` always called `procFreeMagicSkill` (global **player** mag dmg / lifesteal). Ally normal-hit → `seOnNormalHit(…, ally)` did fire, but arrows were player-caster. | Ally branch → `allyProcFreeMagicSkill(who, …)` |
| `we_critfury` | `seTryCritFury` hooked for ally, but aspd refresh only `calcStats()` (player). Ally `ally.d.aspd` stayed stale. | `seRefreshWhoStats(who)` → `_allyLevelRecompute(ally)` |
| `ae_trail` | `seOnDodge(ally, mob)` set `_seTrailUntil` / `_seTrailPct`, but only `calcStats()` — ally aspd never picked up trail until unrelated recompute. | Same `seRefreshWhoStats(who)` |

## Special checks (requested)

| id | Result |
|----|--------|
| `we_skillfang` | **FIXED** — ally uses `allyProcFreeMagicSkill`; player unchanged. Incant-once after fang still uses skillfang tier (unchanged). |
| `we_incant` | **OK_BOTH** — player: cast (`07`) + weapon PROC (`04` `seOnMagicHit(t)`); ally: `allyCastMagic` + `allyWeaponProcs` → `seOnMagicHit(t, ally)`. |
| Weapon PROC → `seOnMagicHit` | **OK_BOTH** (see above). |
| `ae_windcut` | **OK_BOTH** — `seOnDodge(who, mob)` with mob; player dodge + ally dodge both pass mob. |
| `ae_stomp` | **OK_BOTH** — inside `seEarthbindOnHit`; player + ally incoming phys both call it. |
| `ae_secondwind` | **OK_BOTH** — inside `seIncomingDmg`; phys/magic player + ally. |
| `ae_trail` | **FIXED** — dodge hook both; aspd refresh now ally-aware. |
| `ae_rebound` | **OK_BOTH** — `seThornsOnHit` → `seReboundOnHit`; player + ally. |
| `ae_lifetap` / `ae_bloodlet` | **OK_BOTH** — `seOnNormalHit`; player + ally. |
| `ae_mut_heal` / `ae_mut_shield` | **OK_BOTH** — `seSkillMutMult` / `seStampMutShield` / `seMutShieldBoost` with caster; heal via `rollHealingSpell`; ally heal/buff paths stamp. |
| `ae_beltbulk` | **STATS_OK** — `seApplyMhpBonus` in `calcStats` / ally recompute. |
| `ae_crystal` | **OK_BOTH** — `seCrystalTick` ticks player + all allies; absorb via `seIncomingDmg(…, who)`. |

## Full table

### WEAPON_ENCHANT (`we_*`)

| id | Primary impl | Player call site(s) | Ally call site(s) | Status |
|----|--------------|---------------------|-------------------|--------|
| `we_pierce` | `seApplyStats` → `seIgnHardSkin` / `seHardSkinMult` | `03` `getPhysicalDmg` | `06` ally strike / rapid | OK_BOTH |
| `we_undead` | `seApplyStats` → `seUndeadTier` | `03` fixed undead/wolf | `06` ally fixed | OK_BOTH |
| `we_drain` | `seOnNormalHit` | `04` after hit | `06` after hit | OK_BOTH |
| `we_hpleech` | `seOnNormalHit` | `04` | `06` | OK_BOTH |
| `we_mpdrain` | `seOnNormalHit` | `04` | `06` | OK_BOTH |
| `we_sunder` | `seOnNormalHit` | `04` | `06` | OK_BOTH |
| `we_execute` | `seApplyStats` → `seExecuteAmp` | `03` low-HP amp | `06` allyStrikeRoll | OK_BOTH |
| `we_incant` | `seOnMagicHit` | `07` cast; `04` weapon PROC | `06` cast + weapon PROC | OK_BOTH |
| `we_lethal` | `seApplyStats` crit | `02` calcStats | `06` buildAlly recompute | STATS_OK |
| `we_dualhit` | `seApplyStats` → `seDblStrike*` | `03` | `06` allyStrikeRoll | OK_BOTH |
| `we_elechase` | `seOnNormalHit` | `04` | `06` | OK_BOTH |
| `we_warhex` | `seOnNormalHit` | `04` | `06` | OK_BOTH |
| `we_skillfang` | `seTrySkillProc` ← `seOnNormalHit` | `04` → `procFreeMagicSkill` | `06` → **`allyProcFreeMagicSkill`** | **FIXED** → OK_BOTH |
| `we_enhance` | `seApplyStats` → `seEnhanceFlat` | `03` fixed | `06` fixed | OK_BOTH |
| `we_critfury` | `seTryCritFury` + `seCritFuryAspdBonus` | `04` crit path + `02` aspd | `06` crit + **`_allyLevelRecompute`** | **FIXED** → OK_BOTH |

### GEAR_ENCHANT (`ae_*`)

| id | Primary impl | Player | Ally | Status |
|----|--------------|--------|------|--------|
| `ae_thorns` | `seThornsOnHit` | `04` phys in | `04` ally phys in | OK_BOTH |
| `ae_aegis` | `seApplyStats` `crushDr` | `04` crush | `04` ally crush | STATS_OK |
| `ae_crystal` | `seCrystalTick` / `seIncomingDmg` | tick + absorb | tick all allies + absorb | OK_BOTH |
| `ae_lastlight` | `seTryLastLight` | `04` death | `04` ally death / magic | OK_BOTH |
| `ae_ironhide` | `seIncomingDmg` (phys %) | `04` | `04` | OK_BOTH |
| `ae_hpregen` | `seApplyStats` `hpR` | `02` | ally recompute | STATS_OK |
| `ae_fortify` | `seApplyStats` AC | `02` | ally recompute | STATS_OK |
| `ae_vitalplate` | `seApplyMhpBonus` | `02` | ally recompute | STATS_OK |
| `ae_secondwind` | `seIncomingDmg` | `04` | `04` | OK_BOTH |
| `ae_veil` | `seIncomingDmg` magic | `04` | `04` | OK_BOTH |
| `ae_ward` | `seApplyStats` elem res | `02` | ally recompute | STATS_OK |
| `ae_ghoststep` | `seOnDodge` | `04` dodge | `04` ally dodge | OK_BOTH |
| `ae_shadowcloak` | `seApplyStats` ER | `02` | ally recompute | STATS_OK |
| `ae_manaweave` | `seApplyStats` `mpR` | `02` | ally recompute | STATS_OK |
| `ae_windcut` | `seOnDodge(who, mob)` | `04` | `04` | OK_BOTH |
| `ae_mut_heal` | `seSkillMutMult` / `rollHealingSpell` | `03`/`07` | `06` heal | OK_BOTH |
| `ae_mut_shield` | `seStampMutShield` / boost | `07`/`02` | `06` buff stamp | OK_BOTH |
| `ae_clarity` | `seApplyStats` MR | `02` | ally recompute | STATS_OK |
| `ae_focus` | `seApplyStats` magic hit | `02` | ally recompute | STATS_OK |
| `ae_mindveil` | `seIncomingDmg` magic | `04` | `04` | OK_BOTH |
| `ae_glovehit` | `seOnNormalHit` | `04` | `06` | OK_BOTH |
| `ae_grip` | `seApplyStats` melee hit | `02` | ally recompute | STATS_OK |
| `ae_fistvine` | `seOnNormalHit` | `04` | `06` | OK_BOTH |
| `ae_razor` | `seApplyStats` crit | `02` | ally recompute | STATS_OK |
| `ae_puncture` | `seOnNormalHit` | `04` | `06` | OK_BOTH |
| `ae_bloodlet` | `seOnNormalHit` | `04` | `06` | OK_BOTH |
| `ae_bootpace` | `seApplyStats` aspd % | `02` | ally recompute | STATS_OK |
| `ae_quickstep` | `seApplyStats` ER | `02` | ally recompute | STATS_OK |
| `ae_earthbind` | `seEarthbindOnHit` | `04` | `04` | OK_BOTH |
| `ae_sprint` | `seApplyStats` aspd % | `02` | ally recompute | STATS_OK |
| `ae_stomp` | `seEarthbindOnHit` | `04` | `04` | OK_BOTH |
| `ae_trail` | `seOnDodge` + aspd refresh | `04` + `calcStats` | `04` + **`_allyLevelRecompute`** | **FIXED** → OK_BOTH |
| `ae_bulwark` | `seApplyStats` DR | `02` | ally recompute | STATS_OK |
| `ae_mirror` | `seMirrorOnMagicHit` | `04` magic in | `04` ally magic in | OK_BOTH |
| `ae_guardheal` | `seIncomingDmg` | `04` | `04` | OK_BOTH |
| `ae_parry` | `seIncomingDmg` phys | `04` | `04` | OK_BOTH |
| `ae_bastion` | `seApplyStats` DR (w/ shield) | `02` | ally recompute | STATS_OK |
| `ae_rebound` | `seReboundOnHit` via thorns | `04` | `04` | OK_BOTH |
| `ae_bloodring` | `seIncomingDmg` | `04` | `04` | OK_BOTH |
| `ae_beltbulk` | `seApplyMhpBonus` | `02` | ally recompute | STATS_OK |
| `ae_mpregen` | `seApplyStats` `mpR` | `02` | ally recompute | STATS_OK |
| `ae_charmhit` | `seApplyStats` hit | `02` | ally recompute | STATS_OK |
| `ae_soulwell` | `seApplyStats` MMP | `02` | ally recompute | STATS_OK |
| `ae_lifetap` | `seOnNormalHit` | `04` | `06` | OK_BOTH |

## Notes

- `d.sePhysDr` is written for `ae_ironhide` in `seApplyStats` but combat reduction uses `seTier('ae_ironhide')` inside `seIncomingDmg` — not dead; flag is unused leftover, effect is live.
- Balance numbers were **not** changed; only wiring / refresh targets.
- New helper: `seRefreshWhoStats(who)` — ally → `_allyLevelRecompute`, else `calcStats`.

## Files patched

- `js/36-sherine-combat.js` — skillfang ally proc; trail/critfury refresh; `seRefreshWhoStats`
- `js/00-data.js` — `GAME_VERSION` → `v3.8.48`
- `index.html` / `index-pc.html` — cache `enchaudit.20260919a` on `00-data.js`, `35-sherine-enchant.js`, `36-sherine-combat.js`
- `docs/ENCHANT-PLAYER-ALLY-AUDIT.md` — this report
- `work/enchaudit-20260919a-deploy/DEPLOY.txt`

**Deploy needed:** yes.
