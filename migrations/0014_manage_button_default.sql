UPDATE message_templates
SET button_text = '管理我的預約', button_url = '{{manage_url}}'
WHERE template_key = 'booking_received' AND (button_text IS NULL OR button_text = '');
