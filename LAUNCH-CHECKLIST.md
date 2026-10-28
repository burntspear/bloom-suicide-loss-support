# Launch checklist

Run `npm run launch-check` (with your production environment) to see this live.

## Must do before launch
- [ ] Choose hosting with a Node server and persistent disk; set all env vars (`.env.example`).
- [ ] `SITE_URL` = real https domain; `SESSION_SECRET` set; HTTPS working.
- [ ] Admin account created (`npm run hash-password`); sign in and check `/admin`.
- [ ] **Payments**: provider keys + webhook configured; complete a **sandbox** donation (success, failed card, cancelled, repeat webhook); then live keys. Confirm your currencies/recurring are enabled on the provider account.
- [ ] **Crisis contacts**: call each number in `content/crisis.json`, fill `hours`, set `"verified": true`. (Befrienders Kenya's number is listed but unverified; sources disagree on hours.)
- [ ] Contact: add `contact.email`/`phone` in `content/site.json`; test the contact form end to end; optionally set SMTP.
- [ ] **Privacy notice**: confirm retention periods, name the data controller, get legal review, set `privacy.legallyReviewed: true`. Check local data-protection registration/obligations (e.g. Kenya's Data Protection Act) with a lawyer.
- [ ] **Clinical review** of the three articles in `content/resources/` (then set `reviewed`).
- [ ] About page: add Hannah's bio, qualifications and photo (`about.bio`, `organisation.practitionerCredentials`, `about.portraitImage`), only what is accurate.
- [ ] Confirm which services are truly available (`content/services.json`).
- [ ] Decide whether to state a registration/charitable status (`organisation.registrationStatement`). None is claimed now; donation pages say gifts may not be tax-deductible.
- [ ] `SHOW_SAMPLE_CONTENT=false`; real stories/videos/images added only with written consent.
- [ ] Back-up and restore tested.

## Nice to have
- [ ] Real photography/social image (`public/images/social-card.png`), Open Graph preview check.
- [ ] Someone trained to moderate story submissions, and a written moderation guide (safe-messaging: no method details).
- [ ] Captions (.vtt) for every video.
