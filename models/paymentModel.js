const pool = require("../config/db");

/** Platform ka commission (pitch deck: 10-25%). Default 15%. */
const COMMISSION_PERCENT = Math.min(50, Math.max(0, Number(process.env.PLATFORM_COMMISSION_PERCENT ?? 15)));

function split(amount) {
    const fee = Math.round(Number(amount) * COMMISSION_PERCENT) / 100;
    return { platform_fee: fee, provider_earning: Math.round((Number(amount) - fee) * 100) / 100 };
}

/** Payment ke liye booking + uska latest payment ek saath. */
const getBookingWithPayment = async (booking_id) => {
    const result = await pool.query(
        `
        SELECT b.id, b.customer_id, b.provider_id, b.agent_id, b.status, b.price, b.service_name,
               p.id AS payment_id, p.payment_status, p.gateway, p.gateway_order_id,
               p.payment_method, p.amount AS payment_amount
        FROM bookings b
        LEFT JOIN LATERAL (
            SELECT * FROM payments
            WHERE booking_id = b.id
            ORDER BY (payment_status = 'successful') DESC, created_at DESC, id DESC
            LIMIT 1
        ) p ON TRUE
        WHERE b.id = $1
        `,
        [booking_id]
    );
    return result.rows[0];
};

const createPayment = async ({ booking_id, customer_id, amount, payment_method, gateway, gateway_order_id = null }) => {
    const result = await pool.query(
        `
        INSERT INTO payments (booking_id, customer_id, amount, payment_method, gateway, gateway_order_id, payment_status)
        VALUES ($1, $2, $3, $4, $5, $6, 'pending')
        RETURNING *
        `,
        [booking_id, customer_id, amount, payment_method, gateway, gateway_order_id]
    );
    return result.rows[0];
};

/** Pending payment ko naye method/order par switch karo (customer ne method badla). */
const repointPendingPayment = async (payment_id, { payment_method, gateway, gateway_order_id = null, amount }) => {
    const result = await pool.query(
        `
        UPDATE payments
        SET payment_method = $2, gateway = $3, gateway_order_id = $4, amount = $5,
            failure_reason = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND payment_status IN ('pending', 'failed')
        RETURNING *
        `,
        [payment_id, payment_method, gateway, gateway_order_id, amount]
    );
    return result.rows[0];
};

const getPaymentByOrderId = async (gateway_order_id) => {
    const result = await pool.query("SELECT * FROM payments WHERE gateway_order_id = $1", [gateway_order_id]);
    return result.rows[0];
};

const getPaymentById = async (id) => {
    const result = await pool.query("SELECT * FROM payments WHERE id = $1", [id]);
    return result.rows[0];
};

const getPaymentByBooking = async (booking_id) => {
    const result = await pool.query(
        `
        SELECT * FROM payments
        WHERE booking_id = $1
        ORDER BY (payment_status = 'successful') DESC, created_at DESC, id DESC
        LIMIT 1
        `,
        [booking_id]
    );
    return result.rows[0];
};

/**
 * Payment ko successful mark karo. Idempotent: pehle se successful ho to wahi row lautao.
 * Unique index (ek booking = ek successful payment) double charge rokta hai.
 */
const markPaymentSuccessful = async (payment_id, { gateway_payment_id = null, transaction_id = null, collected_by = null } = {}) => {
    const existing = await getPaymentById(payment_id);
    if (!existing) return null;
    if (existing.payment_status === "successful") return { payment: existing, alreadyDone: true };

    const { platform_fee, provider_earning } = split(existing.amount);
    const result = await pool.query(
        `
        UPDATE payments
        SET payment_status = 'successful',
            gateway_payment_id = COALESCE($2, gateway_payment_id),
            transaction_id = COALESCE($3, transaction_id, $2),
            collected_by = COALESCE($4, collected_by),
            platform_fee = $5,
            provider_earning = $6,
            failure_reason = NULL,
            paid_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND payment_status IN ('pending', 'failed')
        RETURNING *
        `,
        [payment_id, gateway_payment_id, transaction_id, collected_by, platform_fee, provider_earning]
    );
    if (result.rows[0]) return { payment: result.rows[0], alreadyDone: false };
    // Kisi aur request ne beech mein update kar diya
    return { payment: await getPaymentById(payment_id), alreadyDone: true };
};

const markPaymentFailed = async (payment_id, reason) => {
    const result = await pool.query(
        `
        UPDATE payments
        SET payment_status = 'failed', failure_reason = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND payment_status = 'pending'
        RETURNING *
        `,
        [payment_id, String(reason || "Payment failed").slice(0, 500)]
    );
    return result.rows[0];
};

const markRefund = async (payment_id, { status, refund_id }) => {
    const result = await pool.query(
        `
        UPDATE payments
        SET payment_status = $2::VARCHAR(30),
            refund_id = COALESCE($3::VARCHAR(100), refund_id),
            refunded_at = CASE WHEN $2::VARCHAR(30) = 'refunded' THEN CURRENT_TIMESTAMP ELSE refunded_at END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND payment_status IN ('successful', 'refund_pending')
        RETURNING *
        `,
        [payment_id, status, refund_id]
    );
    return result.rows[0];
};

