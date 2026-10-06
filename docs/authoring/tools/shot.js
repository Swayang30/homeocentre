// usage: node shot.js outdir "page.html,page2.html" "375,1440" [full]
const puppeteer = require('puppeteer-core');
const path = require('path');
const [, , outDir, pagesArg, widthsArg, full] = process.argv;
const BASE = 'http://127.0.0.1:8765/';
(async () => {
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox'] });
  for (const p of pagesArg.split(',')) {
    for (const w of widthsArg.split(',').map(Number)) {
      const page = await browser.newPage();
      const errs = [];
      page.on('pageerror', e => errs.push('JS: ' + e.message));
      page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
      const mobile = w < 768;
      await page.setViewport({ width: w, height: mobile ? 812 : 900, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
      await page.goto(BASE + p, { waitUntil: 'networkidle0', timeout: 60000 });
      await new Promise(r => setTimeout(r, 600));
      const sw = await page.evaluate(() => document.documentElement.scrollWidth);
      const name = p.replace(/[?=&#]/g, '_').replace('.html', '') + '-' + w + '.png';
      await page.screenshot({ path: path.join(outDir, name), fullPage: full === 'full' });
      console.log(name, 'scrollWidth', sw, sw > w ? 'OVERFLOW' : 'ok', errs.length ? errs.join(' | ') : '');
      await page.close();
    }
  }
  await browser.close();
})();
