'use strict';
const { esc, formatDate } = require('./util');
const content = require('./content');

const arrow = '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

const catLabel = (slug) => (content.categories().find((c) => c.slug === slug) || {}).label || slug;

/** Shared hero for inner pages. */
function pageHero({ eyebrow, title, intro, glow = 'bg-sage/40', align = 'center', extra = '' }) {
  return `
<section class="scene scene-light scene-vignette relative pt-28 pb-12 sm:pt-40 sm:pb-16 md:pt-48 md:pb-20">
  <div class="glow-blob w-56 h-56 sm:w-80 sm:h-80 ${glow} -right-14 -top-6" aria-hidden="true"></div>
  <div class="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 md:px-10 ${align === 'center' ? 'text-center' : ''}">
    ${eyebrow ? `<p class="reveal eyebrow mb-4 sm:mb-5">${esc(eyebrow)}</p>` : ''}
    <h1 class="reveal font-display text-3xl sm:text-4xl md:text-5xl text-forest leading-tight mb-5 sm:mb-6">${esc(title)}</h1>
    ${intro ? `<p class="reveal text-base sm:text-lg text-ink-soft leading-relaxed ${align === 'center' ? 'max-w-2xl mx-auto' : 'max-w-2xl'}">${esc(intro)}</p>` : ''}
    ${extra}
  </div>
</section>`;
}

function sectionHeading({ eyebrow, title, intro, dark = false, center = false }) {
  return `<div class="reveal max-w-2xl ${center ? 'mx-auto text-center' : ''} mb-10 sm:mb-14">
    ${eyebrow ? `<p class="${dark ? 'eyebrow-light' : 'eyebrow'} mb-4">${esc(eyebrow)}</p>` : ''}
    <h2 class="font-display text-2xl sm:text-3xl md:text-4xl ${dark ? '' : 'text-forest'}">${esc(title)}</h2>
    ${intro ? `<p class="mt-4 text-sm sm:text-base ${dark ? 'text-sand/80' : 'text-ink-soft'} leading-relaxed">${esc(intro)}</p>` : ''}
  </div>`;
}

const sampleBadge = (s) => (s ? '<span class="badge-sample" title="Placeholder content for layout preview only">Sample</span>' : '');

/** Gentle notice shown wherever potentially distressing material is flagged. */
function advisory(small = false) {
  return small
    ? '<span class="chip !bg-clay-soft/50 !border-clay" title="This may contain distressing material">Content advisory</span>'
    : `<div class="alert alert-warn" role="note"><strong>A gentle advisory.</strong> This may include difficult or distressing material about suicide loss. Please read, watch or look when it feels right for you, and feel free to step away. If you need support, <a class="underline underline-offset-4" href="/get-help-now">help is listed here</a>.</div>`;
}

function safetyNotice() {
  const c = content.crisis();
  return `<aside class="alert alert-info" aria-label="Safety information">
    <p><strong class="text-forest">A note on safety.</strong> ${esc(c.intro || 'Bloom is not an emergency or crisis service.')} ${esc(c.emergencyNote || '')} <a class="text-forest underline underline-offset-4" href="/get-help-now">See crisis and urgent support options</a>.</p>
  </aside>`;
}

/** Reusable donation call to action. variant: 'banner' (dark, large) | 'inline' (light, compact) */
function donationCta({ variant = 'banner', title, text, button = 'Make a donation' } = {}) {
  const d = content.site().donations || {};
  title = title || 'Help keep this support open to others.';
  text = text || d.usesStatement || '';
  if (variant === 'inline') {
    return `<div class="reveal card p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
      <div><h3 class="font-display text-xl text-forest mb-1">${esc(title)}</h3><p class="text-sm text-ink-soft max-w-xl">${esc(text)}</p></div>
      <a href="/donate" class="btn-primary shrink-0">${esc(button)}</a></div>`;
  }
  return `<div class="reveal scene scene-dark rounded-3xl px-6 py-14 sm:px-8 sm:py-16 md:p-20 text-center">
    <p class="relative z-10 eyebrow-light mb-4">Support the Work</p>
    <h2 class="relative z-10 font-display text-2xl sm:text-3xl md:text-4xl mb-5 max-w-xl mx-auto">${esc(title)}</h2>
    <p class="relative z-10 max-w-xl mx-auto text-sm sm:text-base text-sand/80 leading-relaxed mb-8">${esc(text)}</p>
    <a href="/donate" class="relative z-10 btn-light">${esc(button)}</a>
    <p class="relative z-10 mt-5 text-xs text-sand/65">Give once or monthly. Never any pressure.</p>
  </div>`;
}

