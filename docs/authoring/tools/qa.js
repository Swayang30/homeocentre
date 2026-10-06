const puppeteer = require('puppeteer-core');
const BASE = 'http://127.0.0.1:8765/';
const PAGES = ['index.html', 'shop.html', 'shop.html?category=3', 'shop.html?manufacturer=1', 'shop.html?q=arnica', 'shop.html?view=empty', 'product-details.html', 'product-details.html?slug=chamomilla', 'product-details.html?slug=chelidonium', 'cart.html', 'wishlist.html', 'login.html', 'contact.html', 'privacy-policy.html', 'terms.html', 'shipping.html', 'refund.html', '404.html', 'checkout-concept.html', 'review.html'];
const results = [];
function rec(area, test, pass, note) { results.push({ area, test, pass, note: note || '' }); console.log((pass ? 'PASS' : 'FAIL'), area, '|', test, note ? '| ' + note : ''); }
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function open(browser, url, w, opts = {}) {
  const page = await browser.newPage();
  page._errs = [];
  page.on('pageerror', e => page._errs.push(e.message));
  if (opts.bootstrap) {
    await page.setRequestInterception(true);
    page.on('request', async req => {
      if (req.resourceType() === 'document') {
        const r = await fetch(req.url()); let body = await r.text();
        body = body.replace('<link rel="stylesheet" href="assets/css/hc.css">',
          '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/css/bootstrap.min.css">\n<script src="https://code.jquery.com/jquery-1.12.4.min.js"></script>\n<link rel="stylesheet" href="assets/css/hc.css">');
        req.respond({ status: 200, contentType: 'text/html', body });
      } else req.continue();
    });
  }
  await page.setViewport({ width: w, height: 900, isMobile: w < 768, hasTouch: w < 768 });
  await page.goto(BASE + url, { waitUntil: 'networkidle0', timeout: 60000 });
  await sleep(300);
  return page;
}
const pick = (page, step, value) => page.evaluate((s, v) => {
  const i = [...document.querySelectorAll(`[data-step="${s}"] input[type=radio]`)].find(x => x.value === v);
  if (!i) return 'missing'; if (i.disabled) return 'disabled'; i.click(); return 'ok';
}, step, value);
const state = page => page.evaluate(() => {
  const vis = [...document.querySelectorAll('.hc-step')].filter(s => !s.hidden).map(s => s.dataset.step + ':' + ((s.querySelector('[data-step-number]') || {}).textContent || '-'));
  return {
    vis, variant: document.querySelector('[name=variant_id]').value, dose: document.querySelector('[name=dose_count]').value,
    total: document.getElementById('sumTotal').textContent, unit: document.getElementById('sumUnitPrice').textContent,
    disabled: Object.fromEntries([...document.querySelectorAll('.hc-step')].map(s => [s.dataset.step, [...s.querySelectorAll('input[type=radio]:disabled')].map(i => i.value)])),
    addDisabled: document.getElementById('addToCartBtn').getAttribute('aria-disabled'),
    rows: JSON.parse(document.getElementById('hc-variant-data').textContent)
  };
});

