const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://orzice.com/v/ammo?a=ammo&top=2-2&p=1&grade=-1&n=', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  const info = await page.evaluate(() => {
    const tables = document.querySelectorAll('table');
    const result = [];
    tables.forEach((t, i) => {
      result.push({
        index: i,
        className: t.className,
        id: t.id,
        rowCount: t.querySelectorAll('tr').length,
        tbodyCount: t.querySelectorAll('tbody').length,
        firstRow: t.querySelector('tr') ? t.querySelector('tr').textContent.substring(0, 200) : 'N/A'
      });
    });
    return result;
  });

  console.log(JSON.stringify(info, null, 2));
  await page.screenshot({ path: 'debug_ammo.png', fullPage: false });
  console.log('截图: debug_ammo.png');
  await browser.close();
})();
