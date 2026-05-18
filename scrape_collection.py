#!/usr/bin/env python3
"""抓取 orzice.com 收集品页面数据，遍历所有34页"""
import urllib.request
import urllib.parse
import re
import time
import json

def fetch_page(page_num):
    """抓取指定页码的数据"""
    # p 参数才是真正的页码（不是 page 参数）
    url = f"https://orzice.com/v/collection?a=collection&top=1-2&p={page_num}&grade=-1&mtype=-1&n=&page=1"
    req = urllib.request.Request(url, headers={
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    })
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.read().decode('utf-8', errors='ignore')
    except Exception as e:
        print(f"  [ERROR] Page {page_num}: {e}")
        return None

def parse_page(html):
    """解析页面HTML，提取收集品数据"""
    items = []
    if not html:
        return items

    # 提取所有表格行
    trs = re.findall(r'<tr[^>]*>(.*?)</tr>', html, re.DOTALL)

    for tr in trs[1:]:  # 跳过表头
        # 清理HTML获取纯文本
        text = re.sub(r'<[^>]+>', ' ', tr)
        text = re.sub(r'\s+', ' ', text).strip()

        # 提取物品名称（行首第一段文字，到"推荐方式"前）
        name_match = re.match(r'^([^推荐方式]+)', text)
        name = name_match.group(1).strip() if name_match else ''

        if not name:
            continue

        # 提取价格: NumQfw(数字)
        prices = re.findall(r'NumQfw\(([0-9,]+)\)', tr)
        prices = [int(p.replace(',', '')) for p in prices]

        # 提取涨幅百分比
        changes = re.findall(r'<span[^>]*>([^<]+%)</span>', tr)

        # 推荐方式
        rec_match = re.search(r'推荐方式：</td><td[^>]*>([^<]+)</td>', tr)
        recommend = rec_match.group(1).strip() if rec_match else ''

        # 当前价格（金本位） - 从NumQfw出现位置判断
        # 表格列顺序：当前价格、今日涨幅、3日价格、3日涨幅、7日价格、7日涨幅、30日价格、30日涨幅
        # prices数组应该是 [3日价格, 7日价格, 30日价格] - 共3个
        # changes应该是 [今日涨幅, 3日涨幅, 7日涨幅, 30日涨幅] - 共4个
        price3d = prices[0] if len(prices) > 0 else None
        price7d = prices[1] if len(prices) > 1 else None
        price30d = prices[2] if len(prices) > 2 else None

        change_today = changes[0] if len(changes) > 0 else ''
        change3d = changes[1] if len(changes) > 1 else ''
        change7d = changes[2] if len(changes) > 2 else ''
        change30d = changes[3] if len(changes) > 3 else ''

        # 从详情页URL获取物品ID
        id_match = re.search(r'/v/info/(\d+)', tr)
        item_id = int(id_match.group(1)) if id_match else 0

        # 分类（mtype参数对应）
        category = ''
        mtype_map = {
            '1': '工艺藏品',
            '2': '工具材料',
            '3': '电子物品',
            '4': '家居物品',
            '5': '能源燃料',
            '6': '医疗道具',
            '7': '资料情报',
        }

        items.append({
            'id': item_id,
            'name': name,
            'page': page_num,  # 来源页码
            'price3d': price3d,
            'price7d': price7d,
            'price30d': price30d,
            'change_today': change_today,
            'change3d': change3d,
            'change7d': change7d,
            'change30d': change30d,
            'recommend': recommend,
            'note': '当前价格需登录查看，使用30日价格作为参考'
        })

    return items

def main():
    total_pages = 34
    all_items = []

    for page in range(1, total_pages + 1):
        print(f"抓取第 {page}/{total_pages} 页...")
        html = fetch_page(page)
        items = parse_page(html)
        print(f"  获取 {len(items)} 条记录")
        all_items.extend(items)

        if page < total_pages:
            time.sleep(1)  # 避免请求过快

    print(f"\n总计抓取 {len(all_items)} 条收集品数据")

    # 保存为JSON
    output_file = 'data/collection-live.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(all_items, f, ensure_ascii=False, indent=2)
    print(f"数据已保存到 {output_file}")

if __name__ == '__main__':
    main()