async function configurator(browser, tag, opts) {
  const p = await open(browser, 'product-details.html', 1440, opts);
  let s = await state(p);
  rec('Configurator' + tag, 'Initial: only potency step shown, Add to Cart disabled, no variant', s.vis.join() === 'potency:1' && s.addDisabled === 'true' && s.variant === '', s.vis.join());
  await pick(p, 'potency', '10M'); s = await state(p);
  rec('Configurator' + tag, '10M disables manufacturers without 10M rows', JSON.stringify([...s.disabled.mfr].sort()) === '["German","Indian"]', JSON.stringify(s.disabled.mfr));
  await pick(p, 'mfr', 'Dr. Reckeweg'); await pick(p, 'medium', 'Distilled Water'); s = await state(p);
  rec('Configurator' + tag, 'Out-of-stock bottle (10M DRR DW 60ml) disabled', s.disabled.bottle.includes('60ml'), JSON.stringify(s.disabled.bottle));
  // non-LM full path
  await p.click('[data-hc-cfg-reset]'); await sleep(100);
  await pick(p, 'potency', '30CH'); await pick(p, 'mfr', 'Dr. Reckeweg'); await pick(p, 'medium', 'Distilled Water'); await pick(p, 'bottle', '60ml');
  s = await state(p);
  rec('Configurator' + tag, 'Dose options not offered for 60ml are disabled (16)', s.disabled.dose.includes('16') && !s.disabled.dose.includes('8'), JSON.stringify(s.disabled.dose));
  await pick(p, 'dose', '3'); s = await state(p);
  const row = s.rows.find(r => r.potency === '30CH' && r.manufacturer === 'Dr. Reckeweg' && r.medium === 'Distilled Water' && r.bottle_quantity === '60ml' && r.dose === 3);
  rec('Configurator' + tag, 'Non-LM numbering potency1 mfr2 medium3 bottle4 dose5', s.vis.join() === 'potency:1,mfr:2,medium:3,patient:-,bottle:4,dose:5', s.vis.join());
  rec('Configurator' + tag, 'Hidden variant_id = matching JSON row', String(row.variant_id) === s.variant, `${s.variant} vs ${row.variant_id}`);
  rec('Configurator' + tag, 'Unit price and total match selling_price', s.unit === '₹' + row.selling_price && s.total === '₹' + row.selling_price, `${s.unit} / ${s.total}`);
  await p.click('.hc-buybox__qty [data-hc-inc]'); await sleep(50);
  await p.evaluate(() => document.getElementById('quantity').dispatchEvent(new Event('change', { bubbles: true })));
  s = await state(p);
  rec('Configurator' + tag, 'Quantity 2 doubles total', s.total === '₹' + (row.selling_price * 2), s.total);
  rec('Configurator' + tag, 'Add to Cart enabled when complete', s.addDisabled === 'false');
  const evt = await p.evaluate(() => new Promise(res => { document.addEventListener('hc:add-to-cart', e => res(e.detail.variant_id), { once: true }); document.getElementById('addToCartBtn').click(); }));
  rec('Configurator' + tag, 'hc:add-to-cart fires with variant_id', String(evt) === String(row.variant_id));
  // LM branch
  await p.click('[data-hc-cfg-reset]'); await sleep(100);
  await pick(p, 'potency', 'LM'); s = await state(p);
  rec('Configurator' + tag, 'LM adds LM range as step 2', s.vis.join() === 'potency:1,lm_range:2', s.vis.join());
  await pick(p, 'lm_range', '0/11-0/20'); await pick(p, 'lm_sub', '0/14'); s = await state(p);
  rec('Configurator' + tag, 'LM 0/11+ disables German (no rows)', JSON.stringify([...s.disabled.mfr].sort()) === '["Dr. Reckeweg","German"]', JSON.stringify(s.disabled.mfr));
  await pick(p, 'mfr', 'Indian'); s = await state(p);
  rec('Configurator' + tag, 'LM renumbers: range2 sub3 mfr4 medium5 bottle6 dose7 (single options auto-chosen)', s.vis.join() === 'potency:1,lm_range:2,lm_sub:3,mfr:4,medium:5,patient:-,bottle:6,dose:7', s.vis.join());
  await pick(p, 'dose', '4'); s = await state(p);
  const lmRow = s.rows.find(r => r.lm_sub_range === '0/14' && r.manufacturer === 'Indian' && r.dose === 4);
  rec('Configurator' + tag, 'LM variant_id + price', String(lmRow.variant_id) === s.variant && s.unit === '₹' + lmRow.selling_price, `${s.variant} ${s.unit}`);
  // manual dose (Sugar of Milk)
  await p.click('[data-hc-cfg-reset]'); await sleep(100);
  await pick(p, 'potency', '30CH'); await pick(p, 'mfr', 'Indian'); await pick(p, 'medium', 'Sugar of Milk'); s = await state(p);
  rec('Configurator' + tag, 'Sugar of Milk replaces bottle+dose with typed dose step 4', s.vis.join() === 'potency:1,mfr:2,medium:3,patient:-,manual_dose:4', s.vis.join());
  await p.type('#manualDoseInput', '12'); await p.type('#patientNameInput', 'Rina Das'); await p.type('#patientAgeInput', '64'); s = await state(p);
  const som = s.rows.find(r => r.potency === '30CH' && r.medium === 'Sugar of Milk');
  rec('Configurator' + tag, 'Typed doses: total = selling_price × doses, dose_count written', s.total === '₹' + som.selling_price * 12 && s.dose === '12' && s.variant === String(som.variant_id), `${s.total} dose=${s.dose}`);
  const pat = await p.$eval('#sumPatient', e => e.textContent);
  rec('Configurator' + tag, 'Patient name/age shown in summary', pat === 'Rina Das (64 yrs)', pat);
  // PIN
  await p.type('#pincode', '700001'); await p.click('[data-hc="pincode"] button[type=submit]'); await sleep(700);
  const pin = await p.$eval('#pincodeResult', e => e.textContent.trim());
  const stored = await p.evaluate(() => localStorage.getItem('hc_pin'));
  const chip = await p.$eval('[data-hc-pin-text]', e => e.textContent);
  rec('PIN' + tag, 'PIN check shows result, saved to localStorage and header chip', pin.includes('700001') && stored === '700001' && chip === '700001', pin);
  rec('Console' + tag, 'No JS errors on product page during configurator run', p._errs.length === 0, p._errs.join(' | '));
  await p.close();
}

