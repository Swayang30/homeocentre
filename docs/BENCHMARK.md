# Benchmark notes — HomeoCentre storefront redesign

Research date: 6 Oct 2026. Screenshots at 375px and 1440px are in `docs/research/` (captured with headless Chrome).
We study patterns only. No colours, logos, imagery or copy from other brands are reused.

---

## 1. Current site — homoeocentre.com

What exists today: utility bar (welcome text, phone pill, Login / Cart (0) / Wishlist (0)), logo + serif nav (Home, Shop, Categories, Manufacturers, Blog, About, Contact) + search, 4-slide hero, Featured Products (tabbed by category), Latest Products grid, testimonials (4 real ones), blog (lorem), 3-up trust strip, footer (About Store, Useful Links, Categories, Contact), vertical "Call Now / Shop Now" side tabs.

**Keep (content and structure)**
1. Real store copy: "We provide genuine Homeopathy medicines, Mother Tinctures, Biochemic Tablets, Dilutions, LM Potencies and Healthcare products at affordable prices."
2. The four testimonials (Sutapa Ghosh, Arindam Saha, Moumita Banerjee, Rajib Mondal) — word for word.
3. Phone/email/location, categories (Bach Flower, Dilution, LM Potency, Pet Segments) and manufacturers.
4. Featured + Latest product groupings.
5. Hero slides 1–4 (downloaded, re-compressed).

**Drop**
- Serif nav, blog block, all lorem ipsum, "-1%" badges on every card, side tabs, About/Blog in the main nav.
- "Secure Payments" trust tile (no gateway exists).
- About page counters ("2560 satisfied clients", "25 years") — unverified, not reused anywhere.

**Findings that shape the design**
- Policy URLs (`privacy-policy.php`, `terms.php`, `shipping.php`, `refund.php`) currently render the home page → no live policy text exists. Policy pages ship as clearly marked placeholders.
- Product images: some load (`admin/uploads/products/1789975716_7803.png`, 1.4 MB PNG), others 404 (`1789018247_2688.png`). Fallback placeholder is mandatory; images also need server-side resizing (backend gap).
- Hero slides are 1600×900 with text baked into the artwork. A 1920×600 crop cuts some of that text → new crops requested from the client.
- Shop shows "Showing 12 of 262 Products" — real catalogue size is ~262.

## 2. Ordering flow — product-details.php (working) + product-details5.html (design sample)

The `?slug=sajal` URL returns "Product not found" on the staging server today, so the field inventory was taken from the design sample (rendered) and the working page's source in the project folder (`homeocentre1/product-details.php`), read-only.

**Path A — Configure My Order** (`#manualFlow`)
Potency (`#stepPotency`/`#potencyGroup`) → LM Range (`#stepLmRange`/`#lmRangeGroup`) → LM Potency (`#stepLmSubRange`/`#lmSubRangeGroup`) → Manufacturer (`#stepManufacturer`) → Medium (`#stepMedium`) → Patient name/age (`#patientNameInput`, `#patientAgeInput`) → Bottle size (`#stepBottle`) → No. of doses (`#stepDose` pick-list) **or** manual dose count (`#stepManualDose`, `#manualDoseInput`) when the medium is Sugar of Milk / SAC LAC / Powder (bottle + dose steps are skipped). Summary rows: potency, LM range, LM potency, manufacturer, medium, patient, bottle, doses, SKU, unit price, quantity (`#quantity`), shipping, total. Add to cart posts `variant_id`, `quantity`, `dose_count`, `patient_name`, `patient_age` with `ajax_action=add_to_cart`.

**Path B — Order via Prescription** (`#prescriptionFlow`)
Drop-zone `#rxDropzone`/`#rxFileInput` (JPG/PNG/PDF, 10 MB), patient name/mobile/email/age (`#rxPatientName`, `#rxPatientMobile`, `#rxPatientEmail`, `#rxPatientAge`), doctor name/mobile (`#rxDoctorName`, `#rxDoctorMobile`), preferred potency `#rxPreferredPotency` (default "Let pharmacist decide"), quantity stepper `#rxQtyValue`, instructions `#rxNotes`, submit `#rxSubmitBtn` → success panel with reference (`RX` + yymmdd + 6 hex, e.g. `RX261006A3F9C2`). POST names: `patient_name, patient_mobile, patient_email, patient_age, doctor_name, doctor_mobile, preferred_potency, quantity, notes` with `ajax_action=submit_prescription`. Trust lines: "Reviewed by licensed pharmacist", "Your prescription stays confidential", "Confirmation call before dispatch".

