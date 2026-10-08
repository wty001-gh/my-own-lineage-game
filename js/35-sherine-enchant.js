// ========== 🔮 席琳附魔（席琳神殿・克洛托）==========
// 武器：抽取 T1 → 材料升級 T2/T3；效果吃武器 +en；最多 2 條。
// 防具／飾品：分部位池；最多 2 條；效果吃裝備 +en（弱過武器）。
// 巨靈抽獎（gw）仍經克洛托。

const SHERINE_ENCH_MAX_WPN = 2;
const SHERINE_ENCH_MAX_ARM = 2;
const SHERINE_ENCH_COST_DRAW = 3;
const SHERINE_ENCH_COST_REROLL = 2;
const SHERINE_ENCH_COST_GW_DRAW = 2;
const SHERINE_ENCH_COST_GW = 1;
const SHERINE_ENCH_GW_POOL = ['str1', 'dex1', 'int1'];
const SHERINE_ENCH_MAX = SHERINE_ENCH_MAX_WPN; // 相容舊常數（武器為主）

const WE_UPGRADE_COST = {
    2: { crystal: 10, mad: 0, cor: 0, gold: 50000 },
    3: { crystal: 50, mad: 1, cor: 2, gold: 200000 }
};
const AE_UPGRADE_COST = {
    2: { crystal: 8, mad: 0, cor: 0, gold: 40000 },
    3: { crystal: 40, mad: 1, cor: 1, gold: 150000 }
};

// ---- 武器附魔定義（質變池）----
// tierVals[0]=T1 …；desc(t, en) 動態說明
const WEAPON_ENCHANT = {
    we_pierce: {
        n: '貫穿', slot: 'wpn',
        d: '一般攻擊無視硬皮額外減傷；高階對硬皮目標增傷',
        tags: ['pierce'],
        desc(t) {
            if (t >= 3) return '無視硬皮減傷；對有硬皮目標傷害 ×1.25';
            if (t >= 2) return '無視硬皮減傷；對有硬皮目標傷害 ×1.15';
            return '無視硬皮額外減傷';
        }
    },
    we_undead: {
        n: '滅魂', slot: 'wpn',
        d: '對不死／狼人追加骰傷（隨階與強化）',
        tags: ['undead'],
        desc(t, en) {
            let dice = t >= 3 ? '2D20' : (t >= 2 ? '1D20' : '1D10');
            let bonus = Math.min(10, Math.floor((en || 0) / 2));
            return `對不死／狼人 +${dice}${bonus ? `，另 +${bonus}（強化）` : ''}`;
        }
    },
    we_drain: {
        n: '噬魂', slot: 'wpn',
        d: '一般攻擊吸血（隨階；高強化加成）',
        tags: ['vamp'],
        desc(t, en) {
            let pct = t >= 3 ? 7 : (t >= 2 ? 5 : 3);
            if ((en || 0) >= 7) pct = Math.min(10, pct + 3);
            return `一般攻擊吸血 ${pct}%`;
        }
    },
    we_hpleech: {
        n: '汲血', slot: 'wpn',
        d: '命中恢復固定 HP（與噬魂可並存）',
        tags: ['hp'],
        desc(t, en) {
            let base = t >= 3 ? 22 : (t >= 2 ? 14 : 8);
            return `命中恢復 ${base + Math.floor((en || 0) / 3)} HP`;
        }
    },
    we_mpdrain: {
        n: '魔汲', slot: 'wpn',
        d: '命中恢復 MP（突破安定後再加）',
        tags: ['mp'],
        desc(t, en) {
            let base = t >= 3 ? 6 : (t >= 2 ? 4 : 2);
            let extra = Math.max(0, (en || 0) - 6);
            return `命中恢復 ${base + extra} MP`;
        }
    },
    we_sunder: {
        n: '裂甲', slot: 'wpn',
        d: '命中附加裂甲：目標受傷 +10%，5 秒',
        tags: ['status'],
        desc(t) {
            let r = t >= 3 ? 16 : (t >= 2 ? 12 : 8);
            return `命中 ${r}% 附加裂甲（受傷 +10%，5 秒）`;
        }
    },
    we_execute: {
        n: '處刑', slot: 'wpn',
        d: '目標 HP 低於 20% 時傷害增幅',
        tags: ['execute'],
        desc(t) {
            let pct = t >= 3 ? 25 : (t >= 2 ? 20 : 15);
            return `目標 HP＜20% 最大時，傷害 +${pct}%`;
        }
    },
    we_incant: {
        n: '咒言', slot: 'wpn',
        d: '魔法命中時隨機異常（玩家可施加之魔物狀態）',
        tags: ['magic'],
        desc(t) {
            let r = t >= 3 ? 20 : (t >= 2 ? 15 : 10);
            return `魔法命中 ${r}% 隨機：封印／木乃伊／壞物／弱化／疾病`;
        }
    },
    we_lethal: {
        n: '致命', slot: 'wpn',
        d: '爆擊機率提升',
        tags: ['crit'],
        desc(t) {
            let v = t >= 3 ? 10 : (t >= 2 ? 5 : 3);
            return `爆擊機率 +${v}%`;
        }
    },
    we_dualhit: {
        n: '追擊', slot: 'wpn',
        d: '普攻最終傷害 ×1.5 機率（有帽）',
        tags: ['dual'],
        desc(t, en) {
            let r = t >= 3 ? 7 : (t >= 2 ? 5 : 3);
            if ((en || 0) >= 10) r = Math.min(10, r + 3);
            return `一般攻擊 ${r}% 最終傷害 ×1.5`;
        }
    },
    we_elechase: {
        n: '屬追', slot: 'wpn',
        d: '命中追擊：用武器當前屬性（無則火）固傷',
        tags: ['ele'],
        desc(t, en) {
            let dmg = (t >= 3 ? 50 : (t >= 2 ? 35 : 20)) + (en || 0);
            let r = t >= 3 ? 15 : (t >= 2 ? 12 : 10);
            return `命中 ${r}% 追擊 ${dmg} 武器屬性固傷（無屬性→火）`;
        }
    },
    we_warhex: {
        n: '戰咒', slot: 'wpn',
        d: '近戰命中暈／緩／麻',
        tags: ['status'],
        desc(t) {
            let r = t >= 3 ? 16 : (t >= 2 ? 12 : 8);
            return `命中 ${r}% 隨機：擊暈／緩速／麻痺`;
        }
    },
    we_skillfang: {
        n: '附咒・元素矢', slot: 'wpn',
        d: '命中同時免費施放火箭＋地獄之牙＋冰箭＋風刃，並同時判定一次咒言（封印／木乃伊／壞物／弱化／疾病）',
        tags: ['proc'],
        skills: ['sk_firearrow', 'sk_hell_fang', 'sk_icearrow', 'sk_windblade'],
        desc(t) {
            let r = t >= 3 ? 9 : (t >= 2 ? 7 : 5);
            let ir = t >= 3 ? 20 : (t >= 2 ? 15 : 10);
            return `命中 ${r}% 同時施放「火箭＋地獄之牙＋冰箭＋風刃」，並以本附魔階同時判定一次咒言（${ir}%：封印／木乃伊／壞物／弱化／疾病）`;
        }
    },
    we_enhance: {
        n: '鍛魂', slot: 'wpn',
        d: '普攻固定傷害隨武器強化成長',
        tags: ['en'],
        desc(t, en) {
            let mult = t >= 3 ? 3 : (t >= 2 ? 2 : 1);
            let enCap = (typeof capWpnEn === 'function') ? capWpnEn(en || 0) : (en || 0);
            return `一般攻擊固定傷 +${enCap * mult}（強化×${mult}）`;
        }
    },
    we_critfury: {
        n: '狂怒', slot: 'wpn',
        d: '爆擊或重擊／粉碎後短時攻速上升',
        tags: ['fury'],
        desc(t) {
            let pct = t >= 3 ? 35 : (t >= 2 ? 25 : 15);
            let sec = t >= 3 ? 5 : (t >= 2 ? 4 : 3);
            return `爆擊或重擊／粉碎後攻速 +${pct}%，${sec} 秒`;
        }
    }
};

