const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const result = await page.evaluate(() => {
    try { AbortController(); return "success"; } catch(e) { return e.message; }
  });
  console.log("AbortController():", result);
  await browser.close();
})();
