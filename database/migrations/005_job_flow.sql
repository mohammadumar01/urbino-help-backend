-- Agent job flow: start OTP (agent ghar pahuncha, iska saboot), decline, support tickets.

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS start_otp VARCHAR(6);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS start_otp_attempts SMALLINT NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS agent_declined_reason TEXT;

-- Help / human support (AI chat se "talk to a person")
CREATE TABLE IF NOT EXISTS support_tickets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(100),
    phone VARCHAR(20),
    booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
    category VARCHAR(40) NOT NULL DEFAULT 'other',
    message TEXT NOT NULL,
    chat_transcript JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
    admin_note TEXT,
    resolved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets (user_id, created_at DESC);
