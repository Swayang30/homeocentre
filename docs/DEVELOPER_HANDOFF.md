# Developer handoff — HomeoCentre storefront frontend

This folder is a static prototype: plain HTML, one stylesheet (`assets/css/hc.css`), one script (`assets/js/hc.js`). It has no build step and no libraries. Google Fonts is the only external request.
Every page opens from disk or any static host. Sample content is clearly marked. Your job is to swap the sample content for PHP loops and keep the live backend logic as it is.

**Conventions you will see in the markup**

| Marker | Meaning |
|---|---|
| `<!-- BEGIN header → includes/header.php -->` … `<!-- END header -->` | Becomes the include. Byte-identical on every page apart from the active-nav class/`aria-current`. |
| `<!-- LOOP x: … -->` … `<!-- END LOOP -->` | Replace the repeated items with one `foreach`. |
| `<!-- CANONICAL ITEM -->` | The one item to keep as the loop body. Delete its siblings. |
| `data-slot="table.column"` | The value to print there (see §2). Escape with `htmlspecialchars()`. |
| `<!-- IF condition -->` … `<!-- END IF -->` | Conditional block. |
| `data-live-action` / `data-live-href` | The real live target. Prototype `action="#"` and `.html` links point at prototype pages. |
| `PROTOTYPE ONLY` / `SAMPLE DATA` comments | Delete during integration. |
| `<span class="hc-confirm">CLIENT TO CONFIRM: …</span>` | Copy the client must supply. Never ship it as-is. |

Link rule: every prototype link uses the live query-parameter names (`shop.html?category=3`, `product-details.html?slug=arnica-1`). To convert, replace `.html` with `.php`.

---

## 1. File map

| Prototype | Live file | Notes |
|---|---|---|
| `index.html` | `index.php` | Announcement bar is home-only, outside the header include. |
| `shop.html` | `shop.php` | One template for all / `?category=` / `?manufacturer=` / `?q=` / empty. Delete the yellow "Prototype" bar and the `data-hc="protostate"` wrapper; render the right heading block from PHP. |
| `product-details.html` | `product-details.php` | See §4. Keep the live AJAX endpoints (`ajax_action=…`). |
| `cart.html` | `cart.php` | Uses live names `qty[key]`, `update_cart`, `?action=remove&key=`, `?action=clear`. |
| `wishlist.html` | `wishlist.php` | |
| `login.html` | `login.php` + `register.php` | One page, two tabs. The register form posts to `register.php` (or merge both handlers into `login.php`). `login.html#register` opens the register tab. |
| `contact.html` | `contact.php` | |
| `privacy-policy.html`, `terms.html`, `shipping.html`, `refund.html` | same names `.php` | The live URLs currently render the home page, so no live text exists. Placeholders are marked. |
| `404.html` | Apache `ErrorDocument 404 /404.php` | |
| (footer "About Us" link) | `about.php` | Footer only, never in the main nav. The prototype points it at the footer's "About the store" text (`index.html#about-store`, `data-live-href="about.php"`). An About page design is out of scope. |
| `checkout-concept.html` | (none yet) | Design concept for the future checkout. Labelled "not yet functional". |
| `review.html` | (not deployed) | Client review hub only. |

| Partial | Becomes |
|---|---|
| `partials/header.html` | `includes/header.php` (from `<a class="hc-skip">` up to the closing drawer; includes the inline icon sprite, the PIN popover and the mobile drawer) |
| `partials/footer.html` | `includes/footer.php` (footer, mobile tab bar, call button, WhatsApp slot, toast region) |
| `partials/product-card.html` | `includes/product-card.php` — `include` it inside every product loop |
| `partials/product-rail.html` | `includes/product-rail.php` |
| `partials/breadcrumb.html` | `includes/breadcrumb.php` |
| `partials/empty-state.html` | `includes/empty-state.php` |

**Active nav:** add ` hc-nav__link--active` and `aria-current="page"` to the current main-nav link. Add `aria-current="page"` to the matching drawer and tab-bar links. Nothing else in the header changes per page.

