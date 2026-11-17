-- Service guarantee (free rework within 7 days) + provider -> agent invites.

CREATE TABLE IF NOT EXISTS service_claims (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    customer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    preferred_date DATE,
    preferred_time VARCHAR(5),
    status VARCHAR(20) NOT NULL DEFAULT 'requested'
        CHECK (status IN ('requested', 'accepted', 'rejected', 'escalated')),
    provider_note TEXT,
    rework_booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
    support_ticket_id INTEGER REFERENCES support_tickets(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- Ek booking par ek hi claim
CREATE UNIQUE INDEX IF NOT EXISTS uq_service_claims_booking ON service_claims (booking_id);
CREATE INDEX IF NOT EXISTS idx_service_claims_provider ON service_claims (provider_id, status);

-- Rework booking original booking se judi rahe (free, price 0)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS rework_of INTEGER REFERENCES bookings(id) ON DELETE SET NULL;
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_price_check;

CREATE TABLE IF NOT EXISTS agent_invites (
    id SERIAL PRIMARY KEY,
    provider_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
    message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP
);
-- Ek provider ka ek agent ko ek hi pending invite
CREATE UNIQUE INDEX IF NOT EXISTS uq_agent_invites_pending ON agent_invites (provider_id, agent_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_agent_invites_agent ON agent_invites (agent_id, status);
