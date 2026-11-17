-- Admin/reviewer user delete hone par history bachi rahe, delete block na ho.
ALTER TABLE provider_verifications DROP CONSTRAINT IF EXISTS provider_verifications_verified_by_fkey;
ALTER TABLE provider_verifications ADD CONSTRAINT provider_verifications_verified_by_fkey
    FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL;

-- Agent delete ho to booking history rahe (agent_id khaali ho jaaye)
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_agent_id_fkey;
ALTER TABLE bookings ADD CONSTRAINT bookings_agent_id_fkey
    FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE SET NULL;
