'use strict';
const express = require('express');
const db = require('../db');
const config = require('../config');
const sec = require('../security');
const content = require('../content');
const layout = require('../layout');
const payments = require('../payments');
const { esc, formatDate, formatMoney, nowIso, clean, paragraphs } = require('../util');

const router = express.Router();
const wrap = (req, title, inner) => layout.page({ title: `Admin: ${title}`, path: '/admin', noindex: true, body: `
<section class="max-w-6xl mx-auto px-4 sm:px-6 md:px-10 pt-28 sm:pt-36 pb-20">
  ${req.admin ? `<nav aria-label="Admin" class="flex flex-wrap gap-2 items-center mb-8">${[['/admin', 'Overview'], ['/admin/stories', 'Stories'], ['/admin/donations', 'Donations'], ['/admin/messages', 'Messages']].map(([h, l]) => `<a class="chip !px-4 !py-2" href="${h}">${l}</a>`).join('')}
    <form method="post" action="/admin/logout" class="ml-auto"><input type="hidden" name="_csrf" value="${esc(req.admin.csrf)}"><button class="btn-secondary btn-sm">Sign out</button></form></nav>` : ''}
  <h1 class="font-display text-3xl text-forest mb-6">${esc(title)}</h1>${inner}
</section>` });
const csrf = (req) => `<input type="hidden" name="_csrf" value="${esc(req.admin.csrf)}">`;
const ok = (res, html) => res.type('html').set('Cache-Control', 'no-store').send(html);

router.get('/login', (req, res) => {
  const configured = sec.adminConfigured();
  ok(res, wrap({}, 'Sign in', `${!configured ? '<div class="alert alert-warn mb-6">Admin sign-in is not configured. Set ADMIN_USERNAME and ADMIN_PASSWORD_HASH (see README).</div>' : ''}
  ${req.query.e ? '<div class="alert alert-error mb-6" role="alert">Those details were not recognised.</div>' : ''}
  <form method="post" action="/admin/login" class="max-w-sm space-y-5 card p-6"><div><label class="field-label" for="u">Username</label><input class="field" id="u" name="username" autocomplete="username" required></div><div><label class="field-label" for="p">Password</label><input class="field" id="p" name="password" type="password" autocomplete="current-password" required></div><button class="btn-primary w-full" ${configured ? '' : 'disabled'}>Sign in</button></form>`));
});
router.post('/login', sec.limits.login(), (req, res) => {
  const s = sec.login(clean(req.body?.username, 100), String(req.body?.password || '').slice(0, 200));
  if (!s) return res.redirect(303, '/admin/login?e=1');
  sec.setAdminCookie(res, s.token);
  res.redirect(303, '/admin');
});
router.post('/logout', sec.requireAdmin, (req, res) => { sec.destroySession(req); sec.clearAdminCookie(res); res.redirect(303, '/admin/login'); });

router.use(sec.requireAdmin);

router.get('/', (req, res) => {
  const d = db.get();
  const n = (sql) => d.prepare(sql).get().c;
  const totals = d.prepare("SELECT currency, SUM(amount_minor) t, COUNT(*) c FROM donations WHERE status='successful' GROUP BY currency").all();
  ok(res, wrap(req, 'Overview', `<div class="grid sm:grid-cols-3 gap-5">
    <a class="card card-hover p-6" href="/admin/stories?status=pending"><p class="text-sm text-ink-soft">Stories awaiting review</p><p class="font-display text-3xl text-forest">${n("SELECT COUNT(*) c FROM story_submissions WHERE status='pending'")}</p></a>
    <a class="card card-hover p-6" href="/admin/messages"><p class="text-sm text-ink-soft">New messages</p><p class="font-display text-3xl text-forest">${n("SELECT COUNT(*) c FROM contact_messages WHERE status='new'")}</p></a>
    <a class="card card-hover p-6" href="/admin/donations"><p class="text-sm text-ink-soft">Verified donations</p><p class="font-display text-3xl text-forest">${n("SELECT COUNT(*) c FROM donations WHERE status='successful'")}</p>${totals.map((t) => `<p class="text-xs text-ink-soft">${esc(formatMoney(t.t, t.currency))}</p>`).join('')}</a></div>
    <p class="mt-6 text-xs text-ink-faint">Totals are for your records only and are not shown publicly.</p>`));
});

