'use strict';
/**
 * Payment provider abstraction + donation lifecycle.
 *
 * Interface every provider implements (see flutterwave.js / paystack.js):
 *   name, label, supportsRecurring, missingConfig(), isConfigured(),
 *   createPlan({amountMinor,currency,interval}) -> planRef
 *   initialize({donation, callbackUrl, planRef, ...}) -> {checkoutUrl}
 *   verify(donation) -> {status, amountMinor, currency, providerTxnId, ...}   (server-to-server)
 *   verifyWebhook(rawBody, headers) -> boolean
 *   parseWebhook(jsonBody) -> {type, eventKey, reference, ...}
 *
 * To add a provider: copy paystack.js, implement the interface, register it in `providers` below.
 */
const config = require('../config');
const db = require('../db');
const content = require('../content');
const { randomId, nowIso } = require('../util');

const providers = { flutterwave: require('./flutterwave'), paystack: require('./paystack') };

function active() { return providers[config.payments.provider] || null; }

function currencyConfig() {
  const d = content.donations();
  const currencies = d.currencies || {};
  const def = (config.payments.defaultCurrency || d.defaultCurrency || Object.keys(currencies)[0] || 'KES').toUpperCase();
  return { currencies, defaultCurrency: currencies[def] ? def : Object.keys(currencies)[0], raw: d };
}

/** Public, safe-to-render state of the donation system. Never exposes any credential. */
function status() {
  const p = active();
  const { currencies, defaultCurrency } = currencyConfig();
  if (!p) return { enabled: false, reason: 'no-provider', missing: ['PAYMENT_PROVIDER'], currencies, defaultCurrency };
  const missing = p.missingConfig();
  if (missing.length) return { enabled: false, reason: 'missing-config', provider: p.name, missing, currencies, defaultCurrency };
  return {
    enabled: true, provider: p.name, providerLabel: p.label, currencies, defaultCurrency,
    recurring: config.payments.recurringEnabled && p.supportsRecurring,
  };
}

/** Validates user input for a donation. Returns {value} or {errors}. All amounts are re-validated server-side. */
function validateInput(input) {
  const { isEmail, clean } = require('../util');
  const st = status(); const errors = {};
  const currency = String(input.currency || st.defaultCurrency || '').toUpperCase();
  const cc = st.currencies[currency];
  if (!cc) errors.currency = 'Please choose a currency from the list.';
  const frequency = input.frequency === 'monthly' ? 'monthly' : 'one_time';
  if (frequency === 'monthly' && !st.recurring) errors.frequency = 'Monthly giving is not available yet.';

  let major = NaN;
  const choice = String(input.amount_choice || '');
  const rawAmount = choice === 'custom' ? input.custom_amount : choice;
  if (/^\d+(\.\d{1,2})?$/.test(String(rawAmount || '').trim())) major = Number(String(rawAmount).trim());
  if (!Number.isFinite(major) || major <= 0) errors.amount = 'Please choose or enter an amount.';
  else if (cc && major < cc.min) errors.amount = `The minimum donation is ${cc.min} ${currency}.`;
  else if (cc && major > cc.max) errors.amount = `For gifts above ${cc.max} ${currency}, please contact us so we can arrange it securely.`;

  const email = clean(input.email, 254).toLowerCase();
  if (!isEmail(email)) errors.email = 'Please enter a valid email address. Your payment provider needs it to send a receipt.';
  const name = clean(input.name, 100);
  const message = clean(input.message, 500);
  if (input.accept_privacy !== 'on' && input.accept_privacy !== '1') errors.accept_privacy = 'Please confirm that you have read how your details are used.';

  if (Object.keys(errors).length) return { errors };
  return { value: { currency, frequency, amountMinor: Math.round(major * 100), email, name: name || null, message: message || null, anonymous: input.anonymous === 'on' ? 1 : 0 } };
}

function createPending(v, provider) {
  const ref = `bloom_${randomId(16)}`;
  const t = nowIso();
  const info = db.get().prepare(`INSERT INTO donations (public_ref, provider, amount_minor, currency, frequency, status, donor_name, donor_email, anonymous_public, message, created_at, updated_at)
    VALUES (?,?,?,?,?,'pending',?,?,?,?,?,?)`).run(ref, provider, v.amountMinor, v.currency, v.frequency, v.name, v.email, v.anonymous, v.message, t, t);
  return getById(info.lastInsertRowid);
}

const getById = (id) => db.get().prepare('SELECT * FROM donations WHERE id = ?').get(id);
const getByRef = (ref) => db.get().prepare('SELECT * FROM donations WHERE public_ref = ?').get(String(ref || ''));

