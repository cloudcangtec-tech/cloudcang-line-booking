UPDATE message_templates
SET button_text = NULL, button_url = NULL
WHERE template_key = 'reminder' AND button_url = '{{calendar_url}}';
