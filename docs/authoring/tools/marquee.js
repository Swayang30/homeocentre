// Marquee QA. node marquee.js  [--bootstrap]
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const BASE = 'http://127.0.0.1:8765/';
const OUT = 'E:/PLAN D MEDIA PROJECTS/Homeocentre/docs/screenshots/marquee/';
const BS = process.argv.includes('--bootstrap');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = [];
function rec(area, test, pass, note) { results.push({ area, test, pass, note: note || '' }); console.log(pass ? 'PASS' : 'FAIL', area, '|', test, note ? '| ' + note : ''); }
const VIEWPORTS = [[320, 568], [360, 800], [375, 667], [390, 844], [412, 915], [430, 932], [667, 375], [844, 390], [600, 960], [768, 1024], [820, 1180], [1024, 768], [1024, 1366], [1280, 800], [1366, 768], [1440, 900], [1920, 1080], [2560, 1440]];
const IDS = ['hc-brand-marquee', 'hc-quote-marquee'];

async function open(browser, w, h, opts = {}) {
  const p = await browser.newPage();
  p._errs = []; p.on('pageerror', e => p._errs.push(e.message));
  const touch = w < 1024 && !(w === 1024);
  await p.setViewport({ width: w, height: h, isMobile: touch, hasTouch: touch });
  if (opts.reduce) await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  if (BS) {
    await p.setRequestInterception(true);
    p.on('request', async req => {
      if (req.resourceType() === 'document') {
        const r = await fetch(req.url()); let body = await r.text();
        body = body.replace('<link rel="stylesheet" href="assets/css/hc.css">', '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/css/bootstrap.min.css">\n<script src="https://code.jquery.com/jquery-1.12.4.min.js"></script>\n<link rel="stylesheet" href="assets/css/hc.css">');
        req.respond({ status: 200, contentType: 'text/html', body });
      } else req.continue();
    });
  }
  await p.goto(BASE + 'index.html', { waitUntil: 'networkidle0', timeout: 60000 });
  await sleep(300);
  return p;
}
const intoView = (p, id) => p.evaluate(id => document.getElementById(id).scrollIntoView({ block: 'center' }), id);
const state = (p, id) => p.evaluate(id => {
  const m = document.getElementById(id), t = m.querySelector('.hc-marquee__track');
  return { running: m.classList.contains('hc-is-running'), play: getComputedStyle(t).animationPlayState, anim: getComputedStyle(t).animationName, lists: m.querySelectorAll('.hc-marquee__list').length };
}, id);

