-- Step 1: data integrity + indexes for scale.
-- Har statement idempotent hai (IF NOT EXISTS), taaki purane aur naye dono DB par chale.

-- 1) Role normalize: purane "user" accounts ko "customer" banao
UPDATE users SET role = 'customer' WHERE role = 'user' OR role IS NULL;
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'customer';

-- 2) agent_profiles table (live DB mein thi, database.sql dump mein nahi)
CREATE TABLE IF NOT EXISTS agent_profiles (
    id SERIAL PRIMARY KEY,
    agent_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    address TEXT,
    experience_years INTEGER NOT NULL DEFAULT 0 CHECK (experience_years >= 0),
    skills TEXT,
    service_area TEXT,
    profile_image TEXT,
    verification_status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (verification_status IN ('pending', 'approved', 'rejected')),
    document_path TEXT,
    document_original_name TEXT,
    document_mime_type VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3) Bookings: service ka id aur price snapshot (sirf naam text kaafi nahi hai)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service_id INTEGER REFERENCES services(id) ON DELETE SET NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS price NUMERIC(10,2);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Purani bookings mein service_id / price bharo (naam se match karke)
UPDATE bookings b
SET service_id = s.id
FROM services s
WHERE b.service_id IS NULL AND lower(s.name) = lower(b.service_name);

UPDATE bookings b
SET price = COALESCE(
    (SELECT ps.price FROM provider_services ps
      WHERE ps.provider_id = b.provider_id AND ps.service_id = b.service_id),
    (SELECT s.base_price FROM services s WHERE s.id = b.service_id)
)
WHERE b.price IS NULL AND b.service_id IS NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_status_check') THEN
        ALTER TABLE bookings ADD CONSTRAINT bookings_status_check CHECK (status IN (
            'pending', 'provider_accepted', 'agent_assigned', 'agent_accepted',
            'on_the_way', 'in_progress', 'completed', 'cancelled'
        ));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_provider_id_fkey') THEN
        ALTER TABLE bookings ADD CONSTRAINT bookings_provider_id_fkey
            FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 4) Indexes: har foreign key / filter column par. Inke bina 1000 users par
--    har list query poori table scan karti hai.
CREATE INDEX IF NOT EXISTS idx_bookings_customer_created ON bookings (customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_provider_status ON bookings (provider_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_agent_status ON bookings (agent_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_status_created ON bookings (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_service ON bookings (service_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications (user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments (booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments (customer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_provider ON reviews (provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_services_service ON provider_services (service_id);
CREATE INDEX IF NOT EXISTS idx_provider_agents_agent ON provider_agents (agent_id);
CREATE INDEX IF NOT EXISTS idx_provider_availability_provider ON provider_availability (provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_verifications_provider ON provider_verifications (provider_id, status);
CREATE INDEX IF NOT EXISTS idx_agent_services_service ON agent_services (service_id);
CREATE INDEX IF NOT EXISTS idx_services_category ON services (category_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role) WHERE is_deleted IS NOT TRUE;
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users (lower(email));
