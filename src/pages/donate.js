'use strict';
const content = require('../content');
const config = require('../config');
const payments = require('../payments');
const C = require('../components');
const { esc, formatMoney } = require('../util');
const { HONEYPOT } = require('../security');

const jsonForScript = (o) => JSON.stringify(o).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');

function notReady(st) {
  const dev = !config.isProd;
  return `<div class="alert alert-warn mb-8" role="status">
    <p><strong>Online giving isn&rsquo;t open yet.</strong> Thank you for wanting to help. Card donations will be available here once our secure payment setup is complete, and nothing you do on this page will charge you or be recorded as a donation. Please check back soon${content.site().contact?.email ? ` or <a class="underline underline-offset-4" href="mailto:${esc(content.site().contact.email)}">email us</a>` : ' or <a class="underline underline-offset-4" href="/contact">get in touch</a>'}.</p>
    ${dev ? `<p class="mt-3 text-xs"><strong>For the site owner (only shown outside production):</strong> payments are disabled because ${st.reason === 'no-provider' ? 'PAYMENT_PROVIDER is not set to <code>flutterwave</code> or <code>paystack</code>' : `these settings are missing for ${esc(st.provider)}: <code>${esc(st.missing.join(', '))}</code>`}. See the README, "Payment setup".</p>` : ''}
  </div>`;
}

