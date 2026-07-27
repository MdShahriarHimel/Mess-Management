const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  const result = await page.evaluate(() => {
    try {
      Element();
      return "Element success";
    } catch (e) {
      return "Element error: " + e.message;
    }
  });
  console.log(result);
  await browser.close();
})();
