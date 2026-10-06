// Responsive QA. node resp.js [grid|flows|all] [--noshots]
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const BASE = 'http://127.0.0.1:8765/';
const OUT = 'E:/PLAN D MEDIA PROJECTS/Homeocentre/docs/screenshots/responsive/';
const mode = process.argv[2] || 'all';
const SHOTS = !process.argv.includes('--noshots');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const PAGES = [
  ['index', 'index.html'], ['shop', 'shop.html'], ['shop-category', 'shop.html?category=3'], ['shop-empty', 'shop.html?view=empty'],
  ['product-details', 'product-details.html'], ['product-details-rx', 'product-details.html#prescription'], ['product-details-chamomilla', 'product-details.html?slug=chamomilla'],
  ['cart', 'cart.html'], ['wishlist', 'wishlist.html'], ['login', 'login.html'], ['contact', 'contact.html'],
  ['privacy-policy', 'privacy-policy.html'], ['terms', 'terms.html'], ['shipping', 'shipping.html'], ['refund', 'refund.html'],
  ['404', '404.html'], ['checkout-concept', 'checkout-concept.html'],
];
const VIEWPORTS = [
  [320, 568, 'phone'], [360, 800, 'phone'], [375, 667, 'phone'], [390, 844, 'phone'], [412, 915, 'phone'], [430, 932, 'phone'],
  [667, 375, 'phone-land'], [844, 390, 'phone-land'], [600, 960, 'fold'],
  [768, 1024, 'tablet'], [820, 1180, 'tablet'], [1024, 768, 'tablet'], [1024, 1366, 'tablet'],
  [1280, 800, 'desktop'], [1366, 768, 'desktop'], [1440, 900, 'desktop'], [1920, 1080, 'desktop'], [2560, 1440, 'desktop'],
];
const results = [];
function rec(area, test, pass, note) { results.push({ area, test, pass, note: note || '' }); if (!pass) console.log('FAIL', area, '|', test, '|', note); }

async function newPage(browser, w, h, kind, opts = {}) {
  const p = await browser.newPage();
  p._errs = [];
  p.on('pageerror', e => p._errs.push(e.message));
  const touch = kind.startsWith('phone') || kind === 'fold' || (kind === 'tablet' && !opts.desktopTablet);
  await p.setViewport({ width: w, height: h, isMobile: touch, hasTouch: touch, deviceScaleFactor: opts.dpr || 1 });
  if (touch) await p.emulateMediaFeatures([{ name: 'pointer', value: 'coarse' }, { name: 'hover', value: 'none' }]).catch(() => {});
  return p;
}
async function go(p, url, extraCss) {
  await p.goto(BASE + url, { waitUntil: 'networkidle0', timeout: 60000 });
  if (extraCss) await p.addStyleTag({ content: extraCss });
  await sleep(350);
}

