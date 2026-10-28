#!/usr/bin/env node
'use strict';
// Reports what still needs your input before launch. Exit code 1 if there are blockers.
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
if (!process.env.SESSION_SECRET) process.env.SESSION_SECRET = 'launch-check-placeholder';
const config = require('../src/config');
const content = require('../src/content');
const payments = require('../src/payments');
const { adminConfigured } = require('../src/security');
const site = content.site();
const blockers = []; const warnings = [];
const need = (c, m) => { if (!c) blockers.push(m); };
const warn = (c, m) => { if (!c) warnings.push(m); };

need(!/localhost|example/.test(config.siteUrl), 'SITE_URL is not set to your real https domain.');
need(config.siteUrl.startsWith('https://'), 'SITE_URL should be https.');
need(!process.env.SESSION_SECRET || process.env.SESSION_SECRET !== 'launch-check-placeholder', 'SESSION_SECRET is not set.');
need(adminConfigured(), 'ADMIN_USERNAME / ADMIN_PASSWORD_HASH not set (needed to moderate stories and read messages).');
need(!config.showSampleContent, 'SHOW_SAMPLE_CONTENT is true. Turn it off for production.');
need(site.contact?.email || site.contact?.phone, 'No public contact method in content/site.json (contact.email or contact.phone).');
const st = payments.status();
warn(st.enabled, `Online donations are OFF (${st.reason === 'no-provider' ? 'PAYMENT_PROVIDER not set' : 'missing ' + (st.missing || []).join(', ')}). The page will show a "not open yet" message.`);
warn(!config.payments.recurringEnabled || st.enabled, 'RECURRING_ENABLED is true but payments are not configured.');
const crisis = content.crisis();
const verifiedCount = (crisis.regions || []).flatMap((r) => r.contacts || []).filter((c) => c.verified === true).length;
warn(verifiedCount > 0, 'No crisis contacts are marked "verified": true in content/crisis.json. The Get help now page will show directory links only.');
warn(site.about?.bio, 'Practitioner bio is empty (content/site.json > about.bio). The About page omits it.');
warn(site.organisation?.registrationStatement || true, '');
warn(site.privacy?.legallyReviewed === true, 'Privacy notice is marked as draft. Get legal review, then set privacy.legallyReviewed to true.');
warn(site.privacy?.privacyContact || site.contact?.email, 'No privacy contact address.');
const unreviewed = content.resources().filter((r) => r.type === 'article' && !r.reviewed);
warn(unreviewed.length === 0, `${unreviewed.length} resource article(s) have no review date: ${unreviewed.map((r) => r.slug).join(', ')}. Have a clinician review them and set "reviewed".`);
warn(config.smtp.host || true, '');
const real = content.stories().filter((s) => !s.sample).length;
warn(real > 0, 'No approved stories yet (the Stories page shows an invitation instead).');
warn(content.videos().filter((v) => !v.sample).length > 0, 'No real videos yet (the video page shows an invitation).');
warn(content.gallery().filter((g) => !g.sample).length > 0, 'No real gallery images yet.');

const print = (t, a) => { console.log(`\n${t} (${a.filter(Boolean).length})`); a.filter(Boolean).forEach((x) => console.log('  - ' + x)); };
print('BLOCKERS (fix before launch)', blockers);
print('TO CONFIRM / COMPLETE', warnings);
console.log(blockers.length ? '\nNot ready to launch.' : '\nNo hard blockers. Work through the list above.');
process.exit(blockers.length ? 1 : 0);