/* ----- Stories moderation ----- */
router.get('/stories', (req, res) => {
  const status = ['pending', 'approved', 'rejected', 'withdrawn'].includes(req.query.status) ? req.query.status : 'pending';
  const rows = db.get().prepare('SELECT id,title,status,created_at,name_choice,display_name FROM story_submissions WHERE status=? ORDER BY created_at DESC LIMIT 200').all(status);
  ok(res, wrap(req, 'Stories', `<nav class="flex gap-2 mb-6" aria-label="Status">${['pending', 'approved', 'rejected', 'withdrawn'].map((s) => `<a class="chip" href="/admin/stories?status=${s}" ${s === status ? 'aria-current="true"' : ''}>${s}</a>`).join('')}</nav>
    ${rows.length ? `<ul class="space-y-3">${rows.map((r) => `<li class="card p-4 flex justify-between gap-4"><a class="text-forest underline underline-offset-4" href="/admin/stories/${r.id}">${esc(r.title)}</a><span class="text-sm text-ink-soft">${esc(formatDate(r.created_at))}</span></li>`).join('')}</ul>` : '<p class="text-ink-soft">Nothing here.</p>'}`));
});
router.get('/stories/:id', (req, res, next) => {
  const r = db.get().prepare('SELECT * FROM story_submissions WHERE id=?').get(+req.params.id);
  if (!r) return next();
  ok(res, wrap(req, `Story: ${r.title}`, `<div class="grid lg:grid-cols-5 gap-8"><div class="lg:col-span-3 card p-6"><p class="text-sm text-ink-soft mb-4">Status: <strong>${esc(r.status)}</strong> &middot; Submitted ${esc(formatDate(r.created_at))}${r.content_advisory ? ' &middot; contributor flagged a content advisory' : ''}</p><div class="prose-bloom">${paragraphs(r.body)}</div></div>
    <form method="post" action="/admin/stories/${r.id}" class="lg:col-span-2 card p-6 space-y-4">${csrf(req)}
      <p class="text-sm text-ink-soft">Private contact: ${r.contact_email ? esc(r.contact_email) : 'none given'} &middot; Follow-up OK: ${r.consent_followup ? 'yes' : 'no'}</p>
      <div><label class="field-label" for="t">Title (public)</label><input id="t" name="title" class="field" value="${esc(r.title)}" maxlength="120"></div>
      <div><label class="field-label" for="x">Excerpt (public, 1-2 sentences)</label><textarea id="x" name="excerpt" rows="3" class="field" maxlength="300">${esc(r.excerpt || '')}</textarea></div>
      <div><label class="field-label" for="n">Display name (public)</label><input id="n" name="display_name" class="field" value="${esc(r.name_choice === 'custom' ? r.display_name || '' : '')}" maxlength="60"><p class="text-xs text-ink-faint mt-1">Leave empty for anonymous.</p></div>
      <div><label class="field-label" for="m">Internal note (never public)</label><textarea id="m" name="moderation_note" rows="3" class="field">${esc(r.moderation_note || '')}</textarea></div>
      <label class="flex gap-2 text-sm"><input type="checkbox" name="content_advisory" value="1" ${r.content_advisory ? 'checked' : ''} class="accent-forest"> Show content advisory</label>
      <div class="flex flex-wrap gap-2">
        <button name="action" value="save" class="btn-secondary btn-sm">Save edits</button>
        <button name="action" value="approve" class="btn-primary btn-sm">Approve &amp; publish</button>
        <button name="action" value="reject" class="btn-secondary btn-sm">Decline</button>
        ${r.status === 'approved' ? '<button name="action" value="unpublish" class="btn-secondary btn-sm">Unpublish</button>' : ''}
        <button name="action" value="delete" class="btn-secondary btn-sm" data-confirm="Permanently delete this submission?">Delete permanently</button>
      </div>
    </form></div>`));
});
router.post('/stories/:id', (req, res, next) => {
  const d = db.get(); const id = +req.params.id; const r = d.prepare('SELECT * FROM story_submissions WHERE id=?').get(id);
  if (!r) return next();
  const b = req.body; const t = nowIso();
  const title = clean(b.title, 120) || r.title; const excerpt = clean(b.excerpt, 300) || null; const name = clean(b.display_name, 60);
  const base = [title, excerpt, name ? 'custom' : 'anonymous', name || null, clean(b.moderation_note, 2000) || null, b.content_advisory === '1' ? 1 : 0, id];
  const save = () => d.prepare('UPDATE story_submissions SET title=?, excerpt=?, name_choice=?, display_name=?, moderation_note=?, content_advisory=? WHERE id=?').run(...base);
  switch (b.action) {
    case 'save': save(); break;
    case 'approve': {
      save();
      const slug = r.slug || content.uniqueSlug(title, (s) => !!d.prepare('SELECT 1 FROM story_submissions WHERE slug=? AND id!=?').get(s, id) || !!content.stories().find((x) => x.slug === s));
      d.prepare("UPDATE story_submissions SET status='approved', slug=?, reviewed_at=?, published_at=COALESCE(published_at, ?) WHERE id=?").run(slug, t, t, id); break;
    }
    case 'reject': save(); d.prepare("UPDATE story_submissions SET status='rejected', reviewed_at=? WHERE id=?").run(t, id); break;
    case 'unpublish': d.prepare("UPDATE story_submissions SET status='pending' WHERE id=?").run(id); break;
    case 'delete': d.prepare('DELETE FROM story_submissions WHERE id=?').run(id); return res.redirect(303, '/admin/stories');
    default: return res.status(400).type('text').send('Unknown action');
  }
  res.redirect(303, `/admin/stories/${id}`);
});

