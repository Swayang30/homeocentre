# Authoring helper (not shipped). Assembles static pages from src/ + partials.
import json, re, os, html, itertools
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'src')
OUT = 'E:/PLAN D MEDIA PROJECTS/Homeocentre'

def rd(p): return open(p, encoding='utf-8').read()
def wr(p, s):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    open(p, 'w', encoding='utf-8', newline='\n').write(s)

sprite = rd(os.path.join(OUT, 'assets/img/icons.svg')).strip()
header_tpl = rd(os.path.join(SRC, '_header.html')).replace('{{SPRITE}}', sprite)
footer_tpl = rd(os.path.join(SRC, '_footer.html')).replace('<section class="hc-footer__about"', '<section class="hc-footer__about" id="about-store"')

def activate(tpl, key):
    def a(m): return ' hc-nav__link--active' if m.group(1) == key else ''
    def c(m): return ' aria-current="page"' if m.group(1) == key else ''
    tpl = re.sub(r'\{\{A:(\w+)\}\}', a, tpl)
    return re.sub(r'\{\{C:(\w+)\}\}', c, tpl)

# ---------------------------------------------------------------- SAMPLE DATA
CATS = {1: 'LM Potency', 3: 'Dilution', 4: 'Bach Flower', 5: 'Pet Segments'}
IMG_OK = 'assets/img/product-sample-400.jpg'
SRCSET = ' srcset="assets/img/product-sample-400.jpg 400w, assets/img/product-sample.jpg 600w" sizes="(min-width: 1440px) 17vw, (min-width: 1024px) 22vw, (min-width: 600px) 30vw, 46vw"'
IMG_BROKEN = 'admin/uploads/products/1789018247_2688.png'  # 404s on live too: demonstrates the fallback
PRODUCTS = [
    # id, name, slug, cat, mfr, from_price, mrp, img, new
    (101, 'Arnica Montana', 'arnica-1', 3, 'Dr. Reckeweg', 90, 108, IMG_OK, False),
    (102, 'Chamomilla', 'chamomilla', 1, 'Indian', 99, 100, IMG_BROKEN, True),
    (103, 'Chelidonium', 'chelidonium', 1, 'Indian', 99, 100, IMG_OK, True),
    (104, 'Chimaphilla', 'chimaphilla', 1, 'Indian', 99, 100, IMG_BROKEN, True),
    (105, 'Chenopodium', 'chenopodium', 1, 'Indian', 99, 100, IMG_OK, True),
    (106, 'Cephalandra Ind.', 'cephalandra-ind', 1, 'Indian', 99, 100, IMG_BROKEN, True),
    (107, 'Cenchris Con.', 'cenchris-con', 1, 'Indian', 99, 100, IMG_OK, True),
    (108, 'Cedron', 'cedron', 1, 'Indian', 99, 100, IMG_BROKEN, False),
    (109, 'Ceanothus A.', 'ceanothus-a', 1, 'Indian', 99, 100, IMG_OK, False),
    (110, 'Causticum', 'causticum', 3, 'German', 115, 140, IMG_OK, False),
    (111, 'Cassia Sophera', 'cassia-sophera', 1, 'Indian', 99, 100, IMG_BROKEN, False),
]
PBY = {p[2]: p for p in PRODUCTS}

def esc(s): return html.escape(str(s), quote=True)
def inr(n):
    s = f'{n:,.0f}'
    # Indian grouping
    n = int(round(n)); s = str(n)
    if len(s) > 3: s = re.sub(r'(\d)(?=(\d\d)+\d$)', r'\1,', s[:-3]) + ',' + s[-3:]
    return s

