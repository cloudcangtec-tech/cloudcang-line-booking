ALTER TABLE service_types ADD COLUMN price INTEGER;
ALTER TABLE service_types ADD COLUMN description TEXT;
ALTER TABLE stylists ADD COLUMN bio TEXT;
ALTER TABLE stylists ADD COLUMN photo_data BLOB;
ALTER TABLE stylists ADD COLUMN photo_content_type TEXT;
