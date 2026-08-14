const pool = require("../config/db");


// Create payment
const createPayment = async (
booking_id,
customer_id,
amount,
payment_method,
transaction_id = null
) => {

const result = await pool.query(
    `
    INSERT INTO payments
    (
        booking_id,
        customer_id,
        amount,
        payment_method,
        transaction_id,
        payment_status
    )
    VALUES ($1, $2, $3, $4, $5, 'pending')
    RETURNING *
    `,
    [
        booking_id,
        customer_id,
        amount,
        payment_method,
        transaction_id
    ]
);

return result.rows[0];
};


// Get payment by booking
const getPaymentByBooking = async (booking_id) => {

const result = await pool.query(
    `
    SELECT *
    FROM payments
    WHERE booking_id = $1
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [booking_id]
);

return result.rows[0];
};


// Update payment status
const updatePaymentStatus = async (
    payment_id,
    payment_status,
    transaction_id = null
) => {

    const result = await pool.query(
        `
        UPDATE payments
        SET
            payment_status = $1::VARCHAR(30),
            transaction_id = COALESCE($2::VARCHAR(255), transaction_id),
            paid_at = CASE
                WHEN $1::VARCHAR(30) = 'successful'
                THEN CURRENT_TIMESTAMP
                ELSE paid_at
            END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3::INTEGER
        RETURNING *
        `,
        [
            payment_status,
            transaction_id,
            payment_id
        ]
    );

    return result.rows[0];
};

module.exports = {
createPayment,
getPaymentByBooking,
updatePaymentStatus
};