function form({ values = {}, errors = {}, token, formError }) {
  const st = payments.status();
  const d = st.defaultCurrency;
  const cur = (values.currency && st.currencies[values.currency]) ? values.currency : d;
  const cc = st.currencies[cur] || { suggested: [], min: 1 };
  const disabled = !st.enabled;
  const choice = values.amount_choice || (cc.suggested[1] ? String(cc.suggested[1]) : '');
  const freq = values.frequency === 'monthly' && st.recurring ? 'monthly' : 'one_time';
  const don = content.site().donations || {};
  const cfg = { currencies: Object.fromEntries(Object.entries(st.currencies).map(([k, v]) => [k, { symbol: v.symbol || k, suggested: v.suggested, min: v.min, max: v.max }])), recurring: !!st.recurring };

  const body = `
${C.pageHero({ eyebrow: 'Donate', title: 'Your gift helps someone find support after loss.', intro: 'Give once, or monthly where available. There are no countdowns, no pressure, and no guarantees of outcome, just a way to help keep this support open.', glow: 'bg-clay/35' })}
<section class="max-w-6xl mx-auto px-4 sm:px-6 md:px-10 pb-16 sm:pb-24">
  <div class="grid lg:grid-cols-5 gap-10 lg:gap-14">
    <div class="lg:col-span-3">
      ${disabled ? notReady(st) : ''}
      ${formError ? `<div class="alert alert-error mb-6" role="alert" tabindex="-1" id="form-alert">${esc(formError)}</div>` : ''}
      ${!formError && Object.keys(errors).length ? '<div class="alert alert-error mb-6" role="alert" tabindex="-1" id="form-alert">Please check the highlighted fields below.</div>' : ''}
      <form id="donation-form" method="post" action="/donate/checkout" class="bg-sand-deep/60 border border-sand-line rounded-3xl p-6 sm:p-8 md:p-10 space-y-7" novalidate data-donation-form>
        <input type="hidden" name="_token" value="${esc(token)}">
        <div class="hidden" aria-hidden="true"><label>Leave this field empty <input type="text" name="${HONEYPOT}" tabindex="-1" autocomplete="off"></label></div>

        <fieldset ${disabled ? 'disabled' : ''}><legend class="field-label !mb-3">How would you like to give?</legend>
          <div class="flex flex-wrap gap-3">
            <span><input class="pill-radio" type="radio" id="freq-once" name="frequency" value="one_time" ${freq === 'one_time' ? 'checked' : ''}><label class="pill-label" for="freq-once">Give once</label></span>
            <span><input class="pill-radio" type="radio" id="freq-monthly" name="frequency" value="monthly" ${freq === 'monthly' ? 'checked' : ''} ${st.recurring ? '' : 'disabled'}><label class="pill-label" for="freq-monthly">Give monthly</label></span>
          </div>
          ${st.recurring ? '<p class="text-xs text-ink-faint mt-3">Monthly gifts renew automatically until you cancel. You can cancel at any time by contacting us or through your payment provider.</p>' : '<p class="text-xs text-ink-faint mt-3">Monthly giving is not available yet.</p>'}
          ${C.fieldError(errors, 'frequency')}
        </fieldset>

        ${Object.keys(st.currencies).length > 1 ? `<div><label for="currency" class="field-label">Currency</label><select id="currency" name="currency" class="field sm:max-w-xs" ${disabled ? 'disabled' : ''} data-currency>${Object.keys(st.currencies).map((c) => `<option value="${esc(c)}" ${c === cur ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>${C.fieldError(errors, 'currency')}</div>` : `<input type="hidden" name="currency" value="${esc(cur)}">`}

        <fieldset ${disabled ? 'disabled' : ''} ${C.a11yInvalid(errors, 'amount')}><legend class="field-label !mb-3">Choose an amount</legend>
          <div class="flex flex-wrap gap-3" id="amount-pills" data-pills>
            ${cc.suggested.map((a, i) => `<span><input class="pill-radio" type="radio" id="amt-${i}" name="amount_choice" value="${a}" ${choice === String(a) ? 'checked' : ''}><label class="pill-label" for="amt-${i}">${esc(formatMoney(a * 100, cur))}</label></span>`).join('')}
            <span><input class="pill-radio" type="radio" id="amt-custom" name="amount_choice" value="custom" ${choice === 'custom' ? 'checked' : ''}><label class="pill-label" for="amt-custom">Other amount</label></span>
          </div>
          <div class="mt-4 ${choice === 'custom' ? '' : 'hidden'}" id="custom-wrap"><label for="custom_amount" class="field-label">Your amount (<span data-cur-label>${esc(cur)}</span>)</label><input id="custom_amount" name="custom_amount" inputmode="decimal" autocomplete="off" pattern="[0-9]*[.]?[0-9]{0,2}" class="field sm:max-w-xs" value="${esc(values.custom_amount || '')}"></div>
          ${C.fieldError(errors, 'amount')}
        </fieldset>

        <div class="grid sm:grid-cols-2 gap-5">
          <div><label for="name" class="field-label">Your name <span class="text-ink-faint">(optional)</span></label><input id="name" name="name" autocomplete="name" maxlength="100" class="field" value="${esc(values.name || '')}" ${disabled ? 'disabled' : ''}></div>
          <div><label for="email" class="field-label">Email for your receipt</label><input id="email" name="email" type="email" required autocomplete="email" maxlength="254" class="field" value="${esc(values.email || '')}" ${C.a11yInvalid(errors, 'email')} ${disabled ? 'disabled' : ''}>${C.fieldError(errors, 'email')}</div>
        </div>
        <div><label for="message" class="field-label">A message of encouragement <span class="text-ink-faint">(optional, private)</span></label><textarea id="message" name="message" rows="3" maxlength="500" class="field" ${disabled ? 'disabled' : ''}>${esc(values.message || '')}</textarea></div>
        <div class="space-y-3">
          <label class="flex items-start gap-3 text-sm text-ink-soft"><input type="checkbox" name="anonymous" ${values.anonymous ? 'checked' : ''} class="mt-1 h-4 w-4 accent-forest" ${disabled ? 'disabled' : ''}> <span>Keep my name private. (Bloom does not publish donor names at present. This records your preference.)</span></label>
          <div><label class="flex items-start gap-3 text-sm text-ink-soft"><input type="checkbox" name="accept_privacy" required ${values.accept_privacy ? 'checked' : ''} class="mt-1 h-4 w-4 accent-forest" ${C.a11yInvalid(errors, 'accept_privacy')} ${disabled ? 'disabled' : ''}> <span>I have read the <a href="/privacy" class="underline underline-offset-4 text-forest" target="_blank" rel="noopener">privacy notice</a> and understand how my details are used.</span></label>${C.fieldError(errors, 'accept_privacy')}</div>
        </div>

        <div class="rounded-2xl bg-sand border border-sand-line p-5" aria-live="polite" id="donation-summary" data-summary>
          <p class="font-utility text-[11px] tracking-eyebrow uppercase text-ink-faint mb-2">Summary</p>
          <p class="font-display text-xl sm:text-2xl text-forest" data-summary-text>Choose an amount to see your summary.</p>
          <p class="text-xs text-ink-faint mt-2">You will be taken to ${st.enabled ? esc(st.providerLabel) + '&rsquo;s' : 'our payment provider&rsquo;s'} secure page to pay by card or other available methods. Bloom never sees or stores your card details.</p>
        </div>
        <button type="submit" class="btn-primary w-full sm:w-auto" ${disabled ? 'disabled aria-disabled="true"' : ''} data-submit>Continue to secure payment</button>
        ${disabled ? '<p class="text-sm text-ink-soft">The button will become available once online giving is switched on.</p>' : ''}
      </form>
      <script type="application/json" id="donation-config">${jsonForScript(cfg)}</script>
    </div>
    <aside class="lg:col-span-2 space-y-6">
      <div class="card p-6 sm:p-8"><h2 class="font-display text-xl text-forest mb-4">Where your gift goes</h2>
        <ul class="space-y-4">${(don.howGiftsAreUsed || []).map((x) => `<li><p class="font-display text-forest">${esc(x.title)}</p><p class="text-sm text-ink-soft leading-relaxed">${esc(x.text)}</p></li>`).join('')}</ul>
        <p class="mt-5 text-xs text-ink-faint leading-relaxed">${esc(don.usesStatement || '')}</p>
        ${don.needsConfirmation ? '<p class="mt-3 text-xs text-ink-faint">Bloom has not stated a charitable or tax-exempt status. Donations are gifts and may not be tax-deductible.</p>' : ''}
      </div>
      <div class="card p-6 sm:p-8"><h2 class="font-display text-xl text-forest mb-3">Prefer to give another way?</h2><p class="text-sm text-ink-soft leading-relaxed">If a card payment is not possible for you, or you would like to give in a different way, please <a class="underline underline-offset-4 text-forest" href="/contact">get in touch</a>.</p></div>
      ${C.safetyNotice()}
    </aside>
  </div>
</section>`;
  return { title: 'Donate', description: 'Support people bereaved by suicide with a one-time or monthly gift. Secure checkout through our payment provider.', path: '/donate', active: 'donate', body, scripts: ['/js/donate.js'] };
}

function interstitial({ url, label }) {
  const body = `
<section class="max-w-xl mx-auto px-4 sm:px-6 pt-36 pb-24 text-center">
  <h1 class="font-display text-3xl text-forest mb-4">Taking you to secure payment&hellip;</h1>
  <p class="text-ink-soft mb-8">You are being sent to ${esc(label)}&rsquo;s secure checkout. If nothing happens within a few seconds, use the button below.</p>
  <a class="btn-primary" href="${esc(url)}" rel="noopener">Continue to secure payment</a>
</section>`;
  return { title: 'Redirecting to payment', path: '/donate/checkout', active: 'donate', body, noindex: true, meta: `<meta http-equiv="refresh" content="1;url=${esc(url)}">` };
}

/** Result page. Only a server-verified 'successful' donation ever shows the thank-you message. */
function result(donation, { error } = {}) {
  const amt = donation ? formatMoney(donation.amount_minor, donation.currency) : '';
  const monthly = donation && donation.frequency === 'monthly';
  const states = {
    successful: { tone: 'ok', title: 'Thank you. Your gift has been received.', text: `We have confirmed your ${monthly ? 'monthly ' : ''}gift of ${amt} with our payment provider. A receipt should reach the email address you gave. ${monthly ? 'To change or cancel your monthly gift at any time, please contact us.' : ''}` },
    pending: { tone: 'info', title: 'We are waiting for confirmation.', text: 'Your payment provider has not confirmed this payment yet. This can take a few minutes. We will only record your gift once it is confirmed, and you have not been charged twice. You can refresh this page in a moment.' },
    failed: { tone: 'error', title: 'The payment did not go through.', text: 'No donation has been recorded. Your bank or the payment provider may have declined it. You can try again or use a different method.' },
    cancelled: { tone: 'warn', title: 'The payment was cancelled.', text: 'No donation has been recorded and nothing has been taken. You are welcome to try again whenever you like.' },
    refunded: { tone: 'info', title: 'This gift was refunded.', text: 'This donation has been refunded.' },
    unknown: { tone: 'warn', title: 'We could not find that donation.', text: 'The link may be incorrect or may have expired.' },
  };
  const key = !donation ? 'unknown' : donation.status;
  const s = states[key] || states.unknown;
  const body = `
${C.pageHero({ eyebrow: 'Donation', title: s.title, glow: 'bg-sage/40' })}
<section class="max-w-2xl mx-auto px-4 sm:px-6 pb-20 space-y-6">
  <div class="alert alert-${s.tone}" role="status">${esc(s.text)}${error === 'verify-unavailable' ? ' We could not reach the payment provider just now to double-check, so please refresh in a minute.' : ''}</div>
  ${donation && key === 'successful' ? `<div class="card p-6"><p class="text-sm text-ink-soft">Reference: <span class="font-mono text-forest">${esc(donation.public_ref)}</span></p></div>` : ''}
  <div class="flex flex-col xs:flex-row gap-3">
    ${['pending'].includes(key) ? '<a class="btn-primary" href="" data-refresh>Check again</a>' : ''}
    ${['failed', 'cancelled', 'unknown'].includes(key) ? '<a class="btn-primary" href="/donate">Try again</a>' : ''}
    <a class="btn-secondary" href="/">Back to home</a><a class="btn-secondary" href="/stories">Read stories</a>
  </div>
</section>`;
  return { title: 'Donation status', path: '/donate/return', active: 'donate', body, noindex: true, scripts: key === 'pending' ? ['/js/donate.js'] : [] };
}

module.exports = { form, interstitial, result };
