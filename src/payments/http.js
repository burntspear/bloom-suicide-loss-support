'use strict';
/** Minimal JSON-over-HTTPS client for provider APIs. Never logs request bodies, headers or secrets. */
async function request(method, url, { headers = {}, body, timeoutMs = 15000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method,
      headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
    let json = null;
    try { json = await res.json(); } catch { /* non-JSON error body */ }
    return { ok: res.ok, status: res.status, json };
  } catch (e) {
    const err = new Error(e.name === 'AbortError' ? 'Payment provider timed out' : 'Could not reach payment provider');
    err.network = true;
    throw err;
  } finally { clearTimeout(t); }
}
module.exports = { request };
