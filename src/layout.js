'use strict';
const config = require('./config');
const content = require('./content');
const { esc, raw, html } = require('./util');

const NAV = [
  { href: '/', label: 'Home', key: 'home' },
  { href: '/approach', label: 'Our Approach', key: 'approach' },
  { href: '/services', label: 'Support & Services', key: 'services' },
  { href: '/journey', label: 'The Journey', key: 'journey' },
  { href: '/stories', label: 'Stories', key: 'stories' },
  { href: '/gallery', label: 'Gallery', key: 'gallery' },
  { href: '/resources', label: 'Resources', key: 'resources' },
  { href: '/about', label: 'About', key: 'about' },
  { href: '/contact', label: 'Contact', key: 'contact' },
];

const arrow = '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

function header(active) {
  const link = (n, cls = '') => `<a href="${n.href}" class="nav-link ${cls}"${active === n.key ? ' aria-current="page"' : ''}>${esc(n.label)}</a>`;
  return `
<header class="fixed top-0 left-0 right-0 z-50 bg-sand/95 backdrop-blur-sm border-b border-sand-line">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 xl:px-8 flex items-center justify-between h-16 sm:h-20 gap-4">
    <a href="/" class="flex items-center gap-2 shrink-0" aria-label="Bloom, home">
      <span class="logo-mark h-9 w-9 sm:h-10 sm:w-10" aria-hidden="true"></span>
      <span class="font-display text-xl sm:text-2xl text-forest tracking-tight">Bloom</span>
    </a>
    <nav class="hidden xl:flex items-center gap-5 2xl:gap-7 font-utility text-sm text-ink-soft" aria-label="Main">
      ${NAV.map((n) => link(n, 'hover:text-forest')).join('')}
    </nav>
    <div class="flex items-center gap-3">
      <a href="/donate" class="btn-primary btn-sm !px-5" ${active === 'donate' ? 'aria-current="page"' : ''}>Donate</a>
      <button id="menu-toggle" type="button" aria-expanded="false" aria-controls="mobile-menu" class="xl:hidden text-forest p-2 -mr-2" aria-label="Open menu">
        <svg class="icon-open" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
        <svg class="icon-close hidden" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
      </button>
    </div>
  </div>
  <div id="mobile-menu" class="xl:hidden bg-sand border-b border-sand-line px-4 sm:px-6">
    <nav class="flex flex-col py-4 font-utility text-sm max-h-[75vh] overflow-y-auto" aria-label="Mobile">
      ${NAV.map((n) => `<a href="${n.href}" class="py-3 border-b border-sand-line/70 ${active === n.key ? 'text-forest font-medium' : 'text-ink-soft'}"${active === n.key ? ' aria-current="page"' : ''}>${esc(n.label)}</a>`).join('')}
      <a href="/donate" class="btn-primary justify-center mt-4">Donate</a>
      <a href="/get-help-now" class="py-3 mt-2 text-center text-clay-deep underline underline-offset-4">Need urgent help? Get help now</a>
    </nav>
  </div>
</header>`;
}

