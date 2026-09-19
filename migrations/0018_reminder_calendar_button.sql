UPDATE message_templates
SET button_text = '加入手機行事曆', button_url = '{{calendar_url}}'
WHERE template_key = 'reminder' AND (button_text IS NULL OR button_text = '');
