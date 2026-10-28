'use strict';
const express = require('express');
const helmet = require('helmet');
const path = require('path');
const config = require('./src/config');
const db = require('./src/db');
const sec = require('./src/security');
const layout = require('./src/layout');
const content = require('./src/content');
const staticPages = require('./src/pages/static');

function createApp() {
  db.open();
  const app = express();
  app.disable('x-powered-by');
  if (config.trustProxy !== '0') app.set('trust proxy', /^\d+$/.test(config.trustProxy) ? +config.trustProxy : config.trustProxy);

  app.use(helmet({
    contentSecurityPolicy: { useDefaults: false, directives: {
      defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'"], imgSrc: ["'self'", 'data:'], fontSrc: ["'self'"],
      connectSrc: ["'self'"], mediaSrc: ["'self'"], frameSrc: ["'self'", 'https://www.youtube-nocookie.com', 'https://player.vimeo.com'],
      objectSrc: ["'none'"], baseUri: ["'self'"], formAction: ["'self'"], frameAncestors: ["'self'"],
      ...(config.secureCookies ? { upgradeInsecureRequests: [] } : {}),
    } },
    crossOriginEmbedderPolicy: false, referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hsts: config.secureCookies ? { maxAge: 31536000, includeSubDomains: true } : false,
  }));
  app.use((req, res, next) => { res.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()'); next(); });

  app.use(require('./src/routes/webhooks')); // raw body, before parsers

  app.use('/css', express.static(path.join(config.root, 'public/css'), { maxAge: '7d' }));
  app.use('/fonts', express.static(path.join(config.root, 'public/fonts'), { maxAge: '365d', immutable: true }));
  app.use(express.static(path.join(config.root, 'public'), { maxAge: '1d', index: false }));

  app.use(express.urlencoded({ extended: false, limit: '64kb', parameterLimit: 60 }));
  app.use(sec.sameOriginOnly);

  app.get('/health', (req, res) => { try { db.get().prepare('SELECT 1').get(); res.json({ ok: true }); } catch { res.status(500).json({ ok: false }); } });
  app.get('/robots.txt', (req, res) => res.type('text').send(`User-agent: *\nDisallow: /admin\nDisallow: /donate/\nSitemap: ${config.siteUrl}/sitemap.xml\n`));
  app.get('/sitemap.xml', (req, res) => {
    const urls = ['/', '/approach', '/services', '/journey', '/stories', '/stories/videos', '/gallery', '/resources', '/about', '/contact', '/donate', '/stories/share', '/get-help-now', '/privacy',
      ...content.stories().filter((s) => !s.sample).map((s) => `/stories/${s.slug}`), ...content.resources().filter((r) => r.type === 'article').map((r) => `/resources/${r.slug}`)];
    res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${config.siteUrl}${encodeURI(u)}</loc></url>`).join('\n')}\n</urlset>`);
  });

  app.use('/admin', require('./src/routes/admin'));
  app.use(require('./src/routes/public'));

  app.use((req, res) => res.status(404).type('html').send(layout.page(staticPages.notFound())));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error('[error]', req.method, req.path, err.message);
    res.status(err.status || 500).type('html').send(layout.page(staticPages.serverError()));
  });
  return app;
}

if (require.main === module) {
  const app = createApp();
  app.listen(config.port, () => console.log(`Bloom running on ${config.siteUrl} (port ${config.port}, ${config.isProd ? 'production' : 'development'})`));
}
module.exports = { createApp };
