'use strict';
/**
 * Central configuration. All secrets come from environment variables (see .env.example).
 * Nothing in this file is ever sent to the browser.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');

function loadDotEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || line.trim().startsWith('#')) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  }
}
loadDotEnv(path.join(ROOT, '.env'));

const env = (k, d = '') => (process.env[k] !== undefined && process.env[k] !== '' ? process.env[k] : d);
const bool = (k, d = false) => {
  const v = env(k, '');
  return v === '' ? d : ['1', 'true', 'yes', 'on'].includes(v.toLowerCase());
};

const isProd = env('NODE_ENV', 'development') === 'production';

function build() {
  const siteUrl = env('SITE_URL', `http://localhost:${env('PORT', '3000')}`).replace(/\/+$/, '');
  let sessionSecret = env('SESSION_SECRET');
  if (!sessionSecret) {
    if (isProd) {
      // Refuse to run production with an ephemeral secret: forms/sessions would break on every restart.
      throw new Error('SESSION_SECRET is required in production. Generate one with: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"');
    }
    sessionSecret = crypto.randomBytes(32).toString('hex');
  }
  return {
    root: ROOT,
    isProd,
    port: parseInt(env('PORT', '3000'), 10),
    siteUrl,
    trustProxy: env('TRUST_PROXY', isProd ? '1' : '0'),
    sessionSecret,
    dataDir: path.resolve(ROOT, env('DATA_DIR', './data')),
    contentDir: path.resolve(ROOT, env('CONTENT_DIR', './content')),
    showSampleContent: bool('SHOW_SAMPLE_CONTENT', false),
    secureCookies: bool('SECURE_COOKIES', isProd),

    admin: {
      username: env('ADMIN_USERNAME'),
      passwordHash: env('ADMIN_PASSWORD_HASH'),
    },

    payments: {
      provider: env('PAYMENT_PROVIDER', 'none').toLowerCase(), // flutterwave | paystack | none
      defaultCurrency: env('DONATION_DEFAULT_CURRENCY', ''), // falls back to content/donations.json
      recurringEnabled: bool('RECURRING_ENABLED', false),
      flutterwave: {
        secretKey: env('FLW_SECRET_KEY'),
        webhookSecretHash: env('FLW_WEBHOOK_SECRET_HASH'),
        apiBase: env('FLW_API_BASE', 'https://api.flutterwave.com/v3'),
      },
      paystack: {
        secretKey: env('PAYSTACK_SECRET_KEY'),
        apiBase: env('PAYSTACK_API_BASE', 'https://api.paystack.co'),
      },
    },

    smtp: {
      host: env('SMTP_HOST'),
      port: parseInt(env('SMTP_PORT', '587'), 10),
      secure: bool('SMTP_SECURE', false),
      user: env('SMTP_USER'),
      pass: env('SMTP_PASS'),
      from: env('SMTP_FROM'),
      notifyTo: env('CONTACT_NOTIFY_TO'),
    },
  };
}

module.exports = build();
module.exports.build = build;
