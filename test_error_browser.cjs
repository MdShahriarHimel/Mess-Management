const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  // Expose function to capture error in evaluate
  await page.exposeFunction('logError', (errorObj) => {
    console.log('BROWSER CAUGHT:', errorObj);
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
  
  // Go to page
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  
  await browser.close();
})();