**`<head>`** (same on every page; copy from any `.html`):
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400..700&family=Young+Serif&display=swap" media="print" onload="this.media='all'">
<noscript>…same link…</noscript>
<link rel="stylesheet" href="assets/css/hc.css">
<script src="assets/js/hc.js" defer></script>
```
`<body class="hc">` is required: the reset and base element styles only apply inside `body.hc`.

---

## 2. Slot map (`data-slot` → database)

| `data-slot` | Source |
|---|---|
| `product.id` | `products.id` |
| `product.name` | `products.product_name` |
| `product.slug` | `products.slug` (link: `product-details.php?slug=`) |
| `product.image` | `products.featured_image` (prefix the uploads path, e.g. `admin/uploads/products/`) |
| `product.short_description` | `products.short_description` |
| `product.description` | `products.description` (admin HTML; output as stored) |
| `product.additional_information` | `products.additional_information` (or build the spec list from distinct variant values) |
| `product.rating` | Reserved. Keep hidden, since there is no reviews system yet. |
| `product_gallery.image` | `product_gallery` rows for the product |
| `category.name` | `categories.category_name` (via `products.category_id`) |
| `category.product_count` | `COUNT(*)` of active products per category (filter sidebar) |
| `manufacturer.name` | `manufacturers.manufacturer_name` |
| `variant.min_selling_price` | `MIN(product_variants.selling_price)` for the product, **excluding manual-dose mediums** (Sugar of Milk / SAC LAC / Powder are per-dose prices). Print without decimals unless paise exist. |
| `variant.mrp` | `product_variants.mrp` of the row that gives the min price |
| `variant.stock_status` | "In stock" if `SUM(stock) > 0` |
| `cart.count` | Sum of quantities in `$_SESSION` cart (header + tab bar) |
| `wishlist.count-label` | Count of `$_SESSION` wishlist |
| `cart.product_name`, `cart.image`, `cart.potency`, `cart.manufacturer`, `cart.medium`, `cart.bottle`, `cart.dose`, `cart.sku`, `cart.unit_price`, `cart.line_total` | The cart line array written by `ajax_action=add_to_cart` (it already stores these from the variant). |
| `cart.patient_name` | cart line `patient_name` (+ `patient_age` → "Name (64 yrs)") |
| `cart.rx_reference`, `cart.doctor_name`, `cart.preferred_potency`, `cart.rx_file` | Cart line created by `ajax_action=submit_prescription` (reference, doctor_name, potency, original file name) |
| `cart.item_count`, `cart.subtotal`, `cart.total` | Computed from session lines. Prescription lines have no price and are excluded from the subtotal. |
| `session.delivery_pincode` | `$_SESSION['delivery_pincode']` (set by the live PIN check). JS also fills it from `localStorage`. |
| `results.range`, `results.total`, `search.query` | Shop query (`LIMIT`/`OFFSET`, `COUNT(*)`, `$_GET['q']`) |
| `store.phone`, `store.email`, `store.address`, `store.about` | Config constants (live values already in the markup) |
| `store.announcement`, `store.offer_message` | Config / admin text. Hide the element when empty. |
| `slide.image` | Banner table or static files (`assets/img/slideN.jpg`, mobile `slideN-m.jpg`) |
| `testimonial.quote`, `testimonial.name`, `testimonial.location` | Testimonials table, or static. Cards 1–4 are the live testimonials, verbatim; 5–8 are **sample text** (`data-sample="true"`), see §9. Output the name only: the avatar initials are generated from it by `hc.js` (`[data-hc-initials]`). |
| `brand.logo` | `<img src>` of the brand logo (`assets/img/brands/…` in the prototype) |
| `brand.name` | The logo's `alt` text, e.g. `Dr. Reckeweg & Co. Germany`. Marked `data-slot-alt="brand.name"` on the `<img>`, because one element cannot carry two `data-slot` attributes |
| `brand.url` | `href` of a linked tile: `shop.php?manufacturer={manufacturers.manufacturer_id}`. Only output the `<a>` variant when the brand exists in `manufacturers`. |
| `manufacturer.id` (on a brand tile) | Placeholder on non-linked tiles (`<span class="hc-logo-tile" data-manufacturer-id="">`). When a brand is added to `manufacturers`, switch that item to the `<a>` variant |
| `page.content`, `page.title` | Policy page body / breadcrumb title |
| `site.year` | `date('Y')` |
| `login.error` | Login error message from `login.php` |
| `rail.*`, `empty.*` | Partial parameters |

**Money:** format server-side as `₹` + `number_format($v, 0)` (or 2 decimals where paise exist). Indian digit grouping (`₹1,23,456`) is what JS uses for live totals; a helper such as `NumberFormatter('en_IN', NumberFormatter::CURRENCY)` matches it.

**Discount badge:** the prototype hides `% off` until `hc.js` computes it from `data-mrp`/`data-price` and checks `HC.config.DISCOUNT_THRESHOLD` (default **5**, set once at the top of `hc.js`). Always print `data-mrp` and `data-price` on `.hc-price[data-hc="discount"]`. You can also render the badge server-side with the same threshold, wrapped in `<!-- IF discount >= threshold -->`.

**Images:** add `data-hc-fallback` and `data-initial="A"` to every product `<img>`. Any image that fails, now or later, is swapped for the designed bottle placeholder. Keep `width`/`height` attributes so grids don't jump.

---

## 3. Form map

### Product page — Configure My Order (`#hcCfgForm`)
Live handler: `product-details.php`, POST, `ajax_action=add_to_cart`.