// ---- 防具／飾品附魔（質變池・分部位）----
// 分組：ARMOR / CLOAK / HELM / HAND / FEET / SHIELD / ACCESSORY（各槽獨池・唔共用）
// 頭盔只抽 HELM；斗篷只抽 CLOAK；身體甲只抽 ARMOR
const GEAR_ENCHANT = {
    // ---- ARMOR（身體甲・生存）----
    ae_thorns: {
        n: '棘刺', groups: ['ARMOR'],
        d: '受擊反彈固定傷害（反傷唔會再反彈）',
        desc(t, en) {
            let base = t >= 3 ? 28 : (t >= 2 ? 18 : 10);
            return `受擊反彈 ${base + Math.floor((en || 0) / 2)} 點傷害`;
        }
    },
    ae_aegis: {
        n: '堅壁', groups: ['ARMOR'],
        d: '受到重擊傷害減免',
        desc(t) {
            let v = t >= 3 ? 30 : (t >= 2 ? 22 : 15);
            return `重擊傷害 -${v}%`;
        }
    },
    ae_crystal: {
        n: '結晶', groups: ['ARMOR'],
        d: '週期獲得最大 HP 比例護盾',
        desc(t) {
            let pct = t >= 3 ? 16 : (t >= 2 ? 12 : 8);
            let sec = t >= 3 ? 45 : (t >= 2 ? 50 : 60);
            return `每 ${sec} 秒獲得最大 HP ${pct}% 護盾`;
        }
    },
    ae_lastlight: {
        n: '殘光', groups: ['ARMOR'],
        d: '致命傷害改為剩 1 HP（長冷卻）',
        desc(t) {
            let min = t >= 3 ? 6 : (t >= 2 ? 8 : 10);
            return `致命傷害改為剩 1 HP（${min} 分鐘冷卻）`;
        }
    },
    ae_ironhide: {
        n: '鐵膚', groups: ['ARMOR'],
        d: '受到的物理傷害小幅減免',
        desc(t) {
            let v = t >= 3 ? 8 : (t >= 2 ? 5 : 3);
            return `受到的物理傷害 -${v}%`;
        }
    },
    ae_hpregen: {
        n: '癒息', groups: ['ARMOR'],
        d: 'HP 自然恢復提升',
        desc(t, en) {
            let v = (t >= 3 ? 8 : (t >= 2 ? 5 : 3)) + Math.floor((en || 0) / 4);
            return `HP 自然恢復 +${v}`;
        }
    },
    ae_fortify: {
        n: '固甲', groups: ['ARMOR'],
        d: '防禦（AC）提升',
        desc(t) {
            let v = t >= 3 ? 3 : (t >= 2 ? 2 : 1);
            return `AC -${v}（更好）`;
        }
    },
    ae_vitalplate: {
        n: '命胄', groups: ['ARMOR'],
        d: '最大 HP 固定提升（隨強化）',
        desc(t, en) {
            let base = t >= 3 ? 100 : (t >= 2 ? 60 : 30);
            return `最大 HP +${base + ((en || 0) * 2)}`;
        }
    },
    ae_secondwind: {
        n: '回氣', groups: ['ARMOR'],
        d: '受擊後短冷卻恢復最大 HP 比例',
        desc(t) {
            let pct = t >= 3 ? 8 : (t >= 2 ? 5 : 3);
            return `受擊時恢復最大 HP ${pct}%（30 秒冷卻）`;
        }
    },
    // ---- CLOAK（斗篷・軟防／魔御）----
    ae_veil: {
        n: '魔幕', groups: ['CLOAK'],
        d: '受到的魔法傷害減免',
        desc(t) {
            let v = t >= 3 ? 14 : (t >= 2 ? 10 : 6);
            return `受到的魔法傷害 -${v}%`;
        }
    },
    ae_ward: {
        n: '四禦', groups: ['CLOAK'],
        d: '全屬性抗性提升',
        desc(t, en) {
            let v = (t >= 3 ? 8 : (t >= 2 ? 5 : 3)) + Math.floor((en || 0) / 5);
            return `火／水／風／地抗性 +${v}`;
        }
    },
    ae_ghoststep: {
        n: '殘影', groups: ['CLOAK'],
        d: '迴避後恢復 HP／MP',
        desc(t, en) {
            let hp = (t >= 3 ? 90 : (t >= 2 ? 70 : 50)) + Math.floor((en || 0) / 2);
            let mp = t >= 3 ? 18 : (t >= 2 ? 14 : 10);
            return `迴避後恢復 ${hp} HP、${mp} MP`;
        }
    },
    ae_shadowcloak: {
        n: '影披', groups: ['CLOAK'],
        d: '迴避（ER）提升',
        desc(t, en) {
            let v = (t >= 3 ? 8 : (t >= 2 ? 5 : 3)) + Math.floor((en || 0) / 5);
            return `ER +${v}`;
        }
    },
    ae_manaweave: {
        n: '魔力織', groups: ['CLOAK'],
        d: 'MP 自然恢復提升',
        desc(t, en) {
            let v = (t >= 3 ? 5 : (t >= 2 ? 3 : 2)) + Math.floor((en || 0) / 5);
            return `MP 自然恢復 +${v}`;
        }
    },
    ae_windcut: {
        n: '風刃披', groups: ['CLOAK'],
        d: '迴避時對攻擊者造成固定傷害',
        desc(t, en) {
            let v = (t >= 3 ? 40 : (t >= 2 ? 25 : 15)) + Math.floor((en || 0) / 2);
            return `迴避時對攻擊者造成 ${v} 點傷害`;
        }
    },
    // ---- HELM（專注／施法技變）----
    ae_mut_heal: {
        n: '癒變', groups: ['HELM'],
        d: '裝備者施放的回血魔法效果提升（技變）',
        mutAllHeals: true,
        mutSkills: ['sk_heal1', 'sk_heal_mid', 'sk_heal2', 'sk_regen', 'sk_full_heal', 'sk_elf_lifespring', 'sk_elf_lifebless', 'sk_helm_heal1', 'sk_helm_heal2'],
        desc(t) {
            let pct = t >= 3 ? 18 : (t >= 2 ? 12 : 8);
            return `裝備者施放的回血魔法效果提升 +${pct}%（含對隊友）；不含他人對你施放`;
        }
    },
    ae_mut_shield: {
        n: '護變', groups: ['HELM'],
        d: '裝備者施放、影響 AC／MR 的增益效果提升（技變）',
        mutAllAcMr: true,
        mutSkills: ['sk_holy_barrier'],
        desc(t) {
            let pct = t >= 3 ? 20 : (t >= 2 ? 14 : 8);
            return `裝備者施放、凡影響 AC 或 MR 的增益技效果 +${pct}%（含對隊友；AC／MR 用 ceil；聖結界減傷一併加強）；不含他人對你施放`;
        }
    },
    ae_clarity: {
        n: '澄心', groups: ['HELM'],
        d: '魔法防禦（MR）提升',
        desc(t, en) {
            let v = (t >= 3 ? 8 : (t >= 2 ? 5 : 3)) + Math.floor((en || 0) / 5);
            return `MR +${v}`;
        }
    },
    ae_focus: {
        n: '凝神', groups: ['HELM'],
        d: '魔法命中提升',
        desc(t, en) {
            let v = (t >= 3 ? 6 : (t >= 2 ? 4 : 2)) + Math.floor((en || 0) / 5);
            return `魔法命中 +${v}`;
        }
    },
    ae_mindveil: {
        n: '心幕', groups: ['HELM'],
        d: '受到的魔法傷害小幅減免（可與魔幕並存）',
        desc(t) {
            let v = t >= 3 ? 8 : (t >= 2 ? 5 : 3);
            return `受到的魔法傷害 -${v}%`;
        }
    },
    // ---- HAND（輔助輸出）----
    ae_glovehit: {
        n: '連截', groups: ['HAND'],
        d: '普攻小機率追加一段弱傷害（弱過武器追擊）',
        desc(t, en) {
            let r = t >= 3 ? 8 : (t >= 2 ? 6 : 4);
            let pct = t >= 3 ? 35 : (t >= 2 ? 28 : 20);
            if ((en || 0) >= 10) r = Math.min(10, r + 2);
            return `一般攻擊 ${r}% 追加最終傷害 ×${(pct / 100).toFixed(2)}`;
        }
    },
    ae_grip: {
        n: '固握', groups: ['HAND'],
        d: '近戰命中小幅提升',
        desc(t, en) {
            let v = (t >= 3 ? 6 : (t >= 2 ? 4 : 2)) + Math.floor((en || 0) / 5);
            return `近距離命中 +${v}`;
        }
    },
    ae_fistvine: {
        n: '蔓拳', groups: ['HAND'],
        d: '命中附加微量固定傷害',
        desc(t, en) {
            let v = (t >= 3 ? 12 : (t >= 2 ? 8 : 4)) + Math.floor((en || 0) / 2);
            return `命中追加 ${v} 固定傷害`;
        }
    },
    ae_razor: {
        n: '利刃', groups: ['HAND'],
        d: '近／遠爆擊機率小幅提升',
        desc(t) {
            let v = t >= 3 ? 4 : (t >= 2 ? 2 : 1);
            return `近距離／遠距離爆擊 +${v}%`;
        }
    },
    ae_puncture: {
        n: '穿刺', groups: ['HAND'],
        d: '命中小機率附加裂甲（弱於武器裂甲）',
        desc(t) {
            let r = t >= 3 ? 16 : (t >= 2 ? 12 : 8);
            return `一般攻擊 ${r}% 附加裂甲 5 秒`;
        }
    },
    ae_bloodlet: {
        n: '放血', groups: ['HAND'],
        d: '命中吸取微量生命（弱於噬魂）',
        desc(t) {
            let pct = t >= 3 ? 3 : (t >= 2 ? 2 : 1);
            return `一般攻擊吸血 ${pct}%`;
        }
    },
    // ---- FEET（機動）----
    ae_bootpace: {
        n: '疾步', groups: ['FEET'],
        d: '攻擊速度小幅提升',
        desc(t) {
            let v = t >= 3 ? 8 : (t >= 2 ? 5 : 3);
            return `攻擊速度 +${v}%`;
        }
    },
    ae_quickstep: {
        n: '輕步', groups: ['FEET'],
        d: '迴避（ER）提升',
        desc(t, en) {
            let v = (t >= 3 ? 6 : (t >= 2 ? 4 : 2)) + Math.floor((en || 0) / 5);
            return `ER +${v}`;
        }
    },
    ae_earthbind: {
        n: '踏地', groups: ['FEET'],
        d: '受擊時小機率緩速攻擊者',
        desc(t) {
            let r = t >= 3 ? 12 : (t >= 2 ? 8 : 5);
            return `受擊 ${r}% 對攻擊者施加緩速 8 秒`;
        }
    },
    ae_sprint: {
        n: '衝刺', groups: ['FEET'],
        d: '攻擊速度小幅提升（可與疾步並存）',
        desc(t) {
            let v = t >= 3 ? 6 : (t >= 2 ? 4 : 2);
            return `攻擊速度 +${v}%`;
        }
    },
    ae_stomp: {
        n: '震踏', groups: ['FEET'],
        d: '受擊時小機率擊暈攻擊者',
        desc(t) {
            let r = t >= 3 ? 12 : (t >= 2 ? 8 : 5);
            return `受擊 ${r}% 對攻擊者擊暈 2 秒`;
        }
    },
    ae_trail: {
        n: '殘跡', groups: ['FEET'],
        d: '迴避後短時攻擊速度上升',
        desc(t) {
            let pct = t >= 3 ? 20 : (t >= 2 ? 15 : 10);
            return `迴避後攻速 +${pct}%（3 秒）`;
        }
    },
    // ---- SHIELD ----
    ae_bulwark: {
        n: '壁壘', groups: ['SHIELD'],
        d: '傷害減免（DR）提升',
        desc(t, en) {
            let v = t >= 3 ? 4 : (t >= 2 ? 3 : 2);
            if ((en || 0) >= 10) v += 1;
            return `傷害減免 +${v}`;
        }
    },
    ae_mirror: {
        n: '鏡盾', groups: ['SHIELD'],
        d: '受魔法傷害時反彈固定傷害',
        desc(t, en) {
            let base = (t >= 3 ? 24 : (t >= 2 ? 16 : 10)) + Math.floor((en || 0) / 2);
            return `受魔法傷害時反彈 ${base} 點`;
        }
    },
    ae_guardheal: {
        n: '守癒', groups: ['SHIELD'],
        d: '受擊恢復少量 HP',
        desc(t, en) {
            let v = (t >= 3 ? 14 : (t >= 2 ? 9 : 5)) + Math.floor((en || 0) / 3);
            return `受擊恢復 ${v} HP`;
        }
    },
    ae_parry: {
        n: '格擋', groups: ['SHIELD'],
        d: '受到的物理傷害小幅減免',
        desc(t) {
            let v = t >= 3 ? 8 : (t >= 2 ? 5 : 3);
            return `受到的物理傷害 -${v}%`;
        }
    },
    ae_bastion: {
        n: '堡壘', groups: ['SHIELD'],
        d: '裝備盾牌時傷害減免提升',
        desc(t) {
            let v = t >= 3 ? 3 : (t >= 2 ? 2 : 1);
            return `裝備盾牌時 DR +${v}`;
        }
    },
    ae_rebound: {
        n: '反震', groups: ['SHIELD'],
        d: '受物理傷害時小機率反彈（弱於棘刺）',
        desc(t, en) {
            let r = t >= 3 ? 16 : (t >= 2 ? 12 : 8);
            let flat = (t >= 3 ? 22 : (t >= 2 ? 14 : 8)) + Math.floor((en || 0) / 2);
            return `受物理 ${r}% 反彈 ${flat} 點`;
        }
    },
    // ---- ACCESSORY ----
    ae_bloodring: {
        n: '血戒', groups: ['ACCESSORY'],
        d: '受擊時吸取微量生命',
        desc(t) {
            let pct = t >= 3 ? 4 : (t >= 2 ? 3 : 2);
            return `受擊吸取所受傷 ${pct}% 為 HP`;
        }
    },
    ae_beltbulk: {
        n: '厚帶', groups: ['ACCESSORY'],
        d: '最大 HP 百分比提升（隨強化）',
        desc(t, en) {
            let pct = (t >= 3 ? 10 : (t >= 2 ? 8 : 5)) + Math.floor((en || 0) / 2);
            if (pct > 20) pct = 20;
            return `最大 HP +${pct}%（上限 20%；含強化 ⌊en/2⌋%）`;
        }
    },
    ae_mpregen: {
        n: '魔息', groups: ['ACCESSORY'],
        d: 'MP 自然恢復提升',
        desc(t, en) {
            let v = (t >= 3 ? 5 : (t >= 2 ? 3 : 2)) + Math.floor((en || 0) / 5);
            return `MP 自然恢復 +${v}`;
        }
    },
    ae_charmhit: {
        n: '準符', groups: ['ACCESSORY'],
        d: '近／遠命中小幅提升',
        desc(t, en) {
            let v = (t >= 3 ? 3 : (t >= 2 ? 2 : 1)) + Math.floor((en || 0) / 6);
            return `近距離／遠距離命中 +${v}`;
        }
    },
    ae_soulwell: {
        n: '魂泉', groups: ['ACCESSORY'],
        d: '最大 MP 固定提升（隨強化）',
        desc(t, en) {
            let base = t >= 3 ? 70 : (t >= 2 ? 40 : 20);
            return `最大 MP +${base + (en || 0)}`;
        }
    },
    ae_lifetap: {
        n: '命汲', groups: ['ACCESSORY'],
        d: '命中時小機率恢復固定 HP',
        desc(t) {
            let flat = t >= 3 ? 50 : (t >= 2 ? 35 : 20);
            return `一般攻擊 4% 恢復 ${flat} HP`;
        }
    }
};



