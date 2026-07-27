const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  const result = await page.evaluate(() => {
    try {
      // simulate jsx(window.Image, {})
      window.Image({});
      return "Success";
    } catch(e) {
      return e.name + ": " + e.message;
    }
  });
  console.log("RESULT:", result);
  await browser.close();
})();