function storyCard(s) {
  const cats = (s.categories || []).slice(0, 2).map((c) => `<span class="chip">${esc(catLabel(c))}</span>`).join('');
  return `<article class="reveal card card-hover p-6 sm:p-8 flex flex-col h-full">
    <div class="flex flex-wrap gap-2 mb-4">${cats}${s.contentAdvisory ? advisory(true) : ''}${sampleBadge(s.sample)}</div>
    <h3 class="font-display text-xl sm:text-2xl text-forest leading-snug mb-3"><a href="/stories/${encodeURIComponent(s.slug)}" class="hover:underline underline-offset-4 decoration-1">${esc(s.title)}</a></h3>
    <p class="text-sm sm:text-base text-ink-soft leading-relaxed mb-5 flex-1">${esc(s.excerpt)}</p>
    <div class="flex items-center justify-between gap-3 text-xs text-ink-faint font-utility">
      <span>${esc(s.displayName || '')}${s.publishedAt ? ` &middot; ${esc(formatDate(s.publishedAt))}` : ''}</span>
      <a href="/stories/${encodeURIComponent(s.slug)}" class="text-forest inline-flex items-center gap-1.5 text-sm" aria-label="Read the story: ${esc(s.title)}">Read ${arrow}</a>
    </div>
  </article>`;
}

function videoCard(v) {
  const unavailable = v.status === 'unavailable' || (!v.src && !v.embedId);
  const poster = v.poster ? `<img src="${esc(v.poster)}" alt="" loading="lazy" data-fallback class="absolute inset-0 w-full h-full object-cover">` : '<div class="absolute inset-0 bg-gradient-to-br from-forest to-sage" aria-hidden="true"></div>';
  const btn = unavailable
    ? `<div class="absolute inset-0 flex items-center justify-center bg-forest-deep/50 text-sand text-sm font-utility px-6 text-center">This video is no longer available</div>`
    : `<button type="button" class="absolute inset-0 flex items-center justify-center group" data-video-open="${esc(v.slug)}" aria-haspopup="dialog" aria-label="Play video: ${esc(v.title)}">
         <span class="w-16 h-16 rounded-full bg-sand/90 text-forest flex items-center justify-center shadow-lg group-hover:bg-white transition-colors"><svg class="w-6 h-6 ml-0.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg></span>
       </button>`;
  return `<article class="reveal card card-hover overflow-hidden flex flex-col h-full">
    <div class="relative aspect-video bg-sand-deep overflow-hidden">${poster}${btn}${v.durationLabel && !unavailable ? `<span class="absolute bottom-2 right-2 bg-forest-deep/80 text-sand text-xs font-utility px-2 py-0.5 rounded">${esc(v.durationLabel)}</span>` : ''}</div>
    <div class="p-5 sm:p-6 flex flex-col flex-1">
      <div class="flex flex-wrap gap-2 mb-3">${v.contentAdvisory ? advisory(true) : ''}${v.captions ? '<span class="chip">Captions</span>' : ''}${sampleBadge(v.sample)}</div>
      <h3 class="font-display text-lg sm:text-xl text-forest leading-snug mb-2">${esc(v.title)}</h3>
      <p class="text-sm text-ink-soft leading-relaxed flex-1">${esc(v.description || '')}</p>
      ${v.displayName ? `<p class="mt-4 text-xs text-ink-faint font-utility">${esc(v.displayName)}</p>` : ''}
    </div>
  </article>`;
}

function galleryItem(g, i) {
  return `<figure class="reveal">
    <button type="button" class="block w-full text-left group relative overflow-hidden rounded-2xl border border-sand-line bg-sand-deep" data-gallery-open="${i}" aria-haspopup="dialog" aria-label="Open image: ${esc(g.alt.slice(0, 90))}">
      <img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy" decoding="async" ${g.width ? `width="${+g.width}" height="${+g.height}"` : ''} data-fallback class="w-full h-auto block transition-transform duration-700 group-hover:scale-[1.02]">
    </button>
    ${g.caption || g.credit ? `<figcaption class="mt-2 px-1 text-xs text-ink-soft font-utility">${esc(g.caption || '')}${g.credit ? ` <span class="text-ink-faint">${esc(g.credit)}</span>` : ''} ${sampleBadge(g.sample)}</figcaption>` : ''}
  </figure>`;
}

function storiesSubnav(active) {
  const items = [['written', '/stories', 'Written stories'], ['videos', '/stories/videos', 'Video stories'], ['gallery', '/gallery', 'Gallery'], ['share', '/stories/share', 'Share your story']];
  return `<nav aria-label="Stories sections" class="flex flex-wrap justify-center gap-2 mt-8">${items.map(([k, h, l]) => `<a href="${h}" class="chip !px-4 !py-2 !text-sm" ${active === k ? 'aria-current="true"' : ''}>${esc(l)}</a>`).join('')}</nav>`;
}

function fieldError(errors, name) {
  return errors && errors[name] ? `<p class="field-error" id="${name}-error">${esc(errors[name])}</p>` : '';
}

const a11yInvalid = (errors, name) => (errors && errors[name] ? `aria-invalid="true" aria-describedby="${name}-error"` : '');

module.exports = { arrow, catLabel, pageHero, sectionHeading, sampleBadge, advisory, safetyNotice, donationCta, storyCard, videoCard, galleryItem, storiesSubnav, fieldError, a11yInvalid };
