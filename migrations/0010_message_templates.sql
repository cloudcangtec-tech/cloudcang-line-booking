CREATE TABLE IF NOT EXISTS message_templates (
  template_key TEXT PRIMARY KEY,
  image_url TEXT,
  title TEXT,
  body_text TEXT NOT NULL,
  button_text TEXT,
  button_url TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO message_templates (template_key, body_text, button_text, button_url) VALUES
('booking_prompt', '點此連結進行線上預約：', '立即預約', '{{liff_url}}'),
('status_confirmed', '{{customer_name}} 您好，您在 {{slot_date}} {{slot_time}} 的預約已確認，我們到時候見！', NULL, NULL),
('status_cancelled', '{{customer_name}} 您好，您在 {{slot_date}} {{slot_time}} 的預約已取消。如需重新預約歡迎再與我們聯繫。', NULL, NULL),
('status_completed', '{{customer_name}} 您好，感謝您完成 {{slot_date}} {{slot_time}} 的預約，期待下次再為您服務！', NULL, NULL),
('reminder', '提醒您：{{customer_name}} 您好，再過約 1 小時（{{slot_date}} {{slot_time}}）就是您的「{{service_name}}」預約時間囉，請準時前來！', NULL, NULL)
ON CONFLICT(template_key) DO NOTHING;
