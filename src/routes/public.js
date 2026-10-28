'use strict';
const express = require('express');
const content = require('../content');
const config = require('../config');
const db = require('../db');
const sec = require('../security');
const mail = require('../mail');
const layout = require('../layout');
const payments = require('../payments');
const P = { home: require('../pages/home'), fw: require('../pages/framework'), st: require('../pages/stories'), rs: require('../pages/resources'), dn: require('../pages/donate'), s: require('../pages/static') };
const { isEmail, clean, randomId, sha256, nowIso } = require('../util');

const router = express.Router();
const send = (res, opts, status = 200) => res.status(status).type('html').send(layout.page(opts));

router.get('/', (req, res) => send(res, P.home()));
router.get('/approach', (req, res) => send(res, P.fw.approach()));
router.get('/services', (req, res) => send(res, P.fw.services()));
router.get('/journey', (req, res) => send(res, P.fw.journey()));
router.get('/about', (req, res) => send(res, P.fw.about()));
router.get('/get-help-now', (req, res) => send(res, P.s.getHelp()));
router.get('/privacy', (req, res) => send(res, P.s.privacy()));
router.get('/gallery', (req, res) => send(res, P.st.gallery()));
router.get('/resources', (req, res) => send(res, P.rs.list()));
router.get('/resources/:slug', (req, res, next) => { const r = content.resource(req.params.slug); return r && r.type === 'article' ? send(res, P.rs.detail(r)) : next(); });

/* ---------- Stories ---------- */
router.get('/stories', (req, res) => send(res, P.st.list(req.query)));
router.get('/stories/videos', (req, res) => send(res, P.st.videos()));
router.get('/stories/share', (req, res) => send(res, P.st.share({ token: sec.issueFormToken('story') })));
router.get('/stories/withdraw', (req, res) => send(res, P.st.withdraw()));
router.get('/stories/:slug', (req, res, next) => { const s = content.story(req.params.slug); return s ? send(res, P.st.detail(s)) : next(); });

router.post('/stories/share', sec.limits.forms(), (req, res) => {
  const b = req.body || {};
  if (sec.looksLikeBot(b)) return send(res, P.st.shareDone({ code: randomId(8) })); // silently drop bots
  const why = sec.checkFormToken(b._token, 'story');
  const redo = (errors, formError) => send(res, P.st.share({ values: b, errors, formError, token: sec.issueFormToken('story') }), 422);
  if (why) return redo({}, why === 'too-fast' ? 'That was very quick. Please take a moment and try submitting again.' : 'Your session expired. Please check your text is still here and submit again.');
  const errors = {};
  const title = clean(b.title, 120); const story = String(b.story || '').replace(/\u0000/g, '').trim().slice(0, 12000);
  if (title.length < 3) errors.title = 'Please give your story a short title.';
  if (story.length < 80) errors.story = 'Please write at least a few sentences.';
  if (b.consent_publish !== '1') errors.consent_publish = 'We need your consent to review and publish your story.';
  const email = clean(b.contact_email, 254).toLowerCase();
  if (email && !isEmail(email)) errors.contact_email = 'That email address does not look right.';
  const nameChoice = b.name_choice === 'custom' ? 'custom' : 'anonymous';
  const display = clean(b.display_name, 60);
  if (nameChoice === 'custom' && !display) errors.display_name = 'Please enter the name you would like shown, or choose anonymous.';
  if (Object.keys(errors).length) return redo(errors);
  const valid = new Set(content.categories().map((c) => c.slug));
  const cats = [].concat(b.categories || []).filter((c) => valid.has(c)).slice(0, 5);
  const rel = P.st.RELATIONSHIPS.some(([v]) => v === b.relationship) ? b.relationship : '';
  const code = `${randomId(4)}-${randomId(4)}-${randomId(4)}`.toUpperCase();
  db.get().prepare(`INSERT INTO story_submissions (public_id, withdraw_hash, title, body, categories, relationship, name_choice, display_name, contact_email, consent_publish, consent_followup, content_advisory, created_at)
    VALUES (?,?,?,?,?,?,?,?,?,1,?,?,?)`).run(randomId(12), sha256(code), title, story, JSON.stringify(cats), rel || null, nameChoice, nameChoice === 'custom' ? display : null, email || null, b.consent_followup === '1' ? 1 : 0, b.content_advisory === '1' ? 1 : 0, nowIso());
  mail.notify('New story submission awaiting review', `A story titled "${title}" was submitted. Review it at ${config.siteUrl}/admin/stories`);
  send(res, P.st.shareDone({ code }));
});

