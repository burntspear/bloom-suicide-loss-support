'use strict';
const crypto = require('crypto');
const config = require('../config');
const { request } = require('./http');
const { safeEqual } = require('../util');

const cfg = () => config.payments.paystack;
const auth = () => ({ Authorization: `Bearer ${cfg().secretKey}` });

module.exports = {
  name: 'paystack',
  label: 'Paystack',
  supportsRecurring: true,

  missingConfig() { return cfg().secretKey ? [] : ['PAYSTACK_SECRET_KEY']; },
  isConfigured() { return this.missingConfig().length === 0; },

  /** Paystack plans are created on demand per amount/currency/interval; the caller caches plan codes. */
  async createPlan({ amountMinor, currency, interval }) {
    const r = await request('POST', `${cfg().apiBase}/plan`, {
      headers: auth(),
      body: { name: `Bloom ${interval} ${currency} ${(amountMinor / 100).toFixed(2)}`, interval, amount: amountMinor, currency },
    });
    if (!r.ok || !r.json?.status || !r.json.data?.plan_code) throw new Error(`Paystack plan creation failed (${r.status}): ${r.json?.message || 'unknown error'}`);
    return r.json.data.plan_code;
  },

  async initialize({ donation, callbackUrl, planRef }) {
    const body = {
      email: donation.donor_email,
      amount: donation.amount_minor,
      currency: donation.currency,
      reference: donation.public_ref,
      callback_url: callbackUrl,
      metadata: { donation_id: donation.id, frequency: donation.frequency, source: 'bloom-website' },
    };
    if (planRef) body.plan = planRef;
    const r = await request('POST', `${cfg().apiBase}/transaction/initialize`, { headers: auth(), body });
    const url = r.json?.data?.authorization_url;
    if (!r.ok || !r.json?.status || !url) throw new Error(`Paystack initialize failed (${r.status}): ${r.json?.message || 'unknown error'}`);
    return { checkoutUrl: url };
  },

  /** Authoritative server-to-server check. Never trust the browser redirect. */
  async verify(donation) {
    const r = await request('GET', `${cfg().apiBase}/transaction/verify/${encodeURIComponent(donation.public_ref)}`, { headers: auth() });
    if (r.status === 404 || (r.status === 400 && /not found/i.test(r.json?.message || ''))) return { status: 'not_found' };
    if (!r.ok || !r.json?.status || !r.json.data) throw new Error(`Paystack verify failed (${r.status}): ${r.json?.message || 'unknown error'}`);
    const d = r.json.data;
    const map = { success: 'successful', failed: 'failed', abandoned: 'abandoned', reversed: 'refunded', ongoing: 'pending', pending: 'pending', processing: 'pending', queued: 'pending' };
    return {
      status: map[d.status] || 'pending',
      amountMinor: Number(d.amount),
      currency: String(d.currency || '').toUpperCase(),
      providerTxnId: d.id != null ? String(d.id) : null,
      reference: d.reference,
      planRef: d.plan_object?.plan_code || (typeof d.plan === 'string' ? d.plan : null),
      reason: d.gateway_response || null,
    };
  },

  /** x-paystack-signature = HMAC-SHA512 of the raw request body using the secret key. */
  verifyWebhook(rawBody, headers) {
    const sig = headers['x-paystack-signature'];
    if (!sig || !cfg().secretKey || !rawBody) return false;
    const expected = crypto.createHmac('sha512', cfg().secretKey).update(rawBody).digest('hex');
    return safeEqual(sig, expected);
  },

  parseWebhook(body) {
    const ev = body?.event; const d = body?.data || {};
    if (ev === 'charge.success') return { type: 'charge', eventKey: `${ev}:${d.id ?? d.reference}`, reference: d.reference, customerEmail: d.customer?.email, planRef: d.plan?.plan_code || null };
    if (ev === 'refund.processed') return { type: 'refund', eventKey: `${ev}:${d.id ?? d.transaction_reference}`, reference: d.transaction_reference || d.reference };
    return { type: 'other', eventKey: `${ev || 'unknown'}:${d.id ?? d.reference ?? d.subscription_code ?? ''}` };
  },
};
