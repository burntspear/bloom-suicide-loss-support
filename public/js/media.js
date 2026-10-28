(function () {
  'use strict';
  var d = document;
  function json(id) { var el = d.getElementById(id); try { return el ? JSON.parse(el.textContent) : null; } catch (e) { return null; } }
  function openDialog(dlg, opener) {
    dlg.__opener = opener; dlg.showModal(); d.documentElement.classList.add('no-scroll');
  }
  function wireDialog(dlg, onClose) {
    dlg.addEventListener('click', function (e) { if (e.target.closest('[data-dialog-close]') || e.target.hasAttribute('data-dialog-backdrop')) dlg.close(); });
    dlg.addEventListener('close', function () {
      d.documentElement.classList.remove('no-scroll'); if (onClose) onClose();
      if (dlg.__opener && d.contains(dlg.__opener)) dlg.__opener.focus();
    });
  }

  /* ---------- Videos ---------- */
  var vdata = json('video-data'), vdlg = d.getElementById('video-dialog');
  if (vdata && vdlg && typeof vdlg.showModal === 'function') {
    var stage = d.getElementById('video-stage');
    var byslug = {}; vdata.forEach(function (v) { byslug[v.slug] = v; });
    var msg = function (text) { stage.innerHTML = ''; var p = d.createElement('div'); p.className = 'absolute inset-0 flex items-center justify-center text-sand text-center p-6 text-sm'; p.textContent = text; stage.appendChild(p); };
    function show(slug, opener) {
      var v = byslug[slug]; if (!v) return;
      d.getElementById('video-dialog-title').textContent = v.title;
      d.getElementById('video-dialog-desc').textContent = v.description;
      d.getElementById('video-dialog-advisory').classList.toggle('hidden', !v.advisory);
      stage.innerHTML = '';
      if (v.unavailable) msg('This video is no longer available.');
      else if (v.type === 'file') {
        var vid = d.createElement('video'); vid.controls = true; vid.preload = 'none'; vid.className = 'absolute inset-0 w-full h-full'; vid.setAttribute('playsinline', '');
        if (v.poster) vid.poster = v.poster;
        var s = d.createElement('source'); s.src = v.src; vid.appendChild(s);
        if (v.captions) { var t = d.createElement('track'); t.kind = 'captions'; t.src = v.captions; t.srclang = v.captionsLang; t.label = 'Captions'; t.default = true; vid.appendChild(t); }
        vid.addEventListener('error', function () { msg('This video could not be played. It may have been removed.'); }, true);
        stage.appendChild(vid);
      } else {
        var provider = v.type === 'vimeo' ? 'Vimeo' : 'YouTube';
        var box = d.createElement('div'); box.className = 'absolute inset-0 flex flex-col items-center justify-center gap-4 text-sand text-center p-6';
        var p = d.createElement('p'); p.className = 'text-sm max-w-md'; p.textContent = 'This video is hosted by ' + provider + '. Playing it will load content from their website, which may collect information about your visit.';
        var b = d.createElement('button'); b.type = 'button'; b.className = 'btn-light'; b.textContent = 'Load and play video';
        b.addEventListener('click', function () {
          var f = d.createElement('iframe'); f.className = 'absolute inset-0 w-full h-full'; f.title = v.title; f.allowFullscreen = true; f.setAttribute('allow', 'fullscreen; picture-in-picture'); f.referrerPolicy = 'strict-origin-when-cross-origin';
          f.src = v.type === 'vimeo' ? 'https://player.vimeo.com/video/' + encodeURIComponent(v.embedId) + '?dnt=1' : 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(v.embedId) + '?rel=0&cc_load_policy=1';
          stage.innerHTML = ''; stage.appendChild(f);
        });
        box.appendChild(p); box.appendChild(b); stage.appendChild(box);
      }
      openDialog(vdlg, opener);
    }
    wireDialog(vdlg, function () { stage.innerHTML = ''; if (location.hash) history.replaceState(null, '', location.pathname + location.search); });
    d.addEventListener('click', function (e) { var b = e.target.closest('[data-video-open]'); if (b) show(b.getAttribute('data-video-open'), b); });
    if (location.hash.length > 1 && byslug[location.hash.slice(1)]) show(location.hash.slice(1), null);
  }

  /* ---------- Gallery lightbox ---------- */
  var gdata = json('gallery-data'), box = d.getElementById('lightbox');
  if (gdata && box && typeof box.showModal === 'function') {
    var idx = 0, img = d.getElementById('lightbox-img'), cap = d.getElementById('lightbox-cap'), cnt = d.getElementById('lightbox-count');
    function render() {
      var g = gdata[idx]; img.src = g.src; img.alt = g.alt;
      cap.textContent = [g.caption, g.credit].filter(Boolean).join(' · '); cnt.textContent = (idx + 1) + ' of ' + gdata.length;
    }
    img.addEventListener('error', function () { img.removeAttribute('src'); cap.textContent = 'This image is unavailable.'; });
    function step(n) { idx = (idx + n + gdata.length) % gdata.length; render(); }
    wireDialog(box);
    d.addEventListener('click', function (e) {
      var o = e.target.closest('[data-gallery-open]'); if (o) { idx = +o.getAttribute('data-gallery-open'); render(); openDialog(box, o); return; }
      if (e.target.closest('[data-lightbox-prev]')) step(-1); else if (e.target.closest('[data-lightbox-next]')) step(1);
    });
    box.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') step(-1); else if (e.key === 'ArrowRight') step(1); });
  }
})();
