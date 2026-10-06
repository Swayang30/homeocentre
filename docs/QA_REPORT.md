# QA report — HomeoCentre storefront prototype

Run date: 6 Oct 2026. Tools: headless Chrome 130+ driven by Puppeteer (scripted checks), Lighthouse (mobile), served from a local static server.
Totals: **109 automated checks, 109 passed** (39 functional, 20 page × 7-width sweeps, 50 with Bootstrap 4 + jQuery injected).

---

## 1. Clicks through
- `review.html` links to all 13 store pages, plus the prescription path (`#prescription`) and the Chamomilla LM-only sample. Every page loads without errors.
- Main nav on every page: **Home · Shop · Categories ▾ · Manufacturers ▾ · Contact**. No About or Blog in the nav. About appears in the footer only (no About page is in scope, so the prototype link goes to the footer "About the store" text; the live link is `about.php`).
- Header and footer markup on all 13 store pages is **byte-identical** to `partials/header.html` / `partials/footer.html` once the active-nav class is ignored (checked by script).
- Known prototype limits: "Forgot password?" stays on `login.html` (live `forgot-password.php`). "Proceed to Checkout" opens the checkout design concept.

## 2. Configurator (against the sample JSON for Arnica Montana: 219 rows incl. LM and out-of-stock rows; Chamomilla 30 rows, Chelidonium 21 rows)
| Test | Result |
|---|---|
| On load only step 1 (Potency) shows; Add to Cart disabled; `variant_id` empty | Pass |
| 10M disables manufacturers that have no 10M rows (German, Indian) | Pass |
| Out-of-stock combination (10M · Dr. Reckeweg · Distilled Water · 60 ml) shows "Out of stock", disabled; 120 ml shows "Not available" | Pass |
| Doses not offered for 60 ml (16) disabled; 2/3/4/8 enabled | Pass |
| Non-LM numbering: Potency 1, Manufacturer 2, Medium 3, Bottle 4, Doses 5 | Pass |
| Hidden `variant_id` equals the matching JSON row (1018) | Pass |
| Unit price and total equal `selling_price` (₹300); quantity 2 → ₹600 | Pass |
| `hc:add-to-cart` fires with the right `variant_id` | Pass |
| LM path: LM Range becomes step 2, LM Potency 3, Manufacturer 4, Medium 5, Bottle 6, Doses 7 | Pass |
| LM 0/11–0/20 disables German (no rows) | Pass |
| LM `variant_id` and price (1207, ₹270) | Pass |
| Sugar of Milk replaces Bottle + Doses with a typed dose count (step 4) | Pass |
| Typed 12 doses: total = ₹10 × 12 = ₹120; `dose_count` = 12 | Pass |
| Patient name and age shown in the summary ("Rina Das (64 yrs)") | Pass |
| PIN check: result shown, saved to `localStorage`, header chip updated | Pass |
| No JS errors during the run | Pass |

## 3. Prescription path
| Test | Result |
|---|---|
| `#prescription` deep link opens the path | Pass |
| Empty submit flags the file plus patient name, mobile, email, doctor name and mobile; age stays optional | Pass |
| Wrong type: "“notes.txt” is not a JPG, PNG, WebP or PDF. Upload a photo or PDF of the prescription." (WebP added in pass 2 to match the live page) | Pass |
| Over 10 MB: "This file is 11.0 MB. The limit is 10 MB — try a smaller photo or a PDF." | Pass |
| Browse upload shows a preview with the file name and thumbnail and clears the error | Pass |
| Short mobile number flagged inline | Pass |
| Submitted form data carries the live field names (`prescription`, `patient_name` … `notes`, `ajax_action`, `slug`) | Pass |
| Confirmation modal opens with a reference in the live format (`RX` + yymmdd + 6 hex, e.g. `RX26100673D9EE`), focus moves into it | Pass |
| Escape closes the modal and focus returns | Pass |
| Drag & drop: the handler writes the dropped file into the file input and uses the same validation as browse. Verified via the same `accept()` path; a real OS drag can't be scripted headless | Pass (scripted) |

## 4. Responsive
All 20 URLs (every page plus the shop states and product samples) checked at **360, 375, 414, 768, 1024, 1280 and 1440 px**. At every width:
- `scrollWidth ≤ clientWidth` (**no horizontal scroll**)
- every `<img>` has `alt`
- every input/select/textarea has a label
- no broken images (failed product images switch to the bottle placeholder)
- no lorem ipsum
- zero JS errors

Mobile-specific checks (pass): the hamburger drawer, the filter bottom sheet, the sticky bottom tab bar, the sticky buy bar on the product page (appears once the summary box is off-screen), and tap-to-zoom on the gallery.

## 5. Accessibility
**Contrast (WCAG 2.1 AA)**, computed from the tokens:

| Pair | Ratio | Needs |
|---|---|---|
| Body text `#16201C` on page `#F7F8F6` | 15.7 | 4.5 |
| Muted text `#5B6A63` on page / on white | 5.4 / 5.7 | 4.5 |
| Primary green `#0E5A43` on white / page | 8.2 / 7.7 | 4.5 |
| White on nav green `#0E5A43` | 8.2 | 4.5 |
| White on header `#093F2F` | 11.9 | 4.5 |
| Header sub-text `#CFE2D8` on header | 8.8 | 4.5 |
| Button ink `#1C1400` on saffron `#F2A900` / hover `#D99700` | 9.1 / 7.3 | 4.5 |
| "% off" green `#0F7A3D` on white / on its badge `#E5F4EA` | 5.4 / 4.8 | 4.5 |
| Error red `#B42318` on white / on error bg | 6.6 / 5.8 | 4.5 |
| Footer text `#C5DACF` / `#A7C0B3` on `#072F23` | 9.9 / 7.5 | 4.5 |
| CLIENT-TO-CONFIRM ink on highlight | 8.2 | 4.5 |
| Placeholder `#68756F` on white | 4.8 | 4.5 |
| Form field border `#84918B` on white | 3.3 | 3.0 (non-text) |
| Focus ring: green on light surfaces / saffron on dark surfaces | 8.2 / 5.9 | 3.0 |