| Prototype field | Name / ID | Live | Status |
|---|---|---|---|
| hidden | `ajax_action=add_to_cart` | same | matches live |
| hidden | `slug` | same | matches live |
| hidden | `variant_id` (`#hcVariantId`) | `variant_id` | matches live name (the live page posts it from JS state; here it is a real hidden input) |
| hidden | `dose_count` (`#hcDoseCount`) | `dose_count` | matches live (0 unless a manual-dose medium) |
| quantity | `quantity` / `#quantity` (`form="hcCfgForm"`) | `quantity` / `#quantity` | matches live |
| patient name | `patient_name` / `#patientNameInput` | same | matches live |
| patient age | `patient_age` / `#patientAgeInput` | same | matches live |
| typed doses | `#manualDoseInput`, error `#manualDoseError` | same IDs | matches live (value goes to `dose_count`) |
| Add to Cart | `#addToCartBtn` | same | matches live |
| CSRF | — | `csrf_token` | **developer to add** (comment marks the spot) |

Step containers keep the live IDs: `#stepPotency`, `#stepLmRange`, `#stepLmSubRange`, `#stepManufacturer`, `#stepMedium`, `#stepBottle`, `#stepDose`, `#stepManualDose`, with option groups `#potencyGroup`, `#lmRangeGroup`, `#lmSubRangeGroup`, `#manufacturerGroup`, `#mediumGroup`, `#bottleGroup`, `#doseGroup`.
Summary IDs match live: `#sumPotency #sumLmRange #sumLmSub #sumMfr #sumMedium #sumPatient #sumBottle #sumDose #sumSku #sumUnitPrice #sumQty #sumShipping #sumTotal`, rows `#rowLmRange #rowLmSub #rowBottle …`, plus `#priceDisplay`, `#mrpDisplay`, `#priceNote`, `#stockLine`, `#configAlert`, `#pricingSummary`, `#mainProductImage`.
Mode switch radios: `#modeCardManual` / `#modeCardPrescription` (name `order_mode`), panels `#manualFlow` / `#prescriptionFlow`. `product-details.php?slug=x#prescription` opens the prescription path.

### Product page — Order via Prescription (`#rxForm`)
Live handler: `product-details.php`, POST multipart, `ajax_action=submit_prescription`.

| Field | Name | ID | Status |
|---|---|---|---|
| file | `prescription` | `#rxFileInput` (zone `#rxDropzone`) | matches live (`append('prescription', …)`) |
| patient name * | `patient_name` | `#rxPatientName` | matches live |
| patient mobile * | `patient_mobile` | `#rxPatientMobile` | matches live (10 digits; +91 prefix stripped client-side) |
| patient email * | `patient_email` | `#rxPatientEmail` | matches live |
| patient age | `patient_age` | `#rxPatientAge` | matches live (0–120) |
| doctor name * | `doctor_name` | `#rxDoctorName` | matches live |
| doctor mobile * | `doctor_mobile` | `#rxDoctorMobile` | matches live |
| preferred potency | `preferred_potency` | `#rxPreferredPotency` (default "" = Let pharmacist decide) | matches live |
| quantity | `quantity` | `#rxQtyValue` (+ `#rxQtyDec`, `#rxQtyInc`) | matches live |
| instructions | `notes` | `#rxNotes` | matches live |
| CSRF | `csrf_token` | — | **developer to add** |

