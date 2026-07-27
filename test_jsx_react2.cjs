const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  const result = await page.evaluate(() => {
    try {
      const React = window.__REACT__ || window.React; // Might not be exposed.
      // Let's do something simpler: does anyone in our code use React.createElement with a DOM node constructor?
      return "OK";
    } catch(e) {
      return e.message;
    }
  });
  console.log(result);
  await browser.close();
})();
