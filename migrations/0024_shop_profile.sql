CREATE TABLE IF NOT EXISTS shop_banners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  image_data BLOB NOT NULL,
  image_content_type TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS shop_portfolio (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  image_data BLOB NOT NULL,
  image_content_type TEXT NOT NULL,
  caption TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
