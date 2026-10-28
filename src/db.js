'use strict';
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite'); // built into Node >= 22.13: no native build step
const config = require('./config');

let db;

/** Adds a better-sqlite3-style transaction() helper on top of node:sqlite. */
function wrap(raw) {
  let depth = 0;
  return {
    raw,
    exec: (sql) => raw.exec(sql),
    prepare: (sql) => raw.prepare(sql),
    close: () => raw.close(),
    transaction: (fn) => (...args) => {
      const outer = depth === 0; depth += 1;
      if (outer) raw.exec('BEGIN IMMEDIATE');
      try { const r = fn(...args); if (outer) raw.exec('COMMIT'); return r; }
      catch (e) { if (outer) raw.exec('ROLLBACK'); throw e; }
      finally { depth -= 1; }
    },
  };
}

/** Opens the database (creating the data directory) and applies any pending migrations in db/migrations. */
function open(file) {
  if (db) return db;
  const dbFile = file || path.join(config.dataDir, 'bloom.sqlite');
  if (dbFile !== ':memory:') fs.mkdirSync(path.dirname(dbFile), { recursive: true });
  db = wrap(new DatabaseSync(dbFile));
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  migrate(db);
  return db;
}

function migrate(d) {
  d.exec('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)');
  const dir = path.join(config.root, 'db', 'migrations');
  const applied = new Set(d.prepare('SELECT name FROM schema_migrations').all().map((r) => r.name));
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.sql')).sort()) {
    if (applied.has(f)) continue;
    const sql = fs.readFileSync(path.join(dir, f), 'utf8');
    d.transaction(() => {
      d.exec(sql);
      d.prepare('INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)').run(f, new Date().toISOString());
    })();
  }
}

function get() {
  if (!db) open();
  return db;
}

function close() {
  if (db) { db.close(); db = null; }
}

module.exports = { open, get, close };
