import json

with open('data/custom-codes.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

existing_codes = set(c['code'] for c in data)

table1 = [
    {'weapon_name':'M4A1',    'code':'6IUQ02S081SNL6KO8PQSD', 'name':'32w半改红点',         'price':320000,'price_display':'¥32万','scope':'红点',    'type':'客户定制','type_color':'purple','tag_type':'hot'},
    {'weapon_name':'KC17',    'code':'6IU4OKO081SNL6KO8PQSD', 'name':'25w红点半改',          'price':250000,'price_display':'¥25万','scope':'红点',    'type':'客户定制','type_color':'purple','tag_type':'hot'},
    {'weapon_name':'K437',    'code':'6IURHIC04PV5FOG2VV967', 'name':'31w半改绝巴',          'price':310000,'price_display':'¥31万','scope':'无镜',    'type':'客户定制','type_color':'purple','tag_type':'hot'},
    {'weapon_name':'M4A1',    'code':'6IUQ00C081SNL6KO8PQSD', 'name':'44w满改2/4倍镜',    'price':440000,'price_display':'¥44万','scope':'2/4倍镜','type':'客户定制','type_color':'purple','tag_type':'hot'},
    {'weapon_name':'K416',    'code':'6IUQAQ0081SNL6KO8PQSD', 'name':'59w满改随意换镜子',  'price':590000,'price_display':'¥59万','scope':'红点',    'type':'客户定制','type_color':'purple','tag_type':'hot'},
    {'weapon_name':'M7',      'code':'6IUJ7LK01H2GMGVLN3DT1', 'name':'70w半改红点+堤风长枪管','price':700000,'price_display':'¥70万','scope':'红点','type':'客户定制','type_color':'purple','tag_type':'hot'},
    {'weapon_name':'SCAR-H', 'code':'6IUUG6G04PV5FOG2VV967', 'name':'57w满改高操速红点',   'price':570000,'price_display':'¥57万','scope':'红点',    'type':'客户定制','type_color':'purple','tag_type':'hot'},
    {'weapon_name':'ASh-12', 'code':'6J899BG081SNL6KO8PQSD', 'name':'57w红点开镜版',        'price':570000,'price_display':'¥57万','scope':'红点',    'type':'客户定制','type_color':'purple','tag_type':'hot'},
    {'weapon_name':'SR-3M',  'code':'6F6Q83O07ODLT6ETQT3GS', 'name':'60w紧凑突击步枪',     'price':600000,'price_display':'¥60万','scope':'无镜',    'type':'客户定制','type_color':'purple','tag_type':'hot'},
    {'weapon_name':'MK47',   'code':'6IUJBU401H2GMGVLN3DT1', 'name':'61w满改开镜腰射版',   'price':610000,'price_display':'¥61万','scope':'无镜',    'type':'客户定制','type_color':'purple','tag_type':'hot'},
    {'weapon_name':'ASh-12', 'code':'6J899E0081SNL6KO8PQSD', 'name':'战斧枪管满改',         'price':570000,'price_display':'¥57万','scope':'无镜',    'type':'客户定制','type_color':'purple','tag_type':'value'},
]

table2 = [
    {'weapon_name':'K416',   'code':'6H22TVS05GSHKJ9T3V3P1', 'name':'主播自用满改版',      'price':0,'price_display':'未知','scope':'未知',    'type':'制式套装','type_color':'orange','tag_type':'hot'},
    {'weapon_name':'K416',   'code':'6GRGVS00A2EAEM6LVVG76', 'name':'33W半改100米激光枪',  'price':330000,'price_display':'¥33万','scope':'无镜','type':'制式套装','type_color':'orange','tag_type':'hot'},
    {'weapon_name':'PSG-1',  'code':'6GEAP100ES8LV2TAR8R5U', 'name':'宗门神器',            'price':0,'price_display':'未知','scope':'未知',    'type':'制式套装','type_color':'orange','tag_type':'hot'},
    {'weapon_name':'SR-25',  'code':'6I7F3180FRVTK8TK4OOML', 'name':'坝顶真神',            'price':0,'price_display':'未知','scope':'无镜',    'type':'制式套装','type_color':'orange','tag_type':'hot'},
    {'weapon_name':'K416',   'code':'6H8CTBG0A2EAEM6LVVG76', 'name':'新版满配K4',         'price':0,'price_display':'未知','scope':'未知',    'type':'制式套装','type_color':'orange','tag_type':'hot'},
    {'weapon_name':'M7',     'code':'6H8D13S0A2EAEM6LVVG76', 'name':'2倍镜M7',            'price':0,'price_display':'未知','scope':'2倍镜',   'type':'制式套装','type_color':'orange','tag_type':'hot'},
    {'weapon_name':'MP7',    'code':'6H9IANK01JS6DM1GJNM47', 'name':'腰射爆闪',           'price':0,'price_display':'未知','scope':'无镜',    'type':'制式套装','type_color':'orange','tag_type':'hot'},
    {'weapon_name':'SR-3M',  'code':'6HT9FQC03DT5U98MVBBUO', 'name':'腰射中近神器',        'price':0,'price_display':'未知','scope':'无镜',    'type':'制式套装','type_color':'orange','tag_type':'hot'},
    {'weapon_name':'M14',    'code':'6I45E8O0A2EAEM6LVVG76', 'name':'大弹鼓暴力14',        'price':0,'price_display':'未知','scope':'无镜',    'type':'制式套装','type_color':'orange','tag_type':'hot'},
    {'weapon_name':'K437',   'code':'6I6TK7S07HGJPSCK03GG2', 'name':'青春版K437',         'price':0,'price_display':'未知','scope':'无镜',    'type':'制式套装','type_color':'orange','tag_type':'hot'},
    {'weapon_name':'MP7',    'code':'6IKBK9G0A2EAEM6LVVG76', 'name':'新版满P7',           'price':0,'price_display':'未知','scope':'无镜',    'type':'制式套装','type_color':'orange','tag_type':'hot'},
    {'weapon_name':'AS Val', 'code':'6IKI1AS0941SBK05B3RFM', 'name':'新版ASV',             'price':0,'price_display':'未知','scope':'无镜',    'type':'制式套装','type_color':'orange','tag_type':'hot'},
]

all_new = table1 + table2

# 构建 weapon_id map
weapon_id_map = {}
for c in data:
    wn = c.get('weapon_name', '')
    wid = c.get('weapon_id', '')
    if wn and wid and wn not in weapon_id_map:
        weapon_id_map[wn] = wid

added = 0
for item in all_new:
    code = item['code']
    if code in existing_codes:
        print(f'SKIP (duplicate): {code}')
        continue
    weapon_name = item['weapon_name']
    weapon_id = weapon_id_map.get(weapon_name, weapon_name.lower().replace(' ','').replace('-',''))
    record = {
        'weapon_id': weapon_id,
        'weapon_name': weapon_name,
        'source': 'user-provided',
        'type': item['type'],
        'type_color': item['type_color'],
        'code': code,
        'price': item['price'],
        'price_display': item['price_display'],
        'scope': item['scope'],
        'magazine': '',
        'name': item['name'],
        'external_id': '',
        'tag_type': item['tag_type'],
    }
    data.append(record)
    added += 1

print(f'Added {added} new codes. Total: {len(data)}')

with open('data/custom-codes.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
print('Saved.')
