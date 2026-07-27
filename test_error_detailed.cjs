const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  await page.evaluateOnNewDocument(() => {
    // Intercept console.error as well
    const origError = console.error;
    console.error = function(...args) {
      if(args[0] && args[0].message) {
         window.logError({message: args[0].message, stack: args[0].stack});
      } else {
         window.logError({message: args.map(a => String(a)).join(' ')});
      }
      origError.apply(console, args);
    }
  });

  await page.exposeFunction('logError', (errorObj) => {
    console.log('BROWSER CAUGHT:', errorObj);
  });
  
  // Go to page
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  
  await browser.close();
})();
