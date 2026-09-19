CREATE TABLE IF NOT EXISTS stylists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

ALTER TABLE time_slots ADD COLUMN stylist_id INTEGER REFERENCES stylists(id);

CREATE INDEX IF NOT EXISTS idx_time_slots_stylist ON time_slots(stylist_id, slot_date);
