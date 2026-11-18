-- Admin catalog: service band/chalu (delete nahi - purani bookings us par tiki hain)
ALTER TABLE services ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE services ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_name ON categories (lower(name));
CREATE UNIQUE INDEX IF NOT EXISTS uq_services_category_name ON services (category_id, lower(name));
CREATE INDEX IF NOT EXISTS idx_services_active ON services (category_id) WHERE is_active;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'services_base_price_check') THEN
        ALTER TABLE services ADD CONSTRAINT services_base_price_check CHECK (base_price IS NULL OR base_price >= 0);
    END IF;
END $$;
