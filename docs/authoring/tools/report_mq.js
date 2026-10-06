const fs = require('fs');
const mq = require('./marquee-results.json');
const bs = require('./marquee-results-bs.json');
const lh = [1, 2, 3].map(i => require('./lh3-index-' + i + '.json'));
const P = 'E:/PLAN D MEDIA PROJECTS/Homeocentre/docs/QA_REPORT.md';
let q = fs.readFileSync(P, 'utf8');
const cut = q.indexOf('\n---\n\n## 12. ');
if (cut > -1) q = q.slice(0, cut);
const row = r => `| ${r.area} | ${r.test.replace(/\|/g, '/')} | ${r.pass ? '✓' : '✗'} | ${(r.note || '').replace(/\|/g, '/').slice(0, 120)} |`;
const all = mq.concat(bs);
let md = `
---

## 12. Home page additions: "Brands we stock" strip and testimonial marquee (7 Oct 2026)

**Result: ${all.length} marquee checks, ${all.filter(r => r.pass).length} passed** (${mq.length} standard + ${bs.length} with Bootstrap 4.6.2 and jQuery 1.12.4 injected). Regression after the change: responsive grid 442/442, flows/zoom/font/landscape 128/128, functional suite 39/39, Bootstrap page suite 50/50.

### 12.1 Logo files (downloaded from https://homoeocentre.com/assets/img/brand/)

| File | Downloaded | Brand shown | Used |
|---|---|---|---|
| logo1.jpg | ✓ 200×100 | Dr. Willmar Schwabe India | ✓ |
| logo2.jpg | ✓ 200×100 | Dr. Reckeweg & Co. Germany | ✓ (the only linked tile: \`shop.html?manufacturer=1\`) |
| logo3.jpg | ✓ 200×100 | Dr. Reckeweg & Co. Germany, an **exact duplicate** of logo2 (same MD5) | ✗ removed |
| logo4.jpg | ✓ 200×100 | ADEL Germany | ✓ |
| logo5.jpg | ✓ 200×100 | Bakson Group | ✓ |
| logo6.jpg | ✓ 200×100 | Wheezal Homoeopathy | ✓ |
| logo7.jpg | ✓ 200×100 | Hapco | ✓ |
| logo8.jpg | ✓ 200×100 | Bhargava Phytolab ("100 years" roundel) | ✓ |
| logo9.jpg | ✓ 200×100 | Fourrts | ✓ |
| logo10.jpg | ✓ 200×100 | SSL ("Since 1997") | ✓ |
| logo11.jpg | ✓ 200×100 | Dr. B Homeopathy | ✓ |
| logo12.jpg | ✓ 200×100 | Adven | ✓ |

All 12 downloaded; none missing; one duplicate. That leaves 11 unique logos, matching the 11 expected brands exactly. Every logo sits on a white background, so none needed a coloured box handled; all go into identical white tiles. The source files are small (200×100), so they look soft at 88px on high-density screens; see DEVELOPER_HANDOFF §9.

### 12.2 Checks

| Area | Check | Result | Detail |
|---|---|:-:|---|
${all.map(row).join('\n')}

How these were measured:
- **viewport**, at all 18 viewports from the responsive pass:
  - exactly 2 lists (original + one clone);
  - the clone has \`aria-hidden="true"\` and \`tabindex="-1"\`;
  - original and clone have identical widths;
  - the list covers the strip (no gap possible);
  - the strip is running when in view;
  - logo tiles and testimonial cards are equal heights, with no clipped quote;
  - first-screen logos loaded before start;
  - no page scroll and no JS errors.
- **seamless:** the CSS animation is paused through the Web Animations API, then sampled. At the loop point (t = end), the clone's first item sits exactly where the original's first item started (0.000px difference). At 41 evenly spaced times the track covers the strip edge to edge. Start and end frames are saved as \`docs/screenshots/marquee/loop-*-{375|1440|2560}-{start|end}.png\`.
- **pause:** real mouse hover, a real Tab keypress into the strip (with the focus ring checked), the pause button (\`aria-pressed\` and the animation state), and touch on a 375px phone emulation (paused while touching, still paused 0.8s after release, running again about 2s after release).
- **reduced:** \`prefers-reduced-motion: reduce\` emulated. There is no clone and no animation. The logos form a static wrapping grid with every logo fully visible. The testimonials become a snap-scrolling row whose arrow buttons scroll it. The pause buttons are hidden. Screenshots: \`reduced-*.png\`.
- **perf:** the animation is a \`CSSAnimation\` of \`translate3d(0) → translate3d(-50%)\` (no timers). It is paused off-screen (IntersectionObserver) and while the tab is hidden.

### 12.3 Lighthouse (mobile, home page, local dev server)

| Run | Perf | A11y | Best pr. | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|
${lh.map((r, i) => { const c = r.categories; return `| ${i + 1} | ${Math.round(c.performance.score * 100)} | ${Math.round(c.accessibility.score * 100)} | ${Math.round(c['best-practices'].score * 100)} | ${Math.round(c.seo.score * 100)} | ${r.audits['largest-contentful-paint'].displayValue} | ${r.audits['cumulative-layout-shift'].displayValue} | ${r.audits['total-blocking-time'].displayValue} |`; }).join('\n')}

Before the change the home page scored 95 (§11.4); after, 94 on three consecutive runs, a 1-point drop, within the 2-point limit. Accessibility stays at 100.

### 12.4 Screenshots for review
\`docs/screenshots/marquee/brands-375.png\`, \`brands-1440.png\`, \`testimonials-375.png\`, \`testimonials-1440.png\` (2× pixel density).

### 12.5 Content notes
- Testimonials 1–4 are the live site's text, verbatim.
- Testimonials 5–8 are **sample text** (\`data-sample="true"\`, with a code comment above each). They make no health, price, delivery-time or discount claims. \`review.html\` carries the note that they must be replaced before launch.
`;
fs.writeFileSync(P, q.trimEnd() + '\n' + md);
console.log('ok', all.length, all.filter(r => !r.pass).length);