/* ----- Donations ----- */
const donationRows = (status) => db.get().prepare(`SELECT * FROM donations ${status ? 'WHERE status=?' : ''} ORDER BY created_at DESC LIMIT 1000`).all(...(status ? [status] : []));
router.get('/donations', (req, res) => {
  const status = ['pending', 'successful', 'failed', 'cancelled', 'refunded'].includes(req.query.status) ? req.query.status : '';
  const rows = donationRows(status);
  ok(res, wrap(req, 'Donations', `<nav class="flex flex-wrap gap-2 mb-6" aria-label="Filter">${['', 'successful', 'pending', 'failed', 'cancelled', 'refunded'].map((s) => `<a class="chip" href="/admin/donations${s ? `?status=${s}` : ''}" ${s === status ? 'aria-current="true"' : ''}>${s || 'all'}</a>`).join('')}<a class="chip ml-auto" href="/admin/donations.csv${status ? `?status=${status}` : ''}">Download CSV</a></nav>
    <div class="overflow-x-auto"><table class="w-full text-sm text-left"><caption class="sr-only">Donation records</caption><thead><tr class="border-b border-sand-line text-ink-soft"><th class="py-2 pr-4">Date</th><th class="pr-4">Amount</th><th class="pr-4">Type</th><th class="pr-4">Status</th><th class="pr-4">Provider</th><th class="pr-4">Donor</th><th>Action</th></tr></thead><tbody>
    ${rows.map((r) => `<tr class="border-b border-sand-line/60 align-top"><td class="py-2 pr-4">${esc(formatDate(r.created_at))}</td><td class="pr-4">${esc(formatMoney(r.amount_minor, r.currency))}</td><td class="pr-4">${r.frequency === 'monthly' ? (r.parent_id ? 'monthly (renewal)' : 'monthly') : 'once'}</td><td class="pr-4">${esc(r.status)}${r.failure_reason ? `<br><span class="text-xs text-ink-faint">${esc(r.failure_reason)}</span>` : ''}</td><td class="pr-4">${esc(r.provider)}<br><span class="text-xs text-ink-faint break-all">${esc(r.public_ref)}</span></td><td class="pr-4">${esc(r.donor_name || '')}<br>${esc(r.donor_email)}${r.anonymous_public ? '<br><span class="text-xs">keep private</span>' : ''}</td>
    <td>${r.status === 'successful' ? `<form method="post" action="/admin/donations/${r.id}/refunded">${csrf(req)}<button class="btn-secondary btn-sm" data-confirm="Mark as refunded? (Record-keeping only. Issue the refund in your provider dashboard.)">Mark refunded</button></form>` : ''}</td></tr>`).join('') || '<tr><td colspan="7" class="py-6 text-ink-soft">No donations yet.</td></tr>'}</tbody></table></div>`));
});
const csvCell = (v) => { let s = String(v ?? ''); if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; return `"${s.replace(/"/g, '""')}"`; };
router.get('/donations.csv', (req, res) => {
  const rows = donationRows(['pending', 'successful', 'failed', 'cancelled', 'refunded'].includes(req.query.status) ? req.query.status : '');
  const head = ['id', 'created_at', 'verified_at', 'status', 'provider', 'public_ref', 'provider_txn_id', 'amount', 'currency', 'frequency', 'donor_name', 'donor_email', 'keep_name_private', 'parent_id'];
  const lines = rows.map((r) => [r.id, r.created_at, r.verified_at, r.status, r.provider, r.public_ref, r.provider_txn_id, (r.amount_minor / 100).toFixed(2), r.currency, r.frequency, r.donor_name, r.donor_email, r.anonymous_public, r.parent_id].map(csvCell).join(','));
  res.type('text/csv').set('Content-Disposition', 'attachment; filename="bloom-donations.csv"').send([head.join(','), ...lines].join('\n'));
});
router.post('/donations/:id/refunded', (req, res) => {
  const d = payments.getById(+req.params.id);
  if (d) payments.applyResult(d, { status: 'refunded' });
  res.redirect(303, '/admin/donations');
});