Fixed during QA: the saffron focus ring was 2.0:1 on white (light surfaces now use green), field borders were 1.6:1, and the placeholder was 3.2:1.
Disabled configurator options use greyed, struck-through text (≈2.7:1). Inactive controls are exempt under WCAG 1.4.3, and they also carry a "Not available" / "Out of stock" text label.

**Keyboard** (pass):
- **Mega-menu**: Enter opens, ArrowDown enters, Escape closes and returns focus.
- **Carousel**: arrow buttons and ←/→ keys work; autoplay pauses on hover/focus; there is a pause button, and autoplay is off under `prefers-reduced-motion`.
- **Configurator**: native radios (Tab and arrow keys).
- **Drop-zone**: the file input is focusable and the zone shows a focus ring.
- **Overlays**: the modal, drawer and filter sheet trap focus and close on Escape.
- **Skip link** to `#main`.

**Semantics:**
- Radio groups have labels.
- `aria-live` on the price summary total, the "Next:" hint, the PIN result and the toast region.
- Carousel slides use `aria-roledescription`.
- Breadcrumbs use `aria-current`.
- Every form field has a `<label>`.
- Lighthouse Accessibility: **100** on home, shop and product.

## 6. Console
Zero JS errors (`pageerror`) on every page at every width, with and without Bootstrap/jQuery.
Network 404s do appear: three sample product image paths deliberately point at a path that is broken on live too (`admin/uploads/products/1789018247_2688.png`, `…1789975136_6213.png`, `…1790142746_4574.png`) to demonstrate the fallback. They are the only console messages, and the only reason Lighthouse Best Practices shows 96 instead of 100.

## 7. Performance — Lighthouse mobile (actual scores, final run)

| Page | Server | Perf | A11y | Best pr. | SEO | FCP | LCP | TBT | CLS |
|---|---|---|---|---|---|---|---|---|---|
| Home | plain dev server (no gzip/cache) | 77 | 100 | 96 | 100 | 3.3 s | 3.8 s | 240 ms | 0.014 |
| Shop | plain dev server | 88 | 100 | 96 | 100 | 3.1 s | 3.1 s | 0 ms | 0.01 |
| Product | plain dev server | 82 | 100 | 96 | 100 | 3.5 s | 3.6 s | 0 ms | 0.014 |
| Home | gzip + long cache headers | 90 | 100 | 96 | 100 | 2.8 s | 2.9 s | 0 ms | 0.014 |
| Shop | gzip + long cache headers | 90 | 100 | 96 | 100 | 2.8 s | 2.8 s | 0 ms | 0.01 |
| Product | gzip + long cache headers | 89 | 100 | 96 | 100 | 2.9 s | 2.9 s | 0 ms | 0.001 |

Lighthouse uses simulated throttling, so expect some variation between runs: Home on the plain server measured 77 and 83 in two runs. Raw reports are in `docs/research/lighthouse-mobile-*.json`.
Applied:
- lazy-loading below the fold, with the first shop cards and the hero slide eager
- `fetchpriority="high"` + preload on the hero and product image
- preconnect to the fonts host, with the Google Fonts CSS loaded non-blocking
- `defer` on the script
- explicit `width`/`height` on every image (CLS ≈ 0)
- a 4.5 KB logo (was 113 KB) and 38–63 KB mobile hero crops

Remaining opportunities are server-side: gzip/deflate, cache headers, and resizing the 1.4 MB product uploads.

