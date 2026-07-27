const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  const result = await page.evaluate(() => {
    try {
      Image();
      return "Image success";
    } catch (e) {
      return "Image error: " + e.message;
    }
  });
  console.log(result);
  await browser.close();
})();