const SE_OLD_GEAR_MAP = {
    se_thorns: 'ae_thorns',
    se_aegis: 'ae_aegis',
    se_lastlight: 'ae_lastlight',
    se_veil: 'ae_veil',
    se_ghoststep: 'ae_ghoststep',
    se_crystal: 'ae_crystal',
    se_crystalward: 'ae_crystal'
};

const SE_OLD_WPN_MAP = {
    se_soulleech: 'we_drain',
    se_sunder: 'we_sunder',
    se_execute: 'we_execute',
    se_incant: 'we_incant',
    se_vacuum: 'we_incant',
    se_lethal: 'we_lethal',
    se_blind: 'we_lethal'
};

// 合併查表（名稱／說明）
const SHERINE_ENCH = Object.assign({}, WEAPON_ENCHANT, GEAR_ENCHANT);

let _seNpcSelUid = '';
let _seMigrateNoteOnce = false;

function _seCanonId(id) {
    if (!id) return id;
    if (typeof id === 'object' && id.id) id = id.id;
    if (SE_OLD_GEAR_MAP[id]) return SE_OLD_GEAR_MAP[id];
    if (SE_OLD_WPN_MAP[id]) return SE_OLD_WPN_MAP[id];
    let e = SHERINE_ENCH[id];
    return (e && e.aliasOf) ? e.aliasOf : id;
}

function _seNormEntry(raw) {
    if (!raw) return null;
    if (typeof raw === 'string') {
        let c = _seCanonId(raw);
        if (WEAPON_ENCHANT[c]) return { id: c, t: 1 };
        if (GEAR_ENCHANT[c] || GEAR_ENCHANT[raw]) return { id: c, t: 1, _arm: true };
        if (SE_OLD_GEAR_MAP[raw] || SE_OLD_GEAR_MAP[c]) return { id: SE_OLD_GEAR_MAP[raw] || SE_OLD_GEAR_MAP[c], t: 1, _arm: true };
        if (SE_OLD_WPN_MAP[raw] || SE_OLD_WPN_MAP[c]) return { id: SE_OLD_WPN_MAP[raw] || SE_OLD_WPN_MAP[c], t: 1 };
        return null;
    }
    if (typeof raw === 'object' && raw.id) {
        let c = _seCanonId(raw.id);
        if (!SHERINE_ENCH[c] && !WEAPON_ENCHANT[c] && !GEAR_ENCHANT[c]) {
            if (SE_OLD_GEAR_MAP[raw.id]) c = SE_OLD_GEAR_MAP[raw.id];
            else if (SE_OLD_WPN_MAP[raw.id]) c = SE_OLD_WPN_MAP[raw.id];
            else return null;
        }
        let t = Math.max(1, Math.min(3, Math.floor(Number(raw.t) || 1)));
        let arm = !WEAPON_ENCHANT[c] && !!(GEAR_ENCHANT[c]);
        return { id: c, t: t, _arm: arm };
    }
    return null;
}

