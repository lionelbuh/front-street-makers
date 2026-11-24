-- Front Street Makers — Cloudflare D1 schema
-- Apply with: npx wrangler d1 execute front-street-makers --remote --file=worker/schema.sql

-- One row per business, from first application to published profile.
-- Only rows with status = 'approved' are ever returned by the public API.
CREATE TABLE IF NOT EXISTS businesses (
  id              TEXT PRIMARY KEY,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'new'
                  CHECK (status IN ('new','assistance','clarifying','ready','approved','not_eligible','declined')),
  published_at    TEXT,                 -- first approval, drives "new business" visibility
  slug            TEXT UNIQUE,

  -- public profile
  category        TEXT NOT NULL CHECK (category IN ('home','micro')),
  name            TEXT NOT NULL,
  kind            TEXT NOT NULL,        -- what they offer (food, candles, jewelry, ...)
  type_label      TEXT,                 -- e.g. "Home bakery · Cottage Food"
  summary         TEXT,
  description     TEXT,
  city            TEXT,
  area            TEXT,                 -- service area / how to buy; never a home address
  website         TEXT,
  order_url       TEXT,
  instagram       TEXT,
  facebook        TEXT,
  tiktok          TEXT,
  public_email    TEXT,
  public_phone    TEXT,

  -- stall look on the illustrated street (set by the admin)
  stall_display   TEXT,
  stall_roof      TEXT,
  stall_colors    TEXT,                 -- JSON array of 3 colours
  stall_valance   TEXT,
  stall_chalk     TEXT,

  -- The only private data: the owner's first name and the licensing answers.
  -- Everything else above is information the business already makes public.
  first_name      TEXT NOT NULL,
  license_status  TEXT NOT NULL
                  CHECK (license_status IN ('ready','unsure','started','not_started','not_required')),
  wants_help      INTEGER NOT NULL DEFAULT 0,
  independent_ok  INTEGER NOT NULL DEFAULT 0,
  notes           TEXT NOT NULL DEFAULT ''  -- internal admin notes
);
CREATE INDEX IF NOT EXISTS idx_businesses_status ON businesses(status);

CREATE TABLE IF NOT EXISTS photos (
  id          TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  r2_key      TEXT NOT NULL,
  alt         TEXT NOT NULL DEFAULT '',
  sort        INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_photos_business ON photos(business_id);

-- Community stories submitted by entrepreneurs; published after review.
CREATE TABLE IF NOT EXISTS stories (
  id          TEXT PRIMARY KEY,
  created_at  TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','published','archived')),
  author      TEXT NOT NULL,
  business    TEXT,
  contact     TEXT NOT NULL,   -- a public channel (business email, @handle) to confirm before publishing
  title       TEXT NOT NULL,
  body        TEXT NOT NULL
);

-- Key/value settings (featured rotation).
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- What changed, by whom, when (status changes, edits, publications).
CREATE TABLE IF NOT EXISTS audit (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  at          TEXT NOT NULL,
  business_id TEXT,
  action      TEXT NOT NULL,
  detail      TEXT
);
