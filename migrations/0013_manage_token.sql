ALTER TABLE bookings ADD COLUMN manage_token TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_manage_token ON bookings(manage_token);
