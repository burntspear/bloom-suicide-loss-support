'use strict';
const content = require('../content');
const C = require('../components');
const { esc, formatDate, paragraphs, mdLite } = require('../util');
const { HONEYPOT } = require('../security');

const PAGE_SIZE = 9;
const RELATIONSHIPS = [['', 'Prefer not to say'], ['partner', 'Partner or spouse'], ['parent', 'Parent'], ['child', 'Son or daughter'], ['sibling', 'Brother or sister'], ['friend', 'Friend'], ['extended', 'Other family member'], ['other', 'Other']];

const jsonForScript = (o) => JSON.stringify(o).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

function list(query) {
  const cats = content.categories();
  const cat = cats.find((c) => c.slug === query.category) ? query.category : '';
  let all = content.stories();
  if (cat) all = all.filter((s) => (s.categories || []).includes(cat));
  const pages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
  const pageNo = Math.min(pages, Math.max(1, parseInt(query.page, 10) || 1));
  const items = all.slice((pageNo - 1) * PAGE_SIZE, pageNo * PAGE_SIZE);
  const qs = (p, c) => `/stories?${[c ? `category=${encodeURIComponent(c)}` : '', p > 1 ? `page=${p}` : ''].filter(Boolean).join('&')}`.replace(/\?$/, '');
  const body = `
${C.pageHero({ eyebrow: 'Stories', title: 'In their own words.', intro: 'Written accounts from people who have lost someone to suicide, shared by choice, reviewed with care, and offered so that no one has to feel they are the only one.', glow: 'bg-clay/35', extra: C.storiesSubnav('written') })}
<section class="max-w-6xl mx-auto px-4 sm:px-6 md:px-10 pb-8">
  <div class="reveal">${C.advisory()}</div>
</section>
<section class="max-w-6xl mx-auto px-4 sm:px-6 md:px-10 py-10 sm:py-14" aria-labelledby="stories-list">
  <h2 id="stories-list" class="sr-only">Written stories</h2>
  <nav aria-label="Filter stories by theme" class="reveal flex flex-wrap gap-2 mb-10">
    <a href="/stories" class="chip" ${!cat ? 'aria-current="true"' : ''}>All</a>
    ${cats.map((c) => `<a href="${qs(1, c.slug)}" class="chip" ${cat === c.slug ? 'aria-current="true"' : ''}>${esc(c.label)}</a>`).join('')}
  </nav>
  ${items.length ? `<div class="grid md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">${items.map(C.storyCard).join('')}</div>`
    : `<div class="reveal card p-8 sm:p-12 text-center max-w-2xl mx-auto"><h3 class="font-display text-xl sm:text-2xl text-forest mb-3">${cat ? 'No stories in this theme yet.' : 'Stories will be shared here.'}</h3><p class="text-sm sm:text-base text-ink-soft leading-relaxed mb-6">${cat ? 'Please try another theme, or look at all stories.' : 'Nothing appears on this page until a contributor has given consent and the story has been reviewed. If you would like to share yours, there is no rush, and you stay in control.'}</p><div class="flex flex-col xs:flex-row gap-3 justify-center">${cat ? '<a href="/stories" class="btn-secondary">See all stories</a>' : ''}<a href="/stories/share" class="btn-primary">Share a story</a></div></div>`}
  ${pages > 1 ? `<nav aria-label="Pagination" class="mt-10 flex justify-center items-center gap-3 font-utility text-sm">${pageNo > 1 ? `<a class="btn-secondary btn-sm" href="${qs(pageNo - 1, cat)}">Previous</a>` : ''}<span class="text-ink-soft">Page ${pageNo} of ${pages}</span>${pageNo < pages ? `<a class="btn-secondary btn-sm" href="${qs(pageNo + 1, cat)}">Next</a>` : ''}</nav>` : ''}
</section>
<section class="max-w-5xl mx-auto px-4 sm:px-6 md:px-10 pb-16 sm:pb-24 space-y-6">
  <div class="reveal card p-6 sm:p-10 text-center"><h2 class="font-display text-xl sm:text-2xl text-forest mb-3">Would you like to share your story?</h2><p class="text-sm sm:text-base text-ink-soft max-w-xl mx-auto mb-6">You choose your name or stay anonymous. Nothing is published without your consent and a careful review, and you can withdraw it later.</p><a href="/stories/share" class="btn-primary">Share your story</a></div>
  ${C.donationCta({ variant: 'inline', title: 'Help us keep these stories safe and supported.', text: 'Gifts help cover moderation, hosting and the care that goes into every story.' })}
</section>`;
  return { title: cat ? `Stories: ${(cats.find((c) => c.slug === cat) || {}).label}` : 'Written stories', description: 'Written stories and testimonials from people bereaved by suicide, shared with consent and reviewed with care.', path: '/stories', active: 'stories', body };
}

