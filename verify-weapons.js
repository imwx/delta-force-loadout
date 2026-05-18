/**
 * 三角洲行动武器列表交叉验证脚本
 * 基准：Dexerto Season 1 列表（45把）
 * 检查：当前 weapons.json（60把）
 */

const fs = require('fs');

// Dexerto Season 1 完整列表（英文名为准）
const DEXERTO_WEAPONS = [
  // Assault Rifles (14)
  'CAR-15', 'AKS-74', 'M16A4', 'QBZ95-1', 'K416', 'M4A1', 'SG552', 'AUG', 'AK-12', 'PTR-32', 'AKM', 'AS Val', 'CL-19', 'Type 191',
  // Battle Rifles (4)
  'G3', 'M7', 'SCAR-H', 'ASh-12',
  // SMGs (9)
  'Uzi', 'Bizon', 'SMG-45', 'MP7', 'P90', 'MP5', 'SR-3M', 'Vityaz', 'Vector',
  // LMGs (3)
  'M249', 'PKM', 'M250',
  // Snipers (4)
  'SV-98', 'R93', 'M700', 'AWM',
  // DMRs/MRs (7)
  'Mini-14', 'PSG-1', 'VSS', 'SVD', 'SR-25', 'M14', 'SKS',
  // Shotguns (3)
  'M870', 'M1014', 'S12K',
  // Pistols (7)
  'G17', 'QSZ-92G', 'Desert Eagle', '93R', 'G18', '.357 Revolver', 'M1911'
];

// 后续赛季确认新增的武器（需保留）
const LATER_SEASON = [
  'M82',      // S9 巴雷特
  'AR57',     // S9
  '腾龙',      // S4/S5
  '725',       // S4 双管霰弹枪
  'FS-12',    // S8 霰弹枪
  'MK47',     // S5/S8
  'KC17',     // S5
  'K437',     // S4
  '复合弓',    // S4
  'SR-25',    // 已在Dexerto DMR列表中
];

function normalizeName(name) {
  return name.toLowerCase().replace(/[\s\-\.]/g, '');
}

function main() {
  const weapons = JSON.parse(fs.readFileSync('./data/weapons.json', 'utf8'));
  
  console.log(`当前 weapons.json 共 ${weapons.length} 把武器\n`);
  
  // 检查当前列表中哪些不在 Dexerto 列表里
  const dexertoNormalized = DEXERTO_WEAPONS.map(n => normalizeName(n));
  
  const extra = [];
  const missing = [];
  
  weapons.forEach(w => {
    const cn = w.name_cn;
    const en = w.name_en || '';
    const enNormalized = normalizeName(en);
    const cnNormalized = normalizeName(cn);
    
    // 检查是否在 Dexerto 列表中
    const inDexerto = dexertoNormalized.some(d => 
      enNormalized.includes(d) || d.includes(enNormalized)
    );
    
    if (!inDexerto) {
      // 检查是否是后续赛季的武器
      const isLaterSeason = LATER_SEASON.some(s => 
        cn.includes(s) || en.includes(s)
      );
      if (!isLaterSeason) {
        extra.push({ id: w.id, cn, en, type: w.type });
      }
    }
  });
  
  console.log('=== 可能编造/多余的武器（不在 Dexerto S1 列表，也非确认后续赛季武器）===');
  if (extra.length === 0) {
    console.log('无（所有武器都在基准列表或已确认后续赛季中）');
  } else {
    extra.forEach(w => {
      console.log(`  ${w.id}: ${w.cn} (${w.en}) [${w.type}]`);
    });
  }
  
  console.log(`\n共 ${extra.length} 把可疑武器\n`);
  
  // 检查 Dexerto 列表里哪些不在当前 weapons.json
  console.log('=== Dexerto S1 列表中存在但当前 weapons.json 缺失的武器 ===');
  DEXERTO_WEAPONS.forEach(dw => {
    const found = weapons.some(w => {
      const enNorm = normalizeName(w.name_en || '');
      const cnNorm = normalizeName(w.name_cn || '');
      const dNorm = normalizeName(dw);
      return enNorm.includes(dNorm) || dNorm.includes(enNorm);
    });
    if (!found) {
      missing.push(dw);
      console.log(`  缺失: ${dw}`);
    }
  });
  
  if (missing.length === 0) {
    console.log('  无缺失');
  }
  
  console.log(`\n共 ${missing.length} 把缺失武器`);
  
  // 输出当前 weapons.json 所有武器的名称和ID
  console.log('\n=== 当前 weapons.json 完整列表 ===');
  weapons.forEach(w => {
    const inDexerto = dexertoNormalized.some(d => {
      const enNorm = normalizeName(w.name_en || '');
      const dNorm = normalizeName(d);
      return enNorm.includes(dNorm) || dNorm.includes(enNorm);
    });
    const marker = inDexerto ? '✓' : '?';
    console.log(`  ${marker} ${w.id}: ${w.name_cn} (${w.name_en}) [${w.type}]`);
  });
}

main();
