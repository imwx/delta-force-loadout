/**
 * 修正 weapons.json：
 * 1. 删除 w18 MK4冲锋枪（编造）
 * 2. 新增 CL-19 突击步枪
 * 3. 新增 Type 191（191式）突击步枪
 * 4. 新增 M82 巴雷特 反器材狙击步枪（S9）
 * 5. 新增 AR57 突击步枪（S9）
 */

const fs = require('fs');
const path = require('path');

const JSON_PATH = path.join(__dirname, 'data/weapons.json');

function main() {
  const weapons = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
  console.log(`原始数量：${weapons.length}`);

  // 1. 删除 MK4冲锋枪（编造）
  const beforeCount = weapons.length;
  const filtered = weapons.filter(w => w.id !== 'w18');
  console.log(`删除 w18 MK4冲锋枪（编造），${beforeCount} → ${filtered.length}`);

  // 新增武器模板（需要补充准确数据）
  const newWeapons = [
    {
      id: 'w61',
      name_cn: 'CL-19突击步枪',
      name_en: 'CL-19 AR',
      type: '突击步枪',
      type_en: 'Assault Rifle',
      mode: 'both',
      base_stats: { damage: 72, rate_of_fire: 750, accuracy: 78, range: 70, control: 72, mobility: 74, handling: 70 },
      ammo_type: ['5.56'],
      meta_tier: 'A',
      unlock_level: 43,
      game_id: 0, // 需要补充
      copy_count: 0,
      tags: [],
      loadout_price: 0,
      price: 0
    },
    {
      id: 'w62',
      name_cn: '191式突击步枪',
      name_en: 'Type 191 AR',
      type: '突击步枪',
      type_en: 'Assault Rifle',
      mode: 'both',
      base_stats: { damage: 70, rate_of_fire: 660, accuracy: 82, range: 72, control: 76, mobility: 76, handling: 72 },
      ammo_type: ['5.56'],
      meta_tier: 'S',
      unlock_level: 43,
      game_id: 0, // 需要补充
      copy_count: 0,
      tags: ['国产', 'S2新增'],
      loadout_price: 0,
      price: 0
    },
    {
      id: 'w63',
      name_cn: 'M82巴雷特',
      name_en: 'M82 Sniper',
      type: '狙击步枪',
      type_en: 'Sniper Rifle',
      mode: 'both',
      base_stats: { damage: 125, rate_of_fire: 60, accuracy: 92, range: 100, control: 85, mobility: 40, handling: 45 },
      ammo_type: ['.50 BMG'],
      meta_tier: 'S',
      unlock_level: 1, // S9赛季通行证/解锁
      game_id: 0, // 需要补充
      copy_count: 0,
      tags: ['反器材', 'S9新增', '大口径'],
      loadout_price: 0,
      price: 0
    },
    {
      id: 'w64',
      name_cn: 'AR57突击步枪',
      name_en: 'AR57 AR',
      type: '突击步枪',
      type_en: 'Assault Rifle',
      mode: 'both',
      base_stats: { damage: 58, rate_of_fire: 900, accuracy: 78, range: 55, control: 70, mobility: 85, handling: 82 },
      ammo_type: ['5.7x28mm'],
      meta_tier: 'S',
      unlock_level: 1, // S9赛季通行证/解锁
      game_id: 0, // 需要补充
      copy_count: 0,
      tags: ['S9新增', '高速弹药'],
      loadout_price: 0,
      price: 0
    }
  ];

  // 去重检查
  newWeapons.forEach(nw => {
    const exists = filtered.some(w => w.name_cn === nw.name_cn || w.name_en === nw.name_en);
    if (exists) {
      console.log(`  跳过（已存在）: ${nw.name_cn}`);
    }
  });

  const toAdd = newWeapons.filter(nw => 
    !filtered.some(w => w.name_cn === nw.name_cn || w.name_en === nw.name_en)
  );

  const result = [...filtered, ...toAdd];
  console.log(`新增 ${toAdd.length} 把武器，最终数量：${result.length}`);

  // 写回
  fs.writeFileSync(JSON_PATH, JSON.stringify(result, null, 2), 'utf8');
  console.log(`\n已写入 ${JSON_PATH}`);
  console.log('\n⚠️ 注意：新增武器的 game_id、copy_count、loadout_price、price 需要补充准确数据！');
}

main();
