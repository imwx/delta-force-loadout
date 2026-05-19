#!/usr/bin/env python3
"""
用 Playwright 抓取的 orzice.com 真实数据同步到各 JSON
增强版：支持手枪/弓在战备section、口径归一化、3日价兜底7日价
"""
import json, re, sys

SCRAPED = 'orzice_scraped.json'
WEAPONS = 'data/weapons.json'
AMMO = 'data/ammo.json'
ATTACHMENTS = 'data/attachments.json'
BATTLE_GEAR = 'data/battle-gear.json'

def norm(s): return s.strip().lower()

def strip_type(name):
    """去掉类型词（突击/狙击/射手/战斗步枪、冲锋/霰弹/手枪/机枪等）"""
    types = ['狙击步枪','射手步枪','突击步枪','战斗步枪','冲锋枪','霰弹枪',
             '冲锋步枪','霰弹','手枪','狙击','机枪','步枪','机枪']
    result = name
    for t in types:
        if t in result:
            result = result.replace(t, '').strip()
    return result

def normalize_caliber(name):
    """归一化口径符号"""
    return name.replace('\u00d7','x').replace('*','x').replace(' ','')

def fuzzy_match(name, candidates, name_field='name', threshold=50):
    """多级模糊匹配"""
    n = norm(name)
    n_core = norm(strip_type(name))
    n_caliber = normalize_caliber(n)
    best = None, 0
    for c in candidates:
        cn = norm(c.get(name_field,''))
        cn_core = norm(strip_type(c.get(name_field,'')))
        cn_caliber = normalize_caliber(cn)
        score = 0
        if cn == n: score = 100
        elif cn_core and cn_core == n_core: score = 90
        elif cn_core and (n_core in cn_core or cn_core in n_core): score = 75
        elif cn and (n in cn or cn in n): score = 60
        elif cn_caliber and cn_caliber == n_caliber: score = 55
        elif cn_core and cn_core.split()[0] == n_core.split()[0]: score = 50
        if score > best[1]: best = c, score
    return best

def is_gun(name):
    n = norm(name)
    return any(k in n for k in ['狙击','步枪','冲锋','霰弹','手枪','机枪'])

def is_ammo(name):
    """含口径特征（5.56/7.62/.300等）且非武器"""
    n = norm(name)
    if is_gun(name): return False
    return bool(re.search(r'\d+\.?\d*x\d+|x\d+mm|\.\d+', n))

def get_price(item):
    """优先3日价，若为0则用7日价"""
    p = item.get('price3') or 0
    if p <= 0: p = item.get('price7', 0)
    return p

def update_item(item, match):
    """用抓取数据更新物品价格字段"""
    p3 = match.get('price3') or 0
    p7 = match.get('price7', 0)
    p30 = match.get('price30', p7)
    p = p3 if p3 > 0 else p7
    return p, p7, p30

