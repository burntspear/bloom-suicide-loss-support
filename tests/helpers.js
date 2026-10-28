'use strict';
const fs = require('fs'); const os = require('os'); const path = require('path'); const http = require('http');

/** Boots an isolated app instance (own temp DB) with the given env. Must be called before requiring app modules. */
function boot(env = {}) {
  for (const k of Object.keys(require.cache)) if (k.includes(path.sep + 'bloom') && !k.includes('node_modules') && !k.endsWith('helpers.js')) delete require.cache[k];
  Object.assign(process.env, { NODE_ENV: 'test', SESSION_SECRET: 'test-secret-test-secret-test-secret-1234', DATA_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'bloom-t-')), SHOW_SAMPLE_CONTENT: 'false', PAYMENT_PROVIDER: 'none', RECURRING_ENABLED: 'false', ADMIN_USERNAME: '', ADMIN_PASSWORD_HASH: '', FLW_SECRET_KEY: '', FLW_WEBHOOK_SECRET_HASH: '', PAYSTACK_SECRET_KEY: '', SMTP_HOST: '' }, env);
  const { createApp } = require('../server');
  const server = http.createServer(createApp()).listen(0);
  return { server, base: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((r) => { require('../src/db').close(); server.closeAllConnections(); server.close(r); }), require: (m) => require(path.join('..', m)) };
}

/** A fake payment provider API so integration paths can be exercised without live credentials. */
function mockProvider(handler) {
  const calls = [];
  const srv = http.createServer((req, res) => {
    let body = ''; req.on('data', (c) => (body += c)); req.on('end', () => {
      const call = { method: req.method, url: req.url, headers: req.headers, body: body ? JSON.parse(body) : null }; calls.push(call);
      const out = handler(call) || { status: 404, json: {} };
      res.writeHead(out.status || 200, { 'content-type': 'application/json' }); res.end(JSON.stringify(out.json));
    });
  }).listen(0);
  return { base: `http://127.0.0.1:${srv.address().port}`, calls, close: () => new Promise((r) => srv.close(r)) };
}

const form = (o) => new URLSearchParams(o).toString();
const post = (base, p, body, headers = {}) => fetch(base + p, { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded', ...headers }, body: typeof body === 'string' ? body : form(body) });

module.exports = { boot, mockProvider, form, post };