def card(slug, canonical=False, quick=False, ctx='', eager=False):
    pid, name, slug, cat, mfr, price, mrp, img, new = PBY[slug]
    href = f'product-details.html?slug={slug}'
    out = []
    if canonical: out.append('<!-- CANONICAL ITEM -->')
    mod = ' hc-card--quickadd' if quick else ''
    cta_comment = '<!-- CTA: default "Choose Potency". Add class hc-card--quickadd on .hc-card for single-variant products to show "Add to Cart" instead. -->' if canonical else ''
    out.append(f'''<article class="hc-card{mod}" data-product-id="{pid}" data-slot="product.id">
  <a class="hc-card__media" href="{href}" tabindex="-1" aria-hidden="true"><img src="{img}"{SRCSET if img == IMG_OK else ''} alt="{esc(name)}" width="400" height="400" loading="{'eager' if eager else 'lazy'}" decoding="async" data-hc-fallback data-initial="{esc(name[0])}" data-slot="product.image"></a>
  <div class="hc-card__badges">
    <!-- IF discount >= threshold --><span class="hc-badge hc-badge--off" data-off-wrap hidden><span data-off></span></span><!-- END IF -->
    {'<!-- IF is_new --><span class="hc-badge hc-badge--new">New</span><!-- END IF -->' if new else ''}
  </div>
  <button class="hc-card__wish" type="button" data-hc="wish" data-product-id="{pid}" data-name="{esc(name)}" data-live-href="wishlist.php?id={pid}" aria-pressed="false" aria-label="Add {esc(name)} to wishlist"><svg class="hc-icon" aria-hidden="true"><use href="#i-heart"/></svg></button>
  <div class="hc-card__body">
    <p class="hc-card__cat" data-slot="category.name">{CATS[cat]}</p>
    <h3 class="hc-card__name"><a href="{href}" data-slot="product.name">{esc(name)}</a></h3>
    <p class="hc-card__mfr">by <span data-slot="manufacturer.name">{esc(mfr)}</span></p>
    <!-- RATING SLOT (reserved, keep hidden until a reviews system exists): <div class="hc-card__rating" data-slot="product.rating" hidden></div> -->
    <div class="hc-card__price hc-price" data-hc="discount" data-mrp="{mrp}" data-price="{price}">
      <span class="hc-price__now"><!-- IF variant_count > 1 --><span class="hc-price__from">From</span><!-- END IF --><span class="hc-price__cur">&#8377;</span><span data-slot="variant.min_selling_price">{inr(price)}</span></span>
      <!-- IF mrp > selling_price --><span class="hc-price__was"><span class="hc-price__mrp"><span class="hc-price__mrp-label">M.R.P: </span><s>&#8377;<span data-slot="variant.mrp">{inr(mrp)}</span></s></span> <span class="hc-price__off" data-off-wrap hidden>(<span data-off></span>)</span></span><!-- END IF -->
    </div>
    <p class="hc-card__ship"><svg class="hc-icon hc-icon--sm" aria-hidden="true"><use href="#i-truck"/></svg><span class="hc-card__ship-text">Check delivery by PIN</span></p>
    {cta_comment}
    <div class="hc-card__cta">
      <a class="hc-btn hc-btn--accent hc-card__cta-choose" href="{href}">Choose Potency</a>
      <a class="hc-btn hc-btn--accent hc-card__cta-add" href="cart.html?action=add&amp;id={pid}" data-live-href="cart.php?action=add&amp;id={pid}" data-hc="quickadd" data-product-id="{pid}"><svg class="hc-icon hc-icon--sm" aria-hidden="true"><use href="#i-cart"/></svg>Add to Cart</a>
    </div>
  </div>
</article>''')
    return '\n'.join(out)

def cards(slugs, wrap='li', quick_slugs=(), loop='products', eager=0):
    items = []
    for i, s in enumerate(slugs):
        items.append(f'<{wrap}>' + card(s, canonical=(i == 0), quick=(s in quick_slugs), eager=(i < eager)) + f'</{wrap}>')
    return f'<!-- LOOP {loop}: one item per row of the product query -->\n' + '\n'.join(items) + '\n<!-- END LOOP -->'