/** 正規化 item.se；回傳 [{id,t}]；會就地寫回新格式 */
function sherineEnchList(item) {
    if (!item || !Array.isArray(item.se)) return [];
    let out = [], seen = {};
    let changed = false;
    item.se.forEach(raw => {
        let e = _seNormEntry(raw);
        if (!e) { changed = true; return; }
        if (seen[e.id]) { changed = true; return; }
        seen[e.id] = true;
        out.push({ id: e.id, t: e.t || 1 });
        if (typeof raw === 'string' || raw.id !== e.id || (raw.t || 1) !== (e.t || 1)) changed = true;
    });
    // 武器最多 2；防具／飾品最多 2（混合時：武器優先截斷；多餘條目遷移時裁掉）
    let wpn = out.filter(x => WEAPON_ENCHANT[x.id]);
    let arm = out.filter(x => !WEAPON_ENCHANT[x.id]);
    if (wpn.length > SHERINE_ENCH_MAX_WPN) { wpn = wpn.slice(0, SHERINE_ENCH_MAX_WPN); changed = true; }
    if (arm.length > SHERINE_ENCH_MAX_ARM) { arm = arm.slice(0, SHERINE_ENCH_MAX_ARM); changed = true; }
    out = wpn.concat(arm);
    // 一律寫回 item.se，並回傳同一參考，確保升級 t 會打中實例（唔再 mutate 孤兒 copy）
    item.se = out.map(x => ({ id: x.id, t: x.t }));
    return item.se;
}

function sherineEnchName(id) {
    if (typeof id === 'object' && id && id.id) id = id.id;
    id = _seCanonId(id);
    return (SHERINE_ENCH[id] && SHERINE_ENCH[id].n) || id;
}

function sherineEnchDesc(id, tier, en) {
    if (typeof id === 'object' && id && id.id) {
        tier = id.t || tier;
        id = id.id;
    }
    id = _seCanonId(id);
    let e = SHERINE_ENCH[id];
    if (!e) return '';
    if (typeof e.desc === 'function') return e.desc(tier || 1, en || 0);
    return e.d || '';
}

function sherineEnchTierLabel(t) {
    t = Math.max(1, Math.min(3, Math.floor(t || 1)));
    return 'T' + t;
}

function _seItemKind(d) {
    if (!d) return '';
    if (d.type === 'wpn') return 'wpn';
    if (d.type === 'arm') return 'arm';
    if (d.type === 'acc') return 'acc';
    return '';
}

function _seEligibleDef(d) {
    if (!d) return false;
    if (d.remains || d.wishRing || d.isArrow || d.slot === 'doll' || d.noUse) return false;
    return d.type === 'wpn' || d.type === 'arm' || d.type === 'acc';
}

function _seIsWeaponItem(item) {
    let d = item && DB.items[item.id];
    return !!(d && d.type === 'wpn' && !d.isArrow);
}

function _sePoolFor(d, excludeIds) {
    let skip = {};
    (excludeIds || []).forEach(id => {
        let c = (typeof id === 'object' && id.id) ? id.id : id;
        skip[_seCanonId(c)] = true;
    });
    let group = _seGearGroup(d);
    if (group === 'wpn') {
        return Object.keys(WEAPON_ENCHANT).filter(id => !skip[id]);
    }
    if (!group) return [];
    return Object.keys(GEAR_ENCHANT).filter(id => {
        if (skip[id]) return false;
        let gs = GEAR_ENCHANT[id].groups || [];
        return gs.indexOf(group) >= 0;
    });
}

// 🧮 v3.8.105：同效果最多 2 件疊加 → 克洛托抽取／改寫時，排除「身上其他已裝備部位已有 2 件」嘅效果
/** 身上（排除 selItem 本身）已裝備部位嘅效果件數 ≥2 → { id: n } */
function _seCappedOnOtherEquipped(selItem) {
    let cnt = {}, out = {};
    if (typeof player === 'undefined' || !player || !player.eq) return out;
    for (let k in player.eq) {
        let it = player.eq[k];
        if (!it || !Array.isArray(it.se) || !it.se.length) continue;
        if (selItem && (it === selItem || (selItem.uid != null && it.uid === selItem.uid))) continue;
        let seen = {};
        sherineEnchList(it).forEach(e => {
            let id = _seCanonId(e && e.id);
            if (!id || seen[id]) return;
            seen[id] = true;
            cnt[id] = (cnt[id] || 0) + 1;
        });
    }
    let lim = (typeof SE_STACK_MAX !== 'undefined') ? SE_STACK_MAX : 2;
    for (let id in cnt) if (cnt[id] >= lim) out[id] = cnt[id];
    return out;
}
/** 呢件裝備所屬部位池入面、因為身上已有 2 件而唔會再抽到嘅效果 id（依池次序） */
function _seCappedIdsFor(d, selItem) {
    let capped = _seCappedOnOtherEquipped(selItem);
    return _sePoolFor(d, []).filter(id => capped[id]);
}
/** 提示句：身上已有 2 件「厚帶」「血戒」，其他部位不會再抽到 */
function _seCapReminderText(d, selItem) {
    let ids = _seCappedIdsFor(d, selItem);
    if (!ids.length) return '';
    return '身上已有 2 件' + ids.map(id => '「' + sherineEnchName(id) + '」').join('') + '，其他部位不會再抽到';
}

function _seGearGroup(d) {
    if (!d) return '';
    if (d.type === 'wpn' && !d.isArrow) return 'wpn';
    if (d.remains || d.wishRing || d.isArrow || d.slot === 'doll' || d.noUse) return '';
    let s = d.slot || '';
    if (s === 'helm') return 'HELM';
    if (s === 'armor') return 'ARMOR';
    if (s === 'cloak') return 'CLOAK';
    if (s === 'gloves') return 'HAND';
    if (s === 'boots') return 'FEET';
    if (s === 'shield') return 'SHIELD';
    if (s === 'ring' || s === 'amulet' || s === 'belt') return 'ACCESSORY';
    return '';
}

function _seIsGearItem(item) {
    let d = item && DB.items[item.id];
    let g = _seGearGroup(d);
    return !!(g && g !== 'wpn');
}

function _seUpgradeCostFor(isWpn, nextTier) {
    let table = isWpn ? WE_UPGRADE_COST : AE_UPGRADE_COST;
    return table[nextTier];
}

function _seCrystalHave() {
    return (typeof questCountId === 'function') ? questCountId('sherine_crystal') : 0;
}
function _seMadHave() {
    return (typeof questCountId === 'function') ? questCountId('sherine_crystal_mad') : 0;
}
function _seCorHave() {
    return (typeof questCountId === 'function') ? questCountId('mat_cor_essence') : 0;
}
function _seConsumeCrystal(n) {
    n = Math.max(0, Math.floor(n) || 0);
    if (!n) return true;
    if (_seCrystalHave() < n) return false;
    if (typeof questConsumeId === 'function') questConsumeId('sherine_crystal', n);
    return true;
}
function _seConsumeId(id, n) {
    n = Math.max(0, Math.floor(n) || 0);
    if (!n) return true;
    if ((typeof questCountId === 'function' ? questCountId(id) : 0) < n) return false;
    if (typeof questConsumeId === 'function') questConsumeId(id, n);
    return true;
}
function _seConsumeGold(n) {
    n = Math.max(0, Math.floor(n) || 0);
    if (!n) return true;
    if (!player || (player.gold || 0) < n) return false;
    player.gold -= n;
    return true;
}

function _seFindByUid(uid) {
    if (!uid || !player) return null;
    if (player.eq) {
        for (let k in player.eq) {
            let it = player.eq[k];
            if (it && it.uid === uid) return { item: it, where: 'eq', slot: k };
        }
    }
    if (Array.isArray(player.inv)) {
        for (let i = 0; i < player.inv.length; i++) {
            let it = player.inv[i];
            if (it && it.uid === uid) return { item: it, where: 'inv', index: i };
        }
    }
    return null;
}

function _seSplitIfStacked(found) {
    if (!found || found.where !== 'inv') return found;
    let target = found.item;
    if ((target.cnt || 1) <= 1) return found;
    target.cnt--;
    let single = Object.assign({}, target, { cnt: 1, uid: (typeof uid === 'function' ? uid() : ('se_' + Date.now())) });
    if (Array.isArray(target.se)) single.se = JSON.parse(JSON.stringify(target.se));
    if (Array.isArray(target.gw)) single.gw = target.gw.slice();
    delete target.se;
    player.inv.push(single);
    _seNpcSelUid = single.uid;
    return { item: single, where: 'inv' };
}

function _seRng() {
    if (typeof lootRng === 'function') {
        try { return lootRng('sherine_ench'); } catch (e) {}
    }
    return Math.random();
}
function _sePick(pool) {
    if (!pool || !pool.length) return '';
    return pool[Math.floor(_seRng() * pool.length)];
}

