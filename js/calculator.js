// ============================================
// Delta Force Loadout - 评分计算引擎
// ============================================

const Calculator = (function() {

  // 武器基础评分
  function calcWeaponScore(weapon, ammoType) {
    if (!weapon) return null;
    const s = weapon.base_stats;
    const ammo = AmmoDB.get(ammoType) || {};

    // 归一化射速 (0-100)
    const rofNorm = Math.min(s.rate_of_fire / 12, 100);

    // 攻击力 = 伤害*0.35 + 射速*0.25 + 精准*0.2 + 射程*0.2
    const attack = s.damage * 0.35 + rofNorm * 0.25 + s.accuracy * 0.2 + s.range * 0.2;

    // 精准度评分
    const accuracy = s.accuracy * 0.6 + (ammo.penetration || 50) * 0.2 + s.control * 0.2;

    // 控制性评分（后坐力可控制程度）
    const control = s.control * 0.7 + s.accuracy * 0.2 + (ammo.penetration || 50) * 0.1;

    // 射程评分
    const range = s.range * 0.8 + (ammo.stats?.range || 50) * 0.2;

    // 机动性
    const mobility = s.mobility;

    // 操控速度
    const handling = s.handling;

    return {
      attack: Math.round(Math.min(attack, 100) * 10) / 10,
      accuracy: Math.round(Math.min(accuracy, 100) * 10) / 10,
      control: Math.round(Math.min(control, 100) * 10) / 10,
      range: Math.round(Math.min(range, 100) * 10) / 10,
      mobility: Math.round(Math.min(mobility, 100) * 10) / 10,
      handling: Math.round(Math.min(handling, 100) * 10) / 10,
      damage: s.damage,
      rof: s.rate_of_fire
    };
  }

  // 载具评分
  function calcVehicleScore(vehicle) {
    if (!vehicle) return null;
    const v = vehicle.stats;

    // 攻击（主武器+副武器加权）
    const attack = v.main_weapon_damage * 0.7 + v.secondary_weapon_damage * 0.3;

    // 防御（血量+装甲加权）
    const defense = (v.hp / 5000) * 50 + v.armor * 0.5;

    // 机动（速度+隐蔽）
    const mobility = v.speed * 0.7 + v.stealth * 0.3;

    // 战术价值（载员量+隐蔽）
    const tactical = v.passenger_capacity * 10 + v.stealth * 0.8;

    return {
      attack: Math.round(Math.min(attack, 100) * 10) / 10,
      defense: Math.round(Math.min(defense, 100) * 10) / 10,
      mobility: Math.round(Math.min(mobility, 100) * 10) / 10,
      tactical: Math.round(Math.min(tactical, 100) * 10) / 10
    };
  }

  // 干员加成
  function getOperatorBonus(operator) {
    if (!operator) return {};
    return operator.loadout_bonus || {};
  }

  // 模式权重
  function getModeWeights(mode) {
    if (mode === 'havoc') {
      return { attack: 0.4, defense: 0.2, mobility: 0.25, sustain: 0.15 };
    } else {
      return { attack: 0.3, defense: 0.35, mobility: 0.2, sustain: 0.15 };
    }
  }

  // 计算综合搭配评分
  function calculateBuildScore(weapon, vehicle, operator, mode, ammoType, selectedAttachments) {
    // 如果有配件，应用配件加成到武器属性
    let effectiveWeapon = weapon;
    if (selectedAttachments && weapon) {
      effectiveWeapon = { ...weapon, base_stats: calcWeaponWithAttachments(weapon, selectedAttachments) };
    }
    const wScore = calcWeaponScore(effectiveWeapon, ammoType);
    const vScore = calcVehicleScore(vehicle);
    const opBonus = getOperatorBonus(operator);
    const weights = getModeWeights(mode);

    if (!wScore) return null;

    // 武器综合分
    const weaponTotal = wScore.attack * 0.3 + wScore.accuracy * 0.2 + wScore.control * 0.2 + wScore.mobility * 0.15 + wScore.handling * 0.15;

    // 载具综合分（havoc模式有载具加成）
    const vehicleBonus = vScore ? (
      vScore.attack * 0.35 + vScore.defense * 0.3 + vScore.mobility * 0.2 + vScore.tactical * 0.15
    ) : 0;

    // 干员加成
    const opBonusValue = (opBonus.mobility || 0) + (opBonus.ammo_capacity || 0) / 2 + (opBonus.range || 0);

    // 最终综合分
    let finalScore;
    if (mode === 'havoc' && vehicle) {
      finalScore = weaponTotal * 0.6 + vehicleBonus * 0.3 + (opBonusValue / 3);
    } else {
      finalScore = weaponTotal * 0.75 + (opBonusValue / 3);
    }

    // 归一化到0-100
    const score = Math.round(Math.min(Math.max(finalScore, 0), 100));

    // 计算各维度分
    const attackDim = Math.round(Math.min(wScore.attack + (vScore ? vScore.attack * 0.2 : 0) + (opBonus.attack || 0), 100));
    const defenseDim = Math.round(Math.min(
      (wScore.control * 0.3 + wScore.mobility * 0.3 + wScore.damage * 0.2) +
      (vScore ? vScore.defense * 0.15 : 0) +
      (opBonus.mobility || 0) * 0.5, 100
    ));
    const mobilityDim = Math.round(Math.min(wScore.mobility + (vScore ? vScore.mobility * 0.15 : 0) + (opBonus.mobility || 0), 100));
    const sustainDim = Math.round(Math.min(
      wScore.handling * 0.4 + wScore.range * 0.3 + (opBonus.ammo_capacity || 0) * 0.3, 100
    ));

    return {
      total: score,
      dimensions: {
        attack: attackDim,
        defense: defenseDim,
        mobility: mobilityDim,
        sustain: sustainDim
      },
      weaponScore: wScore,
      vehicleScore: vScore
    };
  }

  // 生成优劣分析文字
  function generateAnalysis(buildScore, weapon, vehicle, operator, mode) {
    const pros = [];
    const cons = [];
    const tags = [];
    const w = weapon;
    const v = vehicle;
    const op = operator;
    const ws = buildScore.weaponScore;

    if (!w) return { pros, cons, tags };

    // 武器类型分析
    if (w.type === '突击步枪') {
      if (ws.damage >= 72) { pros.push('高伤害突击步枪，近中距离输出强势'); }
      if (ws.range >= 68) { pros.push('射程表现优秀，适合多种交战距离'); }
      if (ws.accuracy >= 78) { pros.push('精准度高，中远距离点射稳定性好'); }
      if (ws.mobility >= 82) { pros.push('机动性出色，遭遇战和转点能力强'); }
    }

    if (w.type === '冲锋枪') {
      if (ws.rate_of_fire >= 900) { pros.push('超高射速，近距离贴脸战几乎无敌'); }
      if (ws.mobility >= 90) { pros.push('移速极快，绕后和撤离游刃有余'); }
      pros.push('冲锋枪适合危险行动室内CQB，近战为王');
      if (ws.range < 40) { cons.push('射程极短，中远距离几乎无法有效输出'); }
      if (ws.damage < 50) { cons.push('单发伤害低，需要命中大量弹丸才能击杀'); }
    }

    if (w.type === '狙击步枪') {
      if (ws.damage >= 95) { pros.push('狙击步枪，一击毙命的高伤害'); }
      if (ws.range >= 98) { pros.push('全游戏最远射程，发现即消灭'); }
      if (ws.mobility < 55) { cons.push('机动性极差，转移和被近身时极度危险'); }
      if (ws.control >= 88) { pros.push('后坐力可控，远程狙击稳定性高'); }
      cons.push('狙击步枪需要耐心和点位意识，新手不友好');
    }

    if (w.type === '精确射手步枪') {
      pros.push('精确射手步枪，兼顾精准和持续输出');
      if (ws.accuracy >= 85) { pros.push('精准度极高，半自动火力压制效率好'); }
      if (ws.damage >= 80) { pros.push('伤害较高，可有效击杀中距离目标'); }
    }

    if (w.type === '轻机枪' || w.type === '通用机枪') {
      pros.push('轻机枪持续火力压制，面积杀伤能力强');
      if (ws.mobility < 58) { cons.push('机动性差，不适合需要频繁移动的战术'); }
      if (ws.control < 60) { cons.push('后坐力较大，需要压枪技巧'); }
    }

    if (w.type === '战斗步枪') {
      if (ws.damage >= 82) { pros.push('战斗步枪高伤害，.762弹药穿甲能力出色'); }
      if (ws.range >= 78) { pros.push('射程优秀，远距离交火占优'); }
      pros.push('战斗步枪是危险行动中远距离的强力选择');
      if (ws.mobility < 68) { cons.push('机动性一般，被冲锋枪贴脸时处于劣势'); }
    }

    if (w.type === '霰弹枪') {
      if (ws.damage >= 90) { pros.push('近距离霰弹枪伤害爆炸，一发入魂'); }
      if (ws.mobility >= 80) { pros.push('霰弹枪机动性不错，可以快速贴脸'); }
      if (ws.range < 25) { pros.push('霰弹枪仅限近距离，超过10米威力骤降'); }
      cons.push('霰弹枪用途单一，超出近距几乎无用');
    }

    // 弹药分析
    if (w.ammo_type && w.ammo_type.length > 0) {
      const ammoId = w.ammo_type[0];
      if (['762x51', '300-win', '338-lapua'].includes(ammoId)) {
        pros.push('使用7.62mm/.300/.338等大口径弹药，穿甲能力极强');
      }
      if (['556x45', '545x39'].includes(ammoId)) {
        pros.push('使用5.56/5.45mm弹药，后坐力可控，射速高');
      }
      if (['9x39'].includes(ammoId)) {
        pros.push('使用9x39亚音速弹药，消音效果极佳');
      }
    }

    // 干员分析
    if (op) {
      if (op.id === 'luna') { pros.push('露娜的猎犬技能可提供额外伤害来源'); }
      if (op.id === 'stinger') { pros.push('毒刺的补给无人机保障弹药续航'); }
      if (op.id === 'j93k') { pros.push('98K的狙击手本能提升开镜速度'); }
      if (op.id === 'raccoon') { pros.push('浣熊驾驶载具时速度+8%，适合全面战场'); }
      if (op.id === 'wanwan') { pros.push('玩玩的声波陷阱提供区域控制能力'); }
      if (op.id === 'black_cat') { pros.push('黑猫的近战加成使霰弹枪/冲锋枪更致命'); }
    }

    // 载具分析（havoc模式）
    if (mode === 'havoc' && v) {
      if (v.type === '主战坦克') {
        pros.push(`【全面战场】${v.name_cn}正面装甲防护极佳，主炮威力巨大`);
        cons.push(`【全面战场】${v.name_cn}机动性差，容易被反坦克武器针对`);
      }
      if (v.type === '武装直升机') {
        pros.push(`【全面战场】${v.name_cn}是空中坦克杀手，机动灵活`);
        cons.push(`【全面战场】${v.name_cn}装甲较弱，怕防空炮`);
      }
      if (v.type === '运输直升机') {
        pros.push(`【全面战场】${v.name_cn}载员量大，适合快速部署步兵班`);
        cons.push(`【全面战场】${v.name_cn}装甲极薄，需防空掩护`);
      }
    }

    // 模式推荐标签
    if (mode === 'warfare') {
      if (ws.range >= 70 && ws.damage >= 70) { tags.push('全面战场强势'); }
      if (ws.mobility >= 80) { tags.push('全面战场跑点'); }
    } else {
      if (ws.rate_of_fire >= 850) { tags.push('危险行动近战'); }
      if (ws.damage >= 75) { tags.push('危险行动秒杀'); }
      if (ws.mobility >= 85) { tags.push('危险行动机动'); }
    }

    if (w.meta_tier === 'S') { tags.push('版本S级'); }
    if (w.meta_tier === 'A') { tags.push('版本A级'); }

    return {
      pros: pros.slice(0, 5),
      cons: cons.slice(0, 4),
      tags
    };
  }

  // 查找相似/替代方案
  function findSimilarWeapons(weapon, weapons, limit = 4) {
    if (!weapon) return [];

    return weapons
      .filter(w => w.id !== weapon.id)
      .map(w => {
        // 简单相似度计算：同类型 + 数值接近
        let score = 0;
        if (w.type === weapon.type) score += 30;
        if (w.mode === weapon.mode || w.mode === 'both') score += 20;
        score += 100 - Math.abs((w.base_stats.damage || 0) - (weapon.base_stats.damage || 0));
        score += 100 - Math.abs((w.base_stats.mobility || 0) - (weapon.base_stats.mobility || 0));
        score += 100 - Math.abs((w.base_stats.range || 0) - (weapon.base_stats.range || 0));

        const buildScore = calculateBuildScore(w, null, null, weapon.mode === 'both' ? 'operations' : weapon.mode, w.ammo_type?.[0]);
        return { weapon: w, score: Math.round(score), totalScore: buildScore?.total || 0 };
      })
      .filter(item => item.score > 100)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  // ---- 战备中心：应用配件加成 ----
  function calcWeaponWithAttachments(weapon, selectedAttachments) {
    if (!weapon) return null;
    const base = weapon.base_stats;
    const mods = { damage: 0, rate_of_fire: 0, accuracy: 0, range: 0, control: 0, mobility: 0, handling: 0 };

    Object.values(selectedAttachments).forEach(attId => {
      if (!attId || !ATTACHMENTS_DATA) return;
      const att = ATTACHMENTS_DATA.find(a => a.id === attId);
      if (!att || !att.stat_mods) return;
      Object.entries(att.stat_mods).forEach(([key, val]) => {
        if (key in mods) mods[key] += val;
      });
    });

    const cap = (v, min = 0, max = 100) => Math.max(min, Math.min(max, v));
    const rofCap = (v) => Math.max(0, Math.min(1200, v));

    return {
      damage: cap(base.damage + mods.damage),
      rate_of_fire: rofCap(base.rate_of_fire + mods.rate_of_fire),
      accuracy: cap(base.accuracy + mods.accuracy),
      range: cap(base.range + mods.range),
      control: cap(base.control + mods.control),
      mobility: cap(base.mobility + mods.mobility),
      handling: cap(base.handling + mods.handling)
    };
  }

  // ---- 战备中心：应用战备装备加成 ----
  function calcGearBonuses(selectedGear) {
    const bonus = { armor: 0, stealth: 0, mobility: 0, handling: 0, accuracy: 0 };
    Object.values(selectedGear).forEach(gearId => {
      if (!gearId || !BATTLE_GEAR_DATA) return;
      const gear = BATTLE_GEAR_DATA.find(g => g.id === gearId);
      if (!gear || !gear.stat_mods) return;
      Object.entries(gear.stat_mods).forEach(([key, val]) => {
        if (key in bonus) bonus[key] += val;
      });
    });
    return bonus;
  }

  // ---- 战备中心：计算总金额 ----
  function calcTotalCost(weapon, selectedAttachments, selectedGear, selectedAmmo) {
    let total = 0;
    // 武器价格
    if (weapon && weapon.price) {
      total += weapon.price;
    }
    // 配件价格
    Object.values(selectedAttachments).forEach(attId => {
      if (!attId || !ATTACHMENTS_DATA) return;
      const att = ATTACHMENTS_DATA.find(a => a.id === attId);
      if (att) total += (att.price || 0);
    });
    // 战备装备价格
    Object.values(selectedGear).forEach(gearId => {
      if (!gearId || !BATTLE_GEAR_DATA) return;
      const gear = BATTLE_GEAR_DATA.find(g => g.id === gearId);
      if (gear) total += (gear.price || 0);
    });
    // 弹药价格
    if (selectedAmmo && selectedAmmo.price) {
      total += selectedAmmo.price;
    }
    return total;
  }

  // ---- 战备中心：计算带配件加成的武器评分 ----
  function calcGearWeaponScore(weapon, selectedAttachments) {
    if (!weapon) return null;
    const s = calcWeaponWithAttachments(weapon, selectedAttachments);
    if (!s) return null;

    const ammo = AmmoDB.get(weapon.ammo_type?.[0]) || {};
    const rofNorm = Math.min(s.rate_of_fire / 12, 100);

    const attack = s.damage * 0.35 + rofNorm * 0.25 + s.accuracy * 0.2 + s.range * 0.2;
    const accuracy = s.accuracy * 0.6 + (ammo.penetration || 50) * 0.2 + s.control * 0.2;
    const control = s.control * 0.7 + s.accuracy * 0.2 + (ammo.penetration || 50) * 0.1;
    const range = s.range * 0.8 + (ammo.stats?.range || 50) * 0.2;

    return {
      attack: Math.round(Math.min(attack, 100) * 10) / 10,
      accuracy: Math.round(Math.min(accuracy, 100) * 10) / 10,
      control: Math.round(Math.min(control, 100) * 10) / 10,
      range: Math.round(Math.min(range, 100) * 10) / 10,
      mobility: s.mobility,
      handling: s.handling,
      damage: s.damage,
      rof: s.rate_of_fire
    };
  }

  return {
    calcWeaponScore,
    calcVehicleScore,
    calculateBuildScore,
    generateAnalysis,
    findSimilarWeapons,
    calcWeaponWithAttachments,
    calcGearBonuses,
    calcTotalCost,
    calcGearWeaponScore
  };
})();
