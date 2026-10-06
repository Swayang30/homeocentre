/* ==========================================================================
   HomeoCentre storefront — hc.js (the only script)
   - One IIFE. The only global is window.HC.
   - Never touches $ or jQuery.
   - Components switch on from markup: data-hc="name" (space-separated list).
   - Every component tolerates several instances and silently does nothing
     when its markup is absent.
   - Database values are only ever written with textContent / attributes,
     never innerHTML.
   ========================================================================== */
(function () {
  'use strict';

  var HC = window.HC || {};
  window.HC = HC;

  /* ------------------------------------------------------------------------
     CONFIG — single place for business constants
     ------------------------------------------------------------------------ */
  HC.config = {
    DISCOUNT_THRESHOLD: 5,                 // show "% off" only at or above this
    PIN_KEY: 'hc_pin',                     // localStorage key for Deliver-to PIN
    RX_MAX_BYTES: 10 * 1024 * 1024,        // 10 MB
    RX_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    RX_EXT: ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
    /* Mirrors the breakpoint tokens in hc.css */
    BREAKPOINTS: { sm: 360, md: 480, lg: 600, xl: 768, xxl: 1024, xxxl: 1280, xxxxl: 1440 },
    MANUAL_DOSE_MEDIUMS: ['sugar of milk', 'sac lac', 'powder'],
    POTENCY_ORDER: ['Q', '3X', '6X', '6CH', '12CH', '30CH', '200CH', '1M', '10M', '50M', 'CM', 'LM'],
    MEDIUM_NOTES: {
      'sugar of milk': 'SAC LAC / powder',
      'distilled water': 'Liquid dilution',
      'globules': 'Pills / pellets',
      'liquid': 'Mother tincture'
    },
    CAROUSEL_INTERVAL: 6000
  };

  /* ------------------------------------------------------------------------
     UTILITIES
     ------------------------------------------------------------------------ */
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function on(el, ev, fn, opts) { if (el) el.addEventListener(ev, fn, opts || false); }
  function emit(el, name, detail, cancelable) {
    var e;
    try { e = new CustomEvent(name, { bubbles: true, cancelable: !!cancelable, detail: detail || {} }); }
    catch (err) { e = document.createEvent('CustomEvent'); e.initCustomEvent(name, true, !!cancelable, detail || {}); }
    (el || document).dispatchEvent(e);
    return !e.defaultPrevented;
  }
  function mq(q) { return window.matchMedia ? window.matchMedia(q) : { matches: false, addEventListener: function () {} }; }
  function onMq(m, fn) { if (m.addEventListener) m.addEventListener('change', fn); else if (m.addListener) m.addListener(fn); }
  var COARSE = mq('(pointer: coarse)');
  function reduceMotion() { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  function money(n, paise) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    var v = Number(n);
    var s = v.toLocaleString('en-IN', { minimumFractionDigits: paise ? 2 : (v % 1 ? 2 : 0), maximumFractionDigits: 2 });
    return '₹' + s;
  }
  function make(tag, attrs, children) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'text') el.textContent = v;
      else if (k === 'className') el.className = v;
      else el.setAttribute(k, v === true ? '' : v);
    });
    (children || []).forEach(function (c) { if (c) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return el;
  }
  function icon(name, cls) {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'hc-icon' + (cls ? ' ' + cls : ''));
    svg.setAttribute('aria-hidden', 'true');
    var use = document.createElementNS(ns, 'use');
    use.setAttribute('href', '#i-' + name);
    svg.appendChild(use);
    return svg;
  }
  var store = {
    get: function (k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* storage blocked */ } }
  };
  HC.util = { qs: qs, qsa: qsa, on: on, emit: emit, money: money, make: make, icon: icon, store: store };

  /* Focus trap helper for drawer / sheet / modal */
  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  function trapFocus(container, e) {
    if (e.key !== 'Tab') return;
    var items = qsa(FOCUSABLE, container).filter(function (n) { return n.offsetParent !== null || n === document.activeElement; });
    if (!items.length) return;
    var first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* Overlay controller shared by drawer, sheet and modal */
  function Overlay(el, opts) {
    var lastFocus = null;
    var panel = qs(opts.panel, el) || el;
    var usesHidden = el.hasAttribute('hidden');
    function keydown(e) {
      if (e.key === 'Escape') { close(); return; }
      trapFocus(panel, e);
    }
    function open(trigger) {
      lastFocus = trigger || document.activeElement;
      el.hidden = false;
      // allow display change before transition
      window.requestAnimationFrame(function () { el.classList.add('hc-is-open'); });
      el.setAttribute('aria-hidden', 'false');
      document.documentElement.style.overflow = 'hidden';
      document.documentElement.classList.add('hc-is-locked');
      document.addEventListener('keydown', keydown);
      var f = qs('[data-hc-autofocus]', el) || qs(FOCUSABLE, panel);
      window.setTimeout(function () { if (f) f.focus(); }, 30);
      if (opts.onOpen) opts.onOpen();
    }
    function close() {
      el.classList.remove('hc-is-open');
      el.setAttribute('aria-hidden', 'true');
      document.documentElement.style.overflow = '';
      if (!document.querySelector('.hc-drawer.hc-is-open, .hc-sheet.hc-is-open, .hc-modal.hc-is-open')) document.documentElement.classList.remove('hc-is-locked');
      document.removeEventListener('keydown', keydown);
      if (usesHidden) window.setTimeout(function () { if (!el.classList.contains('hc-is-open')) el.hidden = true; }, reduceMotion() ? 0 : 240);
      if (lastFocus && lastFocus.hasAttribute && lastFocus.hasAttribute('aria-expanded')) lastFocus.setAttribute('aria-expanded', 'false');
      if (lastFocus && lastFocus.focus) lastFocus.focus();
      if (opts.onClose) opts.onClose();
    }
    qsa('[data-hc-close]', el).forEach(function (b) { on(b, 'click', function (e) { e.preventDefault(); close(); }); });
    /* Swipe to close: drawer swipes left, sheets and the phone modal swipe down */
    var sx = null, sy = null, horizontal = el.classList.contains('hc-drawer');
    on(panel, 'touchstart', function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    on(panel, 'touchend', function (e) {
      if (sx === null) return;
      var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      sx = null;
      if (horizontal) { if (dx < -64 && Math.abs(dx) > Math.abs(dy)) close(); return; }
      var scroller = qs('.hc-sheet__body', panel) || panel;
      var atTop = scroller.scrollTop <= 0 && panel.scrollTop <= 0;
      var isSheetLike = el.classList.contains('hc-sheet') || window.innerWidth < HC.config.BREAKPOINTS.lg;
      if (isSheetLike && atTop && dy > 80 && Math.abs(dy) > Math.abs(dx)) close();
    }, { passive: true });
    return { open: open, close: close, el: el };
  }
  var overlays = {};
  function overlayFor(id) {
    if (overlays[id]) return overlays[id];
    var el = document.getElementById(id);
    if (!el) return null;
    var panelSel = el.classList.contains('hc-modal') ? '.hc-modal__dialog' : (el.classList.contains('hc-sheet') ? '.hc-sheet__panel' : '.hc-drawer__panel');
    overlays[id] = Overlay(el, { panel: panelSel });
    return overlays[id];
  }
  HC.overlay = {
    open: function (id, trigger) { var o = overlayFor(id); if (o) o.open(trigger); },
    close: function (id) { var o = overlayFor(id); if (o) o.close(); }
  };
  HC.modal = HC.overlay;

  /* Global triggers: data-hc-open="overlayId" */
  on(document, 'click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-hc-open]') : null;
    if (!t) return;
    e.preventDefault();
    HC.overlay.open(t.getAttribute('data-hc-open'), t);
    t.setAttribute('aria-expanded', 'true');
  });

  /* ------------------------------------------------------------------------
     TOASTS  — HC.toast('Added to cart', { type: 'success'|'error', link: {href, text} })
     ------------------------------------------------------------------------ */
  HC.toast = function (message, opts) {
    opts = opts || {};
    var region = qs('.hc-toasts');
    if (!region) {
      region = make('div', { className: 'hc-toasts', role: 'status', 'aria-live': 'polite' });
      document.body.appendChild(region);
    }
    var t = make('div', { className: 'hc-toast' + (opts.type === 'error' ? ' hc-toast--error' : '') });
    t.appendChild(icon(opts.type === 'error' ? 'alert' : 'check-circle'));
    t.appendChild(make('span', { text: message }));
    if (opts.link) t.appendChild(make('a', { href: opts.link.href, text: opts.link.text }));
    region.appendChild(t);
    document.body.classList.add('hc-has-toast');
    window.setTimeout(function () {
      if (t.parentNode) t.parentNode.removeChild(t);
      if (!region.children.length) document.body.classList.remove('hc-has-toast');
    }, opts.duration || 4200);
  };

  /* ------------------------------------------------------------------------
     COUNTS  — HC.counts.set('cart', 3)  updates every [data-slot="cart.count"]
     ------------------------------------------------------------------------ */
  HC.counts = {
    get: function (name) {
      var el = qs('[data-slot="' + name + '.count"]');
      return el ? parseInt(el.textContent, 10) || 0 : 0;
    },
    set: function (name, n) {
      qsa('[data-slot="' + name + '.count"]').forEach(function (el) {
        el.textContent = String(n);
        el.hidden = false;
        el.classList.remove('hc-is-bump');
        void el.offsetWidth;
        el.classList.add('hc-is-bump');
      });
      qsa('[data-slot="' + name + '.count-label"]').forEach(function (el) { el.textContent = String(n); });
    },
    add: function (name, d) { HC.counts.set(name, Math.max(0, HC.counts.get(name) + d)); }
  };

  /* ------------------------------------------------------------------------
     IMAGE FALLBACK — swaps any failed img[data-hc-fallback] for a designed
     placeholder: bottle silhouette on the brand tint with the product initial.
     ------------------------------------------------------------------------ */
  function placeholderURI(letter) {
    var l = (String(letter || '').match(/[A-Za-z0-9]/) || ['H'])[0].toUpperCase();
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">' +
      '<rect width="400" height="400" fill="#F2F5F3"/>' +
      '<circle cx="200" cy="214" r="138" fill="#E3EDE7"/>' +
      '<rect x="168" y="70" width="64" height="40" rx="8" fill="#0E5A43" opacity=".85"/>' +
      '<path d="M162 112h76v22l20 30c6 9 9 19 9 30v108c0 14-11 25-25 25H158c-14 0-25-11-25-25V194c0-11 3-21 9-30l20-30z" fill="#FFFFFF" stroke="#0E5A43" stroke-width="6" stroke-opacity=".35"/>' +
      '<rect x="146" y="206" width="108" height="78" rx="6" fill="#0E5A43" opacity=".09"/>' +
      '<text x="200" y="262" text-anchor="middle" font-family="Georgia, serif" font-size="58" fill="#0E5A43">' + l + '</text>' +
      '</svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
  HC.placeholder = placeholderURI;
  function applyFallback(img) {
    if (img.getAttribute('data-hc-fallen')) return;
    img.setAttribute('data-hc-fallen', '1');
    img.removeAttribute('srcset');
    img.src = placeholderURI(img.getAttribute('data-initial') || img.getAttribute('alt'));
    img.classList.add('hc-img--fallback');
  }
  // capture-phase listener catches errors that happen after this script runs
  document.addEventListener('error', function (e) {
    var t = e.target;
    if (t && t.tagName === 'IMG' && t.hasAttribute('data-hc-fallback')) applyFallback(t);
  }, true);
  function scanFallbacks(root) {
    qsa('img[data-hc-fallback]', root).forEach(function (img) {
      if (!img.getAttribute('src')) { applyFallback(img); return; }
      if (img.complete && img.naturalWidth === 0) applyFallback(img);
    });
  }

  /* ------------------------------------------------------------------------
     COMPONENT REGISTRY
     ------------------------------------------------------------------------ */
  var components = {};
  HC.register = function (name, fn) { components[name] = fn; };
  HC.init = function (root) {
    root = root || document;
    scanFallbacks(root);
    Object.keys(components).forEach(function (name) {
      qsa('[data-hc~="' + name + '"]', root).forEach(function (el) {
        var key = 'hcInit' + name.replace(/[^a-z]/gi, '');
        if (el.dataset[key]) return;
        el.dataset[key] = '1';
        try { components[name](el); } catch (err) { if (window.console) console.error('[HC] ' + name, err); }
      });
    });
  };

  /* ------------------------------------------------------------------------
     DISCOUNT — <div data-hc="discount" data-mrp="120" data-price="100">
     Fills every [data-off] inside the closest .hc-card / [data-hc-scope]
     (or inside the element itself) and reveals [data-off-wrap] blocks only
     when the discount meets HC.config.DISCOUNT_THRESHOLD.
     ------------------------------------------------------------------------ */
  function applyDiscount(el) {
    var mrp = parseFloat(el.getAttribute('data-mrp'));
    var price = parseFloat(el.getAttribute('data-price'));
    var scope = el.closest('[data-hc-scope]') || el.closest('.hc-card') || el;
    var pct = (mrp > 0 && price > 0 && mrp > price) ? Math.round((mrp - price) / mrp * 100) : 0;
    var show = pct >= HC.config.DISCOUNT_THRESHOLD;
    qsa('[data-off]', scope).forEach(function (n) { n.textContent = pct + '% off'; });
    qsa('[data-off-wrap]', scope).forEach(function (n) { n.hidden = !show; });
  }
  HC.register('discount', applyDiscount);
  HC.discount = applyDiscount;

  /* ------------------------------------------------------------------------
     DELIVER-TO PIN (header chip + popover, persisted in localStorage)
     ------------------------------------------------------------------------ */
  HC.pin = {
    valid: function (v) { return /^[1-9][0-9]{5}$/.test(String(v || '')); },
    get: function () { var v = store.get(HC.config.PIN_KEY); return HC.pin.valid(v) ? v : ''; },
    set: function (v) {
      if (!HC.pin.valid(v)) return false;
      store.set(HC.config.PIN_KEY, v);
      HC.pin.render();
      emit(document, 'hc:pin-change', { pincode: v });
      return true;
    },
    render: function () {
      var v = HC.pin.get();
      qsa('[data-hc-pin-text]').forEach(function (n) { n.textContent = v ? v : n.getAttribute('data-empty') || 'Enter PIN'; });
      qsa('input[data-hc-pin-input]').forEach(function (inp) { if (!inp.value && v) inp.value = v; });
    }
  };
  HC.register('deliver', function (btn) {
    var pop = document.getElementById(btn.getAttribute('aria-controls'));
    if (!pop) return;
    var input = qs('input', pop), form = qs('form', pop), err = qs('.hc-error', pop);
    function place() {
      var r = btn.getBoundingClientRect();
      pop.style.top = (r.bottom + window.scrollY + 8) + 'px';
      pop.style.left = Math.max(16, Math.min(r.left + window.scrollX, document.documentElement.clientWidth - pop.offsetWidth - 16)) + 'px';
    }
    function close(refocus) {
      pop.hidden = true; btn.setAttribute('aria-expanded', 'false');
      document.removeEventListener('click', outside, true);
      if (refocus) btn.focus();
    }
    function outside(e) { if (!pop.contains(e.target) && !btn.contains(e.target)) close(false); }
    on(btn, 'click', function () {
      if (!pop.hidden) { close(true); return; }
      pop.hidden = false; btn.setAttribute('aria-expanded', 'true'); place();
      if (input) { input.value = HC.pin.get(); input.focus(); }
      document.addEventListener('click', outside, true);
    });
    on(pop, 'keydown', function (e) { if (e.key === 'Escape') close(true); });
    on(window, 'resize', function () { if (!pop.hidden) place(); });
    on(form, 'submit', function (e) {
      e.preventDefault();
      var v = (input.value || '').replace(/\D/g, '');
      if (!HC.pin.set(v)) { if (err) err.classList.add('hc-is-shown'); input.classList.add('hc-is-invalid'); input.focus(); return; }
      if (err) err.classList.remove('hc-is-shown'); input.classList.remove('hc-is-invalid');
      close(true);
      HC.toast('Delivery PIN set to ' + v);
    });
  });

  /* ------------------------------------------------------------------------
     MEGA MENU — button[data-hc="mega"][aria-controls]
     Opens on click / Enter / Space, and on hover for mouse users.
     ------------------------------------------------------------------------ */
  var openMega = null;
  function closeMega(refocus) {
    if (!openMega) return;
    var m = openMega; openMega = null;
    m.btn.setAttribute('aria-expanded', 'false');
    m.panel.hidden = true;
    if (refocus) m.btn.focus();
  }
  HC.register('mega', function (btn) {
    var panel = document.getElementById(btn.getAttribute('aria-controls'));
    if (!panel) return;
    var item = btn.closest('.hc-nav__item') || btn.parentNode;
    var hoverTimer;
    function open() {
      if (openMega && openMega.btn !== btn) closeMega(false);
      openMega = { btn: btn, panel: panel };
      btn.setAttribute('aria-expanded', 'true');
      panel.hidden = false;
    }
    on(btn, 'click', function (e) {
      e.preventDefault();
      if (btn.getAttribute('aria-expanded') === 'true') closeMega(false); else open();
    });
    on(btn, 'keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); open(); var f = qs('a', panel); if (f) f.focus(); }
    });
    var fine = window.matchMedia && window.matchMedia('(hover: hover)').matches;
    if (fine) {
      on(item, 'mouseenter', function () { clearTimeout(hoverTimer); hoverTimer = setTimeout(open, 120); });
      on(item, 'mouseleave', function () { clearTimeout(hoverTimer); hoverTimer = setTimeout(function () { if (openMega && openMega.btn === btn) closeMega(false); }, 180); });
    }
    on(panel, 'keydown', function (e) { if (e.key === 'Escape') closeMega(true); });
    on(panel, 'focusout', function (e) { if (e.relatedTarget && !item.contains(e.relatedTarget)) closeMega(false); });
  });
  on(document, 'keydown', function (e) { if (e.key === 'Escape') closeMega(true); });
  on(document, 'click', function (e) {
    if (openMega && !openMega.panel.contains(e.target) && !openMega.btn.contains(e.target)) closeMega(false);
  });

  /* ------------------------------------------------------------------------
     SEARCH — keeps the category select in the query (live: shop.php?q=&category=)
     ------------------------------------------------------------------------ */
  HC.register('search', function (form) {
    on(form, 'submit', function (e) {
      var input = qs('input[name="q"]', form);
      if (input && !input.value.trim()) { e.preventDefault(); input.focus(); }
      var sel = qs('select[name="category"]', form);
      if (sel && !sel.value) sel.disabled = true; // keep URL clean
      window.setTimeout(function () { if (sel) sel.disabled = false; }, 0);
    });
  });

  /* ------------------------------------------------------------------------
     CAROUSEL — autoplay pauses on hover/focus, dots, arrows, swipe, keyboard
     ------------------------------------------------------------------------ */
  HC.register('carousel', function (root) {
    var track = qs('.hc-carousel__track', root);
    var slides = qsa('.hc-carousel__slide', root);
    if (!track || slides.length < 2) return;
    var dotsWrap = qs('.hc-carousel__dots', root);
    var prev = qs('[data-hc-prev]', root), next = qs('[data-hc-next]', root);
    var pauseBtn = qs('[data-hc-pause]', root);
    var live = qs('[data-hc-live]', root);
    var i = 0, timer = null, hovering = false, focused = false, userPaused = reduceMotion();
    var dots = [];
    slides.forEach(function (s, n) {
      s.setAttribute('role', 'group');
      s.setAttribute('aria-roledescription', 'slide');
      s.setAttribute('aria-label', (n + 1) + ' of ' + slides.length);
      if (dotsWrap) {
        var d = make('button', { type: 'button', className: 'hc-carousel__dot', 'aria-label': 'Show slide ' + (n + 1) });
        on(d, 'click', function () { go(n, true); });
        dotsWrap.appendChild(d); dots.push(d);
      }
    });
    function go(n, user) {
      i = (n + slides.length) % slides.length;
      track.style.transform = 'translateX(' + (-100 * i) + '%)';
      slides.forEach(function (s, k) {
        s.setAttribute('aria-hidden', k === i ? 'false' : 'true');
        qsa('a, button', s).forEach(function (a) { a.tabIndex = k === i ? 0 : -1; });
      });
      dots.forEach(function (d, k) { d.setAttribute('aria-current', k === i ? 'true' : 'false'); });
      if (user && live) live.textContent = 'Slide ' + (i + 1) + ' of ' + slides.length;
      if (user) restart();
    }
    function tick() { go(i + 1, false); }
    function stop() { clearInterval(timer); timer = null; }
    function restart() { stop(); if (!userPaused && !hovering && !focused) timer = setInterval(tick, HC.config.CAROUSEL_INTERVAL); }
    function setPauseUI() {
      if (!pauseBtn) return;
      pauseBtn.setAttribute('aria-label', userPaused ? 'Play slideshow' : 'Pause slideshow');
      var use = qs('use', pauseBtn); if (use) use.setAttribute('href', userPaused ? '#i-play' : '#i-pause');
    }
    on(prev, 'click', function () { go(i - 1, true); });
    on(next, 'click', function () { go(i + 1, true); });
    on(pauseBtn, 'click', function () { userPaused = !userPaused; setPauseUI(); restart(); });
    on(root, 'mouseenter', function () { hovering = true; stop(); });
    on(root, 'mouseleave', function () { hovering = false; restart(); });
    on(root, 'focusin', function () { focused = true; stop(); });
    on(root, 'focusout', function (e) { if (!root.contains(e.relatedTarget)) { focused = false; restart(); } });
    on(root, 'keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(i - 1, true); }
      if (e.key === 'ArrowRight') { e.preventDefault(); go(i + 1, true); }
    });
    var x0 = null, y0 = null;
    on(track, 'touchstart', function (e) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    on(track, 'touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) go(i + (dx < 0 ? 1 : -1), true);
      x0 = null;
    });
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else restart(); });
    setPauseUI(); go(0, false); restart();
  });

  /* ------------------------------------------------------------------------
     RAIL — arrows on desktop, native swipe/scroll-snap everywhere
     ------------------------------------------------------------------------ */
  HC.register('rail', function (root) {
    var track = qs('.hc-rail__track', root);
    var prev = qs('[data-hc-prev]', root), next = qs('[data-hc-next]', root);
    if (!track) return;
    function update() {
      var max = track.scrollWidth - track.clientWidth - 2;
      if (prev) prev.disabled = track.scrollLeft <= 2;
      if (next) next.disabled = track.scrollLeft >= max;
    }
    function page(dir) { track.scrollBy({ left: dir * track.clientWidth * 0.9, behavior: reduceMotion() ? 'auto' : 'smooth' }); }
    on(prev, 'click', function () { page(-1); });
    on(next, 'click', function () { page(1); });
    on(track, 'scroll', function () { window.requestAnimationFrame(update); }, { passive: true });
    on(window, 'resize', update);
    update();
  });

  /* ------------------------------------------------------------------------
     TABS — [data-hc="tabs"] > [role=tablist] > [role=tab][aria-controls]
     ------------------------------------------------------------------------ */
  HC.register('tabs', function (root) {
    var tabs = qsa('[role="tab"]', root);
    if (!tabs.length) return;
    function select(tab, focus) {
      tabs.forEach(function (t) {
        var sel = t === tab;
        t.setAttribute('aria-selected', sel ? 'true' : 'false');
        t.tabIndex = sel ? 0 : -1;
        var p = document.getElementById(t.getAttribute('aria-controls'));
        if (p) p.hidden = !sel;
      });
      if (focus) tab.focus();
      emit(root, 'hc:tab-change', { tab: tab.id });
    }
    tabs.forEach(function (t, n) {
      on(t, 'click', function () { select(t, false); });
      on(t, 'keydown', function (e) {
        var k = e.key, m = null;
        if (k === 'ArrowRight') m = tabs[(n + 1) % tabs.length];
        if (k === 'ArrowLeft') m = tabs[(n - 1 + tabs.length) % tabs.length];
        if (k === 'Home') m = tabs[0];
        if (k === 'End') m = tabs[tabs.length - 1];
        if (m) { e.preventDefault(); select(m, true); }
      });
    });
    // deep link: #tab-id selects that tab
    var hashTab = location.hash && document.getElementById(location.hash.slice(1));
    if (hashTab && tabs.indexOf(hashTab) > -1) select(hashTab, false);
    else select(qs('[role="tab"][aria-selected="true"]', root) || tabs[0], false);

    /* data-hc-accordion="767": below that width the tabs become an accordion.
       Each panel has a preceding .hc-acc__btn[data-hc-acc-for="panelId"]. */
    var accMax = parseInt(root.getAttribute('data-hc-accordion'), 10);
    if (accMax) {
      var accQ = mq('(max-width: ' + accMax + 'px)');
      var accBtns = qsa('[data-hc-acc-for]', root);
      accBtns.forEach(function (b, k) {
        b.setAttribute('aria-expanded', k === 0 ? 'true' : 'false');
        on(b, 'click', function () {
          var p = document.getElementById(b.getAttribute('data-hc-acc-for'));
          var open = b.getAttribute('aria-expanded') !== 'true';
          b.setAttribute('aria-expanded', open ? 'true' : 'false');
          if (p) p.hidden = !open;
        });
      });
      var applyAcc = function () {
        if (accQ.matches) {
          root.classList.add('hc-is-acc');
          accBtns.forEach(function (b) { var p = document.getElementById(b.getAttribute('data-hc-acc-for')); if (p) { p.hidden = b.getAttribute('aria-expanded') !== 'true'; p.removeAttribute('role'); } });
        } else {
          root.classList.remove('hc-is-acc');
          accBtns.forEach(function (b) { var p = document.getElementById(b.getAttribute('data-hc-acc-for')); if (p) p.setAttribute('role', 'tabpanel'); });
          select(qs('[role="tab"][aria-selected="true"]', root) || tabs[0], false);
        }
      };
      onMq(accQ, applyAcc); applyAcc();
    }
    qsa('[data-hc-tab-link]', document).forEach(function (a) {
      var t = document.getElementById(a.getAttribute('data-hc-tab-link'));
      if (t && tabs.indexOf(t) > -1) on(a, 'click', function (e) { e.preventDefault(); select(t, true); });
    });
  });

  /* ------------------------------------------------------------------------
     DRAWER (mobile nav) — trigger: data-hc-open="hc-drawer"
     SHEET (mobile filters) — trigger: data-hc-open="hc-filter-sheet"
     (both handled by the shared overlay controller above)
     ------------------------------------------------------------------------ */

  /* ------------------------------------------------------------------------
     QTY STEPPER — [data-hc="qty"] > button[data-hc-dec] input button[data-hc-inc]
     ------------------------------------------------------------------------ */
  HC.register('qty', function (root) {
    var input = qs('input', root);
    if (!input) return;
    var dec = qs('[data-hc-dec]', root), inc = qs('[data-hc-inc]', root);
    function bounds() { return { min: parseInt(input.min || '1', 10), max: parseInt(input.max || '99', 10) }; }
    function set(v, fire) {
      var b = bounds();
      v = Math.max(b.min, Math.min(b.max, parseInt(v, 10) || b.min));
      input.value = v;
      if (dec) dec.disabled = v <= b.min;
      if (inc) inc.disabled = v >= b.max;
      if (fire) input.dispatchEvent(new Event('change', { bubbles: true }));
    }
    on(dec, 'click', function () { set((parseInt(input.value, 10) || 1) - 1, true); });
    on(inc, 'click', function () { set((parseInt(input.value, 10) || 1) + 1, true); });
    on(input, 'change', function (e) { if (e.isTrusted) set(input.value, false); });
    on(input, 'blur', function () { set(input.value, true); });
    root.hcSet = set;
    set(input.value, false);
  });

  /* ------------------------------------------------------------------------
     WISHLIST heart — button[data-hc="wish"][data-product-id]
     Live: wishlist.php?id={id}. Cancel hc:wishlist-toggle to call the backend.
     ------------------------------------------------------------------------ */
  HC.register('wish', function (btn) {
    on(btn, 'click', function (e) {
      e.preventDefault();
      var pressed = btn.getAttribute('aria-pressed') === 'true';
      var detail = { productId: btn.getAttribute('data-product-id'), added: !pressed, href: btn.getAttribute('data-live-href') };
      if (!emit(btn, 'hc:wishlist-toggle', detail, true)) return;
      btn.setAttribute('aria-pressed', pressed ? 'false' : 'true');
      var name = btn.getAttribute('data-name') || 'Item';
      btn.setAttribute('aria-label', (pressed ? 'Add ' : 'Remove ') + name + (pressed ? ' to wishlist' : ' from wishlist'));
      HC.counts.add('wishlist', pressed ? -1 : 1);
      HC.toast(pressed ? 'Removed from wishlist' : 'Saved to wishlist', pressed ? null : { link: { href: 'wishlist.html', text: 'View' } });
    });
  });

  /* ------------------------------------------------------------------------
     QUICK ADD — a[data-hc="quickadd"] (single-variant products only)
     Live: cart.php?action=add&id={id}. Cancel hc:quick-add to handle via AJAX.
     ------------------------------------------------------------------------ */
  HC.register('quickadd', function (a) {
    on(a, 'click', function (e) {
      var detail = { productId: a.getAttribute('data-product-id'), href: a.getAttribute('href') };
      if (!emit(a, 'hc:quick-add', detail, true)) return;
      e.preventDefault(); // prototype: stay on the page
      HC.counts.add('cart', 1);
      HC.toast('Added to cart', { link: { href: 'cart.html', text: 'View cart' } });
    });
  });

  /* ------------------------------------------------------------------------
     AUTOSUBMIT — select[data-hc="autosubmit"] submits its form (sort control)
     ------------------------------------------------------------------------ */
  HC.register('autosubmit', function (sel) {
    on(sel, 'change', function () { if (sel.form) sel.form.submit(); });
  });

  /* ------------------------------------------------------------------------
     PROTOTYPE STATE SWITCH (shop.html only — delete during integration)
     Shows [data-proto-state~="x"] for the state implied by the URL:
     ?category= → category, ?manufacturer= → manufacturer, ?q= → search,
     ?view=empty → empty, otherwise all.
     ------------------------------------------------------------------------ */
  HC.register('protostate', function (root) {
    var p = new URLSearchParams(location.search);
    var state = p.get('view') === 'empty' ? 'empty' : p.get('q') ? 'search' : p.get('manufacturer') ? 'manufacturer' : p.get('category') ? 'category' : 'all';
    qsa('[data-proto-state]', root).forEach(function (el) {
      el.hidden = (' ' + el.getAttribute('data-proto-state') + ' ').indexOf(' ' + state + ' ') === -1;
    });
    qsa('[data-proto-link]', root).forEach(function (a) { a.setAttribute('aria-current', a.getAttribute('data-proto-link') === state ? 'true' : 'false'); });
    var q = p.get('q');
    qsa('[data-proto-q]', root).forEach(function (n) { n.textContent = q || ''; });
    qsa('input[name="q"]').forEach(function (inp) { if (q && !inp.value) inp.value = q; });
  });

  /* ------------------------------------------------------------------------
     GALLERY — thumbnails swap the main image; main image opens zoom view
     ------------------------------------------------------------------------ */
  HC.register('gallery', function (root) {
    var main = qs('[data-hc-gallery-main] img', root);
    var mainBtn = qs('[data-hc-gallery-main]', root);
    var thumbs = qsa('[data-hc-thumb]', root);
    var dots = [], idx = 0;
    function show(n) {
      if (!thumbs.length) return;
      idx = (n + thumbs.length) % thumbs.length;
      var t = thumbs[idx], img = qs('img', t);
      thumbs.forEach(function (x, k) { x.setAttribute('aria-current', k === idx ? 'true' : 'false'); });
      dots.forEach(function (d, k) { d.setAttribute('aria-current', k === idx ? 'true' : 'false'); });
      if (!main) return;
      main.removeAttribute('data-hc-fallen');
      main.removeAttribute('srcset');
      main.classList.remove('hc-img--fallback');
      main.src = t.getAttribute('data-full') || (img && img.src);
      main.alt = img ? img.alt : main.alt;
    }
    thumbs.forEach(function (t, k) { on(t, 'click', function () { show(k); }); });
    /* Phones: dots under the image + swipe left/right on it (thumbnails are hidden by CSS) */
    if (thumbs.length > 1) {
      var dotWrap = make('div', { className: 'hc-gallery__dots', role: 'group', 'aria-label': 'Product images' });
      thumbs.forEach(function (t, k) {
        var d = make('button', { type: 'button', className: 'hc-gallery__dot', 'aria-label': 'Show image ' + (k + 1) + ' of ' + thumbs.length, 'aria-current': k === 0 ? 'true' : 'false' });
        on(d, 'click', function () { show(k); });
        dotWrap.appendChild(d); dots.push(d);
      });
      if (mainBtn) mainBtn.insertAdjacentElement('afterend', dotWrap);
      var gx = null, gy = null, swiped = false;
      on(mainBtn, 'touchstart', function (e) { gx = e.touches[0].clientX; gy = e.touches[0].clientY; swiped = false; }, { passive: true });
      on(mainBtn, 'touchend', function (e) {
        if (gx === null) return;
        var dx = e.changedTouches[0].clientX - gx, dy = e.changedTouches[0].clientY - gy;
        gx = null;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { swiped = true; show(idx + (dx < 0 ? 1 : -1)); }
      });
      on(mainBtn, 'click', function (e) { if (swiped) { e.stopImmediatePropagation(); e.preventDefault(); swiped = false; } }, true);
    }
    on(mainBtn, 'click', function () {
      if (!main) return;
      var z = make('div', { className: 'hc-zoom', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Zoomed product image' });
      var close = make('button', { type: 'button', className: 'hc-iconbtn hc-zoom__close', 'aria-label': 'Close zoom' }, [icon('close')]);
      var big = make('img', { src: main.src, alt: main.alt });
      z.appendChild(close); z.appendChild(big);
      document.body.appendChild(z);
      document.documentElement.style.overflow = 'hidden';
      function done() { document.documentElement.style.overflow = ''; if (z.parentNode) z.parentNode.removeChild(z); document.removeEventListener('keydown', key); mainBtn.focus(); }
      function key(e) { if (e.key === 'Escape') done(); if (e.key === 'Tab') { e.preventDefault(); close.focus(); } }
      on(close, 'click', done); on(big, 'click', done);
      document.addEventListener('keydown', key);
      // centre the zoomed image on small screens
      window.requestAnimationFrame(function () { z.scrollLeft = (z.scrollWidth - z.clientWidth) / 2; z.scrollTop = (z.scrollHeight - z.clientHeight) / 2; });
      close.focus();
    });
  });

  /* ------------------------------------------------------------------------
     FORM VALIDATION — form[data-hc="validate"]
     Uses native constraints (required, type=email, pattern, minlength) plus
     data-match="#otherFieldId". Messages come from data-error on the field.
     On a valid submit fires cancelable hc:form-submit; prototype default
     shows a toast instead of posting.
     ------------------------------------------------------------------------ */
  function fieldWrap(input) { return input.closest('.hc-field') || input.parentNode; }
  function setFieldError(input, msg) {
    var wrap = fieldWrap(input);
    var err = qs('.hc-error', wrap);
    if (msg) {
      wrap.classList.add('hc-is-invalid');
      input.setAttribute('aria-invalid', 'true');
      if (err) { qs('span', err) ? qs('span', err).textContent = msg : err.textContent = msg; }
    } else {
      wrap.classList.remove('hc-is-invalid');
      input.removeAttribute('aria-invalid');
    }
  }
  HC.setFieldError = setFieldError;
  function checkField(input) {
    var v = (input.value || '').trim();
    var msg = '';
    if (input.type === 'checkbox') { if (input.required && !input.checked) msg = input.getAttribute('data-error') || 'Please tick this box to continue.'; }
    else if (input.required && !v) msg = input.getAttribute('data-error') || 'This field is required.';
    else if (v && input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) msg = 'Enter a valid email address, like name@example.com.';
    else if (v && input.getAttribute('data-digits')) {
      var d = v.replace(/\D/g, '');
      if (d.length === 12 && d.indexOf('91') === 0) d = d.slice(2);
      if (d.length !== parseInt(input.getAttribute('data-digits'), 10)) msg = input.getAttribute('data-error-format') || ('Enter a ' + input.getAttribute('data-digits') + '-digit number.');
    }
    else if (v && input.minLength > 0 && v.length < input.minLength) msg = input.getAttribute('data-error-format') || ('Enter at least ' + input.minLength + ' characters.');
    else if (v && input.getAttribute('data-match')) {
      var other = qs(input.getAttribute('data-match'));
      if (other && other.value !== input.value) msg = 'Passwords don’t match.';
    }
    else if (v && (input.min || input.max) && input.type === 'number') {
      var n = Number(v);
      if ((input.min && n < Number(input.min)) || (input.max && n > Number(input.max))) msg = input.getAttribute('data-error-format') || 'Enter a value between ' + input.min + ' and ' + input.max + '.';
    }
    setFieldError(input, msg);
    return !msg;
  }
  HC.checkField = checkField;
  HC.register('validate', function (form) {
    form.setAttribute('novalidate', '');
    var fields = qsa('input, select, textarea', form).filter(function (f) { return f.type !== 'hidden' && f.type !== 'submit'; });
    fields.forEach(function (f) {
      on(f, 'blur', function () { if (f.value || fieldWrap(f).classList.contains('hc-is-invalid')) checkField(f); });
      on(f, 'input', function () { if (fieldWrap(f).classList.contains('hc-is-invalid')) checkField(f); });
    });
    on(form, 'submit', function (e) {
      var bad = fields.filter(function (f) { return !f.disabled && f.offsetParent !== null; }).filter(function (f) { return !checkField(f); });
      if (bad.length) { e.preventDefault(); bad[0].scrollIntoView({ block: 'center', behavior: reduceMotion() ? 'auto' : 'smooth' }); bad[0].focus({ preventScroll: true }); return; }
      if (form.getAttribute('action') === '#') {
        e.preventDefault();
        if (emit(form, 'hc:form-submit', { form: form, liveAction: form.getAttribute('data-live-action') }, true)) {
          HC.toast(form.getAttribute('data-success') || 'Done.');
          if (form.hasAttribute('data-reset')) form.reset();
        }
      }
    });
  });

  /* ------------------------------------------------------------------------
     PIN CODE CHECK — [data-hc="pincode"] containing #pincode + #pincodeResult
     Fires cancelable hc:pincode-check { pincode, done(result) }.
     Backend JS: e.preventDefault(); post ajax_action=check_pincode; then call
     e.detail.done({ ok: true|false, message: '...', shippingCharge: 40 }).
     ------------------------------------------------------------------------ */
  HC.register('pincode', function (root) {
    var input = qs('input[data-hc-pin-input], input[name="pincode"]', root), btn = qs('button[type="submit"], [data-hc-pin-check]', root), out = qs('[data-hc-pin-result]', root);
    var form = input && input.form && root.contains(input.form) ? input.form : root.tagName === 'FORM' ? root : null;
    if (!input || !out) return;
    if (!input.value) input.value = HC.pin.get();
    function done(r) {
      out.textContent = '';
      out.className = 'hc-pin__result ' + (r.ok ? 'hc-is-ok' : 'hc-is-bad');
      out.appendChild(icon(r.ok ? 'check-circle' : 'alert', 'hc-icon--sm'));
      out.appendChild(document.createTextNode(' ' + r.message + ' '));
      if (r.ok && r.shippingCharge === undefined) {
        out.appendChild(document.createTextNode('Shipping charge: '));
        out.appendChild(make('span', { className: 'hc-confirm', text: 'CLIENT TO CONFIRM: shipping rates' }));
      } else if (r.ok && r.shippingCharge !== null) {
        out.appendChild(document.createTextNode('Shipping: ' + money(r.shippingCharge)));
      }
      if (btn) { btn.disabled = false; }
      emit(root, 'hc:pincode-result', r);
    }
    function check(e) {
      if (e) e.preventDefault();
      var v = (input.value || '').replace(/\D/g, '');
      input.value = v;
      if (!HC.pin.valid(v)) { done({ ok: false, message: 'Enter a valid 6-digit PIN code.' }); input.focus(); return; }
      HC.pin.set(v);
      if (btn) btn.disabled = true;
      out.className = 'hc-pin__result';
      out.textContent = 'Checking ' + v + '…';
      if (emit(root, 'hc:pincode-check', { pincode: v, done: done }, true)) {
        // Prototype default — the live page answers from its courier list.
        window.setTimeout(function () { done({ ok: true, message: 'Delivery available to ' + v + '.' }); }, 450);
      }
    }
    if (form) on(form, 'submit', check); else on(btn, 'click', check);
    on(input, 'keydown', function (e) { if (e.key === 'Enter' && !form) check(e); });
  });

  /* ------------------------------------------------------------------------
     CONFIGURATOR — [data-hc="configurator"] reads #hc-variant-data (JSON)
     Contract documented in docs/DEVELOPER_HANDOFF.md §4.
     ------------------------------------------------------------------------ */
  function str(v) { return (v === null || v === undefined) ? '' : String(v).trim(); }
  function num(v) { var n = parseFloat(v); return isNaN(n) ? null : n; }
  function normalizeRow(r) {
    function pick() { for (var i = 0; i < arguments.length; i++) { if (r[arguments[i]] !== undefined && r[arguments[i]] !== null && r[arguments[i]] !== '') return r[arguments[i]]; } return null; }
    return {
      id: pick('variant_id', 'id'),
      potency: str(pick('potency', 'potency_name')),
      lm_range: str(pick('lm_range', 'range_name')),
      lm_sub: str(pick('lm_sub_range', 'sub_range', 'sub_range_name')),
      mfr: str(pick('manufacturer', 'mfr', 'manufacturer_name')),
      medium: str(pick('medium', 'medium_name')),
      bottle: str(pick('bottle_quantity', 'bottle', 'bottle_size')),
      dose: str(pick('dose', 'dose_name')),
      sku: str(pick('sku')),
      mrp: num(pick('mrp')),
      price: num(pick('selling_price', 'price')),
      stock: parseInt(pick('stock'), 10) || 0,
      raw: r
    };
  }
  function natural(a, b) {
    var na = parseFloat(String(a).replace(/^[^0-9]*/, '')), nb = parseFloat(String(b).replace(/^[^0-9]*/, ''));
    if (!isNaN(na) && !isNaN(nb) && na !== nb) return na - nb;
    return String(a).localeCompare(String(b));
  }
  var STEP_TITLES = {
    potency: ['Potency', 'Choose potency'],
    lm_range: ['LM range', 'Choose LM range'],
    lm_sub: ['LM potency', 'Choose individual LM potency'],
    mfr: ['Manufacturer', 'Choose manufacturer'],
    medium: ['Medium', 'Choose medium'],
    bottle: ['Bottle size', 'Choose bottle size'],
    dose: ['No. of doses', 'Choose number of doses'],
    manual_dose: ['No. of doses', 'Enter number of doses']
  };

  HC.register('configurator', function (root) {
    var dataEl = document.getElementById(root.getAttribute('data-variants') || 'hc-variant-data');
    if (!dataEl) return;
    var rows;
    try { rows = JSON.parse(dataEl.textContent).map(normalizeRow).filter(function (r) { return r.id !== null && r.price !== null && r.potency; }); }
    catch (err) { if (window.console) console.error('[HC] variant JSON is not valid', err); return; }
    if (!rows.length) { var na = qs('[data-hc-cfg-unavailable]', root); if (na) na.hidden = false; return; }

    var form = root.closest('form') || qs('form', root);
    var page = root.closest('[data-hc-scope]') || document;
    var hidden = {
      variant: qs('[name="variant_id"]', form || page),
      doseCount: qs('[name="dose_count"]', form || page)
    };
    var nameInput = qs('#patientNameInput', page), ageInput = qs('#patientAgeInput', page);
    var manualInput = qs('#manualDoseInput', page), manualErr = qs('#manualDoseError', page);
    var qtyInput = qs('#quantity', page);
    var addBtns = qsa('[data-hc-add]', page);
    var needEls = qsa('[data-hc-need]', page);
    var alertEl = qs('#configAlert', page);
    var shipping = null;
    var lastComplete = false;

    var state = { potency: '', lm_range: '', lm_sub: '', mfr: '', medium: '', bottle: '', dose: '', manualDose: 0 };
    var ORDER = ['potency', 'lm_range', 'lm_sub', 'mfr', 'medium', 'bottle', 'dose'];

    function isManualMedium(m) {
      var l = String(m || '').toLowerCase();
      return HC.config.MANUAL_DOSE_MEDIUMS.some(function (x) { return l.indexOf(x) > -1; });
    }
    function matches(row, keys) { return keys.every(function (k) { return !state[k] || row[k] === state[k]; }); }
    function rowsFor(keys) { return rows.filter(function (r) { return keys.every(function (k) { return row_eq(r, k); }); }); }
    function row_eq(r, k) { return r[k] === state[k]; }
    function isLMBranch() {
      if (!state.potency) return false;
      return rows.some(function (r) { return r.potency === state.potency && r.lm_range; });
    }
    function manualMode() {
      if (!state.medium) return false;
      if (isManualMedium(state.medium)) return true;
      var ctx = rowsFor(activeBefore('bottle'));
      return ctx.length > 0 && ctx.every(function (r) { return !r.bottle && !r.dose; });
    }
    /* Data steps that apply to the current selection, in order. */
    function activeSteps() {
      var s = ['potency'];
      if (isLMBranch()) s.push('lm_range', 'lm_sub');
      s.push('mfr', 'medium');
      if (state.medium && manualMode()) { s.push('manual_dose'); return s; }
      var ctx = rowsFor(s.filter(function (k) { return state[k]; }));
      if (!state.medium || ctx.some(function (r) { return r.bottle; })) s.push('bottle');
      if (!state.medium || ctx.some(function (r) { return r.dose; })) s.push('dose');
      return s;
    }
    function activeBefore(key) {
      var s = ['potency'];
      if (isLMBranch()) s.push('lm_range', 'lm_sub');
      s.push('mfr', 'medium', 'bottle', 'dose');
      var i = s.indexOf(key);
      return i === -1 ? s : s.slice(0, i);
    }
    /* All values a step can show, and which are orderable now. */
    function optionsFor(key) {
      var before = activeBefore(key);
      var pool = key === 'lm_sub' ? rows.filter(function (r) { return r.lm_range === state.lm_range && r.potency === state.potency; })
        : key === 'lm_range' ? rows.filter(function (r) { return r.potency === state.potency; })
        : rows;
      var all = [];
      pool.forEach(function (r) { if (r[key] && all.indexOf(r[key]) === -1) all.push(r[key]); });
      if (key === 'potency') {
        var ord = HC.config.POTENCY_ORDER;
        all.sort(function (a, b) {
          var ia = ord.indexOf(a.toUpperCase()), ib = ord.indexOf(b.toUpperCase());
          if (ia === -1 && ib === -1) return natural(a, b);
          if (ia === -1) return 1; if (ib === -1) return -1; return ia - ib;
        });
      } else if (key === 'bottle' || key === 'dose' || key === 'lm_range' || key === 'lm_sub') all.sort(natural);
      var ctx = rows.filter(function (r) { return before.every(function (k) { return r[k] === state[k]; }); });
      return all.map(function (v) {
        var hit = ctx.filter(function (r) { return r[key] === v; });
        var stocked = hit.filter(function (r) { return r.stock > 0; });
        return { value: v, rows: hit, enabled: stocked.length > 0, reason: hit.length ? 'Out of stock' : 'Not available' };
      });
    }
    function chosenRow() {
      var keys = activeSteps().filter(function (k) { return k !== 'manual_dose'; });
      if (!keys.every(function (k) { return state[k]; })) return null;
      var hit = rows.filter(function (r) {
        return keys.every(function (k) { return r[k] === state[k]; }) &&
          ORDER.filter(function (k) { return keys.indexOf(k) === -1; }).every(function (k) { return !r[k] || k === 'lm_range' || k === 'lm_sub'; });
      });
      if (!hit.length) hit = rows.filter(function (r) { return keys.every(function (k) { return r[k] === state[k]; }); });
      var stocked = hit.filter(function (r) { return r.stock > 0; });
      return stocked[0] || hit[0] || null;
    }
    function isComplete() {
      var row = chosenRow();
      if (!row || row.stock <= 0) return false;
      if (activeSteps().indexOf('manual_dose') > -1 && !(state.manualDose > 0)) return false;
      return true;
    }
    function metaFor(key, opt) {
      if (!opt.enabled) return opt.reason;
      if (key === 'medium') return HC.config.MEDIUM_NOTES[opt.value.toLowerCase()] || '';
      if (key === 'bottle') {
        var ds = [];
        opt.rows.forEach(function (r) { if (r.dose && ds.indexOf(r.dose) === -1) ds.push(r.dose); });
        ds.sort(natural);
        return ds.length ? ds.join(', ') + ' doses' : '';
      }
      if (key === 'dose' && opt.rows.length === 1) return money(opt.rows[0].price);
      if (key === 'dose') {
        var ps = opt.rows.map(function (r) { return r.price; });
        return 'from ' + money(Math.min.apply(null, ps));
      }
      return '';
    }

    /* ---- rendering ---- */
    function stepEl(key) { return qs('[data-step="' + key + '"]', root); }
    function renderStep(key, n) {
      var el = stepEl(key);
      if (!el) return;
      var wasHidden = el.hidden;
      el.hidden = false;
      if (wasHidden && !reduceMotion()) { el.classList.remove('hc-is-enter'); void el.offsetWidth; el.classList.add('hc-is-enter'); }
      var numEl = qs('[data-step-number]', el);
      if (numEl) numEl.textContent = String(n);
      var chosen = qs('[data-step-chosen]', el);
      var val = key === 'manual_dose' ? (state.manualDose ? String(state.manualDose) : '') : state[key];
      el.classList.toggle('hc-is-done', !!val);
      if (chosen) { chosen.hidden = !val; chosen.textContent = val || ''; }
      if (key === 'manual_dose') return;
      var group = qs('[data-step-options]', el);
      if (!group) return;
      var opts = optionsFor(key);
      var sig = key + '|' + opts.map(function (o) { return o.value + (o.enabled ? 1 : 0) + metaFor(key, o); }).join('|');
      if (group.getAttribute('data-sig') !== sig) {
        group.setAttribute('data-sig', sig);
        group.textContent = '';
        var title = qs('.hc-step__title', el);
        opts.forEach(function (o) {
          var input = make('input', { type: 'radio', name: 'cfg_' + key, value: o.value, disabled: !o.enabled });
          var meta = metaFor(key, o);
          var box = make('span', { className: 'hc-rcard__box' }, [
            make('span', { className: 'hc-rcard__title', text: o.value }),
            meta ? make('span', { className: 'hc-rcard__meta', text: meta }) : null
          ]);
          var label = make('label', { className: 'hc-rcard' + (key === 'potency' || key === 'lm_sub' || key === 'lm_range' || key === 'dose' ? ' hc-rcard--center' : '') }, [input, box]);
          on(input, 'change', function () { choose(key, o.value); });
          group.appendChild(label);
        });
        group.setAttribute('role', 'radiogroup');
        if (title && title.id) group.setAttribute('aria-labelledby', title.id);
      }
      qsa('input', group).forEach(function (inp) { inp.checked = inp.value === state[key]; });
    }
    function setSum(id, val) {
      var el = qs('#' + id, page);
      if (!el) return;
      el.textContent = val || '—';
      var row = el.closest('.hc-sum__row');
      if (row) row.classList.toggle('hc-is-empty', !val);
    }
    function showSumRow(id, show) {
      var el = qs('#' + id, page);
      if (el) el.hidden = !show;
    }
    function render() {
      var steps = activeSteps();
      var visible = [];
      // progressive reveal: show steps up to and including the first unanswered one
      for (var i = 0; i < steps.length; i++) {
        visible.push(steps[i]);
        var k = steps[i];
        var answered = k === 'manual_dose' ? state.manualDose > 0 : !!state[k];
        if (!answered) break;
      }
      ORDER.concat(['manual_dose']).forEach(function (k) {
        var el = stepEl(k);
        if (el && visible.indexOf(k) === -1) el.hidden = true;
      });
      visible.forEach(function (k, n) { renderStep(k, n + 1); });
      var patient = qs('[data-step="patient"]', root);
      if (patient) patient.hidden = !state.medium;

      var row = chosenRow();
      var complete = isComplete();
      var manual = steps.indexOf('manual_dose') > -1;
      var qty = qtyInput ? Math.max(1, parseInt(qtyInput.value, 10) || 1) : 1;
      var unit = row ? (manual ? (state.manualDose > 0 ? row.price * state.manualDose : null) : row.price) : null;

      // hidden inputs for the backend
      if (hidden.variant) hidden.variant.value = complete && row ? row.id : '';
      if (hidden.doseCount) hidden.doseCount.value = complete && manual ? state.manualDose : 0;

      // summary
      setSum('sumPotency', state.potency);
      showSumRow('rowLmRange', isLMBranch()); showSumRow('rowLmSub', isLMBranch());
      setSum('sumLmRange', state.lm_range); setSum('sumLmSub', state.lm_sub);
      setSum('sumMfr', state.mfr); setSum('sumMedium', state.medium);
      showSumRow('rowBottle', !manual);
      setSum('sumBottle', state.bottle);
      setSum('sumDose', manual ? (state.manualDose ? String(state.manualDose) : '') : state.dose);
      var pn = nameInput ? nameInput.value.trim() : '', pa = ageInput ? ageInput.value.trim() : '';
      setSum('sumPatient', pn ? pn + (pa ? ' (' + pa + ' yrs)' : '') : (pa ? pa + ' yrs' : ''));
      setSum('sumSku', complete && row ? row.sku : '');
      setSum('sumUnitPrice', unit !== null && complete ? money(unit) : '');
      setSum('sumQty', String(qty));
      var total = complete && unit !== null ? unit * qty + (shipping || 0) : null;
      var ctxRows = rows.filter(function (r) { return activeBefore('zzz').every(function (k) { return !state[k] || r[k] === state[k]; }); });
      // "From" price: per-bottle rows first; per-dose (typed count) rows only if nothing else is left
      var bottleRows = ctxRows.filter(function (r) { return !isManualMedium(r.medium); });
      var fromRows = bottleRows.length ? bottleRows : ctxRows;
      var from = fromRows.length ? Math.min.apply(null, fromRows.map(function (r) { return r.price; })) : null;
      var perDose = !bottleRows.length && fromRows.length;
      var totalText = total !== null ? money(total) : (from !== null ? (perDose ? money(from) + ' per dose' : 'From ' + money(from)) : '—');
      qsa('[data-hc-total]', page).forEach(function (n) { n.textContent = totalText; });
      qsa('[data-hc-total-note]', page).forEach(function (n) {
        n.textContent = complete ? (qty + ' × ' + (state.potency || '') + (state.medium ? ' ' + state.medium : '')) : 'Complete the steps to see your price';
      });

      // headline price block
      var pd = qs('#priceDisplay', page), md = qs('#mrpDisplay', page);
      if (pd && complete && unit !== null) {
        pd.textContent = money(unit).replace('₹', '');
        var priceWrap = pd.closest('[data-hc="discount"]');
        if (priceWrap) { priceWrap.setAttribute('data-price', unit); priceWrap.setAttribute('data-mrp', row.mrp ? (manual ? row.mrp * state.manualDose : row.mrp) : unit); applyDiscount(priceWrap); }
        if (md) md.textContent = row.mrp ? money(manual ? row.mrp * state.manualDose : row.mrp) : '';
        qsa('[data-hc-from]', page).forEach(function (n) { n.hidden = true; });
      }
      var stockLine = qs('#stockLine', page);
      if (stockLine && row) {
        stockLine.classList.toggle('hc-is-out', row.stock <= 0);
        var t = qs('span', stockLine); if (t) t.textContent = row.stock > 0 ? 'In stock' : 'Out of stock';
      }

      // buttons + hint
      var missing = '';
      for (var j = 0; j < steps.length; j++) {
        var sk = steps[j];
        var ok = sk === 'manual_dose' ? state.manualDose > 0 : !!state[sk];
        if (!ok) { missing = STEP_TITLES[sk][1]; break; }
      }
      addBtns.forEach(function (b) {
        b.setAttribute('aria-disabled', complete ? 'false' : 'true');
        var lbl = qs('[data-hc-add-label]', b);
        if (lbl && b.hasAttribute('data-hc-add-continue')) lbl.textContent = complete ? 'Add to Cart' : 'Continue';
      });
      needEls.forEach(function (n) { n.textContent = complete ? '' : (missing ? 'Next: ' + missing.charAt(0).toLowerCase() + missing.slice(1) + '.' : ''); n.hidden = complete; });

      HC.syncBarDetail();
      if (complete !== lastComplete || complete) {
        emit(root, 'hc:variant-change', {
          complete: complete,
          variant: complete && row ? row.raw : null,
          variantId: complete && row ? row.id : null,
          unitPrice: complete ? unit : null,
          doseCount: manual ? state.manualDose : 0,
          quantity: qty,
          state: JSON.parse(JSON.stringify(state))
        });
      }
      lastComplete = complete;
    }
    function choose(key, value) {
      state[key] = value;
      // clear later answers that are no longer orderable
      var idx = ORDER.indexOf(key);
      ORDER.slice(idx + 1).forEach(function (k) {
        if (!state[k]) return;
        if (activeSteps().indexOf(k) === -1) { state[k] = ''; return; }
        var o = optionsFor(k).filter(function (x) { return x.value === state[k]; })[0];
        if (!o || !o.enabled) state[k] = '';
      });
      if (activeSteps().indexOf('manual_dose') === -1) { state.manualDose = 0; if (manualInput) manualInput.value = ''; }
      autoPick();
      render();
      if (alertEl) alertEl.hidden = true;
    }
    /* If a step has exactly one orderable value, choose it for the customer
       (the other values stay visible, disabled). The first step is never auto-chosen. */
    function autoPick() {
      var changed = true, guard = 0;
      while (changed && guard++ < 8) {
        changed = false;
        activeSteps().forEach(function (k) {
          if (k === 'manual_dose' || k === 'potency' || state[k]) return;
          var before = activeBefore(k);
          if (!before.every(function (b) { return state[b]; })) return;
          var enabled = optionsFor(k).filter(function (o) { return o.enabled; });
          if (enabled.length === 1) { state[k] = enabled[0].value; changed = true; }
        });
      }
    }
    function reset() {
      Object.keys(state).forEach(function (k) { state[k] = k === 'manualDose' ? 0 : ''; });
      if (manualInput) manualInput.value = '';
      if (qtyInput) { var qw = qtyInput.closest('[data-hc~="qty"]'); if (qw && qw.hcSet) qw.hcSet(1, false); else qtyInput.value = 1; }
      autoPick(); render();
      var first = qs('[data-step="potency"] input', root); if (first) first.focus();
    }
    on(manualInput, 'input', function () {
      var raw = manualInput.value.replace(/\D/g, '').slice(0, 4);
      manualInput.value = raw;
      var n = parseInt(raw, 10) || 0;
      state.manualDose = n;
      var bad = raw !== '' && n < 1;
      if (manualErr) manualErr.classList.toggle('hc-is-shown', bad);
      manualInput.classList.toggle('hc-is-invalid', bad);
      render();
    });
    on(manualInput, 'blur', function () {
      var bad = manualInput.value === '' || !(state.manualDose > 0);
      if (manualErr) manualErr.classList.toggle('hc-is-shown', bad && manualInput.value !== '');
    });
    [nameInput, ageInput].forEach(function (i) { on(i, 'input', render); });
    on(ageInput, 'input', function () { ageInput.value = ageInput.value.replace(/\D/g, '').slice(0, 3); });
    on(qtyInput, 'change', render);
    qsa('[data-hc-cfg-reset]', root).forEach(function (b) { on(b, 'click', function (e) { e.preventDefault(); reset(); }); });
    on(page === document ? document : page, 'hc:pincode-result', function (e) {
      shipping = (e.detail && e.detail.ok && typeof e.detail.shippingCharge === 'number') ? e.detail.shippingCharge : null;
      var ship = qs('#sumShipping', page);
      if (ship) {
        ship.textContent = '';
        if (shipping !== null) ship.textContent = money(shipping);
        else if (e.detail && e.detail.ok) ship.appendChild(make('span', { className: 'hc-confirm', text: 'CLIENT TO CONFIRM' }));
        else ship.textContent = 'Enter PIN to calculate';
      }
      render();
    });

    function firstIncomplete() {
      var steps = activeSteps();
      for (var j = 0; j < steps.length; j++) {
        var sk = steps[j];
        if (sk === 'manual_dose' ? !(state.manualDose > 0) : !state[sk]) return stepEl(sk);
      }
      return null;
    }
    addBtns.forEach(function (b) {
      on(b, 'click', function (e) {
        e.preventDefault();
        if (!isComplete()) {
          var s = firstIncomplete();
          if (s) {
            s.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'center' });
            var f = qs('input:not([disabled])', s); if (f) window.setTimeout(function () { f.focus({ preventScroll: true }); }, 300);
          }
          if (alertEl && !b.hasAttribute('data-hc-add-continue')) { alertEl.hidden = false; }
          return;
        }
        var row = chosenRow();
        var manual = activeSteps().indexOf('manual_dose') > -1;
        var detail = {
          variant_id: row.id,
          quantity: qtyInput ? parseInt(qtyInput.value, 10) || 1 : 1,
          dose_count: manual ? state.manualDose : 0,
          patient_name: nameInput ? nameInput.value.trim() : '',
          patient_age: ageInput ? ageInput.value.trim() : '',
          slug: root.getAttribute('data-slug') || '',
          variant: row.raw
        };
        if (!emit(root, 'hc:add-to-cart', detail, true)) return;
        HC.counts.add('cart', detail.quantity);
        HC.toast('Added to cart: ' + (root.getAttribute('data-product-name') || 'item') + ', ' + state.potency, { link: { href: 'cart.html', text: 'View cart' } });
      });
    });

    root.hcReset = reset;
    autoPick();
    render();
  });

  /* ------------------------------------------------------------------------
     ORDER MODE SWITCH — radios name="order_mode" toggle #manualFlow / #prescriptionFlow
     ------------------------------------------------------------------------ */
  HC.register('ordermode', function (root) {
    var radios = qsa('input[type="radio"]', root);
    function apply() {
      radios.forEach(function (r) {
        var p = document.getElementById(r.getAttribute('aria-controls'));
        if (p) p.hidden = !r.checked;
      });
      var mode = (radios.filter(function (r) { return r.checked; })[0] || {}).value;
      qsa('[data-hc-mode-show]').forEach(function (n) { n.hidden = n.getAttribute('data-hc-mode-show') !== mode; });
      var bar = qs('[data-hc-buybar]');
      if (bar && mode !== 'manual') bar.classList.remove('hc-is-shown');
      emit(root, 'hc:mode-change', { mode: mode });
    }
    radios.forEach(function (r) { on(r, 'change', apply); });
    if (location.hash === '#prescription') { var rx = radios.filter(function (r) { return r.value === 'prescription'; })[0]; if (rx) rx.checked = true; }
    apply();
  });

  /* ------------------------------------------------------------------------
     PRESCRIPTION FORM — form[data-hc="rx"]
     Fires cancelable hc:rx-submitted { formData, form, success(reference) }.
     Backend JS: e.preventDefault(); POST formData (ajax_action=submit_prescription);
     then call e.detail.success(json.reference).
     ------------------------------------------------------------------------ */
  HC.register('rx', function (form) {
    form.setAttribute('novalidate', '');
    var drop = qs('#rxDropzone', form), file = qs('#rxFileInput', form);
    var empty = qs('#rxDropEmpty', form), preview = qs('#rxFilePreview', form);
    var fname = qs('#rxFileName', form), fsize = qs('#rxFileSize', form), thumb = qs('#rxFileThumb', form);
    var ferr = qs('#rxFileError', form), remove = qs('#rxFileRemove', form);
    var submit = qs('#rxSubmitBtn', form), label = qs('#rxSubmitLabel', form);
    var camera = qs('#rxCameraInput', form);
    var chosen = null, objectURL = null;

    function fmtSize(b) { return b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB'; }
    function fileError(msg) {
      if (ferr) { var s = qs('span', ferr); if (s) s.textContent = msg; else ferr.textContent = msg; ferr.classList.toggle('hc-is-shown', !!msg); }
      if (drop) drop.classList.toggle('hc-is-invalid', !!msg);
    }
    function clearFile() {
      chosen = null;
      if (objectURL) { URL.revokeObjectURL(objectURL); objectURL = null; }
      if (file) file.value = '';
      if (preview) preview.hidden = true;
      if (empty) empty.hidden = false;
      if (drop) drop.hidden = false;
    }
    function accept(f) {
      if (!f) return;
      var ext = (f.name.split('.').pop() || '').toLowerCase();
      var typeOK = HC.config.RX_TYPES.indexOf(f.type) > -1 || (!f.type && HC.config.RX_EXT.indexOf(ext) > -1);
      if (!typeOK || HC.config.RX_EXT.indexOf(ext) === -1) { clearFile(); fileError('“' + f.name + '” is not a JPG, PNG, WebP or PDF. Upload a photo or PDF of the prescription.'); return; }
      if (f.size > HC.config.RX_MAX_BYTES) { clearFile(); fileError('This file is ' + fmtSize(f.size) + '. The limit is 10 MB — try a smaller photo or a PDF.'); return; }
      fileError('');
      chosen = f;
      if (fname) fname.textContent = f.name;
      if (fsize) fsize.textContent = fmtSize(f.size) + ' · ' + (ext === 'pdf' ? 'PDF' : ext.toUpperCase() + ' image');
      if (thumb) {
        thumb.textContent = '';
        if (ext === 'pdf') thumb.appendChild(icon('file'));
        else { objectURL = URL.createObjectURL(f); thumb.appendChild(make('img', { src: objectURL, alt: '' })); }
      }
      if (empty) empty.hidden = true;
      if (drop) drop.hidden = true;
      if (preview) preview.hidden = false;
    }
    HC.rxAccept = accept; // used by QA to simulate drops
    on(file, 'change', function () { accept(file.files && file.files[0]); });
    /* Camera capture (touch devices): hand the photo to the main input so it is submitted as "prescription" */
    on(camera, 'change', function () {
      var f = camera.files && camera.files[0];
      if (!f) return;
      try { var dt = new DataTransfer(); dt.items.add(f); file.files = dt.files; } catch (err) { /* older browsers: FormData.set below covers it */ }
      accept(f);
      camera.value = '';
    });
    if (drop) {
      ['dragenter', 'dragover'].forEach(function (ev) { on(drop, ev, function (e) { e.preventDefault(); drop.classList.add('hc-is-dragover'); }); });
      ['dragleave', 'dragend', 'drop'].forEach(function (ev) { on(drop, ev, function () { drop.classList.remove('hc-is-dragover'); }); });
      on(drop, 'drop', function (e) {
        e.preventDefault();
        var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (f) { try { var dt = new DataTransfer(); dt.items.add(f); file.files = dt.files; } catch (err) { /* older browsers */ } accept(f); }
      });
    }
    on(remove, 'click', function () { clearFile(); if (file) file.focus(); });

    // live validation on the text fields
    var fields = qsa('input:not([type=file]):not([type=hidden]), textarea, select', form);
    fields.forEach(function (f) {
      on(f, 'blur', function () { if (f.value) checkField(f); });
      on(f, 'input', function () { if (fieldWrap(f).classList.contains('hc-is-invalid')) checkField(f); });
    });
    qsa('[data-digits]', form).forEach(function (f) { on(f, 'input', function () { f.value = f.value.replace(/[^\d+ ]/g, ''); }); });

    function success(reference) {
      if (submit) { submit.disabled = false; submit.removeAttribute('aria-busy'); }
      if (label) label.textContent = 'Submit Prescription & Add to Cart';
      var pot = qs('#rxPreferredPotency', form), qty = qs('#rxQtyValue', form);
      var vals = {
        rxSumReference: reference,
        rxSumPatient: qs('#rxPatientName', form).value.trim() + (qs('#rxPatientAge', form).value ? ' (' + qs('#rxPatientAge', form).value + ' yrs)' : ''),
        rxSumFile: chosen ? chosen.name : '',
        rxSumPotency: pot ? pot.options[pot.selectedIndex].text : '',
        rxSumQty: qty ? qty.value : '1'
      };
      Object.keys(vals).forEach(function (id) { var n = document.getElementById(id); if (n) n.textContent = vals[id]; });
      HC.counts.add('cart', 1);
      HC.overlay.open('rxSuccessModal');
    }
    on(form, 'submit', function (e) {
      e.preventDefault();
      var ok = true, firstBad = null;
      if (!chosen) { fileError('Upload the prescription to continue (JPG, PNG, WebP or PDF, up to 10 MB).'); ok = false; firstBad = file; }
      fields.forEach(function (f) { if (!checkField(f)) { ok = false; if (!firstBad) firstBad = f; } });
      if (!ok) {
        var al = qs('#rxAlert', form); if (al) al.hidden = false;
        if (firstBad === file && drop) { drop.scrollIntoView({ block: 'center', behavior: reduceMotion() ? 'auto' : 'smooth' }); file.focus({ preventScroll: true }); }
        else if (firstBad) { firstBad.scrollIntoView({ block: 'center', behavior: reduceMotion() ? 'auto' : 'smooth' }); firstBad.focus({ preventScroll: true }); }
        return;
      }
      var al2 = qs('#rxAlert', form); if (al2) al2.hidden = true;
      if (submit) { submit.disabled = true; submit.setAttribute('aria-busy', 'true'); }
      if (label) label.textContent = 'Submitting…';
      var fd = new FormData(form);
      if (chosen) fd.set('prescription', chosen, chosen.name);
      if (emit(form, 'hc:rx-submitted', { form: form, formData: fd, file: chosen, success: success }, true)) {
        // Prototype default: sample reference in the live format RX + yymmdd + 6 hex
        window.setTimeout(function () {
          var d = new Date();
          var ymd = String(d.getFullYear()).slice(2) + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2);
          var hex = ('000000' + Math.floor(Math.random() * 0xFFFFFF).toString(16)).slice(-6).toUpperCase();
          success('RX' + ymd + hex);
        }, 700);
      }
    });
    on(form, 'reset', function () { clearFile(); fileError(''); fields.forEach(function (f) { setFieldError(f, ''); }); });
    var edit = document.getElementById('rxEditBtn');
    on(edit, 'click', function () { HC.overlay.close('rxSuccessModal'); var n = qs('#rxPatientName', form); if (n) n.focus(); });
  });

  /* ------------------------------------------------------------------------
     CART PAGE — [data-hc="cart"] recomputes line + order totals (prototype)
     Live: quantity changes post to cart.php; totals come from the session.
     ------------------------------------------------------------------------ */
  HC.register('cart', function (root) {
    var empty = document.getElementById(root.getAttribute('data-empty-target') || 'hc-cart-empty');
    var full = document.getElementById(root.getAttribute('data-full-target') || 'hc-cart-full');
    function recalc() {
      var lines = qsa('[data-hc-line]', root);
      var sub = 0, items = 0, rx = 0;
      lines.forEach(function (l) {
        var q = qs('input[name^="qty"]', l);
        var qty = q ? parseInt(q.value, 10) || 1 : 1;
        items += qty;
        var unit = parseFloat(l.getAttribute('data-unit'));
        if (isNaN(unit)) { rx++; return; }
        var lt = unit * qty; sub += lt;
        var tEl = qs('[data-hc-line-total]', l); if (tEl) tEl.textContent = money(lt);
      });
      qsa('[data-hc-subtotal]').forEach(function (n) { n.textContent = money(sub); });
      qsa('[data-hc-items]').forEach(function (n) { n.textContent = String(items); });
      qsa('[data-hc-grand]').forEach(function (n) { n.textContent = money(sub); });
      qsa('[data-hc-rx-count]').forEach(function (n) { n.closest('[data-hc-rx-row]').hidden = rx === 0; n.textContent = String(rx); });
      HC.counts.set('cart', items);
      if (!lines.length) { if (full) full.hidden = true; if (empty) empty.hidden = false; HC.counts.set('cart', 0); }
      emit(root, 'hc:cart-update', { subtotal: sub, items: items });
    }
    on(root, 'change', function (e) { if (e.target.matches('input[name^="qty"]')) recalc(); });
    on(root, 'click', function (e) {
      var rm = e.target.closest('[data-hc-remove]');
      if (!rm) return;
      e.preventDefault();
      var line = rm.closest('[data-hc-line]');
      if (!emit(line, 'hc:cart-remove', { key: line.getAttribute('data-key'), href: rm.getAttribute('href') }, true)) return;
      var name = (qs('.hc-line__name', line) || {}).textContent || 'Item';
      line.parentNode.removeChild(line);
      HC.toast('Removed ' + name.trim() + ' from cart');
      recalc();
    });
    recalc();
  });

  /* ------------------------------------------------------------------------
     WISHLIST PAGE remove — [data-hc="wishlist-remove"]
     ------------------------------------------------------------------------ */
  HC.register('wishremove', function (btn) {
    on(btn, 'click', function (e) {
      e.preventDefault();
      var card = btn.closest('[data-hc-wish-item]');
      if (!card) return;
      card.parentNode.removeChild(card);
      HC.counts.add('wishlist', -1);
      HC.toast('Removed from wishlist');
      if (!qsa('[data-hc-wish-item]').length) {
        var e1 = document.getElementById('hc-wish-empty'), f1 = document.getElementById('hc-wish-full');
        if (e1) e1.hidden = false; if (f1) f1.hidden = true;
      }
    });
  });

  /* ------------------------------------------------------------------------
     TABLE OF CONTENTS (policy pages) — highlights the section in view
     ------------------------------------------------------------------------ */
  HC.register('toc', function (nav) {
    var links = qsa('a[href^="#"]', nav);
    var map = links.map(function (a) { return { a: a, t: document.getElementById(a.getAttribute('href').slice(1)) }; }).filter(function (x) { return x.t; });
    if (!map.length || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if (en.isIntersecting) map.forEach(function (m) { m.a.setAttribute('aria-current', m.t === en.target ? 'true' : 'false'); });
      });
    }, { rootMargin: '0px 0px -70% 0px' });
    map.forEach(function (m) { io.observe(m.t); });
  });

  /* ------------------------------------------------------------------------
     BACK TO TOP
     ------------------------------------------------------------------------ */
  HC.register('totop', function (btn) {
    on(btn, 'click', function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: reduceMotion() ? 'auto' : 'smooth' });
      var t = document.getElementById('hc-top');
      if (t) t.focus({ preventScroll: true });
    });
  });

  /* ------------------------------------------------------------------------
     CHECKOUT CONCEPT — [data-hc="checkout"] steps with next/back
     ------------------------------------------------------------------------ */
  HC.register('checkout', function (root) {
    var panels = qsa('[data-hc-ck-step]', root);
    var bar = qsa('[data-hc-ck-bar] li', root);
    var i = 0;
    function show(n) {
      i = Math.max(0, Math.min(panels.length - 1, n));
      panels.forEach(function (p, k) { p.hidden = k !== i; });
      bar.forEach(function (b, k) {
        if (k === i) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
        b.classList.toggle('hc-is-done', k < i);
      });
      var h = qs('h2', panels[i]); if (h) { h.tabIndex = -1; h.focus(); }
    }
    on(root, 'click', function (e) {
      if (e.target.closest('[data-hc-ck-next]')) { e.preventDefault(); show(i + 1); }
      if (e.target.closest('[data-hc-ck-back]')) { e.preventDefault(); show(i - 1); }
    });
    panels.forEach(function (p, k) { p.hidden = k !== 0; });
    bar.forEach(function (b, k) { if (k === 0) b.setAttribute('aria-current', 'step'); });
  });

  /* ------------------------------------------------------------------------
     FOCUS SEARCH — tab-bar Search button moves focus to the header search
     ------------------------------------------------------------------------ */
  HC.register('focussearch', function (btn) {
    on(btn, 'click', function (e) {
      var input = document.getElementById('hc-search-input');
      if (!input) return;
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: reduceMotion() ? 'auto' : 'smooth' });
      input.focus({ preventScroll: true });
    });
  });

  /* ------------------------------------------------------------------------
     DISMISS (announcement bar)
     ------------------------------------------------------------------------ */
  HC.register('dismiss', function (btn) {
    on(btn, 'click', function () { var t = btn.closest('[data-hc-dismissable]'); if (t) t.hidden = true; });
  });


  /* ------------------------------------------------------------------------
     STICKY HEADER — slides away while scrolling down, back on scroll up.
     Writes its visible height to --hc-header-offset for other sticky parts.
     ------------------------------------------------------------------------ */
  HC.register('stickyheader', function (header) {
    var lastY = window.scrollY, hidden = false, ticking = false;
    function sticky() { return getComputedStyle(header).position === 'sticky'; }
    function setOffset() {
      var full = sticky() ? Math.round(header.getBoundingClientRect().height) : 0;
      var v = hidden ? 0 : full;
      document.documentElement.style.setProperty('--hc-header-offset', v + 'px');
      document.documentElement.style.setProperty('--hc-header-h', full + 'px'); // constant while scrolling: use for heights
    }
    function busy() { return header.contains(document.activeElement) && document.activeElement !== document.body || !!qs('.hc-mega:not([hidden])', header) || document.documentElement.classList.contains('hc-is-locked'); }
    function update() {
      ticking = false;
      var y = Math.max(0, window.scrollY), dy = y - lastY;
      if (!sticky()) { hidden = false; header.classList.remove('hc-is-hidden'); }
      else if (y < header.offsetHeight) { hidden = false; }
      else if (dy > 6 && !busy()) { hidden = true; }
      else if (dy < -6) { hidden = false; }
      header.classList.toggle('hc-is-hidden', hidden);
      if (Math.abs(dy) > 6 || y < header.offsetHeight) lastY = y;
      setOffset();
    }
    on(window, 'scroll', function () { if (!ticking) { ticking = true; window.requestAnimationFrame(update); } }, { passive: true });
    on(window, 'resize', setOffset);
    on(header, 'focusin', function () { if (hidden) { hidden = false; header.classList.remove('hc-is-hidden'); setOffset(); } });
    setOffset();
  });

  /* ------------------------------------------------------------------------
     STICKY BOTTOM BAR — [data-hc~="stickybar"][data-hc-watch="#summaryId"]
     Shown (phones/tablets) once the element it mirrors is out of view and
     not hidden. Adds body.hc-has-buybar (reserves --hc-buybar-h) and
     body.hc-bar-on while showing (hides the call button).
     ------------------------------------------------------------------------ */
  HC.register('stickybar', function (bar) {
    var watch = qs(bar.getAttribute('data-hc-watch'));
    document.body.classList.add('hc-has-buybar');
    var toggle = qs('[data-hc-bar-toggle]', bar), detail = toggle && document.getElementById(toggle.getAttribute('aria-controls'));
    var ticking = false;
    function reserve() {
      // reserve the bar's real height (it can grow with a large system font)
      var h = getComputedStyle(bar).display !== 'none' ? Math.ceil(bar.getBoundingClientRect().height) : 0;
      document.body.style.setProperty('--hc-buybar-h', h + 'px');
    }
    function update() {
      ticking = false;
      reserve();
      var active = getComputedStyle(bar).display !== 'none';
      var hiddenTarget = !watch || watch.offsetParent === null;
      var r = watch ? watch.getBoundingClientRect() : { top: 0, bottom: 0 };
      var inView = r.bottom > 0 && r.top < window.innerHeight - 80;
      var show = active && !hiddenTarget && !inView && window.scrollY > 120;
      bar.classList.toggle('hc-is-shown', show);
      document.body.classList.toggle('hc-bar-on', show);
      if (!show && toggle && toggle.getAttribute('aria-expanded') === 'true') { toggle.setAttribute('aria-expanded', 'false'); if (detail) detail.hidden = true; }
    }
    function req() { if (!ticking) { ticking = true; window.requestAnimationFrame(update); } }
    on(window, 'scroll', req, { passive: true });
    on(window, 'resize', req);
    on(document, 'hc:mode-change', req);
    on(toggle, 'click', function () {
      var open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (detail) detail.hidden = !open;
      HC.syncBarDetail();
    });
    bar.hcUpdate = update;
    update();
  });
  /* Copies the visible, filled rows of the product summary into the bar's expandable panel */
  HC.syncBarDetail = function () {
    var dl = qs('[data-hc-bar-sum]'), src = document.getElementById('pricingSummary');
    if (!dl || !src) return;
    dl.textContent = '';
    qsa('.hc-sum__row', src).forEach(function (row) {
      if (row.hidden || row.classList.contains('hc-is-empty')) return;
      var dt = qs('dt', row), dd = qs('dd', row);
      if (!dt || !dd) return;
      dl.appendChild(make('div', { className: 'hc-sum__row' }, [make('dt', { text: dt.textContent }), make('dd', { text: dd.textContent })]));
    });
  };

  /* ------------------------------------------------------------------------
     KEYBOARD OPEN (touch devices) — body.hc-is-typing hides the tab bar,
     sticky bar and call button so they never cover the field being typed in.
     ------------------------------------------------------------------------ */
  (function () {
    var TEXT = /^(text|search|email|tel|number|password|url)$/;
    var timer = null;
    function isField(el) { return el && ((el.tagName === 'INPUT' && TEXT.test(el.type)) || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT'); }
    document.addEventListener('focusin', function (e) {
      if (!COARSE.matches || !isField(e.target)) return;
      clearTimeout(timer);
      document.body.classList.add('hc-is-typing');
    });
    document.addEventListener('focusout', function () {
      clearTimeout(timer);
      timer = setTimeout(function () { if (!isField(document.activeElement)) document.body.classList.remove('hc-is-typing'); }, 120);
    });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', function () {
        if (!COARSE.matches) return;
        var kb = window.visualViewport.height < window.innerHeight * 0.75;
        if (kb) document.body.classList.add('hc-is-typing');
        else if (!isField(document.activeElement)) document.body.classList.remove('hc-is-typing');
      });
    }
  })();

  /* ------------------------------------------------------------------------
     FLOATING CALL BUTTON — steps aside (hc-is-avoiding) whenever it would
     cover a button, link-button, field or option card.
     ------------------------------------------------------------------------ */
  var CTA_SEL = '.hc-btn, [data-hc-add], .hc-marquee, .hc-mq-toggle, .hc-cattile, .hc-brand, .hc-gallery__main, .hc-gallery__thumb, input:not([type="hidden"]), select, textarea, .hc-rcard, .hc-qty, .hc-chip, .hc-card__wish, .hc-pager a, .hc-carousel__dot, .hc-gallery__dot, .hc-seeall, .hc-tabs__tab, .hc-acc__btn';
  HC.register('fab', function (fab) {
    var ticking = false;
    function covers() {
      var r = fab.getBoundingClientRect();
      if (!r.width) return false;
      // 3 x 3 sample grid over the button, grown by 8px so near-misses count too
      var pad = 8, pts = [];
      [r.left - pad, r.left + r.width / 2, r.right + pad].forEach(function (x) { [r.top - pad, r.top + r.height / 2, r.bottom + pad].forEach(function (y) { pts.push([x, y]); }); });
      [[r.left + 3, r.top + 3], [r.right - 3, r.top + 3], [r.left + 3, r.bottom - 3], [r.right - 3, r.bottom - 3]].forEach(function (pt) { pts.push(pt); });
      for (var i = 0; i < pts.length; i++) {
        var x = Math.max(0, Math.min(window.innerWidth - 1, pts[i][0])), y = Math.max(0, Math.min(window.innerHeight - 1, pts[i][1]));
        var els = document.elementsFromPoint ? document.elementsFromPoint(x, y) : [];
        for (var k = 0; k < els.length; k++) {
          var el = els[k];
          if (el === fab || fab.contains(el)) continue;
          if (el.closest && el.closest(CTA_SEL) && !el.closest('.hc-tabbar, .hc-buybar, .hc-header')) return true;
        }
      }
      return false;
    }
    function update() { ticking = false; fab.classList.toggle('hc-is-avoiding', covers()); }
    function req() { if (!ticking) { ticking = true; window.requestAnimationFrame(update); } }
    on(window, 'scroll', req, { passive: true });
    on(window, 'resize', req);
    on(document, 'click', function () { setTimeout(req, 50); });
    setTimeout(update, 300);
  });

  /* ------------------------------------------------------------------------
     RESPONSIVE <details> — [data-hc~="respdetails"][data-open-min="600"]:
     always open at or above that width (summary inert), collapsed below it.
     Used by footer link columns and the policy "On this page" list.
     ------------------------------------------------------------------------ */
  HC.register('respdetails', function (d) {
    var min = parseInt(d.getAttribute('data-open-min'), 10) || 600;
    var q = mq('(min-width: ' + min + 'px)');
    function apply() { if (q.matches) d.open = true; else d.open = d.hasAttribute('data-open-mobile'); }
    var sum = qs('summary', d);
    on(sum, 'click', function (e) { if (q.matches) e.preventDefault(); });
    onMq(q, apply); apply();
  });

  /* ------------------------------------------------------------------------
     FILTER RESULT COUNT — form[data-hc~="filtercount"]: updates
     [data-hc-result-count] as filters change. Fires cancelable
     hc:filter-count { form, params, done(n) }; the backend answers with the
     real count. Prototype default: a rough estimate from the sample counts.
     ------------------------------------------------------------------------ */
  HC.register('filtercount', function (form) {
    var outs = qsa('[data-hc-result-count]', form);
    var btnLabel = qs('[data-hc-result-label]', form);
    function done(n) {
      outs.forEach(function (o) { o.textContent = String(n); });
      if (btnLabel) btnLabel.textContent = n === 0 ? 'No matches' : (n === 1 ? 'Show 1 result' : 'Show ' + n + ' results');
    }
    function estimate() {
      var cat = qs('input[name="category"]:checked', form);
      var n = parseInt((cat && cat.getAttribute('data-count')) || form.getAttribute('data-total') || '0', 10);
      if ((qs('input[name="manufacturer"]:checked', form) || {}).value) n = Math.round(n * 0.45);
      var pots = qsa('input[name="potency[]"]:checked', form).length; if (pots) n = Math.round(n * Math.min(1, 0.3 * pots));
      var meds = qsa('input[name="medium[]"]:checked', form).length; if (meds) n = Math.round(n * Math.min(1, 0.4 * meds));
      if ((qs('[name="min_price"]', form) || {}).value || (qs('[name="max_price"]', form) || {}).value) n = Math.round(n * 0.7);
      return n;
    }
    function changed() {
      var params = new URLSearchParams(new FormData(form)).toString();
      if (emit(form, 'hc:filter-count', { form: form, params: params, done: done }, true)) done(estimate());
    }
    on(form, 'change', changed);
    on(form, 'input', function (e) { if (e.target.name === 'min_price' || e.target.name === 'max_price') changed(); });
  });

  /* ------------------------------------------------------------------------
     MARQUEE — [data-hc="marquee"] (brand logos, testimonials)
     data-direction="rtl|ltr"  data-speed="px per second" (overrides
     --hc-marquee-speed)  data-pause-on="hover focus touch"
     data-static="wrap|scroll" (reduced-motion fallback, CSS only).
     The server renders the list once; this clones it ONCE (aria-hidden,
     tabindex -1) so a CSS translateX(-50%) loop is seamless.
     ------------------------------------------------------------------------ */
  var REDUCE = mq('(prefers-reduced-motion: reduce)');
  var FINE_HOVER = mq('(hover: hover) and (pointer: fine)');
  HC.register('marquee', function (root) {
    var track = qs('.hc-marquee__track', root), list = track && qs('.hc-marquee__list', track);
    if (!track || !list) return;
    var pauseOn = (root.getAttribute('data-pause-on') || 'hover focus touch').split(/\s+/);
    var toggles = root.id ? qsa('[data-hc-marquee-toggle][aria-controls="' + root.id + '"]') : [];
    var prev = qs('[data-hc-mq-prev]', root), next = qs('[data-hc-mq-next]', root);
    var clone = null, reasons = {}, inView = false, ready = false, primed = false, touchTimer = null, raf = 0;
    root.setAttribute('data-hc-ready', '');

    /* Avatar initials from the name (the backend only outputs the name) */
    qsa('[data-hc-initials]', list).forEach(function (el) {
      var card = el.closest('.hc-quote'), n = card && qs('[data-slot="testimonial.name"]', card);
      var w = n ? n.textContent.trim().split(/\s+/).filter(Boolean) : [];
      el.textContent = w.length ? (w[0].charAt(0) + (w.length > 1 ? w[w.length - 1].charAt(0) : '')).toUpperCase() : '';
    });
    /* Cards take keyboard focus so the strip can be paused and read */
    qsa('.hc-quote', list).forEach(function (c) { c.tabIndex = 0; });

    function makeClone() {
      if (clone) return; // never more than one clone
      clone = list.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      clone.classList.add('hc-marquee__list--clone');
      qsa('[id]', clone).forEach(function (n) { n.removeAttribute('id'); });
      qsa('a, button, input, select, textarea, [tabindex]', clone).forEach(function (n) { n.setAttribute('tabindex', '-1'); });
      track.appendChild(clone);
    }
    function dropClone() { if (clone && clone.parentNode) clone.parentNode.removeChild(clone); clone = null; }
    function speed() {
      var d = parseFloat(root.getAttribute('data-speed'));
      if (d > 0) return d;
      var v = parseFloat(getComputedStyle(root).getPropertyValue('--hc-marquee-speed'));
      return v > 0 ? v : 50;
    }
    /* The list must be at least as wide as the strip, otherwise a gap would show
       before the loop point. On very wide screens the gap grows instead of adding
       a second clone. Duration = list width / speed, so the pace is the same everywhere. */
    function measure() {
      raf = 0;
      if (REDUCE.matches) return;
      root.style.removeProperty('--hc-mq-gap');
      var W = root.clientWidth, L = list.getBoundingClientRect().width;
      var n = list.children.length || 1;
      if (L < W + 1) {
        var gap = parseFloat(getComputedStyle(list).columnGap) || 0;
        root.style.setProperty('--hc-mq-gap', (gap + (W - L) / n + 1).toFixed(2) + 'px');
        L = list.getBoundingClientRect().width;
      }
      root.style.setProperty('--hc-mq-duration', Math.max(8, L / speed()).toFixed(2) + 's');
    }
    function remeasure() { if (!raf) raf = window.requestAnimationFrame(measure); }
    function update() {
      var paused = Object.keys(reasons).some(function (k) { return reasons[k]; });
      var run = ready && inView && !REDUCE.matches && !paused;
      root.classList.toggle('hc-is-running', run);
    }
    function set(reason, v) { reasons[reason] = !!v; update(); }

    /* Lazy logos: load them all (they are small) as the strip approaches, and only
       start moving once the first screen-width of images has arrived. */
    function prime() {
      if (primed) return; primed = true;
      var imgs = qsa('img', track);
      imgs.forEach(function (img) { img.loading = 'eager'; });
      var W = root.clientWidth;
      var first = qsa('img', list).filter(function (img) { var it = img.closest('.hc-marquee__item'); return it && it.offsetLeft < W + 200; });
      var waits = first.map(function (img) {
        return img.complete ? Promise.resolve() : new Promise(function (res) { img.addEventListener('load', res, { once: true }); img.addEventListener('error', res, { once: true }); });
      });
      var timeout = new Promise(function (res) { setTimeout(res, 3000); });
      Promise.race([Promise.all(waits), timeout]).then(function () { ready = true; measure(); update(); });
    }

    function applyMode() {
      if (REDUCE.matches) { dropClone(); root.style.removeProperty('--hc-mq-gap'); root.classList.remove('hc-is-running'); arrows(); }
      else { makeClone(); measure(); update(); }
    }

    /* Pause button(s) in the heading row: aria-pressed="true" = paused by the user */
    toggles.forEach(function (b) {
      on(b, 'click', function () {
        var paused = b.getAttribute('aria-pressed') !== 'true';
        toggles.forEach(function (t) { t.setAttribute('aria-pressed', paused ? 'true' : 'false'); });
        set('user', paused);
      });
    });
    if (pauseOn.indexOf('hover') > -1) {
      on(root, 'mouseenter', function () { if (FINE_HOVER.matches) set('hover', true); });
      on(root, 'mouseleave', function () { set('hover', false); });
    }
    if (pauseOn.indexOf('focus') > -1) {
      // keyboard focus only: a tap also focuses cards, and that must not pin the strip
      on(root, 'focusin', function (e) { var kb = true; try { kb = e.target.matches(':focus-visible'); } catch (err) { /* old browsers: treat as keyboard */ } if (kb) set('focus', true); });
      on(root, 'focusout', function (e) { if (!root.contains(e.relatedTarget)) set('focus', false); });
    }
    if (pauseOn.indexOf('touch') > -1) {
      on(root, 'touchstart', function () { clearTimeout(touchTimer); set('touch', true); }, { passive: true });
      var release = function () { clearTimeout(touchTimer); touchTimer = setTimeout(function () { set('touch', false); }, 2000); };
      on(root, 'touchend', release, { passive: true });
      on(root, 'touchcancel', release, { passive: true });
    }
    on(document, 'visibilitychange', function () { set('tab', document.hidden); });

    /* Reduced-motion scroll row: arrow buttons */
    function arrows() {
      if (!prev || !next) return;
      prev.disabled = list.scrollLeft <= 2;
      next.disabled = list.scrollLeft >= list.scrollWidth - list.clientWidth - 2;
    }
    function page(dir) { list.scrollBy({ left: dir * list.clientWidth * 0.9, behavior: 'auto' }); }
    on(prev, 'click', function () { page(-1); });
    on(next, 'click', function () { page(1); });
    on(list, 'scroll', function () { window.requestAnimationFrame(arrows); }, { passive: true });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) prime(); }); }, { rootMargin: '300px 0px' }).observe(root);
      new IntersectionObserver(function (es) { es.forEach(function (e) { inView = e.isIntersecting; update(); }); }, { threshold: 0 }).observe(root);
    } else { inView = true; prime(); }
    if ('ResizeObserver' in window) new ResizeObserver(remeasure).observe(root);
    on(window, 'resize', remeasure);
    on(window, 'orientationchange', remeasure);
    qsa('img', list).forEach(function (img) { on(img, 'load', remeasure); });
    onMq(REDUCE, applyMode);
    applyMode();
    root.hcMarquee = { reasons: reasons, measure: measure, isRunning: function () { return root.classList.contains('hc-is-running'); } };
  });

  /* ------------------------------------------------------------------------
     DEV ONLY — add ?debug=1 to any URL: outlines every element that sticks
     out past the viewport edge and lists them in the console.
     ------------------------------------------------------------------------ */
  function debugOverflow() {
    var vw = document.documentElement.clientWidth, hits = [];
    qsa('.hc-debug-overflow').forEach(function (el) { el.classList.remove('hc-debug-overflow'); });
    qsa('body *').forEach(function (el) {
      if (el.closest('svg') && el.tagName !== 'svg') return;
      var r = el.getBoundingClientRect();
      if (!r.width || (r.right <= vw + 1 && r.left >= -1)) return;
      for (var p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        var ov = getComputedStyle(p).overflowX;
        if (ov === 'auto' || ov === 'scroll' || ov === 'hidden' || ov === 'clip') return;
      }
      if (getComputedStyle(el).position === 'fixed') return;
      el.classList.add('hc-debug-overflow'); hits.push(el);
    });
    if (window.console) console.info('[HC debug] page ' + document.documentElement.scrollWidth + 'px wide, viewport ' + vw + 'px; overflowing elements:', hits.length ? hits : 'none');
    return hits;
  }
  HC.debugOverflow = debugOverflow;

  /* ------------------------------------------------------------------------
     BOOT
     ------------------------------------------------------------------------ */
  function boot() {
    HC.pin.render();
    HC.init(document);
    if (/[?&]debug=1\b/.test(location.search)) { debugOverflow(); on(window, 'resize', function () { clearTimeout(boot.t); boot.t = setTimeout(debugOverflow, 200); }); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