Other live IDs kept: `#rxAlert`, `#rxDropEmpty`, `#rxFilePreview`, `#rxFileThumb`, `#rxFileName`, `#rxFileSize`, `#rxFileRemove`, `#rxFileError`, `#rxSubmitBtn`, `#rxSubmitLabel`, `#rxSuccessPanel` (now the modal dialog), `#rxSumReference`, `#rxSumPatient`, `#rxSumFile`, `#rxSumPotency`, `#rxSumQty`, `#rxEditBtn`.
Accepted types match the live page: **JPG, PNG, WebP and PDF**, max 10 MB (`HC.config.RX_TYPES` / `RX_EXT` / `RX_MAX_BYTES`).
**Camera capture (touch devices):** a second input `#rxCameraInput` (`accept="image/*" capture="environment"`, no `name`) sits next to `#rxFileInput`. When a photo is taken, `hc.js` moves it into `#rxFileInput`, and the `FormData` passed with `hc:rx-submitted` always carries the chosen file as `prescription`. The backend needs no change.

### PIN check
| Field | Name / ID | Live | Status |
|---|---|---|---|
| hidden | `ajax_action=check_pincode` | same | matches live |
| PIN | `pincode` / `#pincode` | same | matches live |
| result | `#pincodeResult` | same | matches live |

### Cart (`cart.php`, POST)
`qty[{cart_key}]` per line, submit `update_cart` → **matches live**. Remove `cart.php?action=remove&key={cart_key}`, empty `cart.php?action=clear` → **matches live**.

### Login (`login.php`, POST)
`email`, `password`, `remember` → **matches live**. "Forgot password?" links to the live `forgot-password.php` (`data-live-href`; in the prototype it stays on the login page).

### Register (`register.php`, POST)
`first_name`, `last_name`, `email`, `phone`, `password`, `confirm_password`, `address`, `city`, `state`, `pincode`, `country`, `terms` → **matches live**. No password rule is invented. The helper under the password field (`#reg-pass-hint`, `data-slot="register.password_rule"`) shows **DEVELOPER TO MATCH LIVE RULE**. Print the rule `register.php` already enforces (and add the matching `minlength`/`pattern` to `#reg-pass`).

### Contact (`contact.php`, POST) — **developer to match**
The live `#contacts-form` has no field names and `action="#"`. Prototype names: `name`, `phone`, `email`, `subject`, `message`. The form ID `contacts-form` is kept.

### Header search (`shop.php`, GET) — **developer to match**
`q` (text) and `category` (id; empty = all). The live header search has no names yet.

### Shop filters (`shop.php`, GET) — **developer to match**
`category` (radio, id), `manufacturer` (radio, id), `potency[]`, `medium[]`, `min_price`, `max_price`, `sort` (`latest` | `price_asc` | `price_desc` | `name`), `page`. The live shop has sort options Latest / Price low-high / high-low / Product name. Map these values to its existing ones.

### Wishlist
Add: `wishlist.php?id={id}` → **matches live**. Remove: prototype uses `wishlist.php?remove={id}` → **developer to match**.

---

## 4. Configurator contract

### Data
Put one JSON array in the page and the configurator builds itself from it:

```php
<script type="application/json" id="hc-variant-data">
<?= json_encode($variantMatrix, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>
</script>
```

`hc.js` accepts **either** the live `$variantMatrix` keys already built in `product-details.php` **or** the plain column names. Use whichever is easiest:

| Meaning | Accepted keys (first non-empty wins) |
|---|---|
| id | `variant_id`, `id` |
| potency | `potency`, `potency_name` |
| LM range | `lm_range`, `range_name` |
| LM potency | `lm_sub_range`, `sub_range`, `sub_range_name` |
| manufacturer | `manufacturer`, `mfr`, `manufacturer_name` |
| medium | `medium`, `medium_name` |
| bottle | `bottle_quantity`, `bottle`, `bottle_size` |
| doses | `dose`, `dose_name` |
| SKU | `sku` |
| MRP | `mrp` |
| price | `selling_price`, `price` |
| stock | `stock` |