function _seEligibleEntries() {
    let rows = [];
    if (player && player.eq) {
        Object.keys(player.eq).forEach(slot => {
            let it = player.eq[slot];
            if (!it) return;
            let d = DB.items[it.id];
            if (!_seEligibleDef(d)) return;
            rows.push({ item: it, where: 'eq', slot: slot });
        });
    }
    if (player && Array.isArray(player.inv)) {
        player.inv.forEach(it => {
            if (!it) return;
            let d = DB.items[it.id];
            if (!_seEligibleDef(d)) return;
            rows.push({ item: it, where: 'inv' });
        });
    }
    return rows;
}

function _seAfter() {
    try { if (typeof calcStats === 'function') calcStats(); } catch (e) {}
    try { if (typeof renderTabs === 'function') renderTabs(true); } catch (e) {}
    try { if (typeof updateUI === 'function') updateUI(); } catch (e) {}
    try { if (typeof saveGame === 'function') saveGame(); } catch (e) {}
    let el = document.getElementById('interaction-content');
    if (el) renderClothoEnchant(el);
}

function _seGwLabel(w) {
    if (typeof GENIE_WISH_LABEL === 'object' && GENIE_WISH_LABEL && GENIE_WISH_LABEL[w]) return GENIE_WISH_LABEL[w];
    return ({ str1: '力量 +1', dex1: '敏捷 +1', int1: '智力 +1' })[w] || w;
}

function _seItemEn(item) {
    if (!item) return 0;
    let d = DB.items[item.id];
    if (d && d.type === 'wpn' && typeof capWpnEn === 'function') return capWpnEn(item.en || 0);
    if (typeof capEn === 'function') return capEn(item.en || 0, d);
    return item.en || 0;
}

function seSelectItem(uid) {
    _seNpcSelUid = uid || '';
    let el = document.getElementById('interaction-content');
    if (el) renderClothoEnchant(el);
}

function seDrawEnchant() {
    let found = _seFindByUid(_seNpcSelUid);
    if (!found) { logSys('<span class="text-amber-300">請先揀一件裝備。</span>'); return; }
    let d = DB.items[found.item.id];
    if (!_seEligibleDef(d)) return;
    let isWpn = d.type === 'wpn' && !d.isArrow;
    let isGear = _seIsGearItem(found.item);
    if (!isWpn && !isGear) {
        logSys('<span class="text-amber-300">呢件唔可以附魔（人偶等已排除）。</span>');
        return;
    }
    found = _seSplitIfStacked(found);
    let all = sherineEnchList(found.item);
    let cur = isWpn ? all.filter(x => WEAPON_ENCHANT[x.id]) : all.filter(x => GEAR_ENCHANT[x.id]);
    let maxN = isWpn ? SHERINE_ENCH_MAX_WPN : SHERINE_ENCH_MAX_ARM;
    if (cur.length >= maxN) {
        logSys(`<span class="text-amber-300">已經有 ${maxN} 條席琳附魔。</span>`);
        return;
    }
    let _capIds = _seCappedIdsFor(d, found.item);   // v3.8.105：身上已有 2 件嘅效果唔再抽
    let pool = _sePoolFor(d, cur.concat(_capIds));
    if (!pool.length) {
        let _rm = _capIds.length ? `（${_seCapReminderText(d, found.item)}）` : '';
        logSys(`<span class="text-amber-300">冇得再抽嘅附魔${_rm}。未消耗席琳結晶。</span>`);
        return;
    }
    if (_seCrystalHave() < SHERINE_ENCH_COST_DRAW) {
        logSys(`<span class="text-red-400 font-bold">席琳結晶不足。</span><span class="text-red-300">（需要 ${SHERINE_ENCH_COST_DRAW}）</span>`);
        return;
    }
    _seConsumeCrystal(SHERINE_ENCH_COST_DRAW);
    let picked = _sePick(pool);
    if (isWpn) {
        let armKeep = all.filter(x => GEAR_ENCHANT[x.id]);
        found.item.se = cur.concat([{ id: picked, t: 1 }]).concat(armKeep);
    } else {
        found.item.se = cur.concat([{ id: picked, t: 1 }]);
    }
    let kind = isWpn ? '武器' : '防具／飾品';
    logSys(`<span class="c-sherine font-bold">✦ 克洛托紡入${kind}附魔：${sherineEnchName(picked)} T1</span>（${sherineEnchDesc(picked, 1, _seItemEn(found.item))}）（消耗 席琳結晶 ×${SHERINE_ENCH_COST_DRAW}）`);
    _seAfter();
}

function seRerollEnchant(idx) {
    idx = Math.floor(Number(idx) || 0);
    let found = _seFindByUid(_seNpcSelUid);
    if (!found) { logSys('<span class="text-amber-300">請先揀一件裝備。</span>'); return; }
    let d = DB.items[found.item.id];
    if (!_seEligibleDef(d)) return;
    let isWpn = d.type === 'wpn' && !d.isArrow;
    let isGear = _seIsGearItem(found.item);
    if (!isWpn && !isGear) return;
    found = _seSplitIfStacked(found);
    let all = sherineEnchList(found.item);
    let cur = isWpn ? all.filter(x => WEAPON_ENCHANT[x.id]) : all.filter(x => GEAR_ENCHANT[x.id]);
    if (!cur[idx]) { logSys('<span class="text-amber-300">冇呢條附魔。</span>'); return; }
    let keep = cur.filter((_, i) => i !== idx);
    let _capIds = _seCappedIdsFor(d, found.item);   // v3.8.105：身上已有 2 件嘅效果唔再改寫到
    let pool = _sePoolFor(d, keep.concat(_capIds));
    if (!pool.length) {
        let _rm = _capIds.length ? `（${_seCapReminderText(d, found.item)}）` : '';
        logSys(`<span class="text-amber-300">冇得改寫嘅附魔${_rm}。未消耗席琳結晶。</span>`);
        return;
    }
    if (_seCrystalHave() < SHERINE_ENCH_COST_REROLL) {
        logSys(`<span class="text-red-400 font-bold">席琳結晶不足。</span><span class="text-red-300">（需要 ${SHERINE_ENCH_COST_REROLL}）</span>`);
        return;
    }
    _seConsumeCrystal(SHERINE_ENCH_COST_REROLL);
    let picked = _sePick(pool);
    cur[idx] = { id: picked, t: 1 };
    if (isWpn) {
        let armKeep = all.filter(x => GEAR_ENCHANT[x.id]);
        found.item.se = cur.concat(armKeep);
    } else {
        found.item.se = cur;
    }
    logSys(`<span class="c-sherine font-bold">✦ 克洛托改寫附魔：${sherineEnchName(picked)} T1</span>（${sherineEnchDesc(picked, 1, _seItemEn(found.item))}）（消耗 席琳結晶 ×${SHERINE_ENCH_COST_REROLL}；階層重置）`);
    _seAfter();
}

function seUpgradeEnchant(idx) {
    idx = Math.floor(Number(idx) || 0);
    let found = _seFindByUid(_seNpcSelUid);
    if (!found) { logSys('<span class="text-amber-300">請先揀一件裝備。</span>'); return; }
    let d = DB.items[found.item.id];
    if (!_seEligibleDef(d)) return;
    let isWpn = d.type === 'wpn' && !d.isArrow;
    let isGear = _seIsGearItem(found.item);
    if (!isWpn && !isGear) return;
    found = _seSplitIfStacked(found);
    let all = sherineEnchList(found.item);
    let cur = isWpn ? all.filter(x => WEAPON_ENCHANT[x.id]) : all.filter(x => GEAR_ENCHANT[x.id]);
    let entry = cur[idx];
    if (!entry) { logSys('<span class="text-amber-300">冇呢條附魔。</span>'); return; }
    if ((entry.t || 1) >= 3) { logSys('<span class="text-amber-300">已經係 T3 滿階。</span>'); return; }
    let next = (entry.t || 1) + 1;
    let cost = _seUpgradeCostFor(isWpn, next);
    if (!cost) return;
    if (_seCrystalHave() < cost.crystal) {
        logSys(`<span class="text-red-400 font-bold">席琳結晶不足。</span>（需要 ${cost.crystal}）`);
        return;
    }
    if (cost.mad > 0 && _seMadHave() < cost.mad) {
        logSys(`<span class="text-red-400 font-bold">瘋狂席琳結晶不足。</span>（需要 ${cost.mad}）`);
        return;
    }
    if (cost.cor > 0 && _seCorHave() < cost.cor) {
        logSys(`<span class="text-red-400 font-bold">腐敗精華不足。</span>（需要 ${cost.cor}）`);
        return;
    }
    if ((player.gold || 0) < cost.gold) {
        logSys(`<span class="text-red-400 font-bold">金幣不足。</span>（需要 ${cost.gold.toLocaleString()}）`);
        return;
    }
    _seConsumeCrystal(cost.crystal);
    if (cost.mad) _seConsumeId('sherine_crystal_mad', cost.mad);
    if (cost.cor) _seConsumeId('mat_cor_essence', cost.cor);
    _seConsumeGold(cost.gold);
    // 直接改 found.item.se 上嘅條目（sherineEnchList 已回傳同一參考）
    entry.t = next;
    if (!Array.isArray(found.item.se) || !found.item.se.some(x => x && x.id === entry.id && x.t === next)) {
        // 後備：按 id 寫回
        let se = Array.isArray(found.item.se) ? found.item.se.slice() : [];
        let hit = false;
        for (let i = 0; i < se.length; i++) {
            if (se[i] && se[i].id === entry.id) { se[i] = { id: entry.id, t: next }; hit = true; break; }
        }
        if (!hit) se.push({ id: entry.id, t: next });
        if (isWpn) {
            let w = se.filter(x => WEAPON_ENCHANT[x.id]);
            let a = se.filter(x => GEAR_ENCHANT[x.id]);
            found.item.se = w.concat(a);
        } else {
            found.item.se = se.filter(x => GEAR_ENCHANT[x.id]);
        }
    }
    let costBits = [`席琳結晶×${cost.crystal}`];
    if (cost.mad) costBits.push(`瘋狂席琳結晶×${cost.mad}`);
    if (cost.cor) costBits.push(`腐敗精華×${cost.cor}`);
    costBits.push(`金幣 ${cost.gold.toLocaleString()}`);
    logSys(`<span class="c-sherine font-bold">✦ 克洛托強化附魔：${sherineEnchName(entry.id)} → T${next}</span>（${sherineEnchDesc(entry.id, next, _seItemEn(found.item))}）（消耗 ${costBits.join('、')}）`);
    _seAfter();
}