const PAGE_CHECKS = () => {
  const vw = window.innerWidth, out = {};
  out.scrollW = document.documentElement.scrollWidth; out.vw = vw;
  const vis = el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && !el.closest('[hidden]'); };
  // text overflowing its box
  out.textOverflow = [];
  document.querySelectorAll('.hc-btn, .hc-card, .hc-price, .hc-price__now, .hc-price__was, .hc-card__mfr, .hc-card__ship, .hc-chip, .hc-tabs__tab, .hc-step__chosen').forEach(el => {
    if (!vis(el)) return;
    const cs = getComputedStyle(el);
    if (el.matches('.hc-card__mfr, .hc-card__ship, .hc-step__chosen') && cs.textOverflow === 'ellipsis') return; // intentional ellipsis
    if (el.scrollWidth > el.clientWidth + 1) out.textOverflow.push((el.className.split(' ')[0]) + ':' + (el.textContent || '').trim().slice(0, 30) + ' (' + el.scrollWidth + '>' + el.clientWidth + ')');
  });
  // sibling boxes that overlap each other (collisions that do not overflow)
  out.overlap = [];
  document.querySelectorAll('.hc-line, .hc-card__body, .hc-buybar, .hc-mainbar__inner, .hc-toolbar, .hc-step__head, .hc-sum__row, .hc-pinfo__pricebox, .hc-line__ctrl, .hc-cfg__head, .hc-sechead, .hc-footer__bottom, .hc-pin__row, .hc-buybox__qty, .hc-mode, .hc-slide__ctas, .hc-ref').forEach(box => {
    if (!vis(box)) return;
    const kids = [...box.children].filter(k => vis(k) && getComputedStyle(k).position !== 'absolute' && getComputedStyle(k).position !== 'fixed');
    for (let i = 0; i < kids.length; i++) for (let j = i + 1; j < kids.length; j++) {
      const a = kids[i].getBoundingClientRect(), b = kids[j].getBoundingClientRect();
      const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left), oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (ox > 2 && oy > 2) out.overlap.push(box.className.split(' ')[0] + ': ' + (kids[i].className || kids[i].tagName).toString().split(' ')[0] + ' x ' + (kids[j].className || kids[j].tagName).toString().split(' ')[0]);
    }
  });
  // elements poking out of the viewport that are not inside a scroller
  out.offscreen = [];
  document.querySelectorAll('body *').forEach(el => {
    if (el.closest('svg') && el.tagName.toLowerCase() !== 'svg') return;
    const r = el.getBoundingClientRect();
    if (!r.width || (r.right <= vw + 1 && r.left >= -1)) return;
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { const ov = getComputedStyle(p).overflowX; if (ov !== 'visible') return; }
    const cs = getComputedStyle(el); if (cs.position === 'fixed' || cs.visibility === 'hidden') return;
    if (el.classList.contains('hc-sr') || el.closest('.hc-sr')) return;
    out.offscreen.push(el.tagName.toLowerCase() + '.' + (el.className.baseVal !== undefined ? '' : el.className).toString().split(' ')[0]);
  });
  return out;
};
const TOUCH_AUDIT = () => {
  const small = [];
  const vis = el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && !el.closest('[hidden]') && !el.closest('.hc-sr') && !el.classList.contains('hc-sr'); };
  document.querySelectorAll('a[href], button, select, input:not([type=hidden]):not([type=radio]):not([type=checkbox]):not([type=file]), textarea, summary, label.hc-check, label.hc-rcard, label.hc-btn').forEach(el => {
    if (!vis(el)) return;
    if (el.closest('.hc-mega, .hc-drawer, .hc-sheet:not(.hc-is-open), .hc-modal:not(.hc-is-open), .hc-pop, .hc-carousel__slide[aria-hidden="true"]')) return;
    if (el.closest('p, .hc-prose, .hc-hint, .hc-lead, blockquote, small, .hc-alert') && el.tagName === 'A') return; // inline text links (WCAG 2.5.8 inline exception)
    if (el.closest('.hc-card') && el.matches('.hc-card__media, .hc-card__name a')) return; // whole card is the target via the stretched name link
    if (el.matches('.hc-skip') || getComputedStyle(el).pointerEvents === 'none') return;
    const r = el.getBoundingClientRect();
    if (r.width < 43.5 || r.height < 43.5) small.push((el.tagName.toLowerCase() + '.' + (el.className || '').toString().split(' ')[0] + ' "' + (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 20) + '" ' + Math.round(r.width) + 'x' + Math.round(r.height)));
  });
  return small;
};
const BOTTOM_CHECK = async (p) => {
  await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await sleep(450);
  return p.evaluate(() => {
    const last = document.querySelector('.hc-footer__bottom') || document.querySelector('main');
    const r = last.getBoundingClientRect();
    let cover = window.innerHeight;
    document.querySelectorAll('.hc-tabbar, .hc-buybar').forEach(b => { const cs = getComputedStyle(b); const br = b.getBoundingClientRect(); if (cs.display !== 'none' && cs.visibility !== 'hidden' && br.height && br.top < window.innerHeight) cover = Math.min(cover, br.top); });
    return { lastBottom: Math.round(r.bottom), coverTop: Math.round(cover), ok: r.bottom <= cover + 1 };
  });
};

