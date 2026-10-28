'use strict';
const crypto = require('crypto');

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
/** HTML-escape any value. Every dynamic value in a template goes through this. */
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

/** Tagged template: html`<p>${userValue}</p>` escapes interpolations unless wrapped with raw(). */
class Raw { constructor(s) { this.s = s; } toString() { return this.s; } }
const raw = (s) => new Raw(String(s ?? ''));
function html(strings, ...vals) {
  let out = '';
  strings.forEach((s, i) => {
    out += s;
    if (i < vals.length) {
      const v = vals[i];
      if (v instanceof Raw) out += v.s;
      else if (Array.isArray(v)) out += v.map((x) => (x instanceof Raw ? x.s : esc(x))).join('');
      else out += esc(v);
    }
  });
  return new Raw(out);
}

const slugify = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70) || 'story';

const randomId = (bytes = 16) => crypto.randomBytes(bytes).toString('hex');
const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
const nowIso = () => new Date().toISOString();

function safeEqual(a, b) {
  const ba = Buffer.from(String(a)); const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) { crypto.timingSafeEqual(ba, ba); return false; }
  return crypto.timingSafeEqual(ba, bb);
}

/** Split plain text (user submissions) into escaped paragraphs. No markup is interpreted. */
function paragraphs(text) {
  return String(text || '').replace(/\r\n/g, '\n').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
    .map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('\n');
}

/**
 * Tiny, safe markdown subset for editor-written content (stories, resources):
 * ## / ### headings, - lists, > quotes, **bold**, *italic*, [text](https://link). Everything is escaped first.
 */
function mdLite(text) {
  const inline = (s) => esc(s)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/g, (m, t, u) => {
      const external = /^https?:/.test(u);
      return `<a href="${u}"${external ? ' rel="noopener noreferrer" target="_blank"' : ''}>${t}</a>`;
    });
  const blocks = String(text || '').replace(/\r\n/g, '\n').split(/\n{2,}/);
  return blocks.map((b) => {
    b = b.trim();
    if (!b) return '';
    if (/^### /.test(b)) return `<h3>${inline(b.slice(4))}</h3>`;
    if (/^## /.test(b)) return `<h2>${inline(b.slice(3))}</h2>`;
    if (/^(- .+\n?)+$/.test(b)) return `<ul>${b.split('\n').map((l) => `<li>${inline(l.slice(2))}</li>`).join('')}</ul>`;
    if (/^> /.test(b)) return `<blockquote>${inline(b.replace(/^> ?/gm, ' ').trim())}</blockquote>`;
    return `<p>${inline(b).replace(/\n/g, '<br>')}</p>`;
  }).join('\n');
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

/** Format minor units for display using Intl, with a graceful fallback for unknown currencies. */
function formatMoney(minor, currency) {
  const v = minor / 100;
  try { return new Intl.NumberFormat('en-KE', { style: 'currency', currency, maximumFractionDigits: v % 1 ? 2 : 0 }).format(v); }
  catch { return `${currency} ${v.toFixed(2)}`; }
}

const isEmail = (s) => typeof s === 'string' && s.length <= 254 && /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']{2,}$/.test(s);

/** Remove control characters and trim; cap length. */
const clean = (s, max = 200) => String(s ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max);

module.exports = { esc, html, raw, Raw, slugify, randomId, sha256, nowIso, safeEqual, paragraphs, mdLite, formatDate, formatMoney, isEmail, clean };