function seDrawOrRerollGenie() {
    let found = _seFindByUid(_seNpcSelUid);
    if (!found) { logSys('<span class="text-amber-300">請先揀一件裝備。</span>'); return; }
    let d = DB.items[found.item.id];
    if (!_seEligibleDef(d)) return;
    found = _seSplitIfStacked(found);
    let hasGw = Array.isArray(found.item.gw) && found.item.gw.length > 0;
    let cost = hasGw ? SHERINE_ENCH_COST_GW : SHERINE_ENCH_COST_GW_DRAW;
    if (_seCrystalHave() < cost) {
        logSys(`<span class="text-red-400 font-bold">席琳結晶不足。</span><span class="text-red-300">（需要 ${cost}）</span>`);
        return;
    }
    _seConsumeCrystal(cost);
    let picked;
    if (hasGw) {
        let old = found.item.gw[0];
        let pool = SHERINE_ENCH_GW_POOL.filter(w => w !== old);
        if (!pool.length) pool = SHERINE_ENCH_GW_POOL.slice();
        picked = _sePick(pool);
        found.item.gw = [picked];
        logSys(`<span class="c-sherine font-bold">✦ 克洛托改寫巨靈屬性：</span><span class="text-amber-200">${_seGwLabel(picked)}</span>（消耗 席琳結晶 ×${cost}）`);
    } else {
        picked = _sePick(SHERINE_ENCH_GW_POOL.slice());
        found.item.gw = [picked];
        logSys(`<span class="c-sherine font-bold">✦ 克洛托抽取巨靈屬性：</span><span class="text-amber-200">${_seGwLabel(picked)}</span>（消耗 席琳結晶 ×${cost}）`);
    }
    _seAfter();
}
function seRerollGenie() { seDrawOrRerollGenie(); }

