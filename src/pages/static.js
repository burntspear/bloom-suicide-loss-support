'use strict';
const content = require('../content');
const config = require('../config');
const C = require('../components');
const { esc, html } = require('../util');
const { HONEYPOT, adminConfigured } = require('../security');

const smtpReady = () => !!(config.smtp.host && config.smtp.from && config.smtp.notifyTo);
const contactReady = () => adminConfigured() || smtpReady();

const TOPICS = [
  'I would like to talk about individual support',
  'I have a question about services',
  'I would like to share a story, video, photo or artwork',
  'I want to support someone who has been bereaved',
  'A question about donating',
  'Something else',
];

function contact({ values = {}, errors = {}, token, formError, sent } = {}) {
  const site = content.site(); const c = site.contact || {};
  const ready = contactReady();
  const channels = [
    c.email && ['Email', `<a class="underline underline-offset-4" href="mailto:${esc(c.email)}">${esc(c.email)}</a>`, 'M4 5h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1zM3 8l9 6 9-6'],
    c.phone && ['Phone', `<a href="tel:${esc(c.phone.replace(/[^+\d]/g, ''))}">${esc(c.phone)}</a>`, 'M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z'],
    c.whatsapp && ['WhatsApp', `<a href="https://wa.me/${esc(c.whatsapp.replace(/\D/g, ''))}" rel="noopener noreferrer" target="_blank">${esc(c.whatsapp)}</a>`, 'M21 12a9 9 0 01-13.3 7.9L3 21l1.2-4.5A9 9 0 1121 12z'],
  ].filter(Boolean);
  const body = `
<section class="scene scene-light scene-vignette relative pt-28 pb-16 sm:pt-40 sm:pb-24 md:pt-48 md:pb-28">
  <div class="glow-blob w-56 h-56 sm:w-80 sm:h-80 bg-sage/35 -left-14 top-6" aria-hidden="true"></div>
  <div class="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 md:px-10 grid md:grid-cols-2 gap-10 sm:gap-16">
    <div class="reveal">
      <p class="eyebrow mb-4 sm:mb-5">A safe first step</p>
      <h1 class="font-display text-3xl sm:text-4xl md:text-5xl text-forest leading-tight mb-5 sm:mb-6">Reaching out is not a diagnosis. It is a conversation.</h1>
      <p class="text-sm sm:text-base text-ink-soft leading-relaxed mb-7">Your message is met with warmth, not assessment. We will briefly understand what you need, explain what is available, and help you move at a pace that feels right. ${esc(c.responseTime || '')}</p>
      ${channels.length ? `<div class="space-y-5 mt-8">${channels.map(([n, v, path]) => `<div class="flex gap-4"><span class="w-8 h-8 rounded-full bg-sage-soft/40 flex items-center justify-center flex-shrink-0 mt-0.5"><svg class="w-4 h-4 text-forest" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="${path}"/></svg></span><div><p class="font-display text-forest">${n}</p><p class="text-sm text-ink-soft break-all">${v}</p></div></div>`).join('')}</div>` : ''}
      ${c.hours ? `<p class="mt-5 text-sm text-ink-soft">${esc(c.hours)}</p>` : ''}
      <div class="mt-8 sm:mt-10">${C.safetyNotice()}</div>
    </div>
    <div class="reveal">
      ${sent ? `<div class="alert alert-ok" role="status" tabindex="-1" id="form-alert"><p class="font-display text-xl text-forest mb-2">Thank you. Your message has been received.</p><p>It has been saved securely and a person will read it. ${esc(c.responseTime || '')} If you are in danger right now, please do not wait for a reply. <a class="underline underline-offset-4" href="/get-help-now">See urgent support options</a>.</p></div>`
      : !ready ? `<div class="alert alert-warn" role="status"><p><strong>The contact form isn&rsquo;t connected yet.</strong> Your message could not be delivered, so we have switched the form off rather than let you believe it was sent. ${c.email ? `Please email <a class="underline underline-offset-4" href="mailto:${esc(c.email)}">${esc(c.email)}</a> instead.` : 'Please check back soon.'}</p>${!config.isProd ? '<p class="mt-3 text-xs"><strong>Site owner (not shown in production):</strong> set ADMIN_USERNAME and ADMIN_PASSWORD_HASH so messages can be read in /admin, and/or the SMTP_* settings for email notifications.</p>' : ''}</div>`
      : `${formError ? `<div class="alert alert-error mb-6" role="alert" tabindex="-1" id="form-alert">${esc(formError)}</div>` : ''}${!formError && Object.keys(errors).length ? '<div class="alert alert-error mb-6" role="alert" tabindex="-1" id="form-alert">Please check the highlighted fields below.</div>' : ''}
      <form method="post" action="/contact" class="bg-sand-deep/60 border border-sand-line rounded-3xl p-6 sm:p-8 md:p-10 space-y-5 sm:space-y-6" novalidate>
        <input type="hidden" name="_token" value="${esc(token)}">
        <div class="hidden" aria-hidden="true"><label>Leave this field empty <input type="text" name="${HONEYPOT}" tabindex="-1" autocomplete="off"></label></div>
        <div><label for="name" class="field-label">Your name</label><input id="name" name="name" required maxlength="100" autocomplete="name" class="field" value="${esc(values.name || '')}" ${C.a11yInvalid(errors, 'name')}>${C.fieldError(errors, 'name')}</div>
        <div><label for="email" class="field-label">Email address</label><input id="email" name="email" type="email" required maxlength="254" autocomplete="email" class="field" value="${esc(values.email || '')}" ${C.a11yInvalid(errors, 'email')}>${C.fieldError(errors, 'email')}</div>
        <div><label for="topic" class="field-label">What brings you here?</label><select id="topic" name="topic" class="field">${TOPICS.map((t) => `<option ${values.topic === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></div>
        <div><label for="message" class="field-label">A little about what&rsquo;s going on <span class="text-ink-faint">(optional)</span></label><textarea id="message" name="message" rows="5" maxlength="4000" class="field" placeholder="Share as much or as little as feels comfortable." ${C.a11yInvalid(errors, 'message')}>${esc(values.message || '')}</textarea>${C.fieldError(errors, 'message')}</div>
        <div><label class="flex items-start gap-3 text-sm text-ink-soft"><input type="checkbox" name="accept_privacy" required ${values.accept_privacy ? 'checked' : ''} class="mt-1 h-4 w-4 accent-forest" ${C.a11yInvalid(errors, 'accept_privacy')}> <span>I have read the <a href="/privacy" class="underline underline-offset-4 text-forest" target="_blank" rel="noopener">privacy notice</a> and am happy for Bloom to use these details to reply to me.</span></label>${C.fieldError(errors, 'accept_privacy')}</div>
        <button type="submit" class="btn-primary w-full justify-center">Send your message</button>
        <p class="text-xs text-ink-faint text-center">Please do not use this form for emergencies.</p>
      </form>`}
    </div>
  </div>
</section>`;
  return { title: 'Contact', description: 'Get in touch with Bloom. Ask a question, find out about support, or offer a story, video or image.', path: '/contact', active: 'contact', body };
}

function getHelp() {
  const cr = content.crisis();
  const verified = (cr.regions || []).map((r) => ({ ...r, contacts: (r.contacts || []).filter((x) => x.verified === true) })).filter((r) => r.contacts.length);
  const body = `
${C.pageHero({ eyebrow: 'Get help now', title: 'If you need urgent support, please reach out right now.', intro: cr.intro, glow: 'bg-clay/35' })}
<section class="max-w-4xl mx-auto px-4 sm:px-6 md:px-10 pb-16 sm:pb-24 space-y-8">
  <div class="alert alert-warn text-base" role="note"><p class="font-display text-xl text-forest mb-2">In immediate danger?</p><p>${esc(cr.emergencyNote)}</p></div>
  ${verified.map((r) => `<div class="reveal card p-6 sm:p-8"><h2 class="font-display text-xl sm:text-2xl text-forest mb-4">${esc(r.name)}</h2><ul class="space-y-5">${r.contacts.map((x) => `<li><p class="font-display text-lg text-forest">${esc(x.name)}</p><p class="text-base"><a class="underline underline-offset-4 text-forest" href="tel:${esc(String(x.phone).replace(/[^+\d]/g, ''))}">${esc(x.phone)}</a>${x.channels ? ` <span class="text-sm text-ink-soft">(${esc(x.channels)})</span>` : ''}</p>${x.hours ? `<p class="text-sm text-ink-soft">${esc(x.hours)}</p>` : ''}${x.note ? `<p class="text-sm text-ink-soft">${esc(x.note)}</p>` : ''}</li>`).join('')}</ul></div>`).join('')}
  <div class="reveal card p-6 sm:p-8"><h2 class="font-display text-xl sm:text-2xl text-forest mb-2">Find a helpline</h2><p class="text-sm text-ink-soft mb-4">${verified.length ? 'More places to look:' : 'These independent directories list free helplines. Please check opening hours and details with them directly.'}</p>
    <ul class="space-y-4">${(cr.directories || []).map((d) => `<li><a class="text-forest underline underline-offset-4 font-display text-lg" href="${esc(d.url)}" target="_blank" rel="noopener noreferrer">${esc(d.name)}<span class="sr-only"> (opens in a new tab)</span></a><p class="text-sm text-ink-soft">${esc(d.note || '')}</p></li>`).join('')}</ul></div>
  <div class="reveal card p-6 sm:p-8"><h2 class="font-display text-xl sm:text-2xl text-forest mb-3">If you are worried about someone else</h2><p class="text-sm sm:text-base text-ink-soft leading-relaxed">If someone may be in immediate danger, contact local emergency services. You can stay with them if it is safe to do so. If it is not an emergency, encourage them to speak to a doctor, counsellor or helpline, and offer to help them make the first contact.</p></div>
  <div class="reveal card p-6 sm:p-8"><h2 class="font-display text-xl sm:text-2xl text-forest mb-3">Bereavement support, not crisis support</h2><p class="text-sm sm:text-base text-ink-soft leading-relaxed">Bloom supports people grieving a suicide loss. We are not able to respond to emergencies, and messages sent through this website are not monitored around the clock. For ongoing support after loss, see <a class="text-forest underline underline-offset-4" href="/services">our services</a> and <a class="text-forest underline underline-offset-4" href="/resources">resources</a>.</p></div>
</section>`;
  return { title: 'Get help now', description: 'Urgent and crisis support information, and the difference between crisis support and bereavement support.', path: '/get-help-now', body };
}

function privacy() {
  const site = content.site(); const p = site.privacy || {}; const r = p.retention || {};
  const body = `
${C.pageHero({ eyebrow: 'Privacy', title: 'How we handle your information.', intro: 'We collect as little as we can, keep it private, and tell you plainly what happens to it.', glow: 'bg-sage/35' })}
<div class="max-w-3xl mx-auto px-4 sm:px-6 md:px-10 pb-20">
  ${p.legallyReviewed ? '' : '<div class="alert alert-warn mb-8" role="note"><strong>Draft notice.</strong> This privacy notice describes how this website works, but it has not yet been reviewed by a qualified legal adviser. It should not be treated as final until it has been.</div>'}
  <div class="prose-bloom">
    <h2>Who is responsible</h2>
    <p>${esc(p.controllerName || site.organisation?.legalName || site.brand.fullName)} runs this website${p.privacyContact || site.contact?.email ? `. You can contact us about your information at ${esc(p.privacyContact || site.contact.email)}` : ''}.</p>
    <h2>What we collect, and why</h2>
    <ul>
      <li><strong>Contact messages.</strong> Your name, email address, the topic you choose and anything you write. Used only to reply to you. Kept ${esc(r.contactMessages || 'for a limited time')}.</li>
      <li><strong>Story submissions.</strong> Your story, title, chosen display name, chosen themes, optional relationship and optional email. Stories stay private until a person has reviewed and approved them. Your email is never published. Kept ${esc(r.storySubmissions || 'until withdrawn')}. When you withdraw a story, its text and details are erased straight away.</li>
      <li><strong>Donations.</strong> Your email, optional name and message, the amount, currency, frequency and payment status. Card details are entered on our payment provider&rsquo;s secure page and are never seen or stored by us. Donation records are kept ${esc(r.donationRecords || 'as required by law')}.</li>
      <li><strong>Technical data.</strong> Our server may log technical details such as time and page requested, for security. These are kept ${esc(r.serverLogs || 'briefly')}. We do not use advertising or tracking cookies, and we do not run third-party analytics.</li>
    </ul>
    <h2>Who else sees it</h2>
    <ul>
      <li><strong>Payment provider.</strong> When you donate, you are sent to ${esc(({ flutterwave: 'Flutterwave', paystack: 'Paystack' })[config.payments.provider] || 'our payment provider')}, which processes your payment under its own privacy terms.</li>
      <li><strong>Videos.</strong> Some videos are hosted by other services such as YouTube or Vimeo. Nothing loads from them until you choose to play a video, and we ask for their reduced-tracking modes where available.</li>
      <li><strong>Email delivery.</strong> If email notifications are switched on, a mail service delivers notifications about new messages to Bloom staff.</li>
    </ul>
    <h2>Cookies</h2>
    <p>Visitors do not receive cookies. A strictly necessary sign-in cookie is used only by the people who administer the site.</p>
    <h2>Your choices</h2>
    <p>You can ask to see, correct or delete your information, or withdraw consent to a published story, at any time. Stories can be withdrawn instantly at <a href="/stories/withdraw">the withdrawal page</a>. For anything else, <a href="/contact">contact us</a>.</p>
    <h2>Safety and sensitive content</h2>
    <p>We understand that what people share with us is deeply personal. Only the small group of people who administer this site can read private submissions.</p>
  </div>
</div>`;
  return { title: 'Privacy', description: 'How Bloom handles your information: contact messages, story submissions, donations and cookies.', path: '/privacy', body };
}

function notFound() {
  const body = `<section class="max-w-xl mx-auto px-4 sm:px-6 pt-36 pb-24 text-center"><p class="eyebrow mb-4">404</p><h1 class="font-display text-3xl sm:text-4xl text-forest mb-4">We could not find that page.</h1><p class="text-ink-soft mb-8">It may have moved. Here are some places to start.</p><div class="flex flex-col xs:flex-row gap-3 justify-center"><a class="btn-primary" href="/">Home</a><a class="btn-secondary" href="/stories">Stories</a><a class="btn-secondary" href="/get-help-now">Get help now</a></div></section>`;
  return { title: 'Page not found', path: '/404', body, noindex: true };
}
function serverError() {
  const body = `<section class="max-w-xl mx-auto px-4 sm:px-6 pt-36 pb-24 text-center"><p class="eyebrow mb-4">Something went wrong</p><h1 class="font-display text-3xl sm:text-4xl text-forest mb-4">Sorry, that did not work.</h1><p class="text-ink-soft mb-8">Nothing you did caused this. Please try again in a moment. If you are in need of urgent support, please see <a class="underline text-forest" href="/get-help-now">this page</a>.</p><a class="btn-primary" href="/">Back to home</a></section>`;
  return { title: 'Something went wrong', path: '/error', body, noindex: true };
}

module.exports = { contact, getHelp, privacy, notFound, serverError, contactReady, smtpReady, TOPICS };