function footer() {
  const site = content.site();
  const c = site.contact || {};
  const contactLines = [
    c.email && `<li><a class="hover:text-forest underline underline-offset-4" href="mailto:${esc(c.email)}">${esc(c.email)}</a></li>`,
    c.phone && `<li><a class="hover:text-forest" href="tel:${esc(c.phone.replace(/[^+\d]/g, ''))}">${esc(c.phone)}</a></li>`,
    c.hours && `<li>${esc(c.hours)}</li>`,
  ].filter(Boolean).join('');
  return `
<footer class="border-t border-sand-line relative overflow-hidden">
  <span class="logo-watermark w-72 sm:w-96 -right-10 -bottom-16 sm:-right-16" aria-hidden="true"></span>
  <div class="relative max-w-6xl mx-auto px-4 sm:px-6 md:px-10 py-12 sm:py-16 grid sm:grid-cols-2 lg:grid-cols-5 gap-10 sm:gap-12">
    <div class="lg:col-span-2">
      <div class="flex items-center gap-2 mb-4"><span class="logo-mark h-8 w-8" aria-hidden="true"></span><p class="font-display text-2xl text-forest">Bloom</p></div>
      <p class="text-sm text-ink-soft max-w-xs leading-relaxed">${esc(site.brand?.mission || '')}</p>
      <a href="/donate" class="btn-secondary btn-sm mt-6">Support this work</a>
    </div>
    <div>
      <p class="font-utility text-[11px] tracking-eyebrow uppercase text-ink-faint mb-4">Explore</p>
      <ul class="space-y-3 text-sm text-ink-soft">
        ${NAV.slice(1).map((n) => `<li><a href="${n.href}" class="hover:text-forest">${esc(n.label)}</a></li>`).join('')}
        <li><a href="/donate" class="hover:text-forest">Donate</a></li>
      </ul>
    </div>
    <div>
      <p class="font-utility text-[11px] tracking-eyebrow uppercase text-ink-faint mb-4">Get in touch</p>
      <ul class="space-y-3 text-sm text-ink-soft">
        ${contactLines || '<li><a href="/contact" class="hover:text-forest underline underline-offset-4">Send a message</a></li>'}
        <li><a href="/stories/share" class="hover:text-forest">Share a story</a></li>
        <li><a href="/privacy" class="hover:text-forest">Privacy</a></li>
      </ul>
    </div>
    <div>
      <p class="font-utility text-[11px] tracking-eyebrow uppercase text-ink-faint mb-4">A note on safety</p>
      <p class="text-sm text-ink-soft leading-relaxed">Bloom is not an emergency or crisis service. If you or someone near you is in immediate danger, contact your local emergency services.</p>
      <a href="/get-help-now" class="inline-block mt-3 text-sm text-forest underline underline-offset-4">Get help now</a>
    </div>
  </div>
  <div class="hairline"></div>
  <div class="relative max-w-6xl mx-auto px-4 sm:px-6 md:px-10 py-6 flex flex-col sm:flex-row justify-between gap-2 text-xs text-ink-faint">
    <p>&copy; ${new Date().getFullYear()} ${esc(site.organisation?.legalName || site.brand?.fullName || 'Bloom')}. All rights reserved.</p>
    ${site.organisation?.registrationStatement ? `<p>${esc(site.organisation.registrationStatement)}</p>` : '<p>Bloom offers bereavement support, not emergency care.</p>'}
  </div>
</footer>`;
}

/**
 * Wraps page content in the shared document shell.
 * opts: { title, description, path, active, body, image, noindex, extraBodyClass }
 */
function page(opts) {
  const site = content.site();
  const brand = site.brand || {};
  const fullTitle = opts.title ? `${opts.title} | ${brand.name || 'Bloom'}` : `${brand.name || 'Bloom'} | ${brand.tagline || ''}`;
  const desc = opts.description || brand.description || '';
  const canonical = config.siteUrl + (opts.path || '/');
  const img = config.siteUrl + (opts.image || site.seo?.defaultImage || '/images/social-card.png');
  return `<!DOCTYPE html>
<html lang="en" class="no-js">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="theme-color" content="#2E4635">
${opts.noindex ? '<meta name="robots" content="noindex, nofollow">' : `<link rel="canonical" href="${esc(canonical)}">`}
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(brand.fullName || brand.name || 'Bloom')}">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(img)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
${opts.meta || ''}
<link rel="preload" href="/fonts/fraunces-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/css/site.css?v=${assetVersion}">
<script src="/js/head.js"></script>
</head>
<body class="bg-sand text-ink font-body antialiased ${opts.extraBodyClass || ''}">
<a href="#main" class="skip-link">Skip to main content</a>
${header(opts.active)}
<main id="main" tabindex="-1">
${opts.body}
</main>
${footer()}
<script src="/js/main.js?v=${assetVersion}" defer></script>
${(opts.scripts || []).map((s) => `<script src="${s}?v=${assetVersion}" defer></script>`).join('\n')}
</body>
</html>`;
}

let assetVersion = '1';
try { assetVersion = String(Math.floor(require('fs').statSync(require('path').join(config.root, 'public/css/site.css')).mtimeMs / 1000)); } catch { /* css not built yet */ }

module.exports = { page, NAV, arrow };