async function perViewport(browser) {
  for (const [w, h] of VIEWPORTS) {
    const p = await open(browser, w, h);
    for (const id of IDS) {
      await intoView(p, id); await sleep(900);
      const r = await p.evaluate(id => {
        const m = document.getElementById(id), lists = m.querySelectorAll('.hc-marquee__list');
        const orig = lists[0], clone = lists[1], W = m.clientWidth, L = orig.getBoundingClientRect().width;
        const t = m.querySelector('.hc-marquee__track');
        // equal card heights / logo tile heights
        const hs = [...orig.querySelectorAll('.hc-quote, .hc-logo-tile')].map(e => Math.round(e.getBoundingClientRect().height));
        // first-screen images loaded before running
        const firstImgs = [...orig.querySelectorAll('img')].filter(i => i.closest('.hc-marquee__item').offsetLeft < W);
        // clipped quote text?
        const clipped = [...orig.querySelectorAll('blockquote')].some(b => b.scrollHeight > b.clientHeight + 1);
        return {
          lists: lists.length, cloneHidden: clone && clone.getAttribute('aria-hidden') === 'true',
          cloneTab: clone ? [...clone.querySelectorAll('a, [tabindex]')].every(a => a.getAttribute('tabindex') === '-1') : false,
          sameWidth: clone ? Math.abs(clone.getBoundingClientRect().width - L) < 0.5 : false,
          covers: L >= W - 0.5, running: m.classList.contains('hc-is-running'),
          dur: parseFloat(getComputedStyle(m).getPropertyValue('--hc-mq-duration')), L: Math.round(L), W,
          equalH: hs.length ? Math.max(...hs) - Math.min(...hs) <= 1 : true, imgsOk: firstImgs.every(i => i.complete && i.naturalWidth > 0),
          clipped, sw: document.documentElement.scrollWidth, vw: innerWidth
        };
      }, id);
      const ok = r.lists === 2 && r.cloneHidden && r.cloneTab && r.sameWidth && r.covers && r.running && r.equalH && r.imgsOk && !r.clipped && r.sw <= r.vw && r.dur > 0;
      rec('viewport', `${id} @${w}x${h}`, ok, ok ? `loop ${r.dur}s, list ${r.L}px / strip ${r.W}px` : JSON.stringify(r));
    }
    rec('viewport', `no JS errors @${w}x${h}`, p._errs.length === 0, p._errs.join(' | '));
    // resize repeatedly: never more than one clone, duration recalculated
    if (w === 1440) {
      const before = await p.evaluate(() => getComputedStyle(document.getElementById('hc-brand-marquee')).getPropertyValue('--hc-mq-duration'));
      for (const [rw, rh] of [[900, 700], [400, 800], [1800, 900], [1440, 900]]) { await p.setViewport({ width: rw, height: rh }); await sleep(250); }
      await p.setViewport({ width: 600, height: 900 }); await sleep(400);
      const after = await p.evaluate(() => ({ lists: [...document.querySelectorAll('[data-hc~="marquee"]')].map(m => m.querySelectorAll('.hc-marquee__list').length), dur: getComputedStyle(document.getElementById('hc-brand-marquee')).getPropertyValue('--hc-mq-duration') }));
      rec('resize', 'Repeated resize keeps exactly one clone and recalculates duration', after.lists.every(n => n === 2) && after.dur !== before, `${before.trim()} → ${after.dur.trim()}, lists ${after.lists}`);
    }
    await p.close();
  }
}

async function seamless(browser) {
  for (const [w, h] of [[375, 812], [1440, 900], [2560, 1440]]) {
    const p = await open(browser, w, h);
    for (const id of IDS) {
      await intoView(p, id); await sleep(800);
      // freeze the animation at t = 0 and at t = end; the clone must sit exactly where the original started
      const r = await p.evaluate(id => {
        const m = document.getElementById(id), t = m.querySelector('.hc-marquee__track');
        const a = t.getAnimations()[0]; a.pause();
        const D = a.effect.getComputedTiming().duration;
        const lists = m.querySelectorAll('.hc-marquee__list');
        const firstOrig = lists[0].firstElementChild, firstClone = lists[1].firstElementChild;
        const ltr = m.dataset.direction === 'ltr';
        a.currentTime = 0; const p0 = { o: firstOrig.getBoundingClientRect().left, c: firstClone.getBoundingClientRect().left };
        a.currentTime = D - 0.001; const p1 = { o: firstOrig.getBoundingClientRect().left, c: firstClone.getBoundingClientRect().left };
        // track always covers the strip (no empty space visible) at many sample points
        let gaps = 0; const mr = m.getBoundingClientRect();
        for (let k = 0; k <= 40; k++) { a.currentTime = D * k / 40; const tr = t.getBoundingClientRect(); if (tr.left > mr.left + 0.5 || tr.right < mr.right - 0.5) gaps++; }
        // rtl: at the end the clone's first item is where the original's first item was at the start
        const jump = ltr ? Math.abs(p0.c - p1.o) : Math.abs(p1.c - p0.o);
        a.currentTime = D - 0.001;
        return { jump: +jump.toFixed(3), gaps, D: Math.round(D) };
      }, id);
      const sec = await p.$(`#${id}`);
      await p.addStyleTag({ content: '.hc-fab,.hc-tabbar,.hc-header{visibility:hidden!important}' });
      fs.mkdirSync(OUT, { recursive: true });
      await sec.screenshot({ path: `${OUT}loop-${id.replace('hc-', '').replace('-marquee', '')}-${w}-end.png` });
      await p.evaluate(id => { const a = document.getElementById(id).querySelector('.hc-marquee__track').getAnimations()[0]; a.currentTime = 0; }, id);
      await sec.screenshot({ path: `${OUT}loop-${id.replace('hc-', '').replace('-marquee', '')}-${w}-start.png` });
      rec('seamless', `${id} @${w}: loop point lines up, no gap at 41 sample times`, r.jump < 0.6 && r.gaps === 0, JSON.stringify(r));
    }
    await p.close();
  }
}

