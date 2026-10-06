// Research screenshots at 375 and 1440 for benchmark sites.
const puppeteer = require('puppeteer-core');
const path = require('path');
const OUT = 'E:/PLAN D MEDIA PROJECTS/Homeocentre/docs/research';
const sites = [
  ['homoeocentre', 'https://homoeocentre.com/'],
  ['homoeocentre-shop', 'https://homoeocentre.com/shop.php'],
  ['pd-sample', 'https://pland-media.com/projects/homeocentre1/product-details5.html'],
  ['amazon', 'https://www.amazon.in/'],
  ['homeomart', 'https://homeomart.com/'],
  ['healthmug', 'https://www.healthmug.com/offers/buy-homeopathic-medicines-online-top-categories-brands-and-products-healthmug/34'],
];
(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new', args: ['--no-sandbox'],
  });
  for (const [name, url] of sites) {
    for (const w of [375, 1440]) {
      const page = await browser.newPage();
      await page.setViewport({ width: w, height: w === 375 ? 812 : 900, deviceScaleFactor: 1, isMobile: w === 375, hasTouch: w === 375 });
      if (w === 375) await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1');
      try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
        await new Promise(r => setTimeout(r, 2500));
        await page.screenshot({ path: path.join(OUT, `${name}-${w}.png`), clip: { x: 0, y: 0, width: w, height: w === 375 ? 2400 : 2600 }, captureBeyondViewport: true });
        console.log('ok', name, w);
      } catch (e) { console.log('fail', name, w, e.message); }
      await page.close();
    }
  }
  await browser.close();
})();
