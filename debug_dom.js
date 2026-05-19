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

  console.log('=== 分析枪械第1页 DOM 结构 ===');
  const url = 'https://orzice.com/v/zhanbei?p=1&a=zhanbei&grade=-1&n=%E6%9E%AA%E6%A2%B0&top=80-1';
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(5000);

  // 截图
  await page.screenshot({ path: 'debug_guns_p1.png', fullPage: false });
  console.log('截图: debug_guns_p1.png');

  // 分析DOM结构
  const domInfo = await page.evaluate(() => {
    const info = {};

    // 找所有 table
    const tables = document.querySelectorAll('table');
    info.tableCount = tables.length;

    if (tables.length > 0) {
      const t = tables[0];
      info.firstTableId = t.id;
      info.firstTableClass = t.className;
      info.firstTableHtml = t.outerHTML.substring(0, 2000);
      info.trCount = t.querySelectorAll('tr').length;
      info.tbodyCount = t.querySelectorAll('tbody').length;
      const firstTr = t.querySelector('tr');
      if (firstTr) {
        info.firstTrHtml = firstTr.outerHTML.substring(0, 1000);
        info.firstTrTdCount = firstTr.querySelectorAll('td').length;
      }
      // 检查有没有thead
      const thead = t.querySelector('thead');
      info.hasThead = !!thead;
      if (thead) {
        info.theadHtml = thead.outerHTML.substring(0, 500);
      }
    }

    // 也找其他可能的数据容器
    const allDivs = document.querySelectorAll('[class*="item"], [class*="card"], [class*="goods"], [class*="list"], [class*="row"]');
    info.potentialContainers = Array.from(allDivs).slice(0, 5).map(d => ({
      class: d.className,
      childCount: d.children.length,
      html: d.outerHTML.substring(0, 300)
    }));

    // 看看body里有几个数字价格
    const bodyText = document.body.innerText;
    const priceMatches = bodyText.match(/[\d,]{4,}/g);
    info.priceSample = priceMatches ? priceMatches.slice(0, 10) : [];

    // 找所有包含数字的td
    const tds = document.querySelectorAll('td');
    info.tdCount = tds.length;
    if (tds.length > 0) {
      info.firstTdHtml = tds[0].outerHTML;
      info.tdsSample = Array.from(tds).slice(0, 10).map(td => ({
        html: td.outerHTML.substring(0, 200),
        text: td.textContent.trim().substring(0, 100)
      }));
    }

    return info;
  });

  console.log(JSON.stringify(domInfo, null, 2));

  await browser.close();
})();
