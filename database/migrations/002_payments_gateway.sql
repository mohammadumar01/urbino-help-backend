-- Step 2: online payments (Razorpay), cash on service, refunds, platform commission.

ALTER TABLE payments ADD COLUMN IF NOT EXISTS gateway VARCHAR(20);            -- razorpay | mock | cash
ALTER TABLE payments ADD COLUMN IF NOT EXISTS gateway_order_id VARCHAR(100);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS gateway_payment_id VARCHAR(100);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS failure_reason TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS refund_id VARCHAR(100);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMP;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS platform_fee NUMERIC(10,2);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider_earning NUMERIC(10,2);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS collected_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Purane payments: method se gateway bharo
UPDATE payments SET gateway = CASE WHEN upper(payment_method) = 'CASH' THEN 'cash' ELSE 'manual' END
WHERE gateway IS NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_status_check') THEN
        ALTER TABLE payments ADD CONSTRAINT payments_status_check CHECK (payment_status IN (
            'pending', 'successful', 'failed', 'refund_pending', 'refunded'
        ));
    END IF;
END $$;

-- Purane data mein ek booking ke do "successful" payments the (double charge).
-- Pehla rakho, baaki ko refund_pending karo taaki admin unhe dekh kar paisa wapas kare.
UPDATE payments p
SET payment_status = 'refund_pending',
    failure_reason = 'Duplicate payment for this booking (flagged by migration 002)',
    updated_at = CURRENT_TIMESTAMP
WHERE p.payment_status = 'successful'
  AND EXISTS (
      SELECT 1 FROM payments q
      WHERE q.booking_id = p.booking_id
        AND q.payment_status = 'successful'
        AND (q.created_at, q.id) < (p.created_at, p.id)
  );

-- Ek booking ka sirf ek hi successful payment (double charge se bachav)
CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_one_success_per_booking
    ON payments (booking_id) WHERE payment_status = 'successful';

CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_gateway_order ON payments (gateway_order_id) WHERE gateway_order_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_gateway_payment ON payments (gateway_payment_id) WHERE gateway_payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_status_created ON payments (payment_status, created_at DESC);

-- Webhook events: ek event do baar process na ho
CREATE TABLE IF NOT EXISTS payment_events (
    id SERIAL PRIMARY KEY,
    gateway VARCHAR(20) NOT NULL,
    event_id VARCHAR(120) NOT NULL,
    event_type VARCHAR(60) NOT NULL,
    payload JSONB NOT NULL,
    received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (gateway, event_id)
);