async function grid(browser) {
  for (const [w, h, kind] of VIEWPORTS) {
    const p = await newPage(browser, w, h, kind);
    for (const [name, url] of PAGES) {
      await go(p, url);
      const c = await p.evaluate(PAGE_CHECKS);
      const errs = p._errs.splice(0);
      const ok = c.scrollW <= c.vw && c.textOverflow.length === 0 && c.offscreen.length === 0 && c.overlap.length === 0 && errs.length === 0;
      let touch = [];
      if (kind === 'phone' || kind === 'phone-land') touch = await p.evaluate(TOUCH_AUDIT);
      const bottom = await BOTTOM_CHECK(p);
      rec('grid', `${name} @${w}x${h}`, ok && bottom.ok, ok && bottom.ok ? '' : JSON.stringify({ sw: c.scrollW, text: c.textOverflow.slice(0, 4), off: c.offscreen.slice(0, 4), ov: c.overlap.slice(0, 4), errs, bottom }));
      if (touch.length) rec('touch', `${name} @${w}x${h}`, false, touch.slice(0, 6).join(' | ') + (touch.length > 6 ? ` (+${touch.length - 6})` : ''));
      else if (kind === 'phone' || kind === 'phone-land') rec('touch', `${name} @${w}x${h}`, true);
      if (SHOTS) {
        fs.mkdirSync(OUT + name, { recursive: true });
        await p.evaluate(() => window.scrollTo(0, 0)); await sleep(150);
        await p.addStyleTag({ content: '.hc-buybar,.hc-fab,.hc-toasts{display:none!important}.hc-tabbar{position:static!important}body.hc{padding-bottom:0!important}' });
        await p.screenshot({ path: `${OUT}${name}/${w}x${h}.jpg`, type: 'jpeg', quality: 62, fullPage: true });
      }
    }
    await p.close();
    console.log('done', w + 'x' + h);
  }
}

async function zoomAndFont(browser) {
  // Browser zoom 200% on 1280x800 / 1366x768 = a 640x400 / 683x384 CSS viewport
  for (const [w, h] of [[640, 400], [683, 384]]) {
    const p = await newPage(browser, w, h, 'desktop', { dpr: 2 });
    for (const [name, url] of PAGES) {
      await go(p, url);
      const c = await p.evaluate(PAGE_CHECKS);
      rec('zoom200', `${name} @${w * 2}x${h * 2} at 200%`, c.scrollW <= c.vw && !c.textOverflow.length && !c.offscreen.length && !c.overlap.length, JSON.stringify({ sw: c.scrollW, t: c.textOverflow.slice(0, 3), o: c.offscreen.slice(0, 3), ov: c.overlap.slice(0, 3) }));
    }
    await p.close();
  }
  // Large system font (Android "Largest" ≈ 130%)
  for (const [w, h] of [[360, 800], [412, 915]]) {
    const p = await newPage(browser, w, h, 'phone');
    for (const [name, url] of PAGES) {
      await go(p, url, 'html{font-size:130% !important}');
      const c = await p.evaluate(PAGE_CHECKS);
      rec('font130', `${name} @${w}x${h}`, c.scrollW <= c.vw && !c.textOverflow.length && !c.offscreen.length && !c.overlap.length, JSON.stringify({ sw: c.scrollW, t: c.textOverflow.slice(0, 3), o: c.offscreen.slice(0, 3), ov: c.overlap.slice(0, 3) }));
    }
    await p.close();
  }
}