/* ----- Messages ----- */
router.get('/messages', (req, res) => {
  const rows = db.get().prepare("SELECT * FROM contact_messages WHERE status!='archived' ORDER BY created_at DESC LIMIT 200").all();
  ok(res, wrap(req, 'Messages', rows.length ? `<ul class="space-y-4">${rows.map((m) => `<li class="card p-5"><div class="flex justify-between gap-4 text-sm"><strong class="text-forest">${esc(m.name)}</strong><span class="text-ink-soft">${esc(formatDate(m.created_at))}${m.status === 'new' ? ' &middot; <strong>new</strong>' : ''}</span></div><p class="text-sm"><a class="underline" href="mailto:${esc(m.email)}">${esc(m.email)}</a> &middot; ${esc(m.topic || '')}</p><div class="mt-3 text-sm text-ink-soft">${paragraphs(m.message || '(no message)')}</div>
    <form method="post" action="/admin/messages/${m.id}" class="mt-3 flex gap-2">${csrf(req)}<button name="action" value="read" class="btn-secondary btn-sm">Mark read</button><button name="action" value="archive" class="btn-secondary btn-sm">Archive</button><button name="action" value="delete" class="btn-secondary btn-sm" data-confirm="Permanently delete this message?">Delete</button></form></li>`).join('')}</ul>` : '<p class="text-ink-soft">No messages.</p>'));
});
router.post('/messages/:id', (req, res) => {
  const id = +req.params.id; const a = req.body.action;
  if (a === 'read') db.get().prepare("UPDATE contact_messages SET status='read' WHERE id=?").run(id);
  else if (a === 'archive') db.get().prepare("UPDATE contact_messages SET status='archived' WHERE id=?").run(id);
  else if (a === 'delete') db.get().prepare('DELETE FROM contact_messages WHERE id=?').run(id);
  res.redirect(303, '/admin/messages');
});

module.exports = router;