Rules the script applies:
- Each step shows the distinct values present for the product.
- An option with no row for the current selection is **disabled** and labelled "Not available". If every matching row has `stock = 0`, it is disabled and labelled "Out of stock".
- If a potency has rows with an LM range, it branches: LM range → LM potency. Step numbers renumber automatically.
- If only one value is orderable at a step (other than potency), it is pre-selected. The other values stay visible but disabled.
- **Manual-dose mediums** (`HC.config.MANUAL_DOSE_MEDIUMS = ['sugar of milk','sac lac','powder']`, or any medium whose rows have no bottle and no dose) replace the bottle and dose steps with a typed dose count. Unit price = `selling_price × doses`. This is the same rule as the live page.
- Changing an earlier answer clears later answers that are no longer orderable.

### Hidden inputs written
`variant_id` (empty until complete) and `dose_count` (0 unless manual-dose), both inside `#hcCfgForm`.

### Events (all bubble from the configurator root, `[data-hc="configurator"]`)
| Event | When | `detail` | Cancelable |
|---|---|---|---|
| `hc:variant-change` | Any change while complete, or on complete ↔ incomplete | `{complete, variant (raw JSON row), variantId, unitPrice, doseCount, quantity, state}` | no |
| `hc:add-to-cart` | Add to Cart pressed with a complete, in-stock selection | `{variant_id, quantity, dose_count, patient_name, patient_age, slug, variant}` | **yes**: call `e.preventDefault()`, then POST to the live endpoint yourself |
| `hc:mode-change` | Configure ↔ Prescription switch | `{mode: 'manual'\|'prescription'}` | no |

Hook-up example (drop into the page or a small `product-details.js`):
```js
document.addEventListener('hc:add-to-cart', function (e) {
  e.preventDefault();
  var fd = new FormData(document.getElementById('hcCfgForm'));   // has ajax_action, slug, variant_id, dose_count, quantity, patient_*
  fd.append('csrf_token', PAGE.csrf);
  fetch('product-details.php', { method: 'POST', body: fd, credentials: 'same-origin' })
    .then(function (r) { return r.json(); })
    .then(function (j) {
      if (j.success) { HC.counts.set('cart', j.cart_count); HC.toast('Added to cart', { link: { href: 'cart.php', text: 'View cart' } }); }
      else HC.toast(j.message || 'Could not add to cart', { type: 'error' });
    });
});
```

### Prescription events (from `#rxForm`)
| Event | `detail` | Use |
|---|---|---|
| `hc:rx-submitted` (cancelable) | `{form, formData, file, success(reference)}` | Prevent default, POST `formData` (it already holds every live field name plus the file as `prescription`), then call `e.detail.success(json.reference)` and `HC.counts.set('cart', json.cart_count)` (the live response has both). The modal opens with that reference. |

Validation happens before the event fires: the file (type and 10 MB), the required fields, 10-digit mobiles, email, and age 0–120. The error copy matches the live server messages.

### PIN events (from `[data-hc="pincode"]`)
| Event | `detail` | Use |
|---|---|---|
| `hc:pincode-check` (cancelable) | `{pincode, done(result)}` | Prevent default, POST `ajax_action=check_pincode`, then call `done({ ok: json.success, message: json.message \|\| ('Delivery available to ' + json.pincode + '.'), shippingCharge: json.shippingCharge })`. |
| `hc:pincode-result` | the result | The configurator listens and adds shipping to `#sumShipping` and the total. |
| `hc:pin-change` (document) | `{pincode}` | Fired whenever the saved PIN changes (header chip or product page). |

### Other events and APIs
`hc:filter-count` (cancelable, from the shop filter form: `{form, params, done(n)}`; answer with the real result count for the query string in `params`, and the sheet button reads "Show n results". The prototype default is a rough estimate from the sample counts), `hc:wishlist-toggle` (cancelable, `{productId, added, href}`), `hc:quick-add` (cancelable, `{productId, href}`), `hc:cart-remove` (cancelable), `hc:cart-update`, `hc:form-submit` (cancelable, for `data-hc="validate"` forms with `action="#"`; once you set a real `action` the form posts normally after validation), `hc:tab-change`.

`window.HC` exposes `HC.toast(msg, opts)`, `HC.counts.set/add('cart'|'wishlist', n)`, `HC.overlay.open/close(id)`, `HC.pin.get/set`, `HC.init(root)` (call it after injecting new markup), `HC.config`, and `HC.util`.

