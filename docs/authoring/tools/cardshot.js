// node cardshot.js before|after  -> docs/screenshots/responsive/_card/{tag}-{w}.png
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const tag = process.argv[2] || 'after';
const OUT = 'E:/PLAN D MEDIA PROJECTS/Homeocentre/docs/screenshots/responsive/_card/';
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' });
  for (const [w, h] of [[360, 800], [412, 915], [1440, 900]]) {
    const p = await b.newPage();
    await p.setViewport({ width: w, height: h, isMobile: w < 768, hasTouch: w < 768, deviceScaleFactor: w < 768 ? 2 : 1 });
    await p.goto('http://127.0.0.1:8765/index.html', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 400));
    for (const [id, name] of [['hc-featured-title', 'featured'], ['hc-latest-title', 'latest']]) {
      const sec = await p.$('section[aria-labelledby="' + id + '"]');
      await sec.scrollIntoView(); await p.addStyleTag({ content: '.hc-fab,.hc-tabbar,.hc-buybar,.hc-header{visibility:hidden!important}' }); await new Promise(r => setTimeout(r, 300));
      await sec.screenshot({ path: OUT + tag + '-' + name + '-' + w + '.png' });
    }
    // shop grid (2-column phone grid / 5-column desktop)
    await p.goto('http://127.0.0.1:8765/shop.html', { waitUntil: 'networkidle0' });
    await p.addStyleTag({ content: '.hc-fab,.hc-tabbar,.hc-buybar{display:none!important}' }); const grid = await p.$('.hc-grid');
    const box = await grid.boundingBox();
    await p.screenshot({ path: OUT + tag + '-shopgrid-' + w + '.png', clip: { x: 0, y: box.y, width: w, height: Math.min(box.height, w < 768 ? 760 : 900) }, captureBeyondViewport: true });
    await p.close();
  }
  await b.close();
  console.log('saved', tag);
})();
