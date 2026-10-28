# Bloom: support after suicide loss

A compassionate, accessible website for people bereaved by suicide, built on the original **Bloom: Psychology with Hannah** design system (same palette, Fraunces / Work Sans / Inter type, arch frames, cinematic scenes, film grain). It adds written stories, video stories, a gallery, resources, a safety page, moderated story submissions, a real contact form, and a secure donation system (Flutterwave or Paystack).

## 1. What changed from the original, and why

**Audit findings (original ZIP)**
- 6 pages (`index, approach, services, journey, about, contact`), each a ~120-170 KB file with CSS, JS and four images base64-inlined. The README described `css/`, `js/` and `images/` folders that **did not exist** in the archive.
- Tailwind loaded from a CDN (not for production) and Google Fonts from Google (a third-party request).
- The contact form displayed "Your message has been received" without sending anything.
- Navigation and footer markup was copied into every page; the logo PNG was an opaque black square that only looked right with a blend mode that doesn't actually work on black, so it rendered as a black box.
- `README` hosting guide (GitHub Pages) cannot run payment code.

**What was preserved:** all six pages and their purpose, the Our Approach MBS rings + tabs, the five-stage journey accordion, all four brand images (extracted to `public/images/`), the colour tokens, type, breakpoints (`xs`…`2xl`), cinematic scenes, glow blobs, arch frames, grain, reduced-motion handling. Copy was adapted to suicide-loss support; the "We are / are not", personality, tone-of-voice and scope-and-ethics content was kept and adjusted.

**Fixed:** logo made truly transparent; one shared layout (no copied nav/footer); Tailwind compiled to one CSS file; fonts self-hosted; forms do real submissions; `ink-faint` text and clay eyebrow text darkened slightly for WCAG AA contrast.

## 2. Architecture

Static HTML cannot take payments or moderate content securely, so the site is a **small Node.js server** (the minimum needed):

| Concern | Choice |
|---|---|
| Runtime | Node.js >= 22.13 (tested on 22.22) |
| Server | Express 4, server-rendered HTML with shared template functions (`src/layout.js`, `src/components.js`) |
| Styling | Tailwind CSS 3 compiled to `public/css/site.css` (built file is included) |
| Database | SQLite (Node built-in `node:sqlite`, no native build step), file in `DATA_DIR`, SQL migrations in `db/migrations` |
| Payments | Provider abstraction in `src/payments` (Flutterwave + Paystack both implemented) using each provider's **hosted checkout** |
| Content | Plain JSON/Markdown-lite files in `content/` (no CMS, no subscriptions) |
| Admin | `/admin`: password sign-in (scrypt), CSRF-protected moderation, donations, messages |
| Client JS | ~4 small files, no framework, no inline scripts (strict CSP) |

```
server.js            app + security headers + routes
src/config.js        environment configuration (secrets never leave the server)
src/layout.js        header, nav, footer, <head> (SEO, social, canonical)
src/components.js    story/video/gallery cards, donation CTA, safety notice, alerts
src/pages/*.js       page templates
src/routes/*.js      public forms, donations, webhooks, admin
src/payments/        index.js (lifecycle) + flutterwave.js + paystack.js
src/security.js      form tokens, rate limits, admin auth
content/             everything an owner edits
db/migrations/       schema
public/              css, fonts, images, js, sample media
scripts/             hash-password, launch-check, check-links
tests/               node:test suites (security, forms, payments w/ mock providers)
```

## 3. Quick start (local)

```bash
npm ci
cp .env.example .env          # then edit (see below)
npm run dev                   # http://localhost:3000, sample content ON
npm test
npm run check-links
npm run launch-check          # lists what still needs your input
```
`npm run dev` shows clearly-labelled **sample** stories/videos/images (`SHOW_SAMPLE_CONTENT=true`). Production defaults to `false`; with no real content the pages show respectful "invitation" empty states. If you change Tailwind classes, run `npm run build`.

## 4. Configuration (`.env`)

