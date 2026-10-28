'use strict';
const test = require('node:test'); const assert = require('node:assert');
const { boot, post } = require('./helpers');

test('form tokens: valid, too fast, tampered, expired', () => {
  const app = boot(); const s = app.require('src/security');
  const now = Date.now();
  const t = s.issueFormToken('contact', now - 5000);
  assert.strictEqual(s.checkFormToken(t, 'contact', now), null);
  assert.strictEqual(s.checkFormToken(s.issueFormToken('contact', now - 100), 'contact', now), 'too-fast');
  assert.strictEqual(s.checkFormToken(t, 'story', now), 'invalid'); // wrong purpose
  assert.strictEqual(s.checkFormToken(t.slice(0, -2) + 'aa', 'contact', now), 'invalid');
  assert.strictEqual(s.checkFormToken(s.issueFormToken('contact', now - 7 * 3600e3), 'contact', now), 'expired');
  assert.strictEqual(s.checkFormToken('', 'contact', now), 'missing');
  return app.close();
});

test('password hashing verifies only the right password', () => {
  const app = boot(); const s = app.require('src/security');
  const h = s.hashPassword('correct horse battery staple');
  assert.ok(s.verifyPassword('correct horse battery staple', h));
  assert.ok(!s.verifyPassword('wrong', h)); assert.ok(!s.verifyPassword('x', 'garbage'));
  return app.close();
});

test('security headers and CSP are set; no secrets or inline script', async () => {
  const app = boot({ PAYSTACK_SECRET_KEY: 'sk_test_SUPERSECRET' });
  const r = await fetch(app.base + '/'); const body = await r.text();
  const csp = r.headers.get('content-security-policy');
  assert.match(csp, /script-src 'self'/); assert.doesNotMatch(csp, /unsafe-inline/);
  assert.strictEqual(r.headers.get('x-content-type-options'), 'nosniff');
  assert.ok(!/<script>[^<]/.test(body.replace(/<script type="application\/json"[^>]*>[\s\S]*?<\/script>/g, '')), 'inline scripts present');
  assert.ok(!body.includes('SUPERSECRET'));
  await app.close();
});

test('admin pages require authentication', async () => {
  const app = boot();
  for (const p of ['/admin', '/admin/stories', '/admin/donations', '/admin/donations.csv', '/admin/messages']) {
    const r = await fetch(app.base + p, { redirect: 'manual' });
    assert.strictEqual(r.status, 303, p); assert.match(r.headers.get('location'), /\/admin\/login/);
  }
  const r = await post(app.base, '/admin/stories/1', { action: 'approve' });
  assert.strictEqual(r.status, 303);
  await app.close();
});

test('admin login, CSRF protection, and wrong password', async () => {
  const a0 = boot(); const hash = a0.require('src/security').hashPassword('a-long-admin-passphrase'); await a0.close();
  const app = boot({ ADMIN_USERNAME: 'owner', ADMIN_PASSWORD_HASH: hash });
  let r = await post(app.base, '/admin/login', { username: 'owner', password: 'nope' });
  assert.match(r.headers.get('location'), /e=1/);
  r = await post(app.base, '/admin/login', { username: 'owner', password: 'a-long-admin-passphrase' });
  assert.strictEqual(r.headers.get('location'), '/admin');
  const cookie = r.headers.get('set-cookie').split(';')[0];
  assert.match(r.headers.get('set-cookie'), /HttpOnly/); assert.match(r.headers.get('set-cookie'), /SameSite=Strict/);
  const page = await (await fetch(app.base + '/admin', { headers: { cookie } })).text();
  assert.match(page, /Overview/);
  r = await post(app.base, '/admin/stories/1', { action: 'delete' }, { cookie }); // no csrf token
  assert.strictEqual(r.status, 403);
  await app.close();
});

test('cross-site POSTs are blocked', async () => {
  const app = boot();
  const r = await post(app.base, '/contact', { name: 'x' }, { 'sec-fetch-site': 'cross-site' });
  assert.strictEqual(r.status, 403);
  await app.close();
});