---

## 5. Responsive system (keep intact when converting to PHP)

### Breakpoints (mobile-first)
Media queries can't read custom properties, so these values are used literally in `hc.css`. They are listed once in the `:root` comment (`--hc-bp-*`) and mirrored in `HC.config.BREAKPOINTS`.

| Token | Width | Device class |
|---|---|---|
| (floor) | 320 | smallest supported phone |
| `--hc-bp-sm` | 360 | standard phones |
| `--hc-bp-md` | 480 | large phones |
| `--hc-bp-lg` | 600 | small tablets / foldables open |
| `--hc-bp-xl` | 768 | tablets portrait: nav strip appears, tab bar and burger go |
| `--hc-bp-2xl` | 1024 | tablets landscape / small laptops: filter sidebar, sticky summary column |
| `--hc-bp-3xl` | 1280 | laptops: 3-column product page, header labels |
| `--hc-bp-4xl` | 1440 | desktops: 5-column grids; content capped at 1440px (`--hc-container: 90rem`) |

Type, spacing and gutters use `clamp()` and `rem`, so the site follows the browser and phone font-size setting. Card internals use `cqi` (container units).

### Components that use container queries
| Container (`container-type: inline-size`) | Name | What adapts |
|---|---|---|
| `.hc-card` | `hc-card` | Type, padding, badge and heart size, CTA label size; delivery line hides and "M.R.P:" label becomes screen-reader-only below 12.5rem |
| `.hc-cattiles__grid > li` | `hc-tile` | Compact icon tile → full card tile at 11rem |
| `.hc-brands > li` | `hc-brand` | Wordmark size, padding |
| `.hc-trust > li` | `hc-trust` | Icon beside text → stacked below 13rem |
| `.hc-cartlist` (the cart form) | `hc-cart` | Cart line: stacked (image + details, controls and price underneath) → 3 columns at 36rem |

Keep the wrapping `<li>` / `.hc-cartlist` elements when you write the loops: the queries attach to them.

### Sticky-element offsets
| Variable | Set by | Meaning |
|---|---|---|
| `--hc-tabbar-h` | CSS | Bottom tab bar height: `3.75rem` below 768px, else 0; 0 in short landscape and while the keyboard is open |
| `--hc-buybar-h` | `hc.js` (measured), CSS fallback `4.5rem` | Height of the sticky bottom bar on pages that have one (product, cart), below 1024px |
| `--hc-header-offset` | `hc.js` | Visible height of the sticky header (0 while it is slid away). Used as `top` by every sticky element (filters, summary column, shop toolbar, policy contents, gallery) |
| `--hc-header-h` | `hc.js` | Full header height. Constant while scrolling, so it's used for heights (`max-height`), never for `top` |
| `--hc-safe-t/r/b/l` | CSS | `env(safe-area-inset-*)` for notched phones (header, drawer, tab bar, sticky bar, call button, sheets, full-screen modal) |
| `--hc-bottom-ui` | CSS (on `body.hc`) | `tab bar + bottom bar + safe area`. `body` bottom padding, the call button and phone toasts all sit on it, so the last section is never hidden |

State classes written by `hc.js` (style hooks only, no backend meaning):
- `body.hc-has-buybar`: the page has a sticky bottom bar.
- `body.hc-bar-on`: it is showing; the call button hides.
- `body.hc-is-typing`: touch keyboard is open; tab bar, bottom bar and call button hide.
- `body.hc-has-toast`.
- `html.hc-is-locked`: a drawer, sheet or modal is open; scroll is locked.
- `.hc-header.hc-is-hidden`.
- `.hc-fab.hc-is-avoiding`: the call button would cover a control, so it steps aside.

### Behaviour components added in this pass (switched on from markup)
| `data-hc` | On | Behaviour |
|---|---|---|
| `stickyheader` | `.hc-header` | Slides away on scroll down, back on scroll up; writes the header variables |
| `stickybar` + `data-hc-watch="#id"` | `.hc-buybar` | Shows once the watched summary is out of view (and not hidden); `[data-hc-bar-toggle]` expands it to the full summary on the product page |
| `fab` | `.hc-fab` | Collision check that hides the call button over any button, field or tile |
| `respdetails` + `data-open-min` | `<details>` | Always open at or above that width, collapsible below it (footer link columns at 600, policy contents at 1024) |
| `filtercount` | shop filter form | Live "Show n results" (see `hc:filter-count`) |
| `tabs` + `data-hc-accordion="767"` | product info tabs | Become an accordion at 767px and below (`.hc-acc__btn[data-hc-acc-for]` before each panel) |
| `marquee` | `.hc-marquee` (home: brand logos, testimonials) | Seamless auto-scrolling strip; see "Marquee" below |

