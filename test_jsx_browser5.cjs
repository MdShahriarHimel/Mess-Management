const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  const result = await page.evaluate(() => {
    try {
      new Element();
      return "Success";
    } catch(e) {
      return "new Element: " + e.message;
    }
  });
  console.log(result);
  await browser.close();
})();
