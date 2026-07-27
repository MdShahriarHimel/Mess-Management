const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const result = await page.evaluate(() => {
    return typeof window.Lock;
  });
  console.log("typeof Lock:", result);
  await browser.close();
})();
