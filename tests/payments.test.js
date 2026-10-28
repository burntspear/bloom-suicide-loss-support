'use strict';
const test = require('node:test'); const assert = require('node:assert'); const crypto = require('crypto');
const { boot, mockProvider, post } = require('./helpers');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const token = async (base) => (await (await fetch(base + '/donate')).text()).match(/name="_token" value="([^"]+)"/)?.[1];
const base = { amount_choice: '1000', currency: 'KES', frequency: 'one_time', email: 'donor@example.com', name: 'Dee', accept_privacy: 'on' };

async function checkout(app, extra = {}) {
  const t = await token(app.base); await wait(2700);
  return post(app.base, '/donate/checkout', { ...base, ...extra, _token: t }, { accept: 'application/json' });
}

test('with no provider configured: checkout is refused and nothing is recorded', async () => {
  const app = boot();
  const page = await (await fetch(app.base + '/donate')).text();
  assert.match(page, /isn&rsquo;t open yet/); assert.match(page, /disabled aria-disabled="true"/);
  const r = await checkout(app); assert.strictEqual(r.status, 503);
  assert.strictEqual(app.require('src/db').get().prepare('SELECT COUNT(*) c FROM donations').get().c, 0);
  await app.close();
});

test('provider selected but credentials missing is treated as not configured', async () => {
  const app = boot({ PAYMENT_PROVIDER: 'paystack' });
  assert.strictEqual(app.require('src/payments').status().enabled, false);
  assert.strictEqual((await checkout(app)).status, 503);
  await app.close();
});

test('validation: amount limits, email, privacy consent, monthly when disabled', async () => {
  const mock = mockProvider(() => ({ json: {} }));
  const app = boot({ PAYMENT_PROVIDER: 'paystack', PAYSTACK_SECRET_KEY: 'sk_test_x', PAYSTACK_API_BASE: mock.base });
  const p = app.require('src/payments');
  assert.ok(p.validateInput(base).value);
  assert.ok(p.validateInput({ ...base, amount_choice: '5' }).errors.amount);          // below KES min
  assert.ok(p.validateInput({ ...base, amount_choice: 'custom', custom_amount: '1e9' }).errors.amount);
  assert.ok(p.validateInput({ ...base, amount_choice: 'custom', custom_amount: '-5' }).errors.amount);
  assert.strictEqual(p.validateInput({ ...base, amount_choice: 'custom', custom_amount: '250.50' }).value.amountMinor, 25050);
  assert.ok(p.validateInput({ ...base, currency: 'XXX' }).errors.currency);
  assert.ok(p.validateInput({ ...base, email: 'bad' }).errors.email);
  assert.ok(p.validateInput({ ...base, accept_privacy: '' }).errors.accept_privacy);
  assert.ok(p.validateInput({ ...base, frequency: 'monthly' }).errors.frequency);
  await app.close(); await mock.close();
});

test('Paystack: initialize -> unverified return is NOT success -> verified return succeeds -> repeat is idempotent', async () => {
  let verifyStatus = 'abandoned';
  const mock = mockProvider((c) => {
    if (c.url === '/transaction/initialize') return { json: { status: true, data: { authorization_url: 'https://checkout.paystack.com/abc' } } };
    if (c.url.startsWith('/transaction/verify/')) return { json: { status: true, data: { status: verifyStatus, amount: 100000, currency: 'KES', id: 555, reference: decodeURIComponent(c.url.split('/').pop()) } } };
  });
  const app = boot({ PAYMENT_PROVIDER: 'paystack', PAYSTACK_SECRET_KEY: 'sk_test_x', PAYSTACK_API_BASE: mock.base });
  const r = await checkout(app); assert.strictEqual(r.status, 200);
  assert.strictEqual((await r.json()).url, 'https://checkout.paystack.com/abc');
  const init = mock.calls.find((c) => c.url === '/transaction/initialize');
  assert.strictEqual(init.body.amount, 100000); assert.strictEqual(init.body.currency, 'KES');
  assert.strictEqual(init.headers.authorization, 'Bearer sk_test_x');
  const db = app.require('src/db').get(); const d = db.prepare('SELECT * FROM donations').get();
  assert.strictEqual(d.status, 'pending');
  assert.match(init.body.callback_url, /\/donate\/return\?ref=bloom_/);

  // Browser returns with "success" claims in the URL but provider says abandoned: must not show success.
  let page = await (await fetch(`${app.base}/donate/return?ref=${d.public_ref}&status=successful&trxref=${d.public_ref}`)).text();
  assert.doesNotMatch(page, /Your gift has been received/); assert.match(page, /waiting for confirmation/);
  assert.strictEqual(db.prepare('SELECT status FROM donations').get().status, 'pending');

  // Cancel hint moves pending -> cancelled only when provider has not confirmed
  page = await (await fetch(`${app.base}/donate/return?ref=${d.public_ref}&cancelled=1`)).text();
  assert.match(page, /cancelled/);

  verifyStatus = 'success';
  page = await (await fetch(`${app.base}/donate/return?ref=${d.public_ref}`)).text();
  assert.match(page, /Your gift has been received/);
  const row = db.prepare('SELECT * FROM donations').get();
  assert.strictEqual(row.status, 'successful'); assert.ok(row.verified_at); assert.strictEqual(row.provider_txn_id, '555');
  const again = await (await fetch(`${app.base}/donate/return?ref=${d.public_ref}`)).text();
  assert.match(again, /Your gift has been received/);
  assert.strictEqual(db.prepare("SELECT COUNT(*) c FROM donations WHERE status='successful'").get().c, 1);
  assert.strictEqual((await fetch(`${app.base}/donate/return?ref=nonsense`)).status, 404);
  await app.close(); await mock.close();
});

