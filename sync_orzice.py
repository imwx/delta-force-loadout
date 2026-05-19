#!/usr/bin/env python3
"""
用 Playwright 抓取的 orzice.com 真实数据同步到各 JSON
支持模糊名称匹配
"""

import json, re, os

SCRAPED = 'orzice_scraped.json'
WEAPONS = 'data/weapons.json'
AMMO = 'data/ammo.json'
ATTACHMENTS = 'data/attachments.json'
BATTLE_GEAR = 'data/battle-gear.json'

def load_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def norm(s):
    return s.strip().lower()

def strip_type(name):
    """去掉类型词（步枪/突击步枪/战斗步枪/冲锋枪等），只留核心名称"""
    types = ['狙击步枪','射手步枪','突击步枪','战斗步枪','冲锋枪','霰弹枪','手枪','机枪',
             '冲锋步枪','霰弹','手枪','狙击','机枪','步枪']
    result = name
    for t in types:
        if t in result:
            result = result.replace(t, '').strip()
    return result

def fuzzy_match(name, candidates, name_field='name_cn', threshold=60):
    """
    三级匹配：
    1. 精确匹配
    2. 去掉类型词后核心名匹配
    3. 包含匹配
    """
    n = norm(name)
    n_core = norm(strip_type(name))

    best = None, 0
    for c in candidates:
        cn = norm(c.get(name_field, ''))
        cn_core = norm(strip_type(c.get(name_field, '')))

        score = 0

        # 精确
        if cn == n:
            score = 100
        # 核心名精确
        elif cn_core and cn_core == n_core:
            score = 90
        # 包含（核心）
        elif cn_core and (n_core in cn_core or cn_core in n_core):
            score = 75
        # 包含（原始）
        elif cn and (n in cn or cn in n):
            score = 60
        # 部分匹配（首词匹配）
        elif cn_core and cn_core.split()[0] == n_core.split()[0]:
            score = 50

        if score > best[1]:
            best = c, score

    return best

def is_gun(name):
    n = norm(name)
    return any(k in n for k in ['狙击','步枪','冲锋','霰弹','手枪','机枪'])

def is_ammo(name):
    """子弹特征：含口径如 5.56/.300/7.62 等"""
    n = norm(name)
    if is_gun(name):
        return False
    return bool(re.search(r'\d+\.?\d*x\d+|x\d+mm|\.\d+', n))

def main():
    scraped = load_json(SCRAPED)
    print(f'抓取数据: {len(scraped)} 条\n')

    # 分类
    gun_items = [s for s in scraped if is_gun(s['name'])]
    ammo_items = [s for s in scraped if is_ammo(s['name'])]
    equip_items = [s for s in scraped if not is_gun(s['name']) and not is_ammo(s['name'])]
    print(f'分类: 枪械={len(gun_items)}, 子弹={len(ammo_items)}, 战备={len(equip_items)}')

    # === weapons.json ===
    print('\n=== 同步 weapons.json ===')
    weapons = load_json(WEAPONS)
    updated_weapons = 0
    for item in weapons:
        match, score = fuzzy_match(item.get('name_cn',''), gun_items, name_field='name')
        if match and score >= 50:
            old = item.get('price', 0)
            item['price'] = match['price3']
            item['loadout_price'] = match['price3']
            item['price_3d'] = match['price3']
            item['price_7d'] = match['price7']
            item['price_30d'] = match['price30']
            print(f'  [{score}] {item["name_cn"]} -> {match["price3"]:,} (was {old:,})')
            updated_weapons += 1
    save_json(WEAPONS, weapons)
    print(f'  武器更新: {updated_weapons}/{len(weapons)}')

    # === ammo.json ===
    print('\n=== 同步 ammo.json ===')
    ammo = load_json(AMMO)
    updated_ammo = 0
    for item in ammo:
        match, score = fuzzy_match(item.get('name_cn',''), ammo_items, name_field='name')
        if match and score >= 50:
            old = item.get('price', 0)
            item['price'] = match['price3']
            item['price_current'] = match['price3']
            item['price_3d'] = match['price3']
            item['price_7d'] = match['price7']
            item['price_30d'] = match['price30']
            print(f'  [{score}] {item["name_cn"]} -> {match["price3"]:,} (was {old:,})')
            updated_ammo += 1
    save_json(AMMO, ammo)
    print(f'  子弹更新: {updated_ammo}/{len(ammo)}')

    # === attachments.json ===
    print('\n=== 同步 attachments.json ===')
    attachments = load_json(ATTACHMENTS)
    updated_attachments = 0
    for item in attachments:
        match, score = fuzzy_match(item.get('name_cn',''), equip_items, name_field='name')
        if match and score >= 50:
            old = item.get('price', 0)
            item['price'] = match['price3']
            item['price_3d'] = match['price3']
            item['price_7d'] = match['price7']
            item['price_30d'] = match['price30']
            print(f'  [{score}] {item["name_cn"]} -> {match["price3"]:,} (was {old:,})')
            updated_attachments += 1
    save_json(ATTACHMENTS, attachments)
    print(f'  配件更新: {updated_attachments}/{len(attachments)}')

    # === battle-gear.json ===
    print('\n=== 同步 battle-gear.json ===')
    gear = load_json(BATTLE_GEAR)
    updated_gear = 0
    for item in gear:
        match, score = fuzzy_match(item.get('name',''), equip_items, name_field='name')
        if match and score >= 50:
            old = item.get('price', 0)
            item['price'] = match['price3']
            item['price_3d'] = match['price3']
            item['price_7d'] = match['price7']
            item['price_30d'] = match['price30']
            print(f'  [{score}] {item["name"]} -> {match["price3"]:,} (was {old:,})')
            updated_gear += 1
    save_json(BATTLE_GEAR, gear)
    print(f'  战备更新: {updated_gear}/{len(gear)}')

    print(f'\n=== 汇总 ===')
    print(f'武器 {updated_weapons}, 子弹 {updated_ammo}, 配件 {updated_attachments}, 战备 {updated_gear}')
    print(f'AWM:', next((w['price'] for w in weapons if 'AWM' in w.get('name_cn','')), '未找到'))

if __name__ == '__main__':
    main()
