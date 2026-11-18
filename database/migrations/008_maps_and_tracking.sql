-- Maps: booking ka exact location, provider ka base location + radius, agent live tracking.

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS latitude NUMERIC(9,6);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS longitude NUMERIC(9,6);

ALTER TABLE provider_profiles ADD COLUMN IF NOT EXISTS latitude NUMERIC(9,6);
ALTER TABLE provider_profiles ADD COLUMN IF NOT EXISTS longitude NUMERIC(9,6);
ALTER TABLE provider_profiles ADD COLUMN IF NOT EXISTS service_radius_km INTEGER NOT NULL DEFAULT 15;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_latlng_check') THEN
        ALTER TABLE bookings ADD CONSTRAINT bookings_latlng_check CHECK (
            (latitude IS NULL AND longitude IS NULL)
            OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'provider_profiles_radius_check') THEN
        ALTER TABLE provider_profiles ADD CONSTRAINT provider_profiles_radius_check CHECK (service_radius_km BETWEEN 1 AND 100);
    END IF;
END $$;

-- Agent ki aakhri location (ek booking = ek row). Sirf "on the way" / kaam ke dauraan;
-- job khatam ya cancel hote hi row delete ho jaati hai (privacy).
CREATE TABLE IF NOT EXISTS booking_tracking (
    booking_id INTEGER PRIMARY KEY REFERENCES bookings(id) ON DELETE CASCADE,
    agent_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    latitude NUMERIC(9,6) NOT NULL,
    longitude NUMERIC(9,6) NOT NULL,
    accuracy_m INTEGER,
    heading SMALLINT,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
