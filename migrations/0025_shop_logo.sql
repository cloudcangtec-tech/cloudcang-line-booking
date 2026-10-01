CREATE TABLE IF NOT EXISTS shop_logo (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  image_data BLOB NOT NULL,
  image_content_type TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
