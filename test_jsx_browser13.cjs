const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const result = await page.evaluate(() => {
    let illegal = [];
    let props;
    try { props = Object.getOwnPropertyNames(window); } catch(e) { props = Object.keys(window); }
    for (let k of props) {
      try {
        if (typeof window[k] === 'function' && /^[A-Z]/.test(k)) {
          try {
            window[k]();
          } catch(e) {
            if (e.message === 'Illegal constructor') {
              illegal.push(k);
            }
          }
        }
      } catch(e) {}
    }
    return illegal;
  });
  console.log("ILLEGAL:", result);
  await browser.close();
})();
