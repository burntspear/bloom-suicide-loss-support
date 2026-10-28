#!/usr/bin/env node
'use strict';
// Crawls the running site in-process; fails on any internal link/asset that does not return 200, or on href="#".
process.env.DB_IN_MEMORY = '1';
process.env.DATA_DIR = require('fs').mkdtempSync(require('path').join(require('os').tmpdir(), 'bloom-links-'));
process.env.SESSION_SECRET = 'x'.repeat(40);
const http = require('http');
const { createApp } = require('../server');

const app = createApp();
const srv = http.createServer(app).listen(0, async () => {
  const base = `http://127.0.0.1:${srv.address().port}`;
  const seen = new Set(); const queue = ['/']; const bad = [];
  const attrs = /(?:href|src)="([^"]*)"/g;
  while (queue.length) {
    const p = queue.shift(); if (seen.has(p)) continue; seen.add(p);
    const r = await fetch(base + p, { redirect: 'manual' });
    if (r.status !== 200) { bad.push(`${p} -> ${r.status}`); continue; }
    if (!/text\/html/.test(r.headers.get('content-type') || '')) continue;
    const html = await r.text();
    if (/href="#"/.test(html)) bad.push(`${p}: contains href="#"`);
    if (/href=""/.test(html) && !/data-refresh/.test(html)) bad.push(`${p}: empty href`);
    for (const m of html.matchAll(attrs)) {
      let u = m[1].split('#')[0]; if (!u || /^(https?:|mailto:|tel:|data:)/.test(u)) continue;
      u = u.replace(/&amp;/g, '&'); if (u.startsWith('/admin')) continue;
      if (!seen.has(u)) queue.push(u);
    }
  }
  console.log(`Checked ${seen.size} URLs.`);
  if (bad.length) { console.error('PROBLEMS:\n' + bad.join('\n')); process.exitCode = 1; } else console.log('All internal links and assets OK.');
  srv.close();
});