async function planFor(p, donation) {
  const row = db.get().prepare('SELECT plan_ref FROM payment_plans WHERE provider=? AND currency=? AND amount_minor=? AND interval=?').get(p.name, donation.currency, donation.amount_minor, 'monthly');
  if (row) return row.plan_ref;
  const planRef = await p.createPlan({ amountMinor: donation.amount_minor, currency: donation.currency, interval: 'monthly' });
  db.get().prepare('INSERT OR IGNORE INTO payment_plans (provider,currency,amount_minor,interval,plan_ref,created_at) VALUES (?,?,?,?,?,?)').run(p.name, donation.currency, donation.amount_minor, 'monthly', planRef, nowIso());
  return planRef;
}

/** Creates the pending record, asks the provider for a hosted-checkout URL and returns it. */
async function startCheckout(v) {
  const p = active();
  const donation = createPending(v, p.name);
  try {
    let planRef = null;
    if (donation.frequency === 'monthly') {
      planRef = await planFor(p, donation);
      db.get().prepare('UPDATE donations SET plan_ref=?, updated_at=? WHERE id=?').run(planRef, nowIso(), donation.id);
    }
    const callbackUrl = `${config.siteUrl}/donate/return?ref=${encodeURIComponent(donation.public_ref)}`;
    const site = content.site();
    const { checkoutUrl } = await p.initialize({
      donation, callbackUrl, planRef,
      title: site.brand?.name || 'Bloom',
      description: donation.frequency === 'monthly' ? 'Monthly gift supporting people bereaved by suicide' : 'Gift supporting people bereaved by suicide',
    });
    return { donation, checkoutUrl };
  } catch (e) {
    markFailed(donation.id, 'initialization_failed');
    console.error(`[payments] initialize failed for donation ${donation.id}: ${e.message}`);
    throw e;
  }
}

function markFailed(id, reason) {
  db.get().prepare("UPDATE donations SET status='failed', failure_reason=?, updated_at=? WHERE id=? AND status IN ('pending','cancelled')").run(reason, nowIso(), id);
}

/**
 * Applies an authoritative provider result to a donation. Idempotent: calling it repeatedly with the same
 * result never changes a settled donation twice. Success is only recorded when amount AND currency match.
 * Returns the updated donation row.
 */
function applyResult(donation, r) {
  const d = db.get();
  const t = nowIso();
  return d.transaction(() => {
    const cur = getById(donation.id);
    if (cur.status === 'refunded') return cur;
    if (r.status === 'successful') {
      if (cur.status === 'successful') return cur; // already recorded
      if (r.amountMinor !== cur.amount_minor || r.currency !== cur.currency) {
        d.prepare("UPDATE donations SET status='failed', failure_reason='amount_or_currency_mismatch', updated_at=? WHERE id=?").run(t, cur.id);
        console.error(`[payments] MISMATCH donation ${cur.id}: expected ${cur.amount_minor} ${cur.currency}, provider reported ${r.amountMinor} ${r.currency}. Review manually.`);
        return getById(cur.id);
      }
      try {
        d.prepare("UPDATE donations SET status='successful', provider_txn_id=COALESCE(?, provider_txn_id), plan_ref=COALESCE(plan_ref, ?), failure_reason=NULL, verified_at=?, updated_at=? WHERE id=?").run(r.providerTxnId, r.planRef || null, t, t, cur.id);
      } catch (e) {
        if (/UNIQUE/.test(e.message)) { // same provider transaction already attached to another record: don't double count
          console.error(`[payments] provider txn ${r.providerTxnId} already recorded; ignoring duplicate for donation ${cur.id}`);
          return getById(cur.id);
        }
        throw e;
      }
    } else if (r.status === 'failed') {
      if (cur.status === 'pending' || cur.status === 'cancelled') d.prepare("UPDATE donations SET status='failed', failure_reason=?, updated_at=? WHERE id=?").run((r.reason || 'payment_failed').slice(0, 200), t, cur.id);
    } else if (r.status === 'refunded') {
      if (cur.status === 'successful') d.prepare("UPDATE donations SET status='refunded', updated_at=? WHERE id=?").run(t, cur.id);
    }
    return getById(cur.id);
  })();
}

