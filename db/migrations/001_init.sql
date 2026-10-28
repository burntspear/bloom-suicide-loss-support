-- Bloom schema v1. Money is stored in minor units (cents) as integers. All times are ISO-8601 UTC strings.

CREATE TABLE donations (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  public_ref       TEXT    NOT NULL UNIQUE,            -- unguessable reference we send to the provider as tx_ref/reference
  provider         TEXT    NOT NULL CHECK (provider IN ('flutterwave','paystack')),
  provider_txn_id  TEXT,                                -- provider's own transaction id once known
  amount_minor     INTEGER NOT NULL CHECK (amount_minor > 0),
  currency         TEXT    NOT NULL CHECK (length(currency) = 3),
  frequency        TEXT    NOT NULL CHECK (frequency IN ('one_time','monthly')),
  status           TEXT    NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','successful','failed','cancelled','refunded')),
  failure_reason   TEXT,
  donor_name       TEXT,
  donor_email      TEXT    NOT NULL,
  anonymous_public INTEGER NOT NULL DEFAULT 0 CHECK (anonymous_public IN (0,1)),
  message          TEXT,
  plan_ref         TEXT,                                -- provider plan id/code for recurring donations
  parent_id        INTEGER REFERENCES donations(id),    -- renewal charges point at the first donation
  created_at       TEXT    NOT NULL,
  updated_at       TEXT    NOT NULL,
  verified_at      TEXT
);
CREATE INDEX idx_donations_status ON donations(status);
CREATE INDEX idx_donations_created ON donations(created_at);
CREATE UNIQUE INDEX idx_donations_provider_txn ON donations(provider, provider_txn_id) WHERE provider_txn_id IS NOT NULL;

CREATE TABLE payment_plans (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  provider     TEXT    NOT NULL,
  currency     TEXT    NOT NULL,
  amount_minor INTEGER NOT NULL,
  interval     TEXT    NOT NULL,
  plan_ref     TEXT    NOT NULL,
  created_at   TEXT    NOT NULL,
  UNIQUE (provider, currency, amount_minor, interval)
);

-- One row per processed webhook event: the UNIQUE key is what makes webhook handling idempotent.
CREATE TABLE webhook_events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  provider    TEXT NOT NULL,
  event_key   TEXT NOT NULL,
  received_at TEXT NOT NULL,
  outcome     TEXT,
  UNIQUE (provider, event_key)
);

CREATE TABLE story_submissions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  public_id       TEXT    NOT NULL UNIQUE,
  withdraw_hash   TEXT    NOT NULL,                     -- sha256 of the code shown once to the contributor
  title           TEXT    NOT NULL,
  body            TEXT    NOT NULL,
  excerpt         TEXT,
  categories      TEXT    NOT NULL DEFAULT '[]',        -- JSON array of category slugs
  relationship    TEXT,                                  -- optional, chosen from a fixed list
  name_choice     TEXT    NOT NULL CHECK (name_choice IN ('first_name','initials','anonymous','custom')),
  display_name    TEXT,
  contact_email   TEXT,                                  -- private, never published
  consent_publish INTEGER NOT NULL CHECK (consent_publish = 1),
  consent_followup INTEGER NOT NULL DEFAULT 0,           -- OK to be contacted about a photo/video/follow-up
  content_advisory INTEGER NOT NULL DEFAULT 0,
  status          TEXT    NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','withdrawn')),
  moderation_note TEXT,                                  -- private, internal only
  slug            TEXT    UNIQUE,
  created_at      TEXT    NOT NULL,
  reviewed_at     TEXT,
  published_at    TEXT,
  withdrawn_at    TEXT
);
CREATE INDEX idx_story_status ON story_submissions(status);

CREATE TABLE contact_messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  topic      TEXT,
  message    TEXT,
  status     TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','read','archived')),
  notified   INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE admin_sessions (
  token_hash TEXT PRIMARY KEY,
  csrf       TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
