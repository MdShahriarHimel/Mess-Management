const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  const result = await page.evaluate(() => {
    let illegal = [];
    for (let k of Object.getOwnPropertyNames(window)) {
      if (typeof window[k] === 'function' && /^[A-Z]/.test(k)) {
        try {
          window[k]({});
        } catch(e) {
          if (e.message === 'Illegal constructor') {
            illegal.push(k);
          }
        }
      }
    }
    return illegal;
  });
  console.log("ILLEGAL:", result);
  await browser.close();
})();
