'use strict';
const config = require('../config');
const { request } = require('./http');
const { safeEqual } = require('../util');

const cfg = () => config.payments.flutterwave;
const auth = () => ({ Authorization: `Bearer ${cfg().secretKey}` });
const major = (minor) => Math.round(minor) / 100; // Flutterwave takes amounts in major units

module.exports = {
  name: 'flutterwave',
  label: 'Flutterwave',
  supportsRecurring: true,

  missingConfig() {
    const m = [];
    if (!cfg().secretKey) m.push('FLW_SECRET_KEY');
    if (!cfg().webhookSecretHash) m.push('FLW_WEBHOOK_SECRET_HASH');
    return m;
  },
  isConfigured() { return this.missingConfig().length === 0; },

  async createPlan({ amountMinor, currency, interval }) {
    const r = await request('POST', `${cfg().apiBase}/payment-plans`, {
      headers: auth(),
      body: { amount: major(amountMinor), name: `Bloom ${interval} ${currency} ${major(amountMinor).toFixed(2)}`, interval, currency },
    });
    if (!r.ok || r.json?.status !== 'success' || !r.json.data?.id) throw new Error(`Flutterwave plan creation failed (${r.status}): ${r.json?.message || 'unknown error'}`);
    return String(r.json.data.id);
  },

  async initialize({ donation, callbackUrl, planRef, title, description }) {
    const body = {
      tx_ref: donation.public_ref,
      amount: major(donation.amount_minor),
      currency: donation.currency,
      redirect_url: callbackUrl,
      customer: { email: donation.donor_email, ...(donation.donor_name ? { name: donation.donor_name } : {}) },
      customizations: { title, description },
      meta: { donation_id: String(donation.id), frequency: donation.frequency },
    };
    if (planRef) body.payment_plan = Number(planRef);
    const r = await request('POST', `${cfg().apiBase}/payments`, { headers: auth(), body });
    const link = r.json?.data?.link;
    if (!r.ok || r.json?.status !== 'success' || !link) throw new Error(`Flutterwave initialize failed (${r.status}): ${r.json?.message || 'unknown error'}`);
    return { checkoutUrl: link };
  },

  async verify(donation) {
    const r = await request('GET', `${cfg().apiBase}/transactions/verify_by_reference?tx_ref=${encodeURIComponent(donation.public_ref)}`, { headers: auth() });
    if (r.status === 404 || /no transaction was found/i.test(r.json?.message || '')) return { status: 'not_found' };
    if (!r.ok || r.json?.status !== 'success' || !r.json.data) throw new Error(`Flutterwave verify failed (${r.status}): ${r.json?.message || 'unknown error'}`);
    const d = r.json.data;
    const s = String(d.status || '').toLowerCase();
    const status = s === 'successful' || s === 'completed' ? 'successful' : s === 'failed' ? 'failed' : s === 'cancelled' ? 'abandoned' : 'pending';
    return {
      status,
      amountMinor: Math.round(Number(d.amount) * 100),
      currency: String(d.currency || '').toUpperCase(),
      providerTxnId: d.id != null ? String(d.id) : null,
      reference: d.tx_ref,
      planRef: d.plan != null ? String(d.plan) : null,
      reason: d.processor_response || null,
    };
  },

  /** Flutterwave sends your configured "secret hash" in the verif-hash header. */
  verifyWebhook(_rawBody, headers) {
    const sig = headers['verif-hash'];
    if (!sig || !cfg().webhookSecretHash) return false;
    return safeEqual(sig, cfg().webhookSecretHash);
  },

  parseWebhook(body) {
    const ev = body?.event || body?.['event.type']; const d = body?.data || body || {};
    if (ev === 'charge.completed') return { type: 'charge', eventKey: `${ev}:${d.id ?? d.tx_ref}`, reference: d.tx_ref, customerEmail: d.customer?.email, planRef: d.payment_plan != null ? String(d.payment_plan) : null };
    return { type: 'other', eventKey: `${ev || 'unknown'}:${d.id ?? d.tx_ref ?? ''}` };
  },
};