async function pauses(browser) {
  // desktop: hover, focus, button
  let p = await open(browser, 1440, 900);
  for (const id of IDS) {
    await intoView(p, id); await sleep(700);
    let s0 = await state(p, id);
    { const bx = await (await p.$('#' + id)).boundingBox(); await p.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); } await sleep(150);
    let s1 = await state(p, id);
    await p.mouse.move(5, 5); await sleep(150);
    let s2 = await state(p, id);
    rec('pause', `${id}: hover pauses, leaving resumes`, s0.running && !s1.running && s1.play === 'paused' && s2.running, JSON.stringify([s0.play, s1.play, s2.play]));
    const focusSel = id === 'hc-brand-marquee' ? `#${id} a.hc-logo-tile` : `#${id} .hc-quote`;
    await p.focus(`[data-hc-marquee-toggle][aria-controls="${id}"]`); await p.keyboard.press('Tab'); await sleep(150); // real keyboard focus into the strip
    const landed = await p.evaluate(sel => document.activeElement.matches(sel), focusSel);
    let s3 = await state(p, id);
    const vis = await p.evaluate(() => { const cs = getComputedStyle(document.activeElement); return cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2; });
    await p.evaluate(() => document.activeElement.blur()); await p.mouse.move(5, 5); await sleep(150);
    let s4 = await state(p, id);
    rec('pause', `${id}: keyboard focus pauses (focus ring visible), blur resumes`, landed && !s3.running && vis && s4.running, JSON.stringify([s3.play, vis, s4.play]));
    const btn = `[data-hc-marquee-toggle][aria-controls="${id}"]`;
    await p.click(btn); await sleep(150);
    let b1 = await p.evaluate((b, id) => ({ pressed: document.querySelector(b).getAttribute('aria-pressed'), label: document.querySelector(b).getAttribute('aria-label') }), btn, id);
    await p.mouse.move(5, 5); await sleep(100);
    let s5 = await state(p, id);
    await p.click(btn); await p.mouse.move(5, 5); await sleep(150);
    let b2 = await p.evaluate(b => document.querySelector(b).getAttribute('aria-pressed'), btn);
    let s6 = await state(p, id);
    rec('pause', `${id}: button toggles animation and aria-pressed`, b1.pressed === 'true' && !s5.running && b2 === 'false' && s6.running && /^Pause (brand logos|testimonials)$/.test(b1.label), JSON.stringify([b1, s5.play, b2, s6.play]));
  }
  // keyboard users meet each logo once: tab order through the strip
  const tabs = await p.evaluate(() => { const els = [...document.querySelectorAll('#hc-brand-marquee a, #hc-brand-marquee [tabindex]')].filter(e => e.tabIndex >= 0); return els.length; });
  rec('a11y', 'Only original logos/cards are focusable (clone skipped)', tabs === 1, `focusable links in logo strip: ${tabs} (only Dr. Reckeweg is linked)`);
  // off-screen and hidden tab
  await p.evaluate(() => window.scrollTo(0, 0)); await sleep(300);
  let off = await state(p, 'hc-quote-marquee');
  rec('perf', 'Animation stops when the section is off-screen', !off.running && off.play === 'paused', off.play);
  await intoView(p, 'hc-quote-marquee'); await sleep(300);
  await p.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  let hid = await state(p, 'hc-quote-marquee');
  await p.evaluate(() => { Object.defineProperty(document, 'hidden', { value: false, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  let back = await state(p, 'hc-quote-marquee');
  rec('perf', 'Animation stops while the tab is hidden, resumes when visible', !hid.running && back.running, JSON.stringify([hid.play, back.play]));
  // pure CSS transform animation, no JS stepping
  const tech = await p.evaluate(() => { const t = document.querySelector('#hc-brand-marquee .hc-marquee__track'); const a = t.getAnimations()[0]; return { type: a.constructor.name, kf: JSON.stringify(a.effect.getKeyframes().map(k => k.transform)) }; });
  rec('perf', 'CSS transform animation (no interval stepping)', tech.type === 'CSSAnimation' && /translate3d\(-50%/.test(tech.kf), JSON.stringify(tech));
  await p.close();

  // phone: touch pause, resume ~2s after release
  p = await open(browser, 375, 812);
  for (const id of IDS) {
    await intoView(p, id); await sleep(700);
    await p.evaluate(() => document.addEventListener('click', e => { if (e.target.closest('.hc-marquee a')) e.preventDefault(); }, true)); // test only: a tap must not navigate away
    const box = await (await p.$(`#${id}`)).boundingBox();
    await p.touchscreen.touchStart(box.x + box.width / 2, box.y + box.height / 2); await sleep(150);
    const t1 = await state(p, id);
    await p.touchscreen.touchEnd(); await sleep(800);
    const t2 = await state(p, id);
    await sleep(1700);
    const t3 = await state(p, id);
    rec('pause', `${id} @375: touch pauses, stays paused after release, resumes ~2s later`, !t1.running && !t2.running && t3.running, JSON.stringify([t1.play, t2.play, t3.play]));
  }
  await p.close();
}

async function reduced(browser) {
  for (const [w, h] of [[375, 812], [1440, 900]]) {
    const p = await open(browser, w, h, { reduce: true });
    const r = await p.evaluate(() => {
      const L = document.getElementById('hc-brand-marquee'), Q = document.getElementById('hc-quote-marquee');
      const lt = getComputedStyle(L.querySelector('.hc-marquee__track')), ql = Q.querySelector('.hc-marquee__list');
      const logosList = L.querySelector('.hc-marquee__list');
      const items = [...logosList.children]; const rows = new Set(items.map(i => Math.round(i.getBoundingClientRect().top))).size;
      return {
        lists: [L, Q].map(m => m.querySelectorAll('.hc-marquee__list').length), anim: lt.animationName,
        logosAllVisible: items.every(i => { const r = i.getBoundingClientRect(); const mr = L.getBoundingClientRect(); return r.left >= mr.left - 1 && r.right <= mr.right + 1; }), rows,
        quotesScroll: ql.scrollWidth > ql.clientWidth, arrows: getComputedStyle(Q.querySelector('[data-hc-mq-next]')).display !== 'none',
        toggles: [...document.querySelectorAll('[data-hc-marquee-toggle]')].every(b => getComputedStyle(b).display === 'none'),
        sw: document.documentElement.scrollWidth, vw: innerWidth
      };
    });
    await p.evaluate(() => document.getElementById('hc-quote-marquee').scrollIntoView({ block: 'center' }));
    const s0 = await p.evaluate(() => document.querySelector('#hc-quote-marquee .hc-marquee__list').scrollLeft);
    await p.click('#hc-quote-marquee [data-hc-mq-next]'); await sleep(300);
    const s1 = await p.evaluate(() => document.querySelector('#hc-quote-marquee .hc-marquee__list').scrollLeft);
    const ok = r.lists.every(n => n === 1) && r.anim === 'none' && r.logosAllVisible && r.quotesScroll && r.arrows && r.toggles && s1 > s0 && r.sw <= r.vw;
    rec('reduced', `prefers-reduced-motion @${w}: no animation, no clone; logos wrap (${r.rows} rows); testimonials scroll with arrows`, ok, JSON.stringify({ ...r, s0, s1 }));
    if (w === 375 || w === 1440) {
      for (const id of IDS) { const el = await p.$('#' + id); await el.scrollIntoView(); await sleep(200); await p.addStyleTag({ content: '.hc-fab,.hc-tabbar,.hc-header{visibility:hidden!important}' }); await (await p.$(`section:has(#${id})`)).screenshot({ path: `${OUT}reduced-${id.replace('hc-', '').replace('-marquee', '')}-${w}.png` }); }
    }
    await p.close();
  }
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox'] });
  if (BS) { await pauses(browser); await seamless(browser); }
  else { await perViewport(browser); await seamless(browser); await pauses(browser); await reduced(browser); }
  await browser.close();
  fs.writeFileSync(__dirname + '/marquee-results' + (BS ? '-bs' : '') + '.json', JSON.stringify(results, null, 1));
  console.log('TOTAL', results.length, 'FAIL', results.filter(r => !r.pass).length);
})();