test('Paystack webhook: signature required, duplicates ignored, verified server-side, mismatch rejected', async () => {
  let amount = 100000;
  const mock = mockProvider((c) => {
    if (c.url === '/transaction/initialize') return { json: { status: true, data: { authorization_url: 'https://checkout.paystack.com/abc' } } };
    if (c.url.startsWith('/transaction/verify/')) return { json: { status: true, data: { status: 'success', amount, currency: 'KES', id: 777, reference: decodeURIComponent(c.url.split('/').pop()) } } };
  });
  const secret = 'sk_test_hookkey';
  const app = boot({ PAYMENT_PROVIDER: 'paystack', PAYSTACK_SECRET_KEY: secret, PAYSTACK_API_BASE: mock.base });
  await checkout(app);
  const db = app.require('src/db').get(); const d = db.prepare('SELECT * FROM donations').get();
  const body = JSON.stringify({ event: 'charge.success', data: { id: 777, reference: d.public_ref, amount: 100000, customer: { email: 'donor@example.com' } } });
  const sign = (b, k = secret) => crypto.createHmac('sha512', k).update(b).digest('hex');
  const send = (b, sig) => fetch(app.base + '/webhooks/paystack', { method: 'POST', headers: { 'content-type': 'application/json', 'x-paystack-signature': sig }, body: b });

  assert.strictEqual((await send(body, 'deadbeef')).status, 401);
  assert.strictEqual((await send(body, sign(body, 'wrong'))).status, 401);
  assert.strictEqual(db.prepare('SELECT status FROM donations').get().status, 'pending');

  amount = 5; // provider reports a different amount than we expected
  assert.strictEqual((await send(body, sign(body))).status, 200);
  let row = db.prepare('SELECT * FROM donations').get();
  assert.strictEqual(row.status, 'failed'); assert.strictEqual(row.failure_reason, 'amount_or_currency_mismatch');

  // fresh donation, correct amount
  amount = 100000; await checkout(app);
  const d2 = db.prepare('SELECT * FROM donations ORDER BY id DESC').get();
  const body2 = JSON.stringify({ event: 'charge.success', data: { id: 888, reference: d2.public_ref, customer: { email: 'donor@example.com' } } });
  assert.strictEqual((await send(body2, sign(body2))).status, 200);
  assert.strictEqual(db.prepare('SELECT status FROM donations WHERE id=?').get(d2.id).status, 'successful');
  const dup = await send(body2, sign(body2)); assert.strictEqual(await dup.text(), 'duplicate');
  assert.strictEqual(db.prepare("SELECT COUNT(*) c FROM donations WHERE status='successful'").get().c, 1);

  // refund event
  const rb = JSON.stringify({ event: 'refund.processed', data: { id: 9, transaction_reference: d2.public_ref } });
  assert.strictEqual((await send(rb, sign(rb))).status, 200);
  assert.strictEqual(db.prepare('SELECT status FROM donations WHERE id=?').get(d2.id).status, 'refunded');
  // unknown reference is acknowledged, not recorded
  const ub = JSON.stringify({ event: 'charge.success', data: { id: 1, reference: 'unknown' } });
  assert.strictEqual(await (await send(ub, sign(ub))).text(), 'unknown-reference');
  await app.close(); await mock.close();
});

test('webhook returns 5xx (so provider retries) when verification is unavailable, then succeeds on retry', async () => {
  let up = false;
  const mock = mockProvider((c) => {
    if (c.url === '/transaction/initialize') return { json: { status: true, data: { authorization_url: 'https://checkout.paystack.com/abc' } } };
    if (!up) return { status: 503, json: {} };
    return { json: { status: true, data: { status: 'success', amount: 100000, currency: 'KES', id: 31 } } };
  });
  const secret = 'sk_test_k'; const app = boot({ PAYMENT_PROVIDER: 'paystack', PAYSTACK_SECRET_KEY: secret, PAYSTACK_API_BASE: mock.base });
  await checkout(app); const d = app.require('src/db').get().prepare('SELECT * FROM donations').get();
  const b = JSON.stringify({ event: 'charge.success', data: { id: 31, reference: d.public_ref } });
  const h = { 'x-paystack-signature': crypto.createHmac('sha512', secret).update(b).digest('hex') };
  assert.strictEqual((await fetch(app.base + '/webhooks/paystack', { method: 'POST', headers: h, body: b })).status, 500);
  up = true;
  assert.strictEqual((await fetch(app.base + '/webhooks/paystack', { method: 'POST', headers: h, body: b })).status, 200);
  assert.strictEqual(app.require('src/db').get().prepare('SELECT status FROM donations').get().status, 'successful');
  await app.close(); await mock.close();
});

