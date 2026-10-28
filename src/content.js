'use strict';
/**
 * Editor-managed content. Owners edit plain JSON files in /content (see README, "Updating content").
 * Files are re-read when their modification time changes, so edits appear without a restart.
 * Sample content lives in content/samples and is only loaded when SHOW_SAMPLE_CONTENT=true.
 */
const fs = require('fs');
const path = require('path');
const config = require('./config');
const db = require('./db');
const { slugify, nowIso } = require('./util');

const cache = new Map();

function readJson(file, fallback) {
  try {
    const st = fs.statSync(file);
    const hit = cache.get(file);
    if (hit && hit.mtime === st.mtimeMs) return hit.data;
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    cache.set(file, { mtime: st.mtimeMs, data });
    return data;
  } catch (e) {
    if (e.code !== 'ENOENT') console.error(`[content] Could not read ${path.relative(config.root, file)}: ${e.message}`);
    return fallback;
  }
}

const dir = (...p) => path.join(config.contentDir, ...p);
const readDirJson = (d) => {
  try { return fs.readdirSync(d).filter((f) => f.endsWith('.json')).sort().map((f) => readJson(path.join(d, f), null)).filter(Boolean); }
  catch { return []; }
};

const site = () => readJson(dir('site.json'), {});
const crisis = () => readJson(dir('crisis.json'), { regions: [], directories: [] });
const donations = () => readJson(dir('donations.json'), {});
const services = () => readJson(dir('services.json'), { services: [] });
const categories = () => readJson(dir('categories.json'), []);

function withSamples(real, sampleFile, isDir = false) {
  if (!config.showSampleContent) return real;
  const s = isDir ? readDirJson(dir('samples', sampleFile)) : readJson(dir('samples', sampleFile), []);
  return [...real, ...s.map((x) => ({ ...x, sample: true }))];
}

/** Published stories: editor files + moderated, approved submissions from the database. Newest first. */
function stories() {
  const files = withSamples(readDirJson(dir('stories')), 'stories', true).filter((s) => s.slug && s.title && s.consentConfirmed !== false);
  let fromDb = [];
  try {
    fromDb = db.get().prepare("SELECT * FROM story_submissions WHERE status = 'approved' AND slug IS NOT NULL").all().map((r) => ({
      slug: r.slug,
      title: r.title,
      excerpt: r.excerpt || r.body.slice(0, 180).replace(/\s+\S*$/, '') + '…',
      body: r.body,
      bodyIsPlainText: true,
      categories: JSON.parse(r.categories || '[]'),
      displayName: displayNameFor(r),
      publishedAt: r.published_at,
      contentAdvisory: !!r.content_advisory,
      fromSubmission: true,
    }));
  } catch (e) { console.error('[content] story query failed:', e.message); }
  return [...files, ...fromDb].sort((a, b) => String(b.publishedAt || '').localeCompare(String(a.publishedAt || '')));
}

function displayNameFor(r) {
  if (r.name_choice === 'anonymous') return 'Shared anonymously';
  return r.display_name || 'Shared anonymously';
}

const story = (slug) => stories().find((s) => s.slug === slug) || null;
const videos = () => withSamples(readJson(dir('videos.json'), []), 'videos.json');
const gallery = () => withSamples(readJson(dir('gallery.json'), []), 'gallery.json');
const resources = () => readDirJson(dir('resources')).filter((r) => r.status !== 'draft');
const resource = (slug) => resources().find((r) => r.slug === slug) || null;

function relatedStories(s, n = 3) {
  const cats = new Set(s.categories || []);
  return stories().filter((o) => o.slug !== s.slug && (o.categories || []).some((c) => cats.has(c))).slice(0, n);
}

/** Unique slug for a newly approved submission. */
function uniqueSlug(title, taken) {
  const base = slugify(title); let slug = base; let i = 2;
  while (taken(slug)) slug = `${base}-${i++}`;
  return slug;
}

module.exports = { site, crisis, donations, services, categories, stories, story, videos, gallery, resources, resource, relatedStories, uniqueSlug, displayNameFor, readJson, nowIso };
