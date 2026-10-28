(function () {
  'use strict';
  var d = document;

  // Scroll reveal
  var els = d.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -30px 0px' });
    els.forEach(function (el, i) { el.style.transitionDelay = Math.min(i % 4, 3) * 80 + 'ms'; io.observe(el); });
  } else els.forEach(function (el) { el.classList.add('is-visible'); });

  // Mobile menu
  var btn = d.getElementById('menu-toggle'), menu = d.getElementById('mobile-menu');
  if (btn && menu) {
    var setMenu = function (open) {
      menu.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      btn.querySelector('.icon-open').classList.toggle('hidden', open);
      btn.querySelector('.icon-close').classList.toggle('hidden', !open);
    };
    btn.addEventListener('click', function () { setMenu(!menu.classList.contains('open')); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu.classList.contains('open')) { setMenu(false); btn.focus(); } });
    menu.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    window.matchMedia('(min-width: 1280px)').addEventListener('change', function (m) { if (m.matches) setMenu(false); });
  }

  // Accordion (Journey)
  d.querySelectorAll('[data-journey-trigger]').forEach(function (t) {
    t.addEventListener('click', function () {
      var panel = d.getElementById(t.getAttribute('aria-controls'));
      var open = t.getAttribute('aria-expanded') === 'true';
      t.setAttribute('aria-expanded', String(!open));
      if (panel) panel.classList.toggle('is-open', !open);
    });
  });

  // Mind-Body-Spirit rings
  var rings = d.querySelectorAll('[data-ring]');
  rings.forEach(function (r) {
    r.addEventListener('click', function () {
      d.querySelectorAll('.ring-caption').forEach(function (c) { c.classList.add('hidden'); });
      var tgt = d.getElementById(r.getAttribute('data-ring')); if (tgt) tgt.classList.remove('hidden');
      rings.forEach(function (x) {
        var on = x === r; x.setAttribute('aria-pressed', String(on));
        x.classList.toggle('bg-forest', on); x.classList.toggle('text-sand', on); x.classList.toggle('border-forest', on);
      });
    });
  });

  // Missing-image fallback (CSP forbids inline onerror)
  function fallback(img) {
    if (img.dataset.failed) return; img.dataset.failed = '1';
    var ph = d.createElement('div');
    ph.className = 'flex items-center justify-center text-center p-6 text-xs text-ink-faint font-utility bg-sand-deep ' + (img.className || '');
    ph.setAttribute('role', 'img'); ph.setAttribute('aria-label', img.alt ? 'Image unavailable: ' + img.alt : 'Image unavailable');
    ph.style.minHeight = '8rem'; ph.textContent = 'Image unavailable';
    img.replaceWith(ph);
  }
  d.querySelectorAll('img[data-fallback]').forEach(function (img) {
    img.addEventListener('error', function () { fallback(img); });
    if (img.complete && img.naturalWidth === 0 && img.currentSrc) fallback(img);
  });

  // Confirmations for destructive admin buttons
  d.addEventListener('click', function (e) {
    var b = e.target.closest('[data-confirm]');
    if (b && !window.confirm(b.getAttribute('data-confirm'))) e.preventDefault();
  });

  // Move focus to form alerts so screen readers announce them
  var fa = d.getElementById('form-alert'); if (fa) { fa.focus(); fa.scrollIntoView({ block: 'center' }); }

  // Basic client-side hints (server always re-validates)
  d.querySelectorAll('form[data-validate]').forEach(function (f) { f.addEventListener('submit', function () { var s = f.querySelector('[type=submit]'); if (s) setTimeout(function () { s.disabled = true; }, 0); }); });
})();