function renderClothoEnchant(div) {
    if (!div) return;
    let have = _seCrystalHave();
    let mad = _seMadHave();
    let cor = _seCorHave();
    let gold = (player && player.gold) || 0;
    let rows = _seEligibleEntries();
    if (!_seNpcSelUid && rows[0] && rows[0].item) _seNpcSelUid = rows[0].item.uid;
    let found = _seFindByUid(_seNpcSelUid);
    let sel = found && found.item;
    let selD = sel && DB.items[sel.id];
    if (sel && !_seEligibleDef(selD)) { sel = null; selD = null; }

    let listHtml = rows.map(r => {
        let it = r.item;
        let d = DB.items[it.id];
        let list = sherineEnchList(it);
        let isWpn = d && d.type === 'wpn' && !d.isArrow;
        let nShow = isWpn ? list.filter(x => WEAPON_ENCHANT[x.id]).length : list.filter(x => GEAR_ENCHANT[x.id]).length;
        let maxShow = isWpn ? SHERINE_ENCH_MAX_WPN : SHERINE_ENCH_MAX_ARM;
        let gw = (it.gw && it.gw[0]) ? _seGwLabel(it.gw[0]) : '';
        let mark = r.where === 'eq' ? '<span class="text-slate-500 text-xs">穿著</span>' : '';
        let on = it.uid === _seNpcSelUid;
        let kind = d && d.type === 'wpn' ? '武器' : (d && d.type === 'arm' ? '防具' : '飾品');
        let grp = _seGearGroup(d);
        let grpN = ({ wpn: '武器', ARMOR: '甲胄', CLOAK: '斗篷', HELM: '頭盔', HAND: '手套', FEET: '靴', SHIELD: '盾', ACCESSORY: '飾品' })[grp] || '';
        return `<button type="button" class="w-full text-left px-2 py-1.5 rounded border ${on ? 'border-emerald-500 bg-emerald-950/50' : 'border-slate-700 bg-slate-900/70 hover:bg-slate-800'} mb-1" onclick="seSelectItem('${it.uid}')">
            <div class="flex items-center justify-between gap-2">
                <span class="truncate text-sm font-bold">${typeof getItemFullName === 'function' ? getItemFullName(it) : (d && d.n)}</span>
                ${mark}
            </div>
            <div class="text-xs text-slate-400">${kind}${grpN ? '・' + grpN : ''}・附魔 ${nShow}/${maxShow}${gw ? '・巨靈 ' + gw : ''}</div>
        </button>`;
    }).join('') || '<div class="text-slate-500 text-sm py-6 text-center">背包同身上冇可附魔裝備。</div>';

    let detail = '<div class="text-slate-500 text-sm py-6 text-center">喺左邊揀一件裝備。</div>';
    if (sel && selD) {
        let isWpn = selD.type === 'wpn' && !selD.isArrow;
        let isGear = _seIsGearItem(sel);
        let en = _seItemEn(sel);
        let all = sherineEnchList(sel);
        let cur = isWpn ? all.filter(x => WEAPON_ENCHANT[x.id]) : all.filter(x => GEAR_ENCHANT[x.id]);
        let maxSlots = isWpn ? SHERINE_ENCH_MAX_WPN : (isGear ? SHERINE_ENCH_MAX_ARM : 0);
        let costTable = isWpn ? WE_UPGRADE_COST : AE_UPGRADE_COST;
        let _capIds = (isWpn || isGear) ? _seCappedIdsFor(selD, sel) : [];   // v3.8.105
        let _capSet = {}; _capIds.forEach(id => { _capSet[id] = true; });
        let _capText = (isWpn || isGear) ? _seCapReminderText(selD, sel) : '';
        let slots = '';
        if (!isWpn && !isGear) {
            slots = `<div class="text-amber-200 text-sm border border-amber-800/50 rounded p-2 mb-2">呢件唔開放席琳附魔抽取（可抽巨靈）。</div>`;
        } else {
            for (let i = 0; i < maxSlots; i++) {
                let e = cur[i];
                if (e) {
                    let next = (e.t || 1) + 1;
                    let cost = costTable[next];
                    let upBtn = '';
                    if (cost) {
                        let ok = have >= cost.crystal && mad >= cost.mad && cor >= cost.cor && gold >= cost.gold;
                        let tip = `升 T${next}：結晶×${cost.crystal}` +
                            (cost.mad ? `、瘋結晶×${cost.mad}` : '') +
                            (cost.cor ? `、腐敗精華×${cost.cor}` : '') +
                            `、金 ${cost.gold.toLocaleString()}`;
                        upBtn = `<button class="btn px-2 py-1 text-xs ${ok ? 'bg-violet-900 border-violet-500' : 'opacity-50'}" title="${tip}" onclick="seUpgradeEnchant(${i})">升級→T${next}</button>`;
                    } else {
                        upBtn = `<span class="text-xs text-violet-300 font-bold">滿階 T3</span>`;
                    }
                    let _off = false; try { _off = typeof seInstanceInactive === 'function' && seInstanceInactive(sel, e.id); } catch (_e) {}
                    let _rrPool = _sePoolFor(selD, cur.filter((_, j) => j !== i).concat(_capIds));
                    let _rrBtn = _rrPool.length
                        ? `<button class="btn px-2 py-1 text-xs bg-emerald-900 border-emerald-600" onclick="seRerollEnchant(${i})">改寫 ×${SHERINE_ENCH_COST_REROLL}</button>`
                        : `<button class="btn px-2 py-1 text-xs opacity-50 cursor-not-allowed" disabled title="冇得改寫嘅附魔">改寫 ×${SHERINE_ENCH_COST_REROLL}</button>`;
                    slots += `<div class="border border-emerald-800 bg-emerald-950/40 rounded p-2 mb-2">
                        <div class="flex items-center justify-between gap-2 flex-wrap">
                            <span class="c-sherine font-bold">✦ ${sherineEnchName(e.id)} <span class="text-violet-300">${sherineEnchTierLabel(e.t)}</span>${_off ? ' <span class="text-red-400 text-xs">（已達 2 件上限，不生效）</span>' : ''}</span>
                            <div class="flex gap-1">
                                ${upBtn}
                                ${_rrBtn}
                            </div>
                        </div>
                        <div class="text-xs text-slate-300 mt-1">${sherineEnchDesc(e.id, e.t, en)}</div>
                    </div>`;
                } else {
                    slots += `<div class="border border-dashed border-slate-700 rounded p-2 mb-2 text-slate-500 text-sm">空槽 ${i + 1}</div>`;
                }
            }
        }

        let gwHtml = (sel.gw && sel.gw.length)
            ? `<div class="border border-amber-800 bg-amber-950/30 rounded p-2 mb-3">
                    <div class="flex items-center justify-between gap-2">
                        <span class="text-amber-200 font-bold">巨靈：${sel.gw.map(_seGwLabel).join('、')}</span>
                        <button class="btn px-2 py-1 text-xs bg-amber-900 border-amber-600" onclick="seDrawOrRerollGenie()">改寫 ×${SHERINE_ENCH_COST_GW}</button>
                    </div>
               </div>`
            : `<div class="border border-dashed border-amber-800/60 rounded p-2 mb-3">
                    <div class="flex items-center justify-between gap-2">
                        <span class="text-slate-400 text-sm">尚未抽取巨靈屬性</span>
                        <button class="btn px-2 py-1 text-xs bg-amber-900 border-amber-600" onclick="seDrawOrRerollGenie()">抽取 ×${SHERINE_ENCH_COST_GW_DRAW}</button>
                    </div>
               </div>`;

        let _drawPool = (isWpn || isGear) ? _sePoolFor(selD, cur.concat(_capIds)) : [];
        let canDraw = (isWpn || isGear) && cur.length < maxSlots && _drawPool.length > 0;
        let _capHtml = _capText ? `<div class="se-cap-reminder text-xs rounded px-2 py-1 mb-2" style="color:#fcd34d;background:rgba(120,53,15,.35);border:1px solid rgba(217,119,6,.55);">⚠ ${_capText}</div>` : '';
        let title = isWpn ? `武器附魔 ${cur.length}/${SHERINE_ENCH_MAX_WPN}` : (isGear ? `防具／飾品附魔 ${cur.length}/${SHERINE_ENCH_MAX_ARM}` : '附魔');
        let drawLabel = isWpn ? '抽取武器附魔 T1' : '抽取防具／飾品附魔 T1';
        // 呢件可抽到：顯示完整部位池，已有標註（唔 exclude）
        let poolHtml = '';
        if (isWpn || isGear) {
            let owned = {};
            cur.forEach(e => { if (e && e.id) owned[e.id] = true; });
            let fullPool = _sePoolFor(selD, []);
            let rows = fullPool.map(id => {
                let def = isWpn ? WEAPON_ENCHANT[id] : GEAR_ENCHANT[id];
                if (!def) return '';
                let shortD = def.d || (typeof def.desc === 'function' ? def.desc(1, en) : '');
                let mark = owned[id] ? ' <span class="text-emerald-400">（已有）</span>' : (_capSet[id] ? ' <span class="text-amber-300">（身上已有 2 件）</span>' : '');
                return `<div class="text-xs border-b border-slate-800/80 py-0.5"${(_capSet[id] && !owned[id]) ? ' style="opacity:.55;"' : ''}><span class="c-sherine font-bold">${def.n}</span>${mark} <span class="text-slate-400">${shortD}</span></div>`;
            }).filter(Boolean).join('');
            poolHtml = `<div class="mt-3 border border-slate-700 rounded p-2 bg-slate-900/60">
                <div class="text-slate-200 font-bold text-sm mb-1">呢件可抽到的附魔（${fullPool.length - _capIds.filter(id => !owned[id]).length}/${fullPool.length}）</div>
                <div class="overflow-y-auto pr-1" style="max-height:10rem;">${rows || '<div class="text-slate-500 text-xs">呢個部位暫時冇池。</div>'}</div>
            </div>`;
        }
        detail = `
            <div class="font-bold mb-2">${typeof getItemFullName === 'function' ? getItemFullName(sel) : selD.n} <span class="text-slate-400 text-xs">強化 +${en}</span></div>
            ${gwHtml}
            <div class="text-slate-200 font-bold text-sm mb-1">${title} <span class="text-slate-400 text-xs font-normal">同效果最多 2 件疊加</span></div>
            ${slots}
            ${_capHtml}
            ${(isWpn || isGear) ? `<button class="btn w-full py-2 font-bold ${canDraw ? 'bg-green-900 border-green-600' : 'opacity-50 cursor-not-allowed'}" ${canDraw ? `onclick="seDrawEnchant()"` : 'disabled'}>
                <span class="c-sherine">${drawLabel}</span> ×${SHERINE_ENCH_COST_DRAW}
            </button>
            ${canDraw ? '<div class="text-xs text-slate-500 mt-1">抽出嚟係 T1，之後再用材料升級。</div>' : (cur.length < maxSlots ? `<div class="text-xs text-amber-300 mt-1">呢個部位已冇可抽嘅附魔（唔會扣結晶）。</div>` : `<div class="text-xs text-slate-500 mt-1">已滿 ${maxSlots} 條；可以改寫或升級。</div>`)}
            ${poolHtml}` : ''}
        `;
    }

    let catalogW = Object.keys(WEAPON_ENCHANT).map(id => {
        let e = WEAPON_ENCHANT[id];
        return `<div class="text-xs border-b border-slate-800 py-1"><span class="c-sherine font-bold">${e.n}</span> <span class="text-slate-500">〔武器〕</span> <span class="text-slate-300">${e.d}</span></div>`;
    }).join('');
    let _seGrpLab = { ARMOR: '甲胄', CLOAK: '斗篷', HELM: '頭盔', HAND: '手套', FEET: '靴', SHIELD: '盾', ACCESSORY: '飾品' };
    let catalogG = Object.keys(GEAR_ENCHANT).map(id => {
        let e = GEAR_ENCHANT[id];
        let g = (e.groups || []).map(x => _seGrpLab[x] || x).join('/');
        return `<div class="text-xs border-b border-slate-800 py-1"><span class="c-sherine font-bold">${e.n}</span> <span class="text-slate-500">〔${g}〕</span> <span class="text-slate-300">${e.d || ''}</span></div>`;
    }).join('');

    div.innerHTML = `<div class="p-2 flex flex-col gap-3">
        <div class="text-slate-300 text-sm">克洛托：「命運嘅線可以織入鋼鐵同鎧甲。獻上結晶，我替你抽一條席琳質變——再拿材料，我幫你把線織得更緊。」</div>
        <div class="text-xs text-slate-400">
            武器最多 <span class="c-sherine font-bold">${SHERINE_ENCH_MAX_WPN} 條</span>；防具／飾品最多 <span class="c-sherine font-bold">${SHERINE_ENCH_MAX_ARM} 條</span>（唔重複・分部位池）。
            <span class="text-amber-300">同效果最多 2 件疊加</span>（身上取最高階 2 件、各自全額；第 3 件起不生效，亦唔會再抽到）。
            抽取 T1 ×${SHERINE_ENCH_COST_DRAW}、改寫（重置 T1）×${SHERINE_ENCH_COST_REROLL}；
            武器升級 T2：結晶×10＋金5萬；T3：結晶×50＋瘋結晶×1＋腐敗精華×2＋金20萬。
            防具升級 T2：結晶×8＋金4萬；T3：結晶×40＋瘋結晶×1＋腐敗精華×1＋金15萬。
            持有：<span class="c-sherine font-bold">結晶 ${have.toLocaleString()}</span>／
            <span class="c-sherine-mad font-bold">瘋結晶 ${mad.toLocaleString()}</span>／
            <span class="text-lime-300 font-bold">腐敗精華 ${cor.toLocaleString()}</span>／
            <span class="text-yellow-300 font-bold">金 ${gold.toLocaleString()}</span>
        </div>
        <div class="grid gap-3" style="grid-template-columns:minmax(180px,38%) 1fr;">
            <div class="max-h-80 overflow-y-auto pr-1">${listHtml}</div>
            <div>${detail}</div>
        </div>
        <details class="border border-slate-700 rounded p-2 bg-slate-900/50">
            <summary class="cursor-pointer text-slate-200 font-bold text-sm">武器附魔一覽（${Object.keys(WEAPON_ENCHANT).length}）</summary>
            <div class="mt-2">${catalogW}</div>
        </details>
        <details class="border border-slate-700 rounded p-2 bg-slate-900/50">
            <summary class="cursor-pointer text-slate-200 font-bold text-sm">防具／飾品附魔一覽（${Object.keys(GEAR_ENCHANT).length}）</summary>
            <div class="mt-2">${catalogG}</div>
        </details>
    </div>`;
}