def main():
    scraped = json.load(open(SCRAPED,'r',encoding='utf-8'))
    print(f'抓取数据: {len(scraped)} 条\n')

    # 分类
    gun_section = [s for s in scraped if is_gun(s['name'])]
    equip_section = [s for s in scraped if not is_gun(s['name'])]

    # 手枪/弓在战备section（分类错误）
    pistol_kw = ['沙漠之鹰','g17','g18','m1911','93r','qsz92g','左轮']
    bow_kw = ['复合弓']
    pistols = [s for s in equip_section if any(p in norm(s['name']) for p in pistol_kw)]
    bows = [s for s in equip_section if any(p in norm(s['name']) for p in bow_kw)]
    ammo_section = [s for s in equip_section if is_ammo(s['name'])]
    pure_gear = [s for s in equip_section
                 if not is_ammo(s['name'])
                 and not any(p in norm(s['name']) for p in pistol_kw)
                 and not any(p in norm(s['name']) for p in bow_kw)]

    weapon_pool = gun_section + pistols + bows
    print(f'分类: 武器={len(weapon_pool)}, 弹药={len(ammo_section)}, 战备={len(pure_gear)}')

    # === weapons.json ===
    print('\n=== weapons.json ===')
    weapons = json.load(open(WEAPONS,'r',encoding='utf-8'))
    updated_w, unmatched_w = 0, []
    for item in weapons:
        m, score = fuzzy_match(item.get('name_cn',''), weapon_pool)
        if m and score >= 50:
            p, p7, p30 = update_item(item, m)
            if p > 0:
                item['price'] = item['loadout_price'] = item['price_3d'] = p
                item['price_7d'] = p7; item['price_30d'] = p30
                updated_w += 1
            else:
                unmatched_w.append(item['name_cn'])
        else:
            unmatched_w.append(item['name_cn'])
    json.dump(weapons, open(WEAPONS,'w',encoding='utf-8'), ensure_ascii=False, indent=2)
    print(f'  更新: {updated_w}/{len(weapons)}  未匹配: {unmatched_w}')

    # === ammo.json ===
    print('\n=== ammo.json ===')
    ammo = json.load(open(AMMO,'r',encoding='utf-8'))
    updated_a, unmatched_a = 0, []
    for item in ammo:
        m, score = fuzzy_match(item.get('name_cn',''), ammo_section)
        if m and score >= 50:
            p, p7, p30 = update_item(item, m)
            if p > 0:
                item['price'] = item['price_current'] = item['price_3d'] = p
                item['price_7d'] = p7; item['price_30d'] = p30
                updated_a += 1
            else:
                unmatched_a.append(item['name_cn'])
        else:
            unmatched_a.append(item['name_cn'])
    json.dump(ammo, open(AMMO,'w',encoding='utf-8'), ensure_ascii=False, indent=2)
    print(f'  更新: {updated_a}/{len(ammo)}  未匹配: {unmatched_a[:10]}')
    if len(unmatched_a) > 10: print(f'  ... 还有 {len(unmatched_a)-10} 条')

    # === attachments.json ===
    print('\n=== attachments.json ===')
    attachments = json.load(open(ATTACHMENTS,'r',encoding='utf-8'))
    updated_at = 0
    for item in attachments:
        m, score = fuzzy_match(item.get('name_cn',''), pure_gear)
        if m and score >= 50:
            p, p7, p30 = update_item(item, m)
            if p > 0:
                item['price'] = item['price_3d'] = p
                item['price_7d'] = p7; item['price_30d'] = p30
                updated_at += 1
    json.dump(attachments, open(ATTACHMENTS,'w',encoding='utf-8'), ensure_ascii=False, indent=2)
    print(f'  更新: {updated_at}/{len(attachments)}')

    # === battle-gear.json ===
    print('\n=== battle-gear.json ===')
    gear = json.load(open(BATTLE_GEAR,'r',encoding='utf-8'))
    # 清理武器条目
    weapon_kw = ['枪','步枪','狙击','冲锋','霰弹','手枪','机枪','弓','弩']
    guns_in_gear = [g for g in gear if any(k in (g.get('name_cn') or g.get('name') or '') for k in weapon_kw)]
    gear_pure = [g for g in gear if not any(k in (g.get('name_cn') or g.get('name') or '') for k in weapon_kw)]
    print(f'  清理: {len(gear)} -> {len(gear_pure)} (移除{len(guns_in_gear)}条武器)')

    updated_g, unmatched_g = 0, []
    for item in gear_pure:
        nm = item.get('name_cn') or item.get('name','')
        m, score = fuzzy_match(nm, pure_gear)
        if m and score >= 50:
            p, p7, p30 = update_item(item, m)
            if p > 0:
                item['price'] = item['price_3d'] = p
                item['price_7d'] = p7; item['price_30d'] = p30
                updated_g += 1
            else:
                unmatched_g.append(nm)
        else:
            unmatched_g.append(nm)
    json.dump(gear_pure, open(BATTLE_GEAR,'w',encoding='utf-8'), ensure_ascii=False, indent=2)
    print(f'  更新: {updated_g}/{len(gear_pure)}  未匹配: {unmatched_g[:5]}')

    print(f'\n=== 汇总 ===')
    awm = next((w['price'] for w in weapons if 'AWM' in w.get('name_cn','')), '未找到')
    print(f'武器 {updated_w}, 弹药 {updated_a}, 配件 {updated_at}, 战备 {updated_g}')
    print(f'AWM: {awm:,}' if isinstance(awm,int) else f'AWM: {awm}')

if __name__ == '__main__':
    main()
