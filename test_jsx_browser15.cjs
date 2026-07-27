const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  const tags = `Palette Check MonitorPlay Type Box Zap MousePointerClick`.split(' ');
  
  const result = await page.evaluate((tags) => {
    let illegal = [];
    for (let t of tags) {
      if (typeof window[t] === 'function') {
        try {
          window[t]();
        } catch(e) {
          illegal.push(t + ": " + e.message);
        }
      }
    }
    return illegal;
  }, tags);
  console.log("INTERSECT:", result);
  await browser.close();
})();
