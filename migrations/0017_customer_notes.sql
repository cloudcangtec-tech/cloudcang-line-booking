CREATE TABLE IF NOT EXISTS customer_notes (
  phone TEXT PRIMARY KEY,
  tag TEXT,
  note TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