def wish(slugs):
    items = []
    for i, sl in enumerate(slugs):
        c = card(sl, canonical=(i == 0)).replace('aria-pressed="false" aria-label="Add', 'aria-pressed="true" aria-label="Remove').replace('to wishlist"><svg', 'from wishlist"><svg')
        pid = PBY[sl][0]
        items.append(f'<li data-hc-wish-item>{c}<a class="hc-btn hc-btn--ghost hc-btn--sm" style="margin-top:6px" href="wishlist.html?remove={pid}" data-live-href="wishlist.php?remove={pid}" data-hc="wishremove"><svg class="hc-icon hc-icon--sm" aria-hidden="true"><use href="#i-trash"/></svg>Remove</a></li>')
    return '<!-- LOOP wishlist: one item per product id in $_SESSION wishlist -->\n' + '\n'.join(items) + '\n<!-- END LOOP -->'

# -------------------------------------------------------- VARIANT SAMPLE DATA
DOSES = {'30ml': [2, 3, 4], '60ml': [2, 3, 4, 8], '120ml': [2, 3, 4, 8, 16]}
MULT = {'30ml': {2: 1.0, 3: 1.4, 4: 1.8}, '60ml': {2: 1.8, 3: 2.4, 4: 3.0, 8: 5.5}, '120ml': {2: 3.2, 3: 4.5, 4: 5.8, 8: 10.0, 16: 18.0}}
POT_BASE = {'6CH': 90, '12CH': 95, '30CH': 100, '200CH': 110, '1M': 130, '10M': 160}
MFR_F = {'Dr. Reckeweg': 1.25, 'German': 1.4, 'Indian': 1.0}
MED_F = {'Distilled Water': 1.0, 'Globules': 1.1, 'Liquid': 1.15}

def arnica_rows():
    rows = []; vid = [1000]
    def add(**k):
        vid[0] += 1
        price = k.pop('price'); mrp = round(price * 1.2)
        r = dict(variant_id=vid[0], potency=k['potency'], lm_range=k.get('lm_range'), lm_sub_range=k.get('lm_sub_range'),
                 manufacturer=k['manufacturer'], medium=k['medium'], bottle_quantity=k.get('bottle_quantity'), dose=k.get('dose'),
                 sku=k['sku'], mrp=mrp, selling_price=round(price), stock=k.get('stock', 25))
        rows.append(r)
    plan = {
        'Dr. Reckeweg': {'Distilled Water': ['30ml', '60ml'], 'Globules': ['30ml'], 'Liquid': ['30ml']},
        'Indian':       {'Distilled Water': ['30ml', '60ml', '120ml'], 'Globules': ['30ml', '60ml']},
        'German':       {'Globules': ['30ml']},
    }
    pots = {'Dr. Reckeweg': ['6CH', '30CH', '200CH', '1M', '10M'], 'Indian': ['6CH', '12CH', '30CH', '200CH', '1M'], 'German': ['30CH', '200CH']}
    code = {'Dr. Reckeweg': 'DRR', 'Indian': 'IND', 'German': 'GER', 'Distilled Water': 'DW', 'Globules': 'GLB', 'Liquid': 'LIQ'}
    for mfr, meds in plan.items():
        for pot in pots[mfr]:
            for med, bottles in meds.items():
                if med == 'Liquid' and pot not in ('6CH', '30CH'): continue
                for b in bottles:
                    for d in DOSES[b]:
                        stock = 0 if (mfr == 'Dr. Reckeweg' and pot == '10M' and b == '60ml') else 25
                        add(potency=pot, manufacturer=mfr, medium=med, bottle_quantity=b, dose=d,
                            sku=f'ARN-{pot}-{code[mfr]}-{code[med]}-{b.upper()}-D{d}', price=POT_BASE[pot] * MFR_F[mfr] * MED_F[med] * MULT[b][d], stock=stock)
        if mfr == 'Indian':
            for pot in ['30CH', '200CH']:
                add(potency=pot, manufacturer='Indian', medium='Sugar of Milk', sku=f'ARN-{pot}-IND-SOM', price=10)
    # LM branch
    for rng, lo, mfrs in [('0/1-0/10', 1, ['Indian', 'German']), ('0/11-0/20', 11, ['Indian'])]:
        for i in range(lo, lo + 10):
            for mfr in mfrs:
                base = (120 if lo == 1 else 150) * (1.6 if mfr == 'German' else 1.0)
                for d in (2, 4):
                    add(potency='LM', lm_range=rng, lm_sub_range=f'0/{i}', manufacturer=mfr, medium='Distilled Water',
                        bottle_quantity='30ml', dose=d, sku=f'ARN-LM{i}-{code[mfr]}-DW-30ML-D{d}', price=base * MULT['30ml'][d])
    return rows

