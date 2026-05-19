const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1200 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'zh-CN',
  });
  const page = await context.newPage();

  const allData = [];

  // 从战备页提取筛选类别
  async function getCategories() {
    return await page.evaluate(() => {
      const cats = [];
      const buttons = document.querySelectorAll('.filter-btn, .cat-btn, .type-btn, button[class*="cat"], .item-type-btn, [class*="filter"]');
      buttons.forEach(btn => {
        const text = btn.textContent.trim();
        if (text && text.length < 20 && !cats.includes(text)) {
          cats.push({ text, html: btn.outerHTML.substring(0, 100) });
        }
      });
      return cats.slice(0, 20);
    });
  }

  // 提取当前页数据
  async function scrapeTable() {
    return await page.evaluate(() => {
      const results = [];
      try {
        const table = document.querySelector('table.modern-table');
        if (!table) return results;
        const tbody = table.querySelector('tbody');
        if (!tbody) return results;
        const rows = tbody.querySelectorAll('tr');
        if (!rows || rows.length === 0) return results;

        // 动态找列索引
        const thead = table.querySelector('thead');
        let col3price = -1, col7price = -1;
        if (thead) {
          const ths = thead.querySelectorAll('th');
          ths.forEach((th, i) => {
            const text = th.textContent.trim();
            if (text === '3日价格') col3price = i;
            if (text === '7日价格') col7price = i;
          });
        }

        const firstDataRow = Array.from(rows).find(r => !r.querySelector('th'));
        if (!firstDataRow) return results;

        const tds_sample = firstDataRow.querySelectorAll('td');
        const colCount = tds_sample.length;
        const c3 = col3price >= 0 ? col3price : (colCount <= 10 ? 4 : 6);
        const c7 = col7price >= 0 ? col7price : (colCount <= 10 ? 6 : 8);
        const c30 = c3 + 4;

        rows.forEach(tr => {
          if (!tr || tr.querySelector('th')) return;
          const tds = tr.querySelectorAll('td');
          if (!tds || tds.length < Math.max(c3, c7, c30) + 1) return;

          const nameEl = tds[0].querySelector('.item-name');
          const name = nameEl ? nameEl.textContent.trim() : tds[0].textContent.trim();
          if (!name || name.length < 2) return;

          const price3El = tds[c3] ? tds[c3].querySelector('.icon-gold') : null;
          const price3Text = price3El ? price3El.textContent.trim() : (tds[c3] ? tds[c3].textContent.trim() : '');
          const price3 = parseInt(price3Text.replace(/,/g, '')) || 0;

          const price7El = tds[c7] ? tds[c7].querySelector('.icon-gold') : null;
          const price7Text = price7El ? price7El.textContent.trim() : (tds[c7] ? tds[c7].textContent.trim() : '');
          const price7 = parseInt(price7Text.replace(/,/g, '')) || 0;

          const price30El = tds[c30] ? tds[c30].querySelector('.icon-gold') : null;
          const price30Text = price30El ? price30El.textContent.trim() : (tds[c30] ? tds[c30].textContent.trim() : '');
          const price30 = parseInt(price30Text.replace(/,/g, '')) || 0;

          if (name && (price3 > 0 || price7 > 0 || price30 > 0)) {
            results.push({ name, price3, price7, price30 });
          }
        });
      } catch (e) {
        // ignore
      }
      return results;
    });
  }

  // ===== 1. 枪械（7页）=====
  console.log('=== 枪械（7页）===');
  for (let p = 1; p <= 7; p++) {
    const url = `https://orzice.com/v/zhanbei?p=${p}&a=zhanbei&grade=-1&n=%E6%9E%AA%E6%A2%B0&top=80-1`;
    console.log(`  Page ${p}/7...`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    const rows = await scrapeTable();
    console.log(`    ${rows.length} 条`);
    allData.push(...rows);
  }

  // ===== 2. 子弹（9页）=====
  console.log('\n=== 子弹（9页）===');
  for (let p = 1; p <= 9; p++) {
    const url = `https://orzice.com/v/ammo?a=ammo&top=2-2&p=${p}&grade=-1&n=`;
    console.log(`  Page ${p}/9...`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    const rows = await scrapeTable();
    console.log(`    ${rows.length} 条`);
    allData.push(...rows);
  }

  // ===== 3. 其他战备装备（抓更多页）=====
  console.log('\n=== 其他战备装备 ===');
  await page.goto('https://orzice.com/v/zhanbei', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // 获取总页数
  const totalPages = await page.evaluate(() => {
    const pagination = document.querySelector('.pagination, .pagination-nav, .pager');
    if (!pagination) return 10;
    const links = pagination.querySelectorAll('a, button');
    let max = 10;
    links.forEach(l => {
      const n = parseInt(l.textContent.trim());
      if (!isNaN(n) && n > max) max = n;
    });
    return max;
  });
  console.log(`  总页数: ${totalPages}`);

  let equipTotal = 0;
  for (let p = 1; p <= Math.min(totalPages, 100); p++) {
    const url = `https://orzice.com/v/zhanbei?p=${p}&a=zhanbei&grade=-1&n=`;
    console.log(`  Page ${p}/${Math.min(totalPages, 100)}...`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);
    const rows = await scrapeTable();
    console.log(`    ${rows.length} 条`);
    if (rows.length === 0) {
      // 再等一下试试
      await page.waitForTimeout(3000);
      const rows2 = await scrapeTable();
      if (rows2.length === 0) {
        console.log('    空页，停止');
        break;
      }
      allData.push(...rows2);
      equipTotal += rows2.length;
    } else {
      allData.push(...rows);
      equipTotal += rows.length;
    }
  }
  console.log(`  战备总计: ${equipTotal} 条`);

  await browser.close();

  // ===== 结果分析 =====
  console.log('\n=== 结果 ===');
  console.log(`总共采集: ${allData.length} 条`);

  const awm = allData.find(d => d.name.includes('AWM'));
  if (awm) {
    console.log(`AWM: 3日=${awm.price3.toLocaleString()}, 7日=${awm.price7.toLocaleString()}, 30日=${awm.price30.toLocaleString()}`);
  } else {
    console.log('AWM 未找到');
  }

  // 按价格排序Top20
  const top20 = [...allData].sort((a, b) => b.price3 - a.price3).slice(0, 20);
  console.log('\nTop20 3日价格:');
  top20.forEach(d => console.log(`  ${d.name}: ${d.price3.toLocaleString()}`));

  fs.writeFileSync('orzice_scraped.json', JSON.stringify(allData, null, 2), 'utf-8');
  console.log('\n已保存: orzice_scraped.json');
})();
