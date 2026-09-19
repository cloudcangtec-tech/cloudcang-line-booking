INSERT INTO message_templates (template_key, body_text, button_text, button_url) VALUES
('booking_received', '{{customer_name}} 您好，已收到您在 {{slot_date}} {{slot_time}} 的預約申請，我們會盡快與您確認！', NULL, NULL)
ON CONFLICT(template_key) DO NOTHING;
