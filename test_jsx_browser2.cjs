const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  const tests = ['Image', 'Audio', 'Option', 'Text', 'Element', 'Node', 'HTMLElement', 'EventTarget'];
  
  for (const t of tests) {
    const result = await page.evaluate((name) => {
      try {
        window[name]({});
        return "Success";
      } catch(e) {
        return e.name + ": " + e.message;
      }
    }, t);
    console.log(t, "->", result);
  }
  await browser.close();
})();