See `.env.example` (placeholders only). Essentials: `SITE_URL`, `SESSION_SECRET`, `DATA_DIR`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH` (run `npm run hash-password`), `PAYMENT_PROVIDER`, and the provider's keys.

## 5. Payment setup

The site never claims payments are live until the provider is configured. With no credentials, `/donate` shows "Online giving isn't open yet", the button is disabled, and the checkout endpoint refuses (503) without recording anything.

**Flow:** donor picks amount/frequency -> server validates -> creates a `pending` record with an unguessable reference -> asks the provider to create a hosted checkout -> donor is redirected to the provider -> on return, **the server asks the provider for the transaction's real status** (the URL's `status=` is ignored) -> amount **and currency** must match -> only then `successful`. Webhooks are signature-verified, de-duplicated (unique event key), re-verified with the provider API, and idempotent. A 5xx is returned if verification is temporarily unavailable so the provider retries. Card data never touches this server.

Statuses: `pending, successful, failed, cancelled, refunded`.

### Flutterwave
1. Dashboard > Settings > API Keys: copy the **Secret key** to `FLW_SECRET_KEY` (use test keys first).
2. Settings > Webhooks: URL `https://YOUR-DOMAIN/webhooks/flutterwave`. Invent a long random **Secret hash**, enter it there, and put the **same value** in `FLW_WEBHOOK_SECRET_HASH`. Enable the successful-charge event.
3. `.env`: `PAYMENT_PROVIDER=flutterwave`. Redeploy/restart.
4. Make sure KES (and any currency in `content/donations.json`) is enabled on your account.
5. Monthly giving: enable payment plans/recurring on your Flutterwave account, then set `RECURRING_ENABLED=true`. Plans are created on demand via the API and cached.

### Paystack
1. Dashboard > Settings > API Keys & Webhooks: copy the **Secret key** to `PAYSTACK_SECRET_KEY` (test key first).
2. Same page: Webhook URL `https://YOUR-DOMAIN/webhooks/paystack` (Paystack signs with your secret key, no extra secret).
3. `.env`: `PAYSTACK_SECRET_KEY=...`, `PAYMENT_PROVIDER=paystack`. Restart.
4. Confirm your Paystack business supports the currencies you list (e.g. KES, USD).
5. Monthly giving: set `RECURRING_ENABLED=true` (plans are created via API and cached).

### Changing amounts/currency
Edit `content/donations.json` (suggested amounts, min, max per currency, default currency). `DONATION_DEFAULT_CURRENCY` overrides the default. Currencies must be 2-decimal currencies.

### Recurring notes
Monthly gifts use the provider's subscription/plan features, not repeated one-time charges. Renewal notifications create a child record (`parent_id`) after server verification. **Cancellation:** donors are told to contact you (or their provider); cancel in the provider dashboard. Payment failures are handled by the provider's retry rules; failed renewals do not create a successful record. Consent text is shown on the form.

## 6. Admin (`/admin`)

Sign in with the username and password hash you set. You can: **moderate stories** (edit title/excerpt/display name, add private notes, approve, decline, unpublish, delete), **review donations** (filter, download CSV, mark refunded for record-keeping), and **read/archive/delete messages**. Sessions are random tokens stored hashed, 8 hours, `HttpOnly`, `SameSite=Strict`, with CSRF tokens on every state change and login rate-limiting. There is no unauthenticated admin page.

## 7. Updating content (no code)

| What | Where |
|---|---|
| Contact details, about/bio, donation "how gifts are used", privacy details | `content/site.json` (empty value = hidden) |
| Services and availability | `content/services.json` (`available`, `planned`, `hidden`) |
| Donation amounts/currencies | `content/donations.json` |
| Crisis & helpline contacts | `content/crisis.json` (shown only when `"verified": true`) |
| Story themes | `content/categories.json` |
| Written stories (editor-made) | one file per story in `content/stories/` (below) |
| Video stories | `content/videos.json` |
| Gallery | `content/gallery.json` + files in `public/images/gallery/` |
| Resources | one file per item in `content/resources/` |

Changes appear without restarting (files are re-read when modified). Public submissions go through `/admin/stories`.

