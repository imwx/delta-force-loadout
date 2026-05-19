const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const url = 'https://orzice.com/v/ammo?a=ammo&top=2-2&p=1&grade=-1&n=';
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  const info = await page.evaluate(() => {
    const tables = document.querySelectorAll('table.modern-table');
    const result = [];
    tables.forEach((t, i) => {
      const tbody = t.querySelector('tbody');
      const rows = tbody ? tbody.querySelectorAll('tr') : [];
      result.push({
        index: i,
        rowCount: rows.length,
        tbodyExists: !!tbody,
        firstRowTds: rows.length > 0 ? rows[0].querySelectorAll('td').length : 0,
        firstRowText: rows.length > 0 ? rows[0].textContent.substring(0, 300) : 'no rows'
      });
    });
    return result;
  });

  console.log(JSON.stringify(info, null, 2));
  await page.screenshot({ path: 'debug_ammo2.png', fullPage: false });
  console.log('截图: debug_ammo2.png');
  await browser.close();
})();
