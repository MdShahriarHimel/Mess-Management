const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  const result = await page.evaluate(() => {
    try {
      new Text();
      return "new Text success";
    } catch (e) {
      return e.message;
    }
  });
  console.log("new Text():", result);
  await browser.close();
})();
