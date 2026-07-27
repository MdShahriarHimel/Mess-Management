const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  const result = await page.evaluate(async () => {
    // import react and renderToString using dynamic import if possible, or just mock it.
    // Actually, in the page, React is already loaded? No, let's just write a basic script.
  });
  await browser.close();
})();