test('Flutterwave: initialize, verify by reference, verif-hash webhook, mismatch', async () => {
  let status = 'pending'; let amount = 1000;
  const mock = mockProvider((c) => {
    if (c.url === '/payments') return { json: { status: 'success', data: { link: 'https://checkout.flutterwave.com/v3/hosted/pay/xyz' } } };
    if (c.url.startsWith('/transactions/verify_by_reference')) return { json: { status: 'success', data: { status, amount, currency: 'KES', id: 4242, tx_ref: new URL('http://x' + c.url).searchParams.get('tx_ref') } } };
  });
  const app = boot({ PAYMENT_PROVIDER: 'flutterwave', FLW_SECRET_KEY: 'FLWSECK_TEST-x', FLW_WEBHOOK_SECRET_HASH: 'my-hash', FLW_API_BASE: mock.base });
  const r = await checkout(app); assert.match((await r.json()).url, /flutterwave\.com/);
  const init = mock.calls.find((c) => c.url === '/payments');
  assert.strictEqual(init.body.amount, 1000); assert.strictEqual(init.body.currency, 'KES'); assert.ok(init.body.tx_ref.startsWith('bloom_'));
  const db = app.require('src/db').get(); const d = db.prepare('SELECT * FROM donations').get();
  let page = await (await fetch(`${app.base}/donate/return?ref=${d.public_ref}&status=successful&tx_ref=${d.public_ref}&transaction_id=1`)).text();
  assert.doesNotMatch(page, /Your gift has been received/);
  const body = JSON.stringify({ event: 'charge.completed', data: { id: 4242, tx_ref: d.public_ref, status: 'successful' } });
  const send = (hash) => fetch(app.base + '/webhooks/flutterwave', { method: 'POST', headers: { 'verif-hash': hash, 'content-type': 'application/json' }, body });
  assert.strictEqual((await send('wrong')).status, 401);
  status = 'successful'; amount = 1; // wrong amount
  assert.strictEqual((await send('my-hash')).status, 200);
  assert.strictEqual(db.prepare('SELECT status FROM donations').get().status, 'failed');
  await app.close(); await mock.close();
});

test('recurring: monthly plan is created once and reused; payment uses the plan', async () => {
  let plans = 0;
  const mock = mockProvider((c) => {
    if (c.url === '/plan') { plans++; return { json: { status: true, data: { plan_code: 'PLN_abc' } } }; }
    if (c.url === '/transaction/initialize') return { json: { status: true, data: { authorization_url: 'https://checkout.paystack.com/r' } } };
  });
  const app = boot({ PAYMENT_PROVIDER: 'paystack', PAYSTACK_SECRET_KEY: 'sk_test_x', PAYSTACK_API_BASE: mock.base, RECURRING_ENABLED: 'true' });
  assert.ok((await (await fetch(app.base + '/donate')).text()).includes('id="freq-monthly" name="frequency" value="monthly"'));
  for (let i = 0; i < 2; i++) assert.strictEqual((await checkout(app, { frequency: 'monthly' })).status, 200);
  assert.strictEqual(plans, 1);
  const inits = mock.calls.filter((c) => c.url === '/transaction/initialize');
  assert.strictEqual(inits[1].body.plan, 'PLN_abc');
  const d = app.require('src/db').get().prepare('SELECT * FROM donations').get();
  assert.strictEqual(d.frequency, 'monthly'); assert.strictEqual(d.plan_ref, 'PLN_abc');
  await app.close(); await mock.close();
});

test('provider outage at checkout: donor sees an error, record is marked failed, no success shown', async () => {
  const mock = mockProvider(() => ({ status: 500, json: { message: 'boom' } }));
  const app = boot({ PAYMENT_PROVIDER: 'paystack', PAYSTACK_SECRET_KEY: 'sk_test_x', PAYSTACK_API_BASE: mock.base });
  const r = await checkout(app); assert.strictEqual(r.status, 502);
  assert.strictEqual(app.require('src/db').get().prepare('SELECT status FROM donations').get().status, 'failed');
  await app.close(); await mock.close();
});

test('secret keys never appear in any public page or static asset', async () => {
  const app = boot({ PAYMENT_PROVIDER: 'paystack', PAYSTACK_SECRET_KEY: 'sk_test_TOPSECRETVALUE', SESSION_SECRET: 'sessionsecret-TOPSECRETSESSION-xxxxxxxx' });
  for (const p of ['/', '/donate', '/contact', '/js/main.js', '/js/donate.js', '/css/site.css']) {
    const t = await (await fetch(app.base + p)).text();
    assert.ok(!t.includes('TOPSECRET'), p);
  }
  await app.close();
});
