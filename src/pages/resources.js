'use strict';
const content = require('../content');
const C = require('../components');
const { esc, mdLite, formatDate } = require('../util');

function list() {
  const rs = content.resources();
  const groups = {};
  rs.forEach((r) => { (groups[r.category || 'More'] = groups[r.category || 'More'] || []).push(r); });
  const card = (r) => {
    const ext = r.type === 'link' || r.type === 'download';
    const href = ext ? r.url : `/resources/${encodeURIComponent(r.slug)}`;
    return `<article class="reveal card card-hover p-6 sm:p-7 flex flex-col"><div class="flex flex-wrap gap-2 mb-3"><span class="chip">${esc({ article: 'Article', link: 'External link', download: 'Download', video: 'Video' }[r.type] || 'Resource')}</span>${r.readingMinutes ? `<span class="chip">${+r.readingMinutes} min read</span>` : ''}</div>
      <h3 class="font-display text-lg sm:text-xl text-forest mb-2"><a href="${esc(href)}" ${ext ? 'rel="noopener noreferrer" target="_blank"' : ''} class="hover:underline underline-offset-4 decoration-1">${esc(r.title)}${ext ? '<span class="sr-only"> (opens in a new tab)</span>' : ''}</a></h3>
      <p class="text-sm text-ink-soft leading-relaxed flex-1">${esc(r.summary)}</p>
      ${r.source ? `<p class="mt-4 text-xs text-ink-faint font-utility">Source: ${esc(r.source)}${ext ? ' &middot; independent organisation' : ''}</p>` : ''}
    </article>`;
  };
  const body = `
${C.pageHero({ eyebrow: 'Resources', title: 'Gentle information, when you want it.', intro: 'Guides for people grieving a suicide loss, for those supporting them, and for finding professional help. Take what is useful and leave the rest.', glow: 'bg-sage/35' })}
<section class="max-w-6xl mx-auto px-4 sm:px-6 md:px-10 pb-8"><div class="reveal">${C.safetyNotice()}</div></section>
<section class="max-w-6xl mx-auto px-4 sm:px-6 md:px-10 py-10 sm:py-14 space-y-14">
  ${rs.length ? Object.entries(groups).map(([g, items]) => `<div><h2 class="reveal font-display text-2xl text-forest mb-6">${esc(g)}</h2><div class="grid md:grid-cols-2 lg:grid-cols-3 gap-5">${items.map(card).join('')}</div></div>`).join('')
    : '<div class="card p-10 text-center">Resources will appear here soon.</div>'}
  <div class="reveal card p-6 sm:p-8 text-sm text-ink-soft leading-relaxed"><p><strong class="text-forest">About these resources.</strong> Articles are general information and do not replace professional care or provide a diagnosis. Links to other organisations are provided for convenience; those organisations are independent of Bloom, and Bloom is not responsible for their content or services.</p></div>
</section>
<section class="max-w-5xl mx-auto px-4 sm:px-6 md:px-10 pb-16 sm:pb-24">${C.donationCta({ variant: 'inline', title: 'Help us keep resources free.', text: 'Gifts help us write, review and publish resources people can use without paying.' })}</section>`;
  return { title: 'Resources', description: 'Guides and trusted links for people grieving a suicide loss, supporting someone bereaved, or looking for professional help.', path: '/resources', active: 'resources', body };
}

function detail(r) {
  const body = `
<article>
<header class="scene scene-light scene-vignette relative pt-28 pb-10 sm:pt-40 sm:pb-14"><div class="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 md:px-10">
  <p class="mb-6"><a href="/resources" class="text-sm text-forest font-utility underline underline-offset-4">&larr; All resources</a></p>
  <p class="eyebrow mb-4">${esc(r.category || 'Resource')}</p>
  <h1 class="font-display text-3xl sm:text-4xl md:text-5xl text-forest leading-tight mb-4">${esc(r.title)}</h1>
  <p class="text-sm text-ink-soft font-utility">${r.readingMinutes ? `${+r.readingMinutes} minute read` : ''}${r.reviewed ? ` &middot; Reviewed ${esc(formatDate(r.reviewed))}` : ''}</p>
</div></header>
<div class="max-w-3xl mx-auto px-4 sm:px-6 md:px-10 py-10 sm:py-14">
  <div class="prose-bloom">${mdLite(r.body)}</div>
  <div class="mt-12 pt-8 border-t border-sand-line space-y-6">${C.safetyNotice()}<p><a href="/contact" class="btn-secondary btn-sm">Talk to someone at Bloom</a></p></div>
</div></article>`;
  return { title: r.title, description: r.summary, path: `/resources/${r.slug}`, active: 'resources', body };
}
module.exports = { list, detail };
