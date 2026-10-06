const puppeteer = require('puppeteer-core');
const OUT = 'E:/PLAN D MEDIA PROJECTS/Homeocentre/docs/screenshots/';
const BASE = 'http://127.0.0.1:8765/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const SHOTS = [
  ['index', 'index.html'], ['shop', 'shop.html'], ['shop-category', 'shop.html?category=3'], ['shop-empty', 'shop.html?view=empty'],
  ['product-details', 'product-details.html?slug=arnica-1'], ['product-details-rx', 'product-details.html?slug=arnica-1#prescription'],
  ['product-details-chamomilla', 'product-details.html?slug=chamomilla'],
  ['cart', 'cart.html'], ['wishlist', 'wishlist.html'], ['login', 'login.html'], ['contact', 'contact.html'],
  ['privacy-policy', 'privacy-policy.html'], ['terms', 'terms.html'], ['shipping', 'shipping.html'], ['refund', 'refund.html'],
  ['404', '404.html'], ['checkout-concept', 'checkout-concept.html'],
];
async function configure(p) {
  const pick = (s, v) => p.evaluate((s, v) => { const i = [...document.querySelectorAll(`[data-step="${s}"] input`)].find(x => x.value === v); if (i && !i.disabled) i.click(); }, s, v);
  await pick('potency', 'LM'); await pick('lm_range', '0/1-0/10'); await pick('lm_sub', '0/6'); await pick('mfr', 'German'); await pick('dose', '2');
  await p.type('#patientNameInput', 'Rina Das'); await p.type('#patientAgeInput', '64');
}
(async () => {
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' });
  for (const w of [375, 1440]) {
    for (const [name, url] of SHOTS.concat([['product-details-configured', 'product-details.html?slug=arnica-1']])) {
      const p = await b.newPage();
      await p.setViewport({ width: w, height: w < 768 ? 812 : 900, isMobile: w < 768, hasTouch: w < 768, deviceScaleFactor: 1 });
      await p.goto(BASE + url, { waitUntil: 'networkidle0' });
      if (name === 'product-details-configured') await configure(p);
      // fixed UI would float mid-page in a full-length capture: pin it to the page bottom instead
      await p.addStyleTag({ content: '.hc-fab{display:none!important}.hc-tabbar{position:static!important}body.hc{padding-bottom:0!important}.hc-buybar{display:none!important}.hc-toasts{display:none!important}' });
      await sleep(500);
      await p.screenshot({ path: OUT + name + '-' + w + '.png', fullPage: true });
      // first-screen thumbnail for review.html
      if (w === 1440) await p.screenshot({ path: OUT + name + '-' + w + '.png'.replace('.png', '') + '-fold.png' });
      await p.close();
    }
  }
  // interaction states
  const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 });
  await p.goto(BASE + 'index.html', { waitUntil: 'networkidle0' });
  await p.click('[aria-controls="hc-mega-cat"]'); await sleep(200);
  await p.screenshot({ path: OUT + 'state-mega-menu-1440.png' });
  await p.goto(BASE + 'product-details.html#prescription', { waitUntil: 'networkidle0' });
  await p.evaluate(() => HC.rxAccept(new File([new Uint8Array(11 * 1024 * 1024)], 'scan.jpg', { type: 'image/jpeg' })));
  await p.click('#rxSubmitBtn'); await sleep(300);
  await p.evaluate(() => document.getElementById('rxDropzone').scrollIntoView({ block: 'start' }));
  await p.screenshot({ path: OUT + 'state-rx-errors-1440.png' });
  const m = await b.newPage(); await m.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
  await m.goto(BASE + 'shop.html', { waitUntil: 'networkidle0' });
  await m.click('.hc-filterbtn'); await sleep(400);
  await m.screenshot({ path: OUT + 'state-filter-sheet-375.png' });
  await m.goto(BASE + 'index.html', { waitUntil: 'networkidle0' });
  await m.click('.hc-burger'); await sleep(400);
  await m.screenshot({ path: OUT + 'state-drawer-375.png' });
  await m.goto(BASE + 'product-details.html', { waitUntil: 'networkidle0' });
  await configure(m); await m.evaluate(() => window.scrollTo(0, 900)); await sleep(500);
  await m.screenshot({ path: OUT + 'state-buybar-375.png' });
  await b.close();
  console.log('done');
})();