The overlays (drawer, filter sheet, phone modal) close on swipe as well as on Escape and scrim tap. The phone gallery adds dots and swipe automatically from the existing thumbnails.

### Marquee (brand logos, testimonials)
- **The PHP loop outputs each item exactly once.** `hc.js` creates the single clone of `ul.hc-marquee__list` inside `.hc-marquee__track`. The clone gets `aria-hidden="true"` and `tabindex="-1"` on its links and cards, and there is never more than one clone. The track animates with a CSS `translate3d(-50%)` loop, which is seamless because both copies are identical in width (each list carries its trailing gap as padding).
- **Options** (data attributes on `.hc-marquee`):
  - `data-direction="rtl|ltr"` (logos rtl, testimonials ltr);
  - `data-speed` in px/second, which overrides the CSS `--hc-marquee-speed` (logos 60, about 38s per loop on desktop; testimonials 45, about 75s);
  - `data-pause-on="hover focus touch"`;
  - `data-static="wrap|scroll"`: the reduced-motion layout (wrapping logo grid, or a snap-scrolling row with the `[data-hc-mq-prev]` / `[data-hc-mq-next]` arrows).
- **Duration and width:** duration = list width ÷ speed, recalculated on resize and orientation change. If the list is narrower than the strip, the gap between items grows instead of adding clones.
- **When it runs:** only once the strip is on screen, the tab is visible and the first screen-width of logo images has loaded. Logos stay `loading="lazy"` until the strip is within 300px of the viewport.
- **Pauses:**
  - hover (mouse and trackpad only);
  - keyboard focus (`:focus-visible`);
  - touch, resuming 2s after release;
  - the heading-row button `[data-hc-marquee-toggle][aria-controls="{marquee id}"]`, where `aria-pressed="true"` means paused (labels "Pause brand logos" / "Pause testimonials").
- **Testimonial cards** get `tabindex="0"` from `hc.js` so keyboard users can stop the strip and read. All cards stretch to the tallest one, so no quote is clipped.

**Dev check:** add `?debug=1` to any URL. Elements wider than the viewport get a red outline and are listed in the console (`HC.debugOverflow()`).

### Hero slides
- **Type 1 (used now), `.hc-slide--text`:** a `<picture class="hc-slide__art">` art slot (desktop 1920×600 with the subject in the right third; mobile 900×506), with the headline, sub-line and CTAs as real HTML (`data-slot="slide.title|text|cta_url"`). The placeholders `assets/img/hero-placeholder*.svg` are marked **CLIENT TO SUPPLY: hero artwork**. Per-slide background via `style="--hc-slide-bg: …"`.
- **Type 2, `.hc-slide--image`:** an image-only `<picture>` (desktop 1920×600, mobile 900×675). A commented example sits at the end of the slide loop in `index.html`.

## 6. Assets per page, and what to remove from the old theme

Every page loads only the following: the Google Fonts CSS (async), `assets/css/hc.css`, and `assets/js/hc.js` (defer). There are no per-page assets. Images: `assets/img/logo-104.png`, `assets/img/brands/logo1–12.jpg` (11 files; `logo3.jpg` was an exact duplicate of `logo2.jpg` and is not used), `hero-placeholder.svg` / `hero-placeholder-m.svg` (home, until the client artwork arrives), plus product uploads.
**Product images:** cards and the product page use `srcset`/`sizes` (`product-sample-400.jpg 400w, product-sample.jpg 600w` in the prototype). Generate at least a ~400px and a ~800px version of every upload and print both. `slide1–4.jpg` remain in `assets/img/` for the image-only slide type.

