(function () {
  'use strict';
  var d = document;
  var refresh = d.querySelector('[data-refresh]');
  if (refresh) refresh.addEventListener('click', function (e) { e.preventDefault(); location.reload(); });

  var form = d.querySelector('[data-donation-form]'); if (!form) return;
  var cfgEl = d.getElementById('donation-config'); var cfg; try { cfg = JSON.parse(cfgEl.textContent); } catch (e) { return; }
  var sel = form.querySelector('[data-currency]');
  var curInput = form.querySelector('input[name=currency]');
  var pills = form.querySelector('[data-pills]'), customWrap = d.getElementById('custom-wrap'), custom = d.getElementById('custom_amount');
  var out = form.querySelector('[data-summary-text]'), submit = form.querySelector('[data-submit]');
  var cur = function () { return sel ? sel.value : curInput.value; };
  var money = function (v, c) { try { return new Intl.NumberFormat('en-KE', { style: 'currency', currency: c, maximumFractionDigits: v % 1 ? 2 : 0 }).format(v); } catch (e) { return c + ' ' + v; } };
  var checked = function (n) { var r = form.querySelector('input[name=' + n + ']:checked'); return r ? r.value : ''; };

  function amount() {
    var c = checked('amount_choice'); if (!c) return NaN;
    if (c === 'custom') { var t = (custom.value || '').trim(); return /^\d+(\.\d{1,2})?$/.test(t) ? Number(t) : NaN; }
    return Number(c);
  }
  function rebuildPills() {
    var c = cfg.currencies[cur()]; if (!c) return;
    var keep = checked('amount_choice');
    pills.innerHTML = '';
    c.suggested.forEach(function (a, i) { pills.appendChild(pill('amt-' + i, String(a), money(a, cur()), keep === String(a) || (!keep && i === 1))); });
    pills.appendChild(pill('amt-custom', 'custom', 'Other amount', keep === 'custom'));
    var lab = form.querySelector('[data-cur-label]'); if (lab) lab.textContent = cur();
    update();
  }
  function pill(id, val, label, on) {
    var s = d.createElement('span'), i = d.createElement('input'), l = d.createElement('label');
    i.className = 'pill-radio'; i.type = 'radio'; i.id = id; i.name = 'amount_choice'; i.value = val; i.checked = on;
    l.className = 'pill-label'; l.htmlFor = id; l.textContent = label; s.appendChild(i); s.appendChild(l); return s;
  }
  function update() {
    customWrap.classList.toggle('hidden', checked('amount_choice') !== 'custom');
    var a = amount(), c = cur(), cc = cfg.currencies[c], freq = checked('frequency') === 'monthly' ? 'every month' : 'one time';
    if (!isFinite(a) || a <= 0) out.textContent = 'Choose an amount to see your summary.';
    else if (cc && a < cc.min) out.textContent = 'The minimum donation is ' + money(cc.min, c) + '.';
    else out.textContent = money(a, c) + ' (' + c + '), ' + freq;
  }
  if (sel) sel.addEventListener('change', rebuildPills);
  form.addEventListener('change', update); form.addEventListener('input', update); update();

  // Progressive enhancement: submit via fetch and navigate to the provider's hosted checkout.
  form.addEventListener('submit', function (e) {
    if (!window.fetch || submit.disabled) return;
    e.preventDefault(); submit.disabled = true; var old = submit.textContent; submit.textContent = 'Preparing secure payment…';
    fetch(form.action, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(new FormData(form)).toString(), credentials: 'same-origin' })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (x) {
        if (x.ok && x.j.url) { location.assign(x.j.url); return; }
        submit.disabled = false; submit.textContent = old;
        form.submit(); // let the server re-render with field errors
      })
      .catch(function () { submit.disabled = false; submit.textContent = old; form.submit(); });
  });
})();