/** 🗑️ v3.8.43 載入時清除遠古系詞綴欄位（遠古／永恆／不朽／太初）；祝福／屬性保留 */
function stripAncAffixesOnLoad(warehouse) {
    if (!player) return;
    let n = 0;
    function touch(it) {
        if (!it || !it.anc) return;
        delete it.anc;
        n++;
    }
    try {
        if (player.eq) Object.keys(player.eq).forEach(k => touch(player.eq[k]));
        if (Array.isArray(player.inv)) player.inv.forEach(touch);
        if (Array.isArray(player.allies)) {
            player.allies.forEach(a => {
                if (!a || !a.eq) return;
                Object.keys(a.eq).forEach(k => touch(a.eq[k]));
            });
        }
        let wh = warehouse;
        if (!wh && typeof loadWarehouse === 'function') {
            try { wh = loadWarehouse(); } catch (e) { wh = null; }
        }
        if (wh && Array.isArray(wh.items)) {
            let before = n;
            wh.items.forEach(touch);
            if (n > before && typeof saveWarehouse === 'function') {
                try { saveWarehouse(wh); } catch (e) {}
            }
        }
        if (n > 0) {
            try { logSys(`<span class="text-slate-400">遠古系詞綴已退役：清除 ${n} 件裝備嘅遠古／永恆／不朽／太初標記（祝福／屬性保留）。</span>`); } catch (e) {}
        }
    } catch (e) { console.warn('stripAncAffixesOnLoad', e); }
}

/** 載入時遷移：舊武器 se 字串→新 id；未知清掉 */
function migrateWeaponEnchantsOnLoad() {
    if (!player) return;
    let wiped = 0, mapped = 0;
    function touch(it) {
        if (!it || !Array.isArray(it.se) || !it.se.length) return;
        let d = DB.items[it.id];
        let before = JSON.stringify(it.se);
        let next = [];
        const WE_REMOVED = { we_poison:1, we_skillfire:1, we_mut_bolt:1, we_mut_storm:1, we_mut_slash:1 };
        it.se.forEach(raw => {
            let e = _seNormEntry(raw);
            if (!e) { wiped++; return; }
            if (WE_REMOVED[e.id]) { wiped++; return; }
            if (typeof raw === 'string' && (SE_OLD_WPN_MAP[raw] || SE_OLD_GEAR_MAP[raw])) mapped++;
            next.push({ id: e.id, t: e.t || 1 });
        });
        if (d && d.type === 'wpn') {
            let w = next.filter(x => WEAPON_ENCHANT[x.id]).slice(0, SHERINE_ENCH_MAX_WPN);
            let a = next.filter(x => GEAR_ENCHANT[x.id]).slice(0, SHERINE_ENCH_MAX_ARM);
            next = w.concat(a);
        } else {
            next = next.filter(x => GEAR_ENCHANT[x.id]).slice(0, SHERINE_ENCH_MAX_ARM);
        }
        it.se = next;
        if (JSON.stringify(it.se) !== before && !_seMigrateNoteOnce) {
            _seMigrateNoteOnce = true;
        }
    }
    if (player.eq) Object.keys(player.eq).forEach(k => touch(player.eq[k]));
    if (Array.isArray(player.inv)) player.inv.forEach(touch);
    if ((wiped || mapped) && !_seMigrateNoteOnce) {
        logSys(`<span class="c-sherine">✦ 席琳附魔已遷移至新制（映射 ${mapped}、清除未知 ${wiped}）。建議以新存檔體驗完整抽取／升級流程。</span>`);
        _seMigrateNoteOnce = true;
    } else if (mapped || wiped) {
        try { logSys(`<span class="c-sherine">✦ 席琳附魔遷移：映射 ${mapped}、清除 ${wiped}。</span>`); } catch (e) {}
    }
}

// ---- Console helpers（新存檔測試）----
function __seGiveMats(opts) {
    opts = opts || {};
    function add(id, n) {
        if (typeof gainItem === 'function') gainItem(id, n, true);
        else {
            player.inv = player.inv || [];
            let ex = player.inv.find(i => i && i.id === id);
            if (ex) ex.cnt = (ex.cnt || 1) + n;
            else player.inv.push({ id: id, cnt: n, uid: 'dbg_' + id + '_' + Date.now() });
        }
    }
    add('sherine_crystal', opts.crystal != null ? opts.crystal : 50);
    add('sherine_crystal_mad', opts.mad != null ? opts.mad : 5);
    add('mat_cor_essence', opts.cor != null ? opts.cor : 10);
    if (opts.gold != null) player.gold = (player.gold || 0) + opts.gold;
    else player.gold = (player.gold || 0) + 500000;
    logSys('<span class="c-sherine">[debug] 已發放附魔材料（結晶／瘋結晶／腐敗精華／金幣）。</span>');
    _seAfter();
}
function __seForce(id, t) {
    let found = _seFindByUid(_seNpcSelUid);
    if (!found) {
        found = player.eq && player.eq.wpn ? { item: player.eq.wpn } : null;
    }
    if (!found || !found.item) { console.warn('no item'); return; }
    let d = DB.items[found.item.id];
    let isWpn = d && d.type === 'wpn' && !d.isArrow;
    if (WEAPON_ENCHANT[id]) {
        if (!isWpn) { console.warn('we_* only on weapon'); return; }
        let cur = sherineEnchList(found.item).filter(x => WEAPON_ENCHANT[x.id]);
        let entry = { id: id, t: Math.max(1, Math.min(3, t || 1)) };
        let idx = cur.findIndex(x => x.id === id);
        if (idx >= 0) cur[idx] = entry;
        else if (cur.length < SHERINE_ENCH_MAX_WPN) cur.push(entry);
        else cur[0] = entry;
        let armKeep = sherineEnchList(found.item).filter(x => GEAR_ENCHANT[x.id]);
        found.item.se = cur.concat(armKeep);
    } else if (GEAR_ENCHANT[id]) {
        if (isWpn) { console.warn('ae_* only on gear'); return; }
        let cur = sherineEnchList(found.item).filter(x => GEAR_ENCHANT[x.id]);
        let entry = { id: id, t: Math.max(1, Math.min(3, t || 1)) };
        let idx = cur.findIndex(x => x.id === id);
        if (idx >= 0) cur[idx] = entry;
        else if (cur.length < SHERINE_ENCH_MAX_ARM) cur.push(entry);
        else cur[0] = entry;
        found.item.se = cur;
    } else {
        console.warn('unknown', id); return;
    }
    logSys(`<span class="c-sherine">[debug] 強制附魔 ${sherineEnchName(id)} T${t || 1}</span>`);
    _seAfter();
}
function __seList() {
    return {
        weapon: Object.keys(WEAPON_ENCHANT).map(id => ({ id, n: WEAPON_ENCHANT[id].n, d: WEAPON_ENCHANT[id].d })),
        gear: Object.keys(GEAR_ENCHANT).map(id => ({ id, n: GEAR_ENCHANT[id].n, d: GEAR_ENCHANT[id].d, groups: GEAR_ENCHANT[id].groups }))
    };
}

if (typeof window !== 'undefined') {
    window.SHERINE_ENCH = SHERINE_ENCH;
    window.WEAPON_ENCHANT = WEAPON_ENCHANT;
    window.GEAR_ENCHANT = GEAR_ENCHANT;
    window.SHERINE_ENCH_MAX = SHERINE_ENCH_MAX_WPN;
    window.SHERINE_ENCH_MAX_WPN = SHERINE_ENCH_MAX_WPN;
    window.SHERINE_ENCH_MAX_ARM = SHERINE_ENCH_MAX_ARM;
    window.sherineEnchList = sherineEnchList;
    window.sherineEnchName = sherineEnchName;
    window.sherineEnchDesc = sherineEnchDesc;
    window.sherineEnchTierLabel = sherineEnchTierLabel;
    window.renderClothoEnchant = renderClothoEnchant;
    window._seCappedIdsFor = _seCappedIdsFor;
    window._seCapReminderText = _seCapReminderText;
    window.seSelectItem = seSelectItem;
    window.seDrawEnchant = seDrawEnchant;
    window.seRerollEnchant = seRerollEnchant;
    window.seUpgradeEnchant = seUpgradeEnchant;
    window.seRerollGenie = seRerollGenie;
    window.seDrawOrRerollGenie = seDrawOrRerollGenie;
    window.migrateWeaponEnchantsOnLoad = migrateWeaponEnchantsOnLoad;
    window.stripAncAffixesOnLoad = stripAncAffixesOnLoad;
    window.__seGiveMats = __seGiveMats;
    window.__seForce = __seForce;
    window.__seList = __seList;
}