/** Admin ke liye status ko seedha set karna (manual correction). */
const updatePaymentStatus = async (payment_id, payment_status, transaction_id = null) => {
    if (payment_status === "successful") {
        const r = await markPaymentSuccessful(payment_id, { transaction_id });
        return r?.payment;
    }
    const result = await pool.query(
        `
        UPDATE payments
        SET payment_status = $1::VARCHAR(30),
            transaction_id = COALESCE($2::VARCHAR(255), transaction_id),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3::INTEGER
        RETURNING *
        `,
        [payment_status, transaction_id, payment_id]
    );
    return result.rows[0];
};

/** Webhook event ek hi baar process ho. true = naya event. */
const recordEvent = async (gateway, event_id, event_type, payload) => {
    const result = await pool.query(
        `
        INSERT INTO payment_events (gateway, event_id, event_type, payload)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (gateway, event_id) DO NOTHING
        RETURNING id
        `,
        [gateway, event_id, event_type, payload]
    );
    return result.rowCount > 0;
};

const PAYMENT_SORT = { created_at: "p.created_at", amount: "p.amount", paid_at: "p.paid_at" };

/** Admin payments list + summary. */
const listPayments = async ({ status, method, search, page, limit, sortBy, order }) => {
    const values = [];
    let where = "WHERE 1=1";
    if (status) {
        values.push(status);
        where += ` AND p.payment_status = $${values.length}`;
    }
    if (method) {
        values.push(method.toUpperCase());
        where += ` AND upper(p.payment_method) = $${values.length}`;
    }
    if (search) {
        values.push(`%${search}%`);
        const i = values.length;
        where += ` AND (c.name ILIKE $${i} OR b.service_name ILIKE $${i} OR p.transaction_id ILIKE $${i} OR p.gateway_payment_id ILIKE $${i} OR CAST(p.booking_id AS TEXT) ILIKE $${i})`;
    }

    const sortCol = PAYMENT_SORT[sortBy] || "p.created_at";
    const dir = String(order).toUpperCase() === "ASC" ? "ASC" : "DESC";
    const from = `
        FROM payments p
        JOIN bookings b ON b.id = p.booking_id
        LEFT JOIN users c ON c.id = p.customer_id
        LEFT JOIN users pr ON pr.id = b.provider_id
    `;

    const [rows, total, summary] = await Promise.all([
        pool.query(
            `
            SELECT p.id, p.booking_id, p.amount::float AS amount, p.payment_method, p.payment_status, p.gateway,
                   p.transaction_id, p.gateway_payment_id, p.failure_reason, p.refund_id,
                   p.platform_fee::float AS platform_fee, p.provider_earning::float AS provider_earning,
                   p.paid_at, p.refunded_at, p.created_at,
                   c.name AS customer_name, c.email AS customer_email,
                   pr.name AS provider_name, b.service_name, b.status AS booking_status
            ${from}
            ${where}
            ORDER BY ${sortCol} ${dir} NULLS LAST, p.id DESC
            LIMIT $${values.length + 1} OFFSET $${values.length + 2}
            `,
            [...values, limit, (page - 1) * limit]
        ),
        pool.query(`SELECT COUNT(*)::int AS total ${from} ${where}`, values),
        pool.query(`
            SELECT
                COALESCE(SUM(amount) FILTER (WHERE payment_status = 'successful'), 0)::float AS collected,
                COALESCE(SUM(platform_fee) FILTER (WHERE payment_status = 'successful'), 0)::float AS platform_fees,
                COALESCE(SUM(provider_earning) FILTER (WHERE payment_status = 'successful'), 0)::float AS provider_earnings,
                COALESCE(SUM(amount) FILTER (WHERE payment_status = 'refund_pending'), 0)::float AS refund_pending_amount,
                COALESCE(SUM(amount) FILTER (WHERE payment_status = 'refunded'), 0)::float AS refunded,
                COUNT(*) FILTER (WHERE payment_status = 'pending')::int AS pending_count,
                COUNT(*) FILTER (WHERE payment_status = 'failed')::int AS failed_count,
                COUNT(*) FILTER (WHERE payment_status = 'refund_pending')::int AS refund_pending_count
            FROM payments
        `),
    ]);

    return { payments: rows.rows, total: total.rows[0].total, summary: summary.rows[0] };
};

module.exports = {
    COMMISSION_PERCENT,
    getBookingWithPayment,
    createPayment,
    repointPendingPayment,
    getPaymentByOrderId,
    getPaymentById,
    getPaymentByBooking,
    markPaymentSuccessful,
    markPaymentFailed,
    markRefund,
    updatePaymentStatus,
    recordEvent,
    listPayments,
};
