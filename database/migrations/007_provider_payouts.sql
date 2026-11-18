-- Provider payouts: Urbino aur provider ke beech hisaab (settlement ledger).
-- Online payment: paisa Urbino ke paas -> Urbino provider ko uski kamai deta hai (to_provider).
-- Cash payment:   paisa provider ke paas -> provider Urbino ko commission deta hai (from_provider).
CREATE TABLE IF NOT EXISTS provider_payouts (
    id SERIAL PRIMARY KEY,
    provider_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    direction VARCHAR(20) NOT NULL CHECK (direction IN ('to_provider', 'from_provider')),
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    reference VARCHAR(120),
    note TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_provider_payouts_provider ON provider_payouts (provider_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON payments (paid_at DESC) WHERE payment_status = 'successful';