router.post('/stories/withdraw', sec.limits.withdraw(), (req, res) => {
  const code = clean(req.body?.code, 64).toUpperCase();
  const row = code ? db.get().prepare("SELECT id FROM story_submissions WHERE withdraw_hash = ? AND status != 'withdrawn'").get(sha256(code)) : null;
  if (!row) return send(res, P.st.withdraw({ error: 'We could not find a story with that code. Please check it and try again.' }), 404);
  // Unpublish and erase immediately (consent withdrawn). Only the id and timestamps remain.
  db.get().prepare("UPDATE story_submissions SET status='withdrawn', title='[withdrawn]', body='[withdrawn]', excerpt=NULL, display_name=NULL, contact_email=NULL, relationship=NULL, moderation_note=NULL, withdrawn_at=? WHERE id=?").run(nowIso(), row.id);
  send(res, P.st.withdraw({ done: true }));
});

/* ---------- Contact ---------- */
router.get('/contact', (req, res) => send(res, P.s.contact({ token: sec.issueFormToken('contact') })));
router.post('/contact', sec.limits.forms(), async (req, res) => {
  const b = req.body || {};
  if (sec.looksLikeBot(b)) return send(res, P.s.contact({ sent: true }));
  const redo = (errors, formError) => send(res, P.s.contact({ values: b, errors, formError, token: sec.issueFormToken('contact') }), 422);
  if (!P.s.contactReady()) return send(res, P.s.contact({ token: sec.issueFormToken('contact') }), 503);
  const why = sec.checkFormToken(b._token, 'contact');
  if (why) return redo({}, why === 'too-fast' ? 'That was very quick. Please try sending again.' : 'Your session expired. Please send again.');
  const errors = {};
  const name = clean(b.name, 100); const email = clean(b.email, 254).toLowerCase();
  const topic = P.s.TOPICS.includes(b.topic) ? b.topic : 'Something else';
  const message = String(b.message || '').replace(/\u0000/g, '').trim().slice(0, 4000);
  if (!name) errors.name = 'Please tell us your name.';
  if (!isEmail(email)) errors.email = 'Please enter a valid email address so we can reply.';
  if (b.accept_privacy !== 'on') errors.accept_privacy = 'Please confirm you have read the privacy notice.';
  if (Object.keys(errors).length) return redo(errors);
  const info = db.get().prepare('INSERT INTO contact_messages (name,email,topic,message,created_at) VALUES (?,?,?,?,?)').run(name, email, topic, message, nowIso());
  // Success is shown only after the message is safely stored.
  mail.notify('New message via the Bloom website', `From: ${name} <${email}>\nTopic: ${topic}\n\n${message}`).then((ok) => { if (ok) db.get().prepare('UPDATE contact_messages SET notified=1 WHERE id=?').run(info.lastInsertRowid); });
  send(res, P.s.contact({ sent: true }));
});

/* ---------- Donations ---------- */
router.get('/donate', (req, res) => send(res, P.dn.form({ token: sec.issueFormToken('donate') })));

router.post('/donate/checkout', sec.limits.checkout(), async (req, res) => {
  const b = req.body || {}; const wantsJson = /application\/json/.test(req.get('accept') || '');
  const fail = (errors, formError, status = 422) => wantsJson ? res.status(status).json({ errors, error: formError }) : send(res, P.dn.form({ values: b, errors, formError, token: sec.issueFormToken('donate') }), status);
  const st = payments.status();
  if (!st.enabled) return fail({}, 'Online giving is not open yet. Nothing has been charged.', 503);
  if (sec.looksLikeBot(b)) return fail({}, 'We could not process that request.', 400);
  const why = sec.checkFormToken(b._token, 'donate');
  if (why) return fail({}, why === 'too-fast' ? 'That was very quick. Please press the button again.' : 'Your session expired. Please check your details and try again.', 400);
  const v = payments.validateInput(b);
  if (v.errors) return fail(v.errors);
  try {
    const { checkoutUrl } = await payments.startCheckout(v.value);
    if (wantsJson) return res.json({ url: checkoutUrl });
    return send(res, P.dn.interstitial({ url: checkoutUrl, label: st.providerLabel }));
  } catch {
    return fail({}, 'We could not start the secure payment just now, and you have not been charged. Please try again in a few minutes.', 502);
  }
});

router.get('/donate/return', sec.limits.status(), async (req, res) => {
  const donation = payments.getByRef(req.query.ref);
  if (!donation) return send(res, P.dn.result(null), 404);
  const hint = req.query.cancelled === '1' || /^cancel/i.test(String(req.query.status || ''));
  const { donation: d, error } = await payments.verifyAndApply(donation, { userCancelledHint: hint });
  res.set('Cache-Control', 'no-store');
  send(res, P.dn.result(d, { error }));
});

router.get('/donate/status/:ref', sec.limits.status(), async (req, res) => {
  const d = payments.getByRef(req.params.ref);
  res.set('Cache-Control', 'no-store');
  if (!d) return res.status(404).json({ status: 'unknown' });
  const r = await payments.verifyAndApply(d);
  res.json({ status: r.donation.status });
});

module.exports = router;