async function prescription(browser, tag, opts) {
  const p = await open(browser, 'product-details.html#prescription', 1440, opts);
  const flowVisible = await p.$eval('#prescriptionFlow', e => !e.hidden);
  rec('Prescription' + tag, '#prescription deep link opens the prescription path', flowVisible);
  await p.click('#rxSubmitBtn'); await sleep(150);
  const errs = await p.evaluate(() => ({ file: document.getElementById('rxFileError').classList.contains('hc-is-shown'), invalid: [...document.querySelectorAll('#rxForm .hc-field.hc-is-invalid input')].map(i => i.name) }));
  rec('Prescription' + tag, 'Empty submit flags file + all required fields', errs.file && ['patient_name', 'patient_mobile', 'patient_email', 'doctor_name', 'doctor_mobile'].every(n => errs.invalid.includes(n)) && !errs.invalid.includes('patient_age'), JSON.stringify(errs.invalid));
  const typeErr = await p.evaluate(() => { HC.rxAccept(new File(['x'], 'notes.txt', { type: 'text/plain' })); return document.querySelector('#rxFileError span').textContent; });
  rec('Prescription' + tag, 'Wrong file type shows clear error', /not a JPG, PNG, WebP or PDF/.test(typeErr), typeErr);
  const sizeErr = await p.evaluate(() => { HC.rxAccept(new File([new Uint8Array(11 * 1024 * 1024)], 'scan.jpg', { type: 'image/jpeg' })); return document.querySelector('#rxFileError span').textContent; });
  rec('Prescription' + tag, 'Over-10MB file shows clear error', /limit is 10 MB/.test(sizeErr), sizeErr);
  const input = await p.$('#rxFileInput');
  await input.uploadFile('E:/PLAN D MEDIA PROJECTS/Homeocentre/assets/img/product-sample.jpg'); await sleep(200);
  const prev = await p.evaluate(() => ({ shown: !document.getElementById('rxFilePreview').hidden, name: document.getElementById('rxFileName').textContent, err: document.getElementById('rxFileError').classList.contains('hc-is-shown'), thumb: !!document.querySelector('#rxFileThumb img') }));
  rec('Prescription' + tag, 'Browse upload shows preview with name + thumbnail, clears error', prev.shown && prev.name === 'product-sample.jpg' && !prev.err && prev.thumb, JSON.stringify(prev));
  await p.type('#rxPatientMobile', '12345'); await p.click('#rxPatientEmail'); await sleep(50);
  const mobErr = await p.$eval('#rxPatientMobile', e => e.closest('.hc-field').classList.contains('hc-is-invalid'));
  rec('Prescription' + tag, 'Short mobile number flagged inline', mobErr);
  await p.$eval('#rxPatientMobile', e => { e.value = ''; });
  await p.type('#rxPatientName', 'Rina Das'); await p.type('#rxPatientMobile', '9830012345'); await p.type('#rxPatientEmail', 'rina@example.com');
  await p.type('#rxPatientAge', '64'); await p.type('#rxDoctorName', 'Dr. S. Mukherjee'); await p.type('#rxDoctorMobile', '9830098765');
  await p.select('#rxPreferredPotency', '200CH');
  const fired = p.evaluate(() => new Promise(res => document.addEventListener('hc:rx-submitted', e => res([...e.detail.formData.keys()]), { once: true })));
  await p.click('#rxSubmitBtn');
  const keys = await fired; await sleep(1000);
  const modal = await p.evaluate(() => ({ open: document.getElementById('rxSuccessModal').classList.contains('hc-is-open'), ref: document.getElementById('rxSumReference').textContent, pot: document.getElementById('rxSumPotency').textContent, focusIn: document.getElementById('rxSuccessModal').contains(document.activeElement) }));
  rec('Prescription' + tag, 'hc:rx-submitted carries live field names', ['ajax_action', 'slug', 'prescription', 'patient_name', 'patient_mobile', 'patient_email', 'patient_age', 'doctor_name', 'doctor_mobile', 'preferred_potency', 'quantity', 'notes'].every(k => keys.includes(k)), keys.join(','));
  rec('Prescription' + tag, 'Confirmation modal opens with RX reference, focus moved into it', modal.open && /^RX\d{6}[0-9A-F]{6}$/.test(modal.ref) && modal.pot === '200CH' && modal.focusIn, JSON.stringify(modal));
  await p.keyboard.press('Escape'); await sleep(300);
  const closed = await p.evaluate(() => !document.getElementById('rxSuccessModal').classList.contains('hc-is-open'));
  rec('Prescription' + tag, 'Escape closes modal', closed);
  rec('Console' + tag, 'No JS errors during prescription run', p._errs.length === 0, p._errs.join(' | '));
  await p.close();
}

