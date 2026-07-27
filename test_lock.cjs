const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const result = await page.evaluate(() => {
    try { Lock(); return "success"; } catch(e) { return e.message; }
  });
  console.log("Lock():", result);
  await browser.close();
})();
