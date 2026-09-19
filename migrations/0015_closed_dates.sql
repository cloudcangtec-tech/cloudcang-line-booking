CREATE TABLE IF NOT EXISTS closed_dates (
  closed_date TEXT PRIMARY KEY,
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
