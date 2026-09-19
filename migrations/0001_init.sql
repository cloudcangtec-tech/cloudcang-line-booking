-- 預約時段設定（你開放的服務項目與時段）
CREATE TABLE IF NOT EXISTS service_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 可預約時段（哪一天、幾點、上限幾組客人）
CREATE TABLE IF NOT EXISTS time_slots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_type_id INTEGER NOT NULL,
  slot_date TEXT NOT NULL,      -- YYYY-MM-DD
  slot_time TEXT NOT NULL,      -- HH:MM
  capacity INTEGER NOT NULL DEFAULT 1,
  booked_count INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (service_type_id) REFERENCES service_types(id)
);

-- 預約紀錄
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  time_slot_id INTEGER NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  line_user_id TEXT,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending / confirmed / completed / cancelled
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (time_slot_id) REFERENCES time_slots(id)
);

-- 後台管理員帳號
CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 後台操作紀錄
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT,
  detail TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_time_slots_date ON time_slots(slot_date);
CREATE INDEX IF NOT EXISTS idx_bookings_slot ON bookings(time_slot_id);
