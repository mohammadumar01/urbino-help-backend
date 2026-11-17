const pool = require("../config/db");
const BOOKING_STATUS = require("../constants/bookingStatus");

/** Customer in statuses tak hi cancel kar sakta hai (agent nikal chuka ho to nahi). */
const CANCELLABLE = [
    BOOKING_STATUS.PENDING,
    BOOKING_STATUS.PROVIDER_ACCEPTED,
    BOOKING_STATUS.AGENT_ASSIGNED,
];

/** Service + (optional) provider ka price ek query mein. */
const getServiceForBooking = async (service_id, provider_id) => {
    const result = await pool.query(
        `
        SELECT
            s.id,
            s.name,
            s.base_price,
            ps.price AS provider_price,
            (ps.id IS NOT NULL AND u.id IS NOT NULL) AS provider_offers_service
        FROM services s
        LEFT JOIN provider_services ps
            ON ps.service_id = s.id
           AND ps.provider_id = $2
           AND ps.is_active
        LEFT JOIN users u
            ON u.id = ps.provider_id
           AND u.role = 'provider'
           AND u.is_deleted IS NOT TRUE
        WHERE s.id = $1
        `,
        [service_id, provider_id || null]
    );
    return result.rows[0];
};

const createBooking = async ({
    customer_id,
    service_id,
    service_name,
    address,
    booking_date,
    booking_time,
    provider_id,
    price,
}) => {
    const result = await pool.query(
        `
        INSERT INTO bookings
            (customer_id, service_id, service_name, address, booking_date, booking_time, provider_id, price)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *;
        `,
        [
            customer_id,
            service_id || null,
            service_name,
            address,
            booking_date,
            booking_time,
            provider_id || null,
            price ?? null,
        ]
    );
    return result.rows[0];
};

function buildCustomerFilter(customer_id, search, status) {
    const values = [customer_id];
    let where = "WHERE b.customer_id = $1";

    if (search) {
        values.push(`%${search}%`);
        where += ` AND (b.service_name ILIKE $${values.length} OR b.address ILIKE $${values.length})`;
    }
    if (status) {
        values.push(status);
        where += ` AND b.status = $${values.length}`;
    }
    return { where, values };
}

const getBookingsByCustomerId = async (customer_id, limit, offset, search, status, sortBy, order) => {
    const { where, values } = buildCustomerFilter(customer_id, search, status);
    // sortBy / order controller mein whitelist ho chuke hain
    values.push(limit, offset);

    const result = await pool.query(
        `
        SELECT
            b.id,
            b.service_id,
            b.service_name,
            b.address,
            b.booking_date,
            b.booking_time,
            b.status,
            b.price,
            b.created_at,
            b.completed_at,
            b.provider_id,
            p.name  AS provider_name,
            p.phone AS provider_phone,
            a.name  AS agent_name,
            a.phone AS agent_phone,
            (r.id IS NOT NULL) AS has_review,
            r.rating AS review_rating,
            pay.payment_status,
            pay.payment_method,
            pay.paid_at,
            b.provider_accepted_at,
            b.agent_assigned_at,
            b.agent_accepted_at,
            b.on_the_way_at,
            b.started_at,
            -- Start code sirf tab dikhao jab professional confirm ho chuka ho aur kaam shuru na hua ho
            CASE WHEN b.status IN ('agent_accepted', 'on_the_way') THEN b.start_otp END AS start_otp
        FROM bookings b
        LEFT JOIN users p ON p.id = b.provider_id
        LEFT JOIN users a ON a.id = b.agent_id
        LEFT JOIN reviews r ON r.booking_id = b.id
        LEFT JOIN LATERAL (
            SELECT payment_status, payment_method, paid_at
            FROM payments
            WHERE booking_id = b.id
            ORDER BY (payment_status = 'successful') DESC, created_at DESC, id DESC
            LIMIT 1
        ) pay ON TRUE
        ${where}
        ORDER BY b.${sortBy} ${order}, b.id DESC
        LIMIT $${values.length - 1}
        OFFSET $${values.length}
        `,
        values
    );
    return result.rows;
};

const getTotalBookingsByCustomerId = async (customer_id, search, status) => {
    const { where, values } = buildCustomerFilter(customer_id, search, status);
    const result = await pool.query(`SELECT COUNT(*) AS total FROM bookings b ${where}`, values);
    return Number(result.rows[0].total);
};

const getBookingForPayment = async (booking_id, customer_id) => {
    const result = await pool.query(
        `
        SELECT id, customer_id, status, price
        FROM bookings
        WHERE id = $1
          AND customer_id = $2
        `,
        [booking_id, customer_id]
    );
    return result.rows[0];
};

const rescheduleBooking = async (booking_id, customer_id, booking_date, booking_time) => {
    const result = await pool.query(
        `
        UPDATE bookings
        SET booking_date = $3,
            booking_time = $4,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
          AND customer_id = $2
          AND status = ANY($5::text[])
        RETURNING *;
        `,
        [booking_id, customer_id, booking_date, booking_time, [BOOKING_STATUS.PENDING, BOOKING_STATUS.PROVIDER_ACCEPTED]]
    );
    return result.rows[0];
};

/**
 * Sirf cancellable status wali booking cancel hoti hai.
 * Return: { booking } success par, { reason } fail par.
 */
const cancelBooking = async (booking_id, customer_id) => {
    const result = await pool.query(
        `
        UPDATE bookings
        SET status = '${BOOKING_STATUS.CANCELLED}',
            cancelled_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
          AND customer_id = $2
          AND status = ANY($3::text[])
        RETURNING *;
        `,
        [booking_id, customer_id, CANCELLABLE]
    );
    if (result.rows[0]) return { booking: result.rows[0] };

    const existing = await pool.query(
        "SELECT status FROM bookings WHERE id = $1 AND customer_id = $2",
        [booking_id, customer_id]
    );
    if (!existing.rows[0]) return { reason: "not_found" };
    return { reason: "not_cancellable", status: existing.rows[0].status };
};

const getCustomerBooking = async (booking_id, customer_id) => {
    const result = await pool.query(
        "SELECT id, provider_id, status, booking_date, left(booking_time, 5) AS booking_time FROM bookings WHERE id = $1 AND customer_id = $2",
        [booking_id, customer_id]
    );
    return result.rows[0];
};

module.exports = {
    CANCELLABLE,
    getCustomerBooking,
    getServiceForBooking,
    createBooking,
    getBookingsByCustomerId,
    getTotalBookingsByCustomerId,
    rescheduleBooking,
    cancelBooking,
    getBookingForPayment,
};