def chamomilla_rows():
    rows = []; v = 2000
    for i in range(1, 11):
        for d in (2, 3, 4):
            v += 1; p = round(99 * MULT['30ml'][d])
            rows.append(dict(variant_id=v, potency='LM', lm_range='0/1-0/10', lm_sub_range=f'0/{i}', manufacturer='Indian', medium='Distilled Water',
                             bottle_quantity='30ml', dose=d, sku=f'CHA-LM{i}-IND-DW-30ML-D{d}', mrp=round(p * 100 / 99), selling_price=p, stock=20))
    return rows

def chelidonium_rows():
    rows = []; v = 3000
    for pot in ['6CH', '30CH', '200CH']:
        for med in ['Distilled Water', 'Globules']:
            for d in (2, 3, 4):
                v += 1; p = round(POT_BASE[pot] * MED_F[med] * MULT['30ml'][d])
                rows.append(dict(variant_id=v, potency=pot, lm_range=None, lm_sub_range=None, manufacturer='Indian', medium=med,
                                 bottle_quantity='30ml', dose=d, sku=f'CHE-{pot}-IND-{med[:3].upper()}-30ML-D{d}', mrp=round(p * 1.2), selling_price=p, stock=15))
        v += 1
        rows.append(dict(variant_id=v, potency=pot, lm_range=None, lm_sub_range=None, manufacturer='Indian', medium='Sugar of Milk',
                         bottle_quantity=None, dose=None, sku=f'CHE-{pot}-IND-SOM', mrp=12, selling_price=10, stock=40))
    return rows

def jdump(rows):
    return '[\n' + ',\n'.join(json.dumps(r, ensure_ascii=False, separators=(',', ':')) for r in rows) + '\n]'

TOKENS = {
    'VARIANTS_ARNICA': lambda: jdump(arnica_rows()),
    'VARIANTS_CHAMOMILLA': lambda: jdump(chamomilla_rows()),
    'VARIANTS_CHELIDONIUM': lambda: jdump(chelidonium_rows()),
}

HEAD = '''<!doctype html>
<html lang="en-IN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="theme-color" content="#093F2F">
<link rel="icon" type="image/png" href="assets/img/logo-104.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400..700&amp;family=Young+Serif&amp;display=swap" media="print" onload="this.media='all'">
<noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400..700&amp;family=Young+Serif&amp;display=swap"></noscript>
<link rel="stylesheet" href="assets/css/hc.css">
{extra}<script src="assets/js/hc.js" defer></script>
</head>'''

def build_page(fname):
    s = rd(os.path.join(SRC, fname))
    m = re.match(r'<!--meta\s+(.*?)-->\n', s, re.S)
    meta = json.loads(m.group(1)); s = s[m.end():]
    nav = meta.get('nav', '')
    head = HEAD.format(title=esc(meta['title']), desc=esc(meta['desc']), extra=meta.get('extra', ''))
    s = s.replace('{{HEADER}}', activate(header_tpl, nav).strip()).replace('{{FOOTER}}', activate(footer_tpl, nav).strip())
    s = re.sub(r'\{\{CARDS:([\w\-,]+)(?:\|quick=([\w\-,]+))?(?:\|eager=(\d+))?\}\}',
               lambda m: cards(m.group(1).split(','), quick_slugs=(m.group(2) or '').split(','), eager=int(m.group(3) or 0)), s)
    s = re.sub(r'\{\{CARD:([\w\-]+)\}\}', lambda m: card(m.group(1)), s)
    s = re.sub(r'\{\{WISH:([\w\-,]+)\}\}', lambda m: wish(m.group(1).split(',')), s)
    for k, fn in TOKENS.items():
        if '{{' + k + '}}' in s: s = s.replace('{{' + k + '}}', fn())
    s = s.replace('{{INR:', '{{INR:')
    left = re.findall(r'\{\{[^}]+\}\}', s)
    if left: raise SystemExit(f'{fname}: unresolved {left[:3]}')
    wr(os.path.join(OUT, fname), head + '\n' + s)