Once a page is migrated, remove from it: Bootstrap 4 CSS/JS, Owl Carousel, Slick, Isotope, WOW.js + animate.css, Magnific Popup, the theme's font icons and `style.css`/`responsive.css`, and the vertical "Call Now / Shop Now" side tabs.
**jQuery 1.12:** keep it on `product-details.php` only while live code there still needs it. `hc.js` never touches `$` or `jQuery`. Every page was tested with Bootstrap 4.6 CSS + jQuery 1.12.4 loaded alongside, with no visual or functional breakage (see QA report).

Server (recommended, not frontend): enable `mod_deflate` for html/css/js/svg and `mod_expires` long cache for `/assets/`. Lighthouse mobile performance went from 77–88 to 89–90 with those two alone.

---

## 7. Recommended integration order

1. **Header/footer includes**: `includes/header.php`, `includes/footer.php`, `<head>`, `body.hc`. Wire `cart.count`, `wishlist.count-label` and the login state.
2. **Home**: slides, category tiles, featured/latest loops with the product-card include, manufacturers.
3. **Shop**: query → grid, filters, sort, pagination, result count, empty state.
4. **Wishlist**
5. **Cart**: session lines, Rx lines, totals.
6. **Login / Register**
7. **Contact**
8. **Policies**: once the client sends text.
9. **Product page, last**: gallery, the `hc-variant-data` JSON, then the three event hooks (`hc:add-to-cart`, `hc:rx-submitted`, `hc:pincode-check`) calling the existing AJAX handlers. Delete the prototype slug-switch script and the two `hc-sample-*` JSON blocks.

---

## 8. Known backend gaps the design assumes (backend work, not frontend)

1. **Broken product image paths.** Some files under `admin/uploads/products/` return 404 (e.g. `1789018247_2688.png`). The working ones are 1.4 MB PNGs. The fallback hides broken images, but the backend should fix the paths and generate resized images (about 400 px for cards, 800 px for the product page, WebP/JPEG).
2. **No reviews system.** No ratings are shown anywhere. A hidden `product.rating` slot is reserved in the card.
3. **No checkout or payment gateway.** "Proceed to Checkout" links to `checkout-concept.html` (design only). No payment logos or "secure payment" claims appear, and the "Secure payments" trust tile is commented out.
4. **Quick add bypasses configuration.** `cart.php?action=add&id=` adds a product without a variant. Use the `hc-card--quickadd` modifier only for products with exactly one variant row, and make `cart.php` pick that row. Everything else uses "Choose Potency".
5. **Policy pages have no live content.** The URLs currently render the home page.
6. **Hero artwork.** The live `slideN.jpg` files (1600×900) have text baked in, which crops badly on wide banners. The prototype therefore uses live-text slides with placeholder art. The client should supply text-free artwork: 1920×600 desktop and 900×506 mobile.
7. **Manufacturer data**: there is no logo column (wordmarks are used) and no origin column (the mega-menu groups are optional). The development database also contains SBL, Bakson and Willmar Schwabe India, which the live site doesn't list.
8. **Shipping and delivery data**: the PIN check endpoint returns a charge, but rates and delivery times aren't confirmed. The prototype shows "CLIENT TO CONFIRM" where those numbers would go.

## 9. Known content gaps (client / content work)

1. **Testimonials 5–8 are sample text** written for the design review: Priyanka Dutta (New Town), Sourav Chatterjee (Barasat), Ananya Sen (Garia) and Debashis Roy (Serampore). Each is marked `data-sample="true"` with a `<!-- SAMPLE TESTIMONIAL — replace with real customer feedback before go-live -->` comment. Replace them with real customer reviews (or delete them) before launch. Cards 1–4 are the live site's testimonials, verbatim.
2. **Brand logos are low resolution** (200 × 100 JPG from the live site). They look soft at 88px tall on high-density screens. Ask the client or the manufacturers for SVG or ≥ 600px-wide PNG files.
3. **Only one brand is linked.** Of the 11 logos, only Dr. Reckeweg exists in the live `manufacturers` table (id 1). The other ten (Dr. Willmar Schwabe India, Adven, Bakson Group, Wheezal Homoeopathy, Hapco, Bhargava Phytolab, Fourrts, SSL, Dr. B Homeopathy, ADEL Germany) are non-linked tiles until they are added as manufacturers. The development database already lists SBL, Bakson and "WILLMAR SCHWABE INDIA", which would let two of these be linked once the live table matches.