function detail(s) {
  const related = content.relatedStories(s);
  const resources = content.resources().filter((r) => r.type === 'article').slice(0, 2);
  const text = s.bodyIsPlainText ? paragraphs(s.body) : mdLite(s.body);
  const body = `
<article>
<header class="scene scene-light scene-vignette relative pt-28 pb-12 sm:pt-40 sm:pb-16">
  <div class="glow-blob w-56 h-56 sm:w-80 sm:h-80 bg-clay/30 -right-14 -top-6" aria-hidden="true"></div>
  <div class="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 md:px-10">
    <p class="mb-6"><a href="/stories" class="text-sm text-forest font-utility underline underline-offset-4">&larr; All stories</a></p>
    <div class="flex flex-wrap gap-2 mb-5">${(s.categories || []).map((c) => `<a class="chip" href="/stories?category=${encodeURIComponent(c)}">${esc(C.catLabel(c))}</a>`).join('')}${C.sampleBadge(s.sample)}</div>
    <h1 class="font-display text-3xl sm:text-4xl md:text-5xl text-forest leading-tight mb-5">${esc(s.title)}</h1>
    <p class="text-sm text-ink-soft font-utility">${s.displayName ? `Shared by ${esc(s.displayName)}` : ''}${s.publishedAt ? ` &middot; ${esc(formatDate(s.publishedAt))}` : ''}</p>
  </div>
</header>
<div class="max-w-3xl mx-auto px-4 sm:px-6 md:px-10 py-10 sm:py-14">
  ${s.contentAdvisory ? `<div class="mb-8">${C.advisory()}</div>` : ''}
  ${s.image?.src ? `<figure class="mb-10"><img src="${esc(s.image.src)}" alt="${esc(s.image.alt || '')}" class="rounded-2xl w-full h-auto" loading="lazy" data-fallback>${s.image.caption ? `<figcaption class="text-xs text-ink-faint mt-2 font-utility">${esc(s.image.caption)}</figcaption>` : ''}</figure>` : ''}
  <div class="prose-bloom">${text}</div>
  <div class="mt-12 pt-8 border-t border-sand-line">${C.safetyNotice()}</div>
</div>
</article>
<section class="max-w-6xl mx-auto px-4 sm:px-6 md:px-10 pb-16 sm:pb-24">
  ${related.length ? `<h2 class="reveal font-display text-2xl text-forest mb-6">Related stories</h2><div class="grid md:grid-cols-3 gap-5 mb-14">${related.map(C.storyCard).join('')}</div>` : ''}
  ${resources.length ? `<h2 class="reveal font-display text-2xl text-forest mb-6">Gentle reading</h2><div class="grid md:grid-cols-2 gap-5 mb-14">${resources.map((r) => `<a href="/resources/${esc(r.slug)}" class="reveal card card-hover p-6"><h3 class="font-display text-lg text-forest mb-2">${esc(r.title)}</h3><p class="text-sm text-ink-soft">${esc(r.summary)}</p></a>`).join('')}</div>` : ''}
  ${C.donationCta({ variant: 'inline', title: 'If this helped, you can help someone else find it.', text: 'Gifts keep these stories and this support available.' })}
</section>`;
  return { title: s.title, description: s.excerpt, path: `/stories/${s.slug}`, active: 'stories', body, noindex: !!s.sample };
}

