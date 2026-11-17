-- Step 3: provider onboarding (profile, services, availability, documents).

-- Documents: file upload metadata (pehle sirf URL text tha)
ALTER TABLE provider_verifications ADD COLUMN IF NOT EXISTS document_original_name TEXT;
ALTER TABLE provider_verifications ADD COLUMN IF NOT EXISTS document_mime_type VARCHAR(100);

-- Ek provider ka har document type ek hi baar (reject hone par wahi row update hoti hai)
DELETE FROM provider_verifications a
USING provider_verifications b
WHERE a.provider_id = b.provider_id
  AND a.document_type = b.document_type
  AND (a.created_at, a.id) < (b.created_at, b.id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_provider_verifications_type
    ON provider_verifications (provider_id, document_type);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'provider_verifications_status_check') THEN
        ALTER TABLE provider_verifications ADD CONSTRAINT provider_verifications_status_check
            CHECK (status IN ('pending', 'approved', 'rejected'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'provider_services_price_check') THEN
        ALTER TABLE provider_services ADD CONSTRAINT provider_services_price_check CHECK (price > 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'provider_profiles_experience_check') THEN
        ALTER TABLE provider_profiles ADD CONSTRAINT provider_profiles_experience_check
            CHECK (experience_years IS NULL OR experience_years BETWEEN 0 AND 60);
    END IF;
END $$;

-- Provider apni service band/chalu kar sake bina delete kiye
ALTER TABLE provider_services ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE provider_services ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Availability fast lookup (booking ke waqt slot check)
CREATE INDEX IF NOT EXISTS idx_provider_availability_day ON provider_availability (provider_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_bookings_provider_date ON bookings (provider_id, booking_date) WHERE status <> 'cancelled';
