// Screenshots of both marquee sections at 375 and 1440 -> docs/screenshots/marquee/
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const OUT = 'E:/PLAN D MEDIA PROJECTS/Homeocentre/docs/screenshots/marquee/';
fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' });
  for (const w of [375, 1440]) {
    const p = await b.newPage();
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.setViewport({ width: w, height: w < 768 ? 812 : 900, isMobile: w < 768, hasTouch: w < 768, deviceScaleFactor: 2 });
    await p.goto('http://127.0.0.1:8765/index.html', { waitUntil: 'networkidle0' });
    for (const [id, name] of [['hc-brandstrip-title', 'brands'], ['hc-quotes-title', 'testimonials']]) {
      const sec = await p.$('section[aria-labelledby="' + id + '"]');
      await sec.scrollIntoView(); await sleep(1500);
      await p.addStyleTag({ content: '.hc-fab,.hc-tabbar,.hc-buybar,.hc-header{visibility:hidden!important}' });
      await sleep(200);
      await sec.screenshot({ path: OUT + name + '-' + w + '.png' });
    }
    const info = await p.evaluate(() => [...document.querySelectorAll('[data-hc~="marquee"]')].map(m => ({ id: m.id, lists: m.querySelectorAll('.hc-marquee__list').length, running: m.classList.contains('hc-is-running'), dur: getComputedStyle(m).getPropertyValue('--hc-mq-duration'), W: m.clientWidth, L: Math.round(m.querySelector('.hc-marquee__list').getBoundingClientRect().width), sw: document.documentElement.scrollWidth })));
    console.log(w, JSON.stringify(info), errs.join('|'));
    await p.close();
  }
  await b.close();
})();