async function keyboard(browser) {
  const p = await open(browser, 'index.html', 1440);
  await p.focus('[aria-controls="hc-mega-cat"]'); await p.keyboard.press('Enter'); await sleep(100);
  let open1 = await p.$eval('#hc-mega-cat', e => !e.hidden);
  await p.keyboard.press('Escape'); await sleep(50);
  const closed = await p.$eval('#hc-mega-cat', e => e.hidden);
  const back = await p.evaluate(() => document.activeElement.getAttribute('aria-controls'));
  rec('Keyboard', 'Mega-menu opens with Enter, closes with Escape, focus returns', open1 && closed && back === 'hc-mega-cat');
  await p.focus('[aria-controls="hc-mega-mfr"]'); await p.keyboard.press('ArrowDown'); await sleep(100);
  const inMenu = await p.evaluate(() => document.getElementById('hc-mega-mfr').contains(document.activeElement));
  rec('Keyboard', 'ArrowDown moves focus into the mega-menu', inMenu);
  await p.keyboard.press('Escape');
  await p.focus('.hc-carousel__arrow--next'); await p.keyboard.press('Enter'); await sleep(600);
  const slide = await p.$eval('.hc-carousel__dot[aria-current="true"]', e => e.getAttribute('aria-label'));
  await p.keyboard.press('ArrowRight'); await sleep(600);
  const slide2 = await p.$eval('.hc-carousel__dot[aria-current="true"]', e => e.getAttribute('aria-label'));
  rec('Keyboard', 'Carousel next button + ArrowRight move slides', slide === 'Show slide 2' && slide2 === 'Show slide 3', slide + ' -> ' + slide2);
  const paused = await p.evaluate(() => { const t = document.querySelector('.hc-carousel__track').style.transform; return t; });
  await sleep(6500);
  const still = await p.evaluate(() => document.querySelector('.hc-carousel__track').style.transform);
  rec('Carousel', 'Autoplay pauses while focus is inside', paused === still, paused + ' / ' + still);
  // focus visible check
  await p.focus('.hc-seeall');
  const outline = await p.evaluate(() => getComputedStyle(document.activeElement).outlineStyle + ' ' + getComputedStyle(document.activeElement).outlineColor);
  rec('Accessibility', 'Visible focus ring on links (keyboard focus)', /solid/.test(outline), outline);
  await p.close();

  const m = await open(browser, 'product-details.html', 375);
  await m.click('.hc-burger'); await sleep(350);
  const dOpen = await m.evaluate(() => document.getElementById('hc-drawer').classList.contains('hc-is-open') && document.getElementById('hc-drawer').contains(document.activeElement));
  await m.keyboard.press('Escape'); await sleep(300);
  const dClosed = await m.evaluate(() => !document.getElementById('hc-drawer').classList.contains('hc-is-open'));
  rec('Keyboard', 'Mobile drawer opens with focus inside, Escape closes', dOpen && dClosed);
  await m.evaluate(() => window.scrollTo(0, document.body.scrollHeight - 1800)); await sleep(500);
  const bar = await m.$eval('.hc-buybar', e => e.classList.contains('hc-is-shown'));
  rec('Mobile', 'Sticky buy bar appears when the summary box is off-screen', bar);
  const dz = await m.evaluate(() => { document.getElementById('modeCardPrescription').click(); const f = document.getElementById('rxFileInput'); f.focus(); return document.activeElement === f; });
  rec('Keyboard', 'Drop-zone file input is keyboard-focusable', dz);
  await m.close();

  const s = await open(browser, 'shop.html', 375);
  await s.click('.hc-filterbtn'); await sleep(350);
  const sheet = await s.evaluate(() => document.getElementById('hc-filter-sheet').classList.contains('hc-is-open'));
  rec('Mobile', 'Filter bottom sheet opens on mobile', sheet);
  await s.close();
  const st = await open(browser, 'shop.html?q=arnica', 1440);
  const sv = await st.evaluate(() => ({ h: [...document.querySelectorAll('.hc-pagehead > div')].filter(d => !d.hidden).map(d => d.textContent.trim().slice(0, 40)), q: document.getElementById('hc-search-input').value }));
  rec('Shop', 'Search state switch shows search heading and keeps query', sv.h.length === 1 && sv.h[0].includes('arnica') && sv.q === 'arnica', JSON.stringify(sv));
  await st.close();
}

