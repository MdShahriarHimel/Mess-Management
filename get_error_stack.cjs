const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  await page.exposeFunction('logError', (errorObj) => {
    console.log('BROWSER CAUGHT:', JSON.stringify(errorObj, null, 2));
  });
  
  await page.evaluateOnNewDocument(() => {
    window.addEventListener('error', event => {
        const err = event.error || event;
        window.logError({
            message: err.message || 'Unknown error',
            stack: err.stack,
            type: 'error'
        });
    });
    window.addEventListener('unhandledrejection', event => {
        const err = event.reason || event;
        window.logError({
            message: err.message || 'Unknown promise rejection',
            stack: err.stack,
            type: 'unhandledrejection'
        });
    });
  });
  
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));
  
  await browser.close();
})();