if __name__ == '__main__':
    import sys
    wr(os.path.join(OUT, 'partials/header.html'), activate(header_tpl, '').strip() + '\n')
    wr(os.path.join(OUT, 'partials/footer.html'), activate(footer_tpl, '').strip() + '\n')
    wr(os.path.join(OUT, 'partials/product-card.html'), '<!-- Product card partial. Default CTA = Choose Potency. Add hc-card--quickadd for single-variant products. -->\n' + card('arnica-1', canonical=True) + '\n')
    wr(os.path.join(OUT, 'partials/product-rail.html'), '''<!-- Product rail partial: heading + "See all" + horizontally scrolling cards. Repeat the card partial inside the LOOP. -->
<section class="hc-section" aria-labelledby="RAIL-ID">
  <div class="hc-container">
    <div class="hc-sechead">
      <div><h2 class="hc-h2" id="RAIL-ID" data-slot="rail.title">Featured products</h2><p data-slot="rail.subtitle">Popular remedies from our range</p></div>
      <a class="hc-seeall" href="shop.html" data-slot="rail.see_all_url">See all <svg class="hc-icon hc-icon--sm" aria-hidden="true"><use href="#i-chev-right"/></svg></a>
    </div>
    <div class="hc-rail" data-hc="rail">
      <button class="hc-rail__btn hc-rail__btn--prev" type="button" data-hc-prev aria-label="Scroll left"><svg class="hc-icon" aria-hidden="true"><use href="#i-chev-left"/></svg></button>
      <ul class="hc-rail__track">
''' + cards(['arnica-1', 'chamomilla']) + '''
      </ul>
      <button class="hc-rail__btn hc-rail__btn--next" type="button" data-hc-next aria-label="Scroll right"><svg class="hc-icon" aria-hidden="true"><use href="#i-chev-right"/></svg></button>
    </div>
  </div>
</section>
''')
    wr(os.path.join(OUT, 'partials/breadcrumb.html'), '''<!-- Breadcrumb partial. Last item is the current page (no link, aria-current). -->
<nav class="hc-crumbs" aria-label="Breadcrumb">
  <ol>
    <li><a href="index.html">Home</a></li>
    <!-- LOOP crumbs (all but last) -->
    <li><a href="shop.html">Shop</a></li>
    <!-- END LOOP -->
    <li><span aria-current="page" data-slot="page.title">Dilution</span></li>
  </ol>
</nav>
''')
    wr(os.path.join(OUT, 'partials/empty-state.html'), '''<!-- Empty-state partial: icon, heading that says what is empty, one line of direction, one or two actions. -->
<div class="hc-panel hc-empty">
  <span class="hc-empty__art"><svg class="hc-icon" aria-hidden="true"><use href="#i-search"/></svg></span>
  <h2 class="hc-h2" data-slot="empty.title">No medicines match that search</h2>
  <p data-slot="empty.text">Check the spelling, search by remedy name only, or remove a filter.</p>
  <div class="hc-row">
    <a class="hc-btn hc-btn--primary" href="shop.html">Browse all medicines</a>
    <a class="hc-btn hc-btn--outline" href="contact.html">Ask the pharmacist</a>
  </div>
</div>
''')
    pages = [f for f in os.listdir(SRC) if f.endswith('.html') and not f.startswith('_')]
    for f in sorted(pages):
        build_page(f); print('built', f)