async function allPages(browser, tag, opts) {
  for (const u of PAGES) {
    for (const w of [360, 375, 414, 768, 1024, 1280, 1440]) {
      if (opts && opts.bootstrap && w !== 1440 && w !== 375) continue;
      const p = await open(browser, u, w, opts);
      const info = await p.evaluate(() => ({
        sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
        noalt: [...document.querySelectorAll('img')].filter(i => !i.hasAttribute('alt')).length,
        unlabeled: [...document.querySelectorAll('input:not([type=hidden]), select, textarea')].filter(el => !(el.labels && el.labels.length) && !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby')).map(e => e.id || e.name),
        broken: [...document.querySelectorAll('img')].filter(i => i.complete && i.naturalWidth === 0).length,
        lorem: /lorem|perspiciatis/i.test(document.body.innerText),
        stars: /★|☆|rating/i.test(document.body.innerText)
      }));
      const ok = info.sw <= info.cw && info.noalt === 0 && info.unlabeled.length === 0 && p._errs.length === 0 && info.broken === 0 && !info.lorem;
      if (!ok || w === 1440) rec('Pages' + tag, `${u} @${w}`, ok, ok ? '' : JSON.stringify({ ...info, errs: p._errs }));
      await p.close();
    }
  }
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox'] });
  const mode = process.argv[2] || 'all';
  if (mode === 'all' || mode === 'func') { await configurator(browser, ''); await prescription(browser, ''); await keyboard(browser); }
  if (mode === 'all' || mode === 'pages') await allPages(browser, '');
  if (mode === 'all' || mode === 'bs') {
    await configurator(browser, ' [Bootstrap4+jQuery]', { bootstrap: true });
    await prescription(browser, ' [Bootstrap4+jQuery]', { bootstrap: true });
    const p = await open(browser, 'product-details.html', 1440, { bootstrap: true });
    const jq = await p.evaluate(() => typeof window.jQuery === 'function' && window.$ === window.jQuery && window.jQuery.fn.jquery);
    rec('Bootstrap', 'jQuery 1.12 present and untouched ($ === jQuery)', jq === '1.12.4', String(jq));
    await p.screenshot({ path: 'E:/PLAN D MEDIA PROJECTS/Homeocentre/docs/screenshots/qa-bootstrap-product-details-1440.png' });
    await p.close();
    const h = await open(browser, 'index.html', 1440, { bootstrap: true });
    await h.screenshot({ path: 'E:/PLAN D MEDIA PROJECTS/Homeocentre/docs/screenshots/qa-bootstrap-index-1440.png' });
    await h.close();
    await allPages(browser, ' [Bootstrap4+jQuery]', { bootstrap: true });
  }
  await browser.close();
  require('fs').writeFileSync(__dirname + '/qa-results-' + mode + '.json', JSON.stringify(results, null, 1));
  console.log('TOTAL', results.length, 'FAIL', results.filter(r => !r.pass).length);
})();
