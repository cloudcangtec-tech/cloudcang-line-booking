CREATE TABLE IF NOT EXISTS line_message_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  direction TEXT NOT NULL,
  purpose TEXT NOT NULL,
  recipient_line_user_id TEXT,
  recipient_name TEXT,
  success INTEGER NOT NULL,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_line_message_log_created_at ON line_message_log(created_at);