**Story file** (`content/stories/my-story.json`; only add with the contributor's written consent):
```json
{ "slug": "my-story", "title": "Title", "excerpt": "One or two sentences.",
  "body": "First paragraph.\n\nSecond paragraph.\n\n## Optional heading",
  "categories": ["losing-a-parent"], "displayName": "Chosen name or Shared anonymously",
  "publishedAt": "2026-03-01T09:00:00Z", "contentAdvisory": false, "consentConfirmed": true,
  "image": { "src": "/images/stories/x.jpg", "alt": "Describe the image", "caption": "" } }
```
**Video** (`content/videos.json`; `type` is `file`, `youtube` or `vimeo`):
```json
[ { "slug": "name", "title": "Title", "description": "Short description.",
    "type": "youtube", "embedId": "VIDEO_ID", "poster": "/images/videos/name.jpg",
    "displayName": "Chosen name", "contentAdvisory": true },
  { "slug": "name2", "title": "Hosted", "description": "...", "type": "file",
    "src": "/media/name2.mp4", "captions": "/media/name2.en.vtt", "captionsLang": "en" } ]
```
Embeds load **only after the visitor presses play** (YouTube privacy-enhanced domain, Vimeo `dnt=1`). To retire a video set `"status": "unavailable"`; the card shows a respectful "no longer available".
**Gallery item**: `{ "id": "x", "src": "/images/gallery/x.jpg", "alt": "required description", "caption": "", "credit": "", "type": "photo", "width": 1200, "height": 800 }`. Only add images you have permission to use; do not show identifiable people without consent.
**Resource**: `type` is `article` (with markdown-lite `body`: `##` headings, `-` lists, `>` quotes, `**bold**`, `[text](https://…)`), or `link` / `download` with a `url`. Set `"reviewed": "YYYY-MM-DD"` after a clinician reviews an article.

**Consent withdrawal / correction:** contributors can withdraw instantly at `/stories/withdraw` (code given on submission): the story is unpublished and its text and details are erased. For editor-made stories or other content, delete or edit the file. Decide and document your retention periods in `content/site.json > privacy.retention`.

## 8. Deployment

You need hosting that runs a **Node.js server with persistent disk** (static hosts like GitHub Pages will not work for donations, forms or admin).

1. Pick a host: Render, Railway, Fly.io, a VPS (nginx or Caddy + systemd/pm2), or the included `Dockerfile`. Node >= 22.13. Mount a persistent volume and point `DATA_DIR` at it. Serverless/ephemeral file systems are **not** suitable for SQLite.
2. Set the environment variables from `.env.example` in the host's dashboard (never in the repo). `NODE_ENV=production`, `TRUST_PROXY=1`.
3. Install & start: `npm ci --omit=dev` then `npm start` (the CSS is pre-built; run `npm ci && npm run build` only if you edit styles).
4. Point your domain at the host and enable HTTPS (all of these hosts provide it). Set `SITE_URL` to the final `https://` address (used for canonical links, sitemap and payment return URLs).
5. Migrations run automatically at startup.
6. Register webhooks (section 5) with the production URL.
7. Verify: `GET /health` returns `{"ok":true}`; load every page; `npm run launch-check` (with production env); do a **test-mode donation** end-to-end, then switch to live keys.
8. **Backups:** SQLite file lives at `$DATA_DIR/bloom.sqlite` (+ `-wal`/`-shm`). Back up daily using your host's volume snapshots or `sqlite3 bloom.sqlite ".backup 'copy.sqlite'"`. Restore: stop the app, replace the file, start. Test a restore before launch.
9. **Updating content:** edit files in `content/` on the server or in your repo and redeploy.

**Troubleshooting:** *Server won't start in production* -> `SESSION_SECRET` missing. *Donate page says not open* -> provider env vars missing (non-production mode lists which). *Webhook 401* -> secret/hash mismatch, or provider not equal to `PAYMENT_PROVIDER`. *Payment succeeds but stays pending* -> webhook URL unreachable; return page re-checks each visit. *Contact form shows "isn't connected"* -> set admin credentials or SMTP. *Admin login loop on http* -> cookies are `Secure` in production, use https.

## 9. Security summary
Strict CSP (no inline script/style, `script-src 'self'`), HSTS in production, nosniff, frame and referrer policies; server-side validation and output escaping everywhere (`html` helper / `esc`); parameterized SQL only; stateless HMAC form tokens with a 2.5 s minimum fill time + honeypot + per-IP rate limits; fetch-metadata / Origin checks on POST; webhook signature checks with constant-time compare; secrets only from environment; no analytics, no tracking cookies; CSV export neutralises spreadsheet-formula injection; no file uploads exist.

## 10. Honest limits
See `LAUNCH-CHECKLIST.md`. In short: payment integrations were tested against **mock provider servers**, not live sandboxes (no credentials were available); crisis numbers, practitioner bio, legal copy and clinical review of the three articles need you.