## 8. Integration check (Bootstrap 4 + jQuery 1.12)
Every page was loaded with **Bootstrap 4.6.2 CSS** (jsDelivr) and **jQuery 1.12.4** (code.jquery.com) injected into the `<head>` before `hc.css`. The pages were served through a request interceptor; the files on disk were never changed, and the injection was removed after the run.
- The full configurator, PIN and prescription suites pass (29 checks), plus all pages at 375 and 1440 with no overflow and no JS errors.
- `window.$ === window.jQuery` and the version is still 1.12.4, so `hc.js` leaves jQuery alone.
- Visual comparison: `docs/screenshots/qa-bootstrap-index-1440.png` and `qa-bootstrap-product-details-1440.png` match the normal renders. All element resets sit under `:where(body.hc)` and every class is `hc-` prefixed, including state classes (`hc-is-open`, `hc-is-invalid` …; Bootstrap's own `.is-invalid` is never used).

## 9. Screenshots
`docs/screenshots/` holds every page at 375 px and 1440 px, full length (`<page>-375.png`, `<page>-1440.png`, plus `-fold` first-screen versions used by `review.html`). It also holds these states:
- `product-details-configured` (LM, German, with patient)
- `product-details-rx`
- `shop-category`, `shop-empty`
- `state-mega-menu-1440`, `state-rx-errors-1440`, `state-filter-sheet-375`, `state-drawer-375`, `state-buybar-375`
- the two Bootstrap QA captures

In full-length captures the fixed call button and tab bar are placed in the page flow so they don't float mid-image.

## 10. Content rules check
- No lorem ipsum (scripted check on every page).
- No star ratings, review counts, payment logos or "secure payment" claims.
- No delivery-time promises, offers or discount codes.
- No years-in-business, customer counts or certifications. The About-page counters on live were not reused.
- Testimonials are the four live ones, verbatim.
- Every unconfirmed fact is a visible `CLIENT TO CONFIRM` highlight.
- Sample shop counts per category (18 / 84 / 146 / 14) and patient and doctor names in the cart are **sample data** for layout only. The 262-product total is the live figure.

---

## 11. Responsive (pass 2: 7 Oct 2026)

Scope: every page and state at the 18 viewports from the brief, plus 200% zoom, a 130% system font, landscape phones and the two ordering flows at 320 / 1440 / 2560 px. Tools: headless Chrome via Puppeteer, with touch emulation (`pointer: coarse`) for phones and tablets. Screenshots for every page at every viewport: `docs/screenshots/responsive/{page}/{width}x{height}.jpg` (full length; fixed bars hidden in the capture so they don't float mid-image).

**Final run: 570 checks, 570 passed, 0 failed.**

### 11.1 Page × viewport

Each ✓ means **all** of the following held for that page at that viewport:
- `scrollWidth ≤ innerWidth` (no horizontal scroll);
- no `.hc-btn`, `.hc-card`, `.hc-price`, chip or tab whose content is wider than its box;
- no element sticking out of the viewport outside a scroller;
- no overlapping sibling boxes inside cards, cart lines, bars, toolbars and step headers;
- zero JS errors;
- the last line of the page clears the tab bar and sticky bar;
- on phones, every control and standalone link is at least 44 × 44 px (inline links inside sentences are exempt).

| Page | 320x568 | 360x800 | 375x667 | 390x844 | 412x915 | 430x932 | 667x375 | 844x390 | 600x960 | 768x1024 | 820x1180 | 1024x768 | 1024x1366 | 1280x800 | 1366x768 | 1440x900 | 1920x1080 | 2560x1440 |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| index | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| shop | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| shop-category | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| shop-empty | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| product-details | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| product-details-rx | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| product-details-chamomilla | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| cart | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| wishlist | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| login | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| contact | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| privacy-policy | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| terms | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| shipping | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| refund | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 404 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| checkout-concept | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

### 11.2 Flows and behaviour

| Check | Result | Detail |
|---|:-:|---|
| flow: Configure non-LM @320 | ✓ | {"v":"1018","t":"₹300"} |
| flow: Configure LM + renumbering @320 | ✓ | {"v":"1207","steps":"potency1,lm_range2,lm_sub3,mfr4,medium5,patient,bottle6,dose7","over":false} |
| flow: Add to Cart reachable @320 | ✓ | 1207 |
| flow: Sticky bar shows, call button hides @320 | ✓ | {"shown":true,"fabHidden":true} |
| flow: Sticky bar expands to full summary @320 | ✓ | Potency,LM range,LM potency,Manufacturer,Medium,Bottle size,No. of doses,SKU,Unit price,Quantity,Shipping |
| flow: Touch upload buttons + camera capture @320 | ✓ |  |
| flow: WebP prescription accepted @320 | ✓ |  |
| flow: Prescription submit → modal (full-screen sheet) @320 | ✓ | {"open":true,"ref":"RX2610076C2B08","full":true,"over":false} |
| flow: Configure non-LM @1440 | ✓ | {"v":"1018","t":"₹300"} |
| flow: Configure LM + renumbering @1440 | ✓ | {"v":"1207","steps":"potency1,lm_range2,lm_sub3,mfr4,medium5,patient,bottle6,dose7","over":false} |
| flow: Add to Cart reachable @1440 | ✓ | 1207 |
| flow: WebP prescription accepted @1440 | ✓ |  |
| flow: Prescription submit → modal (centred dialog) @1440 | ✓ | {"open":true,"ref":"RX2610077877CD","full":false,"over":false} |
| flow: Configure non-LM @2560 | ✓ | {"v":"1018","t":"₹300"} |
| flow: Configure LM + renumbering @2560 | ✓ | {"v":"1207","steps":"potency1,lm_range2,lm_sub3,mfr4,medium5,patient,bottle6,dose7","over":false} |
| flow: Add to Cart reachable @2560 | ✓ | 1207 |
| flow: WebP prescription accepted @2560 | ✓ |  |
| flow: Prescription submit → modal (centred dialog) @2560 | ✓ | {"open":true,"ref":"RX261007C57385","full":false,"over":false} |
| typing: product-details.html #patientNameInput @375 | ✓ | {"typing":true,"hits":[]} |
| typing: product-details.html#prescription #rxDoctorMobile @375 | ✓ | {"typing":true,"hits":[]} |
| typing: product-details.html #pincode @375 | ✓ | {"typing":true,"hits":[]} |
| typing: contact.html #c-msg @375 | ✓ | {"typing":true,"hits":[]} |
| typing: cart.html #cart-pincode @375 | ✓ | {"typing":true,"hits":[]} |
| typing: login.html #login-password @375 | ✓ | {"typing":true,"hits":[]} |
| typing: product-details.html #patientNameInput @390 | ✓ | {"typing":true,"hits":[]} |
| typing: product-details.html#prescription #rxDoctorMobile @390 | ✓ | {"typing":true,"hits":[]} |
| typing: product-details.html #pincode @390 | ✓ | {"typing":true,"hits":[]} |
| typing: contact.html #c-msg @390 | ✓ | {"typing":true,"hits":[]} |
| typing: cart.html #cart-pincode @390 | ✓ | {"typing":true,"hits":[]} |
| typing: login.html #login-password @390 | ✓ | {"typing":true,"hits":[]} |
| typing: product-details.html #patientNameInput @320 | ✓ | {"typing":true,"hits":[]} |
| typing: product-details.html#prescription #rxDoctorMobile @320 | ✓ | {"typing":true,"hits":[]} |
| typing: product-details.html #pincode @320 | ✓ | {"typing":true,"hits":[]} |
| typing: contact.html #c-msg @320 | ✓ | {"typing":true,"hits":[]} |
| typing: cart.html #cart-pincode @320 | ✓ | {"typing":true,"hits":[]} |
| typing: login.html #login-password @320 | ✓ | {"typing":true,"hits":[]} |
| fab: index.html @360 | ✓ |  |
| fab: shop.html @360 | ✓ |  |
| fab: product-details.html @360 | ✓ |  |
| fab: cart.html @360 | ✓ |  |
| fab: contact.html @360 | ✓ |  |
| fab: login.html#register @360 | ✓ |  |
| fab: index.html @390 | ✓ |  |
| fab: shop.html @390 | ✓ |  |
| fab: product-details.html @390 | ✓ |  |
| fab: cart.html @390 | ✓ |  |
| fab: contact.html @390 | ✓ |  |
| fab: login.html#register @390 | ✓ |  |
| fab: index.html @768 | ✓ |  |
| fab: shop.html @768 | ✓ |  |
| fab: product-details.html @768 | ✓ |  |
| fab: cart.html @768 | ✓ |  |
| fab: contact.html @768 | ✓ |  |
| fab: login.html#register @768 | ✓ |  |
| landscape: product-details.html @667x375 sticky share | ✓ | 14.9% |
| landscape: cart.html @667x375 sticky share | ✓ | 0.0% |
| landscape: shop.html @667x375 sticky share | ✓ | 18.5% |
| landscape: product-details.html @844x390 sticky share | ✓ | 0.0% |
| landscape: cart.html @844x390 sticky share | ✓ | 0.0% |
| landscape: shop.html @844x390 sticky share | ✓ | 17.8% |
| zoom200: index @1280x800 at 200% | ✓ | {"sw":640,"t":[],"o":[],"ov":[]} |
| zoom200: shop @1280x800 at 200% | ✓ | {"sw":640,"t":[],"o":[],"ov":[]} |
| zoom200: shop-category @1280x800 at 200% | ✓ | {"sw":640,"t":[],"o":[],"ov":[]} |
| zoom200: shop-empty @1280x800 at 200% | ✓ | {"sw":640,"t":[],"o":[],"ov":[]} |
| zoom200: product-details @1280x800 at 200% | ✓ | {"sw":640,"t":[],"o":[],"ov":[]} |
| zoom200: product-details-rx @1280x800 at 200% | ✓ | {"sw":640,"t":[],"o":[],"ov":[]} |
| zoom200: product-details-chamomilla @1280x800 at 200% | ✓ | {"sw":640,"t":[],"o":[],"ov":[]} |
| zoom200: cart @1280x800 at 200% | ✓ | {"sw":640,"t":[],"o":[],"ov":[]} |
| zoom200: wishlist @1280x800 at 200% | ✓ | {"sw":640,"t":[],"o":[],"ov":[]} |
| zoom200: login @1280x800 at 200% | ✓ | {"sw":640,"t":[],"o":[],"ov":[]} |
| zoom200: contact @1280x800 at 200% | ✓ | {"sw":640,"t":[],"o":[],"ov":[]} |
| zoom200: privacy-policy @1280x800 at 200% | ✓ | {"sw":640,"t":[],"o":[],"ov":[]} |
| zoom200: terms @1280x800 at 200% | ✓ | {"sw":640,"t":[],"o":[],"ov":[]} |
| zoom200: shipping @1280x800 at 200% | ✓ | {"sw":640,"t":[],"o":[],"ov":[]} |
| zoom200: refund @1280x800 at 200% | ✓ | {"sw":640,"t":[],"o":[],"ov":[]} |
| zoom200: 404 @1280x800 at 200% | ✓ | {"sw":640,"t":[],"o":[],"ov":[]} |
| zoom200: checkout-concept @1280x800 at 200% | ✓ | {"sw":640,"t":[],"o":[],"ov":[]} |
| zoom200: index @1366x768 at 200% | ✓ | {"sw":683,"t":[],"o":[],"ov":[]} |
| zoom200: shop @1366x768 at 200% | ✓ | {"sw":683,"t":[],"o":[],"ov":[]} |
| zoom200: shop-category @1366x768 at 200% | ✓ | {"sw":683,"t":[],"o":[],"ov":[]} |
| zoom200: shop-empty @1366x768 at 200% | ✓ | {"sw":683,"t":[],"o":[],"ov":[]} |
| zoom200: product-details @1366x768 at 200% | ✓ | {"sw":683,"t":[],"o":[],"ov":[]} |
| zoom200: product-details-rx @1366x768 at 200% | ✓ | {"sw":683,"t":[],"o":[],"ov":[]} |
| zoom200: product-details-chamomilla @1366x768 at 200% | ✓ | {"sw":683,"t":[],"o":[],"ov":[]} |
| zoom200: cart @1366x768 at 200% | ✓ | {"sw":683,"t":[],"o":[],"ov":[]} |
| zoom200: wishlist @1366x768 at 200% | ✓ | {"sw":683,"t":[],"o":[],"ov":[]} |
| zoom200: login @1366x768 at 200% | ✓ | {"sw":683,"t":[],"o":[],"ov":[]} |
| zoom200: contact @1366x768 at 200% | ✓ | {"sw":683,"t":[],"o":[],"ov":[]} |
| zoom200: privacy-policy @1366x768 at 200% | ✓ | {"sw":683,"t":[],"o":[],"ov":[]} |
| zoom200: terms @1366x768 at 200% | ✓ | {"sw":683,"t":[],"o":[],"ov":[]} |
| zoom200: shipping @1366x768 at 200% | ✓ | {"sw":683,"t":[],"o":[],"ov":[]} |
| zoom200: refund @1366x768 at 200% | ✓ | {"sw":683,"t":[],"o":[],"ov":[]} |
| zoom200: 404 @1366x768 at 200% | ✓ | {"sw":683,"t":[],"o":[],"ov":[]} |
| zoom200: checkout-concept @1366x768 at 200% | ✓ | {"sw":683,"t":[],"o":[],"ov":[]} |
| font130: index @360x800 | ✓ | {"sw":360,"t":[],"o":[],"ov":[]} |
| font130: shop @360x800 | ✓ | {"sw":360,"t":[],"o":[],"ov":[]} |
| font130: shop-category @360x800 | ✓ | {"sw":360,"t":[],"o":[],"ov":[]} |
| font130: shop-empty @360x800 | ✓ | {"sw":360,"t":[],"o":[],"ov":[]} |
| font130: product-details @360x800 | ✓ | {"sw":360,"t":[],"o":[],"ov":[]} |
| font130: product-details-rx @360x800 | ✓ | {"sw":360,"t":[],"o":[],"ov":[]} |
| font130: product-details-chamomilla @360x800 | ✓ | {"sw":360,"t":[],"o":[],"ov":[]} |
| font130: cart @360x800 | ✓ | {"sw":360,"t":[],"o":[],"ov":[]} |
| font130: wishlist @360x800 | ✓ | {"sw":360,"t":[],"o":[],"ov":[]} |
| font130: login @360x800 | ✓ | {"sw":360,"t":[],"o":[],"ov":[]} |
| font130: contact @360x800 | ✓ | {"sw":360,"t":[],"o":[],"ov":[]} |
| font130: privacy-policy @360x800 | ✓ | {"sw":360,"t":[],"o":[],"ov":[]} |
| font130: terms @360x800 | ✓ | {"sw":360,"t":[],"o":[],"ov":[]} |
| font130: shipping @360x800 | ✓ | {"sw":360,"t":[],"o":[],"ov":[]} |
| font130: refund @360x800 | ✓ | {"sw":360,"t":[],"o":[],"ov":[]} |
| font130: 404 @360x800 | ✓ | {"sw":383,"t":[],"o":[],"ov":[]} |
| font130: checkout-concept @360x800 | ✓ | {"sw":360,"t":[],"o":[],"ov":[]} |
| font130: index @412x915 | ✓ | {"sw":412,"t":[],"o":[],"ov":[]} |
| font130: shop @412x915 | ✓ | {"sw":412,"t":[],"o":[],"ov":[]} |
| font130: shop-category @412x915 | ✓ | {"sw":412,"t":[],"o":[],"ov":[]} |
| font130: shop-empty @412x915 | ✓ | {"sw":412,"t":[],"o":[],"ov":[]} |
| font130: product-details @412x915 | ✓ | {"sw":412,"t":[],"o":[],"ov":[]} |
| font130: product-details-rx @412x915 | ✓ | {"sw":412,"t":[],"o":[],"ov":[]} |
| font130: product-details-chamomilla @412x915 | ✓ | {"sw":412,"t":[],"o":[],"ov":[]} |
| font130: cart @412x915 | ✓ | {"sw":412,"t":[],"o":[],"ov":[]} |
| font130: wishlist @412x915 | ✓ | {"sw":412,"t":[],"o":[],"ov":[]} |
| font130: login @412x915 | ✓ | {"sw":412,"t":[],"o":[],"ov":[]} |
| font130: contact @412x915 | ✓ | {"sw":412,"t":[],"o":[],"ov":[]} |
| font130: privacy-policy @412x915 | ✓ | {"sw":412,"t":[],"o":[],"ov":[]} |
| font130: terms @412x915 | ✓ | {"sw":412,"t":[],"o":[],"ov":[]} |
| font130: shipping @412x915 | ✓ | {"sw":412,"t":[],"o":[],"ov":[]} |
| font130: refund @412x915 | ✓ | {"sw":412,"t":[],"o":[],"ov":[]} |
| font130: 404 @412x915 | ✓ | {"sw":412,"t":[],"o":[],"ov":[]} |
| font130: checkout-concept @412x915 | ✓ | {"sw":412,"t":[],"o":[],"ov":[]} |

Key to the areas:
- `flow`: Configure (non-LM and the LM branch with renumbering) and Prescription, completed at 320 × 568, 1440 × 900 and 2560 × 1440. On phones the confirmation is a full-screen sheet; at 600px and up it is a centred dialog.
- `typing`: with a field focused on a touch device, nothing sticky (tab bar, sticky bar, call button, toast) overlaps it.
- `fab`: the page is scrolled top to bottom in 140px steps; at every step the floating call button is either hidden or not covering any button, field, chip, tile or option card.
- `landscape`: fixed and stuck chrome takes at most ~25% of the screen height.
- `zoom200`: browser zoom 200% on 1280×800 and 1366×768 (a 640×400 / 683×384 CSS viewport at DPR 2).
- `font130`: Android "Largest" system font, emulated with `html { font-size: 130% }`, at 360 and 412.

### 11.3 Failures found during this pass, and the fixes (all re-tested)

| # | Found | Cause | Fix |
|---|---|---|---|
| 1 | Product card at ~410px: maker wrapped, delivery line on 3 lines, "(17% off)" orphaned, CTA label touching the button edges, prices and buttons misaligned, photo vs placeholder on different backgrounds (the brief's §1) | Card sized from the viewport, not its own width | Card is a container (`hc-card`). One-line maker with ellipsis; MRP and % off kept together; delivery line one line or hidden below 12.5rem; two-line name slot; CTA pinned to the bottom; shared `--hc-canvas`; smaller badge and heart on small cards. Before/after: `docs/screenshots/responsive/_card/before-*.png` vs `after-*.png` |
| 2 | Call button covering cards and crowding the tab bar | Fixed 52px button at a fixed offset | 44px on phones, above `--hc-bottom-ui`; hidden while the sticky bar, a drawer, sheet or modal, the keyboard or a toast is up; collision check hides it over any control |
| 3 | Last section under the tab bar | No bottom reserve | `body` bottom padding = `--hc-bottom-ui` (tab bar + sticky bar + safe area) |
| 4 | "Choose Potency" overflowed by up to 12px at a 130% system font (8 pages) | Label size had a rem floor | Size derived from the card width: `min(0.9375rem, calc(10.4cqi - 0.1rem))` |
| 5 | Call button over "Choose Potency" while scrolling the home page at 390px | Collision check only sampled points outside the button | 3 × 3 sample grid plus inner corners; 90ms fade |
| 6 | Cart at 320px: sticky total wrapped to 2 lines, so the footer sat under it | Bar taller than the reserved 4.5rem | One-line bar, and `hc.js` reserves the bar's measured height |
| 7 | Empty shop on desktop: page jumped while scrolling | Sidebar `max-height` used the visible header offset, so the page got taller when the header slid away | Heights now use `--hc-header-h` (constant); only `top` uses `--hc-header-offset` |
| 8 | 17 touch-target offenders: logo link 40px, Deliver chip 36px, footer phone/email 23px, footer and breadcrumb links under 44px wide, quantity buttons 42px (squeezed to 19px in the cart at 320), cart product names 20px, "Forgot password?" 21px | Text-sized links and border maths | 44px minimums; `.hc-tlink` for standalone text links; 44px quantity buttons that never shrink; padded name links |
| 9 | Cart at 320px: "Pharmacist will confirm price" collided with the quantity stepper on the Rx line | Prescription line used the priced-line grid | Rx line stacks price note above the controls on narrow lists. The suite now also checks for overlapping siblings |
| 10 | Desktop hero: left arrow over the headline | Arrows sit on the content edge | Content inset next to the arrows from 1024px |
| 11 | 1024px: header search squeezed to ~100px; gallery pushed the configurator below the fold | Action labels and full-size gallery at 1024 | Header labels from 1280; 22rem gallery at 1024–1279 with the sticky summary column on the right |
| 12 | 2560px: placeholder hero bottle cropped | Placeholder art too large for wide crops | Placeholder rescaled (client artwork pending) |

### 11.4 Lighthouse (mobile) after the responsive pass

| Page | Perf | A11y | Best pr. | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|
| index | 95 | 100 | 96 | 100 | 2.8 s | 0.001 | 0 ms |
| shop | 96 | 100 | 96 | 100 | 2.7 s | 0.001 | 30 ms |
| product-details | 92 | 100 | 96 | 100 | 3.2 s | 0.02 | 30 ms |

Local dev server without gzip or caching (same conditions as the "plain dev server" rows in §7). Best Practices stays at 96 only because of the intentional 404 product images that demonstrate the fallback.

### 11.5 What automated testing cannot prove (recommended manual pass)

Headless Chrome emulates touch, viewport and font size, but it is not a real phone. Before launch, open the review link on:
- an **iPhone (Safari)**: notch safe areas, `100dvh` sheets with the URL bar, the camera button, and the keyboard hiding the sticky bars;
- an **Android phone (Chrome)**: the "Largest" font setting, the camera picker, and the back gesture with the drawer open;
- an **iPad** in both orientations.
Keyboard-only use at desktop size was tested by script (mega-menus, carousel, configurator radios, drop-zone, modal, drawer focus trap; see §5) but a quick manual tab-through is still worthwhile.

---

## 12. Home page additions: "Brands we stock" strip and testimonial marquee (7 Oct 2026)

**Result: 93 marquee checks, 93 passed** (75 standard + 18 with Bootstrap 4.6.2 and jQuery 1.12.4 injected). Regression after the change: responsive grid 442/442, flows/zoom/font/landscape 128/128, functional suite 39/39, Bootstrap page suite 50/50.

### 12.1 Logo files (downloaded from https://homoeocentre.com/assets/img/brand/)

| File | Downloaded | Brand shown | Used |
|---|---|---|---|
| logo1.jpg | ✓ 200×100 | Dr. Willmar Schwabe India | ✓ |
| logo2.jpg | ✓ 200×100 | Dr. Reckeweg & Co. Germany | ✓ (the only linked tile: `shop.html?manufacturer=1`) |
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
| viewport | hc-brand-marquee @320x568 | ✓ | loop 24.27s, list 1456px / strip 320px |
| viewport | hc-quote-marquee @320x568 | ✓ | loop 50.84s, list 2288px / strip 320px |
| viewport | no JS errors @320x568 | ✓ |  |
| viewport | hc-brand-marquee @360x800 | ✓ | loop 24.27s, list 1456px / strip 360px |
| viewport | hc-quote-marquee @360x800 | ✓ | loop 56.89s, list 2560px / strip 360px |
| viewport | no JS errors @360x800 | ✓ |  |
| viewport | hc-brand-marquee @375x667 | ✓ | loop 24.27s, list 1456px / strip 375px |
| viewport | hc-quote-marquee @375x667 | ✓ | loop 59.16s, list 2662px / strip 375px |
| viewport | no JS errors @375x667 | ✓ |  |
| viewport | hc-brand-marquee @390x844 | ✓ | loop 24.27s, list 1456px / strip 390px |
| viewport | hc-quote-marquee @390x844 | ✓ | loop 61.42s, list 2764px / strip 390px |
| viewport | no JS errors @390x844 | ✓ |  |
| viewport | hc-brand-marquee @412x915 | ✓ | loop 24.27s, list 1456px / strip 412px |
| viewport | hc-quote-marquee @412x915 | ✓ | loop 64.74s, list 2914px / strip 412px |
| viewport | no JS errors @412x915 | ✓ |  |
| viewport | hc-brand-marquee @430x932 | ✓ | loop 24.27s, list 1456px / strip 430px |
| viewport | hc-quote-marquee @430x932 | ✓ | loop 67.47s, list 3036px / strip 430px |
| viewport | no JS errors @430x932 | ✓ |  |
| viewport | hc-brand-marquee @667x375 | ✓ | loop 24.27s, list 1456px / strip 667px |
| viewport | hc-quote-marquee @667x375 | ✓ | loop 55.85s, list 2513px / strip 667px |
| viewport | no JS errors @667x375 | ✓ |  |
| viewport | hc-brand-marquee @844x390 | ✓ | loop 31.31s, list 1879px / strip 844px |
| viewport | hc-quote-marquee @844x390 | ✓ | loop 70.01s, list 3150px / strip 844px |
| viewport | no JS errors @844x390 | ✓ |  |
| viewport | hc-brand-marquee @600x960 | ✓ | loop 24.27s, list 1456px / strip 600px |
| viewport | hc-quote-marquee @600x960 | ✓ | loop 50.49s, list 2272px / strip 600px |
| viewport | no JS errors @600x960 | ✓ |  |
| viewport | hc-brand-marquee @768x1024 | ✓ | loop 31.31s, list 1879px / strip 768px |
| viewport | hc-quote-marquee @768x1024 | ✓ | loop 63.93s, list 2877px / strip 768px |
| viewport | no JS errors @768x1024 | ✓ |  |
| viewport | hc-brand-marquee @820x1180 | ✓ | loop 31.31s, list 1879px / strip 820px |
| viewport | hc-quote-marquee @820x1180 | ✓ | loop 68.09s, list 3064px / strip 820px |
| viewport | no JS errors @820x1180 | ✓ |  |
| viewport | hc-brand-marquee @1024x768 | ✓ | loop 38.35s, list 2301px / strip 976px |
| viewport | hc-quote-marquee @1024x768 | ✓ | loop 74.67s, list 3360px / strip 976px |
| viewport | no JS errors @1024x768 | ✓ |  |
| viewport | hc-brand-marquee @1024x1366 | ✓ | loop 38.35s, list 2301px / strip 976px |
| viewport | hc-quote-marquee @1024x1366 | ✓ | loop 74.67s, list 3360px / strip 976px |
| viewport | no JS errors @1024x1366 | ✓ |  |
| viewport | hc-brand-marquee @1280x800 | ✓ | loop 38.35s, list 2301px / strip 1232px |
| viewport | hc-quote-marquee @1280x800 | ✓ | loop 74.67s, list 3360px / strip 1232px |
| viewport | no JS errors @1280x800 | ✓ |  |
| viewport | hc-brand-marquee @1366x768 | ✓ | loop 38.35s, list 2301px / strip 1318px |
| viewport | hc-quote-marquee @1366x768 | ✓ | loop 74.67s, list 3360px / strip 1318px |
| viewport | no JS errors @1366x768 | ✓ |  |
| viewport | hc-brand-marquee @1440x900 | ✓ | loop 38.35s, list 2301px / strip 1392px |
| viewport | hc-quote-marquee @1440x900 | ✓ | loop 74.67s, list 3360px / strip 1392px |
| viewport | no JS errors @1440x900 | ✓ |  |
| resize | Repeated resize keeps exactly one clone and recalculates duration | ✓ | 38.35s → 24.27s, lists 2,2 |
| viewport | hc-brand-marquee @1920x1080 | ✓ | loop 38.35s, list 2301px / strip 1392px |
| viewport | hc-quote-marquee @1920x1080 | ✓ | loop 74.67s, list 3360px / strip 1392px |
| viewport | no JS errors @1920x1080 | ✓ |  |
| viewport | hc-brand-marquee @2560x1440 | ✓ | loop 38.35s, list 2301px / strip 1392px |
| viewport | hc-quote-marquee @2560x1440 | ✓ | loop 74.67s, list 3360px / strip 1392px |
| viewport | no JS errors @2560x1440 | ✓ |  |
| seamless | hc-brand-marquee @375: loop point lines up, no gap at 41 sample times | ✓ | {"jump":0,"gaps":0,"D":24270} |
| seamless | hc-quote-marquee @375: loop point lines up, no gap at 41 sample times | ✓ | {"jump":0,"gaps":0,"D":59160} |
| seamless | hc-brand-marquee @1440: loop point lines up, no gap at 41 sample times | ✓ | {"jump":0,"gaps":0,"D":38350} |
| seamless | hc-quote-marquee @1440: loop point lines up, no gap at 41 sample times | ✓ | {"jump":0,"gaps":0,"D":74670} |
| seamless | hc-brand-marquee @2560: loop point lines up, no gap at 41 sample times | ✓ | {"jump":0,"gaps":0,"D":38350} |
| seamless | hc-quote-marquee @2560: loop point lines up, no gap at 41 sample times | ✓ | {"jump":0,"gaps":0,"D":74670} |
| pause | hc-brand-marquee: hover pauses, leaving resumes | ✓ | ["running","paused","running"] |
| pause | hc-brand-marquee: keyboard focus pauses (focus ring visible), blur resumes | ✓ | ["paused",true,"running"] |
| pause | hc-brand-marquee: button toggles animation and aria-pressed | ✓ | [{"pressed":"true","label":"Pause brand logos"},"paused","false","running"] |
| pause | hc-quote-marquee: hover pauses, leaving resumes | ✓ | ["running","paused","running"] |
| pause | hc-quote-marquee: keyboard focus pauses (focus ring visible), blur resumes | ✓ | ["paused",true,"running"] |
| pause | hc-quote-marquee: button toggles animation and aria-pressed | ✓ | [{"pressed":"true","label":"Pause testimonials"},"paused","false","running"] |
| a11y | Only original logos/cards are focusable (clone skipped) | ✓ | focusable links in logo strip: 1 (only Dr. Reckeweg is linked) |
| perf | Animation stops when the section is off-screen | ✓ | paused |
| perf | Animation stops while the tab is hidden, resumes when visible | ✓ | ["paused","running"] |
| perf | CSS transform animation (no interval stepping) | ✓ | {"type":"CSSAnimation","kf":"[\"translate3d(0px, 0px, 0px)\",\"translate3d(-50%, 0px, 0px)\"]"} |
| pause | hc-brand-marquee @375: touch pauses, stays paused after release, resumes ~2s later | ✓ | ["paused","paused","running"] |
| pause | hc-quote-marquee @375: touch pauses, stays paused after release, resumes ~2s later | ✓ | ["paused","paused","running"] |
| reduced | prefers-reduced-motion @375: no animation, no clone; logos wrap (6 rows); testimonials scroll with arrows | ✓ | {"lists":[1,1],"anim":"none","logosAllVisible":true,"rows":6,"quotesScroll":true,"arrows":true,"toggles":true,"sw":375," |
| reduced | prefers-reduced-motion @1440: no animation, no clone; logos wrap (2 rows); testimonials scroll with arrows | ✓ | {"lists":[1,1],"anim":"none","logosAllVisible":true,"rows":2,"quotesScroll":true,"arrows":true,"toggles":true,"sw":1440, |
| pause | hc-brand-marquee: hover pauses, leaving resumes | ✓ | ["running","paused","running"] |
| pause | hc-brand-marquee: keyboard focus pauses (focus ring visible), blur resumes | ✓ | ["paused",true,"running"] |
| pause | hc-brand-marquee: button toggles animation and aria-pressed | ✓ | [{"pressed":"true","label":"Pause brand logos"},"paused","false","running"] |
| pause | hc-quote-marquee: hover pauses, leaving resumes | ✓ | ["running","paused","running"] |
| pause | hc-quote-marquee: keyboard focus pauses (focus ring visible), blur resumes | ✓ | ["paused",true,"running"] |
| pause | hc-quote-marquee: button toggles animation and aria-pressed | ✓ | [{"pressed":"true","label":"Pause testimonials"},"paused","false","running"] |
| a11y | Only original logos/cards are focusable (clone skipped) | ✓ | focusable links in logo strip: 1 (only Dr. Reckeweg is linked) |
| perf | Animation stops when the section is off-screen | ✓ | paused |
| perf | Animation stops while the tab is hidden, resumes when visible | ✓ | ["paused","running"] |
| perf | CSS transform animation (no interval stepping) | ✓ | {"type":"CSSAnimation","kf":"[\"translate3d(0px, 0px, 0px)\",\"translate3d(-50%, 0px, 0px)\"]"} |
| pause | hc-brand-marquee @375: touch pauses, stays paused after release, resumes ~2s later | ✓ | ["paused","paused","running"] |
| pause | hc-quote-marquee @375: touch pauses, stays paused after release, resumes ~2s later | ✓ | ["paused","paused","running"] |
| seamless | hc-brand-marquee @375: loop point lines up, no gap at 41 sample times | ✓ | {"jump":0,"gaps":0,"D":24270} |
| seamless | hc-quote-marquee @375: loop point lines up, no gap at 41 sample times | ✓ | {"jump":0,"gaps":0,"D":59160} |
| seamless | hc-brand-marquee @1440: loop point lines up, no gap at 41 sample times | ✓ | {"jump":0,"gaps":0,"D":38350} |
| seamless | hc-quote-marquee @1440: loop point lines up, no gap at 41 sample times | ✓ | {"jump":0,"gaps":0,"D":74670} |
| seamless | hc-brand-marquee @2560: loop point lines up, no gap at 41 sample times | ✓ | {"jump":0,"gaps":0,"D":38350} |
| seamless | hc-quote-marquee @2560: loop point lines up, no gap at 41 sample times | ✓ | {"jump":0,"gaps":0,"D":74670} |

How these were measured:
- **viewport**, at all 18 viewports from the responsive pass:
  - exactly 2 lists (original + one clone);
  - the clone has `aria-hidden="true"` and `tabindex="-1"`;
  - original and clone have identical widths;
  - the list covers the strip (no gap possible);
  - the strip is running when in view;
  - logo tiles and testimonial cards are equal heights, with no clipped quote;
  - first-screen logos loaded before start;
  - no page scroll and no JS errors.
- **seamless:** the CSS animation is paused through the Web Animations API, then sampled. At the loop point (t = end), the clone's first item sits exactly where the original's first item started (0.000px difference). At 41 evenly spaced times the track covers the strip edge to edge. Start and end frames are saved as `docs/screenshots/marquee/loop-*-{375|1440|2560}-{start|end}.png`.
- **pause:** real mouse hover, a real Tab keypress into the strip (with the focus ring checked), the pause button (`aria-pressed` and the animation state), and touch on a 375px phone emulation (paused while touching, still paused 0.8s after release, running again about 2s after release).
- **reduced:** `prefers-reduced-motion: reduce` emulated. There is no clone and no animation. The logos form a static wrapping grid with every logo fully visible. The testimonials become a snap-scrolling row whose arrow buttons scroll it. The pause buttons are hidden. Screenshots: `reduced-*.png`.
- **perf:** the animation is a `CSSAnimation` of `translate3d(0) → translate3d(-50%)` (no timers). It is paused off-screen (IntersectionObserver) and while the tab is hidden.

### 12.3 Lighthouse (mobile, home page, local dev server)

| Run | Perf | A11y | Best pr. | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|
| 1 | 94 | 100 | 96 | 100 | 3.0 s | 0.001 | 30 ms |
| 2 | 94 | 100 | 96 | 100 | 2.9 s | 0.001 | 80 ms |
| 3 | 94 | 100 | 96 | 100 | 2.9 s | 0.001 | 80 ms |

Before the change the home page scored 95 (§11.4); after, 94 on three consecutive runs, a 1-point drop, within the 2-point limit. Accessibility stays at 100.

### 12.4 Screenshots for review
`docs/screenshots/marquee/brands-375.png`, `brands-1440.png`, `testimonials-375.png`, `testimonials-1440.png` (2× pixel density).

### 12.5 Content notes
- Testimonials 1–4 are the live site's text, verbatim.
- Testimonials 5–8 are **sample text** (`data-sample="true"`, with a code comment above each). They make no health, price, delivery-time or discount claims. `review.html` carries the note that they must be replaced before launch.
