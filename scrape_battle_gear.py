#!/usr/bin/env python3
"""抓取 orzice.com 战备装备 + 子弹页面数据"""
import urllib.request, re, time, json

UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.read().decode('utf-8', errors='ignore')
    except Exception as e:
        print(f"  [ERROR] {url}: {e}")
        return None

def infer_slot(name):
    """从物品名称推断槽位类型"""
    n = name
    if any(k in n for k in ['背心', '防弹衣', '战术背心', '胸甲', '摩托马甲', '胸包', '胸挂']):
        return 'vest'
    if any(k in n for k in ['头盔', '面罩', '护目镜', '护耳', '防毒面具']):
        return 'helmet'
    if any(k in n for k in ['护膝', '护腿', '护胫']):
        return 'knee'
    if any(k in n for k in ['靴', '鞋子', '战靴']):
        return 'boots'
    # 武器配件 → tactical
    if any(k in n for k in ['枪管', '枪托', '枪机', '握把', '护木', '弹链', '弹匣',
                             '消音', '镭射', '激光', '退器', '导气', '制退',
                             '一体', '托芯', '枪背带', '脚架', '刺刀', '下挂', '导轨',
                             '聚合物', '稳定', '枪口', '榴弹']):
        return 'tactical'
    return 'tactical'

def parse_table(html, page_num):
    """解析战备/子弹页面表格"""
    items = []
    if not html:
        return items

    trs = re.findall(r'<tr[^>]*>(.*?)</tr>', html, re.DOTALL)
    for tr in trs[1:]:  # skip header
        # Item ID from /v/info/NUMBER
        id_match = re.search(r'/v/info/(\d+)', tr)
        item_id = id_match.group(1) if id_match else ''

        # Item name
        name_match = re.search(r'<div class="item-name">([^<]+)</div>', tr)
        name = name_match.group(1).strip() if name_match else ''

        if not name or not item_id:
            continue

        # NumQfw prices: collect all in order
        prices = re.findall(r'NumQfw\(([^)]+)\)', tr)
        prices = [int(p.replace(',', '')) for p in prices]

        # Percentage changes: <span>...%</span>
        changes_raw = re.findall(r'<span[^>]*>([^<]+%)</span>', tr)

        # Extract numeric % values
        changes = []
        for c in changes_raw:
            m = re.search(r'([-\d.]+)%', c)
            if m:
                changes.append(float(m.group(1)))
            else:
                changes.append(None)

        # Determine columns based on number of prices
        # zhanbei: [假账当前, 3日, 7日, 30日] + [今日涨幅, 假账比例, 3日涨幅, 7日涨幅, 30日涨幅]
        # ammo:    [3日, 7日, 30日] + [今日涨幅, 3日涨幅, 7日涨幅, 30日涨幅]
        if len(prices) == 4:
            # zhanbei: current fake, 3d, 7d, 30d
            price_current = prices[0]
            price_3d = prices[1]
            price_7d = prices[2]
            price_30d = prices[3]
            if len(changes) >= 5:
                change_today = changes[0]
                change_ratio = changes[1]   # 假账比例 (%)
                change_3d = changes[2]
                change_7d = changes[3]
                change_30d = changes[4]
            else:
                change_today = change_ratio = change_3d = change_7d = change_30d = None
        elif len(prices) == 3:
            # ammo: 3d, 7d, 30d (no current fake price)
            price_current = None
            price_3d = prices[0]
            price_7d = prices[1]
            price_30d = prices[2]
            if len(changes) >= 4:
                change_today = changes[0]
                change_ratio = None
                change_3d = changes[1]
                change_7d = changes[2]
                change_30d = changes[3]
            else:
                change_today = change_ratio = change_3d = change_7d = change_30d = None
        else:
            continue

        # Grade from data-grade attribute
        grade_match = re.search(r'data-grade="(\d+)"', tr)
        grade = int(grade_match.group(1)) if grade_match else None

        # Recommend method
        recommend_match = re.search(r'class="ShopSellType-(\d+)"[^>]*>([^<]+)</span>', tr)
        recommend = recommend_match.group(2).strip() if recommend_match else ''

        # 推断槽位（仅战备装备）
        slot = infer_slot(name)
        # 计算展示价格：优先 price_current（正数），否则 price_30d
        pc = price_current if price_current and price_current > 0 else None
        display_price = pc if pc else (price_30d if price_30d else 0)

        items.append({
            'id': item_id,
            'name': name,
            'page': page_num,
            'grade': grade,
            'recommend': recommend,
            'slot': slot,
            'price': display_price,
            'price_current': price_current,
            'price_3d': price_3d,
            'price_7d': price_7d,
            'price_30d': price_30d,
            'change_today': change_today,
            'change_ratio': change_ratio,
            'change_3d': change_3d,
            'change_7d': change_7d,
            'change_30d': change_30d,
        })

    return items

def scrape(base_url, total_pages, out_live, out_latest, label):
    """遍历所有页面抓取数据"""
    all_items = []
    seen_ids = set()

    for p in range(1, total_pages + 1):
        url = f"{base_url}?p={p}"
        print(f"  [{label}] Page {p}/{total_pages}...", end=' ')
        html = fetch(url)
        if html:
            items = parse_table(html, p)
            # Filter new items only (for dedup tracking)
            new_items = [it for it in items if it['id'] not in seen_ids]
            for it in new_items:
                seen_ids.add(it['id'])
            all_items.extend(items)
            print(f"Got {len(items)} rows, {len(new_items)} new")
        else:
            print("FAILED")
        time.sleep(1.5)

    # Live: all rows with page source
    with open(out_live, 'w', encoding='utf-8') as f:
        json.dump(all_items, f, ensure_ascii=False, indent=2)

    # Latest: deduplicated by id (first occurrence = latest rank)
    deduped = []
    seen2 = set()
    for it in all_items:
        if it['id'] not in seen2:
            seen2.add(it['id'])
            # slot/price 已由 parse_table 填充，直接保留
            deduped.append(it)

    with open(out_latest, 'w', encoding='utf-8') as f:
        json.dump(deduped, f, ensure_ascii=False, indent=2)

    print(f"\n  [{label}] Done!")
    print(f"    Live:   {len(all_items)} rows")
    print(f"    Latest: {len(deduped)} items")
    return all_items, deduped

if __name__ == '__main__':
    BASE = 'C:/Users/w/WorkBuddy/2026-05-18-task-61/delta-force-loadout/data'

    print("=" * 50)
    print("抓取 战备装备 (zhanbei) - 78 pages")
    print("=" * 50)
    zb_all, zb_latest = scrape(
        'https://orzice.com/v/zhanbei',
        78,
        f'{BASE}/battle-gear-live.json',
        f'{BASE}/battle-gear.json',
        '装备'
    )

    print()
    print("=" * 50)
    print("抓取 子弹 (ammo) - 9 pages")
    print("=" * 50)
    am_all, am_latest = scrape(
        'https://orzice.com/v/ammo',
        9,
        f'{BASE}/ammo-live.json',
        f'{BASE}/ammo-latest.json',
        '子弹'
    )
