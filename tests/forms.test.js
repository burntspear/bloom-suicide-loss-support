'use strict';
const test = require('node:test'); const assert = require('node:assert');
const { boot, post } = require('./helpers');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const token = async (base, path) => (await (await fetch(base + path)).text()).match(/name="_token" value="([^"]+)"/)?.[1];

test('contact form is switched off (no false success) when nothing can receive messages', async () => {
  const app = boot(); // no admin, no SMTP
  const html = await (await fetch(app.base + '/contact')).text();
  assert.match(html, /isn&rsquo;t connected yet/); assert.doesNotMatch(html, /<form method="post" action="\/contact"/);
  const r = await post(app.base, '/contact', { name: 'A', email: 'a@b.co', accept_privacy: 'on', _token: 'bad' });
  assert.strictEqual(r.status, 503); assert.doesNotMatch(await r.text(), /has been received/);
  await app.close();
});

test('contact form: validation, bot trap, and real persistence', async () => {
  const app = boot({ ADMIN_USERNAME: 'o', ADMIN_PASSWORD_HASH: 'scrypt$16384$8$1$aa$bb' });
  const t = await token(app.base, '/contact'); await wait(2700);
  let r = await post(app.base, '/contact', { _token: t, name: '', email: 'nope', accept_privacy: '' });
  assert.strictEqual(r.status, 422); let h = await r.text();
  assert.match(h, /Please tell us your name/); assert.match(h, /valid email/); assert.doesNotMatch(h, /has been received/);
  r = await post(app.base, '/contact', { _token: t, name: 'Sam <b>', email: 'sam@example.com', topic: 'Something else', message: 'Hello <script>x</script>', accept_privacy: 'on' });
  assert.strictEqual(r.status, 200); assert.match(await r.text(), /has been received/);
  const row = app.require('src/db').get().prepare('SELECT * FROM contact_messages').get();
  assert.strictEqual(row.email, 'sam@example.com');
  // too fast
  const t2 = await token(app.base, '/contact');
  r = await post(app.base, '/contact', { _token: t2, name: 'Q', email: 'q@example.com', accept_privacy: 'on' });
  assert.strictEqual(r.status, 422); assert.match(await r.text(), /very quick/);
  // honeypot: looks successful, stores nothing
  await post(app.base, '/contact', { website_url: 'http://spam', name: 'Bot', email: 'b@b.co' });
  assert.strictEqual(app.require('src/db').get().prepare('SELECT COUNT(*) c FROM contact_messages').get().c, 1);
  await app.close();
});

test('story submission: private until approved; withdrawal erases', async () => {
  const app = boot(); const db = app.require('src/db');
  const t = await token(app.base, '/stories/share'); await wait(2700);
  const longText = 'This is a test paragraph. '.repeat(10);
  let r = await post(app.base, '/stories/share', { _token: t, title: 'ab', story: 'short' });
  assert.strictEqual(r.status, 422);
  r = await post(app.base, '/stories/share', { _token: t, title: 'A test title', story: longText + '<img src=x onerror=alert(1)>', name_choice: 'anonymous', consent_publish: '1', contact_email: 'me@example.com' });
  assert.strictEqual(r.status, 200); const done = await r.text();
  const code = done.match(/id="withdraw-code">([^<]+)</)[1];
  const row = db.get().prepare('SELECT * FROM story_submissions').get();
  assert.strictEqual(row.status, 'pending');
  assert.ok(!(await (await fetch(app.base + '/stories')).text()).includes('A test title'), 'pending story must not be listed');
  assert.strictEqual((await fetch(app.base + '/stories/' + row.public_id)).status, 404);
  // simulate approval
  db.get().prepare("UPDATE story_submissions SET status='approved', slug='a-test-title', published_at=? WHERE id=?").run(new Date().toISOString(), row.id);
  const pub = await (await fetch(app.base + '/stories/a-test-title')).text();
  assert.match(pub, /A test title/); assert.doesNotMatch(pub, /<img src=x/); assert.match(pub, /&lt;img src=x/); assert.doesNotMatch(pub, /me@example\.com/);
  // withdraw
  r = await post(app.base, '/stories/withdraw', { code: 'WRONG' }); assert.strictEqual(r.status, 404);
  r = await post(app.base, '/stories/withdraw', { code }); assert.strictEqual(r.status, 200);
  assert.strictEqual((await fetch(app.base + '/stories/a-test-title')).status, 404);
  const w = db.get().prepare('SELECT * FROM story_submissions').get();
  assert.strictEqual(w.status, 'withdrawn'); assert.strictEqual(w.body, '[withdrawn]'); assert.strictEqual(w.contact_email, null);
  await app.close();
});

test('sample content only appears when enabled; empty states otherwise', async () => {
  let app = boot({ SHOW_SAMPLE_CONTENT: 'false' });
  let h = await (await fetch(app.base + '/stories')).text();
  assert.match(h, /Stories will be shared here/); assert.doesNotMatch(h, /Sample story/); await app.close();
  app = boot({ SHOW_SAMPLE_CONTENT: 'true' });
  h = await (await fetch(app.base + '/stories')).text();
  assert.match(h, /Sample story/); assert.match(h, /badge-sample/);
  assert.match(await (await fetch(app.base + '/stories/videos')).text(), /id="video-data"/);
  assert.match(await (await fetch(app.base + '/gallery')).text(), /id="gallery-data"/);
  await app.close();
});
