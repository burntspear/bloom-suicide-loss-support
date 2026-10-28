'use strict';
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const db = require('./db');
const { safeEqual, sha256, nowIso, randomId } = require('./util');

/* ---------------- Public form tokens (stateless CSRF + time trap) ----------------
 * Token = `${issuedAtMs}.${nonce}.${hmac}`. Valid between MIN_AGE (bots that submit instantly are rejected) and MAX_AGE.
 */
const MIN_AGE_MS = 2500;
const MAX_AGE_MS = 6 * 60 * 60 * 1000;
const mac = (data) => crypto.createHmac('sha256', config.sessionSecret).update(data).digest('hex');

function issueFormToken(purpose, now = Date.now()) {
  const nonce = randomId(8);
  return `${now}.${nonce}.${mac(`${purpose}.${now}.${nonce}`)}`;
}

/** Returns null when valid, otherwise a short reason string. */
function checkFormToken(token, purpose, now = Date.now()) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return 'missing';
  const [ts, nonce, sig] = parts;
  if (!safeEqual(sig, mac(`${purpose}.${ts}.${nonce}`))) return 'invalid';
  const age = now - Number(ts);
  if (!(age >= 0)) return 'invalid';
  if (age < MIN_AGE_MS) return 'too-fast';
  if (age > MAX_AGE_MS) return 'expired';
  return null;
}

/** Rejects cross-site POSTs using fetch metadata / Origin when the browser supplies them. */
function sameOriginOnly(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const site = req.get('sec-fetch-site');
  if (site && !['same-origin', 'same-site', 'none'].includes(site)) return res.status(403).type('text').send('Cross-site request blocked.');
  const origin = req.get('origin');
  if (origin && origin !== 'null') {
    try {
      const o = new URL(origin); const mine = new URL(config.siteUrl);
      const host = req.get('host');
      if (o.host !== mine.host && o.host !== host) return res.status(403).type('text').send('Cross-origin request blocked.');
    } catch { return res.status(403).type('text').send('Bad origin.'); }
  }
  next();
}

/** Honeypot field name is deliberately boring. Any value means a bot. */
const HONEYPOT = 'website_url';
const looksLikeBot = (body) => !!(body && body[HONEYPOT]);

/* ---------------- Rate limiting ---------------- */
const limiter = (windowMs, max, message) => rateLimit({
  windowMs, max, standardHeaders: true, legacyHeaders: false,
  handler: (req, res) => res.status(429).type('html').send(`<!doctype html><meta charset="utf-8"><title>Please slow down</title><body style="font-family:system-ui;max-width:32rem;margin:4rem auto;padding:0 1rem"><h1>Please slow down</h1><p>${message}</p><p><a href="/">Back to the site</a></p></body>`),
});
const limits = {
  forms: () => limiter(15 * 60 * 1000, 8, 'Too many submissions from this connection. Please try again in a little while.'),
  checkout: () => limiter(15 * 60 * 1000, 12, 'Too many donation attempts from this connection. Please try again shortly.'),
  login: () => limiter(15 * 60 * 1000, 8, 'Too many sign-in attempts. Please wait 15 minutes.'),
  status: () => limiter(60 * 1000, 60, 'Too many requests.'),
  withdraw: () => limiter(15 * 60 * 1000, 6, 'Too many attempts. Please try again later.'),
};

/* ---------------- Admin authentication ---------------- */
// Hash format: scrypt$N$r$p$saltHex$hashHex  (generate with `npm run hash-password`)
function hashPassword(password, salt = crypto.randomBytes(16)) {
  const N = 16384, r = 8, p = 1;
  const hash = crypto.scryptSync(password, salt, 64, { N, r, p });
  return `scrypt$${N}$${r}$${p}$${salt.toString('hex')}$${hash.toString('hex')}`;
}
function verifyPassword(password, stored) {
  const parts = String(stored || '').split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, N, r, p, saltHex, hashHex] = parts;
  try {
    const expected = Buffer.from(hashHex, 'hex');
    const actual = crypto.scryptSync(String(password), Buffer.from(saltHex, 'hex'), expected.length, { N: +N, r: +r, p: +p });
    return crypto.timingSafeEqual(actual, expected);
  } catch { return false; }
}

const ADMIN_COOKIE = config.secureCookies ? '__Host-bloom_admin' : 'bloom_admin';
const SESSION_HOURS = 8;
const adminConfigured = () => !!(config.admin.username && config.admin.passwordHash);

function login(username, password) {
  if (!adminConfigured()) return null;
  // Always run the hash to avoid revealing whether the username matched.
  const okPass = verifyPassword(password, config.admin.passwordHash);
  const okUser = safeEqual(String(username), config.admin.username);
  if (!(okPass && okUser)) return null;
  const token = randomId(32);
  const csrf = randomId(16);
  const expires = new Date(Date.now() + SESSION_HOURS * 3600e3).toISOString();
  db.get().prepare('INSERT INTO admin_sessions (token_hash, csrf, created_at, expires_at) VALUES (?,?,?,?)').run(sha256(token), csrf, nowIso(), expires);
  return { token, csrf, expires };
}

function readCookie(req, name) {
  const m = String(req.headers.cookie || '').split(/;\s*/).find((c) => c.startsWith(name + '='));
  return m ? decodeURIComponent(m.slice(name.length + 1)) : null;
}

function setAdminCookie(res, token) {
  res.append('Set-Cookie', `${ADMIN_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_HOURS * 3600}${config.secureCookies ? '; Secure' : ''}`);
}
function clearAdminCookie(res) {
  res.append('Set-Cookie', `${ADMIN_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${config.secureCookies ? '; Secure' : ''}`);
}

function currentAdminSession(req) {
  const token = readCookie(req, ADMIN_COOKIE);
  if (!token) return null;
  const row = db.get().prepare('SELECT * FROM admin_sessions WHERE token_hash = ?').get(sha256(token));
  if (!row) return null;
  if (row.expires_at < nowIso()) { db.get().prepare('DELETE FROM admin_sessions WHERE token_hash = ?').run(row.token_hash); return null; }
  return { ...row, token };
}

/** Middleware: only a valid admin session passes. State-changing requests also need the session CSRF token. */
function requireAdmin(req, res, next) {
  const s = currentAdminSession(req);
  if (!s) return res.redirect(303, '/admin/login');
  req.admin = s;
  res.set('Cache-Control', 'no-store');
  if (req.method === 'POST' && !safeEqual(String(req.body?._csrf || ''), s.csrf)) return res.status(403).type('text').send('Invalid CSRF token. Go back, reload the page and try again.');
  next();
}

function destroySession(req) {
  const s = currentAdminSession(req);
  if (s) db.get().prepare('DELETE FROM admin_sessions WHERE token_hash = ?').run(s.token_hash);
}

module.exports = { issueFormToken, checkFormToken, sameOriginOnly, HONEYPOT, looksLikeBot, limits, hashPassword, verifyPassword, login, setAdminCookie, clearAdminCookie, requireAdmin, destroySession, currentAdminSession, adminConfigured, MIN_AGE_MS };
