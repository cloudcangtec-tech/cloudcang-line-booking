ALTER TABLE stylists ADD COLUMN auto_schedule INTEGER NOT NULL DEFAULT 0;
ALTER TABLE stylists ADD COLUMN buffer_minutes INTEGER NOT NULL DEFAULT 0;
ALTER TABLE stylists ADD COLUMN slot_step_minutes INTEGER NOT NULL DEFAULT 15;

-- 服務人員每週固定的上班/午休時段（weekday: 1=一 ... 7=日）
CREATE TABLE IF NOT EXISTS stylist_schedule_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stylist_id INTEGER NOT NULL,
  weekday INTEGER NOT NULL,
  rule_type TEXT NOT NULL, -- 'work' or 'break'
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_stylist_schedule_rules_lookup ON stylist_schedule_rules(stylist_id, weekday);

-- 服務人員提供哪些服務項目（自動排程模式判斷可預約性用）
CREATE TABLE IF NOT EXISTS stylist_services (
  stylist_id INTEGER NOT NULL,
  service_type_id INTEGER NOT NULL,
  PRIMARY KEY (stylist_id, service_type_id)
);