**Both** end with PIN check (`#pincode`, `#pincodeResult`, `ajax_action=check_pincode`).

Adopt: every field and step above, same IDs where possible. Reject: Bootstrap button pills and italic red step prompts — they read as errors.

## 3. Amazon.in (interaction patterns and density)

**Adopt**
1. Dense one-row header: logo → "Deliver to [PIN]" → wide search with a category select → account → cart with live count.
2. Thin quick-links strip under the header (our 5-item nav + category shortcuts).
3. Hero carousel with tiles overlapping its bottom edge, hero fading into the page background.
4. Horizontal product rails with scroll-snap and a "See all" link.
5. Price typography: big selling price with small superscript ₹, then "M.R.P: ~~₹x~~ (y% off)".
6. One-line delivery line on cards — but phrased as "Check delivery by PIN code", since no delivery-time promise is confirmed.
7. Product page: gallery left, details centre, sticky buy-box right.
8. "Back to top" bar above dense footer columns.
9. Mobile: search full-width under logo row.

**Reject**
- Colour-saturated promo tiles and countdowns (we have no confirmed offers).
- Star ratings / review counts (no review system).
- Bank/payment logos (no gateway).

## 4. Homeomart.com

**Adopt**
1. Announcement bar slot (ours carries only confirmed messages; offer text is `[CLIENT TO CONFIRM]`).
2. Mega-menus split by remedy type and by brand. Our manufacturer table has no "origin" column, so the menu is a flowing multi-column list (fits 3 or 30) with optional group headings the developer can switch on if an origin field is added.
3. "Shop by Category" tiles and a brand strip (styled wordmarks while we have no brand logos).
4. "From ₹x" on multi-variant products.
5. 4-up trust strip.
6. Medical disclaimer in the footer.

**Reject**
- Emoji in navigation, coupon codes in the bar, health-topic mega-menu (we have no topic taxonomy).

## 5. Healthmug (homeopathy offers page)

**Adopt**
1. Mobile sticky bottom tab bar (Home, Categories, Search, Cart, Account).
2. Circular/rounded category icons on mobile.
3. Top-brand grid with tiles of equal weight.
4. Tight card: brand, name (2-line clamp), size, MRP strike, price, % off, one "+"/add action.
5. Two-and-a-half cards visible in mobile rails so swiping is obvious.

**Reject**
- Large % OFF flags on every card (we only show discount ≥ threshold, default 5%).
- Promo banners for doctor discounts / free delivery (unconfirmed).

---

## Design direction chosen

**"A neighbourhood dispensary, run like a modern marketplace."** Amazon density and structure for speed; a dispensing-label motif for trust, used in one place only — the configurator and the "Order your way" band, where the order really is a sequence of numbered dispensing steps.

| Token | Value | Role |
|---|---|---|
| `--hc-primary` | `#0E5A43` | herbal green from the HC laurel |
| `--hc-primary-900` | `#08382A` | header bar, footer |
| `--hc-accent` | `#F2A900` | buy/add buttons only, ink text on it |
| `--hc-bg` | `#F7F8F6` | page |
| `--hc-ink` | `#16201C` | text |
| `--hc-tint` | `#E6F0EB` | placeholders, selected cards |

- Type: **Instrument Sans** (UI/body, tabular numerals for prices) + **Young Serif** (display headings only — reads like an apothecary label, not a fashion serif).
- Layout: left-aligned everywhere; dense header; rails; product page 3 columns at ≥1200px, 2 columns at tablet, stacked with sticky bottom buy-bar on mobile.
- Self-check against generic defaults: no cream background, no terracotta, no all-caps eyebrows above headings, no numbered markers except on the real ordering steps, no gradient decoration, no scroll-reveal.