/** Browser came back from checkout (or someone polled): ask the provider what really happened. */
async function verifyAndApply(donation, { userCancelledHint = false } = {}) {
  const p = providers[donation.provider];
  if (!p || !p.isConfigured()) return { donation, error: 'not-configured' };
  if (donation.status === 'successful' || donation.status === 'refunded') return { donation };
  try {
    const r = await p.verify(donation);
    if (r.status === 'successful' || r.status === 'failed' || r.status === 'refunded') return { donation: applyResult(donation, r) };
    // abandoned / not_found / pending: only a user-cancel hint may move pending -> cancelled; a later webhook can still upgrade it.
    if ((r.status === 'abandoned' || r.status === 'not_found' || userCancelledHint) && userCancelledHint && donation.status === 'pending') {
      db.get().prepare("UPDATE donations SET status='cancelled', updated_at=? WHERE id=? AND status='pending'").run(nowIso(), donation.id);
    }
    return { donation: getById(donation.id) };
  } catch (e) {
    console.error(`[payments] verify error for donation ${donation.id}: ${e.message}`);
    return { donation: getById(donation.id), error: 'verify-unavailable' };
  }
}

/**
 * Webhook entry point. `rawBody` is the exact bytes received (needed for signature checks).
 * Returns {http, body}. 5xx makes the provider retry; everything else is final.
 */
async function handleWebhook(providerName, rawBody, headers) {
  const p = providers[providerName];
  if (!p || !p.isConfigured() || config.payments.provider !== providerName) return { http: 404, body: 'not enabled' };
  if (!p.verifyWebhook(rawBody, headers)) return { http: 401, body: 'invalid signature' };
  let json;
  try { json = JSON.parse(rawBody.toString('utf8')); } catch { return { http: 400, body: 'bad json' }; }
  const ev = p.parseWebhook(json);

  const ins = db.get().prepare('INSERT OR IGNORE INTO webhook_events (provider, event_key, received_at) VALUES (?,?,?)').run(providerName, ev.eventKey, nowIso());
  if (ins.changes === 0) return { http: 200, body: 'duplicate' };
  const done = (outcome, http = 200) => { db.get().prepare('UPDATE webhook_events SET outcome=? WHERE provider=? AND event_key=?').run(outcome, providerName, ev.eventKey); return { http, body: outcome }; };
  let donation = null;
  const undo = () => db.get().prepare('DELETE FROM webhook_events WHERE provider=? AND event_key=?').run(providerName, ev.eventKey);

  try {
    if (ev.type === 'other') return done('ignored');
    donation = ev.reference ? getByRef(ev.reference) : null;

    if (!donation && ev.type === 'charge' && ev.planRef && ev.customerEmail) {
      // Possible recurring renewal: a new charge for a plan we created, on a reference we have not seen.
      const parent = db.get().prepare("SELECT * FROM donations WHERE provider=? AND plan_ref=? AND lower(donor_email)=lower(?) AND parent_id IS NULL AND frequency='monthly' AND status='successful' ORDER BY id LIMIT 1").get(providerName, ev.planRef, ev.customerEmail);
      if (parent) {
        const ref = `bloom_${randomId(16)}`; const t = nowIso();
        const info = db.get().prepare(`INSERT INTO donations (public_ref, provider, amount_minor, currency, frequency, status, donor_name, donor_email, anonymous_public, plan_ref, parent_id, created_at, updated_at)
          VALUES (?,?,?,?,'monthly','pending',?,?,?,?,?,?,?)`).run(ref, providerName, parent.amount_minor, parent.currency, parent.donor_name, parent.donor_email, parent.anonymous_public, parent.plan_ref, parent.id, t, t);
        donation = getById(info.lastInsertRowid);
        // Renewal charges carry their own provider reference; verify it by that reference.
        donation.public_ref_for_verify = ev.reference;
      }
    }
    if (!donation) return done('unknown-reference');

    if (ev.type === 'charge') {
      const target = donation.public_ref_for_verify ? { ...donation, public_ref: donation.public_ref_for_verify } : donation;
      const r = await p.verify(target); // never trust the webhook payload alone
      const updated = applyResult(donation, r);
      return done(`charge:${updated.status}`);
    }
    if (ev.type === 'refund') {
      applyResult(donation, { status: 'refunded' });
      return done('refund');
    }
    return done('ignored');
  } catch (e) {
    console.error(`[payments] webhook processing error (${providerName}): ${e.message}`);
    if (typeof donation !== 'undefined' && donation && donation.public_ref_for_verify) {
      db.get().prepare("DELETE FROM donations WHERE id=? AND status='pending' AND parent_id IS NOT NULL").run(donation.id); // drop the half-created renewal row
    }
    undo(); // let the provider retry this event
    return { http: 500, body: 'retry' };
  }
}

module.exports = { providers, active, status, validateInput, startCheckout, verifyAndApply, handleWebhook, getByRef, applyResult, getById };
