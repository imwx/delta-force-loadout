#!/usr/bin/env python3
"""从烽火行动网站提取完整改枪码数据"""
import json, re

with open('../gqm.html', 'r', encoding='utf-8') as f:
    html = f.read()

codes = []

# 提取 STD 数据 (通用改枪码)
# STD 在 line 838-1041
std_start = html.find('const STD = {')
std_end = html.find('const SUIT = [')
std_text = html[std_start:std_end]
# 移除 "const STD = {" 和结尾的 "};"
std_text = std_text.replace('const STD = {', '').rstrip().rstrip(';').rstrip()

# 提取每个武器块
weapon_blocks = re.findall(r'"([^"]+)":\s*\[([\s\S]*?)\n\]', std_text)
for weapon, items_text in weapon_blocks:
    items = re.findall(r'\{([^}]+)\}', items_text)
    for item in items:
        code = {
            'weapon_id': weapon.lower().replace(' ', '-'),
            'weapon_name': weapon,
            'source': 'std',
            'type': '通用',
            'type_color': 'blue'
        }
        for k, v in re.findall(r'(\w+):"([^"]*)"', item):
            if k == 'c': code['code'] = v
            elif k == 'p':
                code['price'] = int(v.replace('w','')) * 10000
                code['price_display'] = v
            elif k == 's': code['scope'] = v
            elif k == 'm': code['magazine'] = v
            elif k == 'r': code['name'] = v
            elif k == 'id': code['external_id'] = v
            elif k == 't': code['tag_type'] = v
        if 'code' in code:
            codes.append(code)

print(f"通用改枪码: {len(codes)} 条")

# 提取 SUIT 数据 (制式套装)
suit_start = html.find('const SUIT = [')
suit_end = html.find('const CUSTOM = {')
suit_text = html[suit_start:suit_end].replace('const SUIT = [', '').rstrip().rstrip(';').rstrip()
suit_items = re.findall(r'\{([^}]+)\}', suit_text)
for item in suit_items:
    code = {'source': 'suit', 'type': '制式套装', 'type_color': 'orange'}
    for k, v in re.findall(r'(\w+):"([^"]*)"', item):
        if k == 'c': code['code'] = v
        elif k == 'gun':
            code['weapon_name'] = v
            code['weapon_id'] = v.lower().replace(' ', '-')
        elif k == 'id': code['external_id'] = v
        elif k == 'rank': code['rank'] = v
        elif k == 'type': code['style'] = v
    if 'code' in code and 'weapon_name' in code:
        code['name'] = code['weapon_name'] + ' ' + code.get('rank','') + ' ' + code.get('style','')
        codes.append(code)

suit_count = sum(1 for c in codes if c.get('source') == 'suit')
print(f"制式套装: {suit_count} 条")

# 提取 CUSTOM 数据 (客户定制)
custom_start = html.find('const CUSTOM = {')
custom_text = html[custom_start:].replace('const CUSTOM = {', '', 1)
# 找到结尾
custom_end = custom_text.find('};')
custom_text = custom_text[:custom_end].rstrip()

weapon_blocks = re.findall(r'"([^"]+)":\s*\[([\s\S]*?)\n\]', custom_text)
for weapon, items_text in weapon_blocks:
    items = re.findall(r'\{([^}]+)\}', items_text)
    for item in items:
        code = {
            'weapon_id': weapon.lower().replace(' ', '-'),
            'weapon_name': weapon,
            'source': 'custom',
            'type': '客户定制',
            'type_color': 'purple'
        }
        for k, v in re.findall(r'(\w+):"([^"]*)"', item):
            if k == 'c': code['code'] = v
            elif k == 'p':
                code['price'] = int(v.replace('w','')) * 10000
                code['price_display'] = v
            elif k == 'm': code['magazine'] = v
            elif k == 'cfg': code['name'] = v
            elif k == 'id': code['external_id'] = v
            elif k == 'r': code['remark'] = v
            elif k == 'dt': code['date'] = v
        for k, v in re.findall(r'(\w+):(\d+)', item):
            if k == 'sc': code['score'] = int(v)
            elif k == 'id': code['external_id'] = str(v)
        if 'code' in code:
            codes.append(code)

print(f"客户定制: {sum(1 for c in codes if c.get('source') == 'custom')} 条")
print(f"总计: {len(codes)} 条")

# 去重
seen = set()
unique_codes = []
for c in codes:
    key = c.get('code', '')
    if key and key not in seen:
        seen.add(key)
        unique_codes.append(c)

print(f"去重后: {len(unique_codes)} 条")

# 分类统计
type_stats = {}
for c in unique_codes:
    t = c.get('type', '未知')
    type_stats[t] = type_stats.get(t, 0) + 1
print("分类统计:", type_stats)

# 按武器统计
weapon_stats = {}
for c in unique_codes:
    w = c.get('weapon_name', '未知')
    weapon_stats[w] = weapon_stats.get(w, 0) + 1
print("\n武器统计:")
for w, n in sorted(weapon_stats.items(), key=lambda x: -x[1])[:20]:
    print(f"  {w}: {n}条")

with open('data/custom-codes.json', 'w', encoding='utf-8') as f:
    json.dump(unique_codes, f, ensure_ascii=False, indent=2)

print("\n已保存到 data/custom-codes.json")
