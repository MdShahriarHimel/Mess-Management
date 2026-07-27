const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  const result = await page.evaluate(() => {
    try {
      const h1 = new Headers({'X-Test': '1'});
      const h2 = new Headers(h1);
      return h2.get('X-Test');
    } catch(e) {
      return e.message;
    }
  });
  console.log("RESULT:", result);
  await browser.close();
})();
