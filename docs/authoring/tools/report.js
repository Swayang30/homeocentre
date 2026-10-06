// Builds the "Responsive" section of docs/QA_REPORT.md from the result JSON files.
const fs = require('fs');
const grid = require('./resp-results-grid.json');
const flows = require('./resp-results-flows.json');
const lh = ['index', 'shop', 'product-details'].map(p => { try { const r = require('./lh2-' + p + '.json'); return [p, r]; } catch (e) { return [p, null]; } });
const VIEW = ['320x568', '360x800', '375x667', '390x844', '412x915', '430x932', '667x375', '844x390', '600x960', '768x1024', '820x1180', '1024x768', '1024x1366', '1280x800', '1366x768', '1440x900', '1920x1080', '2560x1440'];
const PAGES = ['index', 'shop', 'shop-category', 'shop-empty', 'product-details', 'product-details-rx', 'product-details-chamomilla', 'cart', 'wishlist', 'login', 'contact', 'privacy-policy', 'terms', 'shipping', 'refund', '404', 'checkout-concept'];
const cell = (page, v) => {
  const g = grid.find(r => r.area === 'grid' && r.test === `${page} @${v}`);
  const t = grid.find(r => r.area === 'touch' && r.test === `${page} @${v}`);
  if (!g) return '–';
  return (g.pass && (!t || t.pass)) ? '✓' : '✗';
};
let md = [];
md.push('\n---\n\n## 11. Responsive (pass 2: 7 Oct 2026)\n');
md.push('Scope: every page and state at the 18 viewports from the brief, plus 200% zoom, a 130% system font, landscape phones and the two ordering flows at 320 / 1440 / 2560 px. Tools: headless Chrome via Puppeteer, with touch emulation (`pointer: coarse`) for phones and tablets. Screenshots for every page at every viewport: `docs/screenshots/responsive/{page}/{width}x{height}.jpg` (full length; fixed bars hidden in the capture so they don\'t float mid-image).\n');
const total = grid.length + flows.length, failed = grid.concat(flows).filter(r => !r.pass).length;
md.push(`**Final run: ${total} checks, ${total - failed} passed, ${failed} failed.**\n`);
md.push('### 11.1 Page × viewport\n');
md.push('Each ✓ means **all** of the following held for that page at that viewport:');
md.push('- `scrollWidth ≤ innerWidth` (no horizontal scroll);');
md.push('- no `.hc-btn`, `.hc-card`, `.hc-price`, chip or tab whose content is wider than its box;');
md.push('- no element sticking out of the viewport outside a scroller;');
md.push('- no overlapping sibling boxes inside cards, cart lines, bars, toolbars and step headers;');
md.push('- zero JS errors;');
md.push('- the last line of the page clears the tab bar and sticky bar;');
md.push('- on phones, every control and standalone link is at least 44 × 44 px (inline links inside sentences are exempt).\n');
md.push('| Page | ' + VIEW.join(' | ') + ' |');
md.push('|---|' + VIEW.map(() => ':-:').join('|') + '|');
PAGES.forEach(p => md.push(`| ${p} | ` + VIEW.map(v => cell(p, v)).join(' | ') + ' |'));
md.push('');
md.push('### 11.2 Flows and behaviour\n');
md.push('| Check | Result | Detail |');
md.push('|---|:-:|---|');
flows.forEach(r => md.push(`| ${r.area}: ${r.test.replace(/\|/g, '/')} | ${r.pass ? '✓' : '✗'} | ${(r.note || '').replace(/\|/g, '/').slice(0, 140)} |`));
md.push('');
md.push('Key to the areas:');
md.push('- `flow`: Configure (non-LM and the LM branch with renumbering) and Prescription, completed at 320 × 568, 1440 × 900 and 2560 × 1440. On phones the confirmation is a full-screen sheet; at 600px and up it is a centred dialog.');
md.push('- `typing`: with a field focused on a touch device, nothing sticky (tab bar, sticky bar, call button, toast) overlaps it.');
md.push('- `fab`: the page is scrolled top to bottom in 140px steps; at every step the floating call button is either hidden or not covering any button, field, chip, tile or option card.');
md.push('- `landscape`: fixed and stuck chrome takes at most ~25% of the screen height.');
md.push('- `zoom200`: browser zoom 200% on 1280×800 and 1366×768 (a 640×400 / 683×384 CSS viewport at DPR 2).');
md.push('- `font130`: Android "Largest" system font, emulated with `html { font-size: 130% }`, at 360 and 412.\n');
md.push('### 11.3 Failures found during this pass, and the fixes (all re-tested)\n');
md.push(`| # | Found | Cause | Fix |
|---|---|---|---|
| 1 | Product card at ~410px: maker wrapped, delivery line on 3 lines, "(17% off)" orphaned, CTA label touching the button edges, prices and buttons misaligned, photo vs placeholder on different backgrounds (the brief's §1) | Card sized from the viewport, not its own width | Card is a container (\`hc-card\`). One-line maker with ellipsis; MRP and % off kept together; delivery line one line or hidden below 12.5rem; two-line name slot; CTA pinned to the bottom; shared \`--hc-canvas\`; smaller badge and heart on small cards. Before/after: \`docs/screenshots/responsive/_card/before-*.png\` vs \`after-*.png\` |
| 2 | Call button covering cards and crowding the tab bar | Fixed 52px button at a fixed offset | 44px on phones, above \`--hc-bottom-ui\`; hidden while the sticky bar, a drawer, sheet or modal, the keyboard or a toast is up; collision check hides it over any control |
| 3 | Last section under the tab bar | No bottom reserve | \`body\` bottom padding = \`--hc-bottom-ui\` (tab bar + sticky bar + safe area) |
| 4 | "Choose Potency" overflowed by up to 12px at a 130% system font (8 pages) | Label size had a rem floor | Size derived from the card width: \`min(0.9375rem, calc(10.4cqi - 0.1rem))\` |
| 5 | Call button over "Choose Potency" while scrolling the home page at 390px | Collision check only sampled points outside the button | 3 × 3 sample grid plus inner corners; 90ms fade |
| 6 | Cart at 320px: sticky total wrapped to 2 lines, so the footer sat under it | Bar taller than the reserved 4.5rem | One-line bar, and \`hc.js\` reserves the bar's measured height |
| 7 | Empty shop on desktop: page jumped while scrolling | Sidebar \`max-height\` used the visible header offset, so the page got taller when the header slid away | Heights now use \`--hc-header-h\` (constant); only \`top\` uses \`--hc-header-offset\` |
| 8 | 17 touch-target offenders: logo link 40px, Deliver chip 36px, footer phone/email 23px, footer and breadcrumb links under 44px wide, quantity buttons 42px (squeezed to 19px in the cart at 320), cart product names 20px, "Forgot password?" 21px | Text-sized links and border maths | 44px minimums; \`.hc-tlink\` for standalone text links; 44px quantity buttons that never shrink; padded name links |
| 9 | Cart at 320px: "Pharmacist will confirm price" collided with the quantity stepper on the Rx line | Prescription line used the priced-line grid | Rx line stacks price note above the controls on narrow lists. The suite now also checks for overlapping siblings |
| 10 | Desktop hero: left arrow over the headline | Arrows sit on the content edge | Content inset next to the arrows from 1024px |
| 11 | 1024px: header search squeezed to ~100px; gallery pushed the configurator below the fold | Action labels and full-size gallery at 1024 | Header labels from 1280; 22rem gallery at 1024–1279 with the sticky summary column on the right |
| 12 | 2560px: placeholder hero bottle cropped | Placeholder art too large for wide crops | Placeholder rescaled (client artwork pending) |
`);
md.push('### 11.4 Lighthouse (mobile) after the responsive pass\n');
md.push('| Page | Perf | A11y | Best pr. | SEO | LCP | CLS | TBT |');
md.push('|---|---|---|---|---|---|---|---|');
lh.forEach(([p, r]) => { if (!r) return; const c = r.categories; md.push(`| ${p} | ${Math.round(c.performance.score * 100)} | ${Math.round(c.accessibility.score * 100)} | ${Math.round(c['best-practices'].score * 100)} | ${Math.round(c.seo.score * 100)} | ${r.audits['largest-contentful-paint'].displayValue} | ${r.audits['cumulative-layout-shift'].displayValue} | ${r.audits['total-blocking-time'].displayValue} |`); });
md.push('\nLocal dev server without gzip or caching (same conditions as the "plain dev server" rows in §7). Best Practices stays at 96 only because of the intentional 404 product images that demonstrate the fallback.\n');
md.push('### 11.5 What automated testing cannot prove (recommended manual pass)\n');
md.push('Headless Chrome emulates touch, viewport and font size, but it is not a real phone. Before launch, open the review link on:');
md.push('- an **iPhone (Safari)**: notch safe areas, `100dvh` sheets with the URL bar, the camera button, and the keyboard hiding the sticky bars;');
md.push('- an **Android phone (Chrome)**: the "Largest" font setting, the camera picker, and the back gesture with the drawer open;');
md.push('- an **iPad** in both orientations.');
md.push('Keyboard-only use at desktop size was tested by script (mega-menus, carousel, configurator radios, drop-zone, modal, drawer focus trap; see §5) but a quick manual tab-through is still worthwhile.');
const P = 'E:/PLAN D MEDIA PROJECTS/Homeocentre/docs/QA_REPORT.md';
let q = fs.readFileSync(P, 'utf8');
const i = q.indexOf('\n---\n\n## 11. Responsive');
if (i > -1) q = q.slice(0, i);
fs.writeFileSync(P, q.trimEnd() + '\n' + md.join('\n') + '\n');
console.log('report written', total, failed);