const pick = (p, step, value) => p.evaluate((s, v) => { const i = [...document.querySelectorAll(`[data-step="${s}"] input[type=radio]`)].find(x => x.value === v); if (!i) return 'missing'; if (i.disabled) return 'disabled'; i.click(); return 'ok'; }, step, value);
async function flows(browser) {
  for (const [w, h, kind] of [[320, 568, 'phone'], [1440, 900, 'desktop'], [2560, 1440, 'desktop']]) {
    // Configure: non-LM then LM
    let p = await newPage(browser, w, h, kind);
    await go(p, 'product-details.html');
    for (const [s, v] of [['potency', '30CH'], ['mfr', 'Dr. Reckeweg'], ['medium', 'Distilled Water'], ['bottle', '60ml'], ['dose', '3']]) await pick(p, s, v);
    let st = await p.evaluate(() => ({ v: document.querySelector('[name=variant_id]').value, t: document.getElementById('sumTotal').textContent }));
    rec('flow', `Configure non-LM @${w}`, st.v === '1018' && st.t === '₹300', JSON.stringify(st));
    await p.click('[data-hc-cfg-reset]'); await sleep(100);
    for (const [s, v] of [['potency', 'LM'], ['lm_range', '0/11-0/20'], ['lm_sub', '0/14'], ['mfr', 'Indian'], ['dose', '4']]) await pick(p, s, v);
    st = await p.evaluate(() => ({ v: document.querySelector('[name=variant_id]').value, steps: [...document.querySelectorAll('.hc-step')].filter(s => !s.hidden).map(s => s.dataset.step + (s.querySelector('[data-step-number]') ? s.querySelector('[data-step-number]').textContent : '')).join(','), over: document.documentElement.scrollWidth > innerWidth }));
    rec('flow', `Configure LM + renumbering @${w}`, st.v === '1207' && st.steps === 'potency1,lm_range2,lm_sub3,mfr4,medium5,patient,bottle6,dose7' && !st.over, JSON.stringify(st));
    const added = await p.evaluate(() => new Promise(res => { document.addEventListener('hc:add-to-cart', e => res(e.detail.variant_id), { once: true }); const b = [...document.querySelectorAll('[data-hc-add]')].find(x => x.offsetParent); b.click(); setTimeout(() => res(null), 800); }));
    rec('flow', `Add to Cart reachable @${w}`, String(added) === '1207', String(added));
    if (w < 1024) {
      await p.evaluate(() => window.scrollTo(0, document.querySelector('.hc-section[data-hc~="tabs"]').offsetTop)); await sleep(500);
      const bar = await p.evaluate(() => ({ shown: document.querySelector('.hc-buybar').classList.contains('hc-is-shown'), fabHidden: getComputedStyle(document.querySelector('.hc-fab')).visibility === 'hidden' }));
      rec('flow', `Sticky bar shows, call button hides @${w}`, bar.shown && bar.fabHidden, JSON.stringify(bar));
      await p.click('[data-hc-bar-toggle]'); await sleep(200);
      const det = await p.evaluate(() => [...document.querySelectorAll('[data-hc-bar-sum] dt')].map(d => d.textContent).join(','));
      rec('flow', `Sticky bar expands to full summary @${w}`, det.includes('Potency') && det.includes('LM potency') && det.includes('Unit price'), det);
    }
    await p.close();
    // Prescription
    p = await newPage(browser, w, h, kind);
    await go(p, 'product-details.html#prescription');
    const touchUi = await p.evaluate(() => getComputedStyle(document.querySelector('.hc-drop__touch')).display !== 'none' && !!document.querySelector('#rxCameraInput[capture]'));
    if (kind === 'phone') rec('flow', `Touch upload buttons + camera capture @${w}`, touchUi);
    await (await p.$('#rxFileInput')).uploadFile('E:/PLAN D MEDIA PROJECTS/Homeocentre/assets/img/product-sample.jpg');
    const webp = await p.evaluate(() => { const err = () => document.querySelector('#rxFileError span').textContent; HC.rxAccept(new File(['x'], 'scan.webp', { type: 'image/webp' })); const ok = !document.getElementById('rxFileError').classList.contains('hc-is-shown'); return ok; });
    rec('flow', `WebP prescription accepted @${w}`, webp);
    await (await p.$('#rxFileInput')).uploadFile('E:/PLAN D MEDIA PROJECTS/Homeocentre/assets/img/product-sample.jpg');
    for (const [id, v] of [['#rxPatientName', 'Rina Das'], ['#rxPatientMobile', '9830012345'], ['#rxPatientEmail', 'rina@example.com'], ['#rxDoctorName', 'Dr. S. Mukherjee'], ['#rxDoctorMobile', '9830098765']]) await p.type(id, v);
    await p.evaluate(() => document.getElementById('rxSubmitBtn').click()); await sleep(1200);
    const m = await p.evaluate(() => { const d = document.querySelector('#rxSuccessModal .hc-modal__dialog').getBoundingClientRect(); return { open: document.getElementById('rxSuccessModal').classList.contains('hc-is-open'), ref: document.getElementById('rxSumReference').textContent, full: Math.abs(d.height - innerHeight) < 2 && Math.abs(d.width - innerWidth) < 2, over: document.documentElement.scrollWidth > innerWidth }; });
    rec('flow', `Prescription submit → modal (${w < 600 ? 'full-screen sheet' : 'centred dialog'}) @${w}`, m.open && /^RX\d{6}[0-9A-F]{6}$/.test(m.ref) && (w < 600 ? m.full : !m.full) && !m.over, JSON.stringify(m));
    await p.close();
  }
  // Keyboard open: nothing sticky over the focused field (phones)
  for (const [w, h] of [[375, 667], [390, 844], [320, 568]]) {
    const p = await newPage(browser, w, h, 'phone');
    for (const [url, sel] of [['product-details.html', '#patientNameInput'], ['product-details.html#prescription', '#rxDoctorMobile'], ['product-details.html', '#pincode'], ['contact.html', '#c-msg'], ['cart.html', '#cart-pincode'], ['login.html', '#login-password']]) {
      await go(p, url);
      if (sel === '#patientNameInput') { await pick(p, 'potency', '30CH'); await pick(p, 'mfr', 'Indian'); await pick(p, 'medium', 'Globules'); }
      await p.evaluate(s => { const el = document.querySelector(s); el.scrollIntoView({ block: 'center' }); }, sel);
      await sleep(300);
      await p.focus(sel); await sleep(400);
      const r = await p.evaluate(s => {
        const f = document.querySelector(s).getBoundingClientRect();
        const hits = [];
        document.querySelectorAll('.hc-tabbar, .hc-buybar, .hc-fab, .hc-toasts > *').forEach(b => { const cs = getComputedStyle(b); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < .1) return; const br = b.getBoundingClientRect(); if (br.top < f.bottom && br.bottom > f.top && br.left < f.right && br.right > f.left) hits.push(b.className.split(' ')[0]); });
        return { typing: document.body.classList.contains('hc-is-typing'), hits };
      }, sel);
      rec('typing', `${url} ${sel} @${w}`, r.typing && r.hits.length === 0, JSON.stringify(r));
    }
    await p.close();
  }
  // Call button never covers a CTA while scrolling (phones + tablet)
  for (const [w, h, kind] of [[360, 800, 'phone'], [390, 844, 'phone'], [768, 1024, 'tablet']]) {
    const p = await newPage(browser, w, h, kind);
    for (const url of ['index.html', 'shop.html', 'product-details.html', 'cart.html', 'contact.html', 'login.html#register']) {
      await go(p, url);
      const H = await p.evaluate(() => document.documentElement.scrollHeight);
      let bad = [];
      for (let y = 0; y < H; y += 140) {
        await p.evaluate(y => window.scrollTo(0, y), y); await sleep(220);
        const hit = await p.evaluate(() => {
          const fab = document.querySelector('.hc-fab'); const cs = getComputedStyle(fab);
          if (cs.visibility === 'hidden' || +cs.opacity < .5) return null;
          const r = fab.getBoundingClientRect(); const SEL = '.hc-btn, [data-hc-add], input:not([type="hidden"]), select, textarea, .hc-rcard, .hc-qty, .hc-chip, .hc-card__wish, .hc-pager a, .hc-cattile';
          for (const [x, yy] of [[r.left + 4, r.top + 4], [r.right - 4, r.top + 4], [r.left + 4, r.bottom - 4], [r.right - 4, r.bottom - 4], [r.left + r.width / 2, r.top + r.height / 2]]) {
            for (const el of document.elementsFromPoint(x, yy)) { if (el === fab || fab.contains(el)) continue; const c = el.closest(SEL); if (c && !c.closest('.hc-tabbar,.hc-buybar,.hc-header')) return c.className.split(' ')[0] + ':' + (c.textContent || '').trim().slice(0, 20); }
          }
          return null;
        });
        if (hit) bad.push(y + ':' + hit);
      }
      rec('fab', `${url} @${w}`, bad.length === 0, bad.slice(0, 4).join(' | '));
    }
    await p.close();
  }
  // Landscape phones: sticky chrome under ~25% of the screen
  for (const [w, h] of [[667, 375], [844, 390]]) {
    const p = await newPage(browser, w, h, 'phone-land');
    for (const url of ['product-details.html', 'cart.html', 'shop.html']) {
      await go(p, url);
      await p.evaluate(() => window.scrollTo(0, 1400)); await sleep(500);
      await p.evaluate(() => window.scrollBy(0, -200)); await sleep(500); // scroll up so a hiding header would be visible
      const frac = await p.evaluate(() => {
        let t = 0;
        document.querySelectorAll('.hc-header, .hc-tabbar, .hc-buybar, .hc-toolbar').forEach(el => {
          const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') return;
          if (!(cs.position === 'fixed' || cs.position === 'sticky')) return;
          const r = el.getBoundingClientRect(); const vis = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0));
          if (cs.position === 'sticky' && r.top > 2) return; // not stuck
          t += vis;
        });
        return t / innerHeight;
      });
      rec('landscape', `${url} @${w}x${h} sticky share`, frac <= 0.27, (frac * 100).toFixed(1) + '%');
    }
    await p.close();
  }
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox'] });
  if (mode === 'all' || mode === 'grid') await grid(browser);
  if (mode === 'all' || mode === 'flows') { await flows(browser); await zoomAndFont(browser); }
  await browser.close();
  fs.writeFileSync(__dirname + '/resp-results-' + mode + '.json', JSON.stringify(results, null, 1));
  const f = results.filter(r => !r.pass);
  console.log('TOTAL', results.length, 'FAIL', f.length);
})();