function textField(name, label, { values = {}, errors = {}, type = 'text', required = false, hint = '', max = 200, autocomplete = '' } = {}) {
  return `<div><label for="${name}" class="field-label">${esc(label)}${required ? '' : ' <span class="text-ink-faint">(optional)</span>'}</label>
    <input id="${name}" name="${name}" type="${type}" ${required ? 'required' : ''} maxlength="${max}" ${autocomplete ? `autocomplete="${autocomplete}"` : ''} value="${esc(values[name] || '')}" class="field" ${C.a11yInvalid(errors, name)} ${hint ? `aria-describedby="${name}-hint${errors[name] ? ` ${name}-error` : ''}"` : ''}>
    ${hint ? `<p id="${name}-hint" class="text-xs text-ink-faint mt-1.5">${esc(hint)}</p>` : ''}${C.fieldError(errors, name)}</div>`;
}

function share({ values = {}, errors = {}, token, formError }) {
  const cats = content.categories();
  const chosen = new Set([].concat(values.categories || []));
  const body = `
${C.pageHero({ eyebrow: 'Share your story', title: 'Only if, and when, you wish.', intro: 'Your words can help someone feel less alone. You are in control of how you are named, and nothing is published without your consent and a careful review.', glow: 'bg-sage/35' })}
<section class="max-w-3xl mx-auto px-4 sm:px-6 md:px-10 pb-16 sm:pb-24">
  <div class="reveal alert alert-info mb-8 space-y-2">
    <p><strong class="text-forest">Before you begin.</strong> Submitting does not guarantee publication. Every submission stays private until a person at Bloom has read and approved it, and we may suggest gentle edits, which you will always see first if you have given an email address.</p>
    <p>To help keep readers safe, please do not describe the method of the death, and please leave out names or details of other people who have not agreed to be included. You do not need to share anything about the circumstances of the death.</p>
    <p>If you are struggling right now, <a href="/get-help-now" class="underline underline-offset-4 text-forest">support options are here</a>.</p>
  </div>
  ${formError ? `<div class="alert alert-error mb-6" role="alert" tabindex="-1" id="form-alert">${esc(formError)}</div>` : ''}
  ${Object.keys(errors).length && !formError ? `<div class="alert alert-error mb-6" role="alert" tabindex="-1" id="form-alert">Please check the highlighted fields below.</div>` : ''}
  <form method="post" action="/stories/share" class="reveal bg-sand-deep/60 border border-sand-line rounded-3xl p-6 sm:p-8 md:p-10 space-y-6" novalidate data-validate>
    <input type="hidden" name="_token" value="${esc(token)}">
    <div class="hidden" aria-hidden="true"><label>Leave this field empty <input type="text" name="${HONEYPOT}" tabindex="-1" autocomplete="off"></label></div>
    ${textField('title', 'A title for your story', { values, errors, required: true, max: 120, hint: 'For example, the name of a place, a feeling or a memory. Not the name of the person.' })}
    <div>
      <label for="story" class="field-label">Your story</label>
      <textarea id="story" name="story" rows="12" required minlength="80" maxlength="12000" class="field" ${C.a11yInvalid(errors, 'story')} aria-describedby="story-hint${errors.story ? ' story-error' : ''}">${esc(values.story || '')}</textarea>
      <p id="story-hint" class="text-xs text-ink-faint mt-1.5">Write as much or as little as feels right (at least a few sentences). You can leave paragraphs between lines.</p>${C.fieldError(errors, 'story')}
    </div>
    <fieldset><legend class="field-label">Themes that fit <span class="text-ink-faint">(optional, choose any)</span></legend>
      <div class="flex flex-wrap gap-x-5 gap-y-2">${cats.map((c) => `<label class="inline-flex items-center gap-2 text-sm text-ink-soft"><input type="checkbox" name="categories" value="${esc(c.slug)}" ${chosen.has(c.slug) ? 'checked' : ''} class="h-4 w-4 accent-forest"> ${esc(c.label)}</label>`).join('')}</div>
    </fieldset>
    <div><label for="relationship" class="field-label">Your relationship to the person you lost <span class="text-ink-faint">(optional)</span></label>
      <select id="relationship" name="relationship" class="field">${RELATIONSHIPS.map(([v, l]) => `<option value="${v}" ${values.relationship === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div>
    <fieldset aria-describedby="name-hint"><legend class="field-label">How should your name appear?</legend>
      <div class="space-y-2">
        <label class="flex items-start gap-3 text-sm text-ink-soft"><input type="radio" name="name_choice" value="anonymous" ${values.name_choice !== 'custom' ? 'checked' : ''} class="mt-1 h-4 w-4 accent-forest"> <span>Anonymous. Shown as &ldquo;Shared anonymously&rdquo;.</span></label>
        <label class="flex items-start gap-3 text-sm text-ink-soft"><input type="radio" name="name_choice" value="custom" ${values.name_choice === 'custom' ? 'checked' : ''} class="mt-1 h-4 w-4 accent-forest"> <span>A name I choose, such as a first name, initials or a pen name.</span></label>
      </div>
      <p id="name-hint" class="sr-only">Choose anonymous or enter a name to show.</p>
    </fieldset>
    ${textField('display_name', 'Name to show (only if you chose a name above)', { values, errors, max: 60 })}
    ${textField('contact_email', 'Your email', { values, errors, type: 'email', max: 254, autocomplete: 'email', hint: 'Private. Never published. Lets us show you any edits first and lets you withdraw your story. You can also withdraw using the code we give you after submitting.' })}
    <div class="space-y-3 pt-2">
      <label class="flex items-start gap-3 text-sm text-ink-soft"><input type="checkbox" name="content_advisory" value="1" ${values.content_advisory ? 'checked' : ''} class="mt-1 h-4 w-4 accent-forest"> <span>This story may be distressing for some readers (a content advisory will be shown).</span></label>
      <label class="flex items-start gap-3 text-sm text-ink-soft"><input type="checkbox" name="consent_followup" value="1" ${values.consent_followup ? 'checked' : ''} class="mt-1 h-4 w-4 accent-forest"> <span>You may email me about adding a photograph, a video or other remembrance contribution. (Photos and videos are never uploaded through this form.)</span></label>
      <div><label class="flex items-start gap-3 text-sm text-ink-soft"><input type="checkbox" name="consent_publish" value="1" required ${values.consent_publish ? 'checked' : ''} class="mt-1 h-4 w-4 accent-forest" ${C.a11yInvalid(errors, 'consent_publish')}> <span><strong class="text-forest">I consent</strong> to Bloom reviewing my story and, if approved, publishing it on this website with the name I chose above. I understand that submitting does not guarantee publication, and that I can withdraw it later.</span></label>${C.fieldError(errors, 'consent_publish')}</div>
    </div>
    <p class="text-xs text-ink-faint">How we handle your information is explained in our <a href="/privacy" class="underline underline-offset-4">privacy notice</a>.</p>
    <button type="submit" class="btn-primary w-full sm:w-auto">Submit for review</button>
  </form>
  <p class="mt-6 text-sm text-ink-soft">Already shared a story and want it removed? <a href="/stories/withdraw" class="text-forest underline underline-offset-4">Withdraw your story</a>.</p>
</section>`;
  return { title: 'Share your story', description: 'Share your story of suicide loss, only if and when you wish. Private until reviewed, with control over how you are named.', path: '/stories/share', active: 'stories', body };
}

function shareDone({ code }) {
  const body = `
${C.pageHero({ eyebrow: 'Thank you', title: 'Your story has been received.', intro: 'It is private and waiting for a careful review. We will not publish it without your consent, and we may not be able to publish every submission.', glow: 'bg-sage/35' })}
<section class="max-w-2xl mx-auto px-4 sm:px-6 pb-20">
  <div class="card p-6 sm:p-8 mb-6"><h2 class="font-display text-xl text-forest mb-2">Your withdrawal code</h2><p class="text-sm text-ink-soft mb-4">Keep this code somewhere safe. It is shown only once and is the only way to withdraw your story if you did not give an email address.</p><p class="font-mono text-lg sm:text-xl tracking-wider bg-sand-deep rounded-xl px-4 py-3 text-forest break-all select-all" id="withdraw-code">${esc(code)}</p></div>
  ${C.safetyNotice()}
  <div class="mt-8 flex flex-col xs:flex-row gap-3"><a href="/stories" class="btn-secondary">Back to stories</a><a href="/resources" class="btn-secondary">Browse resources</a></div>
</section>`;
  return { title: 'Story received', path: '/stories/share', active: 'stories', body, noindex: true };
}

function withdraw({ error, done } = {}) {
  const body = `
${C.pageHero({ eyebrow: 'Withdraw a story', title: 'You can take your story back at any time.', intro: 'Enter the withdrawal code you received when you submitted. Your story is unpublished and its text and details are erased straight away.', glow: 'bg-clay/30' })}
<section class="max-w-xl mx-auto px-4 sm:px-6 pb-20">
  ${done ? `<div class="alert alert-ok mb-6" role="status">Your story has been withdrawn and its content erased. Thank you for telling us.</div>` : ''}
  ${error ? `<div class="alert alert-error mb-6" role="alert">${esc(error)}</div>` : ''}
  <form method="post" action="/stories/withdraw" class="bg-sand-deep/60 border border-sand-line rounded-3xl p-6 sm:p-8 space-y-5">
    <div><label for="code" class="field-label">Withdrawal code</label><input id="code" name="code" required autocomplete="off" spellcheck="false" class="field font-mono" maxlength="64"></div>
    <button class="btn-primary w-full">Withdraw my story</button>
  </form>
  <p class="mt-6 text-sm text-ink-soft">Lost your code? <a class="text-forest underline underline-offset-4" href="/contact">Contact us</a> from the email address you used and we will help.</p>
</section>`;
  return { title: 'Withdraw a story', path: '/stories/withdraw', active: 'stories', body, noindex: true };
}

function videoData(v) {
  const unavailable = v.status === 'unavailable' || (!v.src && !v.embedId);
  const idOk = /^[A-Za-z0-9_-]{5,32}$/.test(v.embedId || '');
  const type = ['youtube', 'vimeo', 'file'].includes(v.type) ? v.type : 'file';
  return {
    slug: v.slug, title: v.title, description: v.description || '', type, unavailable: unavailable || ((type === 'youtube' || type === 'vimeo') && !idOk),
    embedId: idOk ? v.embedId : '', src: type === 'file' ? v.src || '' : '', poster: v.poster || '', captions: v.captions || '', captionsLang: v.captionsLang || 'en',
    advisory: !!v.contentAdvisory, displayName: v.displayName || '',
  };
}

function videos() {
  const vs = content.videos();
  const body = `
${C.pageHero({ eyebrow: 'Video stories', title: 'Voices, and the people behind them.', intro: 'Video testimonies shared with consent. Captions are provided where available, and nothing loads from another website until you press play.', glow: 'bg-sage/35', extra: C.storiesSubnav('videos') })}
<section class="max-w-6xl mx-auto px-4 sm:px-6 md:px-10 pb-8"><div class="reveal">${C.advisory()}</div></section>
<section class="max-w-6xl mx-auto px-4 sm:px-6 md:px-10 py-10 sm:py-14" aria-labelledby="videos-list">
  <h2 id="videos-list" class="sr-only">Video stories</h2>
  ${vs.length ? `<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">${vs.map(C.videoCard).join('')}</div>
    <script type="application/json" id="video-data">${jsonForScript(vs.map(videoData))}</script>`
    : `<div class="reveal card p-8 sm:p-12 text-center max-w-2xl mx-auto"><h3 class="font-display text-xl sm:text-2xl text-forest mb-3">Video testimonies have not been added yet.</h3><p class="text-sm sm:text-base text-ink-soft leading-relaxed mb-6">Each video is shared with the contributor&rsquo;s consent, reviewed, and given captions where possible. If you would like to share a video, please get in touch. We will talk it through with you first.</p><a href="/contact" class="btn-primary">Get in touch about sharing a video</a></div>`}
</section>
<dialog id="video-dialog" class="bloom-dialog" aria-labelledby="video-dialog-title">
  <div class="min-h-full flex items-center justify-center p-3 sm:p-8" data-dialog-backdrop>
    <div class="bg-sand rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl">
      <div class="flex items-start justify-between gap-4 p-4 sm:p-5 border-b border-sand-line"><h2 id="video-dialog-title" class="font-display text-lg sm:text-xl text-forest"></h2><button type="button" class="btn-secondary btn-sm shrink-0" data-dialog-close>Close</button></div>
      <div class="bg-forest-deep"><div id="video-stage" class="aspect-video relative"></div></div>
      <div class="p-4 sm:p-5"><p id="video-dialog-desc" class="text-sm text-ink-soft leading-relaxed"></p><p id="video-dialog-advisory" class="hidden mt-3 text-sm text-ink"><strong>Content advisory.</strong> This video may include difficult material.</p></div>
    </div>
  </div>
</dialog>
<section class="max-w-5xl mx-auto px-4 sm:px-6 md:px-10 pb-16 sm:pb-24"><div class="reveal card p-6 sm:p-10 text-center"><h2 class="font-display text-xl sm:text-2xl text-forest mb-3">Would you like to share a video?</h2><p class="text-sm sm:text-base text-ink-soft max-w-xl mx-auto mb-6">Videos are never uploaded through the website. Get in touch and we will talk through consent, privacy, captions and how you would like to be named.</p><a href="/contact" class="btn-primary">Talk to us first</a></div></section>`;
  return { title: 'Video stories', description: 'Video stories and testimonies from people bereaved by suicide, shared with consent, captioned where available.', path: '/stories/videos', active: 'stories', body, scripts: ['/js/media.js'] };
}

function gallery() {
  const gs = content.gallery();
  const body = `
${C.pageHero({ eyebrow: 'Gallery', title: 'Remembering, in pictures and art.', intro: 'Photographs, artwork and remembrance contributions, shared with permission and chosen with care.', glow: 'bg-clay/30', extra: C.storiesSubnav('gallery') })}
<section class="max-w-6xl mx-auto px-4 sm:px-6 md:px-10 py-10 sm:py-14" aria-labelledby="gallery-list">
  <h2 id="gallery-list" class="sr-only">Gallery images</h2>
  ${gs.length ? `<div class="masonry">${gs.map(C.galleryItem).join('')}</div>
    <script type="application/json" id="gallery-data">${jsonForScript(gs.map((g) => ({ src: g.src, alt: g.alt, caption: g.caption || '', credit: g.credit || '' })))}</script>`
    : `<div class="reveal card p-8 sm:p-12 text-center max-w-2xl mx-auto"><h3 class="font-display text-xl sm:text-2xl text-forest mb-3">The gallery is being prepared.</h3><p class="text-sm sm:text-base text-ink-soft leading-relaxed mb-6">Images are added only with the permission of the person who made or owns them, and never include identifiable people without consent. To offer a photograph, artwork or remembrance, please get in touch. Images are not uploaded through the website.</p><a href="/contact" class="btn-primary">Offer an image</a></div>`}
</section>
<dialog id="lightbox" class="bloom-dialog" aria-label="Image viewer">
  <div class="min-h-full flex flex-col items-center justify-center p-3 sm:p-8" data-dialog-backdrop>
    <div class="w-full max-w-5xl flex justify-end mb-3"><button type="button" class="btn-light btn-sm" data-dialog-close>Close</button></div>
    <figure class="w-full max-w-5xl flex flex-col items-center"><img id="lightbox-img" src="" alt="" class="max-h-[70vh] w-auto max-w-full rounded-xl object-contain bg-sand-deep"><figcaption id="lightbox-cap" class="mt-4 text-sm text-sand text-center font-utility max-w-2xl"></figcaption></figure>
    <div class="mt-4 flex items-center gap-3"><button type="button" class="btn-ghost-light btn-sm" data-lightbox-prev>Previous</button><span id="lightbox-count" class="text-sand text-sm font-utility" aria-live="polite"></span><button type="button" class="btn-ghost-light btn-sm" data-lightbox-next>Next</button></div>
  </div>
</dialog>
<section class="max-w-5xl mx-auto px-4 sm:px-6 md:px-10 pb-16 sm:pb-24"><div class="reveal card p-6 sm:p-10"><h2 class="font-display text-xl sm:text-2xl text-forest mb-3">How images are added</h2><p class="text-sm sm:text-base text-ink-soft leading-relaxed">We invite photographs, artwork and remembrance contributions by email or through our contact form. Each is agreed with the contributor, checked for permission and given a description for people using screen readers before it is published here.</p></div></section>`;
  return { title: 'Gallery', description: 'A gallery of photographs, artwork and remembrance contributions shared with permission.', path: '/gallery', active: 'gallery', body, scripts: ['/js/media.js'] };
}

module.exports = { list, detail, share, shareDone, withdraw, videos, gallery, RELATIONSHIPS, jsonForScript };